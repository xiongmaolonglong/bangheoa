import * as XLSX from 'xlsx'

/**
 * 将数据导出为 Excel 文件
 * @param {Array} data - 数据数组，每个元素是一个对象
 * @param {Array} columns - 列定义 [{ key: 'id', label: '编号' }]
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToExcel(data, columns, filename = 'export') {
  const header = columns.map(col => col.label)
  const rows = data.map(item => columns.map(col => item[col.key] ?? ''))
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 导出当前筛选数据（带时间戳）
 */
export function exportWithTimestamp(data, columns, prefix = 'export') {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
  exportToExcel(data, columns, `${prefix}_${ts}`)
}
