const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class District extends Model {}

District.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    province_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属省份ID'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分区名称'
    },
    code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      comment: '分区代码（拼音首字母）'
    },
    leader_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '负责人ID'
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
    modelName: 'District',
    tableName: 'districts',
    comment: '分区表',
    indexes: [
      { unique: true, fields: ['province_id', 'code'] }
    ]
  }
);

module.exports = District;
