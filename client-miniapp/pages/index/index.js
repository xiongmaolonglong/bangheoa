const auth = require('../../utils/auth')
const { STAGE_MAP, STAGE_COLORS } = require('../../utils/constant')

// Demo data
const DEMO_RECENT = [
  { id: 1, declareNo: 'GG-2026-0001', title: '北京CBD户外LED大屏', stage: '设计中', stageColor: '#409eff', createdAt: '04-10' },
  { id: 2, declareNo: 'GG-2026-0002', title: '上海陆家嘴地铁站灯箱', stage: '测量中', stageColor: '#409eff', createdAt: '04-09' },
  { id: 3, declareNo: 'GG-2026-0003', title: '广州天河城导视系统', stage: '施工中', stageColor: '#409eff', createdAt: '04-08' },
  { id: 4, declareNo: 'GG-2026-0004', title: '深圳南山区高速广告牌', stage: '已完工', stageColor: '#909399', createdAt: '04-05' },
  { id: 5, declareNo: 'GG-2026-0005', title: '杭州西湖景区指示牌改造', stage: '待审批', stageColor: '#e6a23c', createdAt: '04-07' }
]

Page({
  data: {
    userInfo: { name: '用户' },
    today: '',
    totalCount: 12,
    activeCount: 3,
    recentList: []
  },

  onLoad() {
    const user = auth.getUserInfo()
    if (user) {
      this.setData({ userInfo: user })
    }

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    this.setData({ today: todayStr })

    this.loadData()
  },

  onShow() {
    // Refresh when returning to page
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    // Try API first, fall back to demo
    return new Promise((resolve) => {
      this.setData({ recentList: DEMO_RECENT })
      resolve()
    })
  },

  goToDeclare() {
    wx.navigateTo({ url: '/pages/declare/declare' })
  },

  goToDeclareList() {
    wx.navigateTo({ url: '/pages/declare-list/declare-list' })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/declare-detail/declare-detail?id=${id}` })
  }
})
