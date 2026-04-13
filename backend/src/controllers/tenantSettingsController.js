const { Tenant } = require('../models');
const { success, error } = require('../utils/response');

/**
 * GET /api/v1/tenant/settings
 * 获取租户系统配置（项目类型、材料字典等）
 */
async function getSettings(req, res) {
  try {
    const tenant = await Tenant.findByPk(req.user.tenant_id, {
      attributes: ['id', 'settings'],
    });

    const settings = tenant.settings || {
      project_types: [
        { label: '门头招牌', value: 'signboard', enabled: true, sort: 1 },
        { label: '室内广告', value: 'indoor', enabled: true, sort: 2 },
        { label: '灯箱', value: 'lightbox', enabled: true, sort: 3 },
        { label: 'LED显示屏', value: 'led', enabled: true, sort: 4 },
        { label: '其他', value: 'other', enabled: true, sort: 5 },
      ],
      material_dict: [],
    };

    return success(res, settings);
  } catch (err) {
    console.error('getSettings error:', err);
    return error(res, '获取配置失败');
  }
}

/**
 * PUT /api/v1/tenant/settings
 * 更新租户系统配置
 */
async function updateSettings(req, res) {
  try {
    const { project_types, material_dict } = req.body;

    const tenant = await Tenant.findByPk(req.user.tenant_id);
    const currentSettings = tenant.settings || {};

    const updates = { ...currentSettings };
    if (project_types !== undefined) updates.project_types = project_types;
    if (material_dict !== undefined) updates.material_dict = material_dict;

    await tenant.update({ settings: updates });

    return success(res, updates, '配置更新成功');
  } catch (err) {
    console.error('updateSettings error:', err);
    return error(res, '更新配置失败');
  }
}

/**
 * PATCH /api/v1/tenant/settings/:key
 * 更新单个配置项
 */
async function updateSettingKey(req, res) {
  try {
    const { key } = req.params;
    const value = req.body.value;

    const tenant = await Tenant.findByPk(req.user.tenant_id);
    const currentSettings = tenant.settings || {};
    currentSettings[key] = value;

    await tenant.update({ settings: currentSettings });

    return success(res, { [key]: value }, '配置更新成功');
  } catch (err) {
    console.error('updateSettingKey error:', err);
    return error(res, '更新配置失败');
  }
}

module.exports = { getSettings, updateSettings, updateSettingKey };
