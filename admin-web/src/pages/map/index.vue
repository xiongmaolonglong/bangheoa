<template>
  <div class="map-page">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="搜索订单号、客户姓名、地址..."
        @keyup.enter="fetchLocations"
      >

      <!-- 状态筛选 -->
      <div class="filter-chips">
        <span class="chip" :class="{ active: statusFilter === '' }" @click="filterByStatus('')">
          全部 <span class="chip-count">{{ total }}</span>
        </span>
        <span
          v-for="s in statusOptions"
          :key="s.value"
          class="chip"
          :class="{ active: statusFilter === s.value }"
          @click="filterByStatus(s.value)"
        >
          {{ s.label }} <span class="chip-count">{{ s.count }}</span>
        </span>
      </div>

      <!-- 人员筛选 -->
      <el-select
        v-model="handlerFilter"
        placeholder="按处理人筛选"
        clearable
        class="handler-select"
        @change="fetchLocations"
      >
        <el-option
          v-for="h in handlers"
          :key="h.id"
          :label="h.real_name"
          :value="h.id"
        />
      </el-select>

      <!-- 工具按钮 -->
      <div class="tool-btns">
        <el-button type="warning" size="small" :class="{ 'route-active': showTrackers }" @click="toggleTrackers">
          <el-icon><User /></el-icon>
          {{ showTrackers ? '人员' : '人员' }}
          <span v-if="trackers.length" class="online-dot">{{ trackers.filter(t => t.online).length }}</span>
        </el-button>
        <el-button-group>
          <el-button :type="viewMode === 'marker' ? 'primary' : 'default'" size="small" @click="viewMode = 'marker'">
            <el-icon><Location /></el-icon>
          </el-button>
          <el-button :type="viewMode === 'cluster' ? 'primary' : 'default'" size="small" @click="viewMode = 'cluster'">
            <el-icon><Grid /></el-icon>
          </el-button>
          <el-button :type="viewMode === 'heatmap' ? 'primary' : 'default'" size="small" @click="viewMode = 'heatmap'">
            <el-icon><TrendCharts /></el-icon>
          </el-button>
        </el-button-group>
        <el-button type="success" size="small" :class="{ 'route-active': routeMode }" @click="toggleRouteMode">
          <el-icon><Connection /></el-icon>
          {{ routeMode ? '退出路线' : '路线规划' }}
        </el-button>
        <el-button type="primary" :loading="geocoding" @click="handleBatchGeocode">
          批量获取坐标
        </el-button>
      </div>
    </div>

    <!-- 路线模式：选中订单提示 -->
    <div v-if="routeMode && locations.length > 0" class="route-hint">
      点击地图标记或列表项选择途经点，已选 {{ routeStops.length }} 个
      <el-button size="small" type="primary" :disabled="routeStops.length < 2" @click="calculateRoute">
        生成路线
      </el-button>
      <el-button size="small" @click="routeStops = []; routePath = []; routeInfo = null">清空</el-button>
      <span v-if="routeInfo" class="route-info">{{ routeInfo.distance }} / {{ routeInfo.duration }}</span>
    </div>

    <!-- 地图 + 列表 -->
    <div class="map-content">
      <div class="sidebar">
        <div class="sidebar-header">
          <span>{{ showTrackers ? '外勤人员' : '订单列表' }}</span>
          <span class="sidebar-count">
            {{ showTrackers ? trackers.length : markers.length }} / {{ showTrackers ? trackers.length : total }}
          </span>
        </div>
        <div class="sidebar-list" v-loading="loading">
          <!-- 人员列表 -->
          <template v-if="showTrackers">
            <div
              v-for="item in trackers"
              :key="item.user_id"
              class="sidebar-item tracker-item"
              :class="{ active: selectedTracker && selectedTracker.user_id === item.user_id }"
              @click="handleTrackerItemClick(item)"
            >
              <div class="item-top">
                <div class="item-left">
                  <span class="tracker-status-dot" :class="{ online: item.online }"></span>
                  <span class="item-order-no">{{ item.real_name }}</span>
                </div>
                <el-tag size="small" :type="item.online ? 'success' : 'info'" effect="plain">
                  {{ item.online ? '在线' : '离线' }}
                </el-tag>
              </div>
              <div class="item-meta">
                <span>{{ item.role === 'installer' ? '安装员' : '测量员' }}</span>
                <span v-if="item.last_active_min !== null">{{ item.last_active_min }}分钟前</span>
              </div>
              <div v-if="item.current_order" class="item-tracker-order">
                任务: {{ item.current_order.order_no }}
              </div>
              <div class="item-meta" v-if="item.latitude">
                <span v-if="item.accuracy">精度: {{ item.accuracy }}m</span>
                <span v-if="item.speed">速度: {{ item.speed }}km/h</span>
                <span v-if="item.battery !== null">电量: {{ item.battery }}%</span>
              </div>
              <div class="item-meta" v-if="item.today_track_count">
                <span>今日轨迹: {{ item.today_track_count }} 条</span>
              </div>
            </div>
            <el-empty v-if="trackers.length === 0" description="暂无外勤人员" :image-size="60" />
          </template>
          <!-- 订单列表 -->
          <template v-else>
            <div
              v-for="item in markers"
              :key="item.id"
              class="sidebar-item"
              :class="{ active: activeId === item.id, 'route-stop': routeMode && isRouteStop(item.id) }"
              @click="routeMode ? toggleRouteStop(item) : handleItemClick(item)"
            >
              <div class="item-top">
                <div class="item-left">
                  <span v-if="routeMode && isRouteStop(item.id)" class="route-stop-num">{{ getRouteStopIndex(item.id) }}</span>
                  <span class="item-order-no">{{ item.order_no }}</span>
                </div>
                <el-tag size="small" :type="getStatusType(item.status)" effect="plain">
                  {{ getStatusText(item.status) }}
                </el-tag>
              </div>
              <div class="item-address">{{ item.address || '-' }}</div>
              <div class="item-meta">
                <span>{{ item.customer_name }}</span>
                <span v-if="item.handler">{{ item.handler.real_name }}</span>
              </div>
              <!-- 照片预览 -->
              <div v-if="item.photos && item.photos.length > 0" class="item-photos">
                <img
                  v-for="(photo, idx) in item.photos.slice(0, 3)"
                  :key="idx"
                  :src="photo"
                  class="item-photo-thumb"
                  @click.stop="openPhotoPreview(item.photos, idx)"
                >
                <span v-if="item.photos.length > 3" class="item-photo-more">+{{ item.photos.length - 3 }}</span>
              </div>
            </div>
            <el-empty v-if="!loading && markers.length === 0" description="暂无有位置的订单" :image-size="60" />
          </template>
        </div>
      </div>
      <div class="map-wrap">
        <AMap
          ref="mapRef"
          :markers="displayMarkers"
          height="100%"
          :zoom="12"
          :active-id="activeId"
          :view-mode="viewMode"
          :show-route="routeMode && routePath.length > 0"
          :route-path="routePath"
          :route-stops="routeStops"
          @marker-click="handleMarkerClick"
        />
      </div>
    </div>

    <!-- 单张大图预览 -->
    <el-image-viewer
      v-if="singlePhotoVisible"
      :url-list="currentPhotos"
      :initial-index="singlePhotoIndex"
      @close="singlePhotoVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi, locationApi, userApi, locationTrackApi } from '@/api'
