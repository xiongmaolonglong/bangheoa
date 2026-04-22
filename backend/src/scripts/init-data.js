/**
 * 数据库初始化脚本
 * 运行方式: node backend/src/scripts/init-data.js
 */

require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../config/database');
const { User, Province, District, Group, AdType, AdTypeFace, Face, AttributeTemplate, AttributeField, Material, Supplier, FormGroup, FormField } = require('../models');
const bcrypt = require('bcryptjs');

async function init() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步数据库（不强制修改）
    await sequelize.sync({ force: false });
    console.log('数据库同步完成');

    // 创建默认管理员
    const [admin, adminCreated] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        password: 'admin123',
        real_name: '系统管理员',
        phone: '13800138000',
        role: 'admin',
        status: 1
      }
    });
    console.log(adminCreated ? '创建管理员账户: admin / admin123' : '管理员账户已存在');

    // 创建测试用户
    const testUsers = [
      { username: 'field_worker', real_name: '外勤人员', role: 'field_worker' },
      { username: 'designer', real_name: '设计师李四', role: 'designer' },
      { username: 'producer', real_name: '生产员王五', role: 'producer' }
    ];

    for (const u of testUsers) {
      await User.findOrCreate({
        where: { username: u.username },
        defaults: {
          ...u,
          password: '123456',
          phone: '138' + Math.random().toString().slice(2, 11),
          status: 1
        }
      });
    }
    console.log('创建测试用户完成');

    // 创建省份
    const [gd, gdCreated] = await Province.findOrCreate({
      where: { code: 'GD' },
      defaults: { name: '广东省', code: 'GD', status: 1 }
    });

    // 创建分区
    const [dl, dlCreated] = await District.findOrCreate({
      where: { code: 'DL', province_id: gd.id },
      defaults: { name: '大沥区', code: 'DL', province_id: gd.id, status: 1 }
    });

    const [fs, fsCreated] = await District.findOrCreate({
      where: { code: 'FS', province_id: gd.id },
      defaults: { name: '佛山区', code: 'FS', province_id: gd.id, status: 1 }
    });

    // 创建小组
    await Group.findOrCreate({
      where: { code: '01', district_id: dl.id },
      defaults: { name: '大沥一组', code: '01', district_id: dl.id, status: 1 }
    });

    await Group.findOrCreate({
      where: { code: '02', district_id: dl.id },
      defaults: { name: '大沥二组', code: '02', district_id: dl.id, status: 1 }
    });

    console.log('创建地区数据完成');

    // ==================== 新增：面配置 ====================
    console.log('创建面配置...');
    const faceData = [
      { name: '正面', code: 'front', sort_order: 1 },
      { name: '左侧', code: 'left', sort_order: 2 },
      { name: '右侧', code: 'right', sort_order: 3 },
      { name: '顶部', code: 'top', sort_order: 4 },
      { name: '背面', code: 'back', sort_order: 5 }
    ];

    const faceRecords = {};
    for (const f of faceData) {
      const [face] = await Face.findOrCreate({
        where: { code: f.code },
        defaults: { ...f, status: 1 }
      });
      faceRecords[f.code] = face;
    }
    console.log('创建面配置完成');

    // ==================== 新增：属性模板 ====================
    console.log('创建属性模板...');

    // 基础尺寸模板
    const [basicTemplate] = await AttributeTemplate.findOrCreate({
      where: { name: '基础尺寸' },
      defaults: { name: '基础尺寸', description: '包含宽高、材质、数量的基础属性', sort_order: 1, status: 1 }
    });

    const basicFields = [
      { field_name: '宽度', field_key: 'width', field_type: 'number', unit: '米', is_required: 1, sort_order: 1 },
      { field_name: '高度', field_key: 'height', field_type: 'number', unit: '米', is_required: 1, sort_order: 2 },
      { field_name: '材质', field_key: 'material', field_type: 'select', options: ['亚克力', '不锈钢', '铝塑板', 'PVC', '喷绘布'], is_required: 0, sort_order: 3 },
      { field_name: '数量', field_key: 'quantity', field_type: 'number', unit: '个', is_required: 0, sort_order: 4, default_value: '1' },
      { field_name: '备注', field_key: 'remark', field_type: 'textarea', is_required: 0, sort_order: 5 }
    ];

    for (const field of basicFields) {
      await AttributeField.findOrCreate({
        where: { template_id: basicTemplate.id, field_key: field.field_key },
        defaults: { ...field, template_id: basicTemplate.id, status: 1 }
      });
    }

    // 发光字专用模板
    const [lightTemplate] = await AttributeTemplate.findOrCreate({
      where: { name: '发光字专用' },
      defaults: { name: '发光字专用', description: '发光字广告属性配置', sort_order: 2, status: 1 }
    });

    const lightFields = [
      { field_name: '字数', field_key: 'char_count', field_type: 'number', unit: '个', is_required: 1, sort_order: 1 },
      { field_name: '材质', field_key: 'material', field_type: 'select', options: ['不锈钢', '亚克力', '铁皮', '钛金'], is_required: 1, sort_order: 2 },
      { field_name: '是否亮灯', field_key: 'is_lighted', field_type: 'radio', options: ['是', '否'], is_required: 0, sort_order: 3, default_value: '是' },
      { field_name: '安装方式', field_key: 'install_type', field_type: 'select', options: ['粘贴', '挂装', '立柱', '其他'], is_required: 0, sort_order: 4 },
      { field_name: '备注', field_key: 'remark', field_type: 'textarea', is_required: 0, sort_order: 5 }
    ];

    for (const field of lightFields) {
      await AttributeField.findOrCreate({
        where: { template_id: lightTemplate.id, field_key: field.field_key },
        defaults: { ...field, template_id: lightTemplate.id, status: 1 }
      });
    }
    console.log('创建属性模板完成');

    // 创建广告类型（带面配置）
    const adTypes = [
      { name: 'KT板', description: '店铺门头KT板广告', sort_order: 1 },
      { name: '软膜灯箱', description: '软膜天花灯箱广告', sort_order: 2 },
      { name: '发光字', description: 'LED发光字广告', sort_order: 3 },
      { name: '喷绘布', description: '户外喷绘布广告', sort_order: 4 },
      { name: 'LED显示屏', description: 'LED电子显示屏', sort_order: 5 }
    ];

    for (const t of adTypes) {
      const [adType] = await AdType.findOrCreate({
        where: { name: t.name },
        defaults: { ...t, status: 1 }
      });

      // 根据广告类型配置面
      let faceConfigs = [];
      if (t.name === 'KT板') {
        faceConfigs = [
          { face_id: faceRecords.front.id, face_name: '正面', template_id: basicTemplate.id },
          { face_id: faceRecords.left.id, face_name: '左侧', template_id: basicTemplate.id },
          { face_id: faceRecords.right.id, face_name: '右侧', template_id: basicTemplate.id }
        ];
      } else if (t.name === '发光字') {
        faceConfigs = [
          { face_id: faceRecords.front.id, face_name: '正面', template_id: lightTemplate.id }
        ];
      } else if (t.name === '喷绘布') {
        faceConfigs = [
          { face_id: faceRecords.front.id, face_name: '正面', template_id: basicTemplate.id },
          { face_id: faceRecords.left.id, face_name: '左侧', template_id: basicTemplate.id }
        ];
      } else {
        faceConfigs = [
          { face_id: faceRecords.front.id, face_name: '正面', template_id: basicTemplate.id }
        ];
      }

      // 创建面配置
      for (let i = 0; i < faceConfigs.length; i++) {
        await AdTypeFace.findOrCreate({
          where: { ad_type_id: adType.id, face_name: faceConfigs[i].face_name },
          defaults: { ...faceConfigs[i], ad_type_id: adType.id, sort_order: i + 1, status: 1 }
        });
      }
    }
    console.log('创建广告类型完成');

    // 创建材质
    const materials = [
      { name: '亚克力', description: '亚克力板' },
      { name: '不锈钢', description: '不锈钢材质' },
      { name: '铝塑板', description: '铝塑复合板' },
      { name: 'PVC', description: 'PVC板' },
      { name: '喷绘布', description: '户外喷绘布' }
    ];

    for (const m of materials) {
      await Material.findOrCreate({
        where: { name: m.name },
        defaults: { ...m, status: 1 }
      });
    }
    console.log('创建材质数据完成');

    // 创建供应商
    const suppliers = [
      { name: '广州广告材料有限公司', contact: '张经理', phone: '020-12345678', address: '广州市白云区' },
      { name: '佛山标识制作厂', contact: '李厂长', phone: '0757-87654321', address: '佛山市南海区' }
    ];

    for (const s of suppliers) {
      await Supplier.findOrCreate({
        where: { name: s.name },
        defaults: { ...s, status: 1 }
      });
    }
    console.log('创建供应商数据完成');

    // 创建表单分组和字段
    const [basicGroup] = await FormGroup.findOrCreate({
      where: { name: '基本信息' },
      defaults: { name: '基本信息', sort_order: 1, status: 1 }
    });

    const formFields = [
      { group_id: basicGroup.id, field_name: '客户公司', field_key: 'company', field_type: 'text', sort_order: 1 },
      { group_id: basicGroup.id, field_name: '业务类型', field_key: 'business_type', field_type: 'select', options: ['新客户', '老客户', '转介绍'], sort_order: 2 },
      { group_id: basicGroup.id, field_name: '备注', field_key: 'notes', field_type: 'textarea', sort_order: 3 }
    ];

    for (const f of formFields) {
      await FormField.findOrCreate({
        where: { group_id: f.group_id, field_key: f.field_key },
        defaults: { ...f, status: 1 }
      });
    }
    console.log('创建表单配置完成');

    console.log('\n========== 初始化完成 ==========')
    console.log('管理员账户: admin / admin123')
    console.log('测试账户密码均为: 123456')

    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

init();
