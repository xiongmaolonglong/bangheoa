# 开发指南

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js 18+
- MySQL 8.0+

### 2. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd admin-web
npm install
```

### 3. 配置数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE outdoor_ad_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 配置后端环境变量
cd backend
cp .env.example .env
# 编辑 .env 填写数据库密码
```

### 4. 启动服务

```bash
# 方式一：一键启动（根目录）
./start.bat    # Windows
./start.sh     # Linux/Mac

# 方式二：分别启动
# 终端1 - 后端
cd backend && npm run dev

# 终端2 - 前端
cd admin-web && npm run dev
```

### 5. 访问系统

- 管理后台: http://localhost:5173
- API 文档: http://localhost:3000/api-docs
- 默认账号: admin / admin123

---

## 代码规范

### 目录结构

```
backend/
├── src/
│   ├── controllers/     # 控制器 - 处理请求
│   ├── services/        # 服务 - 业务逻辑
│   ├── models/          # 模型 - 数据库操作
│   ├── routes/          # 路由 - API 端点
│   ├── middleware/      # 中间件 - 认证/权限
│   └── utils/           # 工具函数
└── tests/               # 测试文件

admin-web/
├── src/
│   ├── pages/           # 页面组件
│   ├── components/      # 公共组件
│   ├── api/             # API 封装
│   ├── store/           # 状态管理
│   ├── router/          # 路由配置
│   └── utils/           # 工具函数
└── public/              # 静态资源
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | 小写中划线 | `order-detail.vue` |
| 组件名 | 大驼峰 | `OrderDetail.vue` |
| 变量名 | 小驼峰 | `orderList` |
| 常量名 | 大写下划线 | `ORDER_STATUS` |
| 函数名 | 小驼峰 | `getOrderList` |
| CSS 类名 | 小写中划线 | `.order-card` |

### API 路由规范

```
GET    /api/v1/orders          # 列表
POST   /api/v1/orders          # 创建
GET    /api/v1/orders/:id      # 详情
PUT    /api/v1/orders/:id      # 更新
DELETE /api/v1/orders/:id      # 删除
POST   /api/v1/orders/:id/action # 操作
```

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

示例：
```
feat: 添加订单批量审核功能
fix: 修复登录状态丢失问题
docs: 更新 API 文档
```

---

## 业务流程

### 订单状态流转

```
申请测量 → 待审核 → 测量中 → 测量待审 → 设计中 → 设计待审
→ 生产中 → 核对中 → 安装中 → 安装待审 → 已归档
         ↓
       已驳回
```

### 角色权限

| 角色 | 职责 | 可操作状态 |
|------|------|-----------|
| admin | 全部权限 | 所有 |
| reviewer | 审核派单 | 待审核状态 |
| measurer | 测量作业 | 测量中 |
| designer | 方案设计 | 设计中 |
| producer | 生产管理 | 生产中 |
| checker | 物料核对 | 核对中 |
| installer | 安装作业 | 安装中 |

---

## 开发流程

### 新增功能

1. **后端**
   - 创建 model（如需要）
   - 创建 controller
   - 创建 routes
   - 添加测试

2. **前端**
   - 创建页面组件 `pages/xxx/index.vue`
   - 创建 API 封装 `api/xxx.js`
   - 添加路由配置
   - 添加菜单入口

### 新增 API

```javascript
// 1. 后端 routes/order.routes.js
router.get('/statistics', orderController.getStatistics)

// 2. 后端 controllers/order.controller.js
exports.getStatistics = async (req, res) => {
  // 实现逻辑
}

// 3. 前端 api/order.js
export function getStatistics(params) {
  return request.get('/orders/statistics', { params })
}

// 4. 页面中使用
import { getStatistics } from '@/api/order'
const data = await getStatistics()
```

### 数据库变更

```bash
# 创建迁移文件
cd backend

# 编辑迁移文件
# migrations/YYYYMMDD_description.js

# 执行迁移
node migrations/YYYYMMDD_description.js
```

---

## 调试技巧

### 后端调试

```javascript
// 打印 SQL
sequelize.sync({ logging: console.log })

// 打印请求
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body)
  next()
})
```

### 前端调试

```javascript
// Vue DevTools
// 浏览器安装 Vue DevTools 扩展

// 控制台打印
console.log('data:', JSON.stringify(data, null, 2))

// Pinia 状态
import { useUserStore } from '@/store/user'
const userStore = useUserStore()
console.log(userStore.$state)
```

---

## 常见问题

### Q: 数据库连接失败？
检查 `backend/.env` 中的数据库配置是否正确。

### Q: 前端请求 404？
确认后端已启动，检查路由前缀是否为 `/api/v1`。

### Q: 登录后 token 丢失？
检查 localStorage 是否正常，确认 axios 拦截器配置正确。

### Q: 图片上传失败？
检查 `backend/uploads` 目录权限，确认文件大小限制。

---

## 相关文档

- [API 文档](http://localhost:3000/api-docs)
- [README.md](./README.md) - 使用指南
- [CLAUDE.md](./CLAUDE.md) - AI 助手指南
