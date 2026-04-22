const logger = require('../utils/logger');
/**
 * 系统配置控制器
 * 提供常量、枚举等配置信息
 */
const cacheService = require('../services/cache.service');
const { SystemConfig } = require('../models');

// 订单状态常量
const ORDER_STATUS = {
  PENDING_REVIEW: 'pending_review',
  DESIGNING: 'designing',
  DESIGN_REVIEW: 'design_review',
  PRODUCING: 'producing',
  CHECKING: 'checking',
  INSTALLING: 'installing',
  INSTALL_REVIEW: 'install_review',
  ARCHIVED: 'archived',
  REJECTED: 'rejected'
};

// 状态显示配置
const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.PENDING_REVIEW]: { label: '待审核', color: 'warning', cardKey: 'pending' },
  [ORDER_STATUS.DESIGNING]: { label: '设计中', color: 'primary', cardKey: 'designing' },
  [ORDER_STATUS.DESIGN_REVIEW]: { label: '设计审核', color: 'warning', cardKey: 'pending' },
  [ORDER_STATUS.PRODUCING]: { label: '生产中', color: 'info', cardKey: 'producing' },
  [ORDER_STATUS.CHECKING]: { label: '核对中', color: 'info', cardKey: 'checking' },
  [ORDER_STATUS.INSTALLING]: { label: '安装中', color: 'success', cardKey: 'installing' },
  [ORDER_STATUS.INSTALL_REVIEW]: { label: '安装审核', color: 'warning', cardKey: 'pending' },
  [ORDER_STATUS.ARCHIVED]: { label: '已归档', color: 'success', cardKey: 'archived' },
  [ORDER_STATUS.REJECTED]: { label: '已驳回', color: 'danger', cardKey: 'rejected' }
};

// 用户角色
const USER_ROLES = {
  ADMIN: 'admin',
  DESIGNER: 'designer',
  PRODUCER: 'producer',
  FIELD_WORKER: 'field_worker'
};

const USER_ROLES_CONFIG = {
  [USER_ROLES.ADMIN]: { label: '系统管理员' },
  [USER_ROLES.DESIGNER]: { label: '设计师' },
  [USER_ROLES.PRODUCER]: { label: '生产员' },
  [USER_ROLES.FIELD_WORKER]: { label: '外勤人员' }
};

// 生产状态
const PRODUCTION_STATUS = {
  PENDING: 'pending',
  PRODUCING: 'producing',
  COMPLETED: 'completed'
};

const PRODUCTION_STATUS_CONFIG = {
  [PRODUCTION_STATUS.PENDING]: { label: '待生产', color: 'warning' },
  [PRODUCTION_STATUS.PRODUCING]: { label: '生产中', color: 'primary' },
  [PRODUCTION_STATUS.COMPLETED]: { label: '已完成', color: 'success' }
};

// 生产类型
const PRODUCTION_TYPE = {
  INTERNAL: 'internal',
  OUTSOURCE: 'outsource'
};

const PRODUCTION_TYPE_CONFIG = {
  [PRODUCTION_TYPE.INTERNAL]: { label: '内部生产' },
  [PRODUCTION_TYPE.OUTSOURCE]: { label: '外协' }
};

// 订单来源
const ORDER_SOURCE = {
  MINIPROGRAM: 'miniprogram',
  ADMIN: 'admin'
};

const ORDER_SOURCE_CONFIG = {
  [ORDER_SOURCE.MINIPROGRAM]: { label: '小程序申请' },
  [ORDER_SOURCE.ADMIN]: { label: '后台新建' }
};

// 审核类型
const REVIEW_TYPES = {
  [ORDER_STATUS.PENDING_REVIEW]: '申请审核',
  [ORDER_STATUS.MEASURE_REVIEW]: '测量审核',
  [ORDER_STATUS.DESIGN_REVIEW]: '设计审核',
  [ORDER_STATUS.INSTALL_REVIEW]: '安装审核'
};

// 表单字段类型
const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  IMAGE: 'image',
  LOCATION: 'location'
};

