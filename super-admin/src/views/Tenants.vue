<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { getTenantList, createTenant } from '@/api/tenants'

// --- Filter & pagination ---
const filters = reactive({
  status: '',
  region: '',
  keyword: ''
})

const loading = ref(false)
const tableData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// --- Create dialog ---
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({
  name: '',
  contact: '',
  phone: '',
  email: '',
  province: '',
  city: '',
  district: '',
  street: '',
  maxUsers: 50,
  workOrderPrefix: '',
  initialPassword: ''
})

const formRules = {
  name: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  province: [{ required: true, message: '请选择省份', trigger: 'change' }],
  maxUsers: [{ required: true, message: '请输入最大用户数', trigger: 'blur' }],
  workOrderPrefix: [{ required: true, message: '请输入工单编号前缀', trigger: 'blur' }],
  initialPassword: [{ required: true, message: '请输入初始密码', trigger: 'blur' }]
}

// --- Demo data ---
const demoData = [
  {
    id: 1,
    name: '盛世文化传媒有限公司',
    contact: '王建国',
    phone: '13800138001',
    region: '广东省-深圳市-南山区',
    userCount: 45,
    workOrderCount: 128,
    status: 'active',
    createdAt: '2025-06-15'
  },
  {
    id: 2,
    name: '华艺广告制作有限公司',
    contact: '李明华',
    phone: '13900139002',
    region: '广东省-广州市-天河区',
    userCount: 32,
    workOrderCount: 96,
    status: 'active',
    createdAt: '2025-08-22'
  },
  {
    id: 3,
    name: '博视标识设计工程公司',
    contact: '张晓峰',
    phone: '13700137003',
    region: '广东省-东莞市-南城区',
    userCount: 18,
    workOrderCount: 54,
    status: 'active',
    createdAt: '2025-09-10'
  },
  {
    id: 4,
    name: '瑞达展示展览有限公司',
    contact: '陈思远',
    phone: '13600136004',
    region: '广东省-佛山市-顺德区',
    userCount: 27,
    workOrderCount: 73,
    status: 'paused',
    createdAt: '2025-07-03'
  },
  {
    id: 5,
    name: '天合美陈广告有限公司',
    contact: '赵雨晴',
    phone: '13500135005',
    region: '广东省-珠海市-香洲区',
    userCount: 12,
    workOrderCount: 31,
    status: 'active',
    createdAt: '2025-11-18'
  }
]

