const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class FormGroup extends Model {}

FormGroup.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分组名称'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    }
  },
  {
    sequelize,
    modelName: 'FormGroup',
    tableName: 'form_groups',
    comment: '表单分组表'
  }
);

module.exports = FormGroup;
