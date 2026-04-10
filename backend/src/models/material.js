const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Material extends Model {}

Material.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '材质名称'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '材质说明'
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
    modelName: 'Material',
    tableName: 'materials',
    comment: '材质表'
  }
);

module.exports = Material;
