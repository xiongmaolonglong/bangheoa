const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DesignCdrFile extends Model {}

DesignCdrFile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    design_scheme_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '设计方案ID'
    },
    measure_face_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '测量面ID（可选）'
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '文件URL'
    },
    file_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '文件名'
    }
  },
  {
    sequelize,
    modelName: 'DesignCdrFile',
    tableName: 'design_cdr_files',
    comment: 'CDR源文件表'
  }
);

module.exports = DesignCdrFile;