const FIELD_TYPES_CONFIG = {
  [FIELD_TYPES.TEXT]: { label: '文本' },
  [FIELD_TYPES.TEXTAREA]: { label: '多行文本' },
  [FIELD_TYPES.NUMBER]: { label: '数字' },
  [FIELD_TYPES.SELECT]: { label: '下拉选择' },
  [FIELD_TYPES.RADIO]: { label: '单选' },
  [FIELD_TYPES.CHECKBOX]: { label: '多选' },
  [FIELD_TYPES.DATE]: { label: '日期' },
  [FIELD_TYPES.IMAGE]: { label: '图片' },
  [FIELD_TYPES.LOCATION]: { label: '位置' }
};

// 状态流转规则
const STATUS_FLOW = {
  [ORDER_STATUS.PENDING_REVIEW]: {
    next: [ORDER_STATUS.DESIGNING, ORDER_STATUS.REJECTED],
    label: '待审核',
    actions: ['approve', 'reject']
  },
  [ORDER_STATUS.DESIGNING]: {
    next: [ORDER_STATUS.DESIGN_REVIEW],
    label: '设计中',
    actions: ['submit_design']
  },
  [ORDER_STATUS.DESIGN_REVIEW]: {
    next: [ORDER_STATUS.PRODUCING, ORDER_STATUS.DESIGNING],
    label: '设计审核',
    actions: ['approve', 'reject']
  },
  [ORDER_STATUS.PRODUCING]: {
    next: [ORDER_STATUS.CHECKING],
    label: '生产中',
    actions: ['complete_production']
  },
  [ORDER_STATUS.CHECKING]: {
    next: [ORDER_STATUS.INSTALLING, ORDER_STATUS.PRODUCING],
    label: '核对中',
    actions: ['approve', 'reject']
  },
  [ORDER_STATUS.INSTALLING]: {
    next: [ORDER_STATUS.INSTALL_REVIEW],
    label: '安装中',
    actions: ['submit_install']
  },
  [ORDER_STATUS.INSTALL_REVIEW]: {
    next: [ORDER_STATUS.ARCHIVED, ORDER_STATUS.INSTALLING],
    label: '安装审核',
    actions: ['approve', 'reject']
  },
  [ORDER_STATUS.ARCHIVED]: {
    next: [],
    label: '已归档',
    actions: []
  },
  [ORDER_STATUS.REJECTED]: {
    next: [],
    label: '已驳回',
    actions: []
  }
};

/**
 * 获取所有常量配置
 */
async function getConstants(req, res) {
  try {
    // 尝试从缓存获取
    const cacheKey = 'system_constants';
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        code: 0,
        success: true,
        data: cached
      });
    }

    const data = {
      orderStatus: ORDER_STATUS,
      orderStatusConfig: ORDER_STATUS_CONFIG,
      userRoles: USER_ROLES,
      userRolesConfig: USER_ROLES_CONFIG,
      productionStatus: PRODUCTION_STATUS,
      productionStatusConfig: PRODUCTION_STATUS_CONFIG,
      productionType: PRODUCTION_TYPE,
      productionTypeConfig: PRODUCTION_TYPE_CONFIG,
      orderSource: ORDER_SOURCE,
      orderSourceConfig: ORDER_SOURCE_CONFIG,
      reviewTypes: REVIEW_TYPES,
      fieldTypes: FIELD_TYPES,
      fieldTypesConfig: FIELD_TYPES_CONFIG,
      statusFlow: STATUS_FLOW
    };

    // 缓存 1 小时
    await cacheService.set(cacheKey, data, 3600);

    res.json({
      code: 0,
      success: true,
      data
    });
  } catch (error) {
    logger.error('获取常量配置失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '获取常量配置失败'
    });
  }
}

/**
 * 获取订单状态配置
 */
async function getOrderStatusConfig(req, res) {
  try {
    res.json({
      success: true,
      data: {
        status: ORDER_STATUS,
        config: ORDER_STATUS_CONFIG,
        flow: STATUS_FLOW
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取订单状态配置失败'
    });
  }
}

/**
 * 获取用户角色配置
 */
async function getUserRolesConfig(req, res) {
  try {
    res.json({
      success: true,
      data: {
        roles: USER_ROLES,
        config: USER_ROLES_CONFIG
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户角色配置失败'
    });
  }
}

/**
 * 获取默认材质列表
 */
async function getDefaultMaterials(req, res) {
  try {
    const cacheKey = 'default_materials';
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached
      });
    }

    // 从数据库获取配置
    const config = await SystemConfig.findOne({
      where: { config_key: 'default_materials' }
    });

    let materials = ['亚克力', '不锈钢', '铝塑板', 'PVC', '喷绘布'];

    if (config && config.config_value) {
      try {
        const parsed = JSON.parse(config.config_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          materials = parsed;
        }
      } catch (e) {
        logger.error('解析材质配置失败:', e);
      }
    }

    // 缓存 1 小时
    await cacheService.set(cacheKey, materials, 3600);

    res.json({
      success: true,
      data: materials
    });
  } catch (error) {
    logger.error('获取默认材质失败:', error);
    res.status(500).json({
      success: false,
      message: '获取默认材质失败'
    });
  }
}

