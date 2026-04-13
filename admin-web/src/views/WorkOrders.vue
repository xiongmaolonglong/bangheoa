<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">工单管理</h1>
      <div class="page-actions">
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-button :type="viewMode === 'list' ? '' : 'primary'" @click="viewMode = viewMode === 'kanban' ? 'list' : 'kanban'">
          {{ viewMode === 'kanban' ? '列表视图' : '看板视图' }}
        </el-button>
        <el-button v-if="viewMode === 'kanban'" type="success" @click="exportKanbanExcel">
          <el-icon><Download /></el-icon>导出
        </el-button>
        <el-button v-if="viewMode === 'kanban'" @click="printKanban">
          <el-icon><Printer /></el-icon>打印
        </el-button>
        <el-button v-if="viewMode === 'kanban'" @click="showKanbanSettings = true">
          <el-icon><Setting /></el-icon>列设置
        </el-button>
        <el-button type="primary" @click="showCreate = true">
          <el-icon><Plus /></el-icon>补录工单
        </el-button>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-if="viewMode === 'kanban'">
      <!-- Stats Panel -->
      <StatsPanel />

      <!-- Kanban Filter Bar -->
      <el-card class="filter-card kanban-filter-bar">
        <el-form :inline="true">
          <el-form-item>
            <el-input v-model="kanbanSearch" placeholder="搜索工单号/甲方/项目名" clearable style="width:220px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterStage" placeholder="全部环节" clearable style="width:120px">
              <el-option v-for="c in KANBAN_COLUMNS" :key="c.key" :label="c.label" :value="c.key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterCategory" placeholder="全部分类" clearable style="width:120px">
              <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterStatus" placeholder="全部状态" clearable style="width:100px">
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
              <el-option label="即将到期" value="expiring" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterAssignee" placeholder="全部负责人" clearable style="width:120px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWorkOrders">查询</el-button>
            <el-button @click="resetKanbanFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Kanban Batch Bar -->
      <div v-if="kanbanSelectedIds.length" class="batch-bar">
        <span>已选 {{ kanbanSelectedIds.length }} 项</span>
        <el-button size="small" type="primary" @click="kanbanBatchAction = 'advance'; showKanbanBatchDialog = true">批量推进</el-button>
        <el-button size="small" type="success" @click="kanbanBatchAction = 'dispatch'; showKanbanBatchDialog = true">批量派单</el-button>
        <el-button size="small" @click="kanbanSelectedIds = []">取消选择</el-button>
      </div>

      <div class="kanban-wrap">
        <div v-for="col in visibleKanbanCols" :key="col.key"
          class="kanban-col"
          :class="{ 'kanban-col-dragover': dragOverCol === col.key }"
          @dragover.prevent="onDragOverCol($event, col.key)"
          @dragleave="onDragLeaveCol($event, col.key)"
          @drop="onDropOnCol($event, col.key)">
          <div class="kanban-header">
            <div class="col-header-left">
              <el-icon v-if="col.collapsed" class="col-toggle" @click="toggleCol(col.key)"><ArrowRight /></el-icon>
              <el-icon v-else class="col-toggle" @click="toggleCol(col.key)"><ArrowDown /></el-icon>
              <span class="col-title">{{ col.label }}</span>
              <span class="col-count">{{ col.items?.length || 0 }}</span>
            </div>
            <div class="col-header-right">
              <el-tooltip content="折叠列" placement="top">
                <el-icon class="col-action" @click="collapseCol(col.key)"><Fold /></el-icon>
              </el-tooltip>
            </div>
          </div>
          <div v-if="!col.collapsed" class="kanban-body">
            <el-badge v-for="wo in col.items" :key="wo.id"
              :is-dot="wo.is_timeout || daysToDeadline(wo) <= 3"
              :dot-class="wo.is_timeout ? 'timeout-dot' : 'expiring-dot'"
              :offset="[-2, 2]">
              <div class="kanban-card-wrap"
                @contextmenu.prevent="openContextMenu($event, wo, col.key)"
                @click="$router.push(`/work-orders/${wo.id}`)">
                <el-checkbox v-model="wo._selected" class="card-checkbox" @click.stop />
                <el-card shadow="hover" class="kanban-card"
                  :class="{ 'kanban-card-timeout': wo.is_timeout, 'kanban-card-expiring': !wo.is_timeout && daysToDeadline(wo) <= 3 }"
                  draggable="true"
                  @dragstart="onDragStart($event, wo)">
                  <div class="card-tags">
                    <el-tag size="small" type="primary" effect="plain">{{ wo.client_name }}</el-tag>
                    <el-tag v-if="wo.project_category" size="small" effect="plain">{{ categoryLabel(wo.project_category) }}</el-tag>
                    <el-tag v-if="wo.priority === 'high'" size="small" type="danger">高优</el-tag>
                    <el-tag v-if="wo.priority === 'low'" size="small" type="info">低优</el-tag>
                    <el-tag v-if="wo.is_timeout" size="small" type="danger">超时</el-tag>
                    <el-tag v-else-if="daysToDeadline(wo) <= 3 && daysToDeadline(wo) > 0" size="small" type="warning">{{ daysToDeadline(wo) }}天</el-tag>
                    <el-tag v-if="wo.custom_tags?.length" v-for="t in wo.custom_tags" :key="t" size="small" type="success">{{ t }}</el-tag>
                  </div>
                  <div class="card-title">{{ wo.title }}</div>
                  <!-- 进度条 -->
                  <div v-if="wo.progress_percent !== undefined" class="card-progress">
                    <el-progress :percentage="wo.progress_percent || 0" :stroke-width="4" :show-text="false" />
                  </div>
                  <div class="card-meta">
                    <span>{{ wo.assigned_to || '未分配' }}</span>
                    <span :class="deadlineClass(wo)">{{ wo.deadline ? `${deadlineLabel(wo)}` : '无截止' }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button v-if="wo.current_stage === 'assignment'" link type="primary" size="small"
                      @click.stop="$router.push(`/work-orders/${wo.id}`)">派单</el-button>
                    <el-button v-if="wo.current_stage === 'measurement'" link type="warning" size="small"
                      @click.stop="openProxyMeasure(wo)">代录</el-button>
                    <el-button v-if="wo.current_stage === 'measurement' && wo.measurement" link type="success" size="small"
                      @click.stop="$router.push(`/work-orders/${wo.id}/measure-review`)">审核</el-button>
                    <el-button v-if="wo.current_stage === 'design'" link type="primary" size="small"
                      @click.stop="$router.push('/designs')">设计</el-button>
                    <el-button v-if="wo.current_stage === 'production'" link type="primary" size="small"
                      @click.stop="$router.push('/production')">生产</el-button>
                    <el-button v-if="wo.current_stage === 'construction'" link type="primary" size="small"
                      @click.stop="$router.push('/construction')">施工</el-button>
                  </div>
                  <!-- Hover quick actions -->
                  <div class="card-quick-actions">
                    <el-tooltip content="查看详情" placement="top">
                      <el-icon @click.stop="$router.push(`/work-orders/${wo.id}`)"><View /></el-icon>
                    </el-tooltip>
                    <el-tooltip content="添加备注" placement="top">
                      <el-icon @click.stop="openRemarkDialog(wo)"><ChatDotRound /></el-icon>
                    </el-tooltip>
                    <el-tooltip content="转交负责人" placement="top">
                      <el-icon @click.stop="openReassignDialog(wo)"><User /></el-icon>
                    </el-tooltip>
                  </div>
                </el-card>
              </div>
            </el-badge>
            <el-empty v-if="!col.items?.length" :image-size="40" description="暂无工单" />
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <!-- Stats Panel -->
      <StatsPanel />

      <!-- Filters -->
      <el-card class="filter-card">
        <el-form :inline="true" :model="filters">
          <el-form-item>
            <el-input v-model="filters.keyword" placeholder="搜索工单号/甲方/地址" clearable style="width:240px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.stage" placeholder="全部环节" clearable style="width:120px">
              <el-option label="申报接收" value="declaration" />
              <el-option label="待派单" value="assignment" />
              <el-option label="测量中" value="measurement" />
              <el-option label="设计中" value="design" />
              <el-option label="生产中" value="production" />
              <el-option label="施工中" value="construction" />
              <el-option label="费用" value="finance" />
              <el-option label="归档" value="archive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:100px">
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.client_id" placeholder="全部甲方" clearable style="width:140px">
              <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.project_category" placeholder="全部分类" clearable style="width:120px">
              <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.assigned_to" placeholder="全部负责人" clearable style="width:120px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
              start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:240px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWorkOrders">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
            <el-button @click="exportExcel"><el-icon><Download /></el-icon>导出 Excel</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Table -->
      <el-card>
        <el-table ref="tableRef" :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="client_name" label="甲方企业" width="140" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ categoryLabel(row.project_category) || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前环节" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="stageTagType(row.current_stage)">{{ stageLabel(row.current_stage) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.is_timeout ? 'danger' : 'success'" effect="plain">
                {{ row.is_timeout ? '超时' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assigned_to" label="负责人" width="90" />
          <el-table-column prop="deadline" label="截止日期" width="110" />
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="action-link">查看</router-link>
              <el-button v-if="row.current_stage === 'assignment'" link type="primary" @click="openDispatch(row)">派单</el-button>
              <el-button v-if="row.current_stage === 'measurement'" link type="warning" @click="openProxyMeasure(row)">代录</el-button>
              <el-button v-if="row.current_stage === 'assignment' && !row.assigned_tenant_user_id" link type="primary" @click.stop="openEdit(row)">编辑</el-button>
              <el-button v-if="row.current_stage === 'assignment' && !row.assigned_tenant_user_id" link type="danger" @click.stop="deleteWorkOrder(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Batch selection bar -->
        <div v-if="selectedRows.length" class="batch-bar">
          <span>已选 {{ selectedRows.length }} 项</span>
          <el-button size="small" type="primary" @click="showBatchOps = true">批量操作</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>

        <div class="pagination-wrap">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
            :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
            @size-change="loadWorkOrders" @current-change="loadWorkOrders" />
        </div>
      </el-card>
    </div>

    <!-- Create Dialog (动态表单) -->
    <el-dialog v-model="showCreate" title="补录工单" width="520px" @open="loadCreateFormConfig">
      <el-form ref="createFormRef" :model="createForm" :rules="createFormRules" label-width="100px" v-loading="createLoading">
        <template v-if="createFormFields.length">
          <el-form-item
            v-for="field in createFormFields"
            :key="field.field_key"
            :label="field.field_label"
            :prop="field.field_key"
            :required="field.required"
          >
            <!-- 开启解析功能的字段：优先渲染为地址解析组件 -->
            <AddressPicker v-if="field.enable_parse"
              v-model="createForm[field.field_key]" :placeholder="field.placeholder"
              :field-label="field.field_label" />
            <!-- client_select: 特殊处理 -->
            <el-select v-else-if="field.field_type === 'client_select'"
              v-model="createForm[field.field_key]" placeholder="请选择" style="width:100%">
              <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <!-- select -->
            <el-select v-else-if="field.field_type === 'select'"
              v-model="createForm[field.field_key]" :placeholder="field.placeholder || '请选择'" style="width:100%">
              <el-option v-for="opt in (field.options || [])" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <!-- textarea -->
            <el-input v-else-if="field.field_type === 'textarea'"
              v-model="createForm[field.field_key]" type="textarea" :rows="3" :placeholder="field.placeholder || '请输入'" />
            <!-- number -->
            <el-input-number v-else-if="field.field_type === 'number'"
              v-model="createForm[field.field_key]" :min="0" :precision="2" controls-position="right" style="width:100%" />
            <!-- date -->
            <el-date-picker v-else-if="field.field_type === 'date'"
              v-model="createForm[field.field_key]" type="date" :placeholder="field.placeholder || '请选择日期'" style="width:100%" value-format="YYYY-MM-DD" />
            <!-- image -->
            <el-upload v-else-if="field.field_type === 'image'"
              action="/api/v1/files" list-type="picture-card"
              :file-list="uploadFileLists[field.field_key] || []"
              :on-success="(res, file) => onFileSuccess(res, file, field.field_key)"
              :on-error="onFileError"
              :headers="proxyUploadHeaders"
              name="file">
              <el-icon><Plus /></el-icon>
            </el-upload>
            <!-- address: 腾讯地图地址选择 -->
            <AddressPicker v-else-if="field.field_type === 'address'"
              v-model="createForm[field.field_key]" :placeholder="field.placeholder"
              :field-label="field.field_label" />
            <!-- 其他类型 fallback 到 text -->
            <el-input v-else v-model="createForm[field.field_key]" :placeholder="field.placeholder || '请输入'" />
          </el-form-item>
        </template>
        <el-empty v-else description="未加载到表单配置" />
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="createWorkOrder" :loading="creating">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 代录测量数据对话框 -->
    <el-dialog v-model="showProxy" title="代录测量数据" width="600px">
      <el-form :model="proxyForm" label-width="100px" v-loading="proxyLoading">
        <template v-if="proxyLoaded && proxyFields.length">
          <el-form-item
            v-for="field in proxyFields"
            :key="field.field_key"
            :label="field.field_label"
            :required="field.required"
          >
            <el-input
              v-if="field.field_type === 'text'"
              v-model="proxyForm[field.field_key]"
              :placeholder="field.placeholder || '请输入'"
            />
            <el-input
              v-else-if="field.field_type === 'textarea'"
              v-model="proxyForm[field.field_key]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || '请输入'"
            />
            <el-input-number
              v-else-if="field.field_type === 'number'"
              v-model="proxyForm[field.field_key]"
              :min="0"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.field_type === 'date'"
              v-model="proxyForm[field.field_key]"
              type="date"
              :placeholder="field.placeholder || '请选择日期'"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-else-if="field.field_type === 'select'"
              v-model="proxyForm[field.field_key]"
              :placeholder="field.placeholder || '请选择'"
              style="width: 100%"
            >
              <el-option v-for="opt in (field.options || [])" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-upload
              v-else-if="field.field_type === 'image'"
              action="/api/v1/files"
              list-type="picture-card"
              :file-list="proxyUploadFileLists[field.field_key] || []"
              :on-success="(res, file) => proxyFileSuccess(res, file, field.field_key)"
              :on-error="onFileError"
              :headers="proxyUploadHeaders"
              name="file">
              <el-icon><Plus /></el-icon>
            </el-upload>
            <el-input v-else v-model="proxyForm[field.field_key]" :placeholder="field.placeholder || '请输入'" />
          </el-form-item>
        </template>
        <el-empty v-else-if="proxyLoaded" description="未配置测量表单字段，请先到系统配置页面配置" />
        <el-skeleton v-else :rows="5" animated />
      </el-form>
      <template #footer>
        <el-button @click="showProxy = false">取消</el-button>
        <el-button type="primary" @click="submitProxy" :loading="proxySubmitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 批量操作对话框 -->
    <BatchOpsDialog v-model="showBatchOps" :count="selectedRows.length" :selections="selectedRows"
      :user-options="userOptions" @done="loadWorkOrders" />

    <!-- 看板批量操作对话框 -->
    <el-dialog v-model="showKanbanBatchDialog" :title="kanbanBatchAction === 'advance' ? '批量推进环节' : '批量派单'" width="480px">
      <p style="margin-bottom: 12px">已选择 <strong>{{ kanbanSelectedIds.length }}</strong> 个工单</p>
      <el-form v-if="kanbanBatchAction === 'advance'" label-width="80px">
        <el-form-item label="目标环节">
          <el-select v-model="kanbanBatchTargetStage" placeholder="选择目标环节" style="width:100%">
            <el-option v-for="s in advanceStageOptions" :key="s.key" :label="s.label" :value="s.key" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-if="kanbanBatchAction === 'dispatch'" label-width="80px">
        <el-form-item label="负责人">
          <el-select v-model="kanbanBatchForm.assigned_to" placeholder="选择人员" style="width:100%">
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="kanbanBatchForm.deadline" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showKanbanBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="executeKanbanBatch" :loading="kanbanBatchExecuting">执行</el-button>
      </template>
    </el-dialog>

    <!-- 列设置对话框 -->
    <el-dialog v-model="showKanbanSettings" title="看板列设置" width="420px">
      <el-alert title="拖拽可调整列顺序，开关可显示/隐藏列" type="info" :closable="false" show-icon style="margin-bottom: 16px" />
      <draggable v-model="allKanbanCols" item-key="key" :animation="200" handle=".drag-handle">
        <template #item="{ element }">
          <div class="col-setting-row">
            <el-icon class="drag-handle"><Rank /></el-icon>
            <span>{{ element.label }}</span>
            <el-switch v-model="element.visible" active-text="显示" />
          </div>
        </template>
      </draggable>
      <template #footer>
        <el-button @click="showKanbanSettings = false">关闭</el-button>
        <el-button type="primary" @click="saveKanbanSettings">保存</el-button>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div v-if="contextMenu.show" class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop>
        <div class="ctx-item" @click="contextAction('view')">查看详情</div>
        <div class="ctx-item" @click="contextAction('remark')">添加备注</div>
        <div class="ctx-item" @click="contextAction('reassign')">转交负责人</div>
        <div class="ctx-divider" />
        <div class="ctx-item" @click="contextAction('tag')">管理标签</div>
        <div class="ctx-item" @click="contextAction('priority')">设置优先级</div>
        <div class="ctx-item" @click="contextAction('deadline')">设置截止日</div>
        <div class="ctx-divider" />
        <div class="ctx-item ctx-danger" @click="contextAction('delete')">删除工单</div>
      </div>
    </teleport>

    <!-- 备注对话框 -->
    <el-dialog v-model="showRemarkDialog" title="添加备注" width="480px">
      <el-input v-model="remarkText" type="textarea" :rows="4" placeholder="输入备注内容..." />
      <template #footer>
        <el-button @click="showRemarkDialog = false">取消</el-button>
        <el-button type="primary" @click="submitRemark">提交</el-button>
      </template>
    </el-dialog>

    <!-- 转交负责人对话框 -->
    <el-dialog v-model="showReassignDialog" title="转交负责人" width="400px">
      <el-select v-model="reassignUserId" placeholder="选择新的负责人" style="width:100%">
        <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
      <template #footer>
        <el-button @click="showReassignDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReassign" :loading="reassigning">确认转交</el-button>
      </template>
    </el-dialog>

    <!-- 标签管理对话框 -->
    <el-dialog v-model="showTagDialog" title="管理标签" width="400px">
      <el-tag v-for="t in tagForm.tags" :key="t" closable @close="tagForm.tags = tagForm.tags.filter(x => x !== t)"
        style="margin: 4px">{{ t }}</el-tag>
      <el-input v-model="tagForm.newTag" placeholder="输入新标签回车添加" @keyup.enter="addTag" style="margin-top: 8px" />
      <template #footer>
        <el-button @click="showTagDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTags">保存</el-button>
      </template>
    </el-dialog>

    <!-- 优先级对话框 -->
    <el-dialog v-model="showPriorityDialog" title="设置优先级" width="320px">
      <el-radio-group v-model="priorityForm.priority">
        <el-radio value="high">高优</el-radio>
        <el-radio value="normal">普通</el-radio>
        <el-radio value="low">低优</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="showPriorityDialog = false">取消</el-button>
        <el-button type="primary" @click="savePriority">确认</el-button>
      </template>
    </el-dialog>

    <!-- 截止日对话框 -->
    <el-dialog v-model="showDeadlineDialog" title="设置截止日" width="360px">
      <el-date-picker v-model="deadlineForm.deadline" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" />
      <template #footer>
        <el-button @click="showDeadlineDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDeadline">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Download, Refresh, Setting, Printer, View, ChatDotRound, User, ArrowRight, ArrowDown, Fold, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { exportWithTimestamp } from '../utils/export'
import { useAuthStore } from '../store/auth'
import api from '../api'
import BatchOpsDialog from '../components/BatchOpsDialog.vue'
import StatsPanel from '../components/StatsPanel.vue'
import AddressPicker from '../components/AddressPicker.vue'

const router = useRouter()
const auth = useAuthStore()

const viewMode = ref('kanban')
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreate = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const clients = ref([])

// 动态创建表单
const createFormFields = ref([])
const createFormRules = ref({})
const createForm = reactive({})
const createLoading = ref(false)

async function loadCreateFormConfig() {
  createLoading.value = true
  try {
    const res = await api.get('/tenant/form-config/work_order_create')
    if (res.code === 0 && res.data) {
      createFormFields.value = res.data.fields || []
      // 动态生成校验规则
      const rules = {}
      createFormFields.value.forEach(f => {
        if (f.required) {
          rules[f.field_key] = [{ required: true, message: `请输入${f.field_label}`, trigger: 'change' }]
        }
        // 初始化表单值
        if (f.default_value !== undefined) createForm[f.field_key] = f.default_value
        else if (f.field_type === 'image' || f.field_type === 'file') createForm[f.field_key] = []
        else createForm[f.field_key] = ''
      })
      createFormRules.value = rules
      // 设置默认甲方
      applyDefaultClient()
    }
  } catch (err) {
    console.error('加载创建表单配置失败:', err)
  } finally {
    createLoading.value = false
  }
}

function onFileSuccess(res, file, fieldKey) {
  const url = res.url || res.data?.url
  if (!url) {
    ElMessage.error('上传成功但未返回文件地址')
    return
  }
  if (!createForm[fieldKey]) createForm[fieldKey] = []
  if (!createForm[fieldKey].includes(url)) {
    createForm[fieldKey].push(url)
  }
  // 同步到 el-upload 的文件列表
  if (!uploadFileLists.value[fieldKey]) uploadFileLists.value[fieldKey] = []
  if (!uploadFileLists.value[fieldKey].find(f => f.url === url)) {
    uploadFileLists.value[fieldKey].push({ name: file.name || url.split('/').pop(), url })
  }
}

function onFileError(err) {
  const msg = err?.response?.data?.error || err?.message || '上传失败'
  ElMessage.error(msg)
}

// 为每个 image 字段维护稳定的 fileList 引用
const uploadFileLists = ref({})

const filters = reactive({ keyword: '', stage: '', status: '', client_id: '', project_category: '', assigned_to: '' })
const dateRange = ref(null)

// 批量操作
const tableRef = ref(null)
const selectedRows = ref([])
const showBatchOps = ref(false)
const userOptions = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}
function clearSelection() {
  tableRef.value?.clearSelection()
}

async function loadUserOptions() {
  try {
    const res = await api.get('/tenants/users')
    const payload = res.data || {}
    userOptions.value = (Array.isArray(payload) ? payload : (payload.list || []))
      .filter(u => u.status === 'active')
  } catch (e) {
    console.error('加载人员列表失败:', e)
  }
}

// 代录测量
const showProxy = ref(false)
const proxyLoading = ref(false)
const proxyLoaded = ref(false)
const proxySubmitted = ref(false)
const proxyFields = ref([])
const proxyForm = reactive({})
const proxySubmitting = ref(false)

const proxyUploadHeaders = computed(() => ({
  Authorization: `Bearer ${auth.token}`
}))

// 为代录测量的 image 字段维护稳定的 fileList 引用
const proxyUploadFileLists = ref({})

// ===== KANBAN 配置 =====
const KANBAN_COLUMNS = [
  { key: 'declaration', label: '申报接收' },
  { key: 'approval', label: '待审批' },
  { key: 'assignment', label: '待派单' },
  { key: 'measurement', label: '测量中' },
  { key: 'design', label: '设计中' },
  { key: 'production', label: '生产中' },
  { key: 'construction', label: '施工中' },
  { key: 'finance', label: '待财务' },
  { key: 'archive', label: '已归档' },
  { key: 'aftersale', label: '售后' }
]

const stageMap = {
  declaration: '申报接收', assignment: '待派单', measurement: '测量中',
  design: '设计中', production: '生产中', construction: '施工中',
  finance: '费用管理', archive: '归档', aftersale: '售后'
}
function stageLabel(s) { return stageMap[s] || s }
function stageTagType(s) {
  const map = { declaration: '', assignment: 'info', measurement: 'warning', design: 'primary', production: 'success' }
  return map[s] || 'info'
}

const categoryMap = {
  daily: '日常', '520': '520', national_day: '国庆', spring_festival: '春节',
  storefront: '门头招牌', led_screen: 'LED大屏', indoor_ad: '室内广告',
}
function categoryLabel(c) { return categoryMap[c] || c }

const PROJECT_CATEGORIES = [
  { label: '日常', value: 'daily' },
  { label: '门头招牌', value: 'storefront' },
  { label: '室内广告', value: 'indoor_ad' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '520', value: '520' },
  { label: '国庆', value: 'national_day' },
  { label: '春节', value: 'spring_festival' },
]

// 看板过滤
const kanbanSearch = ref('')
const kanbanFilterStage = ref('')
const kanbanFilterCategory = ref('')
const kanbanFilterStatus = ref('')
const kanbanFilterAssignee = ref('')

function resetKanbanFilters() {
  kanbanSearch.value = ''
  kanbanFilterStage.value = ''
  kanbanFilterCategory.value = ''
  kanbanFilterStatus.value = ''
  kanbanFilterAssignee.value = ''
  loadWorkOrders()
}

// 看板列（含 collapsed/visible 状态）
const allKanbanCols = ref(
  KANBAN_COLUMNS.map(c => ({
    ...c,
    items: [],
    collapsed: false,
    visible: true
  }))
)

// 已保存的列设置
function loadKanbanSettings() {
  try {
    const saved = localStorage.getItem('kanban_col_settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.forEach(s => {
        const col = allKanbanCols.value.find(c => c.key === s.key)
        if (col) {
          col.visible = s.visible
          col.collapsed = s.collapsed || false
        }
      })
    }
  } catch {}
}

