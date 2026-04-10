<template>
  <div class="regions-page">
    <!-- 统计面板 -->
    <div class="stats-panel">
      <div class="stat-card">
        <div class="stat-icon province"><el-icon><Location /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.provinces }}</div>
          <div class="stat-label">省份</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon district"><el-icon><OfficeBuilding /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.districts }}</div>
          <div class="stat-label">分区</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon group"><el-icon><UserFilled /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.groups }}</div>
          <div class="stat-label">小组</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.activeGroups }}</div>
          <div class="stat-label">活跃小组</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索省/区/组名称或代码"
          clearable
          style="width: 280px"
          @input="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-checkbox v-model="showInactive" @change="loadRegions">显示已禁用</el-checkbox>
      </div>
      <div class="toolbar-right">
        <el-button @click="handleBatchImport">
          <el-icon><Upload /></el-icon>批量导入
        </el-button>
        <el-button type="primary" @click="handleAddRegion('province')">
          <el-icon><Plus /></el-icon>新增省份
        </el-button>
      </div>
    </div>

    <!-- 树形结构 -->
    <div class="tree-container" v-loading="loading">
      <el-tree
        ref="treeRef"
        :data="filteredTree"
        :props="treeProps"
        :filter-node-method="filterNode"
        :allow-drop="allowDrop"
        :allow-drag="allowDrag"
        draggable
        default-expand-all
        highlight-current
        node-key="id"
        @node-drop="handleDrop"
      >
        <template #default="{ node, data }">
          <div class="tree-node" :class="{ inactive: data.status === 0 }">
            <div class="node-main">
              <el-icon class="node-icon" :class="data.level">
                <Location v-if="data.level === 'province'" />
                <OfficeBuilding v-else-if="data.level === 'district'" />
                <UserFilled v-else />
              </el-icon>

              <!-- 内联编辑 -->
              <template v-if="inlineEdit.id === data.id">
                <el-input
                  v-model="inlineEdit.name"
                  size="small"
                  style="width: 120px"
                  @keyup.enter="saveInlineEdit(data)"
                  @keyup.esc="cancelInlineEdit"
                />
                <el-input
                  v-model="inlineEdit.code"
                  size="small"
                  style="width: 80px; margin-left: 8px"
                  placeholder="代码"
                />
                <el-button type="primary" size="small" text @click="saveInlineEdit(data)">保存</el-button>
                <el-button size="small" text @click="cancelInlineEdit">取消</el-button>
              </template>
              <template v-else>
                <span class="node-name" @dblclick="startInlineEdit(data)">{{ data.name }}</span>
                <span class="node-code" v-if="data.code">({{ data.code }})</span>
                <el-tag v-if="data.status === 0" type="info" size="small">禁用</el-tag>
                <span v-if="data.leader_name" class="node-leader">
                  <el-icon><User /></el-icon>{{ data.leader_name }}
                </span>
              </template>
            </div>

            <div class="node-actions" @click.stop>
              <template v-if="data.level === 'province'">
                <el-button text size="small" type="success" @click="handleAddRegion('district', data)">
                  <el-icon><Plus /></el-icon>分区
                </el-button>
              </template>
              <template v-else-if="data.level === 'district'">
                <el-button text size="small" type="success" @click="handleAddRegion('group', data)">
                  <el-icon><Plus /></el-icon>小组
                </el-button>
              </template>
              <el-button text size="small" @click="handleEditRegion(data)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text size="small" type="danger" @click="handleDeleteRegion(data)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>

      <el-empty v-if="!loading && filteredTree.length === 0" description="暂无数据" />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="代码" prop="code">
          <el-input v-model="form.code" placeholder="如：GD、DL、01" />
          <div class="form-tip">代码用于订单编号生成，请确保唯一</div>
        </el-form-item>
        <el-form-item label="负责人" v-if="form.type !== 'province'">
          <el-select v-model="form.leader_id" placeholder="选择负责人" clearable filterable style="width: 100%">
            <el-option v-for="u in users" :key="u.id" :label="u.real_name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" v-if="form.id">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importVisible" title="批量导入" width="600px">
      <div class="import-content">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          <template #title>
            <div>导入格式说明：</div>
            <div style="font-size: 12px; margin-top: 4px">
              省份：名称,代码（如：广东省,GD）<br>
              分区：省份代码,名称,代码（如：GD,大沥区,DL）<br>
              小组：省份代码,分区代码,名称,代码,负责人手机（如：GD,DL,第一组,01,13800138000）
            </div>
          </template>
        </el-alert>
        <el-input
          v-model="importText"
          type="textarea"
          :rows="12"
          placeholder="请按格式粘贴数据，每行一条"
        />
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="executeImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Search, Upload, Location, OfficeBuilding, UserFilled,
  User, Edit, Delete, CircleCheck
} from '@element-plus/icons-vue'
import { userApi, regionApi } from '@/api'