/**
 * 更新默认材质列表
 */
async function updateDefaultMaterials(req, res) {
  try {
    const { materials } = req.body;

    if (!Array.isArray(materials)) {
      return res.status(400).json({
        success: false,
        message: '材质列表格式错误'
      });
    }

    // 更新或创建配置
    await SystemConfig.upsert({
      config_key: 'default_materials',
      config_value: JSON.stringify(materials),
      config_type: 'array',
      description: '默认材质选项列表',
      category: 'form'
    });

    // 清除缓存
    await cacheService.del('default_materials');

    res.json({
      success: true,
      message: '材质配置已更新',
      data: materials
    });
  } catch (error) {
    logger.error('更新默认材质失败:', error);
    res.status(500).json({
      success: false,
      message: '更新默认材质失败'
    });
  }
}

/**
 * 获取系统配置项
 */
async function getSystemConfig(req, res) {
  try {
    const { key } = req.params;
    const cacheKey = `system_config_${key}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        code: 0,
        success: true,
        data: cached
      });
    }

    const config = await SystemConfig.findOne({
      where: { config_key: key }
    });

    if (!config) {
      return res.json({
        success: true,
        data: { key, value: null, type: 'string', description: null }
      });
    }

    let value = config.config_value;
    if (config.config_type === 'json' || config.config_type === 'array') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // 保持原值
      }
    } else if (config.config_type === 'number') {
      value = parseFloat(value);
    } else if (config.config_type === 'boolean') {
      value = value === 'true';
    }

    // 缓存 1 小时
    await cacheService.set(cacheKey, value, 3600);

    res.json({
      code: 0,
      success: true,
      data: {
        key: config.config_key,
        value,
        type: config.config_type,
        description: config.description
      }
    });
  } catch (error) {
    logger.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
}

/**
 * 更新系统配置项
 */
async function updateSystemConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, type = 'string', description } = req.body;

    let configValue = value;
    if (typeof value === 'object') {
      configValue = JSON.stringify(value);
    }

    await SystemConfig.upsert({
      config_key: key,
      config_value: configValue,
      config_type: type,
      description,
      category: 'system'
    });

    // 清除缓存
    await cacheService.del(`system_config_${key}`);

    res.json({
      code: 0,
      success: true,
      message: '配置已更新'
    });
  } catch (error) {
    logger.error('更新系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统配置失败'
    });
  }
}

/**
 * 获取所有系统配置
 */
async function getAllConfigs(req, res) {
  try {
    const configs = await SystemConfig.findAll({
      order: [['category', 'ASC'], ['config_key', 'ASC']]
    });

    const result = configs.map(c => ({
      key: c.config_key,
      value: c.config_type === 'json' || c.config_type === 'array'
        ? JSON.parse(c.config_value)
        : c.config_value,
      type: c.config_type,
      description: c.description,
      category: c.category,
      updated_at: c.updated_at
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取所有配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取所有配置失败'
    });
  }
}

module.exports = {
  getConstants,
  getOrderStatusConfig,
  getUserRolesConfig,
  getDefaultMaterials,
  updateDefaultMaterials,
  getSystemConfig,
  updateSystemConfig,
  getAllConfigs,
  // 导出常量供其他模块使用
  ORDER_STATUS,
  ORDER_STATUS_CONFIG,
  USER_ROLES,
  USER_ROLES_CONFIG,
  PRODUCTION_STATUS,
  PRODUCTION_STATUS_CONFIG,
  PRODUCTION_TYPE,
  PRODUCTION_TYPE_CONFIG,
  ORDER_SOURCE,
  ORDER_SOURCE_CONFIG,
  REVIEW_TYPES,
  FIELD_TYPES,
  FIELD_TYPES_CONFIG,
  STATUS_FLOW
};
