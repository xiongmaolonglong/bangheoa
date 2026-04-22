# 角色简化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 8 个角色简化为 5 个（admin、designer、producer、field_worker、customer），合并 reviewer→admin、measurer+installer→field_worker、checker→admin

**Architecture:** 先改后端角色常量 → 数据迁移 → 更新 RBAC 权限中间件 → 更新所有控制器/路由/模型 → 更新前端路由/导航/页面 → 全量验证。每步可独立验证提交。

**Tech Stack:** Node.js, Express, Sequelize, Vue 3, Element Plus

---

### Task 1: 后端角色常量更新

**Files:**
- Modify: `backend/src/config/constants.js`
- Modify: `backend/src/config/swagger.js`

- [ ] **Step 1: 更新 constants.js 的 USER_ROLES**

当前：
```js
const USER_ROLES = {
  ADMIN: 'admin',
  REVIEWER: 'reviewer',
  DESIGNER: 'designer',
  PRODUCER: 'producer',
  CHECKER: 'checker',
  INSTALLER: 'installer',
  MEASURER: 'measurer',
  CUSTOMER: 'customer'
};
```

替换为：
```js
const USER_ROLES = {
  ADMIN: 'admin',
  DESIGNER: 'designer',
  PRODUCER: 'producer',
  FIELD_WORKER: 'field_worker',
  CUSTOMER: 'customer'
};
```

- [ ] **Step 2: 更新 swagger.js**

搜索文件中所有 `reviewer`、`measurer`、`installer`、`checker` 角色定义并删除/合并。

- [ ] **Step 3: 重启后端验证无报错**

```bash
cd backend && node src/app.js
```

