/**
 * 初始化表单配置数据
 * 运行方式: node src/seeders/initFormData.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { FormGroup, FormField } = require('../models');

async function initFormData() {
  try {
    console.log('开始初始化表单配置...');

    // 检查是否已有数据
    const existGroups = await FormGroup.count();
    if (existGroups > 0) {
      console.log('表单配置已存在，跳过初始化');
      process.exit(0);
    }

    // 创建基本信息分组
    const baseInfoGroup = await FormGroup.create({
      name: '基本信息',
      sort_order: 1,
      status: 1
    });

    // 添加基本信息字段
    const baseInfoFields = [
      {
        group_id: baseInfoGroup.id,
        field_name: '客户名称',
        field_key: 'customer_name',
        field_type: 'text',
        placeholder: '请输入客户名称',
        is_required: 1,
        sort_order: 1
      },
      {
        group_id: baseInfoGroup.id,
        field_name: '联系电话',
        field_key: 'customer_phone',
        field_type: 'text',
        placeholder: '请输入联系电话',
        is_required: 1,
        sort_order: 2
      },
      {
        group_id: baseInfoGroup.id,
        field_name: '订单标题',
        field_key: 'title',
        field_type: 'text',
        placeholder: '请输入订单标题',
        is_required: 1,
        sort_order: 3
      }
    ];

    for (const field of baseInfoFields) {
      await FormField.create(field);
    }

    // 创建需求信息分组
    const demandGroup = await FormGroup.create({
      name: '需求信息',
      sort_order: 2,
      status: 1
    });

    const demandFields = [
      {
        group_id: demandGroup.id,
        field_name: '需求说明',
        field_key: 'requirement',
        field_type: 'textarea',
        placeholder: '请输入需求说明',
        is_required: 0,
        sort_order: 1
      },
      {
        group_id: demandGroup.id,
        field_name: '期望完成日期',
        field_key: 'expected_date',
        field_type: 'date',
        placeholder: '选择期望完成日期',
        is_required: 0,
        sort_order: 2
      }
    ];

    for (const field of demandFields) {
      await FormField.create(field);
    }

    console.log('表单配置初始化完成！');
    console.log('- 创建分组: 2 个');
    console.log('- 创建字段: 5 个');

    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initFormData();
