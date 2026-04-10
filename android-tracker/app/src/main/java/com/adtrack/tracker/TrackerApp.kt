package com.adtrack.tracker

import android.app.Application
import com.adtrack.tracker.network.ApiClient

class TrackerApp : Application() {

    val apiClient by lazy { ApiClient.getInstance(this) }

    companion object {
        lateinit var instance: TrackerApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}
