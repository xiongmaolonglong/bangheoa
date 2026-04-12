const AddressDict = require('../models/AddressDict');
const { success, error } = require('../utils/response');

/**
 * 序列化地址节点（排除内部字段）
 */
function serializeAddress(addr, includeChildren = false) {
  const node = {
    code: addr.code,
    name: addr.name,
    level: addr.level,
    parent_code: addr.parent_code,
  };
  if (includeChildren && addr.children) {
    node.children = addr.children.map(child => serializeAddress(child, true));
  }
  return node;
}

// ==================== 获取地址列表 ====================

async function getAddressList(req, res) {
  try {
    const { parent_code, level } = req.query;

    const where = {};
    if (parent_code !== undefined) {
      where.parent_code = parent_code;
    }
    if (level) {
      where.level = level;
    }

    const addresses = await AddressDict.findAll({
      where,
      order: [['code', 'ASC']],
    });

    return success(res, addresses.map(a => serializeAddress(a)));
  } catch (err) {
    console.error('Get address list error:', err);
    return error(res, '获取地址列表失败');
  }
}

// ==================== 获取完整地址树 ====================

async function getAddressTree(req, res) {
  try {
    const provinces = await AddressDict.findAll({
      where: { level: 'province' },
      order: [['code', 'ASC']],
    });

    const tree = [];
    for (const province of provinces) {
      const cities = await AddressDict.findAll({
        where: { parent_code: province.code },
        order: [['code', 'ASC']],
      });

      const provinceNode = serializeAddress(province, true);
      provinceNode.children = [];

      for (const city of cities) {
        const districts = await AddressDict.findAll({
          where: { parent_code: city.code },
          order: [['code', 'ASC']],
        });

        const cityNode = serializeAddress(city, true);
        cityNode.children = [];

        for (const district of districts) {
          const streets = await AddressDict.findAll({
            where: { parent_code: district.code },
            order: [['code', 'ASC']],
          });

          const districtNode = serializeAddress(district, true);
          districtNode.children = streets.map(s => serializeAddress(s));
          cityNode.children.push(districtNode);
        }

        provinceNode.children.push(cityNode);
      }

      tree.push(provinceNode);
    }

    return success(res, tree);
  } catch (err) {
    console.error('Get address tree error:', err);
    return error(res, '获取地址树失败');
  }
}

// ==================== 单个地址详情 ====================

async function getAddressDetail(req, res) {
  try {
    const { code } = req.params;

    const address = await AddressDict.findOne({ where: { code } });
    if (!address) {
      return error(res, '地址不存在', 404);
    }

    return success(res, serializeAddress(address));
  } catch (err) {
    console.error('Get address detail error:', err);
    return error(res, '获取地址详情失败');
  }
}

// ==================== 获取地址子级 ====================

async function getAddressChildren(req, res) {
  try {
    const { code } = req.params;

    const parent = await AddressDict.findOne({ where: { code } });
    if (!parent) {
      return error(res, '地址不存在', 404);
    }

    const children = await AddressDict.findAll({
      where: { parent_code: code },
      order: [['code', 'ASC']],
    });

    return success(res, children.map(c => serializeAddress(c)));
  } catch (err) {
    console.error('Get address children error:', err);
    return error(res, '获取地址子级失败');
  }
}

// ==================== 获取地址路径 ====================

async function getAddressPath(req, res) {
  try {
    const { code } = req.params;

    const path = [];
    let currentCode = code;

    while (currentCode) {
      const addr = await AddressDict.findOne({ where: { code: currentCode } });
      if (!addr) {
        return error(res, '地址不存在', 404);
      }

      path.unshift(serializeAddress(addr));
      currentCode = addr.parent_code;
    }

    return success(res, path);
  } catch (err) {
    console.error('Get address path error:', err);
    return error(res, '获取地址路径失败');
  }
}

module.exports = {
  getAddressList,
  getAddressTree,
  getAddressDetail,
  getAddressChildren,
  getAddressPath,
};
