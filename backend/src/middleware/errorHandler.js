function errorHandler(err, req, res, next) {
  console.error(err.stack);
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: '数据验证失败', details: err.errors.map(e => e.message) });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: '数据冲突', details: err.errors.map(e => e.message) });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: '关联数据不存在' });
  }
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
}

module.exports = errorHandler;
