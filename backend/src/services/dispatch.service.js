const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * 自动派单服务
 */
class DispatchService {
  /**
   * 根据规则自动派单
   * @param {Object} order - 订单对象
   * @param {string} stage - 派单阶段
   * @returns {Object|null} - 派单结果 { handler_id, rule_name }
   */
  async autoDispatch(order, stage) {
    const { DispatchRule, User, Order } = require('../models');

    // 查找匹配的规则
    const rules = await DispatchRule.findAll({
      where: {
        stage,
        enabled: true,
        [Op.or]: [
          { province_id: null },
          { province_id: order.group?.district?.province_id }
        ]
      },
      order: [['priority', 'DESC']],
      include: []
    });

    // 筛选匹配度最高的规则
    let matchedRule = null;
    for (const rule of rules) {
      // 检查分区匹配
      if (rule.district_id && rule.district_id !== order.group?.district_id) {
        continue;
      }
      // 检查小组匹配
      if (rule.group_id && rule.group_id !== order.group_id) {
        continue;
      }
      matchedRule = rule;
      break;
    }

    if (!matchedRule) {
      console.log(`未找到订单 ${order.order_no} 的派单规则`);
      return null;
    }

    // 确定处理人
    let handlerId = null;

    // 优先使用指定用户
    if (matchedRule.target_user_id) {
      handlerId = matchedRule.target_user_id;
    }
    // 按角色负载均衡
    else if (matchedRule.target_role && matchedRule.load_balance) {
      handlerId = await this.findLeastLoadedUser(matchedRule.target_role, order.group_id);
    }
    // 直接按角色派单
    else if (matchedRule.target_role) {
      const user = await User.findOne({
        where: { role: matchedRule.target_role, status: 1 },
        order: [['id', 'ASC']]
      });
      handlerId = user?.id;
    }

    if (!handlerId) {
      console.log(`规则 ${matchedRule.name} 未找到合适的处理人`);
      return null;
    }

    return {
      handler_id: handlerId,
      rule_name: matchedRule.name
    };
  }

  /**
   * 查找负载最少的用户
   */
  async findLeastLoadedUser(role, groupId) {
    const { User, Order } = require('../models');

    // 查找该角色的所有用户
    const users = await User.findAll({
      where: { role, status: 1 },
      attributes: ['id']
    });

    if (users.length === 0) return null;

    // 统计每个用户的进行中订单数
    const userIds = users.map(u => u.id);
    const activeStatuses = ['designing', 'design_review', 'producing', 'checking', 'installing', 'install_review'];

    const counts = await Order.findAll({
      attributes: [
        'current_handler_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        current_handler_id: { [Op.in]: userIds },
        status: { [Op.in]: activeStatuses }
      },
      group: ['current_handler_id'],
      raw: true
    });

    // 构建用户负载映射
    const loadMap = {};
    counts.forEach(c => {
      loadMap[c.current_handler_id] = parseInt(c.count) || 0;
    });

    // 找出负载最少的用户
    let minLoad = Infinity;
    let selectedUserId = null;

    for (const userId of userIds) {
      const load = loadMap[userId] || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedUserId = userId;
      }
    }

    return selectedUserId;
  }
}

module.exports = new DispatchService();
