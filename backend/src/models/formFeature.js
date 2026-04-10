const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class FormFeature extends Model {}

FormFeature.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    feature_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '功能标识'
    },
    feature_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '功能名称'
    },
    is_enabled: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否启用 0-禁用 1-启用'
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '扩展配置JSON'
    }
  },
  {
    sequelize,
    modelName: 'FormFeature',
    tableName: 'form_features',
    comment: '功能开关配置表'
  }
);

module.exports = FormFeature;
