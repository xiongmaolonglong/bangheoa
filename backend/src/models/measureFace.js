const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { PRODUCTION_STATUS, PRODUCTION_TYPE } = require('../config/constants');

class MeasureFace extends Model {}

MeasureFace.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_ad_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '订单广告项ID'
    },
    face_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '面名称'
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '宽度(cm)'
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '高度(cm)'
    },
    area: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '面积(㎡)'
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '材质ID'
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
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    production_status: {
      type: DataTypes.ENUM(Object.values(PRODUCTION_STATUS)),
      allowNull: false,
      defaultValue: PRODUCTION_STATUS.PENDING,
      comment: '生产状态'
    },
    production_type: {
      type: DataTypes.ENUM(Object.values(PRODUCTION_TYPE)),
      allowNull: true,
      comment: '生产方式'
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '外协供应商ID'
    },
    producer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '生产员ID'
    },
    check_status: {
      type: DataTypes.ENUM('pending', 'passed', 'failed', 'rework'),
      defaultValue: 'pending',
      comment: '核对状态'
    },
    check_remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '核对备注'
    },
    check_photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '核对照片',
      get() {
        const value = this.getDataValue('check_photos');
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return value; }
        }
        return value;
      }
    },
    check_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '核对时间'
    },
    check_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '问题类型：size/material/color/quality/other'
    },
    actual_width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '实际宽度(cm)'
    },
    actual_height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '实际高度(cm)'
    },
    actual_material_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '实际材质ID'
    }
  },
  {
    sequelize,
    modelName: 'MeasureFace',
    tableName: 'measure_faces',
    comment: '测量面表'
  }
);

module.exports = MeasureFace;