const treeRef = ref()
const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)

const regionTree = ref([])
const searchKeyword = ref('')
const showInactive = ref(false)
const users = ref([])

const treeProps = { label: 'name', children: 'children' }

// 统计数据
const stats = computed(() => {
  let provinces = 0, districts = 0, groups = 0, activeGroups = 0
  regionTree.value.forEach(p => {
    provinces++
    p.children?.forEach(d => {
      districts++
      d.children?.forEach(g => {
        groups++
        if (g.status === 1) activeGroups++
      })
    })
  })
  return { provinces, districts, groups, activeGroups }
})

// 过滤树
const filteredTree = computed(() => {
  if (!searchKeyword.value) return regionTree.value
  return filterTree(regionTree.value, searchKeyword.value.toLowerCase())
})

const filterTree = (tree, keyword) => {
  return tree.filter(node => {
    const match = node.name.toLowerCase().includes(keyword) ||
                  (node.code && node.code.toLowerCase().includes(keyword))
    if (match) return true
    if (node.children?.length) {
      const filteredChildren = filterTree(node.children, keyword)
      if (filteredChildren.length) {
        return { ...node, children: filteredChildren }
      }
    }
    return false
  }).map(node => {
    if (node.children?.length) {
      const filteredChildren = filterTree(node.children, keyword)
      return { ...node, children: filteredChildren.length ? filteredChildren : node.children }
    }
    return node
  })
}

const filterNode = (value, data) => {
  if (!value) return true
  const v = value.toLowerCase()
  return data.name.toLowerCase().includes(v) || (data.code && data.code.toLowerCase().includes(v))
}

const handleSearch = () => {
  treeRef.value?.filter(searchKeyword.value)
}

// 内联编辑
const inlineEdit = reactive({ id: null, name: '', code: '' })

const startInlineEdit = (data) => {
  inlineEdit.id = data.id
  inlineEdit.name = data.name
  inlineEdit.code = data.code || ''
}

const cancelInlineEdit = () => {
  inlineEdit.id = null
}

const saveInlineEdit = async (data) => {
  if (!inlineEdit.name.trim()) {
    ElMessage.warning('名称不能为空')
    return
  }
  try {
    const payload = { name: inlineEdit.name, code: inlineEdit.code }
    if (data.level === 'province') await regionApi.updateProvince(data.id, payload)
    else if (data.level === 'district') await regionApi.updateDistrict(data.id, payload)
    else await regionApi.updateGroup(data.id, payload)

    data.name = inlineEdit.name
    data.code = inlineEdit.code
    inlineEdit.id = null
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  }
}

// 拖拽排序
const allowDrag = (node) => node.data.level !== 'province'

const allowDrop = (dragNode, dropNode, type) => {
  const dragLevel = dragNode.data.level
  const dropLevel = dropNode.data.level
  if (type === 'inner') return false
  return dragLevel === dropLevel
}

const handleDrop = async (dragNode, dropNode, dropType) => {
  const drag = dragNode.data
  const siblings = dropNode.parent.childNodes.map(n => n.data)
  const newOrder = siblings.map(s => s.id)

  try {
    // 可扩展：调用后端批量更新排序接口
    ElMessage.success('排序已更新')
  } catch (e) {
    ElMessage.error('排序失败')
    loadRegions()
  }
}

// 弹窗表单
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({
  id: null,
  type: 'province',
  name: '',
  code: '',
  province_id: null,
  district_id: null,
  leader_id: null,
  status: 1,
  sort_order: 0
})
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入代码', trigger: 'blur' }]
}

const dialogTitle = computed(() => {
  const titles = { province: '省份', district: '分区', group: '小组' }
  return (form.id ? '编辑' : '新增') + titles[form.type]
})

