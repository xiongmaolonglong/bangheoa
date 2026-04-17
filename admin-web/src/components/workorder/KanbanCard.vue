<template>
  <el-badge
    :is-dot="wo.is_timeout || wo._daysToDeadline <= 3"
    :dot-class="wo.is_timeout ? 'timeout-dot' : 'expiring-dot'"
    :offset="[-2, 2]">
    <div class="kanban-card-wrap"
      @contextmenu.prevent="$emit('contextmenu', $event)"
      @click="$router.push(`/work-orders/${wo.id}`)">
      <el-checkbox v-model="wo._selected" class="card-checkbox" @click.stop />
      <el-card shadow="hover" class="kanban-card"
        :class="{ 'kanban-card-timeout': wo.is_timeout, 'kanban-card-expiring': !wo.is_timeout && wo._daysToDeadline <= 3 }"
        draggable="true"
        @dragstart="$emit('dragstart', $event)">
        <div class="card-tags">
          <el-tag size="small" type="primary" effect="plain">{{ wo.client_name }}</el-tag>
          <el-tag v-if="wo.activity_name" size="small" type="warning" effect="plain">{{ activityLabel }}</el-tag>
          <el-tag v-if="wo.project_type" size="small" effect="plain">{{ adTypeLabel }}</el-tag>
          <el-tag v-if="wo.priority === 'high'" size="small" type="danger">高优</el-tag>
          <el-tag v-if="wo.priority === 'low'" size="small" type="info">低优</el-tag>
          <el-tag v-if="wo.is_timeout" size="small" type="danger">超时</el-tag>
          <el-tag v-else-if="wo._daysToDeadline <= 3 && wo._daysToDeadline > 0" size="small" type="warning">{{ wo._daysToDeadline }}天</el-tag>
          <el-tag v-if="wo.custom_tags?.length" v-for="t in wo.custom_tags" :key="t" size="small" type="success">{{ t }}</el-tag>
        </div>
        <div class="card-title">{{ wo.title }}</div>
        <div v-if="wo.progress_percent !== undefined" class="card-progress">
          <el-progress :percentage="wo.progress_percent || 0" :stroke-width="4" :show-text="false" />
        </div>
        <div class="card-meta">
          <span>{{ wo.assigned_to || '未分配' }}</span>
          <span :class="wo._deadlineClass">{{ wo._deadlineLabel }}</span>
        </div>
        <div class="card-actions">
          <el-button v-if="wo.current_stage === 'assignment'" link type="primary" size="small" @click.stop="$router.push(`/work-orders/${wo.id}`)">派单</el-button>
          <el-button v-if="wo.current_stage === 'measurement' && wo.measurement" link type="success" size="small" @click.stop="$router.push(`/work-orders/${wo.id}/measure-review`)">审核</el-button>
          <el-button v-if="wo.current_stage === 'design'" link type="primary" size="small" @click.stop="$router.push('/designs')">设计</el-button>
          <el-button v-if="wo.current_stage === 'production'" link type="primary" size="small" @click.stop="$router.push('/production')">生产</el-button>
          <el-button v-if="wo.current_stage === 'construction'" link type="primary" size="small" @click.stop="$router.push('/construction')">施工</el-button>
        </div>
        <div class="card-quick-actions">
          <el-tooltip content="查看详情" placement="top">
            <el-icon @click.stop="$router.push(`/work-orders/${wo.id}`)"><View /></el-icon>
          </el-tooltip>
          <el-tooltip content="添加备注" placement="top">
            <el-icon @click.stop="$emit('remark')"><ChatDotRound /></el-icon>
          </el-tooltip>
          <el-tooltip content="转交负责人" placement="top">
            <el-icon @click.stop="$emit('reassign')"><User /></el-icon>
          </el-tooltip>
        </div>
      </el-card>
    </div>
  </el-badge>
</template>

<script setup>
import { computed } from 'vue'
import { View, ChatDotRound, User } from '@element-plus/icons-vue'

const props = defineProps({
  wo: { type: Object, required: true },
  adTypes: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] }
})

defineEmits(['contextmenu', 'dragstart', 'remark', 'reassign'])

const adTypeLabel = computed(() => {
  const item = props.adTypes.find(t => t.value === props.wo.project_type)
  return item ? item.label : props.wo.project_type || ''
})

const activityLabel = computed(() => {
  const item = props.activities.find(t => t.value === props.wo.activity_name)
  return item ? item.label : props.wo.activity_name || ''
})
</script>

<style scoped>
.kanban-card-wrap { position: relative; margin-bottom: 8px; }
.card-checkbox { position: absolute; top: 8px; left: 8px; z-index: 2; }
.kanban-card { cursor: pointer; border: 1px solid #e5e7eb; transition: box-shadow 0.2s; }
.kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.kanban-card :deep(.el-card__body) { padding: 12px; }
.card-tags { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.card-title { font-size: 14px; font-weight: 500; color: #111827; margin-bottom: 4px; }
.card-progress { margin-bottom: 8px; }
.card-meta { font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; }
.card-actions { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
.card-actions :deep(.el-button) { padding: 0 4px; font-size: 12px; }
.kanban-card-timeout { border-left: 3px solid #f5222d; }
.kanban-card-expiring { border-left: 3px solid #fa8c16; }
.card-quick-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; z-index: 2; }
.kanban-card:hover .card-quick-actions { display: flex; }
.card-quick-actions .el-icon {
  width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  font-size: 14px; color: #6b7280; transition: all 0.2s;
}
.card-quick-actions .el-icon:hover { background: #2563eb; color: #fff; }
:deep(.timeout-dot) { background: #f5222d; }
:deep(.expiring-dot) { background: #fa8c16; }
</style>
