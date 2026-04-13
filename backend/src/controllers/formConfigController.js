const { FormConfig } = require('../models');
const { success, error } = require('../utils/response');

// ==================== 默认字段配置 ====================

// 测量代录表单默认字段
const DEFAULT_MEASUREMENT_FIELDS = [
  { field_key: 'length', field_label: '长度（米）', field_type: 'number', required: true, visible: true, sort_order: 1, placeholder: '请输入长度' },
  { field_key: 'width', field_label: '宽度（米）', field_type: 'number', required: true, visible: true, sort_order: 2, placeholder: '请输入宽度' },
  { field_key: 'height', field_label: '高度（米）', field_type: 'number', required: false, visible: true, sort_order: 3, placeholder: '请输入高度' },
  { field_key: 'area', field_label: '面积（平方米）', field_type: 'number', required: false, visible: true, sort_order: 4, placeholder: '长×宽，可自动计算' },
  { field_key: 'material_type', field_label: '材料类型', field_type: 'select', required: true, visible: true, sort_order: 5,
    options: [
      { label: '喷绘布', value: 'spray_cloth' },
      { label: '亚克力板', value: 'acrylic' },
      { label: '铝塑板', value: 'aluminum' },
      { label: '不锈钢', value: 'stainless' },
      { label: 'LED模组', value: 'led_module' },
      { label: '其他', value: 'other' },
    ]
  },
  { field_key: 'photos', field_label: '现场照片', field_type: 'image', required: true, visible: true, sort_order: 6 },
  { field_key: 'remark', field_label: '备注说明', field_type: 'textarea', required: false, visible: true, sort_order: 7, placeholder: '现场特殊情况说明' },
  { field_key: 'operator_name', field_label: '操作人', field_type: 'text', required: false, visible: true, sort_order: 8, placeholder: '测量员姓名' },
  { field_key: 'measure_date', field_label: '测量日期', field_type: 'date', required: false, visible: true, sort_order: 9 },
];

// 工单创建表单默认字段（广告商可在系统配置中自定义）
const DEFAULT_WORK_ORDER_FIELDS = [
  { field_key: 'client_id', field_label: '甲方企业', field_type: 'client_select', required: true, visible: true, sort_order: 1, placeholder: '请选择甲方企业' },
  { field_key: 'title', field_label: '项目名称', field_type: 'text', required: true, visible: true, sort_order: 2, placeholder: '例如：XX门店招牌' },
  { field_key: 'project_type', field_label: '项目类型', field_type: 'select', required: false, visible: true, sort_order: 3,
    options: [
      { label: '门头招牌', value: 'signboard' },
      { label: '室内广告', value: 'indoor' },
      { label: '灯箱', value: 'lightbox' },
      { label: 'LED显示屏', value: 'led' },
      { label: '其他', value: 'other' },
    ]
  },
  { field_key: 'project_category', field_label: '项目分类', field_type: 'select', required: false, visible: true, sort_order: 4,
    options: [
      { label: '日常', value: 'daily' },
      { label: '门头招牌', value: 'storefront' },
      { label: '室内广告', value: 'indoor_ad' },
      { label: 'LED大屏', value: 'led_screen' },
      { label: '520', value: '520' },
      { label: '国庆', value: 'national_day' },
      { label: '春节', value: 'spring_festival' },
    ]
  },
  { field_key: 'address', field_label: '项目地址', field_type: 'address', required: false, visible: true, sort_order: 5, placeholder: '输入地址搜索自动解析', enable_parse: true },
  { field_key: 'description', field_label: '需求描述', field_type: 'textarea', required: false, visible: true, sort_order: 6, placeholder: '请描述项目需求' },
];

// ==================== 获取表单配置 ====================

/**
 * GET /api/v1/tenant/form-config/:formType
 * 获取指定表单的配置（返回渲染用的字段列表）
 */
async function getFormConfig(req, res) {
  try {
    const { formType } = req.params;
    const tenantId = req.user.tenant_id;

    // 查租户自定义配置
    const configs = await FormConfig.findAll({
      where: { tenant_id: tenantId, form_type: formType },
      order: [['sort_order', 'ASC']],
    });

    // 如果没有自定义配置，返回默认配置
    if (configs.length === 0) {
      const defaults = formType === 'work_order_create' ? DEFAULT_WORK_ORDER_FIELDS : DEFAULT_MEASUREMENT_FIELDS;
      return success(res, { fields: defaults, is_default: true });
    }

    const fields = configs.map(c => ({
      field_key: c.field_key,
      field_label: c.field_label,
      field_type: c.field_type,
      required: c.required,
      visible: c.visible,
      sort_order: c.sort_order,
      default_value: c.default_value,
      options: c.options,
      placeholder: c.placeholder,
      validation_rules: c.validation_rules,
      help_text: c.help_text,
      enable_parse: c.enable_parse,
    }));

    // 只返回 visible 的字段
    const visibleFields = fields.filter(f => f.visible);

    return success(res, { fields: visibleFields, is_default: false });
  } catch (err) {
    console.error('getFormConfig error:', err);
    return error(res, '获取表单配置失败');
  }
}