import AMap from '@/components/AMap.vue'
import { Location, Grid, TrendCharts, Connection, User } from '@element-plus/icons-vue'

const keyword = ref('')
const statusFilter = ref('')
const handlerFilter = ref('')
const loading = ref(false)
const geocoding = ref(false)
const locations = ref([])
const activeId = ref(null)
const mapRef = ref(null)
const handlers = ref([])
const viewMode = ref('marker') // marker | cluster | heatmap
const routeMode = ref(false)
const routeStops = ref([])
const routePath = ref([])
const routeInfo = ref(null)
const currentPhotos = ref([])
const singlePhotoVisible = ref(false)
const singlePhotoIndex = ref(0)

// 人员追踪
const trackers = ref([])
const showTrackers = ref(false)
const selectedTracker = ref(null)
const trackerMarkers = ref([])
let trackerTimer = null

const statusOptions = [
  { value: 'pending_review', label: '待审核', count: 0 },
  { value: 'measuring', label: '测量中', count: 0 },
  { value: 'measure_review', label: '待审核（测量）', count: 0 },
  { value: 'designing', label: '设计中', count: 0 },
  { value: 'design_review', label: '待审核（设计）', count: 0 },
  { value: 'producing', label: '生产中', count: 0 },
  { value: 'checking', label: '核对中', count: 0 },
  { value: 'installing', label: '待安装', count: 0 },
  { value: 'install_review', label: '待审核（安装）', count: 0 },
  { value: 'archived', label: '已归档', count: 0 }
]

