const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DesignScheme extends Model {}

DesignScheme.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '订单ID'
    },
    designer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '设计师ID'
    },
    scheme_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '方案名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '方案描述'
    },
    design_mode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'single',
      comment: '设计模式：single单独 / combined组合'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    cdr_file: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'CDR源文件URL'
    }
  },
  {
    sequelize,
    modelName: 'DesignScheme',
    tableName: 'design_schemes',
    comment: '设计方案表'
  }
);

module.exports = DesignScheme;
