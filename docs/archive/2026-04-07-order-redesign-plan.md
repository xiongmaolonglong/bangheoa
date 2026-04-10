# 订单系统重新设计 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**设计文档:** `docs/superpowers/specs/2026-04-07-order-redesign-design.md`

**目标:** 实现可配置的订单创建系统，支持多广告项目、多面配置、属性模板

**状态:** ✅ 全部完成

---

## 任务清单

---

### Task 1: 创建数据模型 ✅ 已完成

**Files:**
- Create: `backend/src/models/Face.js`
- Create: `backend/src/models/AttributeTemplate.js`
- Create: `backend/src/models/AttributeField.js`
- Modify: `backend/src/models/AdType.js`
- Modify: `backend/src/models/OrderAdItem.js`
- Modify: `backend/src/models/index.js`

- [x] **Step 1: 创建 Face 模型**

```javascript
// backend/src/models/Face.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Face extends Model {}

Face.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '面名称'
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '面代码'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    }
  },
  {
    sequelize,
    modelName: 'Face',
    tableName: 'faces',
    comment: '面配置表'
  }
);

module.exports = Face;
```

- [x] **Step 2: 创建 AttributeTemplate 模型**

```javascript
// backend/src/models/AttributeTemplate.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AttributeTemplate extends Model {}

AttributeTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '模板名称'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '模板说明'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1启用 0禁用'
    }
  },
  {
    sequelize,
    modelName: 'AttributeTemplate',
    tableName: 'attribute_templates',
    comment: '属性模板表'
  }
);

module.exports = AttributeTemplate;
```

- [x] **Step 3: 创建 AttributeField 模型**

```javascript
// backend/src/models/AttributeField.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AttributeField extends Model {}

AttributeField.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属模板ID'
    },
    field_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '属性名称'
    },
    field_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '属性标识'
    },
    field_type: {
      type: DataTypes.ENUM('text', 'number', 'select', 'radio', 'checkbox', 'textarea', 'date'),
      allowNull: false,
      defaultValue: 'text',
      comment: '字段类型'
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '选项配置'
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '单位'
    },
    is_required: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否必填'
    },
    default_value: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '默认值'
    },
    placeholder: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '占位文本'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态'
    }
  },
  {
    sequelize,
    modelName: 'AttributeField',
    tableName: 'attribute_fields',
    comment: '属性字段表',
    indexes: [
      { unique: true, fields: ['template_id', 'field_key'] }
    ]
  }
);

module.exports = AttributeField;
```

- [x] **Step 4: 修改 AdType 模型，添加 face_config 字段**

在 `backend/src/models/AdType.js` 中添加:

```javascript
face_config: {
  type: DataTypes.JSON,
  allowNull: true,
  comment: '面配置: [{ face_id, template_id }]'
}
```

- [x] **Step 5: 修改 OrderAdItem 模型**

确保 `backend/src/models/OrderAdItem.js` 包含:

```javascript
faces: {
  type: DataTypes.JSON,
  allowNull: true,
  comment: '面的数据'
}
```

- [x] **Step 6: 在 models/index.js 注册新模型和关联**

```javascript
// 添加导入
const Face = require('./Face');
const AttributeTemplate = require('./AttributeTemplate');
const AttributeField = require('./AttributeField');

// 添加关联
AttributeTemplate.hasMany(AttributeField, { as: 'fields', foreignKey: 'template_id' });
AttributeField.belongsTo(AttributeTemplate, { as: 'template', foreignKey: 'template_id' });

// 导出
module.exports = {
  // ... 原有模型
  Face,
  AttributeTemplate,
  AttributeField
};
```

---

### Task 2: 创建后端控制器和路由 ✅ 已完成

**Files:**
- Create: `backend/src/controllers/face.controller.js`
- Create: `backend/src/controllers/attribute.controller.js`
- Modify: `backend/src/controllers/adType.controller.js`
- Create: `backend/src/routes/face.routes.js`
- Create: `backend/src/routes/attribute.routes.js`
- Modify: `backend/src/routes/index.js`

- [x] **Step 1: 创建 face.controller.js**

实现完整的 CRUD 操作：
- `getList` - 获取面列表
- `getById` - 获取单个面
- `create` - 创建面
- `update` - 更新面
- `delete` - 删除面

- [x] **Step 2: 创建 attribute.controller.js**

实现模板和属性的 CRUD：
- `getTemplates` - 获取模板列表（含字段）
- `getTemplateById` - 获取模板详情
- `createTemplate` - 创建模板
- `updateTemplate` - 更新模板
- `deleteTemplate` - 删除模板
- `createField` - 添加属性字段
- `updateField` - 更新属性字段
- `deleteField` - 删除属性字段

