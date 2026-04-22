package com.adtrack.tracker.ui

import android.os.Bundle
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter
import androidx.viewpager2.widget.ViewPager2
import com.adtrack.tracker.R
import com.adtrack.tracker.databinding.ActivityHomeBinding
import com.google.android.material.bottomnavigation.BottomNavigationView

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)

        val adapter = HomeAdapter(this)
        binding.viewPager.adapter = adapter
        binding.viewPager.offscreenPageLimit = 2

        binding.viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                binding.bottomNav.menu.getItem(position).isChecked = true
                updateTitle(position)
            }
        })

        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_tasks -> binding.viewPager.currentItem = 0
                R.id.nav_tracking -> binding.viewPager.currentItem = 1
                R.id.nav_profile -> binding.viewPager.currentItem = 2
            }
            true
        }
    }

    private fun updateTitle(position: Int) {
        supportActionBar?.title = when (position) {
            0 -> getString(R.string.nav_tasks)
            1 -> getString(R.string.nav_tracking)
            2 -> getString(R.string.nav_profile)
            else -> getString(R.string.app_name)
        }
    }

    override fun onBackPressed() {
        if (binding.viewPager.currentItem != 0) {
            binding.viewPager.currentItem = 0
        } else {
            super.onBackPressed()
        }
    }
}

class HomeAdapter(fragmentActivity: AppCompatActivity) : FragmentStateAdapter(fragmentActivity) {
    override fun getItemCount(): Int = 3
    override fun createFragment(position: Int): Fragment = when (position) {
        0 -> TasksFragment()
        1 -> TrackingFragment()
        2 -> ProfileFragment()
        else -> Fragment()
    }
}
