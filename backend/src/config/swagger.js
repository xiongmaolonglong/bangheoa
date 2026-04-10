/**
 * Swagger/OpenAPI 配置
 * 自动生成 API 文档
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '户外广告派单系统 API',
      version: '1.0.0',
      description: '户外广告测量安装派单系统后端 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            real_name: { type: 'string' },
            phone: { type: 'string' },
            role: {
              type: 'string',
              enum: ['admin', 'reviewer', 'designer', 'producer', 'checker', 'installer']
            },
            status: { type: 'string', enum: ['active', 'inactive'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_no: { type: 'string', description: '订单编号' },
            customer_name: { type: 'string', description: '客户姓名' },
            customer_phone: { type: 'string', description: '客户电话' },
            title: { type: 'string', description: '订单标题' },
            address: { type: 'string', description: '安装地址' },
            status: {
              type: 'string',
              enum: ['pending_review', 'designing', 'design_review', 'producing', 'checking', 'installing', 'install_review', 'archived', 'rejected']
            },
            group_id: { type: 'integer' },
            expected_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total_pages: { type: 'integer' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: '未授权访问',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ForbiddenError: {
          description: '权限不足',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: '资源不存在',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: '参数验证失败',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: '认证相关接口' },
      { name: 'Users', description: '用户管理' },
      { name: 'Orders', description: '订单管理' },
      { name: 'Review', description: '审核管理' },
      { name: 'Design', description: '设计管理' },
      { name: 'Production', description: '生产管理' },
      { name: 'Install', description: '安装管理' },
      { name: 'Statistics', description: '数据统计' },
      { name: 'Notifications', description: '消息通知' }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/docs/*.yaml'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;