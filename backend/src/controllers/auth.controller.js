const bcrypt = require('bcryptjs');
const jwtUtil = require('../utils/jwt');
const response = require('../utils/response');
const { User, Group, District, Province } = require('../models');

// 微信小程序配置
const WX_APPID = process.env.WX_APPID;
const WX_SECRET = process.env.WX_SECRET;

/**
 * 认证控制器
 */
const authController = {
  /**
   * 用户注册
   */
  register: async (req, res) => {
    try {
      const { username, password, realName, role, phone } = req.body;

      // 验证必填字段
      if (!username || !password || !realName) {
        return response.error(res, '用户名、密码和真实姓名不能为空');
      }

      // 检查用户名是否已存在
      const existUser = await User.findOne({ where: { username } });
      if (existUser) {
        return response.error(res, '用户名已存在');
      }

      // 密码加密
      const hashedPassword = await User.hashPassword(password);

      // 创建用户
      const user = await User.create({
        username,
        password: hashedPassword,
        real_name: realName,
        role: role || 'designer',
        phone
      });

      return response.success(res, { id: user.id, username: user.username }, '注册成功');
    } catch (error) {
      console.error('注册错误:', error);
      return response.serverError(res, '注册失败');
    }
  },

  /**
   * 用户登录
   */
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      // 验证必填字段
      if (!username || !password) {
        return response.error(res, '用户名和密码不能为空');
      }

      // 查找用户（包含地区信息）
      const user = await User.findOne({
        where: { username },
        include: [
          {
            model: Group,
            as: 'group',
            include: [
              {
                model: District,
                as: 'district',
                include: [
                  {
                    model: Province,
                    as: 'province'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!user) {
        return response.error(res, '用户名或密码错误');
      }

      // 检查用户状态
      if (user.status !== 1) {
        return response.error(res, '账号已被禁用');
      }

      // 验证密码
      const isValid = await user.validatePassword(password);

      if (!isValid) {
        return response.error(res, '用户名或密码错误');
      }

      // 生成 Token
      const token = jwtUtil.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.real_name
      });

      // 更新最后登录时间
      await user.update({ last_login_at: new Date() });

      return response.success(res, {
        token,
        user: user.toSafeJSON()
      }, '登录成功');
    } catch (error) {
      console.error('登录错误:', error);
      return response.serverError(res, '登录失败');
    }
  },

  /**
   * 获取当前用户信息
   */
  profile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Group,
            as: 'group',
            include: [
              {
                model: District,
                as: 'district',
                include: [
                  {
                    model: Province,
                    as: 'province'
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      return response.success(res, user);
    } catch (error) {
      console.error('获取用户信息错误:', error);
      return response.serverError(res, '获取用户信息失败');
    }
  },

  /**
   * 修改密码
   */
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return response.error(res, '请输入旧密码和新密码');
      }

      if (newPassword.length < 6) {
        return response.error(res, '新密码长度不能少于6位');
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      // 验证旧密码
      const isValid = await user.validatePassword(oldPassword);

      if (!isValid) {
        return response.error(res, '旧密码错误');
      }

      // 更新密码
      await user.update({ password: newPassword });

      return response.success(res, null, '密码修改成功');
    } catch (error) {
      console.error('修改密码错误:', error);
      return response.serverError(res, '修改密码失败');
    }
  },

  /**
   * 退出登录
   */
  logout: async (req, res) => {
    // JWT 无状态，客户端删除 Token 即可
    return response.success(res, null, '退出成功');
  },

  /**
   * 微信小程序登录
   */
  wxLogin: async (req, res) => {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return response.error(res, '缺少登录凭证');
      }

      // 调用微信接口获取 openid
      const wxRes = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`
      );
      const wxData = await wxRes.json();

      if (wxData.errcode) {
        console.error('微信登录失败:', wxData);
        return response.error(res, '微信登录失败: ' + wxData.errmsg);
      }

      const { openid, session_key } = wxData;

      // 查找或创建用户
      let user = await User.findOne({
        where: { openid },
        include: [
          {
            model: Group,
            as: 'group',
            include: [{ model: District, as: 'district', include: [{ model: Province, as: 'province' }] }]
          }
        ]
      });

      if (!user) {
        // 创建新用户（客户角色）
        const nickname = userInfo?.nickName || '微信用户';
        user = await User.create({
          openid,
          username: `wx_${openid.substring(0, 16)}`,
          password: null,
          real_name: nickname,
          avatar: userInfo?.avatarUrl,
          role: 'customer', // 小程序用户默认为客户
          status: 1
        });

        // 重新查询包含关联
        user = await User.findByPk(user.id, {
          include: [
            {
              model: Group,
              as: 'group',
              include: [{ model: District, as: 'district', include: [{ model: Province, as: 'province' }] }]
            }
          ]
        });
      } else {
        // 更新用户信息
        if (userInfo) {
          await user.update({
            avatar: userInfo.avatarUrl || user.avatar,
            real_name: userInfo.nickName || user.real_name
          });
        }
      }

      // 检查用户状态
      if (user.status !== 1) {
        return response.error(res, '账号已被禁用');
      }

      // 生成 Token
      const token = jwtUtil.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.real_name
      });

      // 更新最后登录时间
      await user.update({ last_login_at: new Date() });

      return response.success(res, {
        token,
        user: user.toSafeJSON(),
        isNewUser: !user.password // 标记是否需要设置密码绑定
      }, '登录成功');
    } catch (error) {
      console.error('微信登录错误:', error);
      return response.serverError(res, '登录失败');
    }
  },

  /**
   * 绑定已有账号（将微信openid绑定到已有账号）
   */
  bindAccount: async (req, res) => {
    try {
      const { username, password } = req.body;
      const userId = req.user.id;

      if (!username || !password) {
        return response.error(res, '用户名和密码不能为空');
      }

      // 查找已有账号
      const existUser = await User.findOne({ where: { username } });
      if (!existUser) {
        return response.error(res, '用户名或密码错误');
      }

      // 验证密码
      const isValid = await existUser.validatePassword(password);
      if (!isValid) {
        return response.error(res, '用户名或密码错误');
      }

      // 获取当前微信用户
      const wxUser = await User.findByPk(userId);
      if (!wxUser || !wxUser.openid) {
        return response.error(res, '当前账号无效');
      }

      // 将 openid 绑定到已有账号
      await existUser.update({ openid: wxUser.openid });

      // 删除临时微信账号
      await wxUser.destroy();

      // 生成新 token
      const token = jwtUtil.generateToken({
        id: existUser.id,
        username: existUser.username,
        role: existUser.role,
        realName: existUser.real_name
      });

      return response.success(res, {
        token,
        user: existUser.toSafeJSON()
      }, '绑定成功');
    } catch (error) {
      console.error('绑定账号错误:', error);
      return response.serverError(res, '绑定失败');
    }
  }
};

module.exports = authController;
