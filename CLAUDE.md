# 广告工程全流程管理系统

> 你正在与一个零基础的用户协作，他不会写代码。用中文交流，不堆术语。

## 一句话说明

广告商用来管工程项目的系统：客户申报 → 派单测量 → 设计 → 生产 → 施工 → 结算 → 归档 → 售后。

## 项目结构

```
1.0/
├── backend/          # 后端 Express + Sequelize + MySQL
├── admin-web/        # 管理后台（广告商用） Vue 3 + Element Plus
├── super-admin/      # 超级管理后台（平台运营用） Vue 3 + Element Plus
├── client-web/       # 客户端网页（甲方客户用） Vue 3
├── client-miniapp/   # 微信小程序（甲方客户）
├── measure-app/      # 测量施工 APP（Flutter）
├── scripts/          # 检查/启动脚本
└── docs/             # 设计文档、开发规范
```

## 快速启动

### 后端

```bash
cd backend && npm run dev
```

数据库：MySQL localhost:3306，root 用户，密码为空
后端端口：3000

### 管理后台

```bash
cd admin-web && npm run dev
```

默认端口：5173（被占用会自动换端口）
演示账号：`13800000001` / `123456`

### 超级管理后台

```bash
cd super-admin && npm run dev
```

### 一键启动

根目录下有 `dev.bat`（Windows）或 `dev.sh`（Linux/Mac）可以直接运行。

## 技术栈

### 后端 (backend/)
- **框架**: Express.js (CommonJS 格式)
- **数据库**: MySQL 8.0, Sequelize ORM
- **认证**: JWT (jsonwebtoken)
- **安全**: helmet + cors + express-rate-limit
- **代码**: 2 空格缩进，单引号，`require/module.exports`

### 前端 (admin-web/ super-admin/ client-web/)
- **框架**: Vue 3 (Composition API, `<script setup>`)
- **构建**: Vite
- **状态**: Pinia
- **路由**: Vue Router
- **UI**: Element Plus（已定制主题，品牌色 #2563EB 靛蓝）
- **请求**: Axios 封装在 `src/api/` 目录
- **全局样式**: `src/assets/styles/global.css`（CSS 变量设计系统）

### 小程序/APP
- **微信小程序**: `client-miniapp/` 原生开发
- **测量APP**: `measure-app/` Flutter 3.x

## 后端架构

```
backend/src/
├── app.js                    # 入口，挂载所有路由
├── config/database.js        # 数据库连接
├── controllers/              # 控制器（只编排，不写业务逻辑）
├── middleware/               # 认证、验证、错误处理
├── models/                   # Sequelize 模型（25+ 表）
│   └── index.js             # 所有关联关系在这里
├── routes/                   # 路由定义（注意排序：具体路由在参数路由之前）
├── services/                 # 业务逻辑层
└── utils/                    # 工具函数
```

### 重要规则（后端）

1. **路由排序**：`/items/:id/sub-action` 必须在 `/items/:id` 之前，否则会被拦截
2. **模型关联别名**：`hasMany`/`belongsTo` 必须带 `as` 参数，且前后一致
3. **数据库同步**：生产环境 `alter: false`，新增字段用 `ALTER TABLE` 手动添加
4. **响应格式**：`{ code: 0, message: 'ok', data: {...} }`
5. **软删除**：所有模型开启 `paranoid: true`，删除操作不会真正删数据

### 前端架构

```
admin-web/src/
├── api/                    # Axios 封装，统一处理 token 和错误
├── assets/styles/
│   └── global.css          # 全局设计系统（CSS 变量）
├── components/
│   └── Layout.vue          # 主布局（侧边栏 + 顶栏）
├── router/index.js         # 路由配置
├── store/
│   └── auth.js             # 登录状态管理
└── views/                  # 页面组件（25个）
```

## 已实现的功能

### 后端
- [x] 认证系统（JWT，三角色：租户/甲方/超管）
- [x] 租户管理（部门、人员、角色）
- [x] 甲方管理（企业、部门、人员）
- [x] 工单全流程 API（申报→审批→派单→测量→设计→生产→施工→财务→归档→售后）
- [x] 文件上传
- [x] 微信订阅消息
- [x] 表单动态配置
- [x] 通知系统

