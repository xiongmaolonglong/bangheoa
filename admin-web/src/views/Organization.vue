<template>
  <div>
    <div class="page-header"><h1 class="page-title">组织架构</h1></div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="部门管理" name="departments">
        <div class="toolbar mb-16"><el-button type="primary" @click="showDeptDialog = true">+ 创建部门</el-button></div>
        <el-table :data="departments" stripe>
          <el-table-column prop="name" label="部门名称" min-width="150" />
          <el-table-column prop="manager_name" label="负责人" width="100" />
          <el-table-column prop="user_count" label="人员数" width="80" />
          <el-table-column label="操作">
            <el-button size="small">编辑</el-button>
            <el-button size="small" type="danger">删除</el-button>
          </el-table-column>
        </el-table>
        <el-dialog v-model="showDeptDialog" title="创建部门" width="480px">
          <el-form label-width="80px">
            <el-form-item label="部门名称"><el-input v-model="deptForm.name" placeholder="请输入部门名称" /></el-form-item>
            <el-form-item label="负责人">
              <el-select v-model="deptForm.manager_id" placeholder="请选择" style="width:100%">
                <el-option label="王五" :value="1" />
                <el-option label="李四" :value="2" />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer><el-button @click="showDeptDialog = false">取消</el-button><el-button type="primary">确认创建</el-button></template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="人员管理" name="users">
        <div class="toolbar mb-16">
          <el-select v-model="userFilter.role" placeholder="全部角色" clearable class="mr-8" style="width:120px">
            <el-option label="管理员" value="admin" />
            <el-option label="派单员" value="dispatcher" />
            <el-option label="测量员" value="measurer" />
            <el-option label="设计师" value="designer" />
            <el-option label="生产管理员" value="producer" />
            <el-option label="施工队长" value="constructor" />
            <el-option label="财务" value="finance" />
          </el-select>
          <el-button type="primary" @click="showUserDialog = true">+ 添加人员</el-button>
        </div>
        <el-table :data="users" stripe>
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column label="角色" width="100"><template #default="{ row }"><el-tag size="small" type="info">{{ row.role }}</el-tag></template></el-table-column>
          <el-table-column prop="department_name" label="部门" width="100" />
          <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small" :type="row.status === 'active' ? 'success' : 'danger'">{{ row.status === 'active' ? '正常' : '禁用' }}</el-tag></template></el-table-column>
          <el-table-column label="操作">
            <el-button size="small">编辑</el-button>
            <el-button size="small">重置密码</el-button>
          </el-table-column>
        </el-table>
        <el-dialog v-model="showUserDialog" title="添加人员" width="480px">
          <el-form label-width="80px">
            <el-form-item label="姓名"><el-input v-model="userForm.name" /></el-form-item>
            <el-form-item label="手机号"><el-input v-model="userForm.phone" /></el-form-item>
            <el-form-item label="密码"><el-input v-model="userForm.password" type="password" /></el-form-item>
            <el-form-item label="角色">
              <el-select v-model="userForm.role" style="width:100%">
                <el-option label="管理员" value="admin" />
                <el-option label="派单员" value="dispatcher" />
                <el-option label="测量员/施工员" value="measurer" />
                <el-option label="设计师" value="designer" />
                <el-option label="生产管理员" value="producer" />
                <el-option label="财务" value="finance" />
              </el-select>
            </el-form-item>
            <el-form-item label="部门">
              <el-select v-model="userForm.department_id" style="width:100%">
                <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer><el-button @click="showUserDialog = false">取消</el-button><el-button type="primary">确认添加</el-button></template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script setup>
import { ref, reactive } from 'vue'
const activeTab = ref('departments')
const showDeptDialog = ref(false)
const showUserDialog = ref(false)
const deptForm = reactive({ name: '', manager_id: '' })
const userForm = reactive({ name: '', phone: '', password: '', role: '', department_id: '' })
const userFilter = reactive({ role: '' })
const departments = ref([
  { id: 1, name: '设计部', manager_name: '王五', user_count: 3 },
  { id: 2, name: '工程部', manager_name: '赵六', user_count: 5 },
  { id: 3, name: '市场部', manager_name: '', user_count: 2 }
])
const users = ref([
  { id: 1, name: '王五', phone: '138****0001', role: '管理员', department_name: '设计部', status: 'active' },
  { id: 2, name: '李四', phone: '138****0002', role: '测量员', department_name: '工程部', status: 'active' },
  { id: 3, name: '赵六', phone: '138****0003', role: '施工队长', department_name: '工程部', status: 'active' },
  { id: 4, name: '孙七', phone: '138****0004', role: '生产管理员', department_name: '工程部', status: 'active' }
])
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.toolbar { display: flex; align-items: center; gap: 8px; }
.mr-8 { margin-right: 8px; }
.mb-16 { margin-bottom: 16px; }
</style>
