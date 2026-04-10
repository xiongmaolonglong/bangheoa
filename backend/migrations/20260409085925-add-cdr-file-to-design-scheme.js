'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('design_schemes', 'cdr_file', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'CDR源文件URL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('design_schemes', 'cdr_file');
  }
};
