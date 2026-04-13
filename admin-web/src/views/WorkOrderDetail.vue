<template>
  <div v-loading="loading">
    <!-- Header -->
    <div class="flex-between mb-20">
      <div>
        <el-button @click="$router.back()" class="mb-8">&larr; 返回</el-button>
        <h1 class="page-title"><span class="wo-no">{{ detail.work_order_no }}</span> {{ detail.title }}</h1>
      </div>
      <div>
        <el-button v-if="canEdit" @click="showEditDialog = true">编辑</el-button>
        <el-button @click="handleExport">导出 PDF</el-button>
        <el-button type="primary" @click="handlePrint">打印</el-button>
        <el-button v-if="canEdit" type="danger" @click="deleteWorkOrder">删除</el-button>
      </div>
    </div>

    <!-- Progress Steps -->
    <el-card class="mb-20">
      <el-steps :active="currentStepIndex" finish-status="success" align-center class="clickable-steps">
        <el-step v-for="s in stages" :key="s.key" :title="s.label"
          @click="handleStageClick(s.key)" style="cursor:pointer" />
      </el-steps>
    </el-card>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
      <div>
        <!-- Basic Info -->
        <el-card class="mb-20">
          <template #header><span class="section-title">基本信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="甲方企业">{{ detail.client_name }}</el-descriptions-item>
          <el-descriptions-item label="项目类型">{{ detail.project_type }}</el-descriptions-item>
          <el-descriptions-item label="项目分类">{{ detail.project_category }}</el-descriptions-item>
          <el-descriptions-item label="项目地址">{{ detail.address }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail.contact_name }} {{ detail.contact_phone }}</el-descriptions-item>
          <el-descriptions-item label="需求描述" :span="2">{{ detail.description }}</el-descriptions-item>
        </el-descriptions>
        </el-card>

        <!-- Photos -->
        <el-card class="mb-20" v-if="detail.photos?.length">
          <template #header><span class="section-title">现场照片（{{ detail.photos.length }}张）</span></template>
          <div class="photo-grid">
            <el-image v-for="(url, i) in detail.photos" :key="i" :src="url" :preview-src-list="detail.photos"
              fit="cover" class="photo-item" />
          </div>
        </el-card>

        <!-- 审批信息 -->
        <el-card class="mb-20" v-if="detail.approval">
          <template #header><span class="section-title">审批信息</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="审批人">{{ detail.approval.approver_name || detail.approval.approver?.name || 'ID:' + detail.approval.approver_id }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detail.approval.status === 'approved' ? 'success' : detail.approval.status === 'rejected' ? 'danger' : 'warning'">
                {{ detail.approval.status === 'approved' ? '已通过' : detail.approval.status === 'rejected' ? '已驳回' : '待审批' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审批意见" :span="2">{{ detail.approval.comment || '—' }}</el-descriptions-item>
            <el-descriptions-item label="审批日期">{{ detail.approval.approved_at || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 派单信息 -->
        <el-card class="mb-20" v-if="detail.assignment">
          <template #header><span class="section-title">派单信息</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="派单给">{{ detail.assignment.assignee?.name || 'ID:' + detail.assignment.assigned_to }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detail.assignment.status === 'completed' ? 'success' : 'warning'">
                {{ detail.assignment.status === 'completed' ? '已完成' : '进行中' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="派单人">{{ detail.assignment.assigner?.name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="派单日期">{{ detail.assignment.assigned_at || '—' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.assignment.notes || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 测量数据 -->
        <el-card class="mb-20" v-if="measurementData">
          <template #header>
            <div class="flex-between">
              <span class="section-title">测量数据</span>
              <el-button type="primary" size="small" @click="$router.push(`/work-orders/${id}/measure-review`)">审核</el-button>
            </div>
          </template>
          <!-- 简式展示 -->
          <el-descriptions :column="2" border class="mb-16">
            <el-descriptions-item label="测量员">{{ measurementData.measurer?.name || 'ID:' + measurementData.measurer_id }}</el-descriptions-item>
            <el-descriptions-item label="测量日期">{{ measurementData.measured_at || '—' }}</el-descriptions-item>
            <el-descriptions-item label="面积">{{ measurementData.area }} {{ measurementData.unit || '㎡' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="measurementData.status === 'approved' ? 'success' : 'warning'">
                {{ measurementData.status === 'approved' ? '已审核' : measurementData.status === 'rejected' ? '已驳回' : '待审核' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ measurementData.notes || '—' }}</el-descriptions-item>
          </el-descriptions>
          <!-- 详细材料展示 -->
          <div class="material-section" v-for="(mat, mi) in measurementData.materials" :key="mi">
            <div class="mat-header">
              <span>{{ mat.type }} — {{ mat.faces.length }}面 &nbsp;
                <el-tag size="small">合计 {{ mat.faces.reduce((s, f) => s + (f.area || 0), 0).toFixed(2) }}㎡</el-tag>
              </span>
            </div>
            <div class="mat-body">
              <div class="face-row" v-for="(face, fi) in mat.faces" :key="fi">
                <span class="face-label">{{ face.label }}</span>
                <span>{{ face.width }} × {{ face.height }}m</span>
                <span class="face-area">{{ face.area || (face.width * face.height).toFixed(2) }}㎡</span>
                <span class="text-muted">{{ face.notes || '—' }}</span>
                <span class="action-link">{{ face.photos?.length || 0 }}张</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 材料清单 -->
        <el-card class="mb-20">
          <template #header>
            <div class="flex-between">
              <span class="section-title">材料清单</span>
              <el-button type="primary" size="small" @click="showMaterialDialog = true">+ 添加</el-button>
            </div>
          </template>
          <el-table :data="materials" border size="small" v-if="materials.length">
            <el-table-column prop="category" label="分类" width="80" />
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="spec" label="规格" width="100" />
            <el-table-column prop="quantity" label="数量" width="70" align="right" />
            <el-table-column prop="unit" label="单位" width="60" />
            <el-table-column prop="unit_price" label="单价" width="80" align="right">
              <template #default="{ row }">¥{{ Number(row.unit_price || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="总价" width="90" align="right">
              <template #default="{ row }">¥{{ ((row.quantity || 0) * (row.unit_price || 0)).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" text size="small" @click="editMaterial(row)">编辑</el-button>
                <el-button type="danger" text size="small" @click="deleteMaterial(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无材料" :image-size="40" />
        </el-card>

        <!-- 设计信息 -->
        <el-card class="mb-20" v-if="detail.designs?.length">
          <template #header><span class="section-title">设计稿（{{ detail.designs.length }}份）</span></template>
          <div v-for="(d, i) in detail.designs" :key="i" class="stage-item-box">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="设计师">{{ d.designer_name || d.designer?.name || 'ID:' + d.designer_id }}</el-descriptions-item>
              <el-descriptions-item label="类型">{{ d.design_type || '—' }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">{{ d.description || '—' }}</el-descriptions-item>
              <el-descriptions-item label="审核人">{{ d.reviewer_name || d.reviewer?.name || '—' }}</el-descriptions-item>
              <el-descriptions-item label="审核意见">{{ d.review_comment || '—' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="d.status === 'approved' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'">
                  {{ d.status === 'approved' ? '已通过' : d.status === 'rejected' ? '已驳回' : '待审核' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="提交日期">{{ d.submitted_at || d.created_at || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 设计稿图片预览 -->
        <el-card class="mb-20" v-if="detail.design_images?.length">
          <template #header><span class="section-title">设计稿预览（{{ detail.design_images.length }}张）</span></template>
          <div class="design-photo-grid">
            <el-image v-for="(img, i) in detail.design_images" :key="i" :src="img.url || img" :preview-src-list="detail.design_images.map(d => d.url || d)"
              fit="cover" class="design-photo-item" lazy />
          </div>
        </el-card>

        <!-- 生产信息 -->
        <el-card class="mb-20" v-if="detail.productions?.length">
          <template #header><span class="section-title">生产记录（{{ detail.productions.length }}条）</span></template>
          <div v-for="(p, i) in detail.productions" :key="i" class="stage-item-box">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="描述" :span="2">{{ p.description || '—' }}</el-descriptions-item>
              <el-descriptions-item label="材料">{{ p.material || '—' }}</el-descriptions-item>
              <el-descriptions-item label="数量">{{ p.quantity || '—' }} {{ p.unit || '' }}</el-descriptions-item>
              <el-descriptions-item label="开始日期">{{ p.start_date || '—' }}</el-descriptions-item>
              <el-descriptions-item label="完成日期">{{ p.complete_date || '—' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="p.status === 'completed' ? 'success' : 'warning'">
                  {{ p.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ p.notes || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 施工信息 -->
        <el-card class="mb-20" v-if="detail.constructions?.length">
          <template #header><span class="section-title">施工记录（{{ detail.constructions.length }}次）</span></template>
          <div v-for="(c, i) in detail.constructions" :key="i" class="stage-item-box">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="施工人">{{ c.constructor_name || c.constructor?.name || 'ID:' + c.constructor_id }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="c.status === 'completed' ? 'success' : 'warning'">
                  {{ c.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="开始日期">{{ c.start_date || '—' }}</el-descriptions-item>
              <el-descriptions-item label="完成日期">{{ c.end_date || '—' }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">{{ c.description || '—' }}</el-descriptions-item>
              <el-descriptions-item label="验收结果">{{ c.acceptance_result || '—' }}</el-descriptions-item>
              <el-descriptions-item label="安全检查">
                <el-tag v-if="c.safety_check" type="success" size="small">已检查</el-tag>
                <span v-else class="text-muted">未检查</span>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ c.notes || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 结算信息 -->
        <el-card class="mb-20" v-if="detail.finances?.length">
          <template #header><span class="section-title">结算信息</span></template>
          <div v-for="(f, i) in detail.finances" :key="i" class="stage-item-box">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="材料费">¥{{ formatMoney(f.material_cost) }}</el-descriptions-item>
              <el-descriptions-item label="人工费">¥{{ formatMoney(f.labor_cost) }}</el-descriptions-item>
              <el-descriptions-item label="运输费">¥{{ formatMoney(f.transport_cost) }}</el-descriptions-item>
              <el-descriptions-item label="其他费用">¥{{ formatMoney(f.other_cost) }}</el-descriptions-item>
              <el-descriptions-item label="总成本"><span class="text-danger">¥{{ formatMoney(f.total_cost) }}</span></el-descriptions-item>
              <el-descriptions-item label="合同金额"><span class="text-success">¥{{ formatMoney(f.contract_amount) }}</span></el-descriptions-item>
              <el-descriptions-item label="利润"><span class="text-success">¥{{ formatMoney(f.profit) }}</span></el-descriptions-item>
              <el-descriptions-item label="已收款">¥{{ formatMoney(f.paid_amount) }}</el-descriptions-item>
              <el-descriptions-item label="付款状态">
                <el-tag :type="f.payment_status === 'paid' ? 'success' : f.payment_status === 'partial' ? 'warning' : 'info'" size="small">
                  {{ f.payment_status === 'paid' ? '已结清' : f.payment_status === 'partial' ? '部分收款' : '未收款' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="开票状态">
                <el-tag :type="f.invoice_status === 'issued' ? 'success' : 'info'" size="small">
                  {{ f.invoice_status === 'issued' ? '已开票' : '未开票' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ f.notes || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 归档信息 -->
        <el-card class="mb-20" v-if="detail.archive">
          <template #header><span class="section-title">归档信息</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="归档人">{{ detail.archive.archiver_name || detail.archive.archiver?.name || 'ID:' + detail.archive.archived_by }}</el-descriptions-item>
            <el-descriptions-item label="归档日期">{{ detail.archive.archive_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag type="info" size="small">已归档</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.archive.notes || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 售后记录 -->
        <el-card class="mb-20" v-if="detail.aftersales?.length">
          <template #header><span class="section-title">售后记录（{{ detail.aftersales.length }}个）</span></template>
          <div v-for="(a, i) in detail.aftersales" :key="i" class="stage-item-box">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="问题类型">{{ a.issue_type || '—' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="a.status === 'resolved' ? 'success' : 'warning'" size="small">
                  {{ a.status === 'resolved' ? '已解决' : a.status === 'processing' ? '处理中' : '待处理' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="问题描述" :span="2">{{ a.description || '—' }}</el-descriptions-item>
              <el-descriptions-item label="处理人">{{ a.handler_name || a.handler?.name || '—' }}</el-descriptions-item>
              <el-descriptions-item label="解决日期">{{ a.resolved_at || '—' }}</el-descriptions-item>
              <el-descriptions-item label="解决方案" :span="2">{{ a.solution || '—' }}</el-descriptions-item>
              <el-descriptions-item label="客户反馈">{{ a.feedback || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- Logs -->
        <el-card class="mb-20">
          <template #header><span class="section-title">操作日志</span></template>
          <el-timeline>
            <el-timeline-item v-for="log in logs" :key="log.id"
              :timestamp="log.created_at" placement="top"
              :type="logTypeColor(log.log_type || log.action)"
              :icon="logTypeIcon(log.log_type || log.action)">
              <div class="log-item">
                <div class="log-header">
                  <el-tag size="small" :type="logTypeColor(log.log_type || log.action)" effect="plain">
                    {{ logTypeLabel(log.log_type || log.action) }}
                  </el-tag>
                  <span class="log-detail">{{ log.detail }}</span>
                  <span class="text-muted">— {{ log.user_name }}</span>
                </div>
                <div v-if="log.old_value && log.new_value" class="log-change">
                  <span class="text-muted">{{ log.field_name || '字段' }}:</span>
                  <span class="log-old">{{ log.old_value }}</span>
                  <span class="text-muted">→</span>
                  <span class="log-new">{{ log.new_value }}</span>
                </div>
                <div v-if="log.amount_change" class="log-amount" :class="log.amount_change > 0 ? 'amount-positive' : 'amount-negative'">
                  {{ log.amount_change > 0 ? '+' : '' }}¥{{ Math.abs(log.amount_change).toFixed(2) }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 变更记录 -->
        <el-card>
          <template #header><span class="section-title">变更记录</span></template>
          <el-timeline v-if="changeLogs.length">
            <el-timeline-item v-for="cl in changeLogs" :key="cl.id"
              :timestamp="cl.created_at" placement="top"
              :type="cl.change_type === 'cost' ? 'warning' : cl.change_type === 'design' ? 'primary' : 'info'">
              <div class="log-item">
                <div class="log-header">
                  <el-tag size="small" :type="cl.change_type === 'cost' ? 'warning' : cl.change_type === 'design' ? 'primary' : 'info'" effect="plain">
                    {{ changeTypeLabel(cl.change_type) }}
                  </el-tag>
                  <span class="log-detail">{{ cl.description || '—' }}</span>
                  <span class="text-muted">— {{ cl.operator_name || '未知' }}</span>
                </div>
                <div v-if="cl.cost_impact" class="log-amount" :class="cl.cost_impact > 0 ? 'amount-positive' : 'amount-negative'">
                  费用影响: {{ cl.cost_impact > 0 ? '+' : '' }}¥{{ Math.abs(cl.cost_impact).toFixed(2) }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无变更记录" :image-size="40" />
        </el-card>
      </div>

      <!-- Right Panel -->
      <div>
        <el-card class="mb-20">
          <template #header><span class="section-title">当前环节</span></template>
          <div class="current-stage-box">
            <div class="stage-icon">{{ stageIcon }}</div>
            <div class="stage-name">{{ currentStageLabel }}</div>
          </div>
          <el-descriptions :column="1" class="mt-16">
            <el-descriptions-item label="负责人">{{ detail.assigned_to || '—' }}</el-descriptions-item>
            <el-descriptions-item label="截止">
              <span :class="{ 'text-danger': detail.is_timeout }">{{ detail.deadline || '—' }}</span>
            </el-descriptions-item>
          </el-descriptions>
          <div class="action-buttons">
            <el-button v-if="detail.current_stage === 'measurement' && detail.measurement" type="success" style="width:100%"
              @click="$router.push(`/work-orders/${id}/measure-review`)">审核测量数据</el-button>
            <el-button v-if="detail.current_stage === 'measurement' && !detail.measurement" type="warning" style="width:100%"
              @click="$router.push(`/work-orders/${id}/measure-review`)">代录测量数据</el-button>
            <el-button v-if="detail.current_stage === 'assignment'" type="primary" style="width:100%"
              @click="showDispatchDialog = true">派单</el-button>
          </div>
        </el-card>

        <el-card class="mb-20">
          <template #header><span class="section-title">关联数据</span></template>
          <el-descriptions :column="1">
            <el-descriptions-item label="设计稿">{{ detail.design_count || 0 }} 份</el-descriptions-item>
            <el-descriptions-item label="施工记录">{{ detail.construction_count || 0 }} 次</el-descriptions-item>
            <el-descriptions-item label="售后工单">{{ detail.aftersale_count || 0 }} 个</el-descriptions-item>
            <el-descriptions-item label="报价" v-if="detail.finance_summary">
              {{ formatMoney(detail.finance_summary.quote_amount) }}
              <el-tag size="small" :type="detail.finance_summary.status === 'paid' ? 'success' : 'warning'">
                {{ financeStatus(detail.finance_summary.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="甲方" v-if="detail.client_name">
              <el-button type="primary" text size="small" @click="$router.push(`/clients/${detail.client_id || ''}`)">
                {{ detail.client_name }}
              </el-button>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>

    <!-- 派单对话框 -->
    <el-dialog v-model="showDispatchDialog" title="派单" width="520px">
      <!-- 推荐测量员 -->
      <div class="measurer-section" v-if="measurerGroups.length">
        <div class="measurer-group" v-for="group in measurerGroups" :key="group.level">
          <div class="group-label">
            <el-tag :type="group.tagType" size="small">{{ group.label }}</el-tag>
            <span class="text-muted">{{ group.users.length }}人</span>
          </div>
          <div class="measurer-list">
            <el-tag v-for="u in group.users" :key="u.id"
              :class="['measurer-tag', { 'measurer-selected': dispatchForm.assigned_to === u.id }]"
              @click="dispatchForm.assigned_to = u.id"
              effect="plain">
              {{ u.name }} <span class="text-muted">{{ u.roleLabel }}</span>
            </el-tag>
          </div>
        </div>
      </div>
      <el-divider v-if="measurerGroups.length" content-position="center">或手动选择</el-divider>

      <el-form :model="dispatchForm" label-width="80px" ref="dispatchFormRef" :rules="dispatchRules">
        <el-form-item label="负责人" prop="assigned_to">
          <el-select v-model="dispatchForm.assigned_to" placeholder="选择测量员" style="width:100%">
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id">
              <span>{{ u.name }}</span>
              <span style="float:right;color:#8c8c8c;font-size:12px">{{ u.roleLabel }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="dispatchForm.deadline" type="date" placeholder="可选"
            value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dispatchForm.notes" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDispatchDialog = false">取消</el-button>
        <el-button type="primary" @click="submitDispatch" :loading="dispatching">确认派单</el-button>
      </template>
    </el-dialog>

    <!-- 编辑工单对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑工单" width="480px">
      <el-form :model="editForm" label-width="80px" ref="editFormRef" :rules="editRules">
        <el-form-item label="项目名称" prop="title">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="项目分类">
          <el-select v-model="editForm.project_category" style="width:100%">
            <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="editing">保存</el-button>
      </template>
    </el-dialog>

    <!-- 材料编辑对话框 -->
    <el-dialog v-model="showMaterialDialog" :title="materialForm.id ? '编辑材料' : '添加材料'" width="520px">
      <el-form :model="materialForm" label-width="80px" ref="materialFormRef" :rules="materialRules">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="materialForm.category" placeholder="选择分类" style="width:100%">
                <el-option label="主材" value="main" />
                <el-option label="辅材" value="auxiliary" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="materialForm.name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规格">
              <el-input v-model="materialForm.spec" placeholder="如 3000×1500" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="materialForm.quantity" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单位">
              <el-select v-model="materialForm.unit" style="width:100%">
                <el-option label="㎡" value="㎡" />
                <el-option label="m" value="m" />
                <el-option label="个" value="个" />
                <el-option label="块" value="块" />
                <el-option label="套" value="套" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单价">
              <el-input-number v-model="materialForm.unit_price" :min="0" :precision="2"
                :controls="false" style="width:100%" placeholder="¥" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总价">
              <el-input :model-value="((materialForm.quantity || 0) * (materialForm.unit_price || 0)).toFixed(2)"
                disabled prefix="¥" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="materialForm.notes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMaterialDialog = false">取消</el-button>
        <el-button type="primary" @click="submitMaterial" :loading="materialSubmitting">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'
import { formatMoney } from '../utils/format'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const loading = ref(true)
const detail = ref({})
const logs = ref([])

// 材料清单
const materials = ref([])
const showMaterialDialog = ref(false)
const materialSubmitting = ref(false)
const materialFormRef = ref(null)
const materialForm = reactive({
  id: null, category: 'main', name: '', spec: '', quantity: 1, unit: '㎡', unit_price: 0, notes: ''
})
const materialRules = {
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入材料名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

// 变更记录
const changeLogs = ref([])

// 推荐测量员
const measurerGroups = ref([])

// 编辑/删除
const showEditDialog = ref(false)
const editing = ref(false)
const editFormRef = ref(null)
const editForm = reactive({ title: '', project_category: '', description: '' })
const editRules = {
  title: [{ required: true, message: '项目名称为必填项', trigger: 'blur' }]
}
const PROJECT_CATEGORIES = [
  { label: '日常', value: 'daily' },
  { label: '门头招牌', value: 'storefront' },
  { label: '室内广告', value: 'indoor_ad' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '520', value: '520' },
  { label: '国庆', value: 'national_day' },
  { label: '春节', value: 'spring_festival' },
]

const canEdit = computed(() =>
  detail.value.current_stage === 'assignment' && !detail.value.assigned_tenant_user_id
)

watch(showEditDialog, (val) => {
  if (val) {
    editForm.title = detail.value.title || ''
    editForm.project_category = detail.value.project_category || ''
    editForm.description = detail.value.description || ''
  }
})

async function submitEdit() {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  editing.value = true
  try {
    await api.put(`/work-orders/${id}`, editForm)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    const woRes = await api.get(`/work-orders/${id}`)
    detail.value = woRes.data || {}
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新失败')
  } finally {
    editing.value = false
  }
}

async function deleteWorkOrder() {
  try {
    await ElMessageBox.confirm('确定删除此工单吗？此操作不可恢复。', '提示', { type: 'warning' })
    await api.delete(`/work-orders/${id}`)
    ElMessage.success('已删除')
    router.back()
  } catch {}
}

// 派单
const showDispatchDialog = ref(false)
const dispatching = ref(false)
const dispatchFormRef = ref(null)
const userOptions = ref([])
const dispatchForm = reactive({ assigned_to: '', deadline: '', notes: '' })
const dispatchRules = {
  assigned_to: [{ required: true, message: '请选择负责人', trigger: 'change' }]
}
const roleMap = { admin: '管理员', dispatcher: '调度员', measurer: '测量员', designer: '设计师', producer: '生产', constructor: '施工', finance: '财务' }

async function loadTenantUsers() {
  try {
    const res = await api.get('/tenants/users')
    const payload = res.data || {}
    const users = Array.isArray(payload) ? payload : (payload.list || [])
    userOptions.value = users.filter(u => u.status === 'active').map(u => ({
      ...u,
      roleLabel: roleMap[u.role] || u.role
    }))
  } catch (e) {
    console.error('加载人员列表失败:', e)
  }
}

async function submitDispatch() {
  const valid = await dispatchFormRef.value.validate().catch(() => false)
  if (!valid) return
  dispatching.value = true
  try {
    await api.post('/assignments', {
      work_order_id: parseInt(id),
      assigned_to: dispatchForm.assigned_to,
      deadline: dispatchForm.deadline || null,
      notes: dispatchForm.notes || null,
    })
    ElMessage.success('派单成功')
    showDispatchDialog.value = false
    // 重新加载详情
    const woRes = await api.get(`/work-orders/${id}`)
    detail.value = woRes.data || {}
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '派单失败')
  } finally {
    dispatching.value = false
  }
}

watch(showDispatchDialog, (val) => {
  if (val) {
    dispatchForm.assigned_to = ''
    dispatchForm.deadline = ''
    dispatchForm.notes = ''
    // 打开派单对话框时加载推荐测量员
    loadRecommendedMeasurers()
  }
})

// 日志类型图标
function logTypeIcon(type) {
  const map = { create: 'Plus', edit: 'Edit', delete: 'Delete', stage_change: 'Top', approval: 'Check', dispatch: 'Share' }
  return map[type] || 'Document'
}

// 日志类型颜色
function logTypeColor(type) {
  const map = { create: 'success', edit: '', delete: 'danger', stage_change: 'warning', approval: 'success', dispatch: 'primary' }
  return map[type] || 'info'
}

// 日志类型标签
function logTypeLabel(type) {
  const map = { create: '创建', edit: '编辑', delete: '删除', stage_change: '阶段变更', approval: '审批', dispatch: '派单' }
  return map[type] || type || '操作'
}

// 变更类型标签
function changeTypeLabel(type) {
  const map = { design: '设计变更', cost: '费用变更', scope: '范围变更', other: '其他' }
  return map[type] || type || '变更'
}

// 加载材料清单
async function loadMaterials() {
  try {
    const res = await api.get(`/work-orders/${id}/materials`)
    materials.value = res.data || []
  } catch (e) {
    console.error('加载材料清单失败:', e)
    materials.value = []
  }
}

// 添加/编辑材料
function editMaterial(row) {
  Object.assign(materialForm, {
    id: row.id, category: row.category || 'main', name: row.name || '',
    spec: row.spec || '', quantity: row.quantity || 1, unit: row.unit || '㎡',
    unit_price: row.unit_price || 0, notes: row.notes || ''
  })
  showMaterialDialog.value = true
}

async function submitMaterial() {
  const valid = await materialFormRef.value.validate().catch(() => false)
  if (!valid) return
  materialSubmitting.value = true
  try {
    const payload = { ...materialForm, work_order_id: parseInt(id) }
    if (materialForm.id) {
      await api.put(`/work-orders/materials/${materialForm.id}`, payload)
      ElMessage.success('材料已更新')
    } else {
      await api.post(`/work-orders/${id}/materials`, payload)
      ElMessage.success('材料已添加')
    }
    showMaterialDialog.value = false
    resetMaterialForm()
    loadMaterials()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    materialSubmitting.value = false
  }
}

async function deleteMaterial(row) {
  try {
    await ElMessageBox.confirm(`确定删除材料「${row.name}」吗？`, '提示', { type: 'warning' })
    await api.delete(`/work-orders/materials/${row.id}`)
    ElMessage.success('已删除')
    loadMaterials()
  } catch {}
}

function resetMaterialForm() {
  Object.assign(materialForm, {
    id: null, category: 'main', name: '', spec: '', quantity: 1, unit: '㎡', unit_price: 0, notes: ''
  })
}

watch(showMaterialDialog, (val) => {
  if (!val) resetMaterialForm()
})

// 加载推荐测量员
async function loadRecommendedMeasurers() {
  try {
    const res = await api.get('/assignments/recommended-measurers')
    const measurers = res.data || []
    // 按负载分组
    const groups = { free: [], moderate: [], busy: [] }
    for (const m of measurers) {
      const match = userOptions.value.find(u => u.id === m.id)
      if (match) {
        groups[m.load_level || 'free'].push({ ...match, task_count: m.task_count || 0 })
      }
    }
    measurerGroups.value = [
      { level: 'free', label: '空闲', tagType: 'success', users: groups.free },
      { level: 'moderate', label: '适中', tagType: '', users: groups.moderate },
      { level: 'busy', label: '繁忙', tagType: 'danger', users: groups.busy },
    ].filter(g => g.users.length)
  } catch (e) {
    console.error('加载推荐测量员失败:', e)
    measurerGroups.value = []
  }
}

// 加载变更记录
async function loadChangeLogs() {
  try {
    const res = await api.get(`/work-orders/${id}/change-logs`)
    changeLogs.value = res.data || []
  } catch (e) {
    console.error('加载变更记录失败:', e)
    changeLogs.value = []
  }
}

const stages = [
  { key: 'declaration', label: '申报' },
  { key: 'approval', label: '审批' },
  { key: 'assignment', label: '派单' },
  { key: 'measurement', label: '测量' },
  { key: 'design', label: '设计' },
  { key: 'production', label: '生产' },
  { key: 'construction', label: '施工' },
  { key: 'archive', label: '归档' }
]

const currentStepIndex = computed(() => stages.findIndex(s => s.key === detail.value.current_stage))
const currentStageLabel = computed(() => {
  const s = stages.find(s => s.key === detail.value.current_stage)
  return s ? s.label : '未知'
})
const stageIcon = computed(() => {
  const icons = { declaration: '📋', approval: '✅', assignment: '📤', measurement: '📐', design: '🎨', production: '🏭', construction: '🔧', archive: '📁' }
  return icons[detail.value.current_stage] || '📋'
})
// 测量数据取第一条
const measurementData = computed(() => {
  const list = detail.value.measurements
  if (!list || !list.length) return null
  return list[0]
})

const stageRouteMap = {
  declaration: '/declarations',
  measurement: `/work-orders/${id}/measure-review`,
  design: '/designs',
  production: '/production',
  construction: '/construction',
  finance: '/finance',
  archive: '/archive',
  aftersale: '/aftersale',
}

function handleStageClick(stage) {
  const route = stageRouteMap[stage]
  if (route) router.push(route)
}

const FINANCE_STATUS = { quoted: '报价中', paid: '已结清', invoiced: '已开票', settlement_complete: '结算完成' }
function financeStatus(s) { return FINANCE_STATUS[s] || s }

function handlePrint() {
  window.print()
}

function handleExport() {
  ElMessage.info('导出功能开发中，请先使用打印功能保存为 PDF')
  handlePrint()
}

onMounted(async () => {
  loadTenantUsers()
  try {
    const [woRes, logRes] = await Promise.all([
      api.get(`/work-orders/${id}`),
      api.get(`/work-orders/${id}/logs`)
    ])
    detail.value = woRes.data || {}
    logs.value = logRes.data || []
    // 加载材料清单和变更记录
    loadMaterials()
    loadChangeLogs()
  } catch {
    ElMessage.error('加载失败')
    detail.value = {}
    logs.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-8 { margin-bottom: var(--space-2); }
.mb-16 { margin-bottom: var(--space-4); }
.mb-20 { margin-bottom: var(--space-5); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.mt-16 { margin-top: var(--space-4); }
.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.text-danger { color: var(--color-danger); }
.action-link { color: var(--color-primary); cursor: pointer; }
.photo-grid { display: grid; grid-template-columns: repeat(5, 80px); gap: var(--space-2); }
.photo-item { width: 80px; height: 80px; border-radius: var(--radius-sm); cursor: pointer; }
.current-stage-box { text-align: center; padding: var(--space-4); }
.stage-icon { font-size: var(--font-size-xl); margin-bottom: var(--space-2); }
.stage-name { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.stage-item-box { margin-bottom: var(--space-3); }
.stage-item-box:last-child { margin-bottom: 0; }
.material-section { border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); margin-bottom: var(--space-3); overflow: hidden; }
.mat-header { background: var(--color-bg-page); padding: var(--space-3) var(--space-4); font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); }
.mat-body { padding: 0 var(--space-4); }
.face-row { display: grid; grid-template-columns: 60px 120px 80px 1fr 50px; gap: var(--space-2); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); font-size: var(--font-size-xs); }
.face-row:last-child { border-bottom: none; }
.face-label { color: var(--color-text-tertiary); }
.face-area { color: var(--color-primary); font-weight: var(--font-weight-medium); }
.action-buttons { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
.clickable-steps :deep(.el-step__title) { cursor: pointer; }
.clickable-steps :deep(.el-step__head) { cursor: pointer; }
.log-item { line-height: 1.6; }
.log-header { display: flex; align-items: center; gap: var(--space-2); }
.log-detail { flex: 1; font-size: var(--font-size-sm); }
.log-change { margin-top: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.log-old { color: var(--color-text-tertiary); text-decoration: line-through; margin: 0 4px; }
.log-new { color: var(--color-primary); margin: 0 4px; font-weight: var(--font-weight-medium); }
.log-amount { margin-top: 2px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.amount-positive { color: var(--color-danger); }
.amount-negative { color: var(--color-success); }
.design-photo-grid { display: grid; grid-template-columns: repeat(4, 160px); gap: var(--space-3); }
.design-photo-item { width: 160px; height: 120px; border-radius: var(--radius-sm); cursor: pointer; }
.measurer-section { margin-bottom: 12px; }
.measurer-group { margin-bottom: 12px; }
.group-label { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.measurer-list { display: flex; flex-wrap: wrap; gap: 8px; }
.measurer-tag { cursor: pointer; padding: 6px 14px; transition: all 0.15s; user-select: none; }
.measurer-tag:hover { border-color: var(--color-primary); }
.measurer-selected { border-color: var(--color-primary) !important; color: var(--color-primary) !important; background: var(--color-primary-light-9) !important; }
</style>
