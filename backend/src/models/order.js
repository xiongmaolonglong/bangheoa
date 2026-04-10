const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { ORDER_STATUS } = require('../config/constants');

class Order extends Model {}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_no: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: '订单编号'
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '小组ID'
    },
    province_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '省份ID'
    },
    district_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '区域ID'
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '客户ID（小程序用户）'
    },
    customer_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '客户姓名'
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '客户电话'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '订单标题'
    },
    ad_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '广告类型ID'
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '安装地址'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '纬度'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '经度'
    },
    status: {
      type: DataTypes.ENUM(Object.values(ORDER_STATUS)),
      allowNull: false,
      defaultValue: ORDER_STATUS.PENDING_REVIEW,
      comment: '订单状态'
    },
    current_handler_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '当前处理人ID'
    },
    estimated_area: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '预估面积'
    },
    expected_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '期望完成日期'
    },
    requirement: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '需求说明'
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '现场照片',
      get() {
        const value = this.getDataValue('photos');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    },
    form_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '动态表单数据',
      get() {
        const value = this.getDataValue('form_data');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'miniprogram',
      comment: '订单来源：miniprogram小程序 / admin后台新建'
    }
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    comment: '订单表'
  }
);

module.exports = Order;
