const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('WoProduction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  work_order_id: { type: DataTypes.INTEGER, allowNull: false },
  production_task_no: { type: DataTypes.STRING(50) },
  task_ids: { type: DataTypes.JSON },
  material_type: { type: DataTypes.STRING(50) },
  spec: { type: DataTypes.STRING(200) },
  quantity: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('scheduled', 'producing', 'completed', 'shipped', 'quality_checked', 'qualified', 'warehoused'), defaultValue: 'scheduled' },
  quality_notes: { type: DataTypes.TEXT },
  produced_at: { type: DataTypes.DATEONLY },
  shipped_at: { type: DataTypes.DATEONLY },
}, {
  tableName: 'wo_productions',
  underscored: true,
  paranoid: true,
  freezeTableName: true,
  charset: 'utf8mb4',
});