### 管理后台 (admin-web)
- [x] 登录页（深色渐变背景）
- [x] 数据看板（统计卡片 + ECharts趋势图 + 超时预警 + 环节分布）
- [x] 工单管理（列表/看板双视图 + 筛选 + 补录 + 批量操作 + 拖拽推进）
- [x] 工单详情（全流程进度条 + 操作日志 + 派单对话框 + 阶段推进）
- [x] 申报接收（列表 + 批量接收 + 分页 + 统计）
- [x] 派单管理（待派单列表 + 测量员负载显示 + 派单对话框）
- [x] 设计管理（待设计/已完成tab + 指派设计师 + 测量数据抽屉 + 版本历史）
- [x] 设计详情（三栏布局 + 测量数据聚合 + 效果图上传 + 审核/驳回/确认 + 材料信息复制）
- [x] 生产管理（任务列表 + 合并创建 + 状态更新 + 质检 + 进度跟踪）
- [x] 施工管理（列表 + 统计 + 施工日志CRUD + 验收）
- [x] 施工详情（工单信息 + 前后中照片 + 验收记录 + 验收对话框）
- [x] 费用管理（报价/发票/结算tab + 预算进度条 + 统计图表 + 导出）
- [x] 归档管理（列表 + 统计 + 搜索 + 导出）
- [x] 归档详情（工单信息 + 归档文件分类展示 + 导出）
- [x] 售后管理（列表 + 统计 + 处理对话框 + 筛选）
- [x] 售后详情（售后信息 + 问题照片 + 处理记录 + 处理对话框）
- [x] 审核中心（测量/设计/施工验收三tab + 设计稿三栏对比预览 + 批量操作）
- [x] 测量数据审核/代录（代录表单 + 项目模板驱动 + 分组/面管理 + 照片上传 + 驳回历史）
- [x] 组织架构（部门CRUD + 人员CRUD + 批量删除 + 密码重置 + 分页）
- [x] 甲方管理（企业CRUD + 部门/人员管理 + 默认甲方设置）
- [x] 甲方详情（企业信息 + 关联工单列表 + 部门列表）
- [x] 系统配置（表单字段/项目类型/材料字典 + 地图API Key）
- [x] 消息通知（列表 + 筛选 + 标记已读 + 未读计数轮询）
- [x] 操作日志（搜索 + 筛选 + 日期范围 + 导出 + 统计）

### 超级管理后台 (super-admin)
- [x] 登录
- [x] 数据看板
- [x] 租户管理（创建/查看/编辑/删除）
- [x] 工单查看
- [x] 系统设置

## 设计系统

已建立全局 CSS 变量体系（`global.css`）：

| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-primary` | `#2563eb` | 按钮、链接、强调 |
| `--color-danger` | `#dc2626` | 错误、超时 |
| `--color-success` | `#16a34a` | 成功、正常 |
| `--color-warning` | `#ea580c` | 警告、待处理 |
| `--color-text-primary` | `#111827` | 正文文字 |
| `--color-bg-sidebar` | `#0f172a` | 侧边栏背景 |
| `--color-bg-page` | `#f3f4f6` | 页面背景 |
| `--sidebar-width` | `240px` | 侧边栏宽度 |
| `--header-height` | `60px` | 顶栏高度 |

新页面直接使用这些变量，不要写死颜色值。

## 常见坑

1. **路由 404**：Express 路由排序问题，具体路径必须在参数路径（`:id`）之前
2. **EagerLoadingError**：`include: [{ as: 'xxx' }]` 中的别名必须在模型关联中定义过
3. **Unknown column**：模型定义了字段但数据库表里没有，需要手动 `ALTER TABLE`
4. **alter: true 导致索引超限**：MySQL 索引上限 64 个，已恢复 `alter: false`
5. **前端跨域**：开发环境 Vite 已配置 proxy，生产环境需 Nginx 配置
6. **token 过期**：前端 api.js 统一处理 401 自动跳转登录

## 开发流程建议

开发一个新功能时：
1. 先建后端路由和控制器
2. 再建前端页面和 API 调用
3. 最后联调测试

创建新页面的步骤：
1. 在 `views/` 建 `.vue` 文件
2. 在 `router/index.js` 加路由
3. 在 `Layout.vue` 加菜单项

## 待做/未完成

### 高优先级
- [ ] **客户端/小程序** — `client-web/`、`client-miniapp/` 目录存在但功能未实现
- [ ] **测量APP** — `measure-app/` 目录存在但 Flutter 未开发
- [ ] **超级管理后台完善** — 租户人员管理、权限分配、数据大屏
- [ ] **费用收款记录** — Finance 页面缺少收款记录和发票管理
- [ ] **生产/入库模块** — 生产状态变更、入库登记、材料领取

### 中优先级
- [ ] **甲方详情增强** — 编辑功能、工单统计图表、合作时间线
- [ ] **施工详情增强** — 施工日志列表展示、整改记录追踪
- [ ] **审核中心批量操作** — 批量审核测量/设计/施工
- [ ] **施工排期日历** — Calendar 视图查看施工计划
- [ ] **申报批量驳回** — Declarations 页面支持批量操作
- [ ] **消息通知实时推送** — WebSocket 替代轮询
- [ ] **登录页增强** — 忘记密码、验证码登录

### 低优先级
- [ ] **工单甘特图** — 时间线可视化
- [ ] **设计稿在线预览对比** — 版本并排对比
- [ ] **归档文件打包下载** — 一键导出 ZIP
- [ ] **高级搜索保存** — 保存常用搜索条件
- [ ] **角色权限可视化** — 组织架构权限矩阵
- [ ] **通知规则配置** — 自定义通知触发条件
- [ ] **发票OCR识别** — 自动识别发票信息

## 数据库快速参考

核心表：`tenants`（租户）、`tenant_users`（租户人员）、`clients`（甲方）、`work_orders`（工单）、`wo_assignments`（派单）、`wo_measurements`（测量）、`wo_designs`（设计）、`wo_constructions`（施工）、`wo_finances`（财务）、`wo_archives`（归档）、`wo_aftersales`（售后）

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
