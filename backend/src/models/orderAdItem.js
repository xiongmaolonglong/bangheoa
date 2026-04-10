const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class OrderAdItem extends Model {}

OrderAdItem.init(
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
    ad_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '广告类型ID'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '数量'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  },
  {
    sequelize,
    modelName: 'OrderAdItem',
    tableName: 'order_ad_items',
    comment: '订单广告项表'
  }
);

module.exports = OrderAdItem;
