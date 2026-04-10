# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

户外广告测量安装派单系统，实现从申请测量到归档的全流程数字化管理。

**核心流程：** 申请测量 → 审核 → 测量 → 审核 → 设计 → 审核 → 生产 → 核对 → 安装 → 审核 → 归档

## 子项目

| 项目 | 技术栈 | 启动命令 |
|------|--------|----------|
| backend/ | Node.js + Express + Sequelize | `npm run dev` (端口3000) |
| admin-web/ | Vue 3 + Vite + Element Plus | `npm run dev` (端口5173) |

## 开发命令

### 后端 (backend/)

```bash
npm run dev      # 开发模式 (nodemon热重载)
npm start        # 生产模式
npm test         # 运行测试
```

### 前端 (admin-web/)

```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

## 架构说明

### 后端结构

```
backend/src/
├── app.js           # Express 应用入口
├── config/          # 配置 (database, constants)
├── controllers/     # 控制器 (auth, order等)
├── middleware/      # 中间件 (auth, permission, errorHandler)
├── models/          # Sequelize 数据模型 (17个)
├── routes/          # API 路由
├── services/        # 业务逻辑层
└── utils/           # 工具函数 (response, jwt)
```

**API路由前缀：** `/api/v1`

### 前端结构

```
admin-web/src/
├── api/             # API 请求封装 (axios)
├── pages/           # 页面组件 (按业务模块划分)
├── router/          # Vue Router 路由配置
├── store/           # Pinia 状态管理
├── components/      # 公共组件
└── utils/           # 工具函数
```

### 数据模型关系

- User → Department (多对一)
- Order → OrderAdItem (一对多) → MeasureFace (一对多)
- DesignScheme → DesignGroup (一对多) → DesignDrawing (一对多)
- Province → District (一对多) → Group (一对多)

## 用户角色

| 角色 | 权限范围 |
|------|----------|
| admin | 系统管理员，全部权限 |
| reviewer | 审核主管，审核派单 |
| measurer | 测量员，测量作业 |
| designer | 设计师，方案设计 |
| producer | 生产员，生产管理 |
| checker | 核对员，物料核对 |
| installer | 安装员，安装作业 |

## 订单状态流转

| 状态 | 说明 | 下一状态 |
|------|------|----------|
| pending_review | 待审核（测量申请） | measuring / rejected |
| measuring | 测量中 | measure_review |
| measure_review | 待审核（测量结果） | designing / measuring |
| designing | 设计中 | design_review |
| design_review | 待审核（设计方案） | producing / designing |
| producing | 生产中 | checking |
| checking | 核对中 | installing / producing |
| installing | 安装中 | install_review |
| install_review | 待审核（安装结果） | archived / installing |
| archived | 已归档 | - |

## 订单编号规则

格式：`[省份代码]-[分区代码]-[小组代码]-[年月]-[流水号]`

示例：`GD-DL-01-2604-0001` = 广东省大沥区第1组2026年04月第1单

## 环境配置

### 后端 .env

```
PORT=3000
DB_HOST=localhost
DB_NAME=outdoor_ad_system
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_secret
```

### 前端代理

Vite 配置已将 `/api` 代理到后端 `http://localhost:3000`
