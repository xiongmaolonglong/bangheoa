<template>
  <div class="order-create">
    <!-- 页面头部 -->
    <div class="page-header">
      <span class="page-title">新建订单</span>
      <el-button plain size="small" @click="$router.back()">返回</el-button>
    </div>

    <!-- 基本信息卡片 -->
    <div class="section-card">
      <div class="card-header">
        <span class="card-title">基本信息</span>
      </div>
      <div class="card-body">
        <el-form ref="baseFormRef" label-width="100px">
          <!-- 动态表单字段 -->
          <template v-if="formGroups.length > 0">
            <template v-for="group in formGroups" :key="group.id">
              <div class="form-section-title">{{ group.name || '基本信息' }}</div>
              <div class="form-grid">
                <div v-for="field in group.fields" :key="field.id" class="form-item">
                  <el-form-item
                    :label="field.field_name"
                    :rules="field.is_required ? [{ required: true, message: `请输入${field.field_name}`, trigger: 'blur' }] : []"
                  >
                    <el-input v-if="field.field_type === 'text'" v-model="baseForm[field.field_key]" :placeholder="field.placeholder || `请输入${field.field_name}`" />
                    <el-input v-else-if="field.field_type === 'textarea'" v-model="baseForm[field.field_key]" type="textarea" :rows="3" :placeholder="field.placeholder" />
                    <div v-else-if="field.field_type === 'number'" style="display: flex; align-items: center">
                      <el-input-number v-model="baseForm[field.field_key]" style="width: 200px" />
                      <span v-if="field.options?.unit" style="margin-left: 8px; color: #909399">{{ field.options.unit }}</span>
                    </div>
                    <el-select v-else-if="field.field_type === 'select'" v-model="baseForm[field.field_key]" :placeholder="field.placeholder" style="width: 100%">
                      <el-option v-for="opt in getFieldOptions(field)" :key="opt" :label="opt" :value="opt" />
                    </el-select>
                    <el-radio-group v-else-if="field.field_type === 'radio'" v-model="baseForm[field.field_key]">
                      <el-radio v-for="opt in getFieldOptions(field)" :key="opt" :label="opt">{{ opt }}</el-radio>
                    </el-radio-group>
                    <el-date-picker v-else-if="field.field_type === 'date'" v-model="baseForm[field.field_key]" type="date" :placeholder="field.placeholder" value-format="YYYY-MM-DD" style="width: 100%" />
                    <el-input v-else v-model="baseForm[field.field_key]" :placeholder="field.placeholder" />
                  </el-form-item>
                </div>
              </div>
            </template>
          </template>
        </el-form>
      </div>
    </div>

    <!-- 地区信息卡片 -->
    <div class="section-card">
      <div class="card-header">
        <span class="card-title">地区信息</span>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <el-form-item label="省份" class="form-item">
            <el-select v-model="baseForm.province_id" placeholder="请选择省份" style="width: 100%">
              <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="区域" class="form-item">
            <el-select v-model="baseForm.district_id" placeholder="请选择区域" style="width: 100%" :disabled="!baseForm.province_id">
              <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="小组" class="form-item">
            <el-select v-model="baseForm.group_id" placeholder="请选择小组" style="width: 100%" :disabled="!baseForm.district_id">
              <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>
        </div>
        <div class="address-row">
          <el-form-item label="详细地址" class="form-item-full">
            <el-input v-model="baseForm.address" type="textarea" :rows="2" placeholder="请输入详细地址" />
          </el-form-item>
        </div>
        <div v-if="featuresEnabled.locationParse" class="location-bar">
          <el-input v-model="locationUrl" placeholder="或粘贴微信定位链接" style="width: 320px" @paste="handleLocationPaste" />
          <el-button type="primary" size="small" :loading="locationLoading" @click="parseLocation">解析</el-button>
          <el-tag v-if="parsedLocation" type="success" size="small">
            {{ parsedLocation.lng?.toFixed(4) }}, {{ parsedLocation.lat?.toFixed(4) }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 广告项目卡片 -->
    <div class="section-card">
      <div class="card-header">
        <span class="card-title">广告项目</span>
        <el-button type="primary" size="small" @click="addAdItem">+ 添加广告项目</el-button>
      </div>
      <div class="card-body">
        <div v-if="adItems.length === 0" class="empty-hint">
          <el-empty description="请添加广告项目" :image-size="80" />
        </div>

        <!-- 项目卡片网格 -->
        <div v-else class="ad-items-grid">
          <div v-for="(item, index) in adItems" :key="index" class="ad-item-card">
            <div class="ad-item-header">
              <div class="ad-item-left">
                <span class="ad-item-type">{{ getAdTypeName(item.ad_type_id) || '未选择类型' }}</span>
                <span class="ad-item-count">{{ item.faces?.length || 0 }} 个测量面</span>
              </div>
              <div class="ad-item-actions">
                <el-button text size="small" @click="toggleItemExpand(index)">
                  {{ item.expanded ? '收起' : '展开' }}
                </el-button>
                <el-button text type="danger" size="small" @click="removeAdItem(index)">删除</el-button>
              </div>
            </div>

            <!-- 展开内容 -->
            <div v-show="item.expanded" class="ad-item-body">
              <!-- 选择广告类型 -->
              <div class="ad-type-select">
                <span class="field-label">广告类型</span>
                <el-select v-model="item.ad_type_id" placeholder="选择广告类型" @change="loadAdTypeConfig(index)" style="width: 240px">
                  <el-option v-for="t in adTypes" :key="t.id" :label="t.name" :value="t.id" />
                </el-select>
              </div>

              <!-- 面表单 -->
              <div v-if="item.faces && item.faces.length > 0" class="faces-tabs">
                <el-tabs type="card" v-model="item.activeTab" class="face-tabs">
                  <el-tab-pane
                    v-for="(face, faceIndex) in item.faces"
                    :key="face.face_id || face.face_name || faceIndex"
                    :label="face.face_name"
                    :name="String(faceIndex)"
                  >
                    <FaceForm
                      :ref="el => setFaceFormRef(item, faceIndex, el)"
                      :model-value="item.faces[faceIndex]"
                      :fields="face.fields"
                      @update:model-value="updateFaceData(item, faceIndex, $event)"
                    />
                  </el-tab-pane>
                </el-tabs>
              </div>
              <el-empty v-else-if="item.ad_type_id" description="该广告类型暂无面配置" :image-size="60" />

              <!-- 项目备注 -->
              <div class="item-remark-field">
                <span class="field-label">项目备注</span>
                <el-input v-model="item.remark" type="textarea" :rows="2" placeholder="项目相关备注..." />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 其他信息卡片 -->
    <div class="section-card">
      <div class="card-header">
        <span class="card-title">其他信息</span>
      </div>
      <div class="card-body">
        <el-form-item label="需求说明" class="form-item-full">
          <el-input v-model="baseForm.requirement" type="textarea" :rows="3" placeholder="请输入需求说明" />
        </el-form-item>
        <el-form-item label="期望完成日期" class="form-item">
          <el-date-picker v-model="baseForm.expected_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" />
        </el-form-item>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="submit-bar">
      <el-button type="primary" size="large" :loading="submitLoading" @click="submitOrder">提交订单</el-button>
      <el-button size="large" @click="handleSaveDraft">保存草稿</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi, adTypeApi, formApi, regionApi } from '@/api'
