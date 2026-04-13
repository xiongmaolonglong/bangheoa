<template>
  <el-upload
    :action="uploadUrl"
    :headers="uploadHeaders"
    :file-list="fileList"
    :on-success="handleSuccess"
    :on-remove="handleRemove"
    :limit="limit"
    :accept="accept"
    list-type="picture-card"
  >
    <el-icon><Plus /></el-icon>
  </el-upload>
</template>

<script setup>
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  limit: { type: Number, default: 9 },
  accept: { type: String, default: 'image/*' }
})

const emit = defineEmits(['update:modelValue'])

const uploadUrl = computed(() => '/api/v1/files/upload')
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${auth.token}`
}))

const fileList = computed(() =>
  props.modelValue.map((url, i) => ({ name: `file-${i}`, url }))
)

function handleSuccess(res, file) {
  const urls = [...props.modelValue, res.data?.url || res.url]
  emit('update:modelValue', urls)
}

function handleRemove(file) {
  const urls = props.modelValue.filter(u => u !== file.url)
  emit('update:modelValue', urls)
}
</script>
