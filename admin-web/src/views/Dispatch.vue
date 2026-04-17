<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">派单管理</h1>
      <p class="page-desc">统一管理测量、设计、安装三种派单</p>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="dispatch-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="测量派单" name="measure">
        <DispatchPanel
          type="measure"
          :pending-list="pendingList"
          :staff-list="staffList"
          :loading="loading"
          @refresh="fetchData"
        />
      </el-tab-pane>
      <el-tab-pane label="设计派单" name="design">
        <DispatchPanel
          type="design"
          :pending-list="pendingList"
          :staff-list="staffList"
          :loading="loading"
          @refresh="fetchData"
        />
      </el-tab-pane>
      <el-tab-pane label="安装派单" name="install">
        <DispatchPanel
          type="install"
          :pending-list="pendingList"
          :staff-list="staffList"
          :loading="loading"
          @refresh="fetchData"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import DispatchPanel from '../components/DispatchPanel.vue'

const activeTab = ref('measure')
const loading = ref(false)
const pendingList = ref([])
const staffList = ref([])

// 获取待派单列表
async function fetchPendingList() {
  loading.value = true
  try {
    const stageMap = {
      measure: 'assignment',
      design: 'design',
      install: 'construction'
    }
    const res = await api.get('/work-orders', {
      params: {
        stage: stageMap[activeTab.value],
        limit: 100
      }
    })
    const payload = res.data?.list || res.data || []
    // 根据类型过滤未派单的工单
    if (activeTab.value === 'measure') {
      pendingList.value = payload.filter(w => !w.assigned_tenant_user_id)
    } else if (activeTab.value === 'design') {
      pendingList.value = payload.filter(w => !w.designer_id)
    } else {
      pendingList.value = payload.filter(w => !w.constructor_id)
    }
  } catch {
    pendingList.value = []
  } finally {
    loading.value = false
  }
}

// 获取可派单人员列表
async function fetchStaffList() {
  try {
    const roleMap = {
      measure: 'measurer',
      design: 'designer',
      install: 'constructor'
    }
    const res = await api.get('/tenants/users')
    const users = res.data?.list || res.data || []
    staffList.value = users.filter(u =>
      u.role === roleMap[activeTab.value] && u.status === 'active'
    )
  } catch {
    staffList.value = []
  }
}

function fetchData() {
  fetchPendingList()
  fetchStaffList()
}

function handleTabChange() {
  pendingList.value = []
  staffList.value = []
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { margin-bottom: var(--space-4); }
.page-desc { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.dispatch-tabs :deep(.el-tabs__header) { margin-bottom: var(--space-4); }
</style>
