require('dotenv').config();
const { sequelize } = require('../config/database');

async function addCdrFileColumn() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 检查列是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'outdoor_ad_system'
      AND TABLE_NAME = 'design_schemes'
      AND COLUMN_NAME = 'cdr_file'
    `);

    if (results.length === 0) {
      await sequelize.query(`
        ALTER TABLE design_schemes
        ADD COLUMN cdr_file VARCHAR(500) NULL COMMENT 'CDR源文件URL'
      `);
      console.log('cdr_file 列已添加');
    } else {
      console.log('cdr_file 列已存在');
    }

    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

addCdrFileColumn();