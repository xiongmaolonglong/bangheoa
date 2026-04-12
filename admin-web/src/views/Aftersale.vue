<template>
  <div>
    <div class="page-header"><h1 class="page-title">售后管理</h1></div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="编号" width="60" />
      <el-table-column prop="work_order_no" label="工单号" width="160">
        <template #default="{ row }"><router-link :to="`/work-orders/${row.work_order_id}`" class="wo-link">{{ row.work_order_no }}</router-link></template>
      </el-table-column>
      <el-table-column prop="description" label="问题描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small" :type="row.status === 'pending' ? 'warning' : 'success'">{{ row.status }}</el-tag></template></el-table-column>
      <el-table-column label="操作"><el-button size="small">处理</el-button></el-table-column>
    </el-table>
    <el-empty v-if="!list.length" description="暂无售后工单" />
  </div>
</template>
<script setup>
const list = []
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
</style>
