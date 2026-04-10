package com.adtrack.tracker.tracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.network.ApiClient
import com.adtrack.tracker.network.BatchLocationReport
import com.adtrack.tracker.network.LocationReport
import com.adtrack.tracker.ui.MainActivity
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.*
import java.util.concurrent.CopyOnWriteArrayList

class LocationTrackerService : LifecycleService() {

    private lateinit var fusedLocationClient: com.google.android.gms.location.FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val apiClient: ApiClient by lazy { (application as TrackerApp).apiClient }

    private val locationBuffer = CopyOnWriteArrayList<LocationReport>()
    private var reportCount = 0
    private var isTracking = false

    private var reportJob: Job? = null

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "location_tracker"
        private const val REPORT_INTERVAL = 10_000L // 10秒上报一次
        private const val BUFFER_MAX = 100
        private const val BATCH_SIZE = 20

        const val ACTION_START = "com.adtrack.tracker.ACTION_START"
        const val ACTION_STOP = "com.adtrack.tracker.ACTION_STOP"

        const val EXTRA_REPORT_COUNT = "report_count"
        const val EXTRA_LAST_TIME = "last_time"
        const val EXTRA_LATITUDE = "latitude"
        const val EXTRA_LONGITUDE = "longitude"
        const val EXTRA_ACCURACY = "accuracy"
        const val EXTRA_BATTERY = "battery"

        private var broadcastCallback: ((Intent) -> Unit)? = null

        fun setBroadcastCallback(callback: (Intent) -> Unit) {
            broadcastCallback = callback
        }

        fun clearBroadcastCallback() {
            broadcastCallback = null
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        when (intent?.action) {
            ACTION_START -> startTracking()
            ACTION_STOP -> stopTracking()
        }

        return START_STICKY
    }

    private fun startTracking() {
        if (isTracking) return
        isTracking = true
        reportCount = 0

        // 启动前台服务
        startForeground(NOTIFICATION_ID, buildNotification("正在启动定位..."))

        // 定时上报任务
        reportJob = lifecycleScope.launch {
            while (isActive) {
                delay(REPORT_INTERVAL)
                batchReport()
            }
        }

        // 请求位置更新
        val locationRequest = LocationRequest.Builder(
            com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
            5_000L // 5秒获取一次定位
        ).apply {
            setMinUpdateIntervalMillis(2_000L)
            setWaitForAccurateLocation(false)
        }

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                val battery = getBatteryLevel()

                val report = LocationReport(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy.toInt(),
                    speed = if (location.hasSpeed()) location.speed.toDouble() else null,
                    type = "track",
                    battery = battery,
                    order_id = null
                )

                locationBuffer.add(report)
                if (locationBuffer.size > BUFFER_MAX) {
                    locationBuffer.removeAt(0)
                }

                reportCount++
                updateNotification(location)
                broadcastStatus(report)
            }
        }

        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        }
    }

    private fun stopTracking() {
        isTracking = false
        reportJob?.cancel()
        reportJob = null

        // 上报剩余缓存
        batchReport()

        // 停止位置更新
        fusedLocationClient.removeLocationUpdates(locationCallback)

        // 停止前台服务
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()

        broadcastStatus(null)
    }

    private fun batchReport() {
        if (locationBuffer.isEmpty()) return
        if (!isTracking) return

        val batch = locationBuffer.take(BATCH_SIZE)
        val reportsToRemove = batch.toList()

        lifecycleScope.launch {
            try {
                apiClient.api.batchReportLocation(BatchLocationReport(batch))
                // 上报成功，从缓存移除
                locationBuffer.removeAll(reportsToRemove)
            } catch (e: Exception) {
                // 失败不处理，缓存会保留下次重试
            }
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_text)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(statusText: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(location: android.location.Location) {
        val text = "已上报 $reportCount 条 · 精度${location.accuracy.toInt()}米"
        val notification = buildNotification(text)
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun broadcastStatus(report: LocationReport?) {
        val intent = Intent().apply {
            action = "com.adtrack.tracker.STATUS_UPDATE"
            putExtra(EXTRA_REPORT_COUNT, reportCount)
            putExtra(EXTRA_LAST_TIME, System.currentTimeMillis())
            if (report != null) {
                putExtra(EXTRA_LATITUDE, report.latitude)
                putExtra(EXTRA_LONGITUDE, report.longitude)
                putExtra(EXTRA_ACCURACY, report.accuracy)
                putExtra(EXTRA_BATTERY, report.battery ?: -1)
            }
        }
        broadcastCallback?.invoke(intent)
    }

    fun getReportCount() = reportCount
    fun getIsTracking() = isTracking

    override fun onDestroy() {
        if (isTracking) {
            batchReport()
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
        reportJob?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent) = super.onBind(intent)
}
