<template>
  <div class="amap-container" :style="{ height }">
    <div v-if="loading" class="amap-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>地图加载中...</span>
    </div>
    <div v-else-if="error" class="amap-error">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-show="!loading && !error" :id="mapId" class="amap-wrapper"></div>
    <div v-if="!loading && !error && hasNoMarkers" class="amap-no-markers-hint">
      <el-icon><Location /></el-icon>
      <span>暂无带坐标的订单</span>
      <span v-if="hasPartialCoords" class="amap-empty-hint">部分订单缺少经纬度，可点击"批量获取坐标"解析</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Loading, WarningFilled, Location } from '@element-plus/icons-vue'
import { configApi } from '@/api'

const props = defineProps({
  markers: { type: Array, default: () => [] },
  center: { type: Object, default: null },
  height: { type: String, default: '300px' },
  zoom: { type: Number, default: 15 },
  activeId: { type: [Number, String], default: null },
  viewMode: { type: String, default: 'marker' }, // marker | cluster | heatmap
  showRoute: { type: Boolean, default: false },
  routePath: { type: Array, default: () => [] },
  routeStops: { type: Array, default: () => [] }
})

const emit = defineEmits(['marker-click'])

const mapId = `amap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
const loading = ref(true)
const error = ref('')
const hasNoMarkers = ref(false)
let map = null
let amapMarkers = []
let cluster = null
let heatmap = null
let infoWindow = null
let routePolyline = null
let mapLoaded = false

const hasPartialCoords = computed(() => props.markers.length > 0 && props.markers.filter(m => m.lat && m.lng).length === 0)

const loadScript = async () => {
  return new Promise(async (resolve, reject) => {
    if (window.AMap) { resolve(); return }

    let securityCode = ''
    let jsKey = ''
    try {
      const [securityRes, jsKeyRes] = await Promise.all([
        configApi.getConfig('amap_security_code'),
        configApi.getConfig('amap_js_key')
      ])
      securityCode = typeof securityRes.data === 'string' ? securityRes.data : (securityRes.data?.value || '')
      jsKey = typeof jsKeyRes.data === 'string' ? jsKeyRes.data : (jsKeyRes.data?.value || '')
    } catch (e) {
      securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE || ''
      jsKey = import.meta.env.VITE_AMAP_JS_KEY || ''
    }

    if (!jsKey) {
      reject(new Error('高德地图 JS API Key 未配置，请在系统设置中配置'))
      return
    }

    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode }
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${jsKey}&plugin=AMap.MarkerCluster,AMap.Heatmap,AMap.Driving`
    script.onload = resolve
    script.onerror = () => reject(new Error('高德地图加载失败'))
    document.head.appendChild(script)
  })
}

/**
 * 创建自定义颜色的标记图标
 */
const createMarkerIcon = (color, label, isTracker) => {
  let svg
  if (isTracker) {
    // 人员标记：圆形+人形
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <circle cx="16" cy="12" r="4" fill="#fff"/>
        <path d="M8 24c0-4 4-7 8-7s8 3 8 7" fill="#fff"/>
      </svg>`
  } else {
    // 订单标记：水滴气泡
    svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
              fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="#fff" fill-opacity="0.3"/>
      </svg>`
  }

  const icon = new window.AMap.Icon({
    size: isTracker ? new window.AMap.Size(32, 32) : new window.AMap.Size(28, 36),
    image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    imageSize: isTracker ? new window.AMap.Size(32, 32) : new window.AMap.Size(28, 36)
  })

  const content = label && !isTracker
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#fff;color:#333;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;line-height:1;">${label}</div>`
    : ''

  return { icon, content }
}

const initMap = async () => {
  loading.value = true
  error.value = ''
  try {
    await loadScript()
    mapLoaded = true

    const validMarkers = props.markers.filter(m => m.lat && m.lng)

    const mapEl = document.getElementById(mapId)
    if (!mapEl) return

    const centerPos = props.center
      ? [props.center.lng, props.center.lat]
      : (validMarkers.length > 0 ? [validMarkers[0].lng, validMarkers[0].lat] : [116.397428, 39.90923])

    map = new window.AMap.Map(mapId, {
      center: centerPos,
      zoom: props.zoom,
      resizeEnable: true
    })

    if (validMarkers.length === 0) {
      hasNoMarkers.value = true
      loading.value = false
      return
    }

    renderMarkers(validMarkers)
    loading.value = false
  } catch (e) {
    error.value = e.message || '地图加载失败'
    loading.value = false
  }
}

const renderMarkers = (markerList) => {
  clearAll()

  if (props.viewMode === 'cluster') {
    renderCluster(markerList)
  } else if (props.viewMode === 'heatmap') {
    renderHeatmap(markerList)
  } else {
    renderNormalMarkers(markerList)
  }
}

/**
 * 普通标记模式
 */
const renderNormalMarkers = (markerList) => {
  amapMarkers = markerList.map(m => {
    const { icon, content } = createMarkerIcon(m.color || '#409eff', m.routeStopIndex)
    const marker = new window.AMap.Marker({
      position: [m.lng, m.lat],
      icon,
      anchor: 'bottom-center',
      extData: m,
      offset: new window.AMap.Pixel(-14, -36)
    })

    if (content) {
      marker.setContent(content)
    }

    marker.on('click', () => {
      emit('marker-click', m)
      openInfoWindow(m)
    })

    if (props.activeId && m.id === props.activeId) {
      marker.setAnimation('AMAP_ANIMATION_BOUNCE')
    }

    map.add(marker)
    return marker
  })

  if (amapMarkers.length > 1) {
    map.setFitView(amapMarkers)
  }
}

