package com.adtrack.tracker.network

import android.content.Context
import android.content.SharedPreferences
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ApiClient private constructor(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("adtrack_prefs", Context.MODE_PRIVATE)

    private var baseUrl: String
        get() = prefs.getString("base_url", BuildConfig.DEFAULT_BASE_URL)!!
        set(value) = prefs.edit().putString("base_url", value).apply()

    var token: String?
        get() = prefs.getString("auth_token", null)
        set(value) = prefs.edit().putString("auth_token", value).apply()

    private val authInterceptor = Interceptor { chain ->
        val request = chain.request().newBuilder()
        token?.let {
            request.addHeader("Authorization", "Bearer $it")
        }
        request.addHeader("Content-Type", "application/json")
        chain.proceed(request.build())
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .addConverterFactory(GsonConverterFactory.create())
        .client(okHttpClient)
        .build()

    val api: ApiService = retrofit.create(ApiService::class.java)

    fun setBaseUrl(url: String) {
        baseUrl = url
    }

    fun clearSession() {
        prefs.edit()
            .remove("auth_token")
            .remove("user_id")
            .remove("user_name")
            .remove("user_role")
            .apply()
    }

    fun saveUserInfo(user: UserInfo) {
        prefs.edit()
            .putInt("user_id", user.id)
            .putString("user_name", user.real_name)
            .putString("user_role", user.role)
            .apply()
    }

    val userId: Int get() = prefs.getInt("user_id", -1)
    val userName: String get() = prefs.getString("user_name", "--") ?: "--"
    val userRole: String get() = prefs.getString("user_role", "--") ?: "--"

    companion object {
        @Volatile
        private var INSTANCE: ApiClient? = null

        fun getInstance(context: Context): ApiClient {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ApiClient(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
