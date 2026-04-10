const https = require('https');
const { success, error } = require('../utils/response');
const { SystemConfig } = require('../models');

/**
 * 获取高德地图 API Key
 * 优先从数据库配置读取，否则从环境变量
 */
const getAmapKey = async () => {
  try {
    const config = await SystemConfig.findOne({
      where: { config_key: 'amap_web_key' }
    });
    if (config && config.config_value) {
      return config.config_value;
    }
  } catch (e) {
    console.error('读取高德地图配置失败:', e);
  }
  return process.env.AMAP_KEY || 'your_amap_key_here';
};

/**
 * HTTPS GET 请求封装
 */
const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON解析失败'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
};

/**
 * 逆地理编码 - 根据经纬度获取详细地址
 * GET /api/v1/location/reverse?lng=113.123&lat=23.456
 */
const reverseGeocode = async (req, res) => {
  try {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      return error(res, '请提供经纬度参数', 400);
    }

    // 验证坐标范围
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || isNaN(latitude)) {
      return error(res, '经纬度格式错误', 400);
    }

    // 中国境内坐标范围验证
    if (longitude < 73 || longitude > 135 || latitude < 18 || latitude > 54) {
      return error(res, '坐标超出中国境内范围', 400);
    }

    const AMAP_KEY = await getAmapKey();

    // 检查是否配置了高德 API Key
    if (!AMAP_KEY || AMAP_KEY === 'your_amap_key_here') {
      // 如果没有配置 API Key，返回一个简单的提示地址
      return success(res, {
        address: `位置坐标: ${longitude.toFixed(6)}, ${latitude.toFixed(6)}（请配置高德API Key以获取详细地址）`,
        province: '',
        city: '',
        district: '',
        township: '',
        street: '',
        streetNumber: '',
        lng: longitude,
        lat: latitude
      });
    }

    // 调用高德地图逆地理编码 API
    const apiUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}&extensions=base&output=json`;
    const response = await httpsGet(apiUrl);

    if (response.status !== '1') {
      console.error('高德API返回错误:', response);
      return error(res, response.info || '逆地理编码失败', 500);
    }

    const regeocode = response.regeocode;
    const address = regeocode?.formatted_address || '';
    const addressComponent = regeocode?.addressComponent || {};

    // 返回详细地址信息
    return success(res, {
      address,
      province: addressComponent.province || '',
      city: addressComponent.city || '',
      district: addressComponent.district || '',
      township: addressComponent.township || '',
      street: addressComponent.streetNumber?.street || '',
      streetNumber: addressComponent.streetNumber?.number || '',
      lng: longitude,
      lat: latitude
    });
  } catch (e) {
    console.error('逆地理编码失败:', e.message);
    if (e.message === '请求超时') {
      return error(res, '请求超时，请稍后重试', 504);
    }
    return error(res, '逆地理编码服务异常', 500);
  }
};

/**
 * 地理编码 - 根据地址获取经纬度
 * GET /api/v1/location/geocode?address=xxx
 */
const geocode = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return error(res, '请提供地址参数', 400);
    }

    const AMAP_KEY = await getAmapKey();

    if (!AMAP_KEY || AMAP_KEY === 'your_amap_key_here') {
      return success(res, {
        address,
        message: '请配置高德API Key以获取坐标'
      });
    }

    const apiUrl = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&output=json`;
    const response = await httpsGet(apiUrl);

    if (response.status !== '1') {
      console.error('高德API返回错误:', response);
      return error(res, response.info || '地理编码失败', 500);
    }

    const geocodes = response.geocodes;
    if (!geocodes || geocodes.length === 0) {
      return success(res, { address, lng: null, lat: null, message: '未找到匹配的地址' });
    }

    const location = geocodes[0].location.split(',');
    return success(res, {
      address: geocodes[0].formatted_address || address,
      lng: parseFloat(location[0]),
      lat: parseFloat(location[1])
    });
  } catch (e) {
    console.error('地理编码失败:', e.message);
    if (e.message === '请求超时') {
      return error(res, '请求超时，请稍后重试', 504);
    }
    return error(res, '地理编码服务异常', 500);
  }
};

/**
 * 批量地理编码 - 为所有没有坐标的订单解析地址
 * POST /api/v1/location/batch-geocode
 */
const batchGeocode = async (req, res) => {
  try {
    const { Order } = require('../models');
    const { Op } = require('sequelize');

    // 找出没有坐标但有地址的订单
    const orders = await Order.findAll({
      where: {
        address: { [Op.ne]: null, [Op.ne]: '' },
        [Op.or]: [
          { latitude: null },
          { longitude: null }
        ]
      },
      attributes: ['id', 'order_no', 'address'],
      limit: 50 // 每次最多处理50个
    });

    if (orders.length === 0) {
      return success(res, { processed: 0, message: '没有需要解析的订单' });
    }

    const AMAP_KEY = await getAmapKey();

    if (!AMAP_KEY || AMAP_KEY === 'your_amap_key_here') {
      return error(res, '请先配置高德地图 Web 服务 API Key', 400);
    }

    const results = { success: 0, failed: 0, details: [] };

    // 逐个解析地址
    for (const order of orders) {
      try {
        const apiUrl = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(order.address)}&output=json`;
        const response = await httpsGet(apiUrl);

        if (response.status === '1' && response.geocodes && response.geocodes.length > 0) {
          const location = response.geocodes[0].location.split(',');
          const lng = parseFloat(location[0]);
          const lat = parseFloat(location[1]);

          // 更新订单坐标
          await order.update({ latitude: lat, longitude: lng });
          results.success++;
          results.details.push({ id: order.id, order_no: order.order_no, address: order.address, lng, lat });
        } else {
          results.failed++;
          results.details.push({ id: order.id, order_no: order.order_no, address: order.address, error: '解析失败' });
        }

        // 延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        results.failed++;
        results.details.push({ id: order.id, order_no: order.order_no, address: order.address, error: e.message });
      }
    }

    return success(res, { processed: orders.length, ...results });
  } catch (e) {
    console.error('批量地理编码失败:', e.message);
    return error(res, '批量地理编码服务异常', 500);
  }
};

module.exports = {
  reverseGeocode,
  geocode,
  batchGeocode
};
