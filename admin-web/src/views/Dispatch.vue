<template>
  <div>
    <div class="page-header"><h1 class="page-title">派单管理</h1></div>
    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="work_order_no" label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="项目名称" min-width="150" />
        <el-table-column prop="deadline" label="截止日期" width="110" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'assigned' ? 'warning' : 'info'">
              {{ row.status === 'assigned' ? '已派单' : '待派单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'assigned'" type="primary" size="small" @click="openDispatch(row)">派单</el-button>
            <span v-else class="text-muted">已派</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="showDialog" title="派单" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="工单"><span class="wo-link">{{ form.work_order_no }}</span></el-form-item>
        <el-form-item label="测量员">
          <el-select v-model="form.assigned_to" placeholder="请选择" style="width:100%">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间"><el-date-picker v-model="form.deadline" type="date" style="width:100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showDialog = false">取消</el-button><el-button type="primary" @click="submitDispatch">确认派单</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, reactive } from 'vue'
import api from '../api'
const list = ref([])
const showDialog = ref(false)
const users = ref([])
const form = reactive({ work_order_no: '', assigned_to: '', deadline: '', notes: '' })

onMounted(async () => {
  try {
    const res = await api.get('/assignments', { params: { status: 'pending' } })
    list.value = res.data?.list || []
    api.get('/tenant/users', { params: { role: 'measurer', status: 'active' } }).then(r => users.value = r.data?.list || []).catch(() => {})
  } catch {
    list.value = [
      { id: 7, work_order_no: 'GG-2026-0007', title: '步步高 XX 银行门头', deadline: '2026-04-20' },
      { id: 10, work_order_no: 'GG-2026-0010', title: '茶颜悦色五一广场店', deadline: '2026-04-25' }
    ]
  }
})
function openDispatch(row) { form.work_order_no = row.work_order_no; form.id = row.id; showDialog.value = true }
async function submitDispatch() {
  try {
    await api.post('/assignments', { work_order_id: form.id, assigned_to: form.assigned_to, deadline: form.deadline, notes: form.notes })
    ElMessage.success('派单成功')
    showDialog.value = false
    onMounted
  } catch {}
}
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.wo-link { color: #1890ff; font-family: monospace; text-decoration: none; }
.text-muted { color: #8c8c8c; font-size: 12px; }
</style>
