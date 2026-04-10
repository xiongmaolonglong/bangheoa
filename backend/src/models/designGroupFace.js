const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DesignGroupFace extends Model {}

DesignGroupFace.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    design_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '设计图组ID'
    },
    measure_face_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '测量面ID'
    }
  },
  {
    sequelize,
    modelName: 'DesignGroupFace',
    tableName: 'design_group_faces',
    comment: '设计图组关联面表'
  }
);

module.exports = DesignGroupFace;
