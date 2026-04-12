<template>
  <div>
    <h1 class="page-title">甲方监管</h1>

    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索甲方名称" clearable style="width:200px" @change="loadData" />
      <el-select v-model="tenantFilter" placeholder="全部租户" clearable style="width:180px" @change="loadData">
        <el-option label="盛世文化传媒有限公司" value="盛世文化传媒有限公司" />
        <el-option label="华艺广告制作有限公司" value="华艺广告制作有限公司" />
        <el-option label="博视标识设计工程公司" value="博视标识设计工程公司" />
        <el-option label="瑞达展示展览有限公司" value="瑞达展示展览有限公司" />
      </el-select>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="甲方列表" name="clients">
        <el-table :data="clientList" stripe>
          <el-table-column prop="name" label="甲方名称" min-width="200" />
          <el-table-column prop="tenant_name" label="所属租户" min-width="200" />
          <el-table-column prop="contact" label="联系人" width="100" />
          <el-table-column prop="work_order_count" label="工单数" width="80" align="center" />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="showClientDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="申报监控" name="declarations">
        <el-table :data="declarationList" stripe>
          <el-table-column prop="client_name" label="甲方名称" width="180" />
          <el-table-column prop="tenant_name" label="所属租户" width="180" />
          <el-table-column prop="work_order_no" label="工单号" width="140" />
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column prop="current_stage" label="当前环节" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="stageType(row.current_stage)">{{ row.current_stage }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="流转状态" width="200">
            <template #default="{ row }">
              <el-steps :active="flowStep(row.flow)" size="small" simple>
                <el-step title="申报" />
                <el-step title="审批" />
                <el-step title="推送" />
              </el-steps>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交时间" width="160" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showDialog" title="甲方详情" width="560px">
      <el-descriptions :column="1" border v-if="currentClient">
        <el-descriptions-item label="甲方名称">{{ currentClient.name }}</el-descriptions-item>
        <el-descriptions-item label="所属租户">{{ currentClient.tenant_name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentClient.contact }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentClient.phone }}</el-descriptions-item>
        <el-descriptions-item label="工单总数">{{ currentClient.work_order_count }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const activeTab = ref('clients')
const keyword = ref('')
const tenantFilter = ref('')
const showDialog = ref(false)
const currentClient = ref(null)

const clientList = ref([])
const declarationList = ref([])

function loadData() {
  let clients = [
    { id: 1, name: '北京华贸置业有限公司', tenant_name: '盛世文化传媒有限公司', contact: '张总', phone: '138****1001', work_order_count: 12 },
    { id: 2, name: '广州天河城百货有限公司', tenant_name: '盛世文化传媒有限公司', contact: '李总', phone: '139****2002', work_order_count: 8 },
    { id: 3, name: '上海申通地铁广告有限公司', tenant_name: '华艺广告制作有限公司', contact: '王总', phone: '137****3003', work_order_count: 15 },
    { id: 4, name: '深圳市高速公路广告有限公司', tenant_name: '博视标识设计工程公司', contact: '赵总', phone: '136****4004', work_order_count: 6 },
    { id: 5, name: '杭州西湖风景名胜区管委会', tenant_name: '瑞达展示展览有限公司', contact: '孙总', phone: '135****5005', work_order_count: 3 }
  ]

  if (tenantFilter.value) clients = clients.filter(c => c.tenant_name === tenantFilter.value)
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    clients = clients.filter(c => c.name.toLowerCase().includes(kw))
  }
  clientList.value = clients

  let decls = [
    { id: 1, client_name: '北京华贸置业有限公司', tenant_name: '盛世文化传媒有限公司', work_order_no: 'WO-2026-0001', title: '北京CBD户外LED大屏', current_stage: '设计审核', flow: 2, created_at: '2026-04-10 09:30' },
    { id: 2, client_name: '上海申通地铁广告有限公司', tenant_name: '华艺广告制作有限公司', work_order_no: 'WO-2026-0002', title: '上海陆家嘴地铁站灯箱广告', current_stage: '现场测量', flow: 2, created_at: '2026-04-09 14:20' },
    { id: 3, client_name: '广州天河城百货有限公司', tenant_name: '盛世文化传媒有限公司', work_order_no: 'WO-2026-0003', title: '广州天河城商场导视系统', current_stage: '施工阶段', flow: 3, created_at: '2026-04-08 11:00' },
    { id: 4, client_name: '深圳市高速公路广告有限公司', tenant_name: '博视标识设计工程公司', work_order_no: 'WO-2026-0004', title: '深圳南山区高速广告牌', current_stage: '已完工', flow: 3, created_at: '2026-04-05 16:45' },
    { id: 5, client_name: '杭州西湖风景名胜区管委会', tenant_name: '瑞达展示展览有限公司', work_order_no: 'WO-2026-0005', title: '杭州西湖景区指示牌改造', current_stage: '方案确认', flow: 1, created_at: '2026-04-07 08:15' },
    { id: 6, client_name: '北京华贸置业有限公司', tenant_name: '盛世文化传媒有限公司', work_order_no: 'WO-2026-0006', title: '华贸中心电梯海报', current_stage: '待分配', flow: 1, created_at: '2026-04-11 10:30' }
  ]

  if (tenantFilter.value) decls = decls.filter(d => d.tenant_name === tenantFilter.value)
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    decls = decls.filter(d => d.client_name.toLowerCase().includes(kw) || d.title.toLowerCase().includes(kw))
  }
  declarationList.value = decls
}

function stageType(s) {
  const map = { '方案确认': 'warning', '现场测量': '', '设计审核': '', '施工阶段': 'success', '已完工': 'info', '待分配': 'info' }
  return map[s] || 'info'
}

function flowStep(f) { return f }

function showClientDetail(row) {
  currentClient.value = row
  showDialog.value = true
}

onMounted(() => loadData())
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
</style>
