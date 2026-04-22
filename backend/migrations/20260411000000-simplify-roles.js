'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. 备份旧角色
    await queryInterface.addColumn('users', 'backup_role', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '角色迁移前的备份'
    });
    await queryInterface.sequelize.query('UPDATE users SET backup_role = role');

    // 2. 执行迁移
    // reviewer → admin
    await queryInterface.sequelize.query("UPDATE users SET role = 'admin' WHERE role = 'reviewer'");
    // measurer → field_worker
    await queryInterface.sequelize.query("UPDATE users SET role = 'field_worker' WHERE role = 'measurer'");
    // installer → field_worker
    await queryInterface.sequelize.query("UPDATE users SET role = 'field_worker' WHERE role = 'installer'");
    // checker → admin
    await queryInterface.sequelize.query("UPDATE users SET role = 'admin' WHERE role = 'checker'");

    console.log('角色迁移完成');
  },

  down: async (queryInterface, Sequelize) => {
    // 回滚: 恢复备份角色
    await queryInterface.sequelize.query('UPDATE users SET role = backup_role WHERE backup_role IS NOT NULL');
    // 移除备份字段
    await queryInterface.removeColumn('users', 'backup_role');
    console.log('角色迁移已回滚');
  }
};
