package com.adtrack.tracker.network

data class LoginRequest(
    val phone: String,
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
