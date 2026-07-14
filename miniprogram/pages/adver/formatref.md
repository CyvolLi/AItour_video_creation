# 小程序连接微信小店 — 接入与测试文档

> 依据官方文档整理并落地到本项目 `pages/adver`。  
> 主文档：[小程序连接微信小店介绍](https://developers.weixin.qq.com/doc/store/shop/linkstore/miniprogram_connection/miniprogram_desc.html)

---

## 1. 目标

在小程序内展示微信小店商品，用户点击后进入小店商品页完成交易。  
**不使用** `wx.navigateToMiniProgram` 拼 path 的方式（官方商品跳转不依赖 path）。

## 2. 官方能力清单

### 2.1 小程序组件

| 组件 | 用途 | 基础库 | 文档 |
|------|------|--------|------|
| `store-product` | 商品卡 + 跳转交易 | ≥ 3.5.5 | [链接](https://developers.weixin.qq.com/miniprogram/dev/component/store-product.html) |
| `store-home` | 店铺首页卡 | ≥ 3.5.5 | [链接](https://developers.weixin.qq.com/miniprogram/dev/component/store-home.html) |
| `store-coupon` | 优惠券卡 | ≥ 3.8.3 | [链接](https://developers.weixin.qq.com/miniprogram/dev/component/store-coupon.html) |
| `store-gift` | 礼物 | ≥ 3.8.10 | [链接](https://developers.weixin.qq.com/miniprogram/dev/component/store-gift.html) |

###2.1.1 具体展开
store-product
基础库 3.5.5 开始支持，低版本需做兼容处理。

微信 鸿蒙 OS 版：支持

相关文档: 微信小店指引

渲染框架支持情况：Skyline （使用最新 Nightly 工具调试）、WebView

功能描述
小程序内嵌微信小店商品，展示小店商品，并进行跳转交易。支持小店优选联盟带货跟佣功能。

通用属性
属性	类型	默认值	必填	说明	最低版本
appid	string		是	小店appid。获取方式：小店后台 - 店铺管理 - 基础信息 - 账号信息 - 微信小店ID。	3.5.5
product-id	string		是	商品id。获取小店商品id，可以通过API获取(参考链接)或通过小店后台 - 商品管理 - 商品列表 - 规格/编码获取。	3.5.5
product-promotion-link	string		否	带货商品跟佣信息。若需要商品售卖时使用小店优选联盟带货跟佣功能，可以通过API获取带货商品跟佣信息(参考链接)。	3.5.5
media-id	string		否	媒体文件id。可以通过API获取(参考链接)。	3.7.1
custom-style	object		否	自定义样式。支持自定义的样式请查看custom-style。	3.7.1
custom-content	boolean	false	否	开启自定义插槽。开启后可自行控制卡片内容。	3.7.2
open-page	string	product-detail	否	设置点击打开的页面(同时开启 custom-content 属性后生效)。	3.7.4
合法值	说明	最低版本
product-detail	商品详情页	3.7.4
gift-product-detail	送礼商品详情页	3.7.7
buy	下单页，只能支持「热招品牌且关联小店」商家	3.7.4
gift	送礼下单页，只能支持「热招品牌且关联小店」商家	3.15.1
logo-position	string	bottom-left	否	设置小店标识的位置，不允许隐藏(同时开启 custom-content 属性后生效)。	3.7.2
合法值	说明
bottom-left	左下方
bottom-right	右下方
bindentersuccess	eventhandle		否	跳转小店成功的回调。	3.7.1
bindentererror	eventhandle		否	跳转小店失败的回调，event.detail={code,message}。	3.7.1
自定义样式(custom-style)
键名	说明	允许自定义的属性
card	卡片样式	background-color
title	标题样式	color
price	价格样式	color
buy-button	购买按钮样式	width、border-radius、color、background-color
buy-button-disabled	购买按钮禁用态样式	width、border-radius、color、background-color
自定义样式(custom-style)示例代码
<store-product appid="xxx" product-id="xxx" custom-style="{{customStyle}}" />
Page({
  data: {
    customStyle: {
      card: {
        'background-color': '#FAFAFA',
      },
      title: {
        color: 'rgba(0, 0, 0, 0.8)',
      },
      price: {
        color: '#FF6146'
      },
      'buy-button': {
        width: '100px',
        'border-radius': '30px',
        'background-color': 'rgba(0,0,0,0.9)',
        color: '#FFD48D',
      },
      'buy-button-disabled': {
        width: '100px',
        'border-radius': '30px',
        'background-color': 'rgba(0,0,0,0.9)',
        color: '#FFD48D',
      },
    },
  }
})
使用自定义插槽(custom-content)示例代码
<store-product appid="xxx" product-id="xxx" custom-content="{{true}}">
  <view>自定义卡片内容</view>
</store-product>

### 2.2 小程序 API

| API | 用途 | 基础库 |
|-----|------|--------|
| `wx.openStoreOrderDetail` | 打开订单详情 | ≥ 3.7.1 |
| `wx.openStoreCouponDetail` | 打开优惠券详情 | ≥ 3.8.5 |

### 2.3 服务端接口

见：[连接小程序服务端接口列表](https://developers.weixin.qq.com/doc/store/shop/API/miniandstore/)  
（礼物创建/查询、资料上传等；本阶段商品展示跳转可不接服务端。）

### 2.4 事件推送

- [订单通知](https://developers.weixin.qq.com/doc/store/shop/linkstore/miniprogram_connection/miniprogram_callback/Order_notification)

---

## 3. 本项目配置数据

文件：`pages/adver/adver_id` / `pages/adver/storeConfig.js`

| 字段 | 值 | 用途 |
|------|----|------|
| 小店 ID / appid | `wxde7b459287c6bc1b` | `store-product` / `store-home` 的 `appid` |
| 商品 ID | `10000954536035` 等 15 个 | `store-product` 的 `product-id` |

获取方式（官方）：

- 小店 ID：小店后台 → 店铺管理 → 基础信息 → 账号信息 → 微信小店ID  
- 商品 ID：小店后台 → 商品管理 → 商品列表 → 规格/编码；或服务端商品 API

---

## 4. 接入实现（本仓库）

| 文件 | 说明 |
|------|------|
| `pages/adver/storeConfig.js` | 小店 appid + 商品 ID 列表 |
| `pages/adver/adver.wxml` | `store-home` + `store-product` 列表 |
| `pages/adver/adver.js` | 数据绑定与成功/失败回调 |
| `pages/adver/adver.wxss` | 页面样式 |
| `pages/adver/adver.json` | 页面标题 |

核心用法：

```xml
<store-product
  appid="wxde7b459287c6bc1b"
  product-id="10000954536035"
  bindentersuccess="onEnterSuccess"
  bindentererror="onEnterError"
/>
```

### 官方限制（必须遵守）
1. 不支持微信 Windows / Mac 版；请用手机真机预览测试。
2. 默认 store-product 不要求小程序与小店关联。
3. open-page 为 buy / gift 时，仅支持「热招品牌且关联小店」。
4. product-promotion-link、media-id 需在组件首次加载时传入。
5. 保持小店标识完整展示，不可隐藏。

### 错误码（bindentererror）
| code | 含义 |
|------|------|
| 60005 | 加载失败 |
| 60004 | 加载异常 |
| 20001 | 商品违规下架 |
| 60001/60002 | 加载中/渲染中 |