const total = ref(0)

const statusMap = {
  pending_review: '待审核', measuring: '测量中', measure_review: '待审核（测量）',
  designing: '设计中', design_review: '待审核（设计）', producing: '生产中',
  checking: '核对中', installing: '待安装', install_review: '待审核（安装）',
  archived: '已归档', rejected: '已驳回'
}

const statusTypeMap = {
  pending_review: 'info', measuring: 'primary', measure_review: 'warning',
  designing: 'primary', design_review: 'warning', producing: 'primary',
  checking: 'warning', installing: 'primary', install_review: 'warning',
  archived: 'success', rejected: 'danger'
}

// 状态颜色映射（用于地图标记）
const statusColorMap = {
  pending_review: '#909399', measuring: '#409eff', measure_review: '#e6a23c',
  designing: '#6366f1', design_review: '#e6a23c', producing: '#409eff',
  checking: '#e6a23c', installing: '#409eff', install_review: '#e6a23c',
  archived: '#67c23a', rejected: '#f56c6c'
}

const getStatusText = (status) => statusMap[status] || status
const getStatusType = (status) => statusTypeMap[status] || ''
const getStatusColor = (status) => statusColorMap[status] || '#909399'

const markers = computed(() => {
  let list = locations.value.map(o => ({
    id: o.id,
    lng: o.longitude,
    lat: o.latitude,
    order_no: o.order_no,
    title: o.order_no,
    address: o.address,
    status: o.status,
    statusColor: getStatusColor(o.status),
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    handler: o.handler,
    photos: o.photos || [],
    estimated_area: o.estimated_area,
    expected_date: o.expected_date,
    created_at: o.created_at
  }))

  if (handlerFilter.value) {
    list = list.filter(m => m.handler && m.handler.id === handlerFilter.value)
  }

  return list
})

const displayMarkers = computed(() => {
  let list = markers.value.map(m => ({
    ...m,
    color: m.statusColor,
    routeStopIndex: routeMode.value ? getRouteStopIndex(m.id) : null,
    markerType: 'order'
  }))

  // 合并人员标记
  if (showTrackers.value) {
    list = list.concat(trackerMarkers.value)
  }

  return list
})

const fetchLocations = async () => {
  loading.value = true
  try {
    const res = await orderApi.getLocations({
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined
    })
    locations.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await orderApi.getLocations()
    const all = res.data?.list || []
    const counts = {}
    all.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
    statusOptions.forEach(s => { s.count = counts[s.value] || 0 })
  } catch {}
}

const fetchHandlers = async () => {
  try {
    const res = await userApi.getHandlers()
    handlers.value = res.data || []
  } catch {}
}

// --- 人员追踪 ---
const fetchTrackers = async () => {
  try {
    const res = await locationTrackApi.getTrackers({ role: 'installer,measurer' })
    trackers.value = res.data?.trackers || []

    // 转换为地图标记
    trackerMarkers.value = trackers.value
      .filter(t => t.latitude && t.longitude)
      .map(t => ({
        id: `tracker_${t.user_id}`,
        lng: t.longitude,
        lat: t.latitude,
        title: t.real_name,
        order_no: t.real_name,
        markerType: 'tracker',
        trackerData: t,
        color: t.online ? '#10b981' : '#6b7280',
        address: t.current_order ? `正在处理: ${t.current_order.order_no}` : '暂无任务',
        status: t.online ? 'online' : 'offline',
        accuracy: t.accuracy,
        speed: t.speed,
        battery: t.battery,
        lastActiveMin: t.last_active_min
      }))
  } catch (err) {
    console.error('获取追踪列表失败', err)
  }
}

