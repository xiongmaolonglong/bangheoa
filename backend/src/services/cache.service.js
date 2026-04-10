/**
 * 缓存服务
 * 用于缓存高频访问数据
 */

const NodeCache = require('node-cache');

// 默认缓存实例（10分钟过期）
const defaultCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

// 长期缓存实例（1小时过期）
const longCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false
});

/**
 * 获取或设置缓存
 * @param {string} key - 缓存键
 * @param {Function} fetcher - 数据获取函数
 * @param {number} ttl - 过期时间（秒）
 */
async function getOrSet(key, fetcher, ttl = 600) {
  const cached = defaultCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetcher();
  defaultCache.set(key, data, ttl);
  return data;
}

/**
 * 缓存中间件
 * @param {string} key - 缓存键前缀
 * @param {number} ttl - 过期时间（秒）
 */
function cacheMiddleware(key, ttl = 600) {
  return async (req, res, next) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }

    // 构建缓存键
    const cacheKey = `${key}:${req.originalUrl}`;

    // 尝试从缓存获取
    const cached = defaultCache.get(cacheKey);
    if (cached !== undefined) {
      return res.json(cached);
    }

    // 拦截 res.json 方法
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // 只缓存成功的响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        defaultCache.set(cacheKey, body, ttl);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * 清除缓存
 * @param {string} pattern - 缓存键模式（支持 * 通配符）
 */
function clearCache(pattern) {
  if (pattern.includes('*')) {
    // 模式匹配删除
    const keys = defaultCache.keys();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    keys.forEach(key => {
      if (regex.test(key)) {
        defaultCache.del(key);
      }
    });
  } else {
    defaultCache.del(pattern);
  }
}

/**
 * 获取缓存值
 * @param {string} key - 缓存键
 * @returns {any} 缓存值
 */
function get(key) {
  return defaultCache.get(key);
}

/**
 * 设置缓存值
 * @param {string} key - 缓存键
 * @param {any} value - 缓存值
 * @param {number} ttl - 过期时间（秒）
 */
function set(key, value, ttl = 600) {
  return defaultCache.set(key, value, ttl);
}

/**
 * 清除指定键的缓存
 * @param {string} key - 缓存键
 */
function del(key) {
  return defaultCache.del(key);
}

/**
 * 清除所有缓存
 */
function clearAllCache() {
  defaultCache.flushAll();
  longCache.flushAll();
}

/**
 * 获取缓存统计信息
 */
function getStats() {
  return {
    default: defaultCache.getStats(),
    long: longCache.getStats()
  };
}

module.exports = {
  defaultCache,
  longCache,
  getOrSet,
  get,
  set,
  del,
  cacheMiddleware,
  clearCache,
  clearAllCache,
  getStats
};