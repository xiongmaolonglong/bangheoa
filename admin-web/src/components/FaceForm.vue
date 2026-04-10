<template>
  <div class="face-form">
    <!-- 图片上传 -->
    <el-form-item label="现场照片">
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
          <span class="upload-text">点击上传</span>
        </div>
      </el-upload>
      <div class="upload-tip">支持 jpg/png 格式，单个文件不超过 10MB，最多上传9张</div>
    </el-form-item>

    <!-- 动态属性表单 -->
    <el-form-item
      v-for="field in fields"
      :key="field.id"
      :label="field.field_name"
      :required="!!field.is_required"
    >
      <div class="field-input">
        <!-- 文本 -->
        <el-input
          v-if="field.field_type === 'text'"
          v-model="attributes[field.field_key]"
          :placeholder="field.placeholder"
          style="width: 300px"
          @change="updateParent"
        />

        <!-- 多行文本 -->
        <el-input
          v-else-if="field.field_type === 'textarea'"
          v-model="attributes[field.field_key]"
          type="textarea"
          :rows="2"
          :placeholder="field.placeholder"
          style="width: 400px"
          @change="updateParent"
        />

        <!-- 数字 -->
        <div v-else-if="field.field_type === 'number'" class="number-input">
          <el-input-number
            v-model="attributes[field.field_key]"
            :placeholder="field.placeholder"
            :precision="2"
            controls-position="right"
            @change="updateParent"
          />
          <span v-if="field.unit" class="unit">{{ field.unit }}</span>
        </div>

        <!-- 下拉选择 -->
        <el-select
          v-else-if="field.field_type === 'select'"
          v-model="attributes[field.field_key]"
          :placeholder="field.placeholder || '请选择'"
          clearable
          style="width: 300px"
          @change="updateParent"
        >
          <el-option v-for="opt in field.options" :key="opt" :label="opt" :value="opt" />
        </el-select>

        <!-- 单选 -->
        <el-radio-group
          v-else-if="field.field_type === 'radio'"
          v-model="attributes[field.field_key]"
          @change="updateParent"
        >
          <el-radio v-for="opt in field.options" :key="opt" :label="opt">{{ opt }}</el-radio>
        </el-radio-group>

        <!-- 复选 -->
        <el-checkbox-group
          v-else-if="field.field_type === 'checkbox'"
          v-model="attributes[field.field_key]"
          @change="updateParent"
        >
          <el-checkbox v-for="opt in field.options" :key="opt" :label="opt">{{ opt }}</el-checkbox>
        </el-checkbox-group>

        <!-- 日期 -->
        <el-date-picker
          v-else-if="field.field_type === 'date'"
          v-model="attributes[field.field_key]"
          type="date"
          :placeholder="field.placeholder"
          value-format="YYYY-MM-DD"
          @change="updateParent"
        />
      </div>
    </el-form-item>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ images: [], attributes: {} })
  },
  fields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 ref 而不是 reactive，避免响应式问题
const images = ref([])
const attributes = ref({})
const fileList = ref([])

// 初始化数据
const initData = () => {
  const newImages = props.modelValue?.images ? [...props.modelValue.images] : []
  const newAttributes = props.modelValue?.attributes ? { ...props.modelValue.attributes } : {}

  // 初始化复选框类型的属性为数组，数字类型转为数字
  props.fields.forEach(field => {
    // 数字类型：确保是数字或 null
    if (field.field_type === 'number') {
      const val = newAttributes[field.field_key]
      if (val !== undefined && val !== null && val !== '') {
        newAttributes[field.field_key] = Number(val)
      } else {
        newAttributes[field.field_key] = null
      }
    }
    // 复选框类型：确保是数组
    if (field.field_type === 'checkbox' && !Array.isArray(newAttributes[field.field_key])) {
      newAttributes[field.field_key] = []
    }
    // 设置默认值
    if (field.default_value && newAttributes[field.field_key] === undefined) {
      if (field.field_type === 'checkbox') {
        newAttributes[field.field_key] = [field.default_value]
      } else if (field.field_type === 'number') {
        newAttributes[field.field_key] = Number(field.default_value) || null
      } else {
        newAttributes[field.field_key] = field.default_value
      }
    }
  })

  images.value = newImages
  attributes.value = newAttributes

  // 初始化文件列表（只在有图片且 fileList 为空时初始化）
  if (newImages.length > 0 && fileList.value.length === 0) {
    fileList.value = newImages.map((url, index) => ({
      name: `image-${index}`,
      url
    }))
  }
}

// 组件挂载时初始化
onMounted(initData)

// 监听 props 变化 - 同步 attributes，并处理数字类型
watch(() => props.modelValue, (newVal) => {
  if (newVal?.attributes) {
    const newAttrs = { ...newVal.attributes }
    // 数字类型转为数字
    props.fields.forEach(field => {
      if (field.field_type === 'number') {
        const val = newAttrs[field.field_key]
        if (val !== undefined && val !== null && val !== '') {
          newAttrs[field.field_key] = Number(val)
        } else {
          newAttrs[field.field_key] = null
        }
      }
    })
    attributes.value = newAttrs
  }
  // 同步 images（用于删除等操作）
  if (newVal?.images) {
    images.value = [...newVal.images]
  }
}, { deep: true })

// 上传配置
const uploadUrl = '/api/v1/upload/image'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

// 更新父组件数据
const updateParent = () => {
  emit('update:modelValue', {
    images: [...images.value],
    attributes: { ...attributes.value }
  })
}

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
  console.log('上传响应:', response)
  let imageUrl = null

  if (response && response.code === 0 && response.data?.url) {
    imageUrl = response.data.url
  } else if (response && response.data?.url) {
    imageUrl = response.data.url
  }

  if (imageUrl) {
    images.value.push(imageUrl)
    // fileList 由 el-upload 自动管理，这里只需要同步 images 数据
    updateParent()
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response?.message || '上传失败，请重试')
    // 从文件列表中移除失败的文件
    const index = uploadFileList.findIndex(f => f.uid === file.uid)
    if (index > -1) {
      uploadFileList.splice(index, 1)
    }
  }
}

// 上传失败
const handleUploadError = (error, file, uploadFileList) => {
  console.error('上传失败:', error)
  ElMessage.error('上传失败，请检查网络或登录状态')
  // 从文件列表中移除失败的文件
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
    updateParent()
  }
}

// 超出限制
const handleExceed = () => {
  ElMessage.warning('最多只能上传9张图片')
}

// upload ref
const uploadRef = ref(null)

// 验证必填字段
const validate = () => {
  const errors = []
  props.fields.forEach(field => {
    if (field.is_required) {
      const value = attributes.value[field.field_key]
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        errors.push(`${field.field_name}为必填项`)
      }
    }
  })
  return {
    valid: errors.length === 0,
    errors
  }
}

// 暴露验证方法给父组件
defineExpose({
  validate
})
</script>

<style scoped>
.face-form { padding: 16px 0; }
.upload-tip { color: #909399; font-size: 12px; margin-top: 8px; }
.field-input { display: flex; align-items: center; }
.number-input { display: flex; align-items: center; }
.number-input .unit { margin-left: 8px; color: var(--text); }

/* 上传触发器样式 */
.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.upload-trigger .el-icon {
  font-size: 28px;
  color: #8c939d;
}
.upload-text {
  font-size: 12px;
  color: #8c939d;
  margin-top: 8px;
}
</style>
