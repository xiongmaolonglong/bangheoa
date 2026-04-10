const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class OrderLog extends Model {}

OrderLog.init(
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
    operator_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '操作人ID'
    },
    operator_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '操作人姓名'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '操作类型'
    },
    from_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: '原状态'
    },
    to_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: '新状态'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  },
  {
    sequelize,
    modelName: 'OrderLog',
    tableName: 'order_logs',
    comment: '订单日志表'
  }
);

module.exports = OrderLog;
