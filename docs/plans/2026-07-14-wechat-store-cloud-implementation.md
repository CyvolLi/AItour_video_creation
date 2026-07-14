# WeChat Store and Cloud Environment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复无效云环境配置，并把微信小店入口改造成能区分店铺、商品和运行平台问题的诊断页。

**Architecture:** 使用一个无微信运行时依赖的配置模块作为云环境和小店参数的唯一来源，便于 Node 直接测试。`app.js` 消费云初始化参数；广告页分别渲染店铺卡与商品卡并显示运行环境，普通跳转页仅作为能力对照。

**Tech Stack:** 微信小程序 JavaScript/WXML/WXSS、微信云开发、Node.js `assert` 测试。

---

### Task 1: 集中运行配置

**Files:**
- Create: `miniprogram/utils/runtimeConfig.js`
- Create: `test/runtimeConfig.test.js`
- Modify: `miniprogram/utils/storeConfig.js`

**Step 1: Write the failing test**

创建 `test/runtimeConfig.test.js`，断言：

```js
const assert = require("assert");
const config = require("../miniprogram/utils/runtimeConfig.js");

assert.strictEqual(config.CLOUD_ENV_ID, "cloud1-5g34ybsmbfe89727");
assert.strictEqual(config.STORE_APPID, "wxde7b459287c6bc1b");
assert.strictEqual(config.DEFAULT_PRODUCT_ID, "10001033506602");
assert.deepStrictEqual(config.getCloudInitOptions(), {
  env: "cloud1-5g34ybsmbfe89727",
  traceUser: true
});
assert.deepStrictEqual(config.validateRuntimeConfig(), []);
```

**Step 2: Run test to verify it fails**

Run: `node test/runtimeConfig.test.js`

Expected: FAIL with `Cannot find module '../miniprogram/utils/runtimeConfig.js'`.

**Step 3: Write minimal implementation**

创建无 `wx` 依赖的 `runtimeConfig.js`，导出三个常量、`getCloudInitOptions` 和 `validateRuntimeConfig`。让 `storeConfig.js` 复用相同的小店常量，避免产生第二份 AppID。

**Step 4: Run test to verify it passes**

Run: `node test/runtimeConfig.test.js`

Expected: PASS with exit code 0.

**Step 5: Commit**

当前目录不是 Git 仓库，跳过提交；保留文件级变更记录。

### Task 2: 修复云环境初始化

**Files:**
- Modify: `miniprogram/app.js:1-45`
- Test: `test/runtimeConfig.test.js`

**Step 1: Extend the failing test**

在配置测试中确认 `getCloudInitOptions()` 始终返回新对象，避免调用方意外修改共享配置：

```js
const first = config.getCloudInitOptions();
first.env = "changed";
assert.strictEqual(
  config.getCloudInitOptions().env,
  "cloud1-5g34ybsmbfe89727"
);
```

**Step 2: Run test to verify it fails**

Run: `node test/runtimeConfig.test.js`

Expected: FAIL if the implementation returns a shared object.

**Step 3: Write minimal implementation**

让 `getCloudInitOptions()` 每次返回新对象。在 `app.js` 引入配置，将 `globalData.env` 设为 `CLOUD_ENV_ID`，并把 `wx.cloud.init` 参数替换为 `getCloudInitOptions()` 的结果。

**Step 4: Run test to verify it passes**

Run: `node test/runtimeConfig.test.js`

Expected: PASS.

**Step 5: Commit**

当前目录不是 Git 仓库，跳过提交。

### Task 3: 建立微信小店分层诊断页

**Files:**
- Modify: `miniprogram/pages/adver/adver.js`
- Modify: `miniprogram/pages/adver/adver.wxml`
- Modify: `miniprogram/pages/adver/adver.wxss`
- Modify: `miniprogram/pages/adver/adver.json`

**Step 1: Write the failing structural test**

