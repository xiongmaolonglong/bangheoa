<template>
  <div class="face-photo-upload">
    <el-upload
      ref="uploadRef"
      v-model:file-list="fileList"
      :action="uploadUrl"
      :headers="uploadHeaders"
      name="file"
      list-type="picture-card"
      :auto-upload="true"
      :show-file-list="true"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :before-upload="beforeUpload"
      accept="image/*"
      multiple
      :limit="9"
    >
      <div class="upload-trigger">
        <el-icon><Plus /></el-icon>
        <span>上传</span>
      </div>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  faceIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])

const fileList = ref([])
const images = ref([])

// 初始化文件列表
watch(() => props.modelValue, (newVal) => {
  if (newVal && Array.isArray(newVal)) {
    images.value = [...newVal]
    if (newVal.length > 0 && fileList.value.length === 0) {
      fileList.value = newVal.map((url, index) => ({
        name: `image-${index}`,
        url
      }))
    }
  }
}, { immediate: true, deep: true })

// 上传配置
const uploadUrl = '/api/v1/upload/image'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

// 上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

// 上传成功
const handleUploadSuccess = (response, file, uploadFileList) => {
  let imageUrl = null

  if (response && response.code === 0 && response.data?.url) {
    imageUrl = response.data.url
  } else if (response && response.data?.url) {
    imageUrl = response.data.url
  }

  if (imageUrl) {
    images.value.push(imageUrl)
    emit('update:modelValue', [...images.value])
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response?.message || '上传失败')
    const index = uploadFileList.findIndex(f => f.uid === file.uid)
    if (index > -1) {
      uploadFileList.splice(index, 1)
    }
  }
}

// 上传失败
const handleUploadError = (error, file, uploadFileList) => {
  ElMessage.error('上传失败')
  const index = uploadFileList.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    uploadFileList.splice(index, 1)
  }
}

// 移除图片
const handleRemove = (file) => {
  const url = file.url || file.response?.data?.url
  const index = images.value.indexOf(url)
  if (index > -1) {
    images.value.splice(index, 1)
    emit('update:modelValue', [...images.value])
  }
}

// 超出限制
const handleExceed = () => {
  ElMessage.warning('最多只能上传9张图片')
}

// 验证
const validate = () => {
  if (images.value.length === 0) {
    return { valid: false, errors: ['请上传现场照片'] }
  }
  return { valid: true, errors: [] }
}

defineExpose({ validate })

const uploadRef = ref(null)
</script>

<style scoped>
.face-photo-upload :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 80px;
  height: 80px;
}

.face-photo-upload :deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.upload-trigger .el-icon {
  font-size: 20px;
  color: #8c939d;
}

.upload-trigger span {
  font-size: 11px;
  color: #8c939d;
  margin-top: 4px;
}
</style>
