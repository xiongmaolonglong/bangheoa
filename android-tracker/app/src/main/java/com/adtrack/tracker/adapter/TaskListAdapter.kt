package com.adtrack.tracker.adapter

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.adtrack.tracker.R
import com.adtrack.tracker.databinding.ItemTaskCardBinding
import com.adtrack.tracker.network.OrderSummary
import com.adtrack.tracker.utils.OrderStatus

class TaskListAdapter(
    private val items: List<OrderSummary>,
    private val onItemClick: (OrderSummary) -> Unit
) : RecyclerView.Adapter<TaskListAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemTaskCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemTaskCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.binding.tvOrderNo.text = item.order_no
        holder.binding.tvTitle.text = item.title
        holder.binding.tvCustomer.text = item.customer_name
        holder.binding.tvAddress.text = item.address

        val statusInfo = OrderStatus.getStatusInfo(item.status)
        holder.binding.tvStatus.text = statusInfo.label
        holder.binding.tvStatus.setBackgroundResource(statusInfo.bgResId)

        holder.itemView.setOnClickListener { onItemClick(item) }
    }

    override fun getItemCount(): Int = items.size
}
