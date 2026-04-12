const DEMO_DETAILS = {
  1: {
    declareNo: 'GG-2026-0001',
    title: '北京CBD户外LED大屏',
    typeLabel: 'LED大屏',
    address: '北京市朝阳区建国路',
    detailAddress: '建国路88号SOHO现代城外立面',
    description: '需要在外立面安装一块约50平米的LED显示屏，用于商业广告展示。要求防水防风，亮度可调。',
    stage: '设计中',
    stageColor: '#409eff',
    currentStageIndex: 5,
    photos: []
  },
  2: {
    declareNo: 'GG-2026-0002',
    title: '上海陆家嘴地铁站灯箱广告',
    typeLabel: '灯箱广告',
    address: '上海市浦东新区陆家嘴',
    detailAddress: '陆家嘴地铁站2号出口通道',
    description: '地铁站通道内灯箱更换，需要6块灯箱，尺寸统一为2m*1m。',
    stage: '测量中',
    stageColor: '#409eff',
    currentStageIndex: 2,
    photos: []
  },
  3: {
    declareNo: 'GG-2026-0003',
    title: '广州天河城商场导视系统',
    typeLabel: '门头招牌',
    address: '广东省广州市天河区',
    detailAddress: '天河路天河城B1-L3层',
    description: '商场内部导视系统更新，含楼层指示、店铺指引、安全出口等标识。',
    stage: '施工中',
    stageColor: '#409eff',
    currentStageIndex: 8,
    photos: []
  },
  4: {
    declareNo: 'GG-2026-0004',
    title: '深圳南山区高速广告牌',
    typeLabel: '户外大牌',
    address: '广东省深圳市南山区',
    detailAddress: '南头高速出口右侧',
    description: '高速出口大型户外广告牌制作安装，钢结构+喷绘画面。',
    stage: '已完工',
    stageColor: '#909399',
    currentStageIndex: 10,
    photos: []
  },
  5: {
    declareNo: 'GG-2026-0005',
    title: '杭州西湖景区指示牌改造',
    typeLabel: '其他',
    address: '浙江省杭州市西湖区',
    detailAddress: '西湖风景名胜区各主要景点入口',
    description: '景区指示牌风格统一改造，采用仿古铜材质，约30块。',
    stage: '待审批',
    stageColor: '#e6a23c',
    currentStageIndex: 0,
    photos: []
  }
}

const STAGES = [
  { label: '申报', key: 'pending' },
  { label: '审批', key: 'approved' },
  { label: '派单', key: 'dispatched' },
  { label: '测量', key: 'measuring' },
  { label: '设计', key: 'designing' },
  { label: '生产', key: 'producing' },
  { label: '施工', key: 'constructing' },
  { label: '验收', key: 'inspecting' },
  { label: '费用', key: 'billing' },
  { label: '归档', key: 'completed' }
]

const DEMO_LOGS = [
  { id: 1, content: '你提交了申报', time: '04-10 09:30' },
  { id: 2, content: '李四审批通过', time: '04-11 14:20' },
  { id: 3, content: '派单给王五（测量员）', time: '04-12 08:45' },
  { id: 4, content: '王五完成现场测量', time: '04-13 16:30' },
  { id: 5, content: '赵六开始设计方案', time: '04-14 10:00' }
]

Page({
  data: {
    detail: {},
    stages: [],
    logs: [],
    photos: []
  },

  onLoad(options) {
    const id = parseInt(options.id) || 1
    const detail = DEMO_DETAILS[id] || DEMO_DETAILS[1]

    const stages = STAGES.map((s, i) => ({
      ...s,
      done: i < detail.currentStageIndex,
      current: i === detail.currentStageIndex
    }))

    const logs = detail.currentStageIndex >= 4
      ? DEMO_LOGS.slice(0, Math.min(detail.currentStageIndex + 1, DEMO_LOGS.length))
      : DEMO_LOGS.slice(0, detail.currentStageIndex + 1)

    this.setData({ detail, stages, logs })
  },

  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.detail.photos[index],
      urls: this.data.detail.photos
    })
  }
})
