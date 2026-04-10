const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AdType extends Model {}

AdType.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '类型名称'
    },
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '图标/封面图片URL'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '类型说明'
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
    modelName: 'AdType',
    tableName: 'ad_types',
    comment: '广告类型表'
  }
);

module.exports = AdType;
