<template>
  <div class="order-edit" v-loading="loading">
    <div class="page-wrapper">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="top-bar-left">
          <button class="back-btn" @click="$router.back()">
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <div>
            <div class="order-header">
              <span class="order-no">{{ currentOrder?.order_no }}</span>
              <span class="edit-badge">编辑中</span>
            </div>
            <div class="breadcrumb" v-if="currentOrder?.group?.district?.province">
              {{ currentOrder.group.district.province.name }} · {{ currentOrder.group.district.name }} · {{ currentOrder.group.name }}
            </div>
          </div>
        </div>
        <div class="top-bar-actions">
          <el-button size="small" @click="$router.back()">取消</el-button>
          <el-button type="primary" size="small" :loading="submitLoading" @click="submitOrder">保存修改</el-button>
        </div>
      </div>

      <!-- Basic Info Card -->
      <div class="form-card">
        <div class="form-card-header">
          <el-icon><Document /></el-icon>
          基本信息
        </div>
        <div class="form-card-body">
          <div class="section-title">客户信息</div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">客户名称 <span class="required">*</span></label>
              <el-input v-model="baseForm.customer_name" placeholder="请输入客户名称" />
            </div>
            <div class="form-group">
              <label class="form-label">联系电话 <span class="required">*</span></label>
              <el-input v-model="baseForm.customer_phone" placeholder="请输入联系电话" />
            </div>
          </div>

          <div class="section-title">地区信息</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">省份</label>
              <el-select v-model="baseForm.province_id" placeholder="请选择省份" style="width: 100%">
                <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </div>
            <div class="form-group">
              <label class="form-label">区域</label>
              <el-select v-model="baseForm.district_id" placeholder="请选择区域" style="width: 100%" :disabled="!baseForm.province_id">
                <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </div>
            <div class="form-group">
              <label class="form-label">小组</label>
              <el-select v-model="baseForm.group_id" placeholder="请选择小组" style="width: 100%" :disabled="!baseForm.district_id">
                <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
              </el-select>
            </div>
          </div>

          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">详细地址</label>
              <el-input v-model="baseForm.address" type="textarea" :rows="2" placeholder="请输入详细地址" />
            </div>
          </div>

          <div class="section-title">其他信息</div>
          <div class="form-row single">
            <div class="form-group">
              <label class="form-label">需求说明</label>
              <el-input v-model="baseForm.requirement" type="textarea" :rows="3" placeholder="请输入需求说明" />
            </div>
          </div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">期望完成日期</label>
              <el-date-picker v-model="baseForm.expected_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
            </div>
          </div>
        </div>
      </div>

      <!-- Ad Projects Card -->
      <div class="form-card">
        <div class="form-card-header">
          <el-icon><List /></el-icon>
          广告项目
        </div>
        <div class="form-card-body">
          <el-empty v-if="adItems.length === 0" description="请添加广告项目" />

          <template v-for="(item, index) in adItems" :key="index">
            <div class="ad-project">
              <div class="ad-project-top">
                <div class="ad-project-left">
                  <span class="project-index">{{ index + 1 }}</span>
                  <el-select v-model="item.ad_type_id" placeholder="选择广告类型" @change="loadAdTypeConfig(index)" style="width: 200px">
                    <el-option v-for="t in adTypes" :key="t.id" :label="t.name" :value="t.id" />
                  </el-select>
                </div>
                <el-button type="danger" size="small" text @click="removeAdItem(index)">删除</el-button>
              </div>

              <!-- Face Tabs -->
              <div class="face-tabs" v-if="item.faces && item.faces.length > 0">
                <span
                  v-for="(face, faceIndex) in item.faces"
                  :key="faceIndex"
                  class="face-tab"
                  :class="{ active: String(faceIndex) === item.activeTab }"
                  @click="item.activeTab = String(faceIndex)"
                >
                  {{ face.face_name }}
                  <span class="face-tab-close" @click.stop="removeFace(item, faceIndex)" v-if="item.faces.length > 1">×</span>
                </span>
              </div>

              <!-- Face Content -->
              <div class="face-content" v-if="item.faces && item.faces.length > 0">
                <!-- Active Face -->
                <template v-for="(face, faceIndex) in item.faces" :key="faceIndex">
                  <div v-show="String(faceIndex) === item.activeTab">
                    <div class="face-info-bar">
                      <span class="face-size" v-if="face.attributes?.width && face.attributes?.height">
                        {{ face.attributes.width }} × {{ face.attributes.height }} cm
                      </span>
                      <div class="face-dims">
                        <div class="face-dim-group">
                          <label>宽</label>
                          <el-input-number v-model="face.attributes.width" :precision="2" :min="0" size="small" style="width: 100px" />
                          <span class="unit">cm</span>
                        </div>
                        <div class="face-dim-group">
                          <label>高</label>
                          <el-input-number v-model="face.attributes.height" :precision="2" :min="0" size="small" style="width: 100px" />
                          <span class="unit">cm</span>
                        </div>
                        <div class="face-dim-group">
                          <label>备注</label>
                          <el-input v-model="face.attributes.remark" size="small" style="width: 140px" placeholder="备注" />
                        </div>
                      </div>
                    </div>

                    <div class="face-compare">
                      <!-- Measurement Photos -->
                      <div class="compare-section">
                        <div class="compare-label">
                          <el-icon><Camera /></el-icon>
                          现场照片
                        </div>
                        <FacePhotoUpload
                          :ref="el => setFaceFormRef(item, faceIndex, el)"
                          v-model="item.faces[faceIndex].images"
                          :face-index="faceIndex"
                        />
                      </div>
                      <!-- Design Photos -->
                      <div class="compare-section">
                        <div class="compare-label">
                          <el-icon><Picture /></el-icon>
                          设计图
                        </div>
                        <DesignImageUpload
                          v-model="item.faces[faceIndex].designImages"
                          :face-id="face.face_id"
                          :face-name="face.face_name"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <el-empty v-else-if="item.ad_type_id" description="该广告类型暂无面配置" :image-size="60" />

              <div class="project-remark">
                <el-input v-model="item.remark" type="textarea" :rows="2" placeholder="项目相关备注..." />
              </div>
            </div>
          </template>

          <button class="add-btn" @click="addAdItem" v-if="adItems.length > 0">
            <el-icon><Plus /></el-icon>
            添加广告项目
          </button>
          <button class="add-btn" @click="addAdItem" v-else style="margin-top: 16px;">
            <el-icon><Plus /></el-icon>
            添加广告项目
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Picture, Camera, ArrowLeft, Document, List } from '@element-plus/icons-vue'
import { orderApi, adTypeApi, formApi, regionApi } from '@/api'
import FacePhotoUpload from '@/components/FacePhotoUpload.vue'
import DesignImageUpload from '@/components/DesignImageUpload.vue'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)

