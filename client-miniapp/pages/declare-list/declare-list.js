const DEMO_LIST = [
  { id: 1, declareNo: 'GG-2026-0001', title: '北京CBD户外LED大屏', type: 'led_screen', typeLabel: 'LED大屏', stage: '设计中', stageColor: '#409eff', filter: 'active', createdAt: '2026-04-10' },
  { id: 2, declareNo: 'GG-2026-0002', title: '上海陆家嘴地铁站灯箱广告', type: 'lightbox', typeLabel: '灯箱广告', stage: '测量中', stageColor: '#409eff', filter: 'active', createdAt: '2026-04-09' },
  { id: 3, declareNo: 'GG-2026-0003', title: '广州天河城商场导视系统', type: 'storefront', typeLabel: '门头招牌', stage: '施工中', stageColor: '#409eff', filter: 'active', createdAt: '2026-04-08' },
  { id: 4, declareNo: 'GG-2026-0004', title: '深圳南山区高速广告牌', type: 'outdoor_large', typeLabel: '户外大牌', stage: '已完工', stageColor: '#909399', filter: 'done', createdAt: '2026-04-05' },
  { id: 5, declareNo: 'GG-2026-0005', title: '杭州西湖景区指示牌改造', type: 'other', typeLabel: '其他', stage: '待审批', stageColor: '#e6a23c', filter: 'pending', createdAt: '2026-04-07' },
  { id: 6, declareNo: 'GG-2026-0006', title: '成都春熙路商业街灯箱', type: 'lightbox', typeLabel: '灯箱广告', stage: '设计完成', stageColor: '#67c23a', filter: 'active', createdAt: '2026-04-06' },
  { id: 7, declareNo: 'GG-2026-0007', title: '武汉光谷广场LED屏', type: 'led_screen', typeLabel: 'LED大屏', stage: '已驳回', stageColor: '#f56c6c', filter: 'done', createdAt: '2026-04-04' },
  { id: 8, declareNo: 'GG-2026-0008', title: '南京新百商场室内广告', type: 'indoor', typeLabel: '室内广告', stage: '审批通过', stageColor: '#67c23a', filter: 'pending', createdAt: '2026-04-03' }
]

Page({
  data: {
    list: [],
    filteredList: [],
    activeFilter: 'all'
  },

  onLoad() {
    this.setData({ list: DEMO_LIST, filteredList: DEMO_LIST })
  },

  onPullDownRefresh() {
    this.setData({ list: DEMO_LIST })
    this.applyFilter()
    wx.stopPullDownRefresh()
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter })
    this.applyFilter()
  },

  applyFilter() {
    const { list, activeFilter } = this.data
    if (activeFilter === 'all') {
      this.setData({ filteredList: list })
    } else {
      this.setData({ filteredList: list.filter(item => item.filter === activeFilter) })
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/declare-detail/declare-detail?id=${id}` })
  },

  goDeclare() {
    wx.navigateTo({ url: '/pages/declare/declare' })
  }
})
