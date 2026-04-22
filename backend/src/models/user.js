const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');

class User extends Model {
  /**
   * 密码加密
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * 验证密码
   */
  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  /**
   * 获取用户安全信息（不含密码）
   */
  toSafeJSON() {
    const values = this.toJSON();
    delete values.password;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    openid: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '微信openid',
      unique: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '用户名'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '密码'
    },
    real_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '真实姓名'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号'
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '头像'
    },
    role: {
      type: DataTypes.ENUM(Object.values(USER_ROLES)),
      allowNull: false,
      defaultValue: USER_ROLES.FIELD_WORKER,
      comment: '角色'
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '部门ID'
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '小组ID'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '客户标签，逗号分隔'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    },
    contacts: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '联系记录JSON'
    },
    salesman_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '默认业务员姓名'
    },
    salesman_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '默认业务员电话'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    comment: '用户表',
    hooks: {
      // 创建前加密密码
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await User.hashPassword(user.password);
        }
      },
      // 更新前加密密码
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          user.password = await User.hashPassword(user.password);
        }
      }
    }
  }
);

module.exports = User;
