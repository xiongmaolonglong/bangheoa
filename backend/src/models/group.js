const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Group extends Model {}

Group.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    district_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属分区ID'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '小组名称'
    },
    code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      comment: '小组代码（01-99）'
    },
    leader_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '组长ID'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序号'
    }
  },
  {
    sequelize,
    modelName: 'Group',
    tableName: 'groups',
    comment: '小组表',
    indexes: [
      { unique: true, fields: ['district_id', 'code'] }
    ]
  }
);

module.exports = Group;
