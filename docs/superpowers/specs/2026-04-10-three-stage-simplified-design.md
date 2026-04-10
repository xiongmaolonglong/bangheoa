# 三阶段精简模型设计文档

**日期**: 2026-04-10
**状态**: 待审核
**作者**: Claude Code

## 概述

将户外广告派单系统从 10 阶段流程精简为 3 个核心阶段，每个阶段内部包含子步骤，只在阶段完成时触发一次审核，减少用户感知复杂度，同时建立完整的追溯体系。

## 旧流程 vs 新流程

| 对比项 | 旧流程 | 新流程 |
|--------|--------|--------|
| 可见阶段数 | 10 | 3 |
| 审核次数 | 4 次 | 3 次（每阶段 1 次） |
| 派单粒度 | 每子任务单独派单 | 阶段级别派单 |
| 追溯层级 | 订单状态变更 | 订单 + 阶段 + 子任务 三层 |

```
旧流程: 申请测量→审核→测量→审核→设计→审核→生产→核对→安装→审核→归档
新流程: 【生产准备】→【生产执行】→【交付验收】→归档
```

## 状态机设计

### 顶层状态

```
pending_review → preparing → preparing_review → producing → producing_review
→ delivering → delivering_review → archived
                                          ↓ (任何审核驳回)
                                       rejected
```

### 子状态映射

| 顶层状态 | 内部子任务 | 旧状态映射 |
|----------|-----------|-----------|
| `preparing` 生产准备中 | measuring, designing | measuring, designing |
| `preparing_review` 准备待审 | - | measure_review, design_review (合并) |
| `producing` 生产执行中 | producing, checking | producing, checking |
| `producing_review` 生产待审 | - | 新增审核点 |
| `delivering` 交付验收中 | installing | installing |
| `delivering_review` 验收待审 | - | install_review |
| `rejected` 已驳回 | - | rejected |
| `archived` 已归档 | - | archived |

### 驳回规则

- `preparing_review` 驳回 → `preparing`（重新测量或重新设计）
- `producing_review` 驳回 → `producing`（重新生产或重新核对）
- `delivering_review` 驳回 → `delivering`（重新安装）

## 数据模型变更

### 新增模型

#### 1. OrderStage（阶段记录表）

```javascript
{
  id: INTEGER PK,
  order_id: INTEGER FK → orders,
  stage_type: ENUM('preparing', 'producing', 'delivering'),
  status: ENUM('in_progress', 'completed', 'rejected'),
  assignee_id: INTEGER FK → users,      // 阶段负责人
  started_at: DATE,
  completed_at: DATE,
  created_at: DATE,
  updated_at: DATE
}
```

#### 2. OrderSubtask（子任务表）

```javascript
{
  id: INTEGER PK,
  stage_id: INTEGER FK → order_stages,
  order_id: INTEGER FK → orders,
  subtask_type: ENUM('measure', 'design', 'produce', 'check', 'install'),
  status: ENUM('pending', 'in_progress', 'completed'),
  assignee_id: INTEGER FK → users,
  started_at: DATE,
  completed_at: DATE,
  data: JSON,           // 子任务数据（测量数据、设计说明等）
  created_at: DATE,
  updated_at: DATE
}
```

#### 3. OrderRejection（驳回记录表）

```javascript
{
  id: INTEGER PK,
  order_id: INTEGER FK → orders,
  stage_type: ENUM('preparing', 'producing', 'delivering'),
  rejected_by: INTEGER FK → users,
  rejected_at: DATE,
  reason: TEXT,
  rejection_count: INTEGER,   // 该阶段被驳回次数
  resolved_at: DATE,          // 重新提交时间
  created_at: DATE
}
```

#### 4. OrderFile（文件关联表）

```javascript
{
  id: INTEGER PK,
  order_id: INTEGER FK → orders,
  stage_id: INTEGER FK → order_stages,
  subtask_id: INTEGER FK → order_subtasks,
  file_type: ENUM('measure_photo', 'design_drawing', 'install_photo', 'document'),
  file_path: STRING,
  file_name: STRING,
  uploaded_by: INTEGER FK → users,
  uploaded_at: DATE,
  created_at: DATE
}
```

### 修改现有模型

#### Order 模型

```javascript
// 新增字段
status_group: ENUM('preparing', 'producing', 'delivering', 'archived', 'rejected'),
current_stage_id: INTEGER FK → order_stages,
```

#### 移除模型（不再需要）

- MeasureFace → 归入 OrderSubtask (data JSON)
- DesignScheme, DesignGroup, DesignDrawing → 归入 OrderSubtask + OrderFile
- MeasureReport → 归入 OrderSubtask (data JSON)
- InstallReport → 归入 OrderSubtask (data JSON)

这些模型的字段迁移到 `OrderSubtask.data` JSON 中，文件迁移到 `OrderFile` 表。

## API 变更

### 新增接口

```
POST   /api/v1/orders/:id/stages/:stageType/complete   // 完成阶段
POST   /api/v1/orders/:id/stages/:stageType/reject     // 驳回阶段
GET    /api/v1/orders/:id/timeline                     // 完整时间线
GET    /api/v1/orders/:id/stages                       // 阶段详情
POST   /api/v1/orders/:id/stages/:stageType/submit     // 提交审核
PUT    /api/v1/orders/:id/stages/:stageId/subtasks/:subtaskId  // 更新子任务
POST   /api/v1/orders/:id/files                        // 上传文件（关联阶段/子任务）
```

