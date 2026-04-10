<template>
  <div class="tab-bar" @click="hideContextMenu">
    <div class="tab-bar-scroll">
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: tab.path === tabsStore.activeTab }"
        @click="router.push(tab.path)"
        @contextmenu.prevent="showContextMenu($event, tab)"
      >
        <span class="tab-title">{{ tab.title }}</span>
        <el-icon v-if="tab.closable" class="tab-close" @click.stop="tabsStore.removeTab(tab.path)">
          <Close />
        </el-icon>
      </div>
    </div>

    <div v-if="ctx.visible" class="context-menu" :style="ctx.style">
      <div class="context-menu-item" @click="tabsStore.closeOthers(ctx.tab.path); ctx.visible = false">关闭其他</div>
      <div class="context-menu-item" @click="tabsStore.closeRight(ctx.tab.path); ctx.visible = false">关闭右侧</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" @click="tabsStore.closeAll(); ctx.visible = false">关闭全部</div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useTabsStore } from '@/store/tabs'
import { Close } from '@element-plus/icons-vue'

const router = useRouter()
const tabsStore = useTabsStore()

const ctx = reactive({ visible: false, style: {}, tab: null })

const showContextMenu = (e, tab) => {
  ctx.visible = true
  ctx.tab = tab
  ctx.style = { left: e.clientX + 'px', top: e.clientY + 'px' }
}

const hideContextMenu = () => {
  ctx.visible = false
}
</script>

<style scoped>
.tab-bar {
  height: 36px;
  display: flex;
  align-items: center;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  position: relative;
}

.tab-bar-scroll {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
}

.tab-bar-scroll::-webkit-scrollbar { display: none; }

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  transition: all 0.15s;
  height: 28px;
}

.tab-item:hover { color: #1890ff; background: #e6f7ff; }

.tab-item.active {
  color: #1890ff;
  background: #fff;
  border-color: #e8e8e8;
  border-bottom-color: #fff;
  font-weight: 500;
}

.tab-title { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

.tab-close {
  font-size: 12px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}

.tab-item:hover .tab-close { opacity: 0.6; }
.tab-close:hover { opacity: 1 !important; background: #ff4d4f; color: #fff; }

.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
  z-index: 2000;
}

.context-menu-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: all 0.15s;
}

.context-menu-item:hover { background: #f5f5f5; color: #1890ff; }
.context-menu-item.danger:hover { color: #ff4d4f; background: #fff2f0; }
.context-menu-divider { height: 1px; background: #e8e8e8; margin: 4px 0; }
</style>
