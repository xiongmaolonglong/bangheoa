/**
 * 审计日志模型
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '操作用户ID'
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '操作用户名'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '操作类型'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'HTTP方法'
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '请求路径'
    },
    query: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '查询参数'
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '请求体'
    },
    params: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '路由参数'
    },
    ip: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '客户端IP'
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '用户代理'
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP状态码'
    },
    response_status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: true,
      comment: '响应状态'
    },
    response_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '响应消息'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '响应时间(ms)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['status_code'] }
    ]
  }
);

module.exports = AuditLog;