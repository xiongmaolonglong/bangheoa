import { defineStore } from 'pinia'
import router from '@/router'

const HOME_TAB = { path: '/dashboard', title: '首页', closable: false }

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [HOME_TAB],
    activeTab: HOME_TAB.path
  }),

  actions: {
    addTab(tab) {
      if (!tab.path || tab.path === '/login') return
      const exists = this.tabs.find(t => t.path === tab.path)
      if (!exists) {
        this.tabs.push({ ...tab, closable: tab.closable !== false })
      }
      this.activeTab = tab.path
    },

    removeTab(path) {
      const index = this.tabs.findIndex(t => t.path === path)
      if (index === -1) return
      if (!this.tabs[index].closable) return

      this.tabs.splice(index, 1)
      if (this.activeTab === path) {
        const next = this.tabs[index] || this.tabs[index - 1]
        if (next) {
          this.activeTab = next.path
          router.push(next.path)
        }
      }
    },

    closeOthers(path) {
      this.tabs = this.tabs.filter(t => t.path === path || !t.closable)
      if (this.activeTab !== path) {
        this.activeTab = path
        router.push(path)
      }
    },

    closeRight(path) {
      const index = this.tabs.findIndex(t => t.path === path)
      this.tabs = this.tabs.filter((t, i) => i <= index || !t.closable)
      if (!this.tabs.find(t => t.path === this.activeTab)) {
        this.activeTab = path
        router.push(path)
      }
    },

    closeAll() {
      this.tabs = this.tabs.filter(t => !t.closable)
      this.activeTab = HOME_TAB.path
      router.push(HOME_TAB.path)
    }
  }
})
