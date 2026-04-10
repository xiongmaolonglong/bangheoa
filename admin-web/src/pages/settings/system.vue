<template>
  <div class="system-config-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
          <el-button type="primary" :loading="saving" @click="handleSave">
            <el-icon><Check /></el-icon> 保存配置
          </el-button>
        </div>
      </template>

      <div class="config-section">
        <h3>功能开关</h3>
        <div class="toggle-item">
          <div class="toggle-info">
            <span class="toggle-name">定位解析</span>
            <span class="toggle-desc">开启后，新建订单时可粘贴微信定位链接自动解析地址</span>
          </div>
          <el-switch v-model="features.locationParse" :active-value="1" :inactive-value="0" />
        </div>
      </div>

      <el-divider />

      <div class="config-section">
        <h3>高德地图配置</h3>
        <p class="section-desc">配置高德地图 API Key，用于订单地图展示和地址解析。 <a href="https://lbs.amap.com/api/javascript-api/guide/abc/prepare" target="_blank" style="color: var(--brand-primary);">如何获取 Key？</a></p>
        <el-form label-width="140px" style="max-width: 500px;">
          <el-form-item label="JS API Key">
            <el-input v-model="amapConfig.jsKey" placeholder="用于前端地图加载" />
            <div class="form-item-tip">在高德控制台 → 应用管理 → 我的应用 → 添加 Key → 选择「Web端(JS API)」获取 Key</div>
          </el-form-item>
          <el-form-item label="JS API 安全密钥">
            <el-input v-model="amapConfig.securityCode" placeholder="用于前端地图安全校验" show-password />
            <div class="form-item-tip">在高德控制台 → 应用管理 → 设置 → 安全设置 → 获取安全密钥</div>
          </el-form-item>
          <el-form-item label="Web 服务 Key">
            <el-input v-model="amapConfig.webKey" placeholder="用于后端地址解析" show-password />
            <div class="form-item-tip">在高德控制台 → 应用管理 → 我的应用 → 添加 Key → 选择「Web服务」</div>
          </el-form-item>
        </el-form>
      </div>

      <el-divider />

      <div class="config-section">
        <h3>默认材质选项</h3>
        <p class="section-desc">配置快速添加属性时的材质下拉选项</p>
        <div class="materials-tags">
          <el-tag
            v-for="(material, index) in materials"
            :key="index"
            closable
            @close="materials.splice(index, 1)"
          >
            {{ material }}
          </el-tag>
        </div>
        <div class="materials-input">
          <el-input v-model="newMaterial" placeholder="输入新材质" size="small" @keyup.enter="addMaterial" style="width: 150px" />
          <el-button size="small" @click="addMaterial">添加</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { formApi, configApi } from '@/api'

const features = reactive({ locationParse: 0 })
const amapConfig = reactive({
  jsKey: '',
  securityCode: '',
  webKey: ''
})
const materials = ref(['亚克力', '不锈钢', '铝塑板', 'PVC', '喷绘布'])
const newMaterial = ref('')
const saving = ref(false)

const loadConfig = async () => {
  try {
    const res = await configApi.getMaterials()
    if (res.data && Array.isArray(res.data)) materials.value = res.data
  } catch (e) {
    console.log('材质配置加载失败，使用默认值')
  }
  try {
    const res = await formApi.getFeatures()
    if (res.data) features.locationParse = res.data.locationParse ?? 0
  } catch (e) {
    console.log('功能开关配置不存在，使用默认值')
  }
  // 加载高德地图配置
  try {
    const [jsKeyRes, securityRes, webKeyRes] = await Promise.all([
      configApi.getConfig('amap_js_key'),
      configApi.getConfig('amap_security_code'),
      configApi.getConfig('amap_web_key')
    ])
    amapConfig.jsKey = jsKeyRes.data?.value || ''
    amapConfig.securityCode = securityRes.data?.value || ''
    amapConfig.webKey = webKeyRes.data?.value || ''
  } catch (e) {
    console.log('地图配置加载失败')
  }
}

const addMaterial = () => {
  const m = newMaterial.value.trim()
  if (m && !materials.value.includes(m)) {
    materials.value.push(m)
    newMaterial.value = ''
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await formApi.saveFeatures({ locationParse: features.locationParse })
    await configApi.updateMaterials(materials.value)
    // 保存高德地图配置
    await Promise.all([
      configApi.updateConfig('amap_js_key', { value: amapConfig.jsKey, type: 'string', description: '高德地图 JS API Key' }),
      configApi.updateConfig('amap_security_code', { value: amapConfig.securityCode, type: 'string', description: '高德地图 JS API 安全密钥' }),
      configApi.updateConfig('amap_web_key', { value: amapConfig.webKey, type: 'string', description: '高德地图 Web 服务 API Key' })
    ])
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => { loadConfig() })
</script>

<style scoped>
.system-config-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.config-section { margin-bottom: 24px; }
.config-section h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.section-desc { color: var(--text-secondary); font-size: 13px; margin: 0 0 12px; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; }
.toggle-info { display: flex; flex-direction: column; gap: 4px; }
.toggle-name { font-weight: 500; color: var(--text-primary); }
.toggle-desc { font-size: 12px; color: var(--text-secondary); }
.materials-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.materials-input { display: flex; gap: 8px; }
.form-item-tip { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
</style>
