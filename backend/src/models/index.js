const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

// 导入所有模型
const User = require('./user');
const Department = require('./department');
const Province = require('./province');
const District = require('./district');
const Group = require('./group');
const AdType = require('./adType');
const AdTypeFace = require('./adTypeFace');
const Face = require('./Face');
const AttributeTemplate = require('./AttributeTemplate');
const AttributeField = require('./AttributeField');
const Material = require('./material');
const Supplier = require('./supplier');
const FormGroup = require('./formGroup');
const FormField = require('./formField');
const FormFeature = require('./formFeature');
const Order = require('./order');
const OrderAdItem = require('./orderAdItem');
const MeasureFace = require('./measureFace');
const MeasureReport = require('./measureReport');
const DesignScheme = require('./designScheme');
const DesignGroup = require('./designGroup');
const DesignGroupFace = require('./designGroupFace');
const DesignDrawing = require('./designDrawing');
const DesignCdrFile = require('./designCdrFile');
const InstallReport = require('./installReport');
const OrderLog = require('./orderLog');
const Notification = require('./notification');
const DispatchRule = require('./dispatchRule');
const SystemConfig = require('./systemConfig');
const UserLocationTrack = require('./userLocationTrack');

// ==================== 模型关联 ====================

// 用户 - 部门
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });

// 用户 - 小组
User.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Group.hasMany(User, { foreignKey: 'group_id', as: 'members' });

// 部门 - 父部门
Department.belongsTo(Department, { foreignKey: 'parent_id', as: 'parent' });
Department.hasMany(Department, { foreignKey: 'parent_id', as: 'children' });

// 部门 - 负责人
Department.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' });

// 省份 - 分区
Province.hasMany(District, { foreignKey: 'province_id', as: 'districts' });
District.belongsTo(Province, { foreignKey: 'province_id', as: 'province' });

// 分区 - 小组
District.hasMany(Group, { foreignKey: 'district_id', as: 'groups' });
Group.belongsTo(District, { foreignKey: 'district_id', as: 'district' });

// 分区/小组 - 负责人
District.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' });
Group.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' });

// 广告类型 - 预设面
AdType.hasMany(AdTypeFace, { foreignKey: 'ad_type_id', as: 'faces' });
AdType.hasMany(Order, { foreignKey: 'ad_type_id', as: 'orders' });
AdTypeFace.belongsTo(AdType, { foreignKey: 'ad_type_id', as: 'adType' });

// 广告类型面 - 关联面配置
AdTypeFace.belongsTo(Face, { foreignKey: 'face_id', as: 'faceConfig' });

// 广告类型面 - 关联属性模板
AdTypeFace.belongsTo(AttributeTemplate, { foreignKey: 'template_id', as: 'template' });

// 属性模板 - 属性字段
AttributeTemplate.hasMany(AttributeField, { foreignKey: 'template_id', as: 'fields' });
AttributeField.belongsTo(AttributeTemplate, { foreignKey: 'template_id', as: 'template' });

// 表单分组 - 字段
FormGroup.hasMany(FormField, { foreignKey: 'group_id', as: 'fields' });
FormField.belongsTo(FormGroup, { foreignKey: 'group_id', as: 'group' });

// 订单 - 小组
Order.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Group.hasMany(Order, { foreignKey: 'group_id', as: 'orders' });

// 订单 - 客户
Order.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

// 订单 - 当前处理人
Order.belongsTo(User, { foreignKey: 'current_handler_id', as: 'handler' });

// 订单 - 广告类型
Order.belongsTo(AdType, { foreignKey: 'ad_type_id', as: 'adType' });

// 订单 - 广告项
Order.hasMany(OrderAdItem, { foreignKey: 'order_id', as: 'adItems' });
OrderAdItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 广告项 - 广告类型
OrderAdItem.belongsTo(AdType, { foreignKey: 'ad_type_id', as: 'adType' });

// 广告项 - 测量面
OrderAdItem.hasMany(MeasureFace, { foreignKey: 'order_ad_item_id', as: 'faces' });
MeasureFace.belongsTo(OrderAdItem, { foreignKey: 'order_ad_item_id', as: 'adItem' });