function saveKanbanSettings() {
  try {
    const settings = allKanbanCols.value.map(c => ({ key: c.key, visible: c.visible, collapsed: c.collapsed }))
    localStorage.setItem('kanban_col_settings', JSON.stringify(settings))
    ElMessage.success('列设置已保存')
  } catch {}
}

function toggleCol(key) {
  const col = allKanbanCols.value.find(c => c.key === key)
  if (col) col.collapsed = !col.collapsed
}

function collapseCol(key) {
  toggleCol(key)
}

const visibleKanbanCols = computed(() => allKanbanCols.value.filter(c => c.visible))

// 看板批量选择
const kanbanSelectedIds = computed(() => {
  const ids = []
  allKanbanCols.value.forEach(col => {
    col.items?.forEach(wo => { if (wo._selected) ids.push(wo.id) })
  })
  return ids
})

// 看板批量操作
const showKanbanBatchDialog = ref(false)
const kanbanBatchAction = ref('advance')
const kanbanBatchTargetStage = ref('')
const kanbanBatchForm = reactive({ assigned_to: '', deadline: '' })
const kanbanBatchExecuting = ref(false)

const advanceStageOptions = computed(() => {
  const stages = [
    { key: 'assignment', label: '待派单' },
    { key: 'measurement', label: '测量中' },
    { key: 'design', label: '设计中' },
    { key: 'production', label: '生产中' },
    { key: 'construction', label: '待施工' },
  ]
  return stages
})

