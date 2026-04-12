<template>
  <div>
    <div class="page-header"><h1 class="page-title">归档管理</h1></div>
    <el-table :data="list" stripe>
      <el-table-column prop="archive_no" label="归档编号" width="150" />
      <el-table-column prop="work_order_no" label="工单号" width="160">
        <template #default="{ row }"><router-link :to="`/work-orders/${row.work_order_id}`" class="wo-link">{{ row.work_order_no }}</router-link></template>
      </el-table-column>
      <el-table-column prop="title" label="项目名称" min-width="150" />
      <el-table-column prop="archived_at" label="归档时间" width="120" />
      <el-table-column label="操作">
        <el-button size="small">查看</el-button>
        <el-button size="small">下载</el-button>
      </el-table-column>
    </el-table>
    <el-empty v-if="!list.length" description="暂无归档记录" />
  </div>
</template>
<script setup>
const list = []
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
</style>