// 测量面 - 材质
MeasureFace.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });

// 测量面 - 供应商
MeasureFace.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// 测量面 - 生产员
MeasureFace.belongsTo(User, { foreignKey: 'producer_id', as: 'producer' });

// 订单 - 测量报告
Order.hasOne(MeasureReport, { foreignKey: 'order_id', as: 'measureReport' });
MeasureReport.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 测量报告 - 测量员
MeasureReport.belongsTo(User, { foreignKey: 'measurer_id', as: 'measurer' });

// 订单 - 设计方案
Order.hasOne(DesignScheme, { foreignKey: 'order_id', as: 'designScheme' });
DesignScheme.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 设计方案 - 设计师
DesignScheme.belongsTo(User, { foreignKey: 'designer_id', as: 'designer' });

// 设计方案 - 设计图组
DesignScheme.hasMany(DesignGroup, { foreignKey: 'design_scheme_id', as: 'groups' });
DesignGroup.belongsTo(DesignScheme, { foreignKey: 'design_scheme_id', as: 'scheme' });

// 设计图组 - 关联面
DesignGroup.hasMany(DesignGroupFace, { foreignKey: 'design_group_id', as: 'faceRelations' });
DesignGroupFace.belongsTo(DesignGroup, { foreignKey: 'design_group_id', as: 'group' });
DesignGroupFace.belongsTo(MeasureFace, { foreignKey: 'measure_face_id', as: 'face' });

// 设计图组 - 图纸
DesignGroup.hasMany(DesignDrawing, { foreignKey: 'design_group_id', as: 'drawings' });
DesignDrawing.belongsTo(DesignGroup, { foreignKey: 'design_group_id', as: 'group' });

// 设计方案 - CDR文件
DesignScheme.hasMany(DesignCdrFile, { foreignKey: 'design_scheme_id', as: 'cdrFiles' });
DesignCdrFile.belongsTo(DesignScheme, { foreignKey: 'design_scheme_id', as: 'scheme' });
DesignCdrFile.belongsTo(MeasureFace, { foreignKey: 'measure_face_id', as: 'face' });

// 订单 - 安装报告
Order.hasOne(InstallReport, { foreignKey: 'order_id', as: 'installReport' });
InstallReport.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 安装报告 - 安装员
InstallReport.belongsTo(User, { foreignKey: 'installer_id', as: 'installer' });

// 定位轨迹 - 用户
UserLocationTrack.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(UserLocationTrack, { foreignKey: 'user_id', as: 'locationTracks' });

// 定位轨迹 - 订单（可选关联）
UserLocationTrack.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 订单 - 日志
Order.hasMany(OrderLog, { foreignKey: 'order_id', as: 'logs' });
OrderLog.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 日志 - 操作人
OrderLog.belongsTo(User, { foreignKey: 'operator_id', as: 'operator' });

// 用户 - 通知
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 通知 - 订单
Notification.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 派单规则关联
DispatchRule.belongsTo(Province, { foreignKey: 'province_id', as: 'province' });
DispatchRule.belongsTo(District, { foreignKey: 'district_id', as: 'district' });
DispatchRule.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
DispatchRule.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser' });

// 导出所有模型
module.exports = {
  sequelize,
  User,
  Department,
  Province,
  District,
  Group,
  AdType,
  AdTypeFace,
  Face,
  AttributeTemplate,
  AttributeField,
  Material,
  Supplier,
  FormGroup,
  FormField,
  FormFeature,
  Order,
  OrderAdItem,
  MeasureFace,
  MeasureReport,
  DesignScheme,
  DesignGroup,
  DesignGroupFace,
  DesignDrawing,
  DesignCdrFile,
  InstallReport,
  OrderLog,
  Notification,
  DispatchRule,
  SystemConfig,
  UserLocationTrack,

  // 同步数据库
  syncDatabase: async (options = {}) => {
    try {
      await sequelize.sync(options);
      logger.info('数据库同步成功');
    } catch (error) {
      logger.error('数据库同步失败:', error);
      throw error;
    }
  }
};
