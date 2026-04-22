package com.adtrack.tracker.utils

import com.adtrack.tracker.R

data class StatusInfo(
    val label: String,
    val bgResId: Int,
    val color: Int
)

object OrderStatus {

    private val statusMap = mapOf(
        "pending_review" to StatusInfo("待审核", R.drawable.bg_status_pending, 0xFF9E9E9E.toInt()),
        "measuring" to StatusInfo("测量中", R.drawable.bg_status_progress, 0xFF2196F3.toInt()),
        "measure_review" to StatusInfo("待审核(测量)", R.drawable.bg_status_review, 0xFFFF9800.toInt()),
        "designing" to StatusInfo("设计中", R.drawable.bg_status_progress, 0xFF2196F3.toInt()),
        "design_review" to StatusInfo("待审核(设计)", R.drawable.bg_status_review, 0xFFFF9800.toInt()),
        "producing" to StatusInfo("生产中", R.drawable.bg_status_progress, 0xFF2196F3.toInt()),
        "checking" to StatusInfo("核对中", R.drawable.bg_status_review, 0xFFFF9800.toInt()),
        "installing" to StatusInfo("安装中", R.drawable.bg_status_progress, 0xFF2196F3.toInt()),
        "install_review" to StatusInfo("待审核(安装)", R.drawable.bg_status_review, 0xFFFF9800.toInt()),
        "archived" to StatusInfo("已归档", R.drawable.bg_status_done, 0xFF4CAF50.toInt()),
        "rejected" to StatusInfo("已驳回", R.drawable.bg_status_pending, 0xFFF44336.toInt())
    )

    fun getStatusInfo(status: String): StatusInfo {
        return statusMap[status] ?: StatusInfo(status, R.drawable.bg_status_pending, 0xFF9E9E9E.toInt())
    }

    fun getNextStatus(status: String): String? {
        val nextMap = mapOf(
            "pending_review" to "measuring",
            "measuring" to "measure_review",
            "measure_review" to "designing",
            "designing" to "design_review",
            "design_review" to "producing",
            "producing" to "checking",
            "checking" to "installing",
            "installing" to "install_review",
            "install_review" to "archived"
        )
        return nextMap[status]
    }
}
