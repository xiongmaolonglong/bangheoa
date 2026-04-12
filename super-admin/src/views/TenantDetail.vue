<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getTenantDetail } from '@/api/tenants'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const activeTab = ref('workOrders')

const tenantInfo = ref(null)

const stats = reactive({
  monthlyWorkOrders: 0,
  completed: 0,
  inProgress: 0,
  overdue: 0
})

const workOrders = ref([])
const clients = ref([])
const departments = ref([])

const demoTenantInfo = {
  id: 1,
  name: '盛世文化传媒有限公司',
  contact: '王建国',
  phone: '13800138001',
  email: 'wangjg@shengshi.com',
  region: '广东省-深圳市-南山区-科技园南路88号',
  status: 'active',
  createdAt: '2025-06-15',
  userCount: 45,
  workOrderCount: 128
}

const demoStats = {
  monthlyWorkOrders: 23,
  completed: 18,
  inProgress: 3,
  overdue: 2
}

const demoWorkOrders = [
  { id: 'SSWH-2026-001', title: '华强北商场外立面广告牌制作', client: '华强商业管理', status: 'completed', assignee: '设计一组', createdAt: '2026-04-01', deadline: '2026-04-10' },
  { id: 'SSWH-2026-002', title: '万象天地中庭美陈装置设计', client: '华润置地', status: 'in_progress', assignee: '设计二组', createdAt: '2026-04-03', deadline: '2026-04-18' },
  { id: 'SSWH-2026-003', title: '深圳湾科技生态园导视系统', client: '深投控', status: 'in_progress', assignee: '工程组', createdAt: '2026-04-05', deadline: '2026-04-25' },
  { id: 'SSWH-2026-004', title: '会展中心5号馆展位搭建', client: '工博会组委会', status: 'overdue', assignee: '工程组', createdAt: '2026-03-20', deadline: '2026-04-05' },
  { id: 'SSWH-2026-005', title: '市民中心灯光节主视觉设计', client: '城管局', status: 'pending', assignee: '设计一组', createdAt: '2026-04-08', deadline: '2026-04-20' },
  { id: 'SSWH-2026-006', title: '南山科技园园区标识更新', client: '南山科促中心', status: 'completed', assignee: '设计二组', createdAt: '2026-03-25', deadline: '2026-04-08' },
  { id: 'SSWH-2026-007', title: '福田CBD楼宇亮化工程', client: '福田投控', status: 'overdue', assignee: '工程组', createdAt: '2026-03-15', deadline: '2026-04-01' }
]

const demoClients = [
  { id: 1, name: '华强商业管理有限公司', contact: '刘总', phone: '0755-88880001', workOrders: 34, status: 'active' },
  { id: 2, name: '华润置地（深圳）有限公司', contact: '陈经理', phone: '0755-88880002', workOrders: 28, status: 'active' },
  { id: 3, name: '深圳市投资控股有限公司', contact: '张主任', phone: '0755-88880003', workOrders: 21, status: 'active' },
  { id: 4, name: '中国工博会组委会', contact: '李秘书', phone: '0755-88880004', workOrders: 15, status: 'active' },
  { id: 5, name: '深圳市城市管理和综合执法局', contact: '王科长', phone: '0755-88880005', workOrders: 12, status: 'paused' },
  { id: 6, name: '南山区科技创新促进中心', contact: '赵干事', phone: '0755-88880006', workOrders: 10, status: 'active' },
  { id: 7, name: '福田区投资控股有限公司', contact: '孙经理', phone: '0755-88880007', workOrders: 8, status: 'active' }
]

const demoDepartments = [
  { id: 1, name: '设计一组', head: '周设计', staffCount: 8, workOrders: 42 },
  { id: 2, name: '设计二组', head: '吴创意', staffCount: 6, workOrders: 35 },
  { id: 3, name: '工程组', head: '郑工程', staffCount: 12, workOrders: 31 },
  { id: 4, name: '项目部', head: '钱项目', staffCount: 5, workOrders: 12 },
  { id: 5, name: '财务部', head: '孙会计', staffCount: 3, workOrders: 0 }
]

