const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DesignDrawing extends Model {}

DesignDrawing.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    design_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '设计图组ID'
    },
    drawing_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '效果图',
      comment: '图纸类型'
    },
    file_url: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: '文件URL或Base64'
    },
    file_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '文件名'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    }
  },
  {
    sequelize,
    modelName: 'DesignDrawing',
    tableName: 'design_drawings',
    comment: '设计图纸表'
  }
);

module.exports = DesignDrawing;