/**
 * 聚合标记模式
 */
const renderCluster = (markerList) => {
  const data = markerList.map(m => ({
    lnglat: [m.lng, m.lat],
    extData: m
  }))

  cluster = new window.AMap.MarkerCluster(map, data, {
    gridSize: 60,
    maxZoom: 15,
    renderClusterMarker: renderClusterStyle,
    renderMarker: renderSingleClusterMarker
  })
}

const renderClusterStyle = (context) => {
  const count = context.count
  context.marker.setOffset(new window.AMap.Size(-18, -18))
  context.marker.setContent(`
    <div style="
      width:36px;height:36px;border-radius:50%;
      background:rgba(99,102,241,0.85);
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
    ">${count}</div>
  `)
}

const renderSingleClusterMarker = (context) => {
  const m = context.data.extData
  const { icon } = createMarkerIcon(m.color || '#409eff')
  context.marker.setIcon(icon)
  context.marker.setOffset(new window.AMap.Pixel(-14, -36))
  context.marker.setExtData(m)

  context.marker.on('click', () => {
    emit('marker-click', m)
    openInfoWindow(m)
  })
}

/**
 * 热力图模式
 */
const renderHeatmap = (markerList) => {
  heatmap = new window.AMap.Heatmap(map, {
    radius: 25,
    opacity: [0, 0.8],
    gradient: {
      0.5: '#6366f1',
      0.65: '#409eff',
      0.8: '#e6a23c',
      1.0: '#f56c6c'
    }
  })

  heatmap.setDataSet({
    data: markerList.map(m => ({
      lng: m.lng,
      lat: m.lat,
      count: 1
    })),
    max: 5
  })
}

/**
 * 绘制路线
 */
const renderRoute = () => {
  clearRoute()

  if (!props.showRoute || props.routePath.length < 2) return

  routePolyline = new window.AMap.Polyline({
    path: props.routePath.map(p => new window.AMap.LngLat(p[0], p[1])),
    strokeColor: '#6366f1',
    strokeWeight: 5,
    strokeOpacity: 0.8,
    borderWeight: 1,
    borderColor: '#fff',
    lineJoin: 'round',
    lineCap: 'round'
  })

  map.add(routePolyline)
  map.setFitView([routePolyline])
}

const clearRoute = () => {
  if (routePolyline) {
    map.remove(routePolyline)
    routePolyline = null
  }
}

const openInfoWindow = (m) => {
  if (infoWindow) infoWindow.close()

  const navUrl = `https://uri.amap.com/marker?position=${m.lng},${m.lat}&name=${encodeURIComponent(m.title || m.order_no || '')}&callnative=1`
  const content = `
    <div style="padding:8px 12px;min-width:200px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${m.order_no || '订单'}</div>
      <div style="font-size:12px;color:#666;margin-bottom:4px;">${m.address || ''}</div>
      ${m.handler ? `<div style="font-size:11px;color:#999;margin-bottom:6px;">处理人: ${m.handler.real_name}</div>` : ''}
      <a href="${navUrl}" target="_blank" style="display:inline-block;padding:4px 12px;background:#6366f1;color:#fff;border-radius:4px;font-size:12px;text-decoration:none;">导航</a>
    </div>
  `

  infoWindow = new window.AMap.InfoWindow({
    content,
    offset: new window.AMap.Pixel(0, -30)
  })
  infoWindow.open(map, [m.lng, m.lat])
}

const clearMarkers = () => {
  amapMarkers.forEach(m => map?.remove(m))
  amapMarkers = []
  if (infoWindow) { infoWindow.close(); infoWindow = null }
}

const clearCluster = () => {
  if (cluster) {
    cluster.setMap(null)
    cluster = null
  }
}

const clearHeatmap = () => {
  if (heatmap) {
    heatmap.setMap(null)
    heatmap = null
  }
}

const clearAll = () => {
  clearMarkers()
  clearCluster()
  clearHeatmap()
  clearRoute()
}

// 监听标记数据变化
watch(() => props.markers, () => {
  if (!mapLoaded) return
  const validMarkers = props.markers.filter(m => m.lat && m.lng)
  if (validMarkers.length === 0) { hasNoMarkers.value = true; clearAll(); return }
  hasNoMarkers.value = false
  renderMarkers(validMarkers)
}, { deep: true })

// 监听视图模式变化
watch(() => props.viewMode, () => {
  if (!mapLoaded) return
  const validMarkers = props.markers.filter(m => m.lat && m.lng)
  if (validMarkers.length === 0) return
  renderMarkers(validMarkers)
})

// 监听路线变化
watch(() => props.routePath, () => {
  if (!mapLoaded) return
  renderRoute()
})

// 监听激活标记
watch(() => props.activeId, (newId) => {
  if (!map || !newId) return
  const validMarkers = props.markers.filter(m => m.lat && m.lng)
  const target = validMarkers.find(m => m.id === newId)
  if (target) {
    map.setCenter([target.lng, target.lat])
    openInfoWindow(target)
  }
})

onMounted(() => { initMap() })

onUnmounted(() => {
  if (map) { map.destroy(); map = null }
})

defineExpose({ map })
</script>

<style scoped>
.amap-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f0f2f5;
  position: relative;
}
.amap-wrapper { width: 100%; height: 100%; }
.amap-loading, .amap-error, .amap-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}
.amap-error { color: var(--red); }
.amap-no-markers-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.92);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 10;
  pointer-events: none;
}
.amap-empty-hint { font-size: 11px; color: var(--text-secondary, #909399); }
</style>
