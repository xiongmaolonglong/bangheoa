<template>
  <div class="design-image-upload">
    <!-- 设计图列表 -->
    <div class="design-images">
      <div
        v-for="(img, index) in designImages"
        :key="index"
        class="design-image-item"
      >
        <el-image
          v-if="img.file_url && !img.file_url.startsWith('data:')"
          :src="getPhotoUrl(img.file_url)"
          :preview-src-list="[getPhotoUrl(img.file_url)]"
          fit="cover"
          class="design-img"
        />
        <div v-else-if="img.file_url" class="design-img-uploaded">
          <el-icon><Picture /></el-icon>
          <span>已上传</span>
        </div>
        <div v-else class="design-img-empty">
          <span>暂无</span>
        </div>

        <div class="image-actions">
          <el-button size="small" text @click="triggerUpload(index)">上传</el-button>
          <el-button size="small" text type="danger" v-if="img.file_url" @click="removeImage(index)">删除</el-button>
        </div>
      </div>

      <!-- 添加按钮 -->
      <div class="add-design-image" @click="addImage">
        <el-icon><Plus /></el-icon>
        <span>添加</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Plus, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  faceId: {
    type: [Number, String],
    default: null
  },
  faceName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const designImages = ref([])

// 初始化
watch(() => props.modelValue, (newVal) => {
  if (newVal && Array.isArray(newVal)) {
    designImages.value = newVal.map(img => ({
      file_url: typeof img === 'string' ? img : img.file_url || '',
      file_name: img.file_name || ''
    }))
  }
}, { immediate: true, deep: true })

// 获取图片URL
const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

// 触发上传
const triggerUpload = (index) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.jpg,.jpeg,.png'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file, index)
    }
  }
  input.click()
}

// 处理文件
const handleFile = async (file, index) => {
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    ElMessage.error('只支持 JPG/PNG 格式')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }

  try {
    // 上传到服务器
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    const data = await res.json()

    if (data.code === 0 && data.data?.url) {
      // 找空位或新增
      let targetIndex = index
      if (targetIndex === undefined || targetIndex === -1) {
        targetIndex = designImages.value.findIndex(img => !img.file_url)
        if (targetIndex === -1) {
          designImages.value.push({ file_url: data.data.url, file_name: file.name })
          targetIndex = designImages.value.length - 1
        } else {
          designImages.value[targetIndex] = { file_url: data.data.url, file_name: file.name }
        }
      } else {
        designImages.value[targetIndex] = { file_url: data.data.url, file_name: file.name }
      }
      emit('update:modelValue', [...designImages.value])
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (err) {
    console.error('上传失败:', err)
    ElMessage.error('上传失败')
  }
}

// 添加图片槽位
const addImage = () => {
  // 直接触发文件选择
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.jpg,.jpeg,.png'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file, -1)
    }
  }
  input.click()
}

// 删除图片
const removeImage = (index) => {
  designImages.value.splice(index, 1)
  emit('update:modelValue', [...designImages.value])
}
</script>

<style scoped>
.design-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.design-image-item {
  width: 80px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e4e7ed;
  background: #fff;
}

.design-img {
  width: 100%;
  height: 80px;
  object-fit: cover;
}

.design-img-uploaded,
.design-img-empty {
  width: 100%;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  font-size: 11px;
}

.design-img-uploaded .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  gap: 4px;
}

.image-actions .el-button {
  font-size: 10px;
  padding: 0 4px;
  color: #fff;
}

.add-design-image {
  width: 80px;
  height: 100px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s;
}

.add-design-image:hover {
  border-color: #409eff;
  color: #409eff;
}

.add-design-image .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.add-design-image span {
  font-size: 11px;
}
</style>
