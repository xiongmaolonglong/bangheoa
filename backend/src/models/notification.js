const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Notification extends Model {}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '用户ID'
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: '通知类型'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '通知标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '通知内容'
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '关联订单ID'
    },
    is_read: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否已读：1是 0否'
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    comment: '消息通知表'
  }
);

module.exports = Notification;