async function executeKanbanBatch() {
  const ids = kanbanSelectedIds.value
  if (!ids.length) return ElMessage.warning('未选择工单')
  kanbanBatchExecuting.value = true
  try {
    if (kanbanBatchAction.value === 'advance') {
      if (!kanbanBatchTargetStage.value) return ElMessage.warning('请选择目标环节')
      await Promise.all(ids.map(id => api.put(`/work-orders/${id}/stage`, { target_stage: kanbanBatchTargetStage.value })))
      ElMessage.success(`已将 ${ids.length} 个工单推进到 ${stageLabel(kanbanBatchTargetStage.value)}`)
    } else if (kanbanBatchAction.value === 'dispatch') {
      if (!kanbanBatchForm.assigned_to) return ElMessage.warning('请选择负责人')
      await Promise.all(ids.map(id => api.post('/assignments', {
        work_order_id: id,
        assigned_to: kanbanBatchForm.assigned_to,
        deadline: kanbanBatchForm.deadline || null,
      })))
      ElMessage.success(`已派单 ${ids.length} 个工单`)
    }
    showKanbanBatchDialog.value = false
    kanbanSelectedIds.value = []
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '批量操作失败')
  } finally {
    kanbanBatchExecuting.value = false
  }
}

// 看板导出/打印
function exportKanbanExcel() {
  const allData = allKanbanCols.value.flatMap(c => c.items || [])
  if (!allData.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(allData, [
    { key: 'work_order_no', label: '工单号' },
    { key: 'title', label: '项目名称' },
    { key: 'client_name', label: '甲方企业' },
    { key: 'current_stage', label: '当前环节' },
    { key: 'assigned_to', label: '负责人' },
    { key: 'deadline', label: '截止日期' },
    { key: 'is_timeout', label: '超时' },
    { key: 'priority', label: '优先级' },
  ], '看板工单')
  ElMessage.success(`已导出 ${allData.length} 条数据`)
}

function printKanban() {
  window.print()
}

// 阶段推进（看板拖拽用）
const STAGE_ORDER = ['declaration', 'approval', 'assignment', 'measurement', 'design', 'production', 'construction', 'finance', 'archive']
const dragData = ref(null)
const dragOverCol = ref(null)

function onDragStart(e, wo) {
  dragData.value = wo
  e.dataTransfer.effectAllowed = 'move'
  e.stopPropagation()
}

function onDragOverCol(e, colKey) {
  dragOverCol.value = colKey
}

function onDragLeaveCol(e, colKey) {
  // Only clear if leaving the column entirely
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverCol.value = null
  }
}

