const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class MeasureReport extends Model {}

MeasureReport.init(
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
    measurer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '测量员ID'
    },
    measure_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '测量日期'
    },
    install_condition: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '安装条件说明'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  },
  {
    sequelize,
    modelName: 'MeasureReport',
    tableName: 'measure_reports',
    comment: '测量报告表'
  }
);

module.exports = MeasureReport;
