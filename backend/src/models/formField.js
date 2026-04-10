const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { FIELD_TYPES } = require('../config/constants');

class FormField extends Model {}

FormField.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '分组ID'
    },
    field_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '字段名称'
    },
    field_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '字段标识'
    },
    field_type: {
      type: DataTypes.ENUM(Object.values(FIELD_TYPES)),
      allowNull: false,
      defaultValue: FIELD_TYPES.TEXT,
      comment: '字段类型'
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '选项配置（下拉/单选/复选）',
      get() {
        const value = this.getDataValue('options');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    },
    default_value: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '默认值'
    },
    placeholder: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '占位文本'
    },
    is_required: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否必填：1是 0否'
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
    modelName: 'FormField',
    tableName: 'form_fields',
    comment: '表单字段表',
    indexes: [
      { unique: true, fields: ['group_id', 'field_key'] }
    ]
  }
);

module.exports = FormField;