const currentOrder = ref(null)
const faceFormRefs = ref({})

const baseFormRef = ref(null)
const baseForm = reactive({
  customer_name: '',
  customer_phone: '',
  title: '',
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
  } catch (e) { console.error('加载省份失败', e) }
}

const loadDistricts = async (provinceId) => {
  if (!provinceId) { districts.value = []; return }
  try {
    const res = await regionApi.getDistricts(provinceId)
    districts.value = res.data || []
  } catch (e) { console.error('加载区域失败', e) }
}

const loadGroups = async (districtId) => {
  if (!districtId) { groups.value = []; return }
  try {
    const res = await regionApi.getGroups(districtId)
    groups.value = res.data || []
  } catch (e) { console.error('加载小组失败', e) }
}

watch(() => baseForm.province_id, (val) => {
  if (val && !baseForm.district_id) {
    baseForm.district_id = null
    baseForm.group_id = null
    loadDistricts(val)
  }
})

watch(() => baseForm.district_id, (val) => {
  if (val && !baseForm.group_id) {
    baseForm.group_id = null
    loadGroups(val)
  }
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

const adItems = ref([])

const addAdItem = () => {
  adItems.value.push({ ad_type_id: null, faces: [], remark: '', activeTab: '0' })
}

const removeAdItem = (index) => { adItems.value.splice(index, 1) }

const setFaceFormRef = (item, faceIndex, el) => {
  const key = `${item.ad_type_id}-${faceIndex}`
  if (el) faceFormRefs.value[key] = el
}

const loadAdTypeConfig = async (index) => {
  const item = adItems.value[index]
  if (!item.ad_type_id) { item.faces = []; item.activeTab = '0'; return }
  if (adTypeConfigs.value[item.ad_type_id]) {
    const config = adTypeConfigs.value[item.ad_type_id]
    item.faces = config.faces.map(f => ({
      face_id: f.face_id,
      face_name: f.face_name,
      fields: f.template?.fields || [],
      images: [],
      designImages: [],
      attributes: {}
    }))
    item.activeTab = '0'
    return
  }
  try {
    const res = await adTypeApi.getConfig(item.ad_type_id)
    const config = res.data
    adTypeConfigs.value[item.ad_type_id] = config
    item.faces = (config.faces || []).map(f => ({
      face_id: f.face_id,
      face_name: f.face_name,
      fields: f.template?.fields || [],
      images: [],
      designImages: [],
      attributes: {}
    }))
    item.activeTab = '0'
  } catch (e) { console.error(e); item.faces = []; item.activeTab = '0' }
}

const addFace = (item) => {
  if (!item.faces) item.faces = []
  const newIndex = item.faces.length
  item.faces.push({
    face_id: null,
    face_name: `面${newIndex + 1}`,
    fields: [],
    images: [],
    designImages: [],
    attributes: {},
    is_custom: true
  })
  item.activeTab = String(newIndex)
}

const removeFace = (item, faceIndex) => {
  if (item.faces.length <= 1) return ElMessage.warning('至少保留一个面')
  item.faces.splice(faceIndex, 1)
  if (parseInt(item.activeTab) >= item.faces.length) {
    item.activeTab = String(item.faces.length - 1)
  }
}

const getFieldProp = (field) => field.is_required ? field.field_key : ''
const getFieldOptions = (field) => {
  if (!field.options) return []
  if (typeof field.options === 'object' && field.options.choices) return field.options.choices
  if (Array.isArray(field.options)) return field.options
  if (typeof field.options === 'string') return field.options.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

const getFormData = () => {
  const data = {}
  formGroups.value.forEach(group => { group.fields?.forEach(field => { data[field.field_key] = baseForm[field.field_key] }) })
  return data
}

const loadOrder = async () => {
  const orderId = route.params.id
  loading.value = true
  try {
    const res = await orderApi.getDetail(orderId)
    const order = res.data
    currentOrder.value = order

    const role = userStore.user?.role
    if (role === 'designer' && order.current_handler_id !== userStore.user?.id) {
      ElMessage.error('您只能编辑自己负责的订单')
      router.push('/orders')
      return
    }

    baseForm.title = order.title || ''
    baseForm.address = order.address || ''
    baseForm.requirement = order.requirement || ''
    baseForm.expected_date = order.expected_date || null
    baseForm.customer_name = order.customer?.real_name || order.form_data?.customer_name || ''
    baseForm.customer_phone = order.customer?.phone || order.form_data?.customer_phone || ''

    if (order.form_data) Object.assign(baseForm, order.form_data)

    if (order.group) {
      const group = order.group
      const district = group.district
      if (district) {
        baseForm.province_id = district.province_id
        await loadDistricts(district.province_id)
        baseForm.district_id = district.id
        await loadGroups(district.id)
        baseForm.group_id = group.id
      }
    }

    if (order.adItems && order.adItems.length > 0) {
      adItems.value = []
      for (const adItem of order.adItems) {
        const item = { ad_type_id: adItem.ad_type_id, remark: adItem.remark || '', faces: [], activeTab: '0' }
        if (adItem.ad_type_id) {
          try {
            const configRes = await adTypeApi.getConfig(adItem.ad_type_id)
            const config = configRes.data
            adTypeConfigs.value[adItem.ad_type_id] = config
            const existingFaces = adItem.faces || []
            item.faces = (config.faces || []).map(configFace => {
              const existingFace = existingFaces.find(f => f.face_name === configFace.face_name)
              const fields = configFace.template?.fields || []
              const attributes = {}
              fields.forEach(field => {
                if (existingFace) {
                  if (field.field_key === 'width') attributes.width = existingFace.width
                  else if (field.field_key === 'height') attributes.height = existingFace.height
                  else if (field.field_key === 'remark') attributes.remark = existingFace.remark
                  else if (field.field_key === 'material_id') attributes.material_id = existingFace.material_id
                  else attributes[field.field_key] = existingFace[field.field_key] || existingFace.attributes?.[field.field_key]
                }
              })
              return { face_id: configFace.face_id, face_name: configFace.face_name, fields, images: existingFace?.photos || [], designImages: existingFace?.designImages || [], attributes }
            })
          } catch (e) { console.error('加载广告类型配置失败', e) }
        }
        adItems.value.push(item)
      }
    }
  } catch (e) { console.error('加载订单失败', e); ElMessage.error('加载订单数据失败') }
  finally { loading.value = false }
}

const submitOrder = async () => {
  if (!baseForm.group_id) { ElMessage.error('请选择完整的地区信息'); return }
  if (adItems.value.length === 0) { ElMessage.error('请至少添加一个广告项目'); return }

  const allErrors = []
  for (const item of adItems.value) {
    if (item.faces && item.faces.length > 0) {
      for (let faceIndex = 0; faceIndex < item.faces.length; faceIndex++) {
        const key = `${item.ad_type_id}-${faceIndex}`
        const formRef = faceFormRefs.value[key]
        if (formRef && typeof formRef.validate === 'function') {
          const result = formRef.validate()
          if (!result.valid) allErrors.push(...result.errors.map(e => `${item.faces[faceIndex].face_name}: ${e}`))
        }
      }
    }
  }
  if (allErrors.length > 0) { ElMessage.error(allErrors[0]); return }

  submitLoading.value = true
  try {
    const orderId = route.params.id
    const data = {
      customer_name: baseForm.customer_name,
      customer_phone: baseForm.customer_phone,
      title: baseForm.title,
      group_id: baseForm.group_id,
      address: baseForm.address,
      requirement: baseForm.requirement,
      expected_date: baseForm.expected_date,
      form_data: getFormData(),
      ad_items: adItems.value.map(item => ({
        ad_type_id: item.ad_type_id,
        remark: item.remark,
        faces: item.faces.map(f => ({ face_id: f.face_id, face_name: f.face_name, images: f.images || [], designImages: f.designImages || [], attributes: f.attributes || {} }))
      }))
    }
    await orderApi.update(orderId, data)
    ElMessage.success('订单修改成功')
    router.push(`/orders/${orderId}`)
  } catch (e) { console.error('修改订单失败:', e); ElMessage.error(e.response?.data?.message || e.message || '修改失败') }
  finally { submitLoading.value = false }
}

onMounted(async () => {
  await loadAdTypes()
  await loadFormConfig()
  await loadProvinces()
  await loadOrder()
})
</script>

<style scoped>
.order-edit {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
}

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--card-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  margin-bottom: 16px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-secondary);
  font-size: 18px;
  flex-shrink: 0;
}

.back-btn:hover { background: var(--bg-tertiary); border-color: var(--brand-primary); color: var(--brand-primary); }

.order-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}

