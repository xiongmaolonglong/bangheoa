<template>
  <div class="users-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-title">
        <h2>用户管理</h2>
        <span class="total-count">共 {{ pagination.total }} 个用户</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleAddUser">
          <el-icon><Plus /></el-icon>
          新增用户
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="用户名/姓名/电话"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filterForm.role" placeholder="全部角色" clearable style="width: 140px">
            <el-option v-for="(label, value) in roleMap" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="users"
        v-loading="usersLoading"
        stripe
        class="users-table"
      >
        <el-table-column prop="username" label="用户名" min-width="120">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ (row.real_name || row.username || '?').charAt(0) }}
              </el-avatar>
              <span class="username">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="real_name" label="姓名" min-width="100" />
        <el-table-column prop="phone" label="电话" min-width="130" />
        <el-table-column prop="role" label="角色" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ roleMap[row.role] || row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="group" label="所属小组" min-width="140">
          <template #default="{ row }">
            <span v-if="row.group">{{ row.group.name }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              size="small"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最后登录" min-width="150">
          <template #default="{ row }">
            <span v-if="row.last_login_at">{{ formatDate(row.last_login_at) }}</span>
            <span v-else class="text-muted">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="150">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEditUser(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button text type="warning" size="small" @click="handleResetPassword(row)">
              <el-icon><Key /></el-icon>
              重置
            </el-button>
            <el-button text type="danger" size="small" @click="handleDeleteUser(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 用户编辑弹窗 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="userForm.id ? '编辑用户' : '新增用户'"
      width="560px"
      :close-on-click-modal="false"
      class="user-dialog"
    >
      <el-form
        :model="userForm"
        :rules="userRules"
        ref="userFormRef"
        label-width="80px"
        class="user-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="userForm.username"
                :disabled="!!userForm.id"
                placeholder="用于登录系统"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="real_name">
              <el-input v-model="userForm.real_name" placeholder="真实姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="!userForm.id">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="userForm.password"
                type="password"
                placeholder="留空默认123456"
                show-password
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="userForm.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="userForm.id">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="userForm.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch
                v-model="userForm.status"
                :active-value="1"
                :inactive-value="0"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="审核主管" value="reviewer" />
            <el-option label="设计师" value="designer" />
            <el-option label="生产员" value="producer" />
            <el-option label="核对员" value="checker" />
            <el-option label="安装员" value="installer" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">所属组织</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="省份">
              <el-select
                v-model="userForm.province_id"
                placeholder="选择省份"
                clearable
                @change="handleProvinceChange"
                style="width: 100%"
              >
                <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分区">
              <el-select
                v-model="userForm.district_id"
                placeholder="选择分区"
                clearable
                @change="handleDistrictChange"
                :disabled="!userForm.province_id"
                style="width: 100%"
              >
                <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="小组">
          <el-select
            v-model="userForm.group_id"
            placeholder="选择小组"
            clearable
            :disabled="!userForm.district_id"
            style="width: 100%"
          >
            <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="userSubmitLoading" @click="submitUser">
          确定
        </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog
      v-model="resetPasswordVisible"
      title="重置密码"
      width="420px"
      class="reset-dialog"
    >
      <div class="reset-user-info">
        <el-avatar :size="48" class="reset-avatar">
          {{ (resetPasswordForm.real_name || '?').charAt(0) }}
        </el-avatar>
        <div class="reset-user-detail">
          <div class="reset-name">{{ resetPasswordForm.real_name }}</div>
          <div class="reset-username">@{{ resetPasswordForm.username }}</div>
        </div>
      </div>

      <el-form :model="resetPasswordForm" label-width="80px" style="margin-top: 20px">
        <el-form-item label="新密码">
          <el-input
            v-model="resetPasswordForm.password"
            type="password"
            placeholder="留空则默认为 123456"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResetPassword">确定重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete, Key } from '@element-plus/icons-vue'
import { userApi, regionApi } from '@/api'
import request from '@/api/request'
import dayjs from 'dayjs'

const roleMap = {
  admin: '管理员',
  reviewer: '审核主管',
  designer: '设计师',
  producer: '生产员',
  checker: '核对员',
  installer: '安装员'
}

const getRoleTagType = (role) => {
  const types = {
    admin: 'danger',
    reviewer: 'warning',
    designer: 'success',
    producer: 'info',
    checker: 'info',
    installer: ''
  }
  return types[role] || ''
}

const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'

// 筛选
const filterForm = reactive({
  keyword: '',
  role: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const users = ref([])
const usersLoading = ref(false)
const userDialogVisible = ref(false)
const userSubmitLoading = ref(false)
const userFormRef = ref(null)
const userForm = reactive({
  id: null, username: '', real_name: '', password: '', phone: '',
  role: 'designer', province_id: null, district_id: null, group_id: null, status: 1
})
const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const provinces = ref([])
const districts = ref([])
const groups = ref([])

const loadProvinces = async () => {
  try {
    const res = await regionApi.getProvinces()
    provinces.value = res.data || []
  } catch (e) { console.error(e) }
}

const handleProvinceChange = async () => {
  userForm.district_id = null
  userForm.group_id = null
  districts.value = []
  groups.value = []
  if (userForm.province_id) {
    try {
      const res = await regionApi.getDistricts(userForm.province_id)
      districts.value = res.data || []
    } catch (e) { console.error(e) }
  }
}

const handleDistrictChange = async () => {
  userForm.group_id = null
  groups.value = []
  if (userForm.district_id) {
    try {
      const res = await regionApi.getGroups(userForm.district_id)
      groups.value = res.data || []
    } catch (e) { console.error(e) }
  }
}

const loadUsers = async () => {
  usersLoading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    }
    const res = await userApi.getList(params)
    users.value = res.data?.list || res.data || []
    pagination.total = res.data?.total || users.value.length
  } catch (e) { console.error(e) }
  finally { usersLoading.value = false }
}

const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

const handleReset = () => {
  filterForm.keyword = ''
  filterForm.role = ''
  filterForm.status = ''
  pagination.page = 1
  loadUsers()
}

const handleStatusChange = async (row) => {
  try {
    await userApi.updateStatus(row.id, row.status)
    ElMessage.success(row.status ? '已启用' : '已禁用')
  } catch (e) {
    row.status = row.status ? 0 : 1
    ElMessage.error('操作失败')
  }
}

const handleAddUser = () => {
  Object.assign(userForm, {
    id: null, username: '', real_name: '', password: '', phone: '',
    role: 'designer', province_id: null, district_id: null, group_id: null, status: 1
  })
  districts.value = []
  groups.value = []
  userDialogVisible.value = true
}

const handleEditUser = async (row) => {
  Object.assign(userForm, {
    id: row.id, username: row.username, real_name: row.real_name, password: '',
    phone: row.phone, role: row.role, province_id: row.province_id || null,
    district_id: row.district_id || null, group_id: row.group_id || null, status: row.status
  })
  if (row.province_id) {
    const res = await regionApi.getDistricts(row.province_id)
    districts.value = res.data || []
  }
  if (row.district_id) {
    const res = await regionApi.getGroups(row.district_id)
    groups.value = res.data || []
  }
  userDialogVisible.value = true
}

const handleDeleteUser = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.real_name}」？`, '删除确认', { type: 'warning' })
    await userApi.delete(row.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

const submitUser = async () => {
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return
  userSubmitLoading.value = true
  try {
    const data = { ...userForm }
    if (!data.password) delete data.password
    if (userForm.id) {
      await userApi.update(userForm.id, data)
      ElMessage.success('更新成功')
    } else {
      await userApi.create(data)
      ElMessage.success('创建成功')
    }
    userDialogVisible.value = false
    loadUsers()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    userSubmitLoading.value = false
  }
}

const resetPasswordVisible = ref(false)
const resetPasswordForm = reactive({ id: null, username: '', real_name: '', password: '' })

const handleResetPassword = (row) => {
  Object.assign(resetPasswordForm, {
    id: row.id,
    username: row.username,
    real_name: row.real_name,
    password: ''
  })
  resetPasswordVisible.value = true
}

const submitResetPassword = async () => {
  try {
    await request.post(`/users/${resetPasswordForm.id}/reset-password`, {
      password: resetPasswordForm.password || undefined
    })
    ElMessage.success('密码已重置为: ' + (resetPasswordForm.password || '123456'))
    resetPasswordVisible.value = false
  } catch (e) { ElMessage.error('重置失败') }
}

onMounted(() => {
  loadUsers()
  loadProvinces()
})
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.total-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选卡片 */
.filter-card {
  border: 1px solid var(--border);
}

.filter-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 8px;
}

/* 表格卡片 */
.table-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  flex: 1;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.users-table {
  --el-table-header-bg-color: var(--bg-tertiary);
  --el-table-header-text-color: var(--text-primary);
}

.users-table :deep(th) {
  font-weight: 600;
}

/* 用户信息单元格 */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.username {
  font-weight: 500;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-tertiary);
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

/* 弹窗样式 */
.user-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.user-form :deep(.el-divider__text) {
  font-size: 13px;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 重置密码弹窗 */
.reset-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.reset-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.reset-avatar {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

.reset-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}

.reset-username {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-title {
    justify-content: space-between;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .filter-form :deep(.el-form-item .el-input),
  .filter-form :deep(.el-form-item .el-select) {
    width: 100% !important;
  }

  .filter-form :deep(.el-form-item:last-child) {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .users-table :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }

  .pagination-wrapper {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  .pagination-wrapper :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