import request from '@/api/request'
import { useUserStore } from '@/store/user'
import FaceForm from '@/components/FaceForm.vue'

const router = useRouter()
const userStore = useUserStore()
const submitLoading = ref(false)

const faceFormRefs = ref({})

const baseFormRef = ref(null)

const setFaceFormRef = (item, faceIndex, el) => {
  const key = `${item.ad_type_id}-${faceIndex}`
  if (el) faceFormRefs.value[key] = el
}

const featuresEnabled = reactive({ locationParse: false })
const locationUrl = ref('')
const locationLoading = ref(false)
const parsedLocation = ref(null)

const baseForm = reactive({
  title: '',
  customer_phone: '',
  element_type: '',
  sales_name: '',
  sales_phone: '',
  province_id: null,
  district_id: null,
  group_id: null,
  address: '',
  requirement: '',
  expected_date: null
})

const provinces = ref([])
const districts = ref([])
const groups = ref([])

const loadProvinces = async () => {
  try {
    const res = await regionApi.getProvinces()
    provinces.value = res.data || []
  } catch (e) { console.error(e) }
}

const loadDistricts = async (provinceId) => {
  if (!provinceId) { districts.value = []; return }
  try {
    const res = await regionApi.getDistricts(provinceId)
    districts.value = res.data || []
  } catch (e) { console.error(e) }
}

const loadGroups = async (districtId) => {
  if (!districtId) { groups.value = []; return }
  try {
    const res = await regionApi.getGroups(districtId)
    groups.value = res.data || []
  } catch (e) { console.error(e) }
}

watch(() => baseForm.province_id, (val) => {
  baseForm.district_id = null; baseForm.group_id = null; loadDistricts(val)
})

