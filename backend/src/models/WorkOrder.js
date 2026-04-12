const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('WorkOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  work_order_no: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  client_user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  project_category: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT },
  current_stage: {
    type: DataTypes.ENUM(
      'declaration', 'approval', 'assignment', 'measurement',
      'design', 'production', 'construction', 'finance', 'archive', 'aftersale'
    ),
    defaultValue: 'declaration',
  },
  status: {
    type: DataTypes.ENUM(
      'draft', 'submitted', 'approved', 'rejected',
      'assigned', 'measuring', 'measured',
      'designing', 'design_reviewed', 'design_confirmed',
      'producing', 'produced', 'shipped',
      'constructing', 'completed', 'accepted',
      'quoting', 'quoted', 'paid', 'invoiced',
      'archiving', 'archived',
      'aftersale_pending', 'aftersale_resolved', 'aftersale_closed'
    ),
    defaultValue: 'draft',
  },
  approval_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  budget_id: { type: DataTypes.INTEGER },
  assigned_tenant_user_id: { type: DataTypes.INTEGER },
  deadline: { type: DataTypes.DATEONLY },
  completed_at: { type: DataTypes.DATEONLY },
}, {
  tableName: 'work_orders',
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  charset: 'utf8mb4',
});