const toggleTrackers = () => {
  showTrackers.value = !showTrackers.value
  if (showTrackers.value) {
    fetchTrackers()
    // 每10秒刷新
    if (!trackerTimer) {
      trackerTimer = setInterval(fetchTrackers, 10000)
    }
  } else {
    if (trackerTimer) {
      clearInterval(trackerTimer)
      trackerTimer = null
    }
    selectedTracker.value = null
  }
}

const handleTrackerClick = (item) => {
  selectedTracker.value = item.trackerData
  if (mapRef.value?.map) {
    mapRef.value.map.setCenter([item.lng, item.lat])
    mapRef.value.map.setZoom(16)
  }
}

const handleTrackerItemClick = (item) => {
  selectedTracker.value = item
  // 在地图上定位
  if (mapRef.value?.map && item.latitude && item.longitude) {
    mapRef.value.map.setCenter([item.longitude, item.latitude])
    mapRef.value.map.setZoom(16)
  }
}

const filterByStatus = (status) => {
  statusFilter.value = status
  fetchLocations()
}

const handleMarkerClick = (item) => {
  if (item.markerType === 'tracker') {
    handleTrackerClick(item)
    return
  }
  if (routeMode.value) {
    toggleRouteStop(item)
  } else {
    activeId.value = item.id
  }
}

const handleItemClick = (item) => {
  if (routeMode.value) {
    toggleRouteStop(item)
  } else {
    activeId.value = item.id
    if (mapRef.value?.map) {
      mapRef.value.map.setCenter([item.lng, item.lat])
      mapRef.value.map.setZoom(16)
    }
  }
}

// --- 路线规划 ---
const toggleRouteMode = () => {
  routeMode.value = !routeMode.value
  if (!routeMode.value) {
    routeStops.value = []
    routePath.value = []
    routeInfo.value = null
  }
}

const toggleRouteStop = (item) => {
  const idx = routeStops.value.findIndex(s => s.id === item.id)
  if (idx >= 0) {
    routeStops.value.splice(idx, 1)
  } else {
    routeStops.value.push(item)
  }
}

const isRouteStop = (id) => {
  return routeStops.value.some(s => s.id === id)
}

const getRouteStopIndex = (id) => {
  const idx = routeStops.value.findIndex(s => s.id === id)
  return idx >= 0 ? idx + 1 : null
}

const calculateRoute = async () => {
  if (routeStops.value.length < 2) {
    ElMessage.warning('至少选择2个途经点')
    return
  }

  const AMap = window.AMap
  if (!AMap || !mapRef.value?.map) {
    ElMessage.error('地图未加载完成')
    return
  }

  const waypoints = routeStops.value.map(s => [s.lng, s.lat])
  const origin = waypoints[0]
  const destination = waypoints[waypoints.length - 1]
  const middle = waypoints.slice(1, -1)

  AMap.plugin('AMap.Driving', () => {
    const driving = new AMap.Driving({
      map: mapRef.value.map,
      panel: null,
      waypoints: middle.length > 0 ? middle.map(([lng, lat]) => new AMap.LngLat(lng, lat)) : undefined,
      hideMarkers: true,
      autoFitView: true
    })

    driving.search(
      new AMap.LngLat(origin[0], origin[1]),
      new AMap.LngLat(destination[0], destination[1]),
      (status, result) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const route = result.routes[0]
          routeInfo.value = {
            distance: (route.distance / 1000).toFixed(1) + 'km',
            duration: Math.ceil(route.time / 60) + '分钟'
          }

          const steps = route.steps || []
          const path = []
          steps.forEach(step => {
            step.path?.forEach(p => path.push([p.lng, p.lat]))
          })
          routePath.value = path
          ElMessage.success(`路线已生成: ${routeInfo.value.distance}，约 ${routeInfo.value.duration}`)
        } else {
          ElMessage.error('路线规划失败')
        }
      }
    )
  })
}

