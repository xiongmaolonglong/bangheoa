package com.adtrack.tracker.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.databinding.FragmentProfileBinding
import androidx.fragment.app.Fragment
import android.app.AlertDialog
import android.content.Intent
import com.adtrack.tracker.R

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    private val apiClient by lazy { (requireActivity().application as TrackerApp).apiClient }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        updateUserInfo()

        binding.btnLogout.setOnClickListener {
            showLogoutConfirm()
        }
    }

    private fun updateUserInfo() {
        binding.tvUserName.text = apiClient.userName
        binding.tvUserRole.text = roleToLabel(apiClient.userRole)
        binding.tvPhone.text = "--"
        binding.tvRole.text = roleToLabel(apiClient.userRole)
        binding.tvServer.text = apiClient.baseUrl
    }

    private fun roleToLabel(role: String): String = when (role) {
        "admin" -> "系统管理员"
        "reviewer" -> "审核主管"
        "measurer" -> "测量员"
        "designer" -> "设计师"
        "producer" -> "生产员"
        "checker" -> "核对员"
        "installer" -> "安装员"
        else -> role
    }

    private fun showLogoutConfirm() {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.logout)
            .setMessage(R.string.logout_confirm)
            .setPositiveButton("确定") { _, _ -> logout() }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun logout() {
        // 停止追踪服务
        try {
            val intent = Intent(requireContext(), com.adtrack.tracker.tracker.LocationTrackerService::class.java).apply {
                action = com.adtrack.tracker.tracker.LocationTrackerService.ACTION_STOP
            }
            requireContext().startService(intent)
        } catch (e: Exception) { /* ignore */ }

        apiClient.clearSession()
        val intent = Intent(requireContext(), LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        requireActivity().finish()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