.order-no {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-primary);
}

.edit-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
  background: #fef3c7;
  color: #d97706;
}

.edit-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d97706;
}

.breadcrumb {
  font-size: 13px;
  color: var(--text-tertiary);
}

.top-bar-actions { display: flex; gap: 8px; }

.top-bar-actions .el-button { border-radius: var(--radius-sm); }

/* Form Cards */
.form-card {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  margin-bottom: 16px;
  overflow: hidden;
}

.form-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.form-card-header .el-icon {
  color: var(--brand-primary);
  font-size: 18px;
}

.form-card-body {
  padding: 20px 24px;
}

/* Section titles */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}

.section-title + .section-title {
  margin-top: 24px;
}

/* Form rows */
.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-row.two-col {
  grid-template-columns: repeat(2, 1fr);
}

.form-row.single {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-label .required {
  color: #ef4444;
  margin-left: 2px;
}

/* Ad Project */
.ad-project {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 16px;
}

.ad-project:last-child { margin-bottom: 0; }

.ad-project-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.ad-project-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-index {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--brand-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

/* Face Tabs */
.face-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.face-tab {
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.face-tab:hover { border-color: var(--brand-primary); }

.face-tab.active {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}

.face-tab-close {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
}

.face-tab-close:hover { opacity: 0.7; }

.face-tab.active .face-tab-close { background: rgba(255,255,255,0.2); }

/* Face Content */
.face-content {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--card-bg);
}

.face-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 12px;
}

.face-size {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-primary);
  font-family: 'SF Mono', Monaco, monospace;
}

.face-dims {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.face-dim-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.face-dim-group label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.face-dim-group .unit {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Photo Compare */
.face-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.compare-section {
  padding: 16px;
}

.compare-section + .compare-section {
  border-left: 1px solid var(--border);
  background: var(--bg-tertiary);
}

.compare-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.compare-label .el-icon { font-size: 14px; }

/* Project Remark */
.project-remark {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.project-remark .el-textarea__inner {
  background: var(--card-bg);
}

/* Add Button */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 16px;
}

.add-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: var(--brand-primary-light);
}

.add-btn .el-icon { font-size: 16px; }

/* Responsive */
@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .face-compare { grid-template-columns: 1fr; }
  .face-dims { flex-wrap: wrap; }
  .page-wrapper { padding: 12px; }
}
</style>
