package com.adtrack.tracker.network

import retrofit2.http.*

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<LoginResponse>

    @GET("auth/profile")
    suspend fun getProfile(): ApiResponse<UserInfo>

    @POST("location-track/report")
    suspend fun reportLocation(@Body report: LocationReport): ApiResponse<Unit>

    @POST("location-track/batch-report")
    suspend fun batchReportLocation(@Body batch: BatchLocationReport): ApiResponse<Unit>

    @GET("location-track/trackers")
    suspend fun getTrackers(@Query("role") role: String? = null): ApiResponse<TrackResponse>

    @GET("location-track/track/{userId}")
    suspend fun getUserTrack(
        @Path("userId") userId: Int,
        @Query("date") date: String? = null
    ): ApiResponse<List<TrackPoint>>
}
