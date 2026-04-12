const PROJECT_TYPES = [
  { label: '门头招牌', value: 'storefront' },
  { label: '灯箱广告', value: 'lightbox' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '户外大牌', value: 'outdoor_large' },
  { label: '室内广告', value: 'indoor' },
  { label: '其他', value: 'other' }
]

const STAGE_MAP = {
  'pending': '待审批',
  'approved': '审批通过',
  'rejected': '已驳回',
  'measuring': '测量中',
  'measured': '测量完成',
  'designing': '设计中',
  'designed': '设计完成',
  'producing': '生产中',
  'produced': '生产完成',
  'constructing': '施工中',
  'constructed': '施工完成',
  'completed': '已完工'
}

const STAGE_COLORS = {
  'pending': '#e6a23c',
  'approved': '#67c23a',
  'rejected': '#f56c6c',
  'measuring': '#409eff',
  'measured': '#67c23a',
  'designing': '#409eff',
  'designed': '#67c23a',
  'producing': '#409eff',
  'produced': '#67c23a',
  'constructing': '#409eff',
  'constructed': '#67c23a',
  'completed': '#909399'
}

const STAGE_ORDER = [
  'pending', 'approved', 'measuring', 'measured',
  'designing', 'designed', 'producing', 'produced',
  'constructing', 'constructed', 'completed'
]

module.exports = {
  PROJECT_TYPES,
  STAGE_MAP,
  STAGE_COLORS,
  STAGE_ORDER
}
