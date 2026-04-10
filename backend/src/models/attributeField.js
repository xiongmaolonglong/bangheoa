const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AttributeField extends Model {}

AttributeField.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属模板ID'
    },
    field_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '属性名称'
    },
    field_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '属性标识'
    },
    field_type: {
      type: DataTypes.ENUM('text', 'number', 'select', 'radio', 'checkbox', 'textarea', 'date'),
      allowNull: false,
      defaultValue: 'text',
      comment: '字段类型'
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '选项配置',
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
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '单位'
    },
    is_required: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否必填'
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
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态'
    }
  },
  {
    sequelize,
    modelName: 'AttributeField',
    tableName: 'attribute_fields',
    comment: '属性字段表',
    indexes: [
      { unique: true, fields: ['template_id', 'field_key'] }
    ]
  }
);

module.exports = AttributeField;
