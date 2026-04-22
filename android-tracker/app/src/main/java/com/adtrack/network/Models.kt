package com.adtrack.tracker.network

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

// ==================== 认证相关 ====================

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: UserInfo
)

data class UserInfo(
    val id: Int,
    val real_name: String,
    val phone: String,
    val role: String
)

data class ApiResponse<T>(
    val code: Int,
    val message: String,
    val data: T?
)

// ==================== 订单相关 ====================

data class OrderListResponse(
    val rows: List<OrderSummary>,
    val total: Int,
    val page: Int,
    val pageSize: Int
)

data class OrderSummary(
    val id: Int,
    val order_no: String,
    val title: String,
    val customer_name: String,
    val address: String,
    val status: String,
    val handler_id: Int?,
    val created_at: String
)

data class OrderDetail(
    val id: Int,
    val order_no: String,
    val title: String,
    val customer_name: String?,
    val customer_phone: String?,
    val address: String?,
    val latitude: Double?,
    val longitude: Double?,
    val status: String,
    val handler_id: Int?,
    val estimated_area: Double?,
    val expected_date: String?,
    val requirement: String?,
    val photos: List<String>?,
    val created_at: String,
    val updated_at: String,
    val handler: UserHandler?,
    val adItems: List<AdItem>?,
    val logs: List<OrderLog>?
)

data class UserHandler(
    val id: Int,
    val real_name: String,
    val role: String
)

data class AdItem(
    val id: Int,
    val order_id: Int,
    val face_no: Int?,
    val width: Double?,
    val height: Double?,
    val area: Double?,
    val material_id: Int?,
    val material: MaterialItem?,
    val faces: List<MeasureFace>?
)

data class MaterialItem(
    val id: Int,
    val name: String
)

data class MeasureFace(
    val id: Int,
    val face_no: Int?,
    val width: Double?,
    val height: Double?,
    val material: MaterialItem?
)

data class OrderLog(
    val id: Int,
    val order_id: Int,
    val from_status: String?,
    val to_status: String,
    val operator_id: Int,
    val operator: UserHandler?,
    val remark: String?,
    val created_at: String
)

data class AdvanceOrderRequest(
    val status: String,
    val handler_id: Int?,
    val remark: String?
)

data class InstallReportRequest(
    val install_date: String,
    val photos: List<String>?,
    val remark: String?
)

// ==================== 定位追踪相关 ====================

data class LocationReport(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Int,
    val speed: Double?,
    val type: String = "track",
    val battery: Int?,
    val order_id: Int?
)

data class BatchLocationReport(
    val tracks: List<LocationReport>
)

data class TrackResponse(
    val trackers: List<TrackerInfo>
)

data class TrackerInfo(
    val user_id: Int,
    val real_name: String,
    val role: String,
    val latitude: Double?,
    val longitude: Double?,
    val last_update: String,
    val online: Boolean,
    val today_count: Int
)

data class TrackPoint(
    val user_id: Int,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Int,
    val speed: Double?,
    val type: String,
    val created_at: String
)