const demoStaffData = {
  1: [
    { name: '周设计', role: '主管', phone: '13800001001', email: 'zhou@shengshi.com', joinDate: '2025-06-20' },
    { name: '林小美', role: '设计师', phone: '13800001002', email: 'linxm@shengshi.com', joinDate: '2025-07-15' },
    { name: '黄大伟', role: '设计师', phone: '13800001003', email: 'huangdw@shengshi.com', joinDate: '2025-08-01' },
    { name: '杨丽花', role: '设计师', phone: '13800001004', email: 'yanglh@shengshi.com', joinDate: '2025-09-10' },
    { name: '许文强', role: '实习生', phone: '13800001005', email: 'xuwq@shengshi.com', joinDate: '2026-01-05' },
    { name: '蔡明辉', role: '设计师', phone: '13800001006', email: 'caimh@shengshi.com', joinDate: '2025-10-20' },
    { name: '谢晓燕', role: '设计师', phone: '13800001007', email: 'xiexy@shengshi.com', joinDate: '2025-11-01' },
    { name: '邓国强', role: '设计师', phone: '13800001008', email: 'denggq@shengshi.com', joinDate: '2026-02-14' }
  ],
  2: [
    { name: '吴创意', role: '主管', phone: '13800002001', email: 'wucy@shengshi.com', joinDate: '2025-06-25' },
    { name: '潘婷婷', role: '设计师', phone: '13800002002', email: 'pant@shengshi.com', joinDate: '2025-08-15' },
    { name: '蒋文博', role: '设计师', phone: '13800002003', email: 'jiangwb@shengshi.com', joinDate: '2025-09-01' },
    { name: '余佳佳', role: '设计师', phone: '13800002004', email: 'yujj@shengshi.com', joinDate: '2025-10-10' },
    { name: '叶子轩', role: '设计师', phone: '13800002005', email: 'yezx@shengshi.com', joinDate: '2026-01-15' },
    { name: '廖天明', role: '实习生', phone: '13800002006', email: 'liaotm@shengshi.com', joinDate: '2026-03-01' }
  ],
  3: [
    { name: '郑工程', role: '主管', phone: '13800003001', email: 'zhengg@shengshi.com', joinDate: '2025-06-18' },
    { name: '石磊', role: '工程师', phone: '13800003002', email: 'shil@shengshi.com', joinDate: '2025-07-01' },
    { name: '崔健', role: '工程师', phone: '13800003003', email: 'cuij@shengshi.com', joinDate: '2025-07-20' },
    { name: '康师傅', role: '技术员', phone: '13800003004', email: 'kangsf@shengshi.com', joinDate: '2025-08-10' },
    { name: '贺小龙', role: '技术员', phone: '13800003005', email: 'hexl@shengshi.com', joinDate: '2025-09-15' },
    { name: '毛大华', role: '工程师', phone: '13800003006', email: 'maodh@shengshi.com', joinDate: '2025-10-01' },
    { name: '陶光明', role: '工程师', phone: '13800003007', email: 'taogm@shengshi.com', joinDate: '2025-11-10' },
    { name: '姜海涛', role: '技术员', phone: '13800003008', email: 'jianght@shengshi.com', joinDate: '2025-12-01' },
    { name: '戚继光', role: '技术员', phone: '13800003009', email: 'qijg@shengshi.com', joinDate: '2026-01-10' },
    { name: '谢安', role: '技术员', phone: '13800003010', email: 'xiean@shengshi.com', joinDate: '2026-02-01' },
    { name: '邹市明', role: '实习生', phone: '13800003011', email: 'zousm@shengshi.com', joinDate: '2026-03-10' },
    { name: '熊大壮', role: '工程师', phone: '13800003012', email: 'xiongdz@shengshi.com', joinDate: '2026-03-20' }
  ],
  4: [
    { name: '钱项目', role: '主管', phone: '13800004001', email: 'qianxm@shengshi.com', joinDate: '2025-06-22' },
    { name: '秦明月', role: '项目经理', phone: '13800004002', email: 'qinmy@shengshi.com', joinDate: '2025-08-05' },
    { name: '尤美丽', role: '项目经理', phone: '13800004003', email: 'youml@shengshi.com', joinDate: '2025-09-20' },
    { name: '许诺', role: '项目助理', phone: '13800004004', email: 'xun@shengshi.com', joinDate: '2025-11-15' },
    { name: '何必', role: '项目助理', phone: '13800004005', email: 'hebi@shengshi.com', joinDate: '2026-02-20' }
  ],
  5: [
    { name: '孙会计', role: '主管', phone: '13800005001', email: 'sinkj@shengshi.com', joinDate: '2025-06-16' },
    { name: '钱多多', role: '出纳', phone: '13800005002', email: 'qiandd@shengshi.com', joinDate: '2025-07-10' },
    { name: '方正', role: '财务助理', phone: '13800005003', email: 'fangz@shengshi.com', joinDate: '2025-10-05' }
  ]
}

const selectedDeptStaff = ref([])

function statusTag(status) {
  const map = {
    completed: { label: '已完成', type: 'success' },
    in_progress: { label: '进行中', type: 'primary' },
    pending: { label: '待处理', type: 'warning' },
    overdue: { label: '已逾期', type: 'danger' },
    active: { label: '正常', type: 'success' },
    paused: { label: '已暂停', type: 'danger' }
  }
  return map[status] || { label: status, type: 'info' }
}

