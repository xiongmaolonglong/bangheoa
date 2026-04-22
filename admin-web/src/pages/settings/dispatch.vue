<template>
  <div class="dispatch-rules-page">
    <!-- 自动派单开关 -->
    <el-card class="mode-card" shadow="never">
      <div class="mode-header">
        <div class="mode-info">
          <span class="mode-title">自动派单</span>
          <span class="mode-desc">{{ dispatchMode === 'auto' ? '开启后，审核通过时自动分配给任务最少的用户' : '关闭后，审核通过时需手动选择处理人' }}</span>
        </div>
        <el-switch
          v-model="dispatchMode"
          active-value="auto"
          inactive-value="manual"
          active-text="自动"
          inactive-text="手动"
          :loading="modeSaving"
          @change="handleModeChange"
        />
      </div>
    </el-card>

    <div class="page-header">
      <h3>派单规则</h3>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新建规则
      </el-button>
    </div>

    <div class="rules-list">
      <el-table :data="rules" v-loading="loading" stripe>
        <el-table-column prop="name" label="规则名称" width="150" />
        <el-table-column label="派单阶段" width="100">
          <template #default="{ row }">
            <el-tag :type="stageMap[row.stage]?.type">{{ stageMap[row.stage]?.text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="地区限制" width="180">
          <template #default="{ row }">
            <span v-if="row.province || row.district || row.group">
              {{ row.province?.name }} {{ row.district?.name }} {{ row.group?.name }}
            </span>
            <span v-else class="text-muted">不限</span>
          </template>
        </el-table-column>
        <el-table-column label="目标" width="150">
          <template #default="{ row }">
            <span v-if="row.targetUser">{{ row.targetUser.real_name }}</span>
            <span v-else-if="row.target_role">{{ roleMap[row.target_role] }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="负载均衡" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.load_balance ? 'success' : 'info'" size="small">
              {{ row.load_balance ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRule(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑规则' : '新建规则'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="规则名称" required>
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="派单阶段" required>
          <el-select v-model="form.stage" placeholder="选择派单阶段">
            <el-option label="设计派单" value="design" />
            <el-option label="生产派单" value="produce" />
            <el-option label="安装派单" value="install" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份">
          <el-select v-model="form.province_id" placeholder="不限" clearable @change="handleProvinceChange">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分区">
          <el-select v-model="form.district_id" placeholder="不限" clearable @change="handleDistrictChange">
            <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="小组">
          <el-select v-model="form.group_id" placeholder="不限" clearable>
            <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="指定用户">
          <el-select v-model="form.target_user_id" placeholder="不指定" clearable>
            <el-option v-for="u in users" :key="u.id" :label="u.real_name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标角色">
          <el-select v-model="form.target_role" placeholder="选择角色" clearable>
            <el-option label="设计师" value="designer" />
            <el-option label="生产员" value="producer" />
            <el-option label="外勤员" value="field_worker" />
          </el-select>
        </el-form-item>
        <el-form-item label="负载均衡">
          <el-switch v-model="form.load_balance" />
          <span class="form-tip">开启后将自动分配给负载最少的用户</span>
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" :max="100" />
          <span class="form-tip">数字越大优先级越高</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/api/request'

const loading = ref(false)
const submitting = ref(false)
const modeSaving = ref(false)
const rules = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)

const dispatchMode = ref('manual')

const loadDispatchMode = async () => {
  try {
    const res = await request.get('/config/dispatch_mode')
    dispatchMode.value = res.data?.value || 'manual'
  } catch {
    dispatchMode.value = 'manual'
  }
}

const handleModeChange = async () => {
  modeSaving.value = true
  try {
    await request.put('/config/dispatch_mode', {
      value: dispatchMode.value,
      type: 'string',
      description: '派单模式：auto=自动派单，manual=手动派单'
    })
    ElMessage.success(dispatchMode.value === 'auto' ? '已开启自动派单' : '已切换为手动派单')
  } catch (err) {
    dispatchMode.value = dispatchMode.value === 'auto' ? 'manual' : 'auto'
    ElMessage.error('设置失败')
  } finally {
    modeSaving.value = false
  }
}

const provinces = ref([])
const districts = ref([])
const groups = ref([])
const users = ref([])

const form = reactive({
  id: null,
  name: '',
  stage: '',
  province_id: null,
  district_id: null,
  group_id: null,
  target_user_id: null,
  target_role: '',
  load_balance: true,
  priority: 0
})

const stageMap = {
  design: { text: '设计', type: 'purple' },
  produce: { text: '生产', type: 'success' },
  install: { text: '安装', type: 'warning' }
}

const roleMap = {
  designer: '设计师',
  producer: '生产员',
  field_worker: '外勤员'
}

const fetchRules = async () => {
  loading.value = true
  try {
    const res = await request.get('/dispatch-rules')
    rules.value = res.data || []
  } catch (err) {
    ElMessage.error('获取规则失败')
  } finally {
    loading.value = false
  }
}

const fetchProvinces = async () => {
  try {
    const res = await request.get('/regions/provinces')
    provinces.value = res.data || []
  } catch (err) {}
}

const fetchUsers = async () => {
  try {
    const res = await request.get('/users', { params: { pageSize: 100 } })
    users.value = res.data?.list || []
  } catch (err) {}
}

const handleProvinceChange = async (val) => {
  form.district_id = null
  form.group_id = null
  if (val) {
    const res = await request.get(`/regions/provinces/${val}/districts`)
    districts.value = res.data || []
  } else {
    districts.value = []
    groups.value = []
  }
}

const handleDistrictChange = async (val) => {
  form.group_id = null
  if (val) {
    const res = await request.get(`/regions/districts/${val}/groups`)
    groups.value = res.data || []
  } else {
    groups.value = []
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null, name: '', stage: '', province_id: null, district_id: null,
    group_id: null, target_user_id: null, target_role: '', load_balance: true, priority: 0
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    stage: row.stage,
    province_id: row.province_id,
    district_id: row.district_id,
    group_id: row.group_id,
    target_user_id: row.target_user_id,
    target_role: row.target_role,
    load_balance: row.load_balance,
    priority: row.priority
  })
  if (row.province_id) handleProvinceChange(row.province_id)
  if (row.district_id) handleDistrictChange(row.district_id)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name || !form.stage) {
    return ElMessage.warning('请填写规则名称和派单阶段')
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await request.put(`/dispatch-rules/${form.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await request.post('/dispatch-rules', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchRules()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除此规则？', '删除确认', { type: 'warning' })
    await request.delete(`/dispatch-rules/${row.id}`)
    ElMessage.success('删除成功')
    fetchRules()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败')
  }
}

const toggleRule = async (row) => {
  try {
    await request.post(`/dispatch-rules/${row.id}/toggle`)
    ElMessage.success(row.enabled ? '已启用' : '已禁用')
  } catch (err) {
    row.enabled = !row.enabled
    ElMessage.error('操作失败')
  }
}

onMounted(() => {
  fetchRules()
  fetchProvinces()
  fetchUsers()
  loadDispatchMode()
})
</script>

<style scoped>
.dispatch-rules-page {
  padding: 20px;
}

.mode-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.mode-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h3 {
  margin: 0;
}

.rules-list {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
}

.text-muted {
  color: var(--text-muted);
}

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
