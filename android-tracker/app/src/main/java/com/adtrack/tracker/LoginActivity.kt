package com.adtrack.tracker.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.databinding.ActivityLoginBinding
import com.adtrack.tracker.network.LoginRequest
import com.adtrack.tracker.utils.PermissionHelper
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val apiClient by lazy { (application as TrackerApp).apiClient }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // 已登录直接跳转
        if (apiClient.token != null) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        // 默认服务器地址
        binding.etServer.setText(apiClient.baseUrl.takeIf { it.isNotEmpty() } ?: "")

        binding.btnLogin.setOnClickListener {
            login()
        }
    }

    private fun login() {
        val phone = binding.etPhone.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString()?.trim() ?: ""

        if (phone.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "请填写手机号和密码", Toast.LENGTH_SHORT).show()
            return
        }

        // 保存服务器地址
        binding.etServer.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let {
            apiClient.setBaseUrl(it)
        }

        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = "登录中..."

        lifecycleScope.launch {
            try {
                val response = apiClient.api.login(LoginRequest(phone, password))
                if (response.code == 0 && response.data != null) {
                    apiClient.token = response.data.token
                    apiClient.saveUserInfo(response.data.user)
                    Toast.makeText(this@LoginActivity, "登录成功", Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                } else {
                    Toast.makeText(this@LoginActivity, response.message, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@LoginActivity, "网络错误: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnLogin.isEnabled = true
                binding.btnLogin.text = getString(R.string.login_btn)
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // 登录页暂不处理权限结果，由 MainActivity 处理
    }
}