期望：正常启动，无 "USER_ROLES.REVIEWER is undefined" 等错误。

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/constants.js backend/src/config/swagger.js
git commit -m "refactor: 简化角色常量为5个"
```

---

### Task 2: 数据库迁移

**Files:**
- Create: `backend/migrations/20260411000000-simplify-roles.js`

- [ ] **Step 1: 创建迁移脚本**

```js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'backup_role', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '角色迁移前的备份'
    });
    await queryInterface.sequelize.query('UPDATE users SET backup_role = role');
    await queryInterface.sequelize.query("UPDATE users SET role = 'admin' WHERE role = 'reviewer'");
    await queryInterface.sequelize.query("UPDATE users SET role = 'field_worker' WHERE role = 'measurer'");
    await queryInterface.sequelize.query("UPDATE users SET role = 'field_worker' WHERE role = 'installer'");
    await queryInterface.sequelize.query("UPDATE users SET role = 'admin' WHERE role = 'checker'");
    console.log('角色迁移完成');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('UPDATE users SET role = backup_role WHERE backup_role IS NOT NULL');
    await queryInterface.removeColumn('users', 'backup_role');
    console.log('角色迁移已回滚');
  }
};
```

- [ ] **Step 2: 执行迁移**

```bash
mysql -u root outdoor_ad_system -e "
ALTER TABLE users ADD COLUMN backup_role VARCHAR(50) NULL COMMENT '角色迁移备份';
UPDATE users SET backup_role = role;
UPDATE users SET role = 'admin' WHERE role = 'reviewer';
UPDATE users SET role = 'field_worker' WHERE role = 'measurer';
UPDATE users SET role = 'field_worker' WHERE role = 'installer';
UPDATE users SET role = 'admin' WHERE role = 'checker';
"
```

- [ ] **Step 3: 验证**

```bash
mysql -u root outdoor_ad_system -e "SELECT role, backup_role, COUNT(*) as count FROM users GROUP BY role, backup_role;"
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/20260411000000-simplify-roles.js
git commit -m "feat: 角色迁移脚本"
```

---

### Task 3: 后端 RBAC 权限中间件更新

**Files:**
- Modify: `backend/src/middleware/rbac.js`
- Modify: `backend/src/middleware/permission.js`

- [ ] **Step 1: 更新 rbac.js 的 PERMISSIONS 表**

删除 `reviewer`、`checker`、`installer` 三个角色配置。
新增 `field_worker` 角色，权限合并自原 measurer + installer：

```js
const PERMISSIONS = {
  admin: {
    order: ['create', 'read', 'update', 'delete', 'update_status', 'assign', 'export'],
    user: ['create', 'read', 'update', 'delete'],
    region: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete', 'approve'],
    measure: ['create', 'read', 'update', 'delete', 'approve'],
    production: ['create', 'read', 'update', 'delete'],
    install: ['create', 'read', 'update', 'delete', 'approve'],
    archive: ['create', 'read', 'update', 'delete'],
    statistics: ['read', 'export'],
    settings: ['read', 'update']
  },
  designer: {
    order: ['read'],
    design: ['create', 'read', 'update']
  },
  producer: {
    order: ['read'],
    production: ['create', 'read', 'update']
  },
  field_worker: {
    order: ['read'],
    measure: ['create', 'read', 'update', 'approve'],
    install: ['create', 'read', 'update', 'approve']
  }
};
```

- [ ] **Step 2: 更新 rbac.js 的 filterByDataScope**

将 `case 'installer':` 替换为 `case 'field_worker':`

- [ ] **Step 3: 更新 permission.js**

删除 `isReviewer` 函数及其导出。

- [ ] **Step 4: Commit**

```bash
git add backend/src/middleware/rbac.js backend/src/middleware/permission.js
git commit -m "refactor: 更新 RBAC 权限中间件"
```

---

### Task 4: 后端控制器/路由/模型/服务全量更新

**Files:**
- Modify: `backend/src/controllers/review.controller.js`
- Modify: `backend/src/controllers/measure.controller.js`
- Modify: `backend/src/controllers/install.controller.js`
- Modify: `backend/src/controllers/statistics.controller.js`
- Modify: `backend/src/controllers/locationTrack.controller.js`
- Modify: `backend/src/controllers/config.controller.js`
- Modify: `backend/src/routes/statistics.routes.js`
- Modify: `backend/src/routes/dispatchRule.routes.js`
- Modify: `backend/src/routes/supplier.routes.js`
- Modify: `backend/src/routes/locationTrack.routes.js`
- Modify: `backend/src/routes/measure.routes.js`
- Modify: `backend/src/models/index.js`
- Modify: `backend/src/models/installReport.js`
- Modify: `backend/src/models/measureReport.js`
- Modify: `backend/src/models/dispatchRule.js`
- Modify: `backend/src/models/user.js` — 默认角色从 `USER_ROLES.MEASURER` 改为 `USER_ROLES.FIELD_WORKER`
- Modify: `backend/src/services/install.service.js`
- Modify: `backend/src/services/notification.service.js`
- Modify: `backend/src/scripts/init-data.js`

- [ ] **Step 1: 批量替换规则**

在所有后端 `.js` 文件中：

| 旧引用 | 替换为 |
|--------|--------|
| `USER_ROLES.REVIEWER` | 删除或改 `admin` |
| `USER_ROLES.MEASURER` | `USER_ROLES.FIELD_WORKER` |
| `USER_ROLES.INSTALLER` | `USER_ROLES.FIELD_WORKER` |
| `USER_ROLES.CHECKER` | 删除或改 `admin` |
| `role === 'reviewer'` | 删除 |
| `role === 'measurer'` | `role === 'field_worker'` |
| `role === 'installer'` | `role === 'field_worker'` |
| `role === 'checker'` | 删除 |
| `roles: ['admin', 'reviewer']` | `roles: ['admin']` |
| `roles: ['admin', 'measurer']` | `roles: ['admin', 'field_worker']` |
| `roles: ['admin', 'installer']` | `roles: ['admin', 'field_worker']` |

注意：数据库字段名如 `installer_id`、`reviewer_id` 不需要改，这些是物理列名。

- [ ] **Step 2: 更新 init-data.js 测试用户**

旧：
```js
{ username: 'reviewer', real_name: '审核主管', role: 'reviewer' },
{ username: 'checker', real_name: '核对员赵六', role: 'checker' },
{ username: 'installer', real_name: '安装员孙七', role: 'installer' }
```

新：
```js
{ username: 'fieldworker', real_name: '外勤测试员', role: 'field_worker' },
```

- [ ] **Step 3: 重启后端验证**

```bash
cd backend && node src/app.js
```

期望：正常启动，数据库连接成功。

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/*.js backend/src/routes/*.js backend/src/models/*.js backend/src/services/*.js backend/src/scripts/init-data.js
git commit -m "refactor: 更新所有控制器/路由/模型/服务适配新角色"
```