watch(() => baseForm.district_id, (val) => {
  baseForm.group_id = null; loadGroups(val)
})

const formGroups = ref([])
const loadFormConfig = async () => {
  try {
    const res = await formApi.getConfig()
    formGroups.value = res.data || []
  } catch (e) { console.error(e) }
}

const adTypes = ref([])
const adTypeConfigs = ref({})

const loadAdTypes = async () => {
  try {
    const res = await adTypeApi.getList({ pageSize: 100 })
    adTypes.value = res.data?.list || res.data || []
  } catch (e) { console.error(e) }
}

const getAdTypeName = (id) => adTypes.value.find(t => t.id === id)?.name || ''

const getFieldOptions = (field) => {
  if (!field.options) return []
  if (typeof field.options === 'object' && field.options.choices) return field.options.choices
  if (Array.isArray(field.options)) return field.options
  if (typeof field.options === 'string') return field.options.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

const adItems = ref([])

const addAdItem = () => {
  adItems.value.push({
    ad_type_id: null, faces: [], remark: '', activeTab: '0', expanded: true
  })
}

const removeAdItem = (index) => adItems.value.splice(index, 1)

const toggleItemExpand = (index) => {
  adItems.value[index].expanded = !adItems.value[index].expanded
}

const updateFaceData = (item, faceIndex, data) => {
  if (item.faces && item.faces[faceIndex]) {
    item.faces[faceIndex] = { ...item.faces[faceIndex], images: data.images || [], attributes: data.attributes || {} }
  }
}

const loadAdTypeConfig = async (index) => {
  const item = adItems.value[index]
  if (!item.ad_type_id) { item.faces = []; item.activeTab = '0'; return }
  if (adTypeConfigs.value[item.ad_type_id]) {
    const config = adTypeConfigs.value[item.ad_type_id]
    item.faces = config.faces.map(f => ({ face_id: f.face_id, face_name: f.face_name, fields: f.template?.fields || [], images: [], attributes: {} }))
    item.activeTab = '0'; return
  }
  try {
    const res = await adTypeApi.getConfig(item.ad_type_id)
    const config = res.data
    adTypeConfigs.value[item.ad_type_id] = config
    item.faces = (config.faces || []).map(f => ({ face_id: f.face_id, face_name: f.face_name, fields: f.template?.fields || [], images: [], attributes: {} }))
    item.activeTab = '0'
  } catch (e) { console.error(e); item.faces = []; item.activeTab = '0' }
}

const handleLocationPaste = (e) => {
  setTimeout(() => { if (locationUrl.value) parseLocation() }, 100)
}

const parseLocation = async () => {
  if (!locationUrl.value) return ElMessage.warning('请先粘贴定位链接')
  locationLoading.value = true
  try {
    const coords = extractCoordinates(locationUrl.value)
    if (!coords) return ElMessage.error('无法解析定位链接')
    if (coords.address) {
      parsedLocation.value = coords; baseForm.address = coords.address
      return ElMessage.success('地址解析成功')
    }
    const res = await request.get('/location/reverse', { params: { lng: coords.lng, lat: coords.lat } })
    if (res.data?.address) {
      parsedLocation.value = { ...coords, address: res.data.address }
      baseForm.address = res.data.address
      ElMessage.success('地址解析成功')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('解析定位失败')
  } finally { locationLoading.value = false }
}

const extractCoordinates = (url) => {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('qq.com')) {
      const pointx = urlObj.searchParams.get('pointx'), pointy = urlObj.searchParams.get('pointy')
      const addr = urlObj.searchParams.get('addr') || urlObj.searchParams.get('name')
      if (pointx && pointy) {
        const lng = parseFloat(pointx), lat = parseFloat(pointy)
        if (lng && lat) return { lng, lat, address: addr ? decodeURIComponent(addr) : undefined }
      }
    }
    if (urlObj.hostname.includes('amap.com')) {
      const position = urlObj.searchParams.get('position') || urlObj.searchParams.get('to') || urlObj.searchParams.get('center')
      if (position) { const [lng, lat] = position.split(',').map(Number); if (lng && lat) return { lng, lat } }
    }
    if (urlObj.hostname.includes('google.com')) {
      const q = urlObj.searchParams.get('q')
      if (q) { const [lat, lng] = q.split(',').map(Number); if (lng && lat) return { lng, lat } }
    }
    return null
  } catch (e) { return null }
}

const handleSaveDraft = () => {
  localStorage.setItem('order_draft', JSON.stringify({ baseForm, adItems: adItems.value }))
  ElMessage.success('草稿已保存')
}

