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
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.databinding.FragmentTrackingBinding
import com.adtrack.tracker.tracker.LocationTrackerService
import com.adtrack.tracker.utils.PermissionHelper
import java.text.SimpleDateFormat
import java.util.Locale

class TrackingFragment : Fragment() {

    private var _binding: FragmentTrackingBinding? = null
    private val binding get() = _binding!!

    private val apiClient by lazy { (requireActivity().application as TrackerApp).apiClient }
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

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTrackingBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnToggle.setOnClickListener {
            if (isTracking) {
                stopTrackingService()
            } else {
                requestPermissionsAndStart()
            }
        }

        registerReceiver()
        updateUI()
    }

    private fun registerReceiver() {
        val filter = IntentFilter("com.adtrack.tracker.STATUS_UPDATE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requireContext().registerReceiver(statusReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            requireContext().registerReceiver(statusReceiver, filter)
        }
    }

    private fun requestPermissionsAndStart() {
        val needed = PermissionHelper.REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(requireContext(), it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isEmpty()) {
            startTrackingService()
        } else {
            requestPermissions(needed.toTypedArray(), 1001)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001 && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            startTrackingService()
        } else {
            Toast.makeText(requireContext(), "需要定位权限才能使用追踪功能", Toast.LENGTH_LONG).show()
        }
    }

    private fun startTrackingService() {
        val intent = Intent(requireContext(), LocationTrackerService::class.java).apply {
            action = LocationTrackerService.ACTION_START
        }
        ContextCompat.startForegroundService(requireContext(), intent)
        isTracking = true
        trackingStartMillis = System.currentTimeMillis()
        totalDistance = 0.0
        updateUI()
        startDurationTimer()
    }

    private fun stopTrackingService() {
        val intent = Intent(requireContext(), LocationTrackerService::class.java).apply {
            action = LocationTrackerService.ACTION_STOP
        }
        requireContext().startService(intent)
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
        val b = _binding ?: return

        if (isTracking) {
            b.tvStatusTitle.text = getString(R.string.tracking_active)
            b.statusDot.setBackgroundResource(R.drawable.status_online)
            b.tvCoords.text = String.format("%.6f, %.6f", lastLat, lastLng)
            b.tvAccuracy.text = "${lastAccuracy} 米"
            b.tvReportCount.text = reportCount.toString()

            val speedStr = if (lastAccuracy > 0) "计算中" else "--"
            b.tvSpeed.text = speedStr

            if (lastBattery > 0) {
                b.tvBattery.text = "${lastBattery}%"
            }

            if (lastUpdateTime > 0) {
                val timeStr = dateFormatShort.format(lastUpdateTime)
                b.tvLastUpdate.text = getString(R.string.last_update, timeStr)
                b.tvStatusDetail.text = getString(R.string.tracking_detail, reportCount, timeStr)
            }

            b.tvDistance.text = "${totalDistance.toInt()} m"
            updateActiveTime()

            b.btnToggle.text = getString(R.string.stop_tracking)
            b.btnToggle.setBackgroundColor(requireContext().getColor(android.R.color.holo_red_light))

            b.tvTrackSummary.text = "从 ${dateFormatShort.format(trackingStartMillis)} 开始追踪\n" +
                    "当前位于: ${String.format("%.6f", lastLat)}, ${String.format("%.6f", lastLng)}"
        } else {
            b.tvStatusTitle.text = getString(R.string.tracking_not_started)
            b.statusDot.setBackgroundResource(R.drawable.status_offline)
            b.tvStatusDetail.text = getString(R.string.tracking_hint)
            b.tvActiveTime.text = "--:--"
            b.btnToggle.text = getString(R.string.start_tracking)
            b.btnToggle.setBackgroundColor(requireContext().getColor(android.R.color.holo_blue_light))
            b.tvTrackSummary.text = getString(R.string.track_summary)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        try {
            requireContext().unregisterReceiver(statusReceiver)
        } catch (e: Exception) { /* ignore */ }
        stopDurationTimer()
        _binding = null
    }
}
