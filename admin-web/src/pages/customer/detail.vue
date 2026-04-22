<template>
  <div class="customer-detail-page">
    <div class="page-header">
      <el-button text @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h3>{{ customer.customer_name }}</h3>
    </div>

    <div class="info-card">
      <h4>基本信息</h4>
      <div class="info-row">
        <span class="label">姓名</span>
        <span class="value">{{ customer.customer_name }}</span>
      </div>
      <div class="info-row">
        <span class="label">电话</span>
        <span class="value">{{ customer.customer_phone }}</span>
      </div>
      <div class="info-row">
        <span class="label">店铺</span>
        <span class="value">{{ customer.company || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">地址</span>
        <span class="value">{{ customer.address || '-' }}</span>
      </div>
    </div>

    <div class="orders-card">
      <h4>历史订单 ({{ recentOrders.length }})</h4>
      <el-table :data="recentOrders" v-loading="loading" stripe size="small">
        <el-table-column prop="order_no" label="订单号" width="160">
          <template #default="{ row }">
            <span class="order-no" @click="goOrder(row)">{{ row.order_no }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="150" />
        <el-table-column label="创建时间" width="130">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/api/request'
import dayjs from 'dayjs'
import { getStatusText, getStatusType } from '@/utils/constants'
import { formatDate } from '@/composables/useFormat'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

const customer = ref({})
const recentOrders = ref([])

const fetchCustomer = async () => {
  loading.value = true
  try {
    const res = await request.get(`/customers/${route.params.id}`)
    customer.value = res.data || {}
    recentOrders.value = res.data?.orders || []
  } catch (err) {
    ElMessage.error('获取客户信息失败')
  } finally {
    loading.value = false
  }
}

const goOrder = (row) => router.push(`/orders/${row.id}`)

onMounted(fetchCustomer)
</script>

<style scoped>
.customer-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header h3 {
  margin: 0;
}

.info-card, .orders-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border);
}

.info-card h4, .orders-card h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
}

.info-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  width: 60px;
  color: var(--text-secondary);
  font-size: 13px;
}

.info-row .value {
  flex: 1;
  font-size: 13px;
}

.order-no {
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  color: var(--brand-primary);
  cursor: pointer;
}

.order-no:hover {
  text-decoration: underline;
}
</style>
