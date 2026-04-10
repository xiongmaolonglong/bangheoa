const { sequelize } = require('./src/config/database');

(async () => {
  try {
    await sequelize.authenticate();

    // 根据customer_id判断来源
    const [result] = await sequelize.query(`
      UPDATE orders SET source = CASE
        WHEN customer_id IS NOT NULL THEN 'miniprogram'
        ELSE 'admin'
      END
    `);
    console.log('更新完成');

    // 验证
    const [rows] = await sequelize.query('SELECT id, order_no, customer_id, source FROM orders LIMIT 5');
    console.log('示例数据:', rows);

    process.exit(0);
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();
