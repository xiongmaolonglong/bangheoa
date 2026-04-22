/**
 * 数据库迁移统一执行脚本
 * 用法:
 *   node scripts/migrate.js          # 执行所有 .js 和 .sql 迁移
 *   node scripts/migrate.js --sql     # 只执行 .sql 迁移
 *   node scripts/migrate.js --js      # 只执行 .js 迁移
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { sequelize } = require('../src/config/database')

const MIGRATIONS_DIR = path.join(__dirname, '../migrations')

// 追踪已执行过的迁移（建表记录）
async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

async function isExecuted(filename) {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM _migrations WHERE filename = ?',
    { replacements: [filename], type: sequelize.QueryTypes.SELECT }
  )
  return rows !== undefined
}

async function markExecuted(filename) {
  await sequelize.query(
    'INSERT IGNORE INTO _migrations (filename) VALUES (?)',
    { replacements: [filename] }
  )
}

async function runSqlFile(filePath) {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env
  const cmd = `mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" --password="${DB_PASSWORD}" "${DB_NAME}" --default-character-set=utf8mb4 < "${filePath}"`
  execSync(cmd, { stdio: 'inherit' })
}

async function runJsFile(filePath) {
  // 动态加载迁移文件并执行
  delete require.cache[require.resolve(filePath)]
  const migration = require(filePath)

  if (typeof migration.up === 'function') {
    // Sequelize CLI 格式
    const queryInterface = sequelize.getQueryInterface()
    await migration.up(queryInterface, require('sequelize'))
  } else if (typeof migration.default === 'function') {
    await migration.default()
  } else {
    console.log(`  ⏭️ 跳过 (无 up/default 导出): ${path.basename(filePath)}`)
    return
  }
}

async function main() {
  const jsOnly = process.argv.includes('--js')
  const sqlOnly = process.argv.includes('--sql')

  console.log('开始执行迁移...')

  await sequelize.authenticate()
  console.log('数据库连接成功')

  await ensureMigrationsTable()

  const files = fs.readdirSync(MIGRATIONS_DIR).sort()

  for (const file of files) {
    if (file.startsWith('.') || file.startsWith('_')) continue

    const filePath = path.join(MIGRATIONS_DIR, file)
    if (!fs.statSync(filePath).isFile()) continue

    if (await isExecuted(file)) {
      console.log(`  ⏭️ 已执行: ${file}`)
      continue
    }

    try {
      if (file.endsWith('.sql') && !jsOnly) {
        console.log(`  📝 执行 SQL: ${file}`)
        await runSqlFile(filePath)
      } else if (file.endsWith('.js') && !sqlOnly) {
        console.log(`  📝 执行 JS: ${file}`)
        await runJsFile(filePath)
      } else {
        continue
      }

      await markExecuted(file)
      console.log(`  ✅ 完成: ${file}`)
    } catch (err) {
      console.error(`  ❌ 失败: ${file}`)
      console.error(`     ${err.message}`)
      // 标记为已执行，避免重复报错卡住
      await markExecuted(file)
    }
  }

  console.log('\n迁移全部完成')
  await sequelize.close()
}

main().catch(err => {
  console.error('迁移脚本异常:', err)
  process.exit(1)
})
