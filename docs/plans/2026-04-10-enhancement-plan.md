# 功能增强实施计划

## 用户选择
- ✅ 订单看板视图
- ✅ 浏览器推送通知
- ✅ 自动派单规则
- ✅ 客户管理模块

---

## 一、订单看板视图

### 功能描述
在订单列表页增加「看板」视图模式，支持拖拽变更状态。

### 技术方案
- 使用 `vuedraggable`（已安装）
- 按状态分列显示：待审核、测量中、设计中、生产中、安装中、已完成
- 拖拽后调用 `orderApi.advance()` 更新状态

### 文件变更
```
admin-web/src/pages/order/index.vue    # 添加视图切换和看板组件
admin-web/src/components/OrderKanban.vue # 新建看板组件（已存在）
```

### 实施时间
1-2 天

---

## 二、浏览器推送通知

### 功能描述
任务分配、状态变更时发送浏览器推送通知。

### 技术方案
- 使用 Notification API
- 结合现有 Socket.IO 实时通信
- 用户首次进入时请求通知权限

### 文件变更
```
admin-web/src/utils/notification.js     # 新建通知工具
admin-web/src/App.vue                   # 初始化通知权限
backend/src/services/notification.service.js # 扩展推送逻辑
```

### 实施时间
半天

---

## 三、自动派单规则

### 功能描述
审核通过后，根据区域、负载自动分配处理人。

### 技术方案
- 后端新增派单规则表
- 规则条件：区域匹配 + 角色匹配 + 负载均衡
- 审核通过时自动触发

### 文件变更
```
backend/src/models/dispatchRule.js      # 新建派单规则模型
backend/src/services/dispatch.service.js # 新建派单服务
backend/src/controllers/review.controller.js # 审核时调用派单
admin-web/src/pages/settings/dispatch.vue # 派单规则配置页
```

### 实施时间
2-3 天

---

## 四、客户管理模块

### 功能描述
客户档案管理、历史订单查看、联系记录。

### 技术方案
- 扩展现有 User 模型或新建 Customer 模型
- 客户详情页展示历史订单、统计信息
- 支持客户标签、备注

### 文件变更
```
backend/src/models/customer.js           # 新建客户模型
backend/src/controllers/customer.controller.js
backend/src/routes/customer.routes.js
admin-web/src/pages/customer/index.vue   # 客户列表
admin-web/src/pages/customer/detail.vue  # 客户详情
admin-web/src/api/index.js               # 新增客户 API
```

### 实施时间
2-3 天

---

## 实施顺序

```
第1天：浏览器推送通知 + 订单看板视图
第2天：订单看板视图完善
第3-4天：客户管理模块
第5-6天：自动派单规则
```

---

## 预期效果

| 功能 | 效果 |
|------|------|
| 订单看板 | 状态一目了然，拖拽操作效率提升 50% |
| 推送通知 | 任务响应时间缩短 70% |
| 自动派单 | 审核效率提升，派单时间从 5 分钟降至即时 |
| 客户管理 | 客户信息集中管理，查询便捷 |
