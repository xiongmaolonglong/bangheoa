<template>
  <div class="customer-list-page">
    <div class="page-header">
      <div class="search-area">
        <el-input v-model="keyword" placeholder="搜索姓名/电话/店铺" clearable style="width: 220px" @keyup.enter="handleSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="customers" v-loading="loading" stripe>
        <el-table-column label="客户" min-width="140">
          <template #default="{ row }">
            <div class="customer-cell" @click="goDetail(row)">
              <div class="customer-name">{{ row.customer_name }}</div>
              <div class="customer-phone">{{ row.customer_phone }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="店铺" min-width="120">
          <template #default="{ row }">
            <span>{{ row.company || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="店铺电话" width="130">
          <template #default="{ row }">
            <span>{{ row.shop_phone || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="地址" min-width="180">
          <template #default="{ row }">
            <span class="address">{{ row.address || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单数" width="80" align="center">
          <template #default="{ row }">
            <span class="order-count">{{ row.order_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="首次下单" width="110">
          <template #default="{ row }">
            {{ formatDate(row.first_order_date) }}
          </template>
        </el-table-column>
        <el-table-column label="最近订单" width="110">
          <template #default="{ row }">
            {{ formatDate(row.last_order_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="goDetail(row)">订单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchCustomers"
          @current-change="fetchCustomers"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import request from '@/api/request'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const customers = ref([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'

const fetchCustomers = async () => {
  loading.value = true
  try {
    const res = await request.get('/customers', {
      params: { keyword: keyword.value, page: page.value, pageSize: pageSize.value }
    })
    customers.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (err) {
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchCustomers()
}

const goDetail = (row) => router.push(`/customers/${row.customer_phone}`)

onMounted(() => {
  fetchCustomers()
})
</script>

<style scoped>
.customer-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-area {
  display: flex;
  gap: 8px;
}

.table-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--border);
}

.customer-cell {
  cursor: pointer;
}

.customer-cell:hover .customer-name {
  text-decoration: underline;
}

.customer-name {
  font-weight: 500;
  color: var(--brand-primary);
  font-size: 14px;
}

.customer-phone {
  font-size: 12px;
  color: var(--text-muted);
}

.order-count {
  font-weight: 600;
  color: var(--brand-primary);
}

.address {
  color: var(--text-secondary);
  font-size: 13px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
