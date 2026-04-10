<template>
  <el-tag :type="tagType" :effect="effect" :size="size">
    {{ displayText }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/utils/constants'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  statusMap: {
    type: Object,
    default: () => ORDER_STATUS_LABELS
  },
  colorMap: {
    type: Object,
    default: () => ORDER_STATUS_COLORS
  },
  size: {
    type: String,
    default: 'default'
  },
  effect: {
    type: String,
    default: 'light'
  }
})

const displayText = computed(() => props.statusMap[props.status] || props.status)
const tagType = computed(() => props.colorMap[props.status] || 'info')
</script>
