<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">生产管理</h1>
      <div>
        <el-button type="primary" @click="showMerge = true">+ 合并创建生产任务</el-button>
        <el-button>领料登记</el-button>
      </div>
    </div>
    <el-card class="mb-20">
      <template #header><span class="section-title">待排产材料汇总</span></template>
      <el-table :data="materials" stripe>
        <el-table-column prop="material_type" label="材料" width="100" />
        <el-table-column prop="spec" label="规格" width="80" />
        <el-table-column prop="wo_count" label="工单数" width="80" />
        <el-table-column prop="total_area" label="总面积" width="80" />
        <el-table-column label="操作"><el-button type="primary" size="small">创建生产任务</el-button></el-table-column>
      </el-table>
    </el-card>
    <el-card>
      <template #header><span class="section-title">生产任务列表</span></template>
      <el-table :data="tasks" stripe>
        <el-table-column prop="task_no" label="任务编号" width="130" />
        <el-table-column prop="material_type" label="材料" width="100" />
        <el-table-column prop="wo_count" label="关联工单" width="80" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="操作"><el-button size="small">更新进度</el-button></el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="showMerge" title="合并创建生产任务" width="480px">
      <el-form label-width="80px">
        <el-form-item label="材料"><el-input placeholder="例如：铝塑板" /></el-form-item>
        <el-form-item label="规格"><el-input placeholder="例如：3mm" /></el-form-item>
        <el-form-item label="数量"><el-input type="number" placeholder="总数量" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showMerge = false">取消</el-button><el-button type="primary">确认创建</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const showMerge = ref(false)
const materials = ref([
  { material_type: '铝塑板', spec: '3mm', wo_count: 5, total_area: '28.5㎡' },
  { material_type: '铝塑板', spec: '5mm', wo_count: 2, total_area: '12.0㎡' },
  { material_type: 'LED发光字', spec: '常规', wo_count: 3, total_area: '8.5㎡' }
])
const tasks = ref([
  { task_no: 'PS-2026-01', material_type: '铝塑板 3mm', wo_count: 5, status: '生产中' },
  { task_no: 'PS-2026-02', material_type: 'LED发光字', wo_count: 3, status: '已排产' }
])
</script>
<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-20 { margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 600; }
</style>
