package com.adtrack.tracker.network

import retrofit2.http.*

interface ApiService {

    // ==================== 认证 ====================
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<LoginResponse>

    @GET("api/v1/auth/profile")
    suspend fun getProfile(): ApiResponse<UserInfo>

    @POST("api/v1/auth/logout")
    suspend fun logout(): ApiResponse<Unit>

    // ==================== 订单 ====================
    @GET("api/v1/orders")
    suspend fun getOrderList(
        @Query("handler_id") handlerId: Int? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50
    ): ApiResponse<OrderListResponse>

    @GET("api/v1/orders/{id}")
    suspend fun getOrderDetail(@Path("id") orderId: Int): ApiResponse<OrderDetail>

    @POST("api/v1/orders/{id}/advance")
    suspend fun advanceOrder(
        @Path("id") orderId: Int,
        @Body request: AdvanceOrderRequest
    ): ApiResponse<Unit>

    @GET("api/v1/orders/{id}/logs")
    suspend fun getOrderLogs(@Path("id") orderId: Int): ApiResponse<List<OrderLog>>

    // ==================== 安装任务 ====================
    @GET("api/v1/installs/tasks")
    suspend fun getInstallTasks(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50
    ): ApiResponse<OrderListResponse>

    @GET("api/v1/installs/{orderId}")
    suspend fun getInstallDetail(@Path("orderId") orderId: Int): ApiResponse<OrderDetail>

    @POST("api/v1/installs/{orderId}/report")
    suspend fun submitInstallReport(
        @Path("orderId") orderId: Int,
        @Body report: InstallReportRequest
    ): ApiResponse<Unit>

    // ==================== 定位追踪 ====================
    @POST("api/v1/location-track/report")
    suspend fun reportLocation(@Body report: LocationReport): ApiResponse<Unit>

    @POST("api/v1/location-track/batch-report")
    suspend fun batchReportLocation(@Body batch: BatchLocationReport): ApiResponse<Unit>

    @GET("api/v1/location-track/trackers")
    suspend fun getTrackers(@Query("role") role: String? = null): ApiResponse<TrackResponse>

    @GET("api/v1/location-track/track/{userId}")
    suspend fun getUserTrack(
        @Path("userId") userId: Int,
        @Query("date") date: String? = null
    ): ApiResponse<List<TrackPoint>>
}
