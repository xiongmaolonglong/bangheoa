const jwt = require('jsonwebtoken');
require('dotenv').config();

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const _warned = Object.create(null);

function ensureSecret() {
  if (!JWT_SECRET) {
    if (!_warned.secret) {
      console.warn('[安全警告] 未设置 JWT_SECRET 环境变量，将使用随机密钥（重启后 Token 失效）');
      _warned.secret = 1;
    }
    return crypto.randomBytes(64).toString('hex');
  }

  const WEAK_PATTERNS = ['default_secret', 'your_jwt_secret', 'change_me', 'secret'];
  if (WEAK_PATTERNS.some(p => JWT_SECRET.toLowerCase().includes(p)) && !_warned.weak) {
    console.warn('[安全警告] JWT_SECRET 使用了弱密钥，请更换为随机强密钥');
    _warned.weak = 1;
  }

  return JWT_SECRET;
}

/**
 * JWT 工具类
 */
const jwtUtil = {
  /**
   * 生成 Token
   * @param {Object} payload - 载荷数据
   * @returns {String} token
   */
  generateToken: (payload) => {
    return jwt.sign(payload, ensureSecret(), { expiresIn: JWT_EXPIRES_IN });
  },

  /**
   * 验证 Token
   * @param {String} token
   * @returns {Object|null} 解码后的载荷
   */
  verifyToken: (token) => {
    try {
      return jwt.verify(token, ensureSecret());
    } catch (error) {
      return null;
    }
  },

  /**
   * 从请求头获取 Token
   * @param {Object} req
   * @returns {String|null}
   */
  getTokenFromHeader: (req) => {
    const authorization = req.headers.authorization;
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }
    return null;
  }
};

module.exports = jwtUtil;
