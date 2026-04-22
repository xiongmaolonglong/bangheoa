/**
 * 打印工具
 */

/**
 * 打印指定 DOM 元素
 * @param {string} elementId - 要打印的元素 ID
 * @param {string} title - 打印标题
 */
export function printElement(elementId, title = '打印') {
  const el = document.getElementById(elementId)
  if (!el) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; font-size: 14px; }
        h1 { text-align: center; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .print-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .section-title { font-size: 16px; font-weight: 600; margin: 20px 0 10px; border-left: 3px solid #2563eb; padding-left: 10px; }
        .meta-row { display: flex; gap: 20px; margin-bottom: 10px; }
        .meta-label { color: #666; min-width: 100px; }
        .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: #2563eb; border-radius: 4px; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
        .tag-primary { background: #e6f0ff; color: #2563eb; }
        .tag-success { background: #e6ffed; color: #16a34a; }
        .tag-warning { background: #fff7e6; color: #ea580c; }
        .tag-danger { background: #ffe6e6; color: #dc2626; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      ${el.innerHTML}
      <div class="footer">打印时间：${new Date().toLocaleString('zh-CN')} | 广告工程全流程管理系统</div>
    </body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 300)
}

/**
 * 打印工单详情
 * @param {object} workOrder - 工单数据
 */
export function printWorkOrder(wo) {
  const stageMap = {
    declaration: '申报接收', approval: '审批中', assignment: '待派单',
    measurement: '测量中', design: '设计中', production: '生产中',
    construction: '施工中', finance: '费用结算', archive: '已归档', aftersale: '售后'
  }
  const statusMap = {
    draft: '草稿', submitted: '已提交', assigned: '已派单', measuring: '测量中',
    measured: '已测量', designing: '设计中', producing: '生产中', constructing: '施工中',
    completed: '已完成', quoting: '报价中', archived: '已归档'
  }

  const progressMap = {
    declaration: 5, approval: 15, assignment: 25, measurement: 35,
    design: 50, production: 65, construction: 80, finance: 90, archive: 100
  }

  const progress = progressMap[wo.current_stage] || 0

  const html = `
    <div id="print-content">
      <h1>工单详情</h1>
      <div class="print-header">
        <span>工单号：${wo.work_order_no || '-'}</span>
        <span>打印时间：${new Date().toLocaleDateString('zh-CN')}</span>
      </div>

      <div class="meta-row"><span class="meta-label">项目名称</span><span>${wo.title || '-'}</span></div>
      <div class="meta-row"><span class="meta-label">甲方企业</span><span>${wo.client_name || '-'}</span></div>
      <div class="meta-row"><span class="meta-label">项目地址</span><span>${wo.address || '-'}</span></div>
      <div class="meta-row"><span class="meta-label">当前环节</span><span class="tag tag-primary">${stageMap[wo.current_stage] || wo.current_stage}</span></div>
      <div class="meta-row"><span class="meta-label">状态</span><span class="tag ${wo.is_timeout ? 'tag-danger' : 'tag-success'}">${wo.is_timeout ? '超时' : '正常'}</span></div>
      <div class="meta-row"><span class="meta-label">负责人</span><span>${wo.assigned_to || '待分配'}</span></div>
      <div class="meta-row"><span class="meta-label">截止日期</span><span>${wo.deadline || '未设置'}</span></div>
      <div class="meta-row"><span class="meta-label">创建时间</span><span>${wo.created_at || '-'}</span></div>
      <div class="meta-row"><span class="meta-label">备注说明</span><span>${wo.description || '-'}</span></div>

      <div class="section-title">进度</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div style="text-align:right;font-size:12px;color:#666">${progress}%</div>
    </div>
  `

  const container = document.createElement('div')
  container.style.display = 'none'
  container.innerHTML = html
  document.body.appendChild(container)

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    document.body.removeChild(container)
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>工单 ${wo.work_order_no || ''}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; padding: 24px; color: #333; font-size: 14px; line-height: 1.6; }
        h1 { text-align: center; margin-bottom: 16px; font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .print-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666; }
        .meta-row { display: flex; gap: 16px; margin-bottom: 6px; }
        .meta-label { color: #666; min-width: 80px; font-weight: 500; }
        .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 8px 0; }
        .progress-fill { height: 100%; background: #2563eb; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .tag-primary { background: #e6f0ff; color: #2563eb; }
        .tag-success { background: #e6ffed; color: #16a34a; }
        .tag-danger { background: #ffe6e6; color: #dc2626; }
        .section-title { font-size: 16px; font-weight: 600; margin: 16px 0 8px; border-left: 3px solid #2563eb; padding-left: 10px; }
        .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>${html}<div class="footer">打印时间：${new Date().toLocaleString('zh-CN')} | 广告工程全流程管理系统</div></body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 300)
  document.body.removeChild(container)
}
