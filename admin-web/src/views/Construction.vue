<template>
  <div>
    <div class="page-header"><h1 class="page-title">施工管理</h1></div>
    <el-table :data="list" stripe>
      <el-table-column prop="work_order_no" label="工单号" width="160">
        <template #default="{ row }"><router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link></template>
      </el-table-column>
      <el-table-column prop="title" label="项目名称" min-width="150" />
      <el-table-column prop="constructor" label="施工员" width="80" />
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
      <el-table-column label="操作"><el-button size="small">查看</el-button></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
const list = [
  { id: 2, work_order_no: 'GG-2026-0002', title: '茶颜悦色国金中心店', constructor: '赵六', status: '待施工' },
  { id: 12, work_order_no: 'GG-2026-0012', title: '步步高 XX 餐厅发光字', constructor: '赵六', status: '施工中' }
]
function statusType(s) { return s === '待施工' ? 'warning' : 'primary' }
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
</style>
