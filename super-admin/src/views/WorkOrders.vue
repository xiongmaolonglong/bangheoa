<template>
  <div class="work-orders-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="工单号 / 项目名 / 甲方"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="租户">
          <el-select v-model="searchForm.tenant" placeholder="全部租户" clearable style="width: 180px">
            <el-option label="盛世广告有限公司" value="盛世广告有限公司" />
            <el-option label="创意视觉工作室" value="创意视觉工作室" />
            <el-option label="亮点传媒集团" value="亮点传媒集团" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待处理" value="待处理" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已派" value="已派" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已驳回" value="已驳回" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="tenant_name" label="租户名称" min-width="160" />
        <el-table-column prop="order_no" label="工单号" width="160" />
        <el-table-column prop="project_name" label="项目名称" min-width="200" />
        <el-table-column prop="client_name" label="甲方名称" min-width="180" />
        <el-table-column prop="current_stage" label="当前环节" width="120" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="170" />
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">
              {{ row.status === '已派' ? '已派' : '查看' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 工单详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="工单详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="detail" class="detail-content">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单号">{{ detail.order_no }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(detail.status)" size="small">{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="租户名称" :span="2">{{ detail.tenant_name }}</el-descriptions-item>
          <el-descriptions-item label="项目名称" :span="2">{{ detail.project_name }}</el-descriptions-item>
          <el-descriptions-item label="甲方名称" :span="2">{{ detail.client_name }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detail.created_at }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detail.updated_at }}</el-descriptions-item>
        </el-descriptions>

        <!-- 流程进度 -->
        <div class="section-title">流程进度</div>
        <div class="stages-container">
          <div class="stages-bar">
            <div
              v-for="(stage, index) in detail.stages"
              :key="index"
              class="stage-item"
            >
              <div class="stage-node" :class="stage.status">
                <div class="stage-dot">
                  <span v-if="stage.status === 'done'">&#10003;</span>
                  <span v-else-if="stage.status === 'rejected'">&#10007;</span>
                </div>
              </div>
              <div class="stage-label">{{ stage.name }}</div>
              <div class="stage-info" v-if="stage.time">
                <div>{{ stage.time }}</div>
                <div class="stage-operator">{{ stage.operator }}</div>
              </div>
              <div
                v-if="index < detail.stages.length - 1"
                class="stage-line"
                :class="{ 'line-done': stage.status === 'done' || stage.status === 'rejected' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 驳回原因 -->
        <el-alert
          v-if="detail.reject_reason"
          :title="detail.reject_reason"
          type="error"
          show-icon
          style="margin-top: 16px"
        />

        <!-- 测量数据 -->
        <div class="section-title" v-if="detail.measurement">测量数据</div>
        <el-descriptions v-if="detail.measurement" :column="2" border>
          <el-descriptions-item label="位置" :span="2">{{ detail.measurement.location }}</el-descriptions-item>
          <el-descriptions-item label="宽度" v-if="detail.measurement.width">
            {{ detail.measurement.width }} {{ detail.measurement.unit }}
          </el-descriptions-item>
          <el-descriptions-item label="高度" v-if="detail.measurement.height">
            {{ detail.measurement.height }} {{ detail.measurement.unit }}
          </el-descriptions-item>
          <el-descriptions-item label="面积" v-if="detail.measurement.area">
            {{ detail.measurement.area }} {{ detail.measurement.unit }}²
          </el-descriptions-item>
          <el-descriptions-item label="测量人" v-if="detail.measurement.measured_by">
            {{ detail.measurement.measured_by }}
          </el-descriptions-item>
          <el-descriptions-item label="测量时间" :span="2" v-if="detail.measurement.measured_at">
            {{ detail.measurement.measured_at }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2" v-if="detail.measurement.notes">
            {{ detail.measurement.notes }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 附件 -->
        <div class="section-title" v-if="detail.attachments && detail.attachments.length">附件</div>
        <div v-if="detail.attachments && detail.attachments.length" class="attachments-list">
          <el-tag
            v-for="(file, index) in detail.attachments"
            :key="index"
            class="attachment-tag"
            type="info"
          >
            <el-icon><Document /></el-icon>
            {{ file }}
          </el-tag>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { fetchWorkOrders, fetchWorkOrderDetail } from '../api/workOrders'

const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const detail = ref(null)

const searchForm = reactive({
  keyword: '',
  tenant: '',
  status: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: searchForm.keyword,
      tenant: searchForm.tenant,
      status: searchForm.status
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }

    const res = await fetchWorkOrders(params)
    if (res.code === 0) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    } else {
      ElMessage.error(res.message || '获取工单列表失败')
    }
  } catch (err) {
    ElMessage.error('网络异常，请重试')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.tenant = ''
  searchForm.status = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchData()
}

async function handleView(row) {
  try {
    const res = await fetchWorkOrderDetail(row.id)
    if (res.code === 0) {
      detail.value = res.data
      detailVisible.value = true
    } else {
      ElMessage.error(res.message || '获取工单详情失败')
    }
  } catch (err) {
    ElMessage.error('网络异常，请重试')
  }
}

function statusType(status) {
  const map = {
    '待处理': 'info',
    '进行中': '',
    '已派': 'warning',
    '已完成': 'success',
    '已驳回': 'danger'
  }
  return map[status] || 'info'
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.work-orders-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card {
  margin-bottom: 0;
}

.search-card :deep(.el-card__body) {
  padding-bottom: 0;
}

.table-card {
  margin-top: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 详情弹窗样式 */
.detail-content {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-top: 20px;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #722ed1;
}

/* 流程进度 */
.stages-container {
  padding: 16px 0;
}

.stages-bar {
  display: flex;
  align-items: flex-start;
  position: relative;
}

.stage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  min-width: 80px;
}

.stage-node {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #dcdfe6;
  background: #fff;
  position: relative;
  z-index: 2;
  font-size: 12px;
  font-weight: bold;
}

.stage-node.done {
  border-color: #67c23a;
  background: #67c23a;
  color: #fff;
}

.stage-node.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
}

.stage-node.rejected {
  border-color: #f56c6c;
  background: #f56c6c;
  color: #fff;
}

.stage-node.pending {
  border-color: #dcdfe6;
  color: #c0c4cc;
}

.stage-label {
  font-size: 12px;
  color: #606266;
  margin-top: 6px;
  text-align: center;
  white-space: nowrap;
}

.stage-info {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
  text-align: center;
}

.stage-operator {
  color: #409eff;
}

.stage-line {
  position: absolute;
  top: 14px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #dcdfe6;
  z-index: 1;
}

.stage-line.line-done {
  background: #67c23a;
}

/* 附件 */
.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-tag {
  cursor: pointer;
}

.attachment-tag :deep(.el-icon) {
  margin-right: 4px;
}
</style>