- [x] **Step 3: 扩展 adType.controller.js**

添加:
- `getConfig` - 获取广告类型完整配置（含面和属性模板）

- [x] **Step 4: 创建 face.routes.js**

- [x] **Step 5: 创建 attribute.routes.js**

- [x] **Step 6: 在 routes/index.js 注册新路由**

---

### Task 3: 更新初始化数据脚本 ✅ 已完成

**Files:**
- Modify: `backend/src/scripts/init-data.js`

- [x] **Step 1: 添加面配置初始化数据**

```javascript
const faces = [
  { name: '正面', code: 'front', sort_order: 1 },
  { name: '左侧', code: 'left', sort_order: 2 },
  { name: '右侧', code: 'right', sort_order: 3 },
  { name: '顶部', code: 'top', sort_order: 4 },
  { name: '背面', code: 'back', sort_order: 5 }
];
```

- [x] **Step 2: 添加属性模板初始化数据**

基础尺寸模板:
- 宽度 (number, 米)
- 高度 (number, 米)
- 材质 (select)
- 数量 (number, 个)
- 备注 (textarea)

发光字专用模板:
- 字数 (number, 个)
- 材质 (select)
- 是否亮灯 (radio)
- 安装方式 (select)
- 备注 (textarea)

- [x] **Step 3: 更新广告类型初始化数据，添加 face_config**

---

### Task 4: 创建前端 API 封装 ✅ 已完成

**Files:**
- Create: `admin-web/src/api/face.js`
- Create: `admin-web/src/api/attribute.js`

- [x] **Step 1: 创建 face.js API**

```javascript
import request from './request';

export default {
  getList: (params) => request.get('/faces', { params }),
  getById: (id) => request.get(`/faces/${id}`),
  create: (data) => request.post('/faces', data),
  update: (id, data) => request.put(`/faces/${id}`, data),
  delete: (id) => request.delete(`/faces/${id}`)
};
```

- [x] **Step 2: 创建 attribute.js API**

```javascript
import request from './request';

export default {
  // 模板
  getTemplates: (params) => request.get('/attribute-templates', { params }),
  getTemplateById: (id) => request.get(`/attribute-templates/${id}`),
  createTemplate: (data) => request.post('/attribute-templates', data),
  updateTemplate: (id, data) => request.put(`/attribute-templates/${id}`, data),
  deleteTemplate: (id) => request.delete(`/attribute-templates/${id}`),

  // 字段
  createField: (templateId, data) => request.post(`/attribute-templates/${templateId}/fields`, data),
  updateField: (id, data) => request.put(`/attribute-fields/${id}`, data),
  deleteField: (id) => request.delete(`/attribute-fields/${id}`)
};
```

- [x] **Step 3: 更新 api/index.js 导出**

---

### Task 5: 更新系统设置页面 ✅ 已完成

**Files:**
- Modify: `admin-web/src/pages/settings/index.vue`

- [x] **Step 1: 添加"面配置" Tab**

实现:
- 面列表展示
- 新增/编辑/删除面
- 排序功能

- [x] **Step 2: 添加"属性模板" Tab**

实现:
- 模板列表（折叠面板展示字段）
- 新增/编辑/删除模板
- 新增/编辑/删除属性字段
- 字段类型支持（文本、数字、下拉、单选、复选、多行文本、日期）

- [x] **Step 3: 扩展"广告类型" Tab**

实现:
- 原有基本信息编辑
- 新增面配置区域
- 可选择面和对应的属性模板
- 支持添加/删除面配置

---

### Task 6: 重写订单创建页面 ✅ 已完成

**Files:**
- Rewrite: `admin-web/src/pages/order/create.vue`
- Create: `admin-web/src/components/AdItemForm.vue`
- Create: `admin-web/src/components/FaceForm.vue`

- [x] **Step 1: 创建 FaceForm.vue 组件**

```vue
<!-- 单个面的表单 -->
<template>
  <div class="face-form">
    <div class="face-header">
      <span class="face-name">{{ faceName }}</span>
    </div>

    <!-- 图片上传（必填） -->
    <el-form-item label="现场照片" required>
      <el-upload
        v-model:file-list="localImages"
        action="/api/v1/upload/image"
        list-type="picture-card"
        :headers="{ Authorization: token }"
        :on-success="handleUploadSuccess"
        :on-remove="handleRemove"
        multiple
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
    </el-form-item>

    <!-- 动态属性表单 -->
    <el-form-item
      v-for="field in fields"
      :key="field.id"
      :label="field.field_name"
      :required="field.is_required"
    >
      <!-- 根据字段类型渲染不同控件 -->
    </el-form-item>
  </div>
</template>
```

