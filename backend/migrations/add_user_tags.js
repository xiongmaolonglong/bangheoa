const { sequelize } = require('../src/models');

async function migrate() {
  try {
    await sequelize.query('ALTER TABLE `users` ADD COLUMN `tags` VARCHAR(500) NULL COMMENT "客户标签，逗号分隔";');
    console.log('Migration completed: added tags column to users table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
