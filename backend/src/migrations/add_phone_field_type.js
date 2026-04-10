/**
 * Migration: Add 'phone' field type to form_fields ENUM
 * Run: node backend/src/migrations/add_phone_field_type.js
 */
const { sequelize } = require('../config/database')

async function migrate() {
  try {
    await sequelize.query(
      `ALTER TABLE form_fields
       MODIFY COLUMN field_type ENUM('text','textarea','number','phone','select','radio','checkbox','date','image','location')
       NOT NULL DEFAULT 'text' COMMENT '字段类型'`
    )
    console.log('OK: Added phone to form_fields.field_type ENUM')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()
