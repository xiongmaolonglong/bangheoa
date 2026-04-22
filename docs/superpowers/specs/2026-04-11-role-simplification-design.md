# 角色简化设计文档

**日期**: 2026-04-11
**状态**: 已确认，待实施

## 背景

当前系统有 8 个角色，但实际业务场景只有 3 类人：管理员（审核+全局）、内勤（设计+生产）、外勤（测量+安装）。角色过多导致权限管理混乱、入口不清晰。

## 角色映射

| 旧角色 | 新角色 | 说明 | 操作端 |
|--------|--------|------|--------|
| admin | admin | 不变，负责审批+全局操作 | 网页 |
| reviewer | 删除 | 审核功能合并到 admin | - |
| measurer | field_worker | 外勤，测量+安装同一批人 | APP |
| installer | field_worker | 外勤，测量+安装同一批人 | APP |
| checker | 删除 | 不需要，合并到 admin | - |
| designer | designer | 不变，负责设计方案 | 网页 |
| producer | producer | 不变，负责生产+物料 | 网页 |
| customer | customer | 不变，小程序申请 | 小程序 |

**最终 5 个角色：admin、designer、producer、field_worker、customer**

## 改动范围

### 1. 后端代码

**constants.js** — 更新 USER_ROLES 常量：
```js
const USER_ROLES = {
  ADMIN: 'admin',           // 管理员（含审核权限）
  DESIGNER: 'designer',     // 设计师
  PRODUCER: 'producer',     // 生产员
  FIELD_WORKER: 'field_worker', // 外勤（测量+安装）
  CUSTOMER: 'customer'      // 客户
};
```

**数据库迁移** — 更新 users 表中的 role 字段：
- reviewer → admin
- measurer → field_worker
- installer → field_worker
- checker → admin
- 其他角色保持不变

**权限中间件** — 更新 role 校验逻辑：
- 审核相关接口：admin（原 admin + reviewer）
- 测量相关接口：admin + field_worker（原 admin + measurer）
- 安装相关接口：admin + field_worker（原 admin + installer）

### 2. 前端代码

**路由守卫** — 更新 roles 配置：
- 所有需要 reviewer 的路由改为 admin
- 所有需要 measurer 的路由改为 field_worker
- 所有需要 installer 的路由改为 field_worker

**导航菜单** — 根据新角色重新组织：
- admin：看到全部导航
- designer：设计任务
- producer：生产任务
- field_worker：外勤工作台（测量+安装统一入口）
- customer：订单查看

### 3. APP/小程序

- APP 端 role 校验从 measurer/installer 改为 field_worker
- 工作台统一显示"外勤任务"，按订单状态区分测量/安装阶段

## 数据迁移脚本

创建 `migrations/20260411000000-simplify-roles.js`：

```sql
UPDATE users SET role = 'admin' WHERE role = 'reviewer';
UPDATE users SET role = 'field_worker' WHERE role = 'measurer';
UPDATE users SET role = 'field_worker' WHERE role = 'installer';
UPDATE users SET role = 'admin' WHERE role = 'checker';
```

## 风险控制

- 迁移前备份 users 表
- 迁移脚本可回滚（保留旧值到临时字段 backup_role）
- 迁移后验证各角色用户数量