// --- Methods ---
async function fetchData() {
  loading.value = true
  try {
    const res = await getTenantList({
      ...filters,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    tableData.value = res.data?.list || res.data || []
    pagination.total = res.data?.total || tableData.value.length
  } catch {
    let data = [...demoData]
    if (filters.status) {
      data = data.filter((t) => t.status === filters.status)
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase()
      data = data.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.contact.toLowerCase().includes(kw) ||
          t.phone.includes(kw)
      )
    }
    if (filters.region) {
      data = data.filter((t) => t.region.includes(filters.region))
    }
    tableData.value = data
    pagination.total = data.length
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchData()
}

function handleReset() {
  filters.status = ''
  filters.region = ''
  filters.keyword = ''
  handleSearch()
}

function handlePageChange(page) {
  pagination.current = page
  fetchData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchData()
}

function handleView(row) {
  window.location.hash = `/tenants/${row.id}`
}

async function handlePause(row) {
  const action = row.status === 'active' ? '暂停' : '恢复'
  try {
    await ElMessageBox.confirm(
      `确定要${action}租户「${row.name}」吗？`,
      `确认${action}`,
      { type: 'warning' }
    )
    row.status = row.status === 'active' ? 'paused' : 'active'
    ElMessage.success(`${action}成功`)
  } catch {
    // cancelled
  }
}

function handleConfig(row) {
  ElMessage.info(`配置功能开发中：${row.name}`)
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    submitting.value = true
    const payload = {
      name: form.name,
      contact: form.contact,
      phone: form.phone,
      email: form.email,
      region: `${form.province}-${form.city}-${form.district}-${form.street}`,
      maxUsers: form.maxUsers,
      workOrderPrefix: form.workOrderPrefix,
      initialPassword: form.initialPassword
    }
    await createTenant(payload)
    ElMessage.success('租户开通成功')
    dialogVisible.value = false
    resetForm()
    fetchData()
  } catch (err) {
    if (err !== false) {
      ElMessage.success('租户开通成功（演示模式）')
      tableData.value.unshift({
        id: Date.now(),
        name: form.name,
        contact: form.contact,
        phone: form.phone,
        region: `${form.province}-${form.city}-${form.district}-${form.street}`,
        userCount: 0,
        workOrderCount: 0,
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10)
      })
      pagination.total = tableData.value.length
      dialogVisible.value = false
      resetForm()
    }
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.name = ''
  form.contact = ''
  form.phone = ''
  form.email = ''
  form.province = ''
  form.city = ''
  form.district = ''
  form.street = ''
  form.maxUsers = 50
  form.workOrderPrefix = ''
  form.initialPassword = ''
}

function handleDialogClose() {
  resetForm()
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <h2>租户管理</h2>
      <el-button type="primary" :icon="Plus" @click="dialogVisible = true">
        开通租户
      </el-button>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option label="正常" value="active" />
            <el-option label="已暂停" value="paused" />
          </el-select>
        </el-form-item>

        <el-form-item label="地区">
          <el-select
            v-model="filters.region"
            placeholder="全部地区"
            clearable
            style="width: 160px"
          >
            <el-option label="深圳市" value="深圳市" />
            <el-option label="广州市" value="广州市" />
            <el-option label="东莞市" value="东莞市" />
            <el-option label="佛山市" value="佛山市" />
            <el-option label="珠海市" value="珠海市" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索租户名称 / 联系人 / 电话"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="租户名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系人" width="120" />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="region" label="地区" min-width="180" show-overflow-tooltip />
        <el-table-column prop="userCount" label="用户数" width="90" align="center" />
        <el-table-column prop="workOrderCount" label="工单数" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '已暂停' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              size="small"
              @click="handlePause(row)"
            >
              {{ row.status === 'active' ? '暂停' : '恢复' }}
            </el-button>
            <el-button link type="info" size="small" @click="handleConfig(row)">
              配置
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- Create Dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="开通租户"
      width="680px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入租户名称" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱地址" />
        </el-form-item>

        <el-form-item label="负责区域">
          <el-row :gutter="8">
            <el-col :span="6">
              <el-form-item prop="province">
                <el-select v-model="form.province" placeholder="省" style="width: 100%">
                  <el-option label="广东省" value="广东省" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item>
                <el-select v-model="form.city" placeholder="市" style="width: 100%">
                  <el-option label="深圳市" value="深圳市" />
                  <el-option label="广州市" value="广州市" />
                  <el-option label="东莞市" value="东莞市" />
                  <el-option label="佛山市" value="佛山市" />
                  <el-option label="珠海市" value="珠海市" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item>
                <el-select v-model="form.district" placeholder="区" style="width: 100%">
                  <el-option label="南山区" value="南山区" />
                  <el-option label="天河区" value="天河区" />
                  <el-option label="南城区" value="南城区" />
                  <el-option label="顺德区" value="顺德区" />
                  <el-option label="香洲区" value="香洲区" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item>
                <el-input v-model="form.street" placeholder="街道" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="最大用户数" prop="maxUsers">
              <el-input-number v-model="form.maxUsers" :min="1" :max="9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工单前缀" prop="workOrderPrefix">
              <el-input v-model="form.workOrderPrefix" placeholder="如: SSWH" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="初始密码" prop="initialPassword">
              <el-input v-model="form.initialPassword" placeholder="初始登录密码" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认开通
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