// --- 照片预览 ---
const openPhotoPreview = (photos, index) => {
  currentPhotos.value = photos
  singlePhotoIndex.value = index
  singlePhotoVisible.value = true
}

const handleBatchGeocode = async () => {
  geocoding.value = true
  try {
    const res = await locationApi.batchGeocode()
    const data = res.data || {}
    ElMessage.success(`解析完成：成功 ${data.success || 0} 个，失败 ${data.failed || 0} 个`)
    fetchStats()
    fetchLocations()
  } catch (err) {
    ElMessage.error(err.message || '批量解析失败')
  } finally {
    geocoding.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchLocations()
  fetchHandlers()
})

onUnmounted(() => {
  if (trackerTimer) {
    clearInterval(trackerTimer)
    trackerTimer = null
  }
})
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100vh - 50px - 36px);
}

/* 筛选栏 */
.filter-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.search-input {
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--card-bg);
  outline: none;
  width: 220px;
}
.search-input:focus { border-color: var(--brand-primary); }

.filter-chips { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; min-width: 0; }
.chip {
  padding: 4px 10px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: all 0.15s;
}
.chip:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.chip.active { background: var(--brand-primary); border-color: var(--brand-primary); color: #fff; }
.chip-count { display: inline-block; background: rgba(0,0,0,0.06); padding: 0 4px; border-radius: 99px; font-size: 9px; margin-left: 2px; }
.chip.active .chip-count { background: rgba(255,255,255,0.3); }

.handler-select {
  width: 140px;
}
.handler-select :deep(.el-input__wrapper) {
  border-radius: 99px;
  font-size: 12px;
  box-shadow: none;
  border: 1px solid var(--border);
  padding: 0 12px;
}

.tool-btns { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.route-active { background: var(--brand-primary); border-color: var(--brand-primary); color: #fff; }

/* 路线提示 */
.route-hint {
  background: var(--brand-primary-light, #eef2ff);
  border-radius: var(--radius-md);
  border: 1px solid var(--brand-primary, #6366f1);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-primary);
  flex-shrink: 0;
}
.route-info {
  margin-left: auto;
  font-weight: 600;
  color: var(--brand-primary, #6366f1);
}

/* 地图+列表 */
.map-content {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
}
.map-wrap {
  flex: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f0f2f5;
}
.sidebar {
  width: 300px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}
.sidebar-count { font-size: 11px; color: var(--text-secondary); font-weight: 400; }
.sidebar-list { flex: 1; overflow-y: auto; }

.sidebar-item {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}
.sidebar-item:hover { background: #f8f9fb; }
.sidebar-item.active { background: var(--brand-primary-light, #eef2ff); border-right: 3px solid var(--brand-primary, #6366f1); }
.sidebar-item.route-stop { background: #fef3c7; border-right: 3px solid #f59e0b; }

.item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.item-left { display: flex; align-items: center; gap: 6px; }
.route-stop-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f59e0b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.item-order-no { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; font-weight: 600; color: var(--text-primary); }
.item-address { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { font-size: 11px; color: var(--text-secondary); margin-top: 3px; display: flex; gap: 8px; }

/* 照片缩略图 */
.item-photos {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}
.item-photo-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: transform 0.15s;
}
.item-photo-thumb:hover { transform: scale(1.1); }
.item-photo-more {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-secondary, #f1f5f9);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 人员按钮 */
.online-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 99px;
  background: #10b981;
  color: #fff;
  font-size: 9px;
  text-align: center;
  padding: 0 3px;
}
.tool-btns .el-button { position: relative; }

/* 人员列表 */
.tracker-item { border-left: 3px solid transparent; }
.tracker-item.active { border-left-color: #10b981; }
.tracker-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  flex-shrink: 0;
}
.tracker-status-dot.online {
  background: #10b981;
  box-shadow: 0 0 4px #10b981;
}
.item-tracker-order {
  font-size: 11px;
  color: var(--brand-primary, #6366f1);
  margin-top: 3px;
  font-weight: 500;
}
</style>