- [x] **Step 2: 创建 AdItemForm.vue 组件**

```vue
<!-- 单个广告项目的表单 -->
<template>
  <el-card class="ad-item-card">
    <template #header>
      <div class="card-header">
        <el-select v-model="adTypeId" placeholder="选择广告类型" @change="handleAdTypeChange">
          <el-option v-for="t in adTypes" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
        <el-button text type="danger" @click="$emit('remove')">删除项目</el-button>
      </div>
    </template>

    <!-- 面表单列表 -->
    <FaceForm
      v-for="faceConfig in faceConfigs"
      :key="faceConfig.face_id"
      :face-id="faceConfig.face_id"
      :template-id="faceConfig.template_id"
      v-model="faceData[faceConfig.face_id]"
    />

    <!-- 项目备注 -->
    <el-form-item label="备注">
      <el-input v-model="remark" type="textarea" />
    </el-form-item>
  </el-card>
</template>
```

- [x] **Step 3: 重写 create.vue 为分步骤向导**

```vue
<template>
  <div class="order-create">
    <el-steps :active="currentStep" finish-status="success" align-center>
      <el-step title="基本信息" />
      <el-step title="广告项目" />
      <el-step title="确认提交" />
    </el-steps>

    <!-- Step 1: 基本信息 -->
    <div v-show="currentStep === 0" class="step-content">
      <!-- 基本信息 + 动态表单 -->
    </div>

    <!-- Step 2: 广告项目 -->
    <div v-show="currentStep === 1" class="step-content">
      <el-button type="primary" @click="addAdItem">添加广告项目</el-button>
      <AdItemForm
        v-for="(item, index) in adItems"
        :key="index"
        v-model="adItems[index]"
        @remove="removeAdItem(index)"
      />
    </div>

    <!-- Step 3: 确认提交 -->
    <div v-show="currentStep === 2" class="step-content">
      <!-- 汇总预览 -->
    </div>

    <div class="step-actions">
      <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
      <el-button v-if="currentStep < 2" type="primary" @click="nextStep">下一步</el-button>
      <el-button v-if="currentStep === 2" type="success" @click="submit">提交订单</el-button>
    </div>
  </div>
</template>
```

- [x] **Step 4: 实现图片上传逻辑**

- [x] **Step 5: 实现动态属性表单渲染**

- [x] **Step 6: 实现表单验证**

- [x] **Step 7: 实现提交逻辑**

---

### Task 7: 更新订单控制器 ✅ 已完成

**Files:**
- Modify: `backend/src/controllers/order.controller.js`

- [x] **Step 1: 更新创建订单逻辑**

处理 OrderAdItem 和 faces 数据:
```javascript
// 创建订单后
if (adItems && adItems.length > 0) {
  for (const item of adItems) {
    await OrderAdItem.create({
      order_id: order.id,
      ad_type_id: item.ad_type_id,
      remark: item.remark,
      faces: item.faces
    });
  }
}
```

- [x] **Step 2: 更新获取订单详情逻辑**

包含广告项目数据:
```javascript
const order = await Order.findByPk(id, {
  include: [
    {
      model: OrderAdItem,
      as: 'adItems'
    }
  ]
});
```

---

## 执行顺序

1. **Task 1**: 创建数据模型（基础）
2. **Task 2**: 创建后端控制器和路由
3. **Task 3**: 更新初始化数据脚本
4. **Task 4**: 创建前端 API 封装
5. **Task 5**: 更新系统设置页面
6. **Task 6**: 重写订单创建页面
7. **Task 7**: 更新订单控制器

---

## 验收清单 ✅ 全部通过

- [x] 后端服务可正常启动 ✅
- [x] 面配置 API 正常工作 ✅
- [x] 属性模板 API 正常工作 ✅
- [x] 广告类型可配置面和属性模板 ✅
- [x] 系统设置页面可管理面配置 ✅
- [x] 系统设置页面可管理属性模板 ✅
- [x] 新建订单页面为分步骤向导 ✅
- [x] 可添加多个广告项目 ✅
- [x] 每个项目根据配置显示面和属性 ✅
- [x] 每个面可上传多张图片 ✅
- [x] 提交后数据正确保存 ✅
