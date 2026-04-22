const logger = require('./logger');
const response = require('./response');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      logger.error(`[Controller Error] ${err.message}`, err.stack);
      response.error(res, err.message || '服务器内部错误', 1, 500);
    });
  };
}

module.exports = asyncHandler;
