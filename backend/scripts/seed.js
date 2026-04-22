/**
 * 初始化数据 Seed 脚本
 * 用法:
 *   node scripts/seed.js              # 创建基础数据
 *   node scripts/seed.js --reset      # 清空重建
 */

require('dotenv').config()
const { sequelize } = require('../src/config/database')
const bcrypt = require('bcryptjs')

const DEFAULT_DATA = {
  departments: [
    { name: '技术部', description: '技术管理部门' },
    { name: '工程部', description: '工程实施部门' },
    { name: '设计部', description: '设计策划部门' },
    { name: '生产部', description: '生产制作部门' }
  ],
  adTypes: [
    { name: '单立柱', code: 'single_billboard' },
    { name: '双立柱', code: 'double_billboard' },
    { name: '楼顶广告', code: 'rooftop' },
    { name: '墙面广告', code: 'wall' },
    { name: '灯箱', code: 'light_box' },
    { name: 'LED屏', code: 'led_screen' }
  ],
  roles: [
    { name: 'admin', label: '管理员' },
    { name: 'field_worker', label: '外勤人员' },
    { name: 'designer', label: '设计师' },
    { name: 'producer', label: '生产员' }
  ]
}

async function seed(reset = false) {
  console.log('开始初始化基础数据...')

  await sequelize.authenticate()
  console.log('数据库连接成功')

  if (reset) {
    console.log('清空现有数据...')
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
    await sequelize.query('TRUNCATE TABLE users')
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  // 1. 创建默认管理员
  const [adminRows] = await sequelize.query(
    "SELECT id FROM users WHERE username = 'admin' LIMIT 1"
  )
  if (adminRows.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await sequelize.query(
      `INSERT INTO users (username, real_name, password, role, status)
       VALUES ('admin', '系统管理员', ?, 'admin', 1)`,
      { replacements: [hashedPassword] }
    )
    console.log('✅ 创建默认管理员: admin / admin123')
  } else {
    console.log('⏭️ 管理员已存在')
  }

  // 2. 部门
  for (const dept of DEFAULT_DATA.departments) {
    const [rows] = await sequelize.query(
      'SELECT id FROM departments WHERE name = ? LIMIT 1',
      { replacements: [dept.name] }
    )
    if (rows.length === 0) {
      await sequelize.query(
        'INSERT INTO departments (name, status) VALUES (?, 1)',
        { replacements: [dept.name] }
      )
      console.log(`✅ 创建部门: ${dept.name}`)
    }
  }

  // 3. 广告类型（按名称去重，表没有code字段）
  for (const adType of DEFAULT_DATA.adTypes) {
    const [rows] = await sequelize.query(
      'SELECT id FROM ad_types WHERE name = ? LIMIT 1',
      { replacements: [adType.name] }
    )
    if (rows.length === 0) {
      await sequelize.query(
        'INSERT INTO ad_types (name) VALUES (?)',
        { replacements: [adType.name] }
      )
      console.log(`✅ 创建广告类型: ${adType.name}`)
    }
  }

  console.log('\n初始化完成')
  await sequelize.close()
}

const reset = process.argv.includes('--reset')
seed(reset).catch(err => {
  console.error('Seed 失败:', err)
  process.exit(1)
})
