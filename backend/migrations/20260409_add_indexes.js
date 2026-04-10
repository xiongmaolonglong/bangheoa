/**
 * 数据库索引优化迁移脚本
 * 执行方式: node migrations/20260409_add_indexes.js
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

const indexes = [
  // 订单表索引
  {
    table: 'orders',
    indexes: [
      { name: 'idx_order_status', fields: ['status'] },
      { name: 'idx_order_group', fields: ['group_id'] },
      { name: 'idx_order_customer', fields: ['customer_id'] },
      { name: 'idx_order_created', fields: ['created_at'] },
      { name: 'idx_order_status_group', fields: ['status', 'group_id'] },
      { name: 'idx_order_status_created', fields: ['status', 'created_at'] },
      { name: 'idx_order_expected', fields: ['expected_date'] }
    ]
  },
  // 用户表索引
  {
    table: 'users',
    indexes: [
      { name: 'idx_user_department', fields: ['department_id'] },
      { name: 'idx_user_role', fields: ['role'] },
      { name: 'idx_user_status', fields: ['status'] }
    ]
  },
  // 订单广告项索引
  {
    table: 'order_ad_items',
    indexes: [
      { name: 'idx_aditem_order', fields: ['order_id'] },
      { name: 'idx_aditem_adtype', fields: ['ad_type_id'] }
    ]
  },
  // 测量面索引
  {
    table: 'measure_faces',
    indexes: [
      { name: 'idx_measureface_aditem', fields: ['order_ad_item_id'] },
      { name: 'idx_measureface_order', fields: ['order_id'] }
    ]
  },
  // 设计方案索引
  {
    table: 'design_schemes',
    indexes: [
      { name: 'idx_scheme_order', fields: ['order_id'] },
      { name: 'idx_scheme_designer', fields: ['designer_id'] },
      { name: 'idx_scheme_status', fields: ['status'] }
    ]
  },
  // 设计分组索引
  {
    table: 'design_groups',
    indexes: [
      { name: 'idx_group_scheme', fields: ['scheme_id'] }
    ]
  },
  // 设计图纸索引
  {
    table: 'design_drawings',
    indexes: [
      { name: 'idx_drawing_group', fields: ['group_id'] }
    ]
  },
  // 安装报告索引
  {
    table: 'install_reports',
    indexes: [
      { name: 'idx_install_order', fields: ['order_id'] },
      { name: 'idx_install_installer', fields: ['installer_id'] }
    ]
  },
  // 订单日志索引
  {
    table: 'order_logs',
    indexes: [
      { name: 'idx_log_order', fields: ['order_id'] },
      { name: 'idx_log_created', fields: ['created_at'] }
    ]
  },
  // 区域索引
  {
    table: 'provinces',
    indexes: [
      { name: 'idx_province_code', fields: ['code'] }
    ]
  },
  {
    table: 'districts',
    indexes: [
      { name: 'idx_district_province', fields: ['province_id'] },
      { name: 'idx_district_code', fields: ['code'] }
    ]
  },
  {
    table: 'groups',
    indexes: [
      { name: 'idx_group_district', fields: ['district_id'] },
      { name: 'idx_group_code', fields: ['code'] }
    ]
  }
];

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    for (const { table, indexes: tableIndexes } of indexes) {
      console.log(`\n处理表: ${table}`);

      for (const index of tableIndexes) {
        try {
          const indexExists = await sequelize.query(
            `SHOW INDEX FROM ${table} WHERE Key_name = '${index.name}'`,
            { type: sequelize.QueryTypes.SELECT }
          );

          if (indexExists.length === 0) {
            const fields = index.fields.join(', ');
            await sequelize.query(
              `CREATE INDEX ${index.name} ON ${table} (${fields})`
            );
            console.log(`  ✅ 创建索引: ${index.name} (${fields})`);
          } else {
            console.log(`  ⏭️ 索引已存在: ${index.name}`);
          }
        } catch (err) {
          console.log(`  ❌ 创建索引失败 ${index.name}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ 迁移完成');
    process.exit(0);
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  }
}

runMigration();