async function onDropOnCol(e, targetStage) {
  e.preventDefault()
  dragOverCol.value = null
  if (!dragData.value) return
  const wo = dragData.value
  dragData.value = null

  if (wo.current_stage === targetStage) return

  const fromIdx = STAGE_ORDER.indexOf(wo.current_stage)
  const toIdx = STAGE_ORDER.indexOf(targetStage)
  if (toIdx <= fromIdx) {
    return ElMessage.warning('只能向后推进环节')
  }
  if (Math.abs(toIdx - fromIdx) > 2) {
    return ElMessage.warning('不能跨环节移动，请通过详情页面操作')
  }

  try {
    await ElMessageBox.confirm(
      `将工单「${wo.work_order_no}」从 ${stageLabel(wo.current_stage)} 推进到 ${stageLabel(targetStage)}？`,
      '确认推进',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    await api.put(`/work-orders/${wo.id}/stage`, { target_stage: targetStage })
    ElMessage.success('环节已更新')
    loadWorkOrders()
  } catch (err) {
    if (err.response) ElMessage.error(err.response.data?.error || '更新失败')
  }
}

// 倒计时计算
function daysToDeadline(wo) {
  if (!wo.deadline) return Infinity
  const now = new Date()
  const dl = new Date(wo.deadline)
  const diff = Math.ceil((dl - now) / (1000 * 60 * 60 * 24))
  return diff
}

function deadlineLabel(wo) {
  const days = daysToDeadline(wo)
  if (days === Infinity) return wo.deadline
  if (days < 0) return `已超 ${Math.abs(days)} 天`
  if (days === 0) return '今天'
  return `${wo.deadline} (${days}天)`
}

function deadlineClass(wo) {
  const days = daysToDeadline(wo)
  if (days < 0) return 'deadline-overdue'
  if (days <= 3) return 'deadline-warning'
  return ''
}

async function loadWorkOrders() {
  loading.value = true
  try {
    const params = { ...filters, page: page.value, limit: pageSize.value }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await api.get('/work-orders', { params })
    const payload = res.data || {}
    if (Array.isArray(payload)) {
      tableData.value = payload
      total.value = (res.pagination?.total) || payload.length
    } else if (Array.isArray(payload.list)) {
      tableData.value = payload.list
      total.value = payload.total || 0
    } else {
      tableData.value = []
      total.value = 0
    }
    // Group by stage for kanban
    const allRes = await api.get('/work-orders', { params: { ...filters, limit: 200 } })
    const allPayload = allRes.data || {}
    let allList = Array.isArray(allPayload) ? allPayload : (allPayload.list || [])

    // 看板过滤
    if (kanbanSearch.value) {
      const kw = kanbanSearch.value.toLowerCase()
      allList = allList.filter(w =>
        (w.work_order_no || '').toLowerCase().includes(kw) ||
        (w.client_name || '').toLowerCase().includes(kw) ||
        (w.title || '').toLowerCase().includes(kw)
      )
    }
    if (kanbanFilterStage.value) {
      allList = allList.filter(w => w.current_stage === kanbanFilterStage.value)
    }
    if (kanbanFilterCategory.value) {
      allList = allList.filter(w => w.project_category === kanbanFilterCategory.value)
    }
    if (kanbanFilterStatus.value === 'timeout') {
      allList = allList.filter(w => w.is_timeout)
    } else if (kanbanFilterStatus.value === 'expiring') {
      allList = allList.filter(w => !w.is_timeout && daysToDeadline(w) <= 3 && daysToDeadline(w) > 0)
    } else if (kanbanFilterStatus.value === 'normal') {
      allList = allList.filter(w => !w.is_timeout)
    }
    if (kanbanFilterAssignee.value) {
      allList = allList.filter(w => w.assigned_to === kanbanFilterAssignee.value)
    }

    allKanbanCols.value.forEach(col => {
      const preserved = {}
      col.items?.forEach(wo => { preserved[wo.id] = wo._selected || false })
      col.items = allList
        .filter(w => w.current_stage === col.key)
        .map(w => { w._selected = preserved[w.id] || false; return w })
        .sort((a, b) => {
          if (a.is_timeout && !b.is_timeout) return -1
          if (!a.is_timeout && b.is_timeout) return 1
          const da = daysToDeadline(a), db = daysToDeadline(b)
          if (da < db) return -1
          if (da > db) return 1
          return 0
        })
    })
  } catch {
    tableData.value = []
    total.value = 0
    allKanbanCols.value.forEach(col => { col.items = [] })
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.stage = ''
  filters.status = ''
  filters.client_id = ''
  filters.project_category = ''
  filters.assigned_to = ''
  dateRange.value = null
  loadWorkOrders()
}

function openDispatch(row) {
  router.push('/dispatch')
}

// 编辑/删除
function openEdit(row) {
  router.push(`/work-orders/${row.id}`)
}

async function deleteWorkOrder(row) {
  try {
    await ElMessageBox.confirm(`确定删除工单「${row.work_order_no}」吗？`, '提示', { type: 'warning' })
    await api.delete(`/work-orders/${row.id}`)
    ElMessage.success('已删除')
    loadWorkOrders()
  } catch {}
}

const EXPORT_COLUMNS = [
  { key: 'work_order_no', label: '工单号' },
  { key: 'title', label: '项目名称' },
  { key: 'client_name', label: '甲方企业' },
  { key: 'current_stage', label: '当前环节' },
  { key: 'assigned_to', label: '负责人' },
  { key: 'deadline', label: '截止日期' },
  { key: 'created_at', label: '创建日期' },
]

function exportExcel() {
  const data = viewMode.value === 'kanban'
    ? allKanbanCols.value.flatMap(c => c.items || [])
    : tableData.value
  if (!data.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(data, EXPORT_COLUMNS, '工单列表')
  ElMessage.success(`已导出 ${data.length} 条数据`)
}

async function createWorkOrder() {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return
  creating.value = true
  try {
    // 分离内置字段和自定义字段
    const knownFields = ['client_id', 'title', 'project_type', 'project_category', 'address', 'description', 'deadline', 'client_user_id']
    const body = {}
    const customData = {}

    Object.entries(createForm).forEach(([key, value]) => {
      if (knownFields.includes(key)) {
        body[key] = value
      } else {
        customData[key] = value
      }
    })

    // 自定义字段存入 custom_data
    if (Object.keys(customData).length > 0) {
      body.custom_data = customData
    }

    await api.post('/work-orders', body)
    ElMessage.success('创建成功')
    showCreate.value = false
    // 重置表单
    createFormFields.value.forEach(f => {
      if (f.default_value !== undefined) createForm[f.field_key] = f.default_value
      else if (f.field_type === 'image' || f.field_type === 'file') createForm[f.field_key] = []
      else createForm[f.field_key] = ''
    })
    loadWorkOrders()
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || '创建失败'
    console.error('创建工单失败:', e.response?.data, e)
    ElMessage.error(msg)
  } finally {
    creating.value = false
  }
}

let refreshTimer = null

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => loadWorkOrders(), 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

function handleRefresh() {
  loadWorkOrders()
  ElMessage.success('已刷新')
}

function applyDefaultClient() {
  api.get('/clients/default').then(res => {
    if (res.code === 0 && res.data?.default_client_id) {
      createForm.client_id = res.data.default_client_id
    }
  }).catch(() => {})
}

onMounted(() => {
  loadWorkOrders()
  loadProxyConfig()
  loadUserOptions()
  loadKanbanSettings()
  api.get('/clients').then(res => { clients.value = res.data?.list || res.data || [] }).catch(() => {})
  applyDefaultClient()
  startAutoRefresh()
})

onUnmounted(() => stopAutoRefresh())

function openProxyMeasure(row) {
  proxySubmitted.value = row.id
  // Reset form
  Object.keys(proxyForm).forEach(k => delete proxyForm[k])
  proxyFields.value.forEach(f => {
    if (f.default_value !== undefined) proxyForm[f.field_key] = f.default_value
    else if (f.field_type === 'image') proxyForm[f.field_key] = []
  })
  showProxy.value = true
}

async function loadProxyConfig() {
  proxyLoading.value = true
  try {
    const res = await api.get('/tenant/form-config/measurement_data')
    if (res.code === 0 && res.data) {
      proxyFields.value = res.data.fields || []
      proxyFields.value.forEach(f => {
        if (f.default_value !== undefined) proxyForm[f.field_key] = f.default_value
        else if (f.field_type === 'image') proxyForm[f.field_key] = []
      })
    }
  } catch (err) {
    console.error('加载测量表单配置失败:', err)
  } finally {
    proxyLoading.value = false
    proxyLoaded.value = true
  }
}

function proxyFileSuccess(res, file, fieldKey) {
  const url = res.url || res.data?.url
  if (!url) {
    ElMessage.error('上传成功但未返回文件地址')
    return
  }
  if (!proxyForm[fieldKey]) proxyForm[fieldKey] = []
  if (!proxyForm[fieldKey].includes(url)) {
    proxyForm[fieldKey].push(url)
  }
  if (!proxyUploadFileLists.value[fieldKey]) proxyUploadFileLists.value[fieldKey] = []
  if (!proxyUploadFileLists.value[fieldKey].find(f => f.url === url)) {
    proxyUploadFileLists.value[fieldKey].push({ name: file.name || url.split('/').pop(), url })
  }
}

async function submitProxy() {
  if (!proxySubmitted.value) return
  proxySubmitting.value = true
  try {
    await api.post(`/measurements/${proxySubmitted.value}/proxy-submit`, proxyForm)
    ElMessage.success('代录测量数据已提交')
    showProxy.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  } finally {
    proxySubmitting.value = false
  }
}

// ===== 右键菜单 =====
const contextMenu = reactive({ show: false, x: 0, y: 0, wo: null, colKey: '' })

function openContextMenu(e, wo, colKey) {
  contextMenu.show = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.wo = wo
  contextMenu.colKey = colKey
}

function closeContextMenu() {
  contextMenu.show = false
}

function contextAction(action) {
  closeContextMenu()
  const wo = contextMenu.wo
  if (!wo) return

  switch (action) {
    case 'view':
      router.push(`/work-orders/${wo.id}`)
      break
    case 'remark':
      currentWoId.value = wo.id
      showRemarkDialog.value = true
      break
    case 'reassign':
      currentWoId.value = wo.id
      reassignUserId.value = ''
      showReassignDialog.value = true
      break
    case 'tag':
      currentWoId.value = wo.id
      tagForm.tags = [...(wo.custom_tags || [])]
      tagForm.newTag = ''
      showTagDialog.value = true
      break
    case 'priority':
      currentWoId.value = wo.id
      priorityForm.priority = wo.priority || 'normal'
      showPriorityDialog.value = true
      break
    case 'deadline':
      currentWoId.value = wo.id
      deadlineForm.deadline = wo.deadline || ''
      showDeadlineDialog.value = true
      break
    case 'delete':
      deleteWorkOrder(wo)
      break
  }
}

// 点击页面关闭右键菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

// ===== 备注 =====
const showRemarkDialog = ref(false)
const remarkText = ref('')
const currentWoId = ref(null)

async function openRemarkDialog(wo) {
  currentWoId.value = wo.id
  remarkText.value = ''
  showRemarkDialog.value = true
}

async function submitRemark() {
  if (!remarkText.value.trim()) return ElMessage.warning('请输入备注内容')
  try {
    await api.post(`/work-orders/${currentWoId.value}/remark`, { content: remarkText.value.trim() })
    ElMessage.success('备注已添加')
    showRemarkDialog.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '添加备注失败')
  }
}

// ===== 转交 =====
const showReassignDialog = ref(false)
const reassignUserId = ref('')
const reassigning = ref(false)

function openReassignDialog(wo) {
  currentWoId.value = wo.id
  reassignUserId.value = ''
  showReassignDialog.value = true
}

async function submitReassign() {
  if (!reassignUserId.value) return ElMessage.warning('请选择负责人')
  reassigning.value = true
  try {
    await api.put(`/work-orders/${currentWoId.value}/assign`, { assigned_to: reassignUserId.value })
    ElMessage.success('已转交')
    showReassignDialog.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '转交失败')
  } finally {
    reassigning.value = false
  }
}

// ===== 标签 =====
const showTagDialog = ref(false)
const tagForm = reactive({ tags: [], newTag: '' })

function addTag() {
  const t = tagForm.newTag.trim()
  if (t && !tagForm.tags.includes(t)) {
    tagForm.tags.push(t)
  }
  tagForm.newTag = ''
}

async function saveTags() {
  try {
    await api.put(`/work-orders/${currentWoId.value}/tags`, { tags: tagForm.tags })
    ElMessage.success('标签已更新')
    showTagDialog.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新标签失败')
  }
}

// ===== 优先级 =====
const showPriorityDialog = ref(false)
const priorityForm = reactive({ priority: 'normal' })

async function savePriority() {
  try {
    await api.put(`/work-orders/${currentWoId.value}/priority`, { priority: priorityForm.priority })
    ElMessage.success('优先级已更新')
    showPriorityDialog.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新优先级失败')
  }
}

// ===== 截止日 =====
const showDeadlineDialog = ref(false)
const deadlineForm = reactive({ deadline: '' })

async function saveDeadline() {
  try {
    await api.put(`/work-orders/${currentWoId.value}/deadline`, { deadline: deadlineForm.deadline || null })
    ElMessage.success('截止日已更新')
    showDeadlineDialog.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新截止日失败')
  }
}

// 看板列设置
const showKanbanSettings = ref(false)
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.page-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }

