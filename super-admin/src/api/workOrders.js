import api from './index'

/**
 * 获取工单列表（跨租户平台级搜索）
 * 后端API未就绪时使用本地 demo 数据降级
 */
export async function fetchWorkOrders(params = {}) {
  try {
    const data = await api.get('/work-orders', { params })
    return data
  } catch {
    return {
      code: 0,
      message: 'ok',
      data: {
        list: getDemoList(),
        total: 6
      }
    }
  }
}

/**
 * 获取工单详情
 */
export async function fetchWorkOrderDetail(id) {
  try {
    const data = await api.get(`/work-orders/${id}`)
    return data
  } catch {
    return {
      code: 0,
      message: 'ok',
      data: getDemoDetail(id)
    }
  }
}

function getDemoList() {
  return [
    {
      id: 1,
      tenant_name: '盛世广告有限公司',
      order_no: 'WO-2026-0001',
      project_name: '北京CBD户外LED大屏',
      client_name: '北京华贸置业有限公司',
      current_stage: '设计审核',
      status: '进行中',
      created_at: '2026-04-10 09:30:00'
    },
    {
      id: 2,
      tenant_name: '创意视觉工作室',
      order_no: 'WO-2026-0002',
      project_name: '上海陆家嘴地铁站灯箱广告',
      client_name: '上海申通地铁广告有限公司',
      current_stage: '现场测量',
      status: '已派',
      created_at: '2026-04-09 14:20:00'
    },
    {
      id: 3,
      tenant_name: '盛世广告有限公司',
      order_no: 'WO-2026-0003',
      project_name: '广州天河城商场导视系统',
      client_name: '广州天河城百货有限公司',
      current_stage: '施工阶段',
      status: '进行中',
      created_at: '2026-04-08 11:00:00'
    },
    {
      id: 4,
      tenant_name: '亮点传媒集团',
      order_no: 'WO-2026-0004',
      project_name: '深圳南山区高速广告牌',
      client_name: '深圳市高速公路广告有限公司',
      current_stage: '已完工',
      status: '已完成',
      created_at: '2026-04-05 16:45:00'
    },
    {
      id: 5,
      tenant_name: '创意视觉工作室',
      order_no: 'WO-2026-0005',
      project_name: '杭州西湖景区指示牌改造',
      client_name: '杭州西湖风景名胜区管委会',
      current_stage: '方案确认',
      status: '已驳回',
      created_at: '2026-04-07 08:15:00'
    },
    {
      id: 6,
      tenant_name: '亮点传媒集团',
      order_no: 'WO-2026-0006',
      project_name: '成都春熙路商圈灯箱投放',
      client_name: '成都锦江区商业管理公司',
      current_stage: '待分配',
      status: '待处理',
      created_at: '2026-04-11 10:30:00'
    }
  ]
}

