const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DesignGroup extends Model {}

DesignGroup.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    design_scheme_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '设计方案ID'
    },
    group_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '图组名称'
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '宽度(mm)'
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '高度(mm)'
    },
    area: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: '面积(平方米)'
    },
    material: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '材质'
    },
    is_combined: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否组合：0单面 / 1组合'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  },
  {
    sequelize,
    modelName: 'DesignGroup',
    tableName: 'design_groups',
    comment: '设计图组表'
  }
);

module.exports = DesignGroup;
