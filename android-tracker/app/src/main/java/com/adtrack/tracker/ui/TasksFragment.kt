package com.adtrack.tracker.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.adtrack.tracker.R
import com.adtrack.tracker.TrackerApp
import com.adtrack.tracker.adapter.TaskListAdapter
import com.adtrack.tracker.databinding.FragmentTasksBinding
import com.adtrack.tracker.network.OrderSummary
import com.adtrack.tracker.utils.OrderStatus
import com.google.android.material.tabs.TabLayout
import kotlinx.coroutines.launch

class TasksFragment : Fragment() {

    private var _binding: FragmentTasksBinding? = null
    private val binding get() = _binding!!

    private val apiClient by lazy { (requireActivity().application as TrackerApp).apiClient }

    private var allOrders: List<OrderSummary> = emptyList()
    private var currentFilter: String? = null

    private val filterTabs = mapOf(
        null to "全部",
        "pending_review" to "待处理",
        "measuring" to "进行中",
        "designing" to "设计中",
        "producing" to "生产中",
        "installing" to "安装中",
        "install_review" to "待审核"
    )

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTasksBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())

        // 初始化筛选 Tab
        filterTabs.values.forEach { label ->
            binding.tabLayout.addTab(binding.tabLayout.newTab().setText(label))
        }

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                val label = tab?.text?.toString()
                val key = filterTabs.entries.find { it.value == label }?.key
                currentFilter = key
                applyFilter()
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })

        binding.swipeRefresh.setOnRefreshListener { loadOrders() }

        loadOrders()
    }

    private fun loadOrders() {
        binding.progressBar.visibility = View.VISIBLE
        binding.tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val response = apiClient.api.getOrderList(
                    handlerId = apiClient.userId,
                    page = 1,
                    pageSize = 50
                )

                if (response.code == 0 && response.data != null) {
                    allOrders = response.data.rows
                    updateStatCards()
                    applyFilter()
                } else {
                    showError(response.message)
                }
            } catch (e: Exception) {
                showError("网络错误: ${e.message}")
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun updateStatCards() {
        val all = allOrders.size
        val pending = allOrders.count { it.status == "pending_review" }
        val progress = allOrders.count { listOf("measuring", "designing", "producing", "installing").contains(it.status) }
        val review = allOrders.count { it.status.endsWith("_review") }

        binding.statAll.text = "全部\n$all"
        binding.statPending.text = "待处理\n$pending"
        binding.statProgress.text = "进行中\n$progress"
        binding.statReview.text = "待审核\n$review"
    }

    private fun applyFilter() {
        val filtered = if (currentFilter == null) {
            allOrders
        } else {
            allOrders.filter { it.status == currentFilter }
        }

        if (filtered.isEmpty()) {
            binding.recyclerView.visibility = View.GONE
            binding.tvEmpty.visibility = View.VISIBLE
        } else {
            binding.recyclerView.visibility = View.VISIBLE
            binding.tvEmpty.visibility = View.GONE
            binding.recyclerView.adapter = TaskListAdapter(filtered) { order ->
                val intent = Intent(requireContext(), OrderDetailActivity::class.java)
                intent.putExtra("order_id", order.id)
                startActivity(intent)
            }
        }
    }

    private fun showError(message: String) {
        binding.tvEmpty.text = message
        binding.tvEmpty.visibility = View.VISIBLE
        binding.recyclerView.visibility = View.GONE
    }

    override fun onResume() {
        super.onResume()
        loadOrders()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