.filter-card { margin-bottom: var(--space-4); }
.kanban-filter-bar { margin-bottom: var(--space-3); }

/* Stats panel on kanban */
:deep(.stats-panel) { margin-bottom: var(--space-4); }

/* Kanban */
.kanban-wrap { display: flex; gap: var(--space-3); overflow-x: auto; padding-bottom: var(--space-4); }
.kanban-col {
  min-width: 260px; flex: 1;
  border-radius: var(--radius-base);
  overflow: hidden;
  transition: background 0.2s, box-shadow 0.2s;
}
.kanban-col-dragover {
  background: rgba(37, 99, 235, 0.05);
  box-shadow: 0 0 0 2px var(--color-primary);
}

.kanban-header {
  background: var(--color-bg-page);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-base) var(--radius-base) 0 0;
  border: 1px solid var(--color-border-light);
  border-bottom: 2px solid var(--color-border-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.col-header-left { display: flex; align-items: center; gap: 4px; }
.col-toggle { cursor: pointer; color: var(--color-text-tertiary); font-size: 14px; }
.col-toggle:hover { color: var(--color-primary); }
.col-title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.col-count {
  background: var(--color-border-light);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: 10px;
  font-weight: var(--font-weight-semibold);
}
.col-header-right { display: flex; gap: 4px; }
.col-action { cursor: pointer; color: var(--color-text-tertiary); font-size: 14px; }
.col-action:hover { color: var(--color-primary); }

.kanban-body {
  background: var(--color-bg-page);
  border-radius: 0 0 var(--radius-base) var(--radius-base);
  padding: var(--space-2);
  min-height: 200px;
  border: 1px solid var(--color-border-light);
  border-top: none;
}

.kanban-card-wrap {
  position: relative;
  margin-bottom: var(--space-2);
}

.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.kanban-card {
  cursor: pointer;
  border: 1px solid var(--color-border-light);
  transition: box-shadow 0.2s;
}
.kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.kanban-card :deep(.el-card__body) { padding: var(--space-3); padding-top: var(--space-3); }

.card-tags { display: flex; gap: var(--space-1); margin-bottom: var(--space-2); flex-wrap: wrap; }
.card-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-primary); margin-bottom: var(--space-1); }
.card-progress { margin-bottom: var(--space-2); }
.card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); display: flex; justify-content: space-between; }

