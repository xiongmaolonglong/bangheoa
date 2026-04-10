import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import pinia from './store'
import { useConstantsStore } from './store/constants'

// 深色模式样式必须在 Element Plus 之后加载
import './assets/styles/main.css'

const app = createApp(App)

import {
  Plus, View, Check, Rank, Edit, Location, OfficeBuilding,
  UserFilled, Select, Clock, Aim, Position, Bell, ArrowDown,
  House, Document, CircleCheck, Setting, Checked, DataAnalysis, Tools, User
} from '@element-plus/icons-vue'

const icons = {
  Plus, View, Check, Rank, Edit, Location, OfficeBuilding,
  UserFilled, Select, Clock, Aim, Position, Bell, ArrowDown,
  House, Document, CircleCheck, Setting, Checked, DataAnalysis, Tools, User
}

for (const [key, component] of Object.entries(icons)) {
  app.component(key, component)
}

app.use(ElementPlus, {
  locale: zhCn,
  // 设置全局 z-index，确保弹窗等组件层级正确
  zIndex: 3000
})
app.use(router)
app.use(pinia)

// 加载系统常量
const constantsStore = useConstantsStore()
constantsStore.load()

// 注入侧边栏子菜单样式修复（Element Plus popper 动态样式）
const injectPopperFix = () => {
  // 移除可能存在的旧样式标签
  const oldStyle = document.getElementById('sidebar-popper-dynamic-fix')
  if (oldStyle) oldStyle.remove()

  const style = document.createElement('style')
  style.id = 'sidebar-popper-dynamic-fix'
  style.textContent = `
    /* 保护 select 下拉框等组件不受菜单样式影响 */
    .el-select-dropdown {
      --el-bg-color: #fff !important;
      --el-fill-color-blank: #fff !important;
      background: #fff !important;
    }
    .el-select-dropdown__item {
      color: #303133 !important;
    }
    .el-select-dropdown__item:hover {
      background-color: #f5f7fa !important;
    }

    /* 侧边栏子菜单弹出层样式修复 - 仅针对菜单 popper */
    .el-menu--popup-container,
    .el-menu--popup,
    .el-menu--inline,
    .el-sub-menu .el-menu {
      --el-bg-color: #1e293b !important;
      --el-bg-color-overlay: #1e293b !important;
      --el-fill-color-blank: #1e293b !important;
      --el-menu-bg-color: #1e293b !important;
      --el-menu-text-color: rgba(255, 255, 255, 0.65) !important;
      --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08) !important;
      --el-menu-active-color: #818cf8 !important;
      --el-text-color-primary: rgba(255, 255, 255, 0.9) !important;
      --el-text-color-regular: rgba(255, 255, 255, 0.65) !important;
      background: #1e293b !important;
    }

    .el-menu--popup,
    .el-menu--inline {
      background: #1e293b !important;
      border: none !important;
    }

    .el-menu--popup .el-menu-item,
    .el-menu--inline .el-menu-item,
    .el-sub-menu .el-menu .el-menu-item {
      background-color: transparent !important;
      color: rgba(255, 255, 255, 0.65) !important;
    }

    .el-menu--popup .el-menu-item:hover,
    .el-menu--inline .el-menu-item:hover,
    .el-sub-menu .el-menu .el-menu-item:hover {
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.9) !important;
    }

    .el-menu--popup .el-menu-item.is-active,
    .el-menu--inline .el-menu-item.is-active,
    .el-sub-menu .el-menu .el-menu-item.is-active {
      color: #818cf8 !important;
      background-color: rgba(129, 140, 248, 0.15) !important;
    }
  `
  document.head.appendChild(style)
}

injectPopperFix()

app.mount('#app')
