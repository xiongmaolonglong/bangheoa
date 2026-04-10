# 项目结构

```
10.0/
├── backend/                    # 后端项目
│   ├── src/                    # 源代码
│   │   ├── app.js              # 入口文件
│   │   ├── config/             # 配置
│   │   ├── controllers/        # 控制器
│   │   ├── middleware/         # 中间件
│   │   ├── models/             # 数据模型
│   │   ├── routes/             # 路由
│   │   ├── services/           # 服务层
│   │   └── utils/              # 工具函数
│   ├── migrations/             # 数据库迁移
│   ├── tests/                  # 测试文件
│   ├── uploads/                # 上传文件
│   ├── .env                    # 环境配置
│   └── package.json
│
├── admin-web/                  # 前端项目
│   ├── src/                    # 源代码
│   │   ├── api/                # API 封装
│   │   ├── components/         # 组件
│   │   │   └── common/         # 通用组件
│   │   ├── pages/              # 页面
│   │   ├── router/             # 路由
│   │   ├── store/              # 状态管理
│   │   └── utils/              # 工具函数
│   ├── public/                 # 静态资源
│   ├── .env.development        # 开发环境配置
│   ├── .env.production         # 生产环境配置
│   └── package.json
│
├── docs/                       # 文档
│   ├── DEVELOPMENT.md          # 开发指南
│   └── archive/                # 历史文档归档
│
├── CLAUDE.md                   # AI 助手指南
├── README.md                   # 使用指南
├── start.bat                   # Windows 启动脚本
└── start.sh                    # Linux/Mac 启动脚本
```

## 核心模块

### 后端模块

| 模块 | 说明 | 主要文件 |
|------|------|---------|
| 认证 | 登录/注册/权限 | auth.controller.js, auth.js |
| 订单 | 订单全流程 | order.controller.js |
| 审核 | 审核管理 | review.controller.js |
| 设计 | 设计方案 | design.controller.js |
| 生产 | 生产管理 | production.controller.js |
| 安装 | 安装管理 | install.controller.js |
| 统计 | 数据统计 | statistics.controller.js |

### 前端页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 登录 | /login | 用户登录 |
| 仪表盘 | /dashboard | 数据概览 |
| 订单管理 | /order | 订单列表/详情 |
| 审核中心 | /review | 审核列表 |
| 设计管理 | /design | 设计方案 |
| 生产管理 | /production | 生产任务 |
| 安装管理 | /install | 安装任务 |
| 统计报表 | /statistics | 数据统计 |
| 系统设置 | /settings | 用户/地区管理 |

## 数据库表

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| departments | 部门表 |
| orders | 订单表 |
| order_ad_items | 订单广告项 |
| design_schemes | 设计方案 |
| design_groups | 设计分组 |
| design_drawings | 设计图纸 |
| measure_reports | 测量报告 |
| install_reports | 安装报告 |
| notifications | 通知表 |
| audit_logs | 审计日志 |
