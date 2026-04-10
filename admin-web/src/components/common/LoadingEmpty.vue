<template>
  <el-empty v-if="!loading && isEmpty" :description="emptyText" :image-size="imageSize">
    <slot name="empty-action" />
  </el-empty>
  <div v-else-if="loading" class="loading-container" :style="{ height: loadingHeight }">
    <el-icon class="is-loading" :size="32">
      <Loading />
    </el-icon>
    <p>{{ loadingText }}</p>
  </div>
  <slot v-else />
</template>

<script setup>
import { Loading } from '@element-plus/icons-vue'
import { isEmpty as checkEmpty } from '@/utils'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '加载中...'
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  imageSize: {
    type: Number,
    default: 120
  },
  loadingHeight: {
    type: String,
    default: '200px'
  }
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}

.loading-container .el-icon {
  margin-bottom: 8px;
}
</style>
