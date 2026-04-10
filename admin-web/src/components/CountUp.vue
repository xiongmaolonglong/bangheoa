<template>
  <span class="count-up">{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  endVal: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 1500
  },
  decimals: {
    type: Number,
    default: 0
  },
  separator: {
    type: String,
    default: ','
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  }
})

const displayValue = ref('0')
let animationFrame = null

const formatNumber = (num) => {
  const fixedNum = num.toFixed(props.decimals)
  const parts = fixedNum.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, props.separator)
  return props.prefix + parts.join('.') + props.suffix
}

const easeOutQuad = (t) => t * (2 - t)

const animate = (startVal, endVal, duration) => {
  const startTime = performance.now()

  const step = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeOutQuad(progress)
    const currentVal = startVal + (endVal - startVal) * easedProgress

    displayValue.value = formatNumber(currentVal)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    }
  }

  animationFrame = requestAnimationFrame(step)
}

watch(() => props.endVal, (newVal, oldVal) => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  const startVal = parseFloat(displayValue.value.replace(/[^\d.-]/g, '')) || 0
  animate(startVal, newVal, props.duration)
})

onMounted(() => {
  animate(0, props.endVal, props.duration)
})
</script>

<style scoped>
.count-up {
  font-variant-numeric: tabular-nums;
}
</style>