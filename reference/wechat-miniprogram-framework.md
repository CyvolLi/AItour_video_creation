# 微信小程序开发框架速查

来源：<https://developers.weixin.qq.com/miniprogram/dev/framework/>

这份文档是对微信官方小程序开发框架内容的整理版，目标是让本项目后续开发时能快速查到框架结构、常用概念和官方入口。

## 1. 框架总览

微信小程序采用“视图层 + 逻辑层”的结构：

- 视图层负责页面展示。
- 逻辑层负责数据处理、页面状态和业务交互。
- 两者通过数据绑定和事件系统通信。

核心思路是：开发者主要关注数据和逻辑，框架负责把数据同步到视图。

## 2. 小程序基本文件

一个页面通常由 4 类文件组成：

- `.js`：页面逻辑
- `.json`：页面配置
- `.wxml`：页面结构
- `.wxss`：页面样式

全局常见文件：

- `app.js`：小程序入口逻辑
- `app.json`：全局页面和窗口配置
- `app.wxss`：全局样式
- `sitemap.json`：页面收录配置

## 3. 页面与应用

### App

`App()` 用于注册小程序实例，常见用途：

- 初始化全局数据
- 获取云环境
- 处理 `onLaunch`、`onShow` 等生命周期

### Page

`Page()` 用于定义单个页面，常见用途：

- 管理页面 `data`
- 响应用户输入
- 发起网络请求
- 页面跳转

### Component

`Component()` 用于封装可复用组件，适合：

- 弹窗
- 卡片
- 选择器
- 复用的交互模块

## 4. 数据绑定

小程序的数据更新主要依赖 `setData()`：

- 直接修改普通对象不会自动刷新视图。
- 调用 `setData()` 才会触发界面更新。
- `setData()` 尽量只更新必要字段，避免一次性塞入过大对象。

本项目里常用的 `app.globalData.task_data` 更适合做跨页面共享状态，但不适合当作唯一状态来源。

## 5. 事件系统

常见事件类型：

- 点击事件：`bindtap`
- 输入事件：`bindinput`
- 表单事件：`bindsubmit`
- 列表和自定义事件：组件中通过 `triggerEvent` 传递

事件对象里常用字段：

- `target`：触发事件的元素
- `currentTarget`：绑定事件的元素
- `detail`：事件携带的数据

## 6. 路由与页面跳转

常见跳转方式：

- `wx.navigateTo()`：打开新页面
- `wx.redirectTo()`：关闭当前页并跳转
- `wx.reLaunch()`：关闭全部页面并打开新页面
- `wx.switchTab()`：切换 tabBar 页面
- `wx.navigateBack()`：返回上一页

注意：

- `app.json` 中声明的页面必须真实存在。
- 页面路径写错或文件缺失，会直接导致模拟器启动失败。

## 7. 生命周期

### App 生命周期

- `onLaunch`：小程序初始化
- `onShow`：小程序显示
- `onHide`：小程序隐藏

### Page 生命周期

- `onLoad`：页面加载
- `onShow`：页面显示
- `onReady`：页面首次渲染完成
- `onHide`：页面隐藏
- `onUnload`：页面卸载

## 8. 常用配置

### app.json

主要负责：

- 页面路径声明
- 首页设置
- 全局窗口样式
- tabBar 配置
- sitemap 配置

### 页面 json

页面级配置会覆盖 `app.json` 中对应项，适合做单页差异化设置。

## 9. 视图层语言

### WXML

用于描述页面结构，常见语法包括：

- 数据插值：`{{}}`
- 条件渲染：`wx:if`
- 列表渲染：`wx:for`
- 模板复用

### WXSS

用于描述样式，整体上类似 CSS，但有小程序自己的限制和适配方式。

### WXS

WXS 是小程序里的脚本语言，常用于视图层轻量计算。

## 10. 常用 API

### 基础能力

- `wx.request`
- `wx.uploadFile`
- `wx.downloadFile`
- `wx.setStorageSync`
- `wx.getStorageSync`

### 用户能力

- `wx.getUserProfile`
- `wx.chooseMedia`
- `wx.chooseImage`

### 导航能力

- `wx.navigateTo`
- `wx.redirectTo`
- `wx.switchTab`

### 云开发

- `wx.cloud.init`
- `wx.cloud.callFunction`
- `wx.cloud.uploadFile`
- `wx.cloud.getTempFileURL`

## 11. 组件

组件是页面 UI 的基础单元，适合抽离：

- 弹窗
- 按钮组
- 标签页
- 列表项

组件开发重点：

- `properties` 接收外部参数
- `data` 存本地状态
- `methods` 处理交互
- `triggerEvent` 向外抛事件

## 12. 性能与实践建议

- `setData()` 只传必要字段。
- 列表渲染尽量加 `wx:key`。
- 需要异步任务时，用状态机思路管理状态。
- 复杂页面尽量拆成组件。
- 网络请求统一封装，便于重试和错误处理。

## 13. 与本项目强相关的点

本项目目前最常用到的官方能力是：

- 页面路由
- `App` / `Page` 生命周期
- `setData`
- `wx.request` 封装
- `wx.cloud` 获取 `openid`
- `wx.chooseMedia` + `wx.cloud.uploadFile`

也就是说，这个项目的核心不是“如何写单页”，而是“如何把多页面流程和异步后端任务串起来”。

## 14. 官方入口索引

- 框架总览：<https://developers.weixin.qq.com/miniprogram/dev/framework/>
- 项目结构：<https://developers.weixin.qq.com/miniprogram/dev/framework/structure.html>
- 运行机制：<https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html>
- App：<https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/app.html>
- Page：<https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page.html>
- Component：<https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/>
- WXML：<https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxml/>
- WXSS：<https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html>
- API：<https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/api.html>
- 云开发：<https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/>

