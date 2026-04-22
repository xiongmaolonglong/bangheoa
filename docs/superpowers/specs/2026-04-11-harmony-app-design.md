# 鸿蒙外勤APP 设计文档

> 日期: 2026-04-11
> 项目: 户外广告测量安装派单系统 - 鸿蒙外勤端
> 目标: HarmonyOS NEXT 6.0.2, ArkTS + ArkUI

## 概述

基于现有后端 REST API (Express + MySQL) 和管理后台(Vue3),构建鸿蒙原生外勤作业APP,
为测量员、安装员、设计师等外勤人员提供移动端的任务管理和数据上报能力。

## 架构

```
harmony-app/entry/src/main/ets/
├── pages/              # 页面层 (9个页面)
├── viewmodel/          # 状态管理层 (AppStorage模式)
├── model/              # 数据模型 (TypeScript接口)
├── common/             # 公共模块 (Http/Storage/Util/Constants/Api)
└── entryability/       # Ability入口
```

## 页面清单

| 页面 | 文件 | 功能 |
|------|------|------|
| 登录 | Login.ets | 用户名+密码JWT登录 |
| 首页 | Home.ets | 状态筛选Tab + 任务卡片列表 |
| 订单详情 | OrderDetail.ets | 完整订单信息 + 操作按钮 + 日志 |
| 申请测量 | OrderCreate.ets | 新建订单表单 + 地址地理编码 |
| 测量上报 | MeasureReport.ets | 多测量面填写 + 拍照 |
| 安装上报 | InstallReport.ets | 安装说明 + 照片上传 |
| 通知中心 | Notifications.ets | 通知列表 + 未读标记 |
| 地图 | Map.ets | 订单坐标展示 (Web组件过渡) |
| 我的 | Mine.ets | 用户信息 + 功能菜单 + 退出 |

## 公共模块

- **HttpUtil** - 封装 http.HTTPRequest, 自动注入Bearer Token
- **StorageUtil** - Preferences持久化存储
- **Api** - 20+ API类, 1:1映射后端路由
- **Constants** - 订单状态/角色/颜色常量
- **CommonUtil** - 日期格式化/状态文本/JSON解析

## 数据流

```
用户操作 → 页面 → ViewModel → Api → HttpUtil → 后端REST API
                                           ↓
页面 ← @State更新 ← ViewModel ← 解析响应
```

## 权限

- INTERNET - 网络连接
- LOCATION / LOCATION_IN_BACKGROUND - 定位追踪
- CAMERA - 拍照
- READ_MEDIA / WRITE_MEDIA - 照片读写

## 待完善

1. 地图页需配置华为地图SDK或高德地图鸿蒙SDK
2. 图片上传需完善photoAccessHelper调用
3. 需添加定位后台服务(BackgroundTaskManager)
4. 消息推送需接入华为Push Kit
5. 后端BASE_URL需根据环境配置
