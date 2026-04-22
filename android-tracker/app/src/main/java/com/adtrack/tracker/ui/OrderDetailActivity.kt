package com.adtrack.tracker.ui

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.databinding.ActivityOrderDetailBinding
import com.adtrack.tracker.databinding.ItemAdFaceBinding
import com.adtrack.tracker.databinding.ItemStatusLogBinding
import com.adtrack.tracker.network.AdItem
import com.adtrack.tracker.network.AdvanceOrderRequest
import com.adtrack.tracker.network.InstallReportRequest
import com.adtrack.tracker.network.OrderLog
import com.adtrack.tracker.utils.OrderStatus
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

class OrderDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOrderDetailBinding
    private val apiClient by lazy { (application as TrackerApp).apiClient }
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())

    private var orderId: Int = 0
    private var currentStatus: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOrderDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(R.string.order_detail_title)

        orderId = intent.getIntExtra("order_id", 0)
        if (orderId == 0) {
            Toast.makeText(this, "订单ID无效", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        binding.recyclerAdItems.layoutManager = LinearLayoutManager(this)

        binding.btnSubmitReport.setOnClickListener { showSubmitReportDialog() }
        binding.btnAdvance.setOnClickListener { showAdvanceDialog() }

        loadOrderDetail()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }

    private fun loadOrderDetail() {
        lifecycleScope.launch {
            try {
                val response = apiClient.api.getOrderDetail(orderId)
                if (response.code == 0 && response.data != null) {
                    val order = response.data
                    currentStatus = order.status
                    displayOrder(order)
                } else {
                    Toast.makeText(this@OrderDetailActivity, response.message, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@OrderDetailActivity, "加载失败: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun displayOrder(order: com.adtrack.tracker.network.OrderDetail) {
        // 订单信息
        binding.tvOrderNo.text = "${order.order_no}"
        val statusInfo = OrderStatus.getStatusInfo(order.status)
        binding.tvStatus.text = statusInfo.label
        binding.tvStatus.setTextColor(statusInfo.color)
        binding.tvCreatedAt.text = "创建于 ${order.created_at}"

        // 客户信息
        binding.tvCustomerName.text = order.customer_name ?: getString(R.string.no_requirement)
        binding.tvCustomerPhone.text = order.customer_phone ?: getString(R.string.no_requirement)
        binding.tvAddress.text = order.address ?: getString(R.string.no_requirement)
        binding.tvRequirement.text = order.requirement?.let { "要求: $it" } ?: ""

        // 处理人
        binding.tvHandler.text = order.handler?.real_name ?: "未分配"

        // 广告位面位
        if (order.adItems.isNullOrEmpty()) {
            binding.recyclerAdItems.visibility = View.GONE
        } else {
            binding.recyclerAdItems.visibility = View.VISIBLE
            binding.recyclerAdItems.adapter = AdItemAdapter(order.adItems)
        }

        // 日志
        binding.logContainer.removeAllViews()
        if (order.logs.isNullOrEmpty()) {
            val tv = TextView(this).apply {
                text = "暂无状态变更记录"
                textSize = 13f
                setTextColor(getColor(android.R.color.darker_gray))
                setPadding(0, 8, 0, 8)
            }
            binding.logContainer.addView(tv)
        } else {
            order.logs.forEach { log ->
                val logView = LayoutInflater.from(this).inflate(R.layout.item_status_log, binding.logContainer, false)
                logView.apply {
                    val tvStatusChange = findViewById<TextView>(R.id.tvStatusChange)
                    val tvTime = findViewById<TextView>(R.id.tvTime)
                    val tvOperator = findViewById<TextView>(R.id.tvOperator)
                    val tvRemark = findViewById<TextView>(R.id.tvRemark)

                    val fromLabel = log.from_status?.let { OrderStatus.getStatusInfo(it).label } ?: "初始"
                    val toLabel = OrderStatus.getStatusInfo(log.to_status).label
                    tvStatusChange.text = "$fromLabel → $toLabel"
                    tvTime.text = dateFormat.format(SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).parse(log.created_at) ?: java.util.Date())
                    tvOperator.text = "操作人: ${log.operator?.real_name ?: "--"}"

                    if (!log.remark.isNullOrEmpty()) {
                        tvRemark.text = "\"${log.remark}\""
                        tvRemark.visibility = View.VISIBLE
                    }
                }
                binding.logContainer.addView(logView)
            }
        }

        // 操作按钮可见性
        val canReport = listOf("installing", "checking").contains(order.status)
        binding.btnSubmitReport.visibility = if (canReport) View.VISIBLE else View.GONE

        val canAdvance = OrderStatus.getNextStatus(order.status) != null
        binding.btnAdvance.visibility = if (canAdvance) View.VISIBLE else View.GONE
    }

    private fun showSubmitReportDialog() {
        val et = EditText(this).apply {
            hint = "备注（可选）"
            setPadding(32, 32, 32, 32)
        }

        AlertDialog.Builder(this)
            .setTitle("提交安装报告")
            .setView(et)
            .setPositiveButton("提交") { _, _ ->
                submitReport(et.text?.toString()?.trim())
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun submitReport(remark: String?) {
        lifecycleScope.launch {
            try {
                val request = InstallReportRequest(
                    install_date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(java.util.Date()),
                    photos = null,
                    remark = remark
                )
                val response = apiClient.api.submitInstallReport(orderId, request)
                if (response.code == 0) {
                    Toast.makeText(this@OrderDetailActivity, "报告提交成功", Toast.LENGTH_SHORT).show()
                    loadOrderDetail()
                } else {
                    Toast.makeText(this@OrderDetailActivity, response.message, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@OrderDetailActivity, "提交失败: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showAdvanceDialog() {
        val nextStatus = OrderStatus.getNextStatus(currentStatus) ?: return

        val et = EditText(this).apply {
            hint = getString(R.string.advance_remark_hint)
            setPadding(32, 32, 32, 32)
        }

        val nextLabel = OrderStatus.getStatusInfo(nextStatus).label

        AlertDialog.Builder(this)
            .setTitle(getString(R.string.advance_dialog_title))
            .setMessage("将推进至: $nextLabel")
            .setView(et)
            .setPositiveButton("确认推进") { _, _ ->
                advanceOrder(nextStatus, et.text?.toString()?.trim())
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun advanceOrder(nextStatus: String, remark: String?) {
        lifecycleScope.launch {
            try {
                val request = AdvanceOrderRequest(
                    status = nextStatus,
                    handler_id = apiClient.userId,
                    remark = remark
                )
                val response = apiClient.api.advanceOrder(orderId, request)
                if (response.code == 0) {
                    Toast.makeText(this@OrderDetailActivity, "状态推进成功", Toast.LENGTH_SHORT).show()
                    loadOrderDetail()
                } else {
                    Toast.makeText(this@OrderDetailActivity, response.message, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@OrderDetailActivity, "推进失败: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

class AdItemAdapter(private val items: List<AdItem>) : androidx.recyclerview.widget.RecyclerView.Adapter<AdItemAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemAdFaceBinding) : androidx.recyclerview.widget.RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAdFaceBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.binding.tvFaceNo.text = "面位 #${item.face_no ?: "--"}"
        holder.binding.tvSize.text = buildString {
            if (item.width != null && item.height != null) {
                append("${item.width}m × ${item.height}m")
                if (item.area != null) append(" (${item.area}㎡)")
            } else {
                append("--")
            }
        }
        holder.binding.tvMaterial.text = "材质: ${item.material?.name ?: "--"}"
    }

    override fun getItemCount(): Int = items.size
}
