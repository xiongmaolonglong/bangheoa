<template>
  <div class="error-page">
    <div class="error-content">
      <h1>404</h1>
      <h2>页面不存在</h2>
      <p>抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.error-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--main-bg);
}

.error-content {
  text-align: center;
}

.error-content h1 {
  font-size: 120px;
  font-weight: bold;
  color: var(--sidebar-active-color);
  margin: 0;
}

.error-content h2 {
  font-size: 32px;
  color: var(--text);
  margin: 20px 0;
}

.error-content p {
  font-size: 16px;
  color: #909399;
  margin-bottom: 30px;
}
</style>
