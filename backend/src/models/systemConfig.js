/**
 * 系统配置模型
 * 存储系统级别的配置项
 */
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class SystemConfig extends Model {}

SystemConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    config_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '配置键'
    },
    config_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '配置值（JSON 或文本）'
    },
    config_type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
      defaultValue: 'string',
      comment: '配置类型'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '配置描述'
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
      comment: '配置分类'
    }
  },
  {
    sequelize,
    modelName: 'SystemConfig',
    tableName: 'system_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = SystemConfig;