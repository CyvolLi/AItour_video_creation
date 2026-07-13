# 小程序跳转外部小程序 — 官方参考文档

> 本文档整理自官方文档，用于 `pages/navigate` 测试页开发参考。

---

## 1. wx.openEmbeddedMiniProgram — 半屏打开小程序

> 官方文档：[wx.openEmbeddedMiniProgram](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.openEmbeddedMiniProgram.html)
> 接入指引：[半屏小程序能力](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/openEmbeddedMiniProgram.html)

### 1.1 功能描述

打开半屏小程序。基础库 3.10.0 起 `allowFullScreen` 强制为 true，即半屏打开后支持全屏。

**基础库要求：≥ 2.20.1**

### 1.2 参数（Object object）

| 属性 | 类型 | 默认值 | 必填 | 说明 | 最低版本 |
|------|------|--------|------|------|----------|
| appId | string | | 是 | 要打开的小程序 appId | |
| path | string | | 否 | 打开的页面路径，空则打开首页。`?` 后部分成为 query | |
| extraData | object | | 否 | 传递给目标小程序的数据，目标可在 `App.onLaunch`/`App.onShow` 中获取 | |
| envVersion | string | release | 否 | 要打开的小程序版本（仅当前小程序为开发版/体验版时有效） | |
| shortLink | string | | 否 | 小程序链接，传此参数后可不传 appId/path。仅 `verify=binding` 支持 | |
| verify | string | binding | 否 | 校验方式 | 2.24.3 |
| noRelaunchIfPathUnchanged | boolean | false | 否 | 不 reLaunch 目标小程序，直接恢复后台页面（需生命周期未销毁且 path/query 相同） | 2.24.0 |
| allowFullScreen | boolean | false | 否 | 是否支持全屏。**基础库 3.10.0 起强制 true** | 2.33.0 |
| success | function | | 否 | 调用成功回调 | |
| fail | function | | 否 | 调用失败回调 | |
| complete | function | | 否 | 调用结束回调（成功/失败都执行） | |

#### envVersion 合法值

| 值 | 说明 |
|----|------|
| develop | 开发版 |
| trial | 体验版 |
| release | 正式版 |

#### verify 合法值

| 值 | 说明 |
|----|------|
| binding | 校验小程序绑定关系（需在后台「半屏小程序管理」申请） |

### 1.3 调用流程

1. **配置 `embeddedAppIdList`**（基础库 < 2.23.1 需要；≥ 2.23.1 无需配置）
   ```json
   // app.json
   {
     "embeddedAppIdList": ["wxe5f52902cf4de896"]
   }
   ```
2. 调用 `wx.openEmbeddedMiniProgram({ appId: 'xxx' })`
3. 目标小程序以半屏形态打开（3.10.0 起支持全屏）

### 1.4 使用限制

1. **绑定申请**：被半屏跳转的小程序需通过来源小程序的调用申请  
   → 小程序管理后台 →「设置」→「第三方设置」→「半屏小程序管理」  
   → 单个小程序最多添加 100 个；单个小程序最多被 10000 个添加
2. 基础库 < 2.23.1 需在 `app.json` 的 `embeddedAppIdList` 中声明
3. 当前小程序需为**竖屏**
4. 被半屏跳转的小程序需为**非个人主体**（不含小游戏）
5. 不符合条件时自动降级为**普通跳转**（`navigateToMiniProgram`），不影响使用

### 1.5 半屏环境判断

目标小程序可通过 `wx.getEnterOptionsSync()` 读取 `apiCategory` 参数：
- 值为 `embedded` → 被半屏打开

### 1.6 返回原小程序

被半屏打开的小程序调用 `wx.navigateBackMiniProgram()` 返回。

---

## 2. wx.navigateToMiniProgram — 全屏跳转小程序

> 官方文档：[wx.navigateToMiniProgram](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.navigateToMiniProgram.html)

### 2.1 功能描述

打开另一个小程序（全屏跳转）。

**基础库要求：≥ 1.3.0**  
**支持平台：iOS / Android / Windows / Mac / 鸿蒙 OS**

### 2.2 参数（Object object）

| 属性 | 类型 | 默认值 | 必填 | 说明 | 最低版本 |
|------|------|--------|------|------|----------|
| appId | string | | 否 | 要打开的小程序 appId | |
| path | string | | 否 | 打开的页面路径，空则打开首页 | |
| extraData | object | | 否 | 传递给目标小程序的数据 | |
| envVersion | string | release | 否 | 要打开的小程序版本 | |
| shortLink | string | | 否 | 小程序链接，传此参数后可不传 appId/path | 2.18.1 |
| noRelaunchIfPathUnchanged | boolean | false | 否 | 不 reLaunch 目标小程序 | 2.24.0 |
| success | function | | 否 | 成功回调 | |
| fail | function | | 否 | 失败回调 | |
| complete | function | | 否 | 结束回调 | |

### 2.3 使用限制

1. **需要用户触发**：用户未点击页面任意位置时无法调用（≥ 2.3.0）
2. **需要用户确认**：跳转前弹窗询问，用户取消则回调 `fail cancel`（≥ 2.3.0）

### 2.4 示例代码

```javascript
wx.navigateToMiniProgram({
  appId: 'wxde7b459287c6bc1b',
  path: 'page/index/index?id=123',
  extraData: { foo: 'bar' },
  envVersion: 'release',
  success(res) {
    console.log('跳转成功')
  }
})
```

---

## 3. 两种跳转方式对比

| 维度 | openEmbeddedMiniProgram | navigateToMiniProgram |
|------|------------------------|-----------------------|
| 展现形式 | 半屏（3.10.0 起可全屏） | 全屏 |
| 最低基础库 | 2.20.1 | 1.3.0 |
| 是否需要绑定 | 需后台申请绑定（不符合条件自动降级） | 不需要 |
| 用户确认弹窗 | 无 | 有（≥ 2.3.0） |
| Windows/Mac 支持 | 未明确 | 支持 |
| 个人主体目标 | 不支持 | 支持 |
| 降级行为 | 自动降级为 navigateToMiniProgram | — |
| app.json 配置 | `embeddedAppIdList`（< 2.23.1 需要） | 不需要 |

---

## 4. 与 store-product 组件的关系

| 方式 | 用途 | 是否需要知道目标页面 path |
|------|------|--------------------------|
| `store-product` 组件 | 展示小店商品卡 + 自动跳转交易 | **不需要** |
| `wx.openEmbeddedMiniProgram` | 半屏打开任意小程序的任意页面 | 可不传（默认首页） |
| `wx.navigateToMiniProgram` | 全屏跳转任意小程序的任意页面 | 可不传（默认首页） |

**关键区别**：`store-product` 是商品卡组件，由微信侧处理跳转逻辑；  
`openEmbeddedMiniProgram` / `navigateToMiniProgram` 是通用跳转 API，可以打开小店的首页或任意页面。

---

## 5. 本项目适用场景

目标小店 appid：`wxde7b459287c6bc1b`

### 方案 A：半屏打开小店首页
```javascript
wx.openEmbeddedMiniProgram({
  appId: 'wxde7b459287c6bc1b'
  // path 不传 → 打开小店首页
})
```

### 方案 B：全屏跳转小店首页
```javascript
wx.navigateToMiniProgram({
  appId: 'wxde7b459287c6bc1b'
})
```

### 方案 C：半屏打开 + 指定商品（如果知道 path）
```javascript
wx.openEmbeddedMiniProgram({
  appId: 'wxde7b459287c6bc1b',
  path: 'pages/productDetail/productDetail?productId=10000954536035'
  // 注意：小店内部 path 需要确认，此处为猜测
})
```

### 前置配置
```json
// app.json（基础库 < 2.23.1 时需要）
{
  "embeddedAppIdList": ["wxde7b459287c6bc1b"]
}
```

> 当前项目 app.json 已配置 `embeddedAppIdList: ["wxde7b459287c6bc1b"]`，无需额外修改。
