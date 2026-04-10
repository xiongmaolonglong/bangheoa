<template>
  <div class="mini-chart" ref="chartRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: '#667eea'
  },
  height: {
    type: Number,
    default: 40
  }
})

const chartRef = ref(null)
let chart = null

const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)

  const option = {
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    },
    xAxis: {
      show: false,
      type: 'category',
      data: props.data.map((_, i) => i)
    },
    yAxis: {
      show: false,
      type: 'value'
    },
    series: [{
      type: 'line',
      data: props.data,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: 2,
        color: props.color
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: props.color + '40' },
          { offset: 1, color: props.color + '00' }
        ])
      }
    }]
  }

  chart.setOption(option)
}

const resize = () => {
  chart?.resize()
}

watch(() => props.data, () => {
  if (chart) {
    chart.setOption({
      series: [{ data: props.data }]
    })
  }
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>

<style scoped>
.mini-chart {
  width: 100%;
  height: v-bind('height + "px"');
}
</style>