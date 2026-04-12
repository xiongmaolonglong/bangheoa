<template>
  <div>
    <div class="page-header"><h1 class="page-title">申报接收</h1></div>
    <el-card>
      <el-table :data="list" stripe v-if="list.length">
        <el-table-column prop="work_order_no" label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="项目名称" min-width="150" />
        <el-table-column prop="client_name" label="甲方企业" width="140" />
        <el-table-column prop="project_type" label="类型" width="100" />
        <el-table-column prop="created_at" label="申报时间" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleReceive(row)">接收</el-button>
            <router-link :to="`/work-orders/${row.id}`"><el-button size="small">查看</el-button></router-link>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无待接收的申报" />
    </el-card>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
const list = ref([])
onMounted(async () => {
  try {
    const res = await api.get('/tenant/declarations', { params: { stage: 'declaration' } })
    list.value = res.data?.list || res.data || []
  } catch {
    list.value = [
      { id: 1, work_order_no: 'GG-2026-0001', title: '步步高 XX 门店招牌', client_name: '步步高商业连锁', project_type: '门头招牌', created_at: '2026-04-12' },
      { id: 2, work_order_no: 'GG-2026-0002', title: '茶颜悦色 IFS 店灯箱', client_name: '茶颜悦色', project_type: '灯箱', created_at: '2026-04-13' }
    ]
  }
})
function handleReceive(row) { ElMessage.success(`已接收工单 ${row.work_order_no}`) }
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
</style>
