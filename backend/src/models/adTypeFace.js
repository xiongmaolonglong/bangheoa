const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AdTypeFace extends Model {}

AdTypeFace.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ad_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '广告类型ID'
    },
    face_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '关联的面配置ID'
    },
    face_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '面名称'
    },
    face_icon: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '面图标/封面图片URL'
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '属性模板ID'
    },
    inline_attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '内联属性配置（当不使用模板时）',
      get() {
        const value = this.getDataValue('inline_attributes');
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
    modelName: 'AdTypeFace',
    tableName: 'ad_type_faces',
    comment: '广告类型面配置表'
  }
);

module.exports = AdTypeFace;
