/**
 * 为省份、分区、小组表添加排序字段
 * 执行方式: node src/migrations/add_region_sort_order.js
 */

const { sequelize } = require('../config/database')

async function migrate() {
  try {
    console.log('开始添加排序字段...')

    // 添加省份排序字段
    await sequelize.query(`
      ALTER TABLE provinces
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 COMMENT '排序号'
    `)
    console.log('✓ provinces 表已添加 sort_order 字段')

    // 添加分区排序字段
    await sequelize.query(`
      ALTER TABLE districts
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 COMMENT '排序号'
    `)
    console.log('✓ districts 表已添加 sort_order 字段')

    // 添加小组排序字段
    await sequelize.query(`
      ALTER TABLE \`groups\`
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 COMMENT '排序号'
    `)
    console.log('✓ groups 表已添加 sort_order 字段')

    console.log('\n迁移完成！')
    process.exit(0)
  } catch (err) {
    console.error('迁移失败:', err.message)
    process.exit(1)
  }
}

migrate()
