const { sequelize } = require('../config/database')

async function migrate() {
  try {
    await sequelize.query(
      `ALTER TABLE ad_types ADD COLUMN IF NOT EXISTS icon VARCHAR(255) NULL COMMENT '图标/封面图片URL'`
    )
    console.log('OK: Added icon column to ad_types')

    await sequelize.query(
      `ALTER TABLE ad_type_faces ADD COLUMN IF NOT EXISTS face_icon VARCHAR(255) NULL COMMENT '面图标/封面图片URL'`
    )
    console.log('OK: Added face_icon column to ad_type_faces')

    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()
