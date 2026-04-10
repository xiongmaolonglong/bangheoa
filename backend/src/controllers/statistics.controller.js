const { Order, User, MeasureFace, OrderAdItem, sequelize } = require('../models')
const response = require('../utils/response')
const { Op } = require('sequelize')
const { Sequelize } = require('sequelize')

/**
 * 统计控制器
 */
const statisticsController = {
  /**
   * 订单统计
   */
  getOrderStats: async (req, res) => {
    try {
      const { startDate, endDate } = req.query

      const where = {}
      if (startDate && endDate) {
        where.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }

      // 总订单数
      const total = await Order.count({ where })

      // 进行中订单数
      const inProgress = await Order.count({
        where: {
          ...where,
          status: {
            [Op.in]: ['pending_review', 'designing', 'design_review', 'producing', 'checking', 'installing', 'install_review']
          }
        }
      })

      // 已完成订单数
      const completed = await Order.count({
        where: { ...where, status: 'archived' }
      })

      // 总面积
      const areaResult = await MeasureFace.findOne({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('area')), 'totalArea']],
        include: [{
          model: OrderAdItem,
          as: 'adItem',
          attributes: [],
          include: [{
            model: Order,
            as: 'order',
            attributes: [],
            where: where.status ? { status: where.status } : {}
          }]
        }],
        raw: true
      })

      const totalArea = areaResult?.totalArea || 0

      // 状态分布
      const statusDistribution = await Order.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where,
        group: ['status'],
        raw: true
      })

      return response.success(res, {
        total,
        inProgress,
        completed,
        totalArea: parseFloat(totalArea) || 0,
        statusDistribution
      })
    } catch (error) {
      console.error('订单统计错误:', error)
      return response.serverError(res, '获取订单统计失败')
    }
  },

  /**
   * 人员绩效
   */
  getPerformance: async (req, res) => {
    try {
      const { startDate, endDate, role } = req.query

      const dateWhere = {}
      if (startDate && endDate) {
        dateWhere.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }

      // 构建用户筛选条件
      const userWhere = { status: 1 }
      if (role) {
        userWhere.role = role
      }

      // 一次聚合查询获取所有用户绩效数据（替代 N+1 循环）
      const orderWhere = { status: 'archived', ...dateWhere }
      const [completedStats, durationStats] = await Promise.all([
        Order.findAll({
          attributes: [
            'current_handler_id',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'completed_count']
          ],
          where: orderWhere,
          group: ['current_handler_id'],
          raw: true
        }),
        Order.findAll({
          attributes: [
            'current_handler_id',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'order_count'],
            [Sequelize.fn('AVG', Sequelize.literal('TIMESTAMPDIFF(DAY, created_at, updated_at)')), 'avg_duration']
          ],
          where: orderWhere,
          group: ['current_handler_id'],
          raw: true
        })
      ])

      // 单独查询面积数据，避免嵌套 include 的列引用问题
      const areaStats = await sequelize.query(`
        SELECT o.current_handler_id as handler_id, SUM(mf.area) as totalArea
        FROM measure_faces mf
        INNER JOIN order_ad_items oai ON mf.order_ad_item_id = oai.id
        INNER JOIN orders o ON oai.order_id = o.id
        WHERE o.status = 'archived'
        GROUP BY o.current_handler_id
      `, { type: sequelize.QueryTypes.SELECT })

      const completedMap = Object.fromEntries(completedStats.map(s => [s.current_handler_id, parseInt(s.completed_count)]))
      const areaMap = Object.fromEntries(areaStats.map(s => [s.handler_id, parseFloat(s.totalArea) || 0]))
      const durationMap = Object.fromEntries(durationStats.map(s => [s.current_handler_id, parseFloat(s.avg_duration?.toFixed(1)) || 0]))

      const users = await User.findAll({
        where: userWhere,
        attributes: ['id', 'real_name', 'role'],
        raw: true
      })

      const performanceData = users.map(user => {
        const completedCount = completedMap[user.id] || 0
        const totalArea = areaMap[user.id] || 0
        const avgDuration = durationMap[user.id] || 0

        let rating = 3
        if (completedCount > 30 && avgDuration < 3) rating = 5
        else if (completedCount > 20 || avgDuration < 4) rating = 4
        else if (completedCount < 5 || avgDuration > 7) rating = 2

        return {
          id: user.id,
          real_name: user.real_name,
          role: user.role,
          completed_count: completedCount,
          total_area: totalArea,
          avg_duration: avgDuration,
          rating
        }
      })

      // 按完成数排序
      performanceData.sort((a, b) => b.completed_count - a.completed_count)

      return response.success(res, performanceData)
    } catch (error) {
      console.error('人员绩效错误:', error)
      return response.serverError(res, '获取人员绩效失败')
    }
  },

  /**
   * 区域分布统计
   */
  getRegionStats: async (req, res) => {
    try {
      const { startDate, endDate } = req.query

      const where = {}
      if (startDate && endDate) {
        where.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }

      // 按小组统计（一次聚合查询替代循环）
      const { Province, District, Group } = require('../models')

      const [groupOrderStats, allGroups] = await Promise.all([
        Order.findAll({
          attributes: [
            'group_id',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'order_count']
          ],
          where,
          group: ['group_id'],
          raw: true
        }),
        Group.findAll({
          attributes: ['id', 'name', 'code'],
          include: [{
            model: District,
            as: 'district',
            attributes: ['id', 'name', 'code'],
            include: [{
              model: Province,
              as: 'province',
              attributes: ['id', 'name', 'code']
            }]
          }]
        })
      ])

      const countMap = Object.fromEntries(groupOrderStats.map(s => [s.group_id, parseInt(s.order_count)]))

      const regionData = allGroups
        .filter(g => (countMap[g.id] || 0) > 0)
        .map(group => ({
          group_id: group.id,
          group_name: group.name,
          district_name: group.district?.name,
          province_name: group.district?.province?.name,
          order_count: countMap[group.id]
        }))

      return response.success(res, regionData)
    } catch (error) {
      console.error('区域统计错误:', error)
      return response.serverError(res, '获取区域统计失败')
    }
  },

  /**
   * 收入分析
   */
  getRevenueStats: async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query

      const where = {}
      if (startDate && endDate) {
        where.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }

      // 使用单次聚合查询获取所有数据（优化 N+1 问题）
      const orderStats = await Order.findAll({
        where: { ...where, status: 'archived' },
        attributes: [
          [Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m'), 'month'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'order_count']
        ],
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('created_at'), '%Y-%m')],
        raw: true
      })

      // 使用原生 SQL 获取面积数据，避免嵌套 include 问题
      let whereClause = "WHERE o.status = 'archived'"
      if (startDate && endDate) {
        whereClause += ` AND o.created_at BETWEEN '${startDate}' AND '${endDate}'`
      }

      const areaStats = await sequelize.query(`
        SELECT DATE_FORMAT(o.created_at, '%Y-%m') as month, SUM(mf.area) as total_area
        FROM measure_faces mf
        INNER JOIN order_ad_items oai ON mf.order_ad_item_id = oai.id
        INNER JOIN orders o ON oai.order_id = o.id
        ${whereClause}
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      `, { type: sequelize.QueryTypes.SELECT })

      // 合并数据
      const areaMap = Object.fromEntries(areaStats.map(s => [s.month, parseFloat(s.total_area) || 0]))

      const groupedData = {}

      // 处理订单统计
      orderStats.forEach(item => {
        const date = new Date(item.month + '-01')
        let key

        if (groupBy === 'month') {
          key = item.month
        } else if (groupBy === 'quarter') {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `${date.getFullYear()}-Q${quarter}`
        } else {
          key = `${date.getFullYear()}`
        }

        if (!groupedData[key]) {
          groupedData[key] = { period: key, order_count: 0, total_area: 0 }
        }
        groupedData[key].order_count += parseInt(item.order_count)
        groupedData[key].total_area += areaMap[item.month] || 0
      })

      const result = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period))

      return response.success(res, result)
    } catch (error) {
      console.error('收入统计错误:', error)
      return response.serverError(res, '获取收入统计失败')
    }
  },

  /**
   * 仪表盘数据
   */
  getDashboard: async (req, res) => {
    try {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      // 本月订单数
      const thisMonthOrders = await Order.count({
        where: { created_at: { [Op.gte]: startOfMonth } }
      })

      // 上月订单数
      const lastMonthOrders = await Order.count({
        where: {
          created_at: {
            [Op.between]: [startOfLastMonth, endOfLastMonth]
          }
        }
      })

      // 增长率
      const growthRate = lastMonthOrders > 0
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1)
        : 100

      // 待处理任务数
      const pendingTasks = await Order.count({
        where: {
          status: { [Op.in]: ['pending_review', 'design_review', 'install_review'] }
        }
      })

      // 各状态订单数
      const statusCounts = await Order.findAll({
        attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true
      })

      // 最近订单
      const recentOrders = await Order.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'customer',
          attributes: ['real_name', 'phone']
        }]
      })

      return response.success(res, {
        thisMonthOrders,
        lastMonthOrders,
        growthRate: parseFloat(growthRate),
        pendingTasks,
        statusCounts,
        recentOrders
      })
    } catch (error) {
      console.error('仪表盘数据错误:', error)
      return response.serverError(res, '获取仪表盘数据失败')
    }
  },

  /**
   * 效率指标
   */
  getEfficiency: async (req, res) => {
    try {
      const { startDate, endDate } = req.query
      const where = {}
      if (startDate && endDate) {
        where.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] }
      }

      // 各环节平均处理时长
      const stageDurations = await sequelize.query(`
        SELECT
          '设计' as stage,
          AVG(TIMESTAMPDIFF(HOUR,
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'designing'),
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'design_review')
          )) as avg_hours
        FROM orders o WHERE o.status NOT IN ('pending_review', 'rejected')
        UNION ALL
        SELECT
          '生产' as stage,
          AVG(TIMESTAMPDIFF(HOUR,
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'producing'),
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'checking')
          )) as avg_hours
        FROM orders o WHERE o.status IN ('checking', 'installing', 'install_review', 'archived')
        UNION ALL
        SELECT
          '安装' as stage,
          AVG(TIMESTAMPDIFF(HOUR,
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'installing'),
            (SELECT MIN(created_at) FROM order_logs WHERE order_id = o.id AND to_status = 'install_review')
          )) as avg_hours
        FROM orders o WHERE o.status IN ('install_review', 'archived')
      `, { type: sequelize.QueryTypes.SELECT })

      // 超时订单（每个环节超过3天）
      const overdueOrders = await sequelize.query(`
        SELECT o.id, o.order_no, o.status, o.created_at, o.updated_at,
          DATEDIFF(NOW(), o.updated_at) as overdue_days,
          u.real_name as handler_name
        FROM orders o
        LEFT JOIN users u ON o.current_handler_id = u.id
        WHERE o.status NOT IN ('archived', 'rejected')
          AND o.updated_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
        ORDER BY overdue_days DESC
        LIMIT 20
      `, { type: sequelize.QueryTypes.SELECT })

      // 今日完成数
      const todayCompleted = await Order.count({
        where: {
          status: 'archived',
          updated_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })

      // 本周完成数
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekCompleted = await Order.count({
        where: {
          status: 'archived',
          updated_at: { [Op.gte]: weekStart }
        }
      })

      return response.success(res, {
        stageDurations: stageDurations.map(s => ({
          stage: s.stage,
          avgHours: Math.round(s.avg_hours || 0)
        })),
        overdueOrders,
        todayCompleted,
        weekCompleted
      })
    } catch (error) {
      console.error('效率指标错误:', error)
      return response.serverError(res, '获取效率指标失败')
    }
  },

  /**
   * 预警提醒
   */
  getAlerts: async (req, res) => {
    try {
      const alerts = []

      // 逾期订单
      const overdueOrders = await Order.findAll({
        where: {
          status: { [Op.in]: ['designing', 'producing', 'installing'] },
          expected_date: { [Op.lt]: new Date() }
        },
        include: [{ model: User, as: 'customer', attributes: ['real_name'] }],
        limit: 10
      })

      if (overdueOrders.length > 0) {
        alerts.push({
          type: 'overdue',
          level: 'danger',
          title: '逾期订单',
          count: overdueOrders.length,
          items: overdueOrders.map(o => ({
            id: o.id,
            order_no: o.order_no,
            customer: o.customer_name,
            expected_date: o.expected_date
          }))
        })
      }

      // 积压预警（某环节超过10单）
      const backlogStats = await Order.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          status: { [Op.in]: ['pending_review', 'design_review', 'install_review'] }
        },
        group: ['status'],
        raw: true
      })

      const statusNames = {
        pending_review: '待审核（订单）',
        design_review: '待审核（设计方案）',
        install_review: '待审核（安装结果）'
      }

      backlogStats.forEach(stat => {
        const count = parseInt(stat.count)
        if (count >= 10) {
          alerts.push({
            type: 'backlog',
            level: 'warning',
            title: statusNames[stat.status],
            count,
            message: `当前有 ${count} 单待处理`
          })
        }
      })

      // 今日任务提醒
      const todayTasks = await Order.count({
        where: {
          status: { [Op.in]: ['pending_review', 'design_review', 'install_review'] },
          current_handler_id: req.user?.id
        }
      })

      if (todayTasks > 0) {
        alerts.push({
          type: 'task',
          level: 'info',
          title: '今日待办',
          count: todayTasks,
          message: `您有 ${todayTasks} 个待处理任务`
        })
      }

      return response.success(res, alerts)
    } catch (error) {
      console.error('预警提醒错误:', error)
      return response.serverError(res, '获取预警提醒失败')
    }
  },

  /**
   * 待办任务（按角色）
   */
  getMyTasks: async (req, res) => {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role

      let tasks = []
      const statusMap = {
        reviewer: ['pending_review', 'design_review', 'install_review'],
        designer: ['designing'],
        producer: ['producing', 'checking'],
        installer: ['installing']
      }

      const statuses = statusMap[userRole] || []

      if (statuses.length > 0) {
        const where = { status: { [Op.in]: statuses } }

        // 非审核角色只看自己的任务
        if (!['admin', 'reviewer'].includes(userRole)) {
          where.current_handler_id = userId
        }

        tasks = await Order.findAll({
          where,
          order: [['created_at', 'DESC']],
          limit: 20,
          attributes: ['id', 'order_no', 'customer_name', 'status', 'created_at', 'expected_date']
        })
      }

      return response.success(res, tasks)
    } catch (error) {
      console.error('待办任务错误:', error)
      return response.serverError(res, '获取待办任务失败')
    }
  }
}

module.exports = statisticsController
