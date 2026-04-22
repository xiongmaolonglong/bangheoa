package com.adtrack.tracker.ui

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.databinding.ActivityMainBinding
import com.adtrack.tracker.tracker.LocationTrackerService
import com.adtrack.tracker.utils.PermissionHelper
import java.text.SimpleDateFormat
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val apiClient by lazy { (application as TrackerApp).apiClient }
    private val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val dateFormatShort = SimpleDateFormat("HH:mm", Locale.getDefault())

    private var isTracking = false
    private var reportCount = 0
    private var lastLat = 0.0
    private var lastLng = 0.0
    private var lastAccuracy = 0
    private var lastBattery = 0
    private var lastUpdateTime = 0L
    private var trackingStartMillis = 0L
    private var totalDistance = 0.0

    private var durationUpdateRunnable: Runnable? = null
    private val durationHandler = Handler(Looper.getMainLooper())

    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.adtrack.tracker.STATUS_UPDATE") {
                reportCount = intent.getIntExtra(LocationTrackerService.EXTRA_REPORT_COUNT, reportCount)
                lastLat = intent.getDoubleExtra(LocationTrackerService.EXTRA_LATITUDE, lastLat)
                lastLng = intent.getDoubleExtra(LocationTrackerService.EXTRA_LONGITUDE, lastLng)
                lastAccuracy = intent.getIntExtra(LocationTrackerService.EXTRA_ACCURACY, lastAccuracy)
                lastBattery = intent.getIntExtra(LocationTrackerService.EXTRA_BATTERY, lastBattery)
                lastUpdateTime = intent.getLongExtra(LocationTrackerService.EXTRA_LAST_TIME, lastUpdateTime)
                updateUI()
            }
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.all { it }) {
            startTrackingService()
        } else {
            Toast.makeText(this, "需要定位权限才能使用追踪功能", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (apiClient.token == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        binding.btnToggle.setOnClickListener {
            if (isTracking) {
                stopTrackingService()
            } else {
                requestPermissionsAndStart()
            }
        }

        binding.btnLogout.setOnClickListener {
            logout()
        }

        updateUserInfo()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(statusReceiver, IntentFilter("com.adtrack.tracker.STATUS_UPDATE"), RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(statusReceiver, IntentFilter("com.adtrack.tracker.STATUS_UPDATE"))
        }
    }

    private fun updateUserInfo() {
        binding.tvUserName.text = apiClient.userName
    }

    private fun requestPermissionsAndStart() {
        val needed = PermissionHelper.REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isEmpty()) {
            startTrackingService()
        } else {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun startTrackingService() {
        val intent = Intent(this, LocationTrackerService::class.java).apply {
            action = LocationTrackerService.ACTION_START
        }
        ContextCompat.startForegroundService(this, intent)
        isTracking = true
        trackingStartMillis = System.currentTimeMillis()
        totalDistance = 0.0
        updateUI()
        startDurationTimer()
    }

    private fun stopTrackingService() {
        val intent = Intent(this, LocationTrackerService::class.java).apply {
            action = LocationTrackerService.ACTION_STOP
        }
        startService(intent)
        isTracking = false
        updateUI()
        stopDurationTimer()
    }

    private fun startDurationTimer() {
        durationUpdateRunnable = object : Runnable {
            override fun run() {
                updateActiveTime()
                durationHandler.postDelayed(this, 1000)
            }
        }
        durationHandler.post(durationUpdateRunnable!!)
    }

    private fun stopDurationTimer() {
        durationUpdateRunnable?.let { durationHandler.removeCallbacks(it) }
        durationUpdateRunnable = null
    }

    private fun updateActiveTime() {
        if (trackingStartMillis > 0 && isTracking) {
            val elapsed = (System.currentTimeMillis() - trackingStartMillis) / 1000
            val h = elapsed / 3600
            val m = (elapsed % 3600) / 60
            val s = elapsed % 60
            binding.tvActiveTime.text = String.format("%02d:%02d:%02d", h, m, s)
        }
    }

    private fun updateUI() {
        if (isTracking) {
            // 状态
            binding.tvStatusTitle.text = "追踪中"
            binding.statusDot.setBackgroundResource(R.drawable.status_online)

            // 坐标
            binding.tvCoords.text = String.format("%.6f, %.6f", lastLat, lastLng)
            binding.tvAccuracy.text = "${lastAccuracy} 米"
            binding.tvReportCount.text = reportCount.toString()

            // 速度
            val speedStr = if (lastAccuracy > 0) "计算中" else "--"
            binding.tvSpeed.text = speedStr

            // 电量
            if (lastBattery > 0) {
                binding.tvBattery.text = "${lastBattery}%"
            }

            // 上次更新
            if (lastUpdateTime > 0) {
                val timeStr = dateFormatShort.format(lastUpdateTime)
                binding.tvLastUpdate.text = "上次更新：$timeStr"
                binding.tvStatusDetail.text = "已上报 $reportCount 条 · 最近于 $timeStr"
            }

            // 移动距离
            binding.tvDistance.text = "${totalDistance.toInt()} m"

            // 追踪时长
            updateActiveTime()

            // 按钮
            binding.btnToggle.text = "停止追踪"
            binding.btnToggle.setBackgroundColor(getColor(android.R.color.holo_red_light))

            // 轨迹摘要
            binding.tvTrackSummary.text = "从 ${dateFormatShort.format(trackingStartMillis)} 开始追踪\n" +
                    "当前位于: ${String.format("%.6f", lastLat)}, ${String.format("%.6f", lastLng)}"

        } else {
            binding.tvStatusTitle.text = "未在追踪"
            binding.statusDot.setBackgroundResource(R.drawable.status_offline)
            binding.tvStatusDetail.text = "点击下方按钮开始位置追踪"
            binding.tvActiveTime.text = "--:--"
            binding.btnToggle.text = "开始追踪"
            binding.btnToggle.setBackgroundColor(getColor(android.R.color.holo_blue_light))
            binding.tvTrackSummary.text = "开始追踪后将在此显示轨迹摘要"
        }
    }

    private fun logout() {
        stopTrackingService()
        apiClient.clearSession()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(statusReceiver)
        } catch (e: Exception) { /* ignore */ }
        stopDurationTimer()
        super.onDestroy()
    }
}
