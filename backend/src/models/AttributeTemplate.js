const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AttributeTemplate extends Model {}

AttributeTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '模板名称'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '模板说明'
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
    modelName: 'AttributeTemplate',
    tableName: 'attribute_templates',
    comment: '属性模板表'
  }
);

module.exports = AttributeTemplate;