### 移除/废弃接口

```
POST   /api/v1/measure/:orderId/submit    // 合并到子任务更新
POST   /api/v1/design/:orderId/submit     // 合并到子任务更新
POST   /api/v1/install/:orderId/submit    // 合并到子任务更新
POST   /api/v1/review/:id/approve         // 改为阶段级别审核
POST   /api/v1/review/:id/reject          // 改为阶段级别驳回
```

### 保留接口（不变更）

```
GET    /api/v1/orders                     // 订单列表
GET    /api/v1/orders/:id                 // 订单详情
POST   /api/v1/orders                     // 创建订单
GET    /api/v1/users                      // 用户管理
POST   /api/v1/auth/login                 // 登录
GET    /api/v1/statistics/dashboard        // 仪表盘
```

## 追溯体系

### 操作日志（OrderLog 增强）

现有 OrderLog 保留，新增字段：

```javascript
{
  stage_id: INTEGER FK → order_stages,
  subtask_id: INTEGER FK → order_subtasks,
  field_changes: JSON,  // { from: 'old_value', to: 'new_value' }
  files_attached: JSON  // 关联的文件 ID 列表
}
```

### 时间线 API 响应结构

```json
{
  "order_id": 1,
  "timeline": [
    {
      "type": "stage_transition",
      "from": "preparing",
      "to": "preparing_review",
      "operator": "张三",
      "timestamp": "2026-04-10T10:00:00Z"
    },
    {
      "type": "subtask_completed",
      "stage": "preparing",
      "subtask": "measure",
      "operator": "李四",
      "timestamp": "2026-04-10T09:00:00Z",
      "files": ["测量照片1.jpg", "测量照片2.jpg"]
    },
    {
      "type": "rejection",
      "stage": "preparing",
      "reason": "测量数据不完整",
      "rejected_by": "王五",
      "timestamp": "2026-04-10T11:00:00Z",
      "rejection_count": 1
    }
  ]
}
```

## 派单规则

### 阶段级派单

- 订单进入新阶段时，自动分配阶段负责人
- 规则：区域匹配 + 角色匹配 + 当前负载
- 阶段内的子任务由阶段负责人分配或自动分配

### 自动派单逻辑

```javascript
async function assignStage(stageType, order) {
  const rules = await getDispatchRules(order.region, stageType);
  const candidates = await getCandidates(rules);
  
  // 按负载排序（当前处理中的阶段数最少的人优先）
  const assignee = sortByWorkload(candidates)[0];
  
  await OrderStage.create({
    order_id: order.id,
    stage_type: stageType,
    assignee_id: assignee.id,
    status: 'in_progress'
  });
}
```

## 前端改造

### 页面结构变更

| 页面 | 变更 |
|------|------|
| 订单列表 | 状态列显示 3 阶段，新增子状态标签 |
| 订单详情 | 改为阶段卡片布局，每个阶段可展开看子任务 |
| 审核中心 | 按阶段审核，非按子任务审核 |
| 我的任务 | 显示阶段任务 + 子任务两级 |
| 新增: 时间线页 | 完整追溯时间线，含驳回历史 |
| 新增: 文件管理页 | 按阶段/子任务组织的文件列表 |

### 订单详情页布局

```
┌─────────────────────────────────┐
│ 订单基本信息                      │
├─────────────────────────────────┤
│ [✓] 生产准备阶段    已完成 4/10   │
│     ├─ 测量 (李四) ✓              │
│     └─ 设计 (王五) ✓              │
├─────────────────────────────────┤
│ [→] 生产执行阶段    进行中 1/2    │
│     ├─ 生产 (赵六) 进行中          │
│     └─ 核对 (待分配)              │
├─────────────────────────────────┤
│ [ ] 交付验收阶段    未开始         │
│     └─ 安装 (待分配)              │
├─────────────────────────────────┤
│ 追溯时间线                        │
│ 4/10 10:00 - 生产准备完成 张三    │
│ 4/10 09:00 - 设计完成 王五       │
│ 4/9  15:00 - 测量完成 李四       │
│ 4/9  14:00 - 测量驳回:数据不全   │
└─────────────────────────────────┘
```

## 迁移方案

### 数据迁移

1. 现有 Order 的 status 映射到新状态
2. 现有 MeasureFace 数据迁移到 OrderSubtask
3. 现有 DesignScheme/Group/Drawing 迁移到 OrderSubtask + OrderFile
4. 现有 MeasureReport/InstallReport 迁移到 OrderSubtask.data

### 渐进式迁移

- 先部署新模型，旧 API 保留但标记为 deprecated
- 新订单使用新流程，旧订单保持原流程直到完成
- 全部迁移完成后移除旧 API

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 数据迁移丢失 | 迁移脚本带回滚机制，迁移前备份 |
| 用户不习惯 | 前端保留状态映射显示，逐步引导 |
| 性能下降 | 新表加索引，查询优化 |
| 旧代码残留 | 定义废弃时间表，强制清理 |

## 成功标准

1. 用户感知的操作步骤减少 60% 以上（10 → 3 阶段）
2. 审核次数减少 25%（4 → 3 次）
3. 任何操作可追溯到：谁、什么时候、做了什么、改了哪些字段
4. 驳回记录完整保留，可回溯每次驳回原因和修改
