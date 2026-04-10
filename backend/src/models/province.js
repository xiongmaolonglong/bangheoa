const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Province extends Model {}

Province.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '省份名称'
    },
    code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      comment: '省份代码（拼音首字母）'
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
    modelName: 'Province',
    tableName: 'provinces',
    comment: '省份表',
    indexes: [
      { unique: true, fields: ['code'] }
    ]
  }
);

module.exports = Province;
