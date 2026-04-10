/**
 * 数据导出控制器
 * 支持 Excel、PDF、JSON 导出
 */

const ExcelJS = require('exceljs');
const { Order, User, Group, District, Province, OrderAdItem, MeasureFace } = require('../models');
const { Op } = require('sequelize');
const response = require('../utils/response');
const path = require('path');
const fs = require('fs');

/**
 * 导出订单列表 (Excel)
 */
exports.exportOrdersExcel = async (req, res) => {
  try {
    const { status, start_date, end_date, group_id, fields } = req.query;

    // 构建查询条件
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (start_date && end_date) {
      where.created_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
    }
    if (group_id) {
      where.group_id = group_id;
    }

    // 查询数据
    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['real_name'] },
        { model: Group, as: 'group', include: [{ model: District, as: 'district' }] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10000
    });

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    // 可导出字段
    const availableFields = {
      order_no: { header: '订单编号', width: 20 },
      customer_name: { header: '客户姓名', width: 12 },
      customer_phone: { header: '客户电话', width: 15 },
      title: { header: '订单标题', width: 30 },
      address: { header: '安装地址', width: 40 },
      status: { header: '状态', width: 12 },
      group_name: { header: '所属小组', width: 20 },
      handler_name: { header: '处理人', width: 12 },
      expected_date: { header: '预期完成', width: 12 },
      created_at: { header: '创建时间', width: 18 },
      updated_at: { header: '更新时间', width: 18 }
    };

    // 选择导出字段
    const selectedFields = fields ? fields.split(',') : Object.keys(availableFields);

    // 设置表头
    worksheet.columns = selectedFields.map(field => ({
      header: availableFields[field]?.header || field,
      key: field,
      width: availableFields[field]?.width || 15
    }));

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 状态映射
    const statusMap = {
      pending_review: '待审核',
      designing: '设计中',
      design_review: '设计待审',
      producing: '生产中',
      checking: '核对中',
      installing: '安装中',
      install_review: '安装待审',
      archived: '已归档',
      rejected: '已驳回'
    };

    // 填充数据
    orders.forEach(order => {
      const rowData = {};
      selectedFields.forEach(field => {
        switch (field) {
          case 'customer_name':
            rowData[field] = order.customer_name;
            break;
          case 'customer_phone':
            rowData[field] = order.customer_phone;
            break;
          case 'status':
            rowData[field] = statusMap[order.status] || order.status;
            break;
          case 'group_name':
            rowData[field] = order.group?.name || '';
            break;
          case 'handler_name':
            rowData[field] = order.handler?.real_name || '';
            break;
          case 'expected_date':
            rowData[field] = order.expected_date ? order.expected_date.toISOString().slice(0, 10) : '';
            break;
          case 'created_at':
            rowData[field] = order.created_at ? order.created_at.toISOString().slice(0, 19).replace('T', ' ') : '';
            break;
          case 'updated_at':
            rowData[field] = order.updated_at ? order.updated_at.toISOString().slice(0, 19).replace('T', ' ') : '';
            break;
          default:
            rowData[field] = order[field];
        }
      });
      worksheet.addRow(rowData);
    });

    // 设置响应头
    const filename = `订单列表_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('导出失败:', err);
    response.error(res, '导出失败');
  }
};

/**
 * 导出订单详情 (PDF)
 * 注意：需要安装 puppeteer 或使用其他 PDF 库
 */
exports.exportOrderPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'customer' },
        { model: Group, as: 'group', include: [{ model: District, as: 'district' }] },
        {
          model: OrderAdItem,
          as: 'adItems',
          include: [{ model: MeasureFace, as: 'faces' }]
        }
      ]
    });

    if (!order) {
      return response.notFound(res, '订单不存在');
    }

    // 生成 HTML 内容
    const html = generateOrderHtml(order);

    // 设置响应头
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=订单_${order.order_no}.html`);

    // 简化版：返回 HTML（可打印为 PDF）
    res.send(html);

  } catch (err) {
    console.error('导出 PDF 失败:', err);
    response.error(res, '导出失败');
  }
};

/**
 * 生成订单 HTML
 */
function generateOrderHtml(order) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>订单详情 - ${order.order_no}</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; }
    .order-no { color: #666; margin-top: 10px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: bold; background: #f5f5f5; padding: 8px 12px; margin-bottom: 10px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .label { width: 100px; color: #666; }
    .value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f9f9f9; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">户外广告测量安装派单系统</div>
    <div class="order-no">订单编号：${order.order_no}</div>
  </div>

  <div class="section">
    <div class="section-title">基本信息</div>
    <div class="info-row">
      <span class="label">客户姓名</span>
      <span class="value">${order.customer_name}</span>
    </div>
    <div class="info-row">
      <span class="label">联系电话</span>
      <span class="value">${order.customer_phone}</span>
    </div>
    <div class="info-row">
      <span class="label">安装地址</span>
      <span class="value">${order.address}</span>
    </div>
    <div class="info-row">
      <span class="label">所属区域</span>
      <span class="value">${order.group?.district?.name || ''} - ${order.group?.name || ''}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">广告项目</div>
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>广告面</th>
          <th>宽度(m)</th>
          <th>高度(m)</th>
          <th>面积(㎡)</th>
        </tr>
      </thead>
      <tbody>
        ${order.adItems?.flatMap((item, i) =>
          item.faces?.map((face, j) => `
            <tr>
              <td>${i + 1}-${j + 1}</td>
              <td>${face.face_name}</td>
              <td>${face.width || '-'}</td>
              <td>${face.height || '-'}</td>
              <td>${face.area || '-'}</td>
            </tr>
          `) || []
        ).join('') || '<tr><td colspan="5">暂无数据</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    打印时间：${new Date().toLocaleString('zh-CN')}
  </div>
</body>
</html>
  `;
}

/**
 * 批量导出订单
 */
exports.batchExport = async (req, res) => {
  try {
    const { ids, format = 'excel' } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return response.error(res, '请选择要导出的订单');
    }

    // 复用 Excel 导出逻辑
    req.query.fields = 'order_no,customer_name,customer_phone,title,address,status,created_at';

    const where = { id: { [Op.in]: ids } };
    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['real_name', 'phone'] },
        { model: Group, as: 'group' }
      ]
    });

    // 简化版：返回 JSON
    res.json({
      success: true,
      data: orders,
      message: '导出成功'
    });

  } catch (err) {
    console.error('批量导出失败:', err);
    response.error(res, '导出失败');
  }
};

/**
 * 导出模板
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const { type = 'order' } = req.query;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('导入模板');

    if (type === 'order') {
      worksheet.columns = [
        { header: '客户姓名', key: 'customer_name' },
        { header: '客户电话', key: 'customer_phone' },
        { header: '订单标题', key: 'title' },
        { header: '安装地址', key: 'address' },
        { header: '小组ID', key: 'group_id' }
      ];

      // 添加示例行
      worksheet.addRow({
        customer_name: '张三',
        customer_phone: '13800138000',
        title: '示例订单',
        address: '示例地址',
        group_id: '1'
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('下载模板失败:', err);
    response.error(res, '下载失败');
  }
};