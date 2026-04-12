<template>
  <div>
    <h1 class="page-title">系统配置</h1>

    <el-tabs v-model="activeTab">
      <!-- Tab 1: Address Management -->
      <el-tab-pane label="地址库管理" name="address">
        <div class="tab-header">
          <span>四级地址数据管理（省/市/区/街道）</span>
          <el-button type="primary">导入地址库</el-button>
        </div>
        <el-table :data="addressList" stripe>
          <el-table-column label="级别" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="levelTag(row.level)">{{ levelText(row.level) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column label="操作" width="120">
            <template #default>
              <el-button link size="small">编辑</el-button>
              <el-button link size="small" type="danger">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 2: Notification Templates -->
      <el-tab-pane label="通知模板" name="templates">
        <el-table :data="templates" stripe>
          <el-table-column prop="name" label="模板名称" width="180" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.type === 'sms' ? 'warning' : 'info'">
                {{ row.type === 'sms' ? '短信' : '站内信' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容预览" min-width="300" show-overflow-tooltip />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="editTemplate(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-dialog v-model="showTemplateDialog" title="编辑通知模板" width="600px">
          <el-form v-if="currentTemplate" label-width="100px">
            <el-form-item label="模板名称">
              <el-input v-model="currentTemplate.name" disabled />
            </el-form-item>
            <el-form-item label="模板内容">
              <el-input v-model="currentTemplate.content" type="textarea" :rows="6" />
            </el-form-item>
          </el-form>
          <div class="template-vars">
            <span>可用变量：</span>
            <el-tag size="small" v-for="v in ['project_name','stage_name','order_no','user_name']" :key="v" style="margin-right:4px;cursor:pointer" @click="insertVar(v)">
              {&#123;{{ v }}&#125;}
            </el-tag>
          </div>
          <template #footer>
            <el-button @click="showTemplateDialog = false">取消</el-button>
            <el-button type="primary" @click="saveTemplate">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- Tab 3: Timeout Settings -->
      <el-tab-pane label="超时阈值" name="timeout">
        <el-card>
          <template #header><span>全局默认超时天数</span></template>
          <el-form :model="timeoutForm" label-width="120px" style="max-width:400px">
            <el-form-item label="测量超时">
              <el-input-number v-model="timeoutForm.measurement" :min="1" :max="30" />
              <span class="unit">天</span>
            </el-form-item>
            <el-form-item label="设计超时">
              <el-input-number v-model="timeoutForm.design" :min="1" :max="30" />
              <span class="unit">天</span>
            </el-form-item>
            <el-form-item label="生产超时">
              <el-input-number v-model="timeoutForm.production" :min="1" :max="30" />
              <span class="unit">天</span>
            </el-form-item>
            <el-form-item label="施工超时">
              <el-input-number v-model="timeoutForm.construction" :min="1" :max="30" />
              <span class="unit">天</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveTimeout">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="mt-16">
          <template #header><span>租户覆盖设置</span></template>
          <el-table :data="tenantOverrides" stripe>
            <el-table-column prop="tenant_name" label="租户名称" min-width="200" />
            <el-table-column prop="measurement" label="测量(天)" width="100" align="center" />
            <el-table-column prop="design" label="设计(天)" width="100" align="center" />
            <el-table-column prop="production" label="生产(天)" width="100" align="center" />
            <el-table-column prop="construction" label="施工(天)" width="100" align="center" />
            <el-table-column label="操作" width="80">
              <template #default>
                <el-button link type="primary" size="small">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('address')
const showTemplateDialog = ref(false)
const currentTemplate = ref(null)

const addressList = ref([
  { level: 1, name: '广东省', code: '440000' },
  { level: 2, name: '广州市', code: '440100' },
  { level: 2, name: '深圳市', code: '440300' },
  { level: 2, name: '东莞市', code: '441900' },
  { level: 2, name: '佛山市', code: '440600' },
  { level: 3, name: '天河区', code: '440106' },
  { level: 3, name: '南山区', code: '440305' },
  { level: 3, name: '南城区', code: '441901' },
  { level: 3, name: '顺德区', code: '440606' },
  { level: 3, name: '香洲区', code: '440402' },
  { level: 4, name: '五山路', code: '440106001' },
  { level: 4, name: '科技园街道', code: '440305001' },
  { level: 4, name: '鸿福路', code: '441901001' }
])

const templates = ref([
  { id: 1, name: '申报提交通知', type: 'sms', content: '您的申报 {project_name} 已提交，工单号：{order_no}，请等待审批。' },
  { id: 2, name: '审批通过通知', type: 'sms', content: '您的申报 {project_name} 已通过审批，即将推送至广告商处理。' },
  { id: 3, name: '测量完成通知', type: 'inapp', content: '工单 {order_no} 的现场测量已完成，测量数据已上传。' },
  { id: 4, name: '设计完成通知', type: 'inapp', content: '工单 {order_no} 的设计方案已完成，请及时确认。' },
  { id: 5, name: '施工完成通知', type: 'sms', content: '工单 {order_no} 施工已完成，请安排验收。' }
])

const timeoutForm = reactive({ measurement: 3, design: 5, production: 7, construction: 10 })

const tenantOverrides = ref([
  { tenant_name: '盛世文化传媒有限公司', measurement: 2, design: 3, production: 5, construction: 7 },
  { tenant_name: '华艺广告制作有限公司', measurement: 3, design: 5, production: 7, construction: 10 },
  { tenant_name: '博视标识设计工程公司', measurement: 5, design: 7, production: 10, construction: 14 }
])

function levelTag(l) {
  const map = { 1: '', 2: 'success', 3: 'warning', 4: 'info' }
  return map[l] || 'info'
}
function levelText(l) {
  const map = { 1: '省', 2: '市', 3: '区', 4: '街道' }
  return map[l] || l
}

function editTemplate(row) {
  currentTemplate.value = { ...row }
  showTemplateDialog.value = true
}

function insertVar(v) {
  if (currentTemplate.value) {
    currentTemplate.value.content += ` {${v}}`
  }
}

function saveTemplate() {
  const idx = templates.value.findIndex(t => t.id === currentTemplate.value.id)
  if (idx >= 0) templates.value[idx] = { ...currentTemplate.value }
  showTemplateDialog.value = false
  ElMessage.success('模板已保存')
}

function saveTimeout() {
  ElMessage.success('超时阈值已保存')
}
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.template-vars { margin-top: 12px; font-size: 13px; color: #606266; }
.unit { margin-left: 8px; color: #8c8c8c; }
.mt-16 { margin-top: 16px; }
</style>
