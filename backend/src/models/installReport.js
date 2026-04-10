const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class InstallReport extends Model {}

InstallReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '订单ID'
    },
    installer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '安装员ID'
    },
    install_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '安装日期'
    },
    before_photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '安装前照片',
      get() {
        const value = this.getDataValue('before_photos');
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return value; }
        }
        return value;
      }
    },
    after_photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '安装后照片',
      get() {
        const value = this.getDataValue('after_photos');
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return value; }
        }
        return value;
      }
    },
    overall_photos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '整体效果照片',
      get() {
        const value = this.getDataValue('overall_photos');
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return value; }
        }
        return value;
      }
    },
    face_status: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '各面安装状态',
      get() {
        const value = this.getDataValue('face_status');
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return value; }
        }
        return value;
      }
    },
    has_issue: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否有遗留问题：1是 0否'
    },
    issue_desc: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '问题说明'
    },
    customer_satisfaction: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '客户满意度：satisfied / basic / unsatisfied'
    },
    customer_sign: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '客户签字图片'
    },
    customer_remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '客户备注'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  },
  {
    sequelize,
    modelName: 'InstallReport',
    tableName: 'install_reports',
    comment: '安装报告表'
  }
);

module.exports = InstallReport;
