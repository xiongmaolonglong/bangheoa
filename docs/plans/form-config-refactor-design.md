# FormConfig 页面重构设计

## 概述

将 800 行的 FormConfig.vue 拆分为两个独立页面 + 两个子组件 + 一个系统设置页模块。

## 路由变更

| 路径 | 页面 | 说明 |
|------|------|------|
| /settings/form-fields | 表单字段配置 | 基本信息字段管理（拖拽排序） |
| /settings/ad-types | 广告类型配置 | 类型/面/属性管理 |
| /settings/system | 系统配置 | 功能开关 + 材质配置（新增） |

## 文件结构

```
admin-web/src/pages/settings/
├── form-fields.vue              # 表单字段配置页
├── ad-types.vue                 # 广告类型配置页
├── system.vue                   # 系统配置页（功能开关+材质）
└── FormConfig.vue               # 删除原文件

admin-web/src/components/settings/
├── FormFieldTable.vue           # 字段拖拽表格组件
└── AdTypeInlineEditor.vue       # 广告类型行内编辑组件
```

## 组件设计

### FormFieldTable.vue
- Props: fields, loading
- Emits: update:fields, delete:field, add:field
- 使用 vuedraggable 替代原生 HTML5 拖拽
- 字段名称/类型/必填/选项内联编辑

### AdTypeInlineEditor.vue
- Props: adTypes
- Emits: save:adType, delete:adType
- el-table 行内展开编辑
- 展开行显示面卡片网格
- 面内属性快速添加下拉

## 数据流

- 字段配置: GET/POST/PUT/DELETE /forms/fields
- 广告类型: GET/POST/PUT/DELETE /ad-types（含 faces + inline_attributes）
- 功能开关: GET/PUT /forms/features
- 材质配置: GET/PUT /config/materials

## 错误处理

- 单行保存失败不阻断其他项
- 细化错误提示（超时/403/500）
- 删除操作二次确认
