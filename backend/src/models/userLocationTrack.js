const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class UserLocationTrack extends Model {}

UserLocationTrack.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '用户ID（安装员/测量员）'
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '关联订单ID（可选）'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      comment: '纬度'
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      comment: '经度'
    },
    accuracy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '定位精度（米）'
    },
    speed: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '速度（km/h）'
    },
    type: {
      type: DataTypes.ENUM('track', 'checkin', 'checkout'),
      defaultValue: 'track',
      comment: '上报类型：track=轨迹追踪, checkin=签到, checkout=签退'
    },
    distance_to_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '距订单距离（米），签到时计算'
    },
    battery: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '设备电量百分比'
    }
  },
  {
    sequelize,
    modelName: 'UserLocationTrack',
    tableName: 'user_location_tracks',
    comment: '用户定位轨迹表',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'order_id'] },
      { fields: ['created_at'] }
    ]
  }
);

module.exports = UserLocationTrack;