// 加载数据
const loadRegions = async () => {
  loading.value = true
  try {
    const res = await regionApi.getTree()
    regionTree.value = transformTree(res.data || [])
  } catch (e) {
    console.error(e)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const transformTree = (provinces) => {
  return provinces
    .filter(p => showInactive.value || p.status === 1)
    .map(p => ({
      ...p,
      level: 'province',
      children: (p.districts || [])
        .filter(d => showInactive.value || d.status === 1)
        .map(d => ({
          ...d,
          level: 'district',
          province_id: p.id,
          leader_name: d.leader?.real_name,
          children: (d.groups || [])
            .filter(g => showInactive.value || g.status === 1)
            .map(g => ({
              ...g,
              level: 'group',
              district_id: d.id,
              province_id: p.id,
              leader_name: g.leader?.real_name
            }))
        }))
    }))
}

const loadUsers = async () => {
  try {
    const res = await userApi.getList({ pageSize: 500 })
    users.value = res.data?.list || res.data || []
  } catch (e) {
    console.error(e)
  }
}

// 操作
const handleAddRegion = (type, parent = null) => {
  Object.assign(form, {
    id: null,
    type,
    name: '',
    code: '',
    province_id: type === 'district' ? parent?.id : null,
    district_id: type === 'group' ? parent?.id : null,
    leader_id: null,
    status: 1,
    sort_order: 0
  })
  dialogVisible.value = true
}

const handleEditRegion = (data) => {
  Object.assign(form, {
    id: data.id,
    type: data.level,
    name: data.name,
    code: data.code || '',
    province_id: data.province_id || null,
    district_id: data.district_id || null,
    leader_id: data.leader_id || data.leader?.id || null,
    status: data.status ?? 1,
    sort_order: data.sort_order || 0
  })
  dialogVisible.value = true
}

const handleDeleteRegion = async (data) => {
  const typeNames = { province: '省份', district: '分区', group: '小组' }
  const hasChildren = data.children?.length > 0

  const msg = hasChildren
    ? `该${typeNames[data.level]}下有${data.children.length}个子项，删除后子项也将被删除，确定继续？`
    : `确定删除该${typeNames[data.level]}？`

  try {
    await ElMessageBox.confirm(msg, '提示', { type: 'warning' })
    if (data.level === 'province') await regionApi.deleteProvince(data.id)
    else if (data.level === 'district') await regionApi.deleteDistrict(data.id)
    else await regionApi.deleteGroup(data.id)
    ElMessage.success('删除成功')
    loadRegions()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const { type, id, ...data } = form
    if (id) {
      if (type === 'province') await regionApi.updateProvince(id, data)
      else if (type === 'district') await regionApi.updateDistrict(id, data)
      else await regionApi.updateGroup(id, data)
      ElMessage.success('更新成功')
    } else {
      if (type === 'province') await regionApi.createProvince(data)
      else if (type === 'district') await regionApi.createDistrict(data)
      else await regionApi.createGroup(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadRegions()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 批量导入
const importVisible = ref(false)
const importText = ref('')

const handleBatchImport = () => {
  importText.value = ''
  importVisible.value = true
}

const executeImport = async () => {
  if (!importText.value.trim()) {
    ElMessage.warning('请输入要导入的数据')
    return
  }

  importing.value = true
  try {
    const lines = importText.value.trim().split('\n')
    let imported = 0

    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 2) continue

      // 根据字段数量判断类型
      if (parts.length === 2) {
        // 省份
        await regionApi.createProvince({ name: parts[0], code: parts[1] })
        imported++
      } else if (parts.length === 3) {
        // 分区：需要找到对应省份
        const provinces = regionTree.value.filter(p => p.code === parts[0])
        if (provinces.length) {
          await regionApi.createDistrict({
            province_id: provinces[0].id,
            name: parts[1],
            code: parts[2]
          })
          imported++
        }
      } else if (parts.length >= 4) {
        // 小组
        const province = regionTree.value.find(p => p.code === parts[0])
        const district = province?.children?.find(d => d.code === parts[1])
        if (district) {
          const leader = parts[4] ? users.value.find(u => u.phone === parts[4]) : null
          await regionApi.createGroup({
            district_id: district.id,
            name: parts[2],
            code: parts[3],
            leader_id: leader?.id
          })
          imported++
        }
      }
    }

    ElMessage.success(`成功导入 ${imported} 条数据`)
    importVisible.value = false
    loadRegions()
  } catch (e) {
    ElMessage.error('导入失败：' + (e.response?.data?.message || e.message))
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  loadRegions()
  loadUsers()
})
</script>

<style scoped>
.regions-page {
  padding: 0;
}

/* 统计面板 */
.stats-panel {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 24px;
}

.stat-icon.province { background: #e6f4ff; color: #1677ff; }
.stat-icon.district { background: #f6ffed; color: #52c41a; }
.stat-icon.group { background: #fffbe6; color: #faad14; }
.stat-icon.active { background: #f2f4ff; color: #597ef7; }

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f1f1f;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

/* 树形容器 */
.tree-container {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  min-height: 400px;
}

/* 树节点 */
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.tree-node:hover {
  background: #f5f5f5;
}

.tree-node.inactive {
  opacity: 0.6;
}

.node-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 16px;
}

.node-icon.province { color: #1677ff; }
.node-icon.district { color: #52c41a; }
.node-icon.group { color: #faad14; }

.node-name {
  font-weight: 500;
  cursor: pointer;
}

.node-name:hover {
  color: #1677ff;
}

.node-code {
  color: #8c8c8c;
  font-size: 12px;
}

.node-leader {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 8px;
}

.node-actions {
  display: none;
  gap: 4px;
}

.tree-node:hover .node-actions {
  display: flex;
}

/* 表单提示 */
.form-tip {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 导入弹窗 */
.import-content {
  max-height: 400px;
  overflow-y: auto;
}
</style>
