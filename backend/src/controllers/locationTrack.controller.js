const { success, error } = require('../utils/response');
const { UserLocationTrack, User, Order } = require('../models');
const { Op, Sequelize } = require('sequelize');

/**
 * Haversine 公式计算两点距离（米）
 */
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * 上报定位数据
 * POST /api/v1/location/report
 */
const reportLocation = async (req, res) => {
  try {
    const { order_id, latitude, longitude, accuracy, speed, type, battery } = req.body;

    if (!latitude || !longitude) {
      return error(res, '请提供经纬度', 400);
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return error(res, '经纬度格式错误', 400);
    }

    // 如果是签到/签退，计算距订单距离
    let distanceToOrder = null;
    if ((type === 'checkin' || type === 'checkout') && order_id) {
      const order = await Order.findByPk(order_id, {
        attributes: ['latitude', 'longitude']
      });
      if (order && order.latitude && order.longitude) {
        distanceToOrder = calcDistance(lat, lng, parseFloat(order.latitude), parseFloat(order.longitude));
      }
    }

    await UserLocationTrack.create({
      user_id: req.user.id,
      order_id: order_id || null,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy || null,
      speed: speed || null,
      type: type || 'track',
      distance_to_order: distanceToOrder,
      battery: battery || null
    });

    return success(res, {
      distance_to_order: distanceToOrder,
      checkin_allowed: distanceToOrder === null || distanceToOrder <= 500
    });
  } catch (e) {
    console.error('定位上报失败:', e.message);
    return error(res, '定位上报失败', 500);
  }
};

/**
 * 获取所有在线追踪中的外勤人员位置（最新一条轨迹）
 * GET /api/v1/location/trackers?role=installer,measurer
 */
const getTrackers = async (req, res) => {
  try {
    const { role } = req.query;
    const ONLINE_THRESHOLD = 15 * 60 * 1000; // 15分钟内未上报视为离线

    const where = { status: 1 };
    if (role) {
      const roles = role.split(',').map(r => r.trim());
      where.role = roles.length === 1 ? roles[0] : { [Op.in]: roles };
    }

    // 获取所有外勤人员
    const workers = await User.findAll({
      where,
      attributes: ['id', 'real_name', 'role', 'phone', 'avatar']
    });

    if (workers.length === 0) {
      return success(res, { trackers: [] });
    }

    const userIds = workers.map(w => w.id);
    const cutoffTime = new Date(Date.now() - ONLINE_THRESHOLD);

    // 查询每人最新一条轨迹
    const latestTracks = await UserLocationTrack.findAll({
      where: {
        user_id: userIds,
        created_at: { [Op.gte]: cutoffTime }
      },
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_no', 'status'] }
      ],
      order: [['user_id', 'ASC'], ['created_at', 'DESC']],
      attributes: ['user_id', 'latitude', 'longitude', 'accuracy', 'speed', 'type', 'distance_to_order', 'battery', 'created_at']
    });

    // 每人只取最新一条
    const userLatest = {};
    latestTracks.forEach(t => {
      if (!userLatest[t.user_id]) {
        userLatest[t.user_id] = t;
      }
    });

    // 获取每人今天轨迹点数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const trackCounts = await UserLocationTrack.findAll({
      where: {
        user_id: userIds,
        created_at: { [Op.gte]: todayStart }
      },
      attributes: [
        'user_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['user_id']
    });
    const countMap = {};
    trackCounts.forEach(t => {
      countMap[t.user_id] = t.get('count');
    });

    const now = Date.now();
    const trackers = workers.map(w => {
      const track = userLatest[w.id];
      const isOnline = track && (now - new Date(track.created_at).getTime()) < ONLINE_THRESHOLD;
      return {
        user_id: w.id,
        real_name: w.real_name,
        role: w.role,
        phone: w.phone,
        avatar: w.avatar,
        online: !!isOnline,
        last_update: track?.created_at || null,
        last_active_min: track ? Math.round((now - new Date(track.created_at).getTime()) / 60000) : null,
        latitude: track ? parseFloat(track.latitude) : null,
        longitude: track ? parseFloat(track.longitude) : null,
        accuracy: track?.accuracy || null,
        speed: track?.speed || null,
        type: track?.type || null,
        distance_to_order: track?.distance_to_order || null,
        battery: track?.battery || null,
        today_track_count: countMap[w.id] || 0,
        current_order: track?.order || null
      };
    });

    return success(res, { trackers });
  } catch (e) {
    console.error('获取追踪列表失败:', e.message);
    return error(res, '获取追踪列表失败', 500);
  }
};

/**
 * 获取某人轨迹（今天或指定日期）
 * GET /api/v1/location/track/:userId?date=2026-04-10
 */
const getUserTrack = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    let startDate, endDate;
    if (date) {
      startDate = new Date(date + 'T00:00:00');
      endDate = new Date(date + 'T23:59:59');
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const tracks = await UserLocationTrack.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_no', 'status'] }
      ],
      order: [['created_at', 'ASC']],
      limit: 2000
    });

    const user = await User.findByPk(userId, {
      attributes: ['id', 'real_name', 'role', 'avatar']
    });

    return success(res, {
      user,
      date: date || new Date().toISOString().split('T')[0],
      tracks: tracks.map(t => ({
        id: t.id,
        latitude: parseFloat(t.latitude),
        longitude: parseFloat(t.longitude),
        accuracy: t.accuracy,
        speed: t.speed,
        type: t.type,
        distance_to_order: t.distance_to_order,
        battery: t.battery,
        created_at: t.created_at,
        order: t.order
      }))
    });
  } catch (e) {
    console.error('获取轨迹失败:', e.message);
    return error(res, '获取轨迹失败', 500);
  }
};

/**
 * 批量上报（减少请求次数）
 * POST /api/v1/location/batch-report
 */
const batchReportLocation = async (req, res) => {
  try {
    const { tracks } = req.body;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return error(res, '请提供定位数据', 400);
    }

    const records = tracks.map(t => ({
      user_id: req.user.id,
      order_id: t.order_id || null,
      latitude: parseFloat(t.latitude),
      longitude: parseFloat(t.longitude),
      accuracy: t.accuracy || null,
      speed: t.speed || null,
      type: t.type || 'track',
      distance_to_order: t.distance_to_order || null,
      battery: t.battery || null,
      created_at: t.timestamp ? new Date(t.timestamp) : new Date()
    }));

    await UserLocationTrack.bulkCreate(records);

    return success(res, { received: tracks.length });
  } catch (e) {
    console.error('批量定位上报失败:', e.message);
    return error(res, '批量定位上报失败', 500);
  }
};

module.exports = {
  reportLocation,
  getTrackers,
  getUserTrack,
  batchReportLocation
};
