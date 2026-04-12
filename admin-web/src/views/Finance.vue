<template>
  <div>
    <div class="page-header"><h1 class="page-title">费用管理</h1></div>
    <el-table :data="list" stripe>
      <el-table-column prop="work_order_no" label="工单号" width="160">
        <template #default="{ row }"><router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link></template>
      </el-table-column>
      <el-table-column prop="title" label="项目名称" min-width="150" />
      <el-table-column label="预算" width="120"><template #default="{ row }">¥{{ row.budget?.toLocaleString() }}</template></el-table-column>
      <el-table-column label="已用" width="120"><template #default="{ row }">¥{{ row.used?.toLocaleString() }}</template></el-table-column>
      <el-table-column label="剩余" width="120"><template #default="{ row }"><span :class="{ 'text-danger': row.remaining < 0 }">¥{{ row.remaining?.toLocaleString() }}</span></template></el-table-column>
      <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small">{{ row.status }}</el-tag></template></el-table-column>
      <el-table-column label="操作"><el-button size="small">管理</el-button></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
const list = [
  { id: 1, work_order_no: 'GG-2026-0001', title: '步步高 XX 门店招牌', budget: 50000, used: 12000, remaining: 38000, status: '报价中' },
  { id: 3, work_order_no: 'GG-2026-0003', title: '步步高 XX 酒店工程', budget: 120000, used: 85000, remaining: 35000, status: '已报价' }
]
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
.text-danger { color: #f5222d; }
</style>
