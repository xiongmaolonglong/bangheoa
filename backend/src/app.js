const logger = require('./utils/logger');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { testConnection, sequelize } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// 创建 Express 应用
const app = express();

const isDev = process.env.NODE_ENV === 'development';

const corsOptions = isDev
  ? { origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }
  : { origin: process.env.CORS_ORIGINS?.split(',') || false, credentials: true };

// 基础中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置默认响应头字符集，防止中文乱码
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 静态文件服务（上传文件）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 文档 (Swagger)
if (isDev || process.env.ENABLE_SWAGGER === 'true') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '户外广告派单系统 API 文档'
  }));

  // 导出 OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info('API 文档地址: http://localhost:3000/api-docs');
}

// API 路由
app.use('/api/v1', routes);

// 404 处理
app.use(notFound);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 测试数据库连接
    await testConnection();

    // 同步数据库模型（仅首次创建表，不自动修改）
    // 生产环境建议使用迁移脚本
    // if (process.env.NODE_ENV === 'development') {
    //   const { syncDatabase } = require('./models');
    //   try {
    //     await syncDatabase({ alter: false });
    //   } catch (syncError) {
    //     logger.warn('数据库模型同步警告:', syncError.message);
    //   }
    // }

    // 启动自动审核定时任务
    const autoReviewService = require('./services/autoReview.service');
    autoReviewService.startScheduler();
    logger.info('自动审核调度器已启动');

    // 启动监听
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`服务器运行在 http://0.0.0.0:${PORT}`);
      if (isDev) {
        logger.info(`API 文档: http://localhost:${PORT}/api-docs`);
      }
    });

    // 初始化 WebSocket (可选)
    // const notificationService = require('./services/notification.service');
    // notificationService.initWebSocket(server);

    return server;
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