// ==================== 更新字段配置 ====================

/**
 * PUT /api/v1/tenant/form-config/:formType
 * 批量更新表单配置（传入完整字段列表，全量覆盖）
 * body: { fields: [{ field_key, field_label, field_type, required, visible, sort_order, options?, placeholder?, default_value?, validation_rules?, help_text? }] }
 */
async function updateFormConfig(req, res) {
  try {
    const { formType } = req.params;
    const { fields } = req.body;

    console.log('[DEBUG saveFormConfig] formType:', formType, 'fields count:', fields?.length);
    fields?.forEach(f => {
      if (f.options && Array.isArray(f.options) && f.options.length > 0) {
        console.log('[DEBUG] field', f.field_key, 'options:', JSON.stringify(f.options));
      }
    });

    if (!fields || !Array.isArray(fields)) {
      return error(res, 'fields 必须为数组', 400);
    }

    const tenantId = req.user.tenant_id;

    // 先删除该租户此表单类型的旧配置
    await FormConfig.destroy({
      where: { tenant_id: tenantId, form_type: formType },
    });

    // 批量写入新配置
    const records = fields.map((f, index) => ({
      tenant_id: tenantId,
      form_type: formType,
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      required: f.required || false,
      visible: f.visible !== false,
      sort_order: f.sort_order || index,
      default_value: f.default_value || null,
      options: f.options || null,
      placeholder: f.placeholder || null,
      validation_rules: f.validation_rules || null,
      help_text: f.help_text || null,
      enable_parse: f.enable_parse || false,
    }));

    await FormConfig.bulkCreate(records);

    // 验证：读回来看看
    const verify = await FormConfig.findAll({
      where: { tenant_id: tenantId, form_type: formType, field_type: 'select' },
      order: [['sort_order', 'ASC']],
    });
    verify.forEach(v => {
      console.log('[DEBUG verify] field_key:', v.field_key, 'options in DB:', JSON.stringify(v.options));
    });

    return success(res, { fields }, '表单配置已保存');
  } catch (err) {
    console.error('updateFormConfig error:', err);
    return error(res, '保存表单配置失败');
  }
}

// ==================== 添加自定义字段 ====================

/**
 * POST /api/v1/tenant/form-config/:formType/fields
 * 添加一个自定义字段
 */
async function addCustomField(req, res) {
  try {
    const { formType } = req.params;
    const { field_key, field_label, field_type, required, visible, sort_order, options, placeholder, default_value, validation_rules, help_text } = req.body;
    const tenantId = req.user.tenant_id;

    if (!field_key || !field_label || !field_type) {
      return error(res, 'field_key、field_label、field_type 为必填项', 400);
    }

    // 检查字段 key 是否已存在
    const existing = await FormConfig.findOne({
      where: { tenant_id: tenantId, form_type: formType, field_key },
    });
    if (existing) {
      return error(res, '字段标识已存在', 400);
    }

    const config = await FormConfig.create({
      tenant_id: tenantId,
      form_type: formType,
      field_key,
      field_label,
      field_type,
      required: required || false,
      visible: visible !== false,
      sort_order: sort_order || 999,
      default_value: default_value || null,
      options: options || null,
      placeholder: placeholder || null,
      validation_rules: validation_rules || null,
      help_text: help_text || null,
    });

    return success(res, config, '自定义字段已添加', 201);
  } catch (err) {
    console.error('addCustomField error:', err);
    return error(res, '添加自定义字段失败');
  }
}

// ==================== 重置为默认配置 ====================

/**
 * POST /api/v1/tenant/form-config/:formType/reset
 * 重置为系统默认配置
 */
async function resetFormConfig(req, res) {
  try {
    const { formType } = req.params;
    const tenantId = req.user.tenant_id;

    await FormConfig.destroy({
      where: { tenant_id: tenantId, form_type: formType },
    });

    const defaults = formType === 'work_order_create' ? DEFAULT_WORK_ORDER_FIELDS : DEFAULT_MEASUREMENT_FIELDS;
    return success(res, { fields: defaults }, '已重置为默认配置');
  } catch (err) {
    console.error('resetFormConfig error:', err);
    return error(res, '重置失败');
  }
}

module.exports = {
  getFormConfig,
  updateFormConfig,
  addCustomField,
  resetFormConfig,
  DEFAULT_MEASUREMENT_FIELDS,
  DEFAULT_WORK_ORDER_FIELDS,
};