function getDemoDetail(id) {
  const details = {
    1: {
      id: 1,
      tenant_name: '盛世广告有限公司',
      order_no: 'WO-2026-0001',
      project_name: '北京CBD户外LED大屏',
      client_name: '北京华贸置业有限公司',
      status: '进行中',
      created_at: '2026-04-10 09:30:00',
      updated_at: '2026-04-12 15:20:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-10 09:30', operator: '张经理' },
        { name: '方案确认', status: 'done', time: '2026-04-10 14:00', operator: '李设计师' },
        { name: '现场测量', status: 'done', time: '2026-04-11 10:00', operator: '王测量员' },
        { name: '设计审核', status: 'active', time: '', operator: '' },
        { name: '制作安装', status: 'pending', time: '', operator: '' },
        { name: '验收交付', status: 'pending', time: '', operator: '' }
      ],
      measurement: {
        width: 12.5,
        height: 6.8,
        area: 85,
        unit: 'm',
        location: '北京CBD核心区华贸中心东侧外墙',
        measured_by: '王测量员',
        measured_at: '2026-04-11 10:00',
        notes: '墙面平整，无遮挡，具备安装条件'
      },
      attachments: ['现场照片.jpg', '测量草图.pdf']
    },
    2: {
      id: 2,
      tenant_name: '创意视觉工作室',
      order_no: 'WO-2026-0002',
      project_name: '上海陆家嘴地铁站灯箱广告',
      client_name: '上海申通地铁广告有限公司',
      status: '已派',
      created_at: '2026-04-09 14:20:00',
      updated_at: '2026-04-10 09:00:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-09 14:20', operator: '赵经理' },
        { name: '方案确认', status: 'done', time: '2026-04-09 17:30', operator: '刘设计师' },
        { name: '现场测量', status: 'active', time: '', operator: '' },
        { name: '设计审核', status: 'pending', time: '', operator: '' },
        { name: '制作安装', status: 'pending', time: '', operator: '' },
        { name: '验收交付', status: 'pending', time: '', operator: '' }
      ],
      measurement: {
        width: 3.2,
        height: 2.4,
        area: 7.68,
        unit: 'm',
        location: '上海地铁2号线陆家嘴站12号口通道',
        measured_by: '待分配',
        measured_at: '',
        notes: '需夜间施工，地铁方要求凌晨1-4点作业'
      },
      attachments: ['位置示意图.png']
    },
    3: {
      id: 3,
      tenant_name: '盛世广告有限公司',
      order_no: 'WO-2026-0003',
      project_name: '广州天河城商场导视系统',
      client_name: '广州天河城百货有限公司',
      status: '进行中',
      created_at: '2026-04-08 11:00:00',
      updated_at: '2026-04-12 08:30:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-08 11:00', operator: '孙经理' },
        { name: '方案确认', status: 'done', time: '2026-04-08 16:00', operator: '陈设计师' },
        { name: '现场测量', status: 'done', time: '2026-04-09 09:30', operator: '周测量员' },
        { name: '设计审核', status: 'done', time: '2026-04-10 14:00', operator: '陈设计师' },
        { name: '施工阶段', status: 'active', time: '', operator: '' },
        { name: '验收交付', status: 'pending', time: '', operator: '' }
      ],
      measurement: {
        width: null,
        height: null,
        area: null,
        unit: 'm',
        location: '广州天河城B1-B5层共36个导视点',
        measured_by: '周测量员',
        measured_at: '2026-04-09 09:30',
        notes: '多层商场，各层点位尺寸详见测量表'
      },
      attachments: ['测量汇总表.xlsx', '各层平面图.pdf']
    },
    4: {
      id: 4,
      tenant_name: '亮点传媒集团',
      order_no: 'WO-2026-0004',
      project_name: '深圳南山区高速广告牌',
      client_name: '深圳市高速公路广告有限公司',
      status: '已完成',
      created_at: '2026-04-05 16:45:00',
      updated_at: '2026-04-11 17:00:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-05 16:45', operator: '吴经理' },
        { name: '方案确认', status: 'done', time: '2026-04-06 10:00', operator: '郑设计师' },
        { name: '现场测量', status: 'done', time: '2026-04-06 15:00', operator: '冯测量员' },
        { name: '设计审核', status: 'done', time: '2026-04-07 11:00', operator: '郑设计师' },
        { name: '制作安装', status: 'done', time: '2026-04-10 18:00', operator: '施工队A' },
        { name: '验收交付', status: 'done', time: '2026-04-11 17:00', operator: '吴经理' }
      ],
      measurement: {
        width: 18.0,
        height: 8.0,
        area: 144,
        unit: 'm',
        location: '南坪快速南山段K12+300右侧',
        measured_by: '冯测量员',
        measured_at: '2026-04-06 15:00',
        notes: '已完工，验收合格'
      },
      attachments: ['完工照片.jpg', '验收报告.pdf']
    },
    5: {
      id: 5,
      tenant_name: '创意视觉工作室',
      order_no: 'WO-2026-0005',
      project_name: '杭州西湖景区指示牌改造',
      client_name: '杭州西湖风景名胜区管委会',
      status: '已驳回',
      created_at: '2026-04-07 08:15:00',
      updated_at: '2026-04-08 14:00:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-07 08:15', operator: '钱经理' },
        { name: '方案确认', status: 'rejected', time: '2026-04-08 14:00', operator: '审核组' },
        { name: '现场测量', status: 'pending', time: '', operator: '' },
        { name: '设计审核', status: 'pending', time: '', operator: '' },
        { name: '制作安装', status: 'pending', time: '', operator: '' },
        { name: '验收交付', status: 'pending', time: '', operator: '' }
      ],
      measurement: null,
      attachments: [],
      reject_reason: '方案与景区整体风格不符，需重新设计'
    },
    6: {
      id: 6,
      tenant_name: '亮点传媒集团',
      order_no: 'WO-2026-0006',
      project_name: '成都春熙路商圈灯箱投放',
      client_name: '成都锦江区商业管理公司',
      status: '待处理',
      created_at: '2026-04-11 10:30:00',
      updated_at: '2026-04-11 10:30:00',
      stages: [
        { name: '需求提交', status: 'done', time: '2026-04-11 10:30', operator: '何经理' },
        { name: '方案确认', status: 'pending', time: '', operator: '' },
        { name: '现场测量', status: 'pending', time: '', operator: '' },
        { name: '设计审核', status: 'pending', time: '', operator: '' },
        { name: '制作安装', status: 'pending', time: '', operator: '' },
        { name: '验收交付', status: 'pending', time: '', operator: '' }
      ],
      measurement: null,
      attachments: []
    }
  }
  return details[id] || details[1]
}
