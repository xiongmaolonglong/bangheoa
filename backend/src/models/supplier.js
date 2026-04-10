const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Supplier extends Model {}

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '供应商名称'
    },
    contact: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '联系人'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '联系电话'
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '地址'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    }
  },
  {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
    comment: '供应商表'
  }
);

module.exports = Supplier;