.deadline-overdue { color: #f5222d; font-weight: 600; }
.deadline-warning { color: #fa8c16; font-weight: 600; }

/* Hover quick actions */
.card-quick-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  gap: 4px;
  z-index: 2;
}
.kanban-card:hover .card-quick-actions { display: flex; }
.card-quick-actions .el-icon {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}
.card-quick-actions .el-icon:hover {
  background: var(--color-primary);
  color: #fff;
}

.action-link { color: var(--color-primary); cursor: pointer; margin-right: var(--space-2); }

.batch-bar {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: #e6f7ff; border-radius: var(--radius-sm);
  margin-bottom: var(--space-3); font-size: var(--font-size-xs);
}

.kanban-card-timeout { border-left: 3px solid #f5222d; }
.kanban-card-expiring { border-left: 3px solid #fa8c16; }

.card-actions { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
.card-actions :deep(.el-button) { padding: 0 4px; font-size: 12px; }

:deep(.timeout-dot) { background: #f5222d; }
:deep(.expiring-dot) { background: #fa8c16; }

:deep(.el-pagination) {
  padding-top: var(--space-4);
}

/* Context menu */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border-radius: var(--radius-base);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 4px 0;
  min-width: 160px;
}
.ctx-item {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: background 0.15s;
}
.ctx-item:hover { background: #f5f5f5; }
.ctx-item.ctx.danger { color: #f5222d; }
.ctx-divider { height: 1px; background: var(--color-border-light); margin: 4px 0; }

/* Col settings */
.col-setting-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}
.col-setting-row:hover { background: #f5f5f5; }
.drag-handle { cursor: grab; color: var(--color-text-tertiary); }
.drag-handle:active { cursor: grabbing; }

/* Print */
@media print {
  .page-actions, .filter-card, .batch-bar { display: none !important; }
  .kanban-col { break-inside: avoid; }
}
</style>
