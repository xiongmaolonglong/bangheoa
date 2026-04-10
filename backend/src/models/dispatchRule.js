const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const DispatchRule = sequelize.define('DispatchRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '规则名称'
  },
  stage: {
    type: DataTypes.ENUM('measure', 'design', 'produce', 'install'),
    allowNull: false,
    comment: '派单阶段'
  },
  province_id: {
    type: DataTypes.INTEGER,
    comment: '省份ID，null表示不限'
  },
  district_id: {
    type: DataTypes.INTEGER,
    comment: '分区ID，null表示不限'
  },
  group_id: {
    type: DataTypes.INTEGER,
    comment: '小组ID，null表示不限'
  },
  target_role: {
    type: DataTypes.STRING(50),
    comment: '目标角色：measurer/designer/producer/installer'
  },
  target_user_id: {
    type: DataTypes.INTEGER,
    comment: '指定用户ID，优先于角色'
  },
  load_balance: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否负载均衡'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '优先级，数字越大越优先'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  }
}, {
  tableName: 'dispatch_rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DispatchRule;