扩展 `test/runtimeConfig.test.js`，读取广告页文件并断言 WXML 同时包含：

```js
const fs = require("fs");
const path = require("path");
const wxml = fs.readFileSync(
  path.join(__dirname, "../miniprogram/pages/adver/adver.wxml"),
  "utf8"
);

assert.ok(wxml.includes("<store-home"));
assert.ok(wxml.includes("<store-product"));
assert.ok(wxml.includes('bindentersuccess="onEnterSuccess"'));
assert.ok(wxml.includes('bindentererror="onEnterError"'));
```

**Step 2: Run test to verify it fails**

Run: `node test/runtimeConfig.test.js`

Expected: FAIL because current WXML does not contain `store-home` or callbacks.

**Step 3: Write minimal implementation**

- `adver.js` 从运行配置初始化 `storeAppId` 和 `productId`。
- `onLoad` 通过 `wx.getDeviceInfo`、`wx.getAppBaseInfo` 和 `wx.canIUse` 收集平台、基础库与组件能力。
- `onEnterSuccess` 和 `onEnterError` 更新页面结果并写控制台。
- WXML 先展示诊断信息，再分别渲染最小参数的 `store-home` 和 `store-product`。
- WXSS 只负责普通页面布局，不修改或遮挡小店组件内部内容。

**Step 4: Run test to verify it passes**

Run: `node test/runtimeConfig.test.js`

Expected: PASS.

**Step 5: Commit**

当前目录不是 Git 仓库，跳过提交。

### Task 4: 澄清普通小程序跳转的边界

**Files:**
- Modify: `miniprogram/pages/navigate/navigate.js`
- Modify: `miniprogram/pages/navigate/navigate.wxml`

**Step 1: Write the failing structural test**

扩展测试，断言跳转页从配置读取 AppID，且页面出现“不是商品组件替代方案”的说明。

**Step 2: Run test to verify it fails**

Run: `node test/runtimeConfig.test.js`

Expected: FAIL because current page hard编码 AppID 且没有边界说明。

**Step 3: Write minimal implementation**

在 `navigate.js` 复用 `STORE_APPID`，保留用户点击触发的半屏 API；在 WXML 显示其用途、后台绑定要求和不能依赖猜测商品 path 的说明。

**Step 4: Run test to verify it passes**

Run: `node test/runtimeConfig.test.js`

Expected: PASS.

**Step 5: Commit**

当前目录不是 Git 仓库，跳过提交。

### Task 5: 全量验证与真机交接

**Files:**
- Verify: `miniprogram/**/*.js`
- Verify: `miniprogram/**/*.json`
- Verify: `test/*.test.js`

**Step 1: Run all Node tests**

Run: `Get-ChildItem test/*.test.js | ForEach-Object { node $_.FullName }`

Expected: all tests exit 0 and print only `ok` results.

**Step 2: Check JavaScript syntax**

Run: `rg --files miniprogram cloudfunctions -g '*.js' | ForEach-Object { node --check $_ }`

Expected: exit code 0 with no syntax errors.

**Step 3: Check JSON syntax**

Run a PowerShell loop that parses every project JSON file except dependencies with `ConvertFrom-Json`.

Expected: every file parses successfully.

**Step 4: Recompile in WeChat DevTools**

Expected: the previous `-501000 Environment not found` disappears. If `quickstartFunctions` is absent in `cloud1-5g34ybsmbfe89727`, upload and deploy `cloudfunctions/quickstartFunctions` to that environment, then retry.

**Step 5: Verify store components by layer**

在开发者工具记录 `store-home` 与 `store-product` 各自结果，再用 Android、iOS 或鸿蒙微信真机预览：

- Both visible: configuration is valid.
- Store home visible, product missing: validate product ownership/status in the store backend.
- Both missing on real device: validate store AppID and shop status.
- Missing only on desktop: treat as platform/debugger limitation.

**Step 6: Commit**

当前目录不是 Git 仓库，跳过提交。

