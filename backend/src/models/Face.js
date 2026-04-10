const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Face extends Model {}

Face.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '面名称'
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '面代码'
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
    modelName: 'Face',
    tableName: 'faces',
    comment: '面配置表'
  }
);

module.exports = Face;
