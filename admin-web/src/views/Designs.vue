<template>
  <div>
    <div class="page-header"><h1 class="page-title">设计管理</h1></div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="待设计" name="designing">
        <el-table :data="designList" stripe>
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column label="测量面积" width="100">
            <template #default="{ row }">{{ row.total_area }}㎡</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small">开始设计</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="待审核" name="reviewing">
        <el-table :data="reviewList" stripe>
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column prop="designer_name" label="设计师" width="80" />
          <el-table-column prop="submitted_at" label="提交时间" width="120" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handleReview(row, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="handleReview(row, 'reject')">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const activeTab = ref('designing')
const designList = ref([
  { id: 5, work_order_no: 'GG-2026-0005', title: '步步高 XX 超市招牌', total_area: 7.54 },
  { id: 7, work_order_no: 'GG-2026-0007', title: '步步高 XX 银行门头', total_area: 12.5 }
])
const reviewList = ref([
  { id: 3, work_order_no: 'GG-2026-0003', title: '步步高 XX 酒店工程', designer_name: '王设计', submitted_at: '2026-04-14' }
])
function handleReview(row, action) { ElMessage.success(action === 'approve' ? '审核通过' : '已驳回') }
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
</style>