---

### Task 5: 前端路由和导航更新

**Files:**
- Modify: `admin-web/src/router/index.js`
- Modify: `admin-web/src/components/layout/TopNav.vue`
- Modify: `admin-web/src/pages/settings/users.vue` — 角色下拉选项
- Modify: `admin-web/src/pages/dashboard/index.vue`
- Modify: `admin-web/src/pages/review/detail.vue`
- Modify: `admin-web/src/pages/install/detail.vue`
- Modify: `admin-web/src/pages/design/scheme.vue`
- Modify: `admin-web/src/pages/map/index.vue`
- Modify: `admin-web/src/pages/archive/detail.vue`
- Modify: `admin-web/src/pages/settings/dispatch.vue`
- Modify: `admin-web/src/pages/statistics/index.vue`

- [ ] **Step 1: 更新 router/index.js**

路由 roles 配置更新：
```js
// 旧 → 新
roles: ['admin', 'reviewer']                    → roles: ['admin']
roles: ['admin', 'designer', 'reviewer']        → roles: ['admin', 'designer']
roles: ['admin', 'installer']                   → roles: ['admin', 'field_worker']
roles: ['admin', 'producer']                    → 不变
```

- [ ] **Step 2: 更新 TopNav.vue**

```js
// 旧 → 新
{ path: '/design', roles: ['admin', 'designer', 'reviewer'] } → roles: ['admin', 'designer']
{ path: '/install', roles: ['admin', 'installer'] }           → roles: ['admin', 'field_worker']
{ path: '/statistics', roles: ['admin', 'reviewer'] }         → roles: ['admin']
```

- [ ] **Step 3: 更新 users.vue 角色下拉选项**

角色选项从 8 个改为 5 个：`admin`、`designer`、`producer`、`field_worker`、`customer`。

- [ ] **Step 4: 更新其他页面中的角色引用**

在所有 `.vue` 页面文件中搜索 `reviewer`、`measurer`、`installer`、`checker`，将角色相关的引用更新或删除。

- [ ] **Step 5: 验证前端**

```bash
cd admin-web && npm run dev
```

访问 http://localhost:5173，确认无 Vue 运行时错误，导航根据角色正确显示。

- [ ] **Step 6: Commit**

```bash
git add admin-web/src/router/index.js admin-web/src/components/layout/TopNav.vue admin-web/src/pages/**/*.vue
git commit -m "refactor: 前端路由和导航适配5角色体系"
```

---

### Task 6: 全量验证与清理

- [ ] **Step 1: 端到端功能测试**

1. admin 登录 → 确认全部导航可见，能执行审核
2. designer 登录 → 只能看到设计任务
3. producer 登录 → 只能看到生产任务
4. field_worker 登录 → 能看到安装/测量相关功能
5. 测试完整订单流程：申请→审核(admin)→测量(field_worker)→设计(designer)→审核(admin)→生产(producer)→安装(field_worker)→审核(admin)→归档

- [ ] **Step 2: 全量搜索残留引用**

```bash
# 后端
grep -rn "reviewer\|measurer\|installer\|checker" backend/src/ --include="*.js"
# 前端
grep -rn "reviewer\|measurer\|installer\|checker" admin-web/src/ --include="*.vue" --include="*.js"
```

残留的 `installer_id`、`reviewer_id` 等数据库字段名不需要改，只需确认没有角色判断相关的残留。

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "chore: 角色简化最终清理"
```
