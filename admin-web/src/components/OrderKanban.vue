<template>
  <div class="order-kanban">
    <div class="kanban-container">
      <div
        v-for="column in columns"
        :key="column.status"
        class="kanban-column"
      >
        <div class="column-header" :class="column.type">
          <span class="column-title">{{ column.title }}</span>
          <el-badge :value="column.orders.length" type="primary" />
        </div>

        <div class="column-body">
          <draggable
            :list="column.orders"
            group="orders"
            item-key="id"
            :animation="200"
            ghost-class="ghost-card"
            @change="(evt) => handleDragChange(evt, column.status)"
            class="draggable-area"
          >
            <template #item="{ element }">
              <div class="kanban-card" @click="viewOrder(element)">
                <div class="card-header">
                  <span class="order-no">{{ element.order_no }}</span>
                </div>
                <div class="card-body">
                  <div class="info-row">{{ element.form_data?.company || element.title || '-' }}</div>
                  <div class="info-row sub">{{ element.customer?.real_name || '-' }}</div>
                </div>
                <div class="card-footer">
                  <span class="time">{{ formatDate(element.created_at) }}</span>
                  <span class="handler">{{ element.handler?.real_name || '未指派' }}</span>
                </div>
              </div>
            </template>
          </draggable>

          <el-empty v-if="column.orders.length === 0" description="暂无" :image-size="50" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import { orderApi } from '@/api'
import dayjs from 'dayjs'
import { getStatusText, getStatusType } from '@/utils/constants'

const router = useRouter()

const props = defineProps({
  orders: { type: Array, default: () => [] }
})

const emit = defineEmits(['refresh'])

const columnsConfig = [
  { status: 'pending_review', title: '待审核', type: 'warning' },
  { status: 'designing', title: '设计中', type: 'purple' },
  { status: 'producing', title: '生产中', type: 'success' },
  { status: 'installing', title: '安装中', type: 'primary' },
  { status: 'archived', title: '已完成', type: 'default' }
]

const columns = ref(columnsConfig.map(col => ({ ...col, orders: [] })))

const initKanbanData = () => {
  columns.value.forEach(col => {
    col.orders = props.orders.filter(o => o.status === col.status)
  })
}

watch(() => props.orders, initKanbanData, { immediate: true, deep: true })

const handleDragChange = async (evt, newStatus) => {
  if (evt.added) {
    const order = evt.added.element
    try {
      await orderApi.advance(order.id, { status: newStatus })
      ElMessage.success(`已移至「${getStatusText(newStatus)}」`)
      emit('refresh')
    } catch (err) {
      ElMessage.error(err.response?.data?.message || '状态更新失败')
      initKanbanData()
    }
  }
}

const viewOrder = (order) => router.push(`/orders/${order.id}`)

const formatDate = (date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
</script>

<style scoped>
.order-kanban {
  height: calc(100vh - 280px);
  overflow: hidden;
}

.kanban-container {
  display: flex;
  gap: 16px;
  height: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-column {
  flex: 0 0 260px;
  min-width: 260px;
  background: var(--card-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color, rgba(255,255,255,0.1));
}

.column-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px 10px 0 0;
}

.column-header.warning { background: linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.1) 100%); }
.column-header.info { background: linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.1) 100%); }
.column-header.purple { background: linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.1) 100%); }
.column-header.success { background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%); }
.column-header.primary { background: linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(79,70,229,0.1) 100%); }
.column-header.default { background: rgba(100,116,139,0.1); }

.column-title {
  font-weight: 600;
  font-size: 14px;
}

.column-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.draggable-area {
  min-height: 60px;
}

.kanban-card {
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.kanban-card:hover {
  border-color: var(--brand-primary);
  transform: translateY(-2px);
}

.ghost-card {
  opacity: 0.5;
  background: rgba(79,70,229,0.1);
}

.order-no {
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  font-size: 13px;
  color: var(--brand-primary);
}

.card-body {
  margin: 8px 0;
}

.info-row {
  font-size: 13px;
  line-height: 1.4;
}

.info-row.sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
</style>
