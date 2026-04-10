const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Department extends Model {}

Department.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '部门名称'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '父部门ID'
    },
    leader_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '部门负责人ID'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    }
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    comment: '部门表'
  }
);

module.exports = Department;