const getFormData = () => {
  const data = {}
  formGroups.value.forEach(group => {
    group.fields?.forEach(field => { data[field.field_key] = baseForm[field.field_key] })
  })
  return data
}

const submitOrder = async () => {
  if (!baseForm.province_id || !baseForm.district_id || !baseForm.group_id)
    return ElMessage.error('请选择完整的地区信息')
  if (adItems.value.length === 0) return ElMessage.error('请至少添加一个广告项目')

  const allErrors = []
  for (const item of adItems.value) {
    for (let fi = 0; fi < (item.faces?.length || 0); fi++) {
      const key = `${item.ad_type_id}-${fi}`
      const formRef = faceFormRefs.value[key]
      if (formRef?.validate) {
        const result = formRef.validate()
        if (!result.valid) allErrors.push(...result.errors.map(e => `${item.faces[fi].face_name}: ${e}`))
      }
    }
  }
  if (allErrors.length > 0) return ElMessage.error(allErrors[0])

  submitLoading.value = true
  try {
    const data = {
      customer_name: baseForm.title,
      customer_phone: baseForm.customer_phone,
      title: baseForm.title,
      group_id: baseForm.group_id,
      address: baseForm.address,
      requirement: baseForm.requirement,
      expected_date: baseForm.expected_date,
      form_data: getFormData(),
      ad_items: adItems.value.map(item => ({
        ad_type_id: item.ad_type_id, remark: item.remark,
        faces: item.faces.map(f => ({ face_id: f.face_id, face_name: f.face_name, images: f.images || [], attributes: f.attributes || {} }))
      }))
    }
    const res = await orderApi.create(data)
    ElMessage.success('订单创建成功')
    localStorage.removeItem('order_draft')
    router.push(`/orders/${res.data.id}`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '创建失败')
  } finally { submitLoading.value = false }
}

onMounted(async () => {
  loadAdTypes(); loadFormConfig(); loadProvinces()
  try {
    const featuresRes = await formApi.getFeatures()
    if (featuresRes.data) featuresEnabled.locationParse = featuresRes.data.locationParse === 1
  } catch (e) {}
  if (userStore.user?.group_id) {
    baseForm.province_id = userStore.user.province_id
    if (userStore.user.province_id) {
      await loadDistricts(userStore.user.province_id)
      baseForm.district_id = userStore.user.district_id
    }
    if (userStore.user.district_id) {
      await loadGroups(userStore.user.district_id)
      baseForm.group_id = userStore.user.group_id
    }
  }
  const draft = localStorage.getItem('order_draft')
  if (draft) {
    try {
      const d = JSON.parse(draft)
      Object.assign(baseForm, d.baseForm); adItems.value = (d.adItems || []).map(i => ({ ...i, expanded: true }))
      if (baseForm.province_id) await loadDistricts(baseForm.province_id)
      if (baseForm.district_id) await loadGroups(baseForm.district_id)
      for (let i = 0; i < adItems.value.length; i++) {
        if (adItems.value[i].ad_type_id) await loadAdTypeConfig(i)
      }
    } catch (e) { console.error(e) }
  }
})
</script>

<style scoped>
.order-create {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* 区块卡片 */
.section-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafbfc;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.card-body {
  padding: 20px;
}

/* 表单 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

.form-item {
  margin-bottom: 0;
}

.form-item-full {
  grid-column: 1 / -1;
  margin-bottom: 0;
}

.form-item :deep(.el-form-item__label) {
  font-size: 13px;
  color: #595959;
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid #1a1a2e;
}

.form-section-title:first-child {
  margin-top: 0;
}

/* 地址行 */
.address-row {
  margin-top: 16px;
}

.location-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

/* 广告项目网格 */
.ad-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.ad-item-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.ad-item-card:hover {
  border-color: #c0c4cc;
}

.ad-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafbfc;
  border-bottom: 1px solid #e8e8e8;
}

.ad-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ad-item-type {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.ad-item-count {
  font-size: 12px;
  color: #8c8c8c;
}

.ad-item-actions {
  display: flex;
  gap: 4px;
}

.ad-item-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ad-type-select {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  color: #595959;
  flex-shrink: 0;
  min-width: 68px;
}

.faces-tabs {
  margin: 0 -16px;
  padding: 0 16px;
}

.face-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.face-tabs :deep(.el-tabs__item) {
  font-size: 13px;
}

.item-remark-field {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

/* 空提示 */
.empty-hint {
  padding: 40px 0;
}

/* 底部操作栏 */
.submit-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
}
</style>