async function fetchData() {
  loading.value = true
  try {
    const tenantId = route.params.id
    const res = await getTenantDetail(tenantId)
    tenantInfo.value = res.data?.info || demoTenantInfo
    Object.assign(stats, res.data?.stats || demoStats)
    workOrders.value = res.data?.workOrders || demoWorkOrders
    clients.value = res.data?.clients || demoClients
    departments.value = res.data?.departments || demoDepartments
  } catch {
    tenantInfo.value = demoTenantInfo
    Object.assign(stats, demoStats)
    workOrders.value = demoWorkOrders
    clients.value = demoClients
    departments.value = demoDepartments
  } finally {
    loading.value = false
  }
}

function handleDeptChange(dept) {
  if (dept) {
    selectedDeptStaff.value = demoStaffData[dept.id] || []
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="goBack" />
        <h2>{{ tenantInfo?.name || '租户详情' }}</h2>
      </div>
      <el-tag :type="tenantInfo?.status === 'active' ? 'success' : 'danger'" size="large">
        {{ tenantInfo?.status === 'active' ? '正常' : '已暂停' }}
      </el-tag>
    </div>

    <el-card shadow="never" class="info-card">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="租户名称">{{ tenantInfo?.name }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ tenantInfo?.contact }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ tenantInfo?.phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ tenantInfo?.email }}</el-descriptions-item>
        <el-descriptions-item label="地区" :span="2">{{ tenantInfo?.region }}</el-descriptions-item>
        <el-descriptions-item label="开通日期">{{ tenantInfo?.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="用户数">{{ tenantInfo?.userCount }}</el-descriptions-item>
        <el-descriptions-item label="工单数">{{ tenantInfo?.workOrderCount }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card stat-blue">
          <div class="stat-value">{{ stats.monthlyWorkOrders }}</div>
          <div class="stat-label">本月工单</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card stat-green">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card stat-orange">
          <div class="stat-value">{{ stats.inProgress }}</div>
          <div class="stat-label">进行中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card stat-red">
          <div class="stat-value">{{ stats.overdue }}</div>
          <div class="stat-label">逾期</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="工单列表" name="workOrders">
          <el-table :data="workOrders" stripe>
            <el-table-column prop="id" label="工单编号" width="160" />
            <el-table-column prop="title" label="工单标题" min-width="240" show-overflow-tooltip />
            <el-table-column prop="client" label="甲方" width="160" show-overflow-tooltip />
            <el-table-column prop="assignee" label="负责组" width="100" />
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status).type" size="small">
                  {{ statusTag(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建日期" width="120" />
            <el-table-column prop="deadline" label="截止日期" width="120" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="甲方列表" name="clients">
          <el-table :data="clients" stripe>
            <el-table-column prop="name" label="甲方名称" min-width="240" show-overflow-tooltip />
            <el-table-column prop="contact" label="联系人" width="100" />
            <el-table-column prop="phone" label="电话" width="140" />
            <el-table-column prop="workOrders" label="工单数" width="90" align="center" />
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status).type" size="small">
                  {{ statusTag(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="部门人员" name="departments">
          <div class="dept-layout">
            <div class="dept-sidebar">
              <h4>部门列表</h4>
              <el-table
                :data="departments"
                stripe
                highlight-current-row
                @current-change="handleDeptChange"
              >
                <el-table-column prop="name" label="部门" min-width="80" show-overflow-tooltip />
                <el-table-column prop="staffCount" label="人数" width="60" align="center" />
              </el-table>
            </div>

            <div class="dept-main">
              <h4 v-if="selectedDeptStaff.length">人员明细</h4>
              <h4 v-else class="empty-hint">请选择部门查看人员</h4>
              <el-table :data="selectedDeptStaff" stripe>
                <el-table-column prop="name" label="姓名" width="100" />
                <el-table-column prop="role" label="角色" width="100" />
                <el-table-column prop="phone" label="电话" width="140" />
                <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
                <el-table-column prop="joinDate" label="入职日期" width="120" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
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

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.info-card {
  margin-bottom: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  padding: 8px 0;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #86909c;
}

.stat-blue .stat-value { color: #165dff; }
.stat-green .stat-value { color: #00b42a; }
.stat-orange .stat-value { color: #ff7d00; }
.stat-red .stat-value { color: #f53f3f; }

.dept-layout {
  display: flex;
  gap: 16px;
}

.dept-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.dept-sidebar h4,
.dept-main h4 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.dept-main {
  flex: 1;
  min-width: 0;
}

.empty-hint {
  color: #86909c;
  font-weight: 400;
}

@media (max-width: 768px) {
  .dept-layout {
    flex-direction: column;
  }

  .dept-sidebar {
    width: 100%;
  }
}
</style>
