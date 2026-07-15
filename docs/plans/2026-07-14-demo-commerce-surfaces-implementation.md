# 演示带货展示 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在视频播放、视频详情和发布页增加不连接真实交易的演示带货 UI，并使用公开 HTTPS 图片链接。

**Architecture:** 通过 `demoProducts.js` 集中维护不可变演示商品和稳定选择函数，三个页面只消费展示数据。商品点击和代言选择均为本地状态/提示，不调用微信小店、订单或发布后端。

**Tech Stack:** 微信小程序 JavaScript、WXML、WXSS、Node.js `assert` 测试、Unsplash HTTPS 图片 CDN。

---

### Task 1: 演示商品数据模块

**Files:**
- Create: `miniprogram/utils/demoProducts.js`
- Create: `test/demoProducts.test.js`

**Step 1: Write the failing test**

创建测试，断言模块提供 `DEMO_PRODUCTS`、`getFeaturedProducts`、`pickProduct`，每个商品包含 `id/title/price/imageUrl`，图片 URL 为 HTTPS；数量限制生效；相同 seed 选择相同商品；返回列表修改不影响原数组。

```js
const assert = require("assert");
const products = require("../miniprogram/utils/demoProducts.js");

assert.ok(Array.isArray(products.DEMO_PRODUCTS));
assert.ok(products.DEMO_PRODUCTS.length >= 4);
assert.ok(products.DEMO_PRODUCTS.every((item) =>
  item.id && item.title && item.price && /^https:\/\//.test(item.imageUrl)
));
assert.strictEqual(products.getFeaturedProducts(3).length, 3);
assert.strictEqual(products.pickProduct("video-a").id,
  products.pickProduct("video-a").id);
```

**Step 2: Run test to verify it fails**

Run: `node test/demoProducts.test.js`

Expected: FAIL with `Cannot find module '../miniprogram/utils/demoProducts.js'`.

**Step 3: Write minimal implementation**

创建商品数组，使用固定 `images.unsplash.com` URL；实现 `getFeaturedProducts(limit)` 的安全数量限制和浅拷贝；实现基于字符串字符码的稳定 `pickProduct(seed)`，空 seed 返回首项。不要引入随机数、网络请求或本地图片。

**Step 4: Run test to verify it passes**

Run: `node test/demoProducts.test.js`

Expected: PASS。

**Step 5: Commit**

```bash
git add miniprogram/utils/demoProducts.js test/demoProducts.test.js
git commit -m "feat: add demo commerce products"
```

### Task 2: 视频生成结果页商品条幅

**Files:**
- Modify: `miniprogram/pages/v_output/v_output.js`
- Modify: `miniprogram/pages/v_output/v_output.wxml`
- Modify: `miniprogram/pages/v_output/v_output.wxss`
- Create: `test/demoCommercePages.test.js`

**Step 1: Write the failing test**

捕获 `Page` 定义并断言页面数据包含演示商品；WXML 在横屏 `<video>` 上使用 `cover-view` / `cover-image` 悬浮商品条，包含远程图片绑定、价格和演示标签；点击处理函数只显示本地提示，不调用购买/跳转 API。

Run: `node test/demoCommercePages.test.js`

Expected: FAIL because the current result page has no demo product state or product banner.

**Step 2: Write minimal implementation**

- `onLoad` 使用 `pickProduct(videoUrl || finalResponse)` 设置 `featuredProduct`。
- 增加 `showDemoProduct()`，调用 `wx.showToast({ title: "演示商品，暂不支持购买", icon: "none" })`。
- WXML 将商品条放在 `.video-card` 内，作为 `<video>` 上方的 `cover-view` 覆盖层；内部用 `cover-image` 显示公开图片，并显示标题、演示价格和“同款”按钮。
- WXSS 将悬浮条定位在横屏画面底部偏左并上移到系统视频控制栏上方，宽高稳定；保留现有视频 controls，不遮住进度、全屏等操作。

**Step 3: Run test to verify it passes**

Run: `node test/demoCommercePages.test.js`

Expected: PASS。

**Step 4: Commit**

```bash
git add miniprogram/pages/v_output/v_output.js miniprogram/pages/v_output/v_output.wxml miniprogram/pages/v_output/v_output.wxss test/demoCommercePages.test.js
git commit -m "feat: add demo product banner to video output"
```

### Task 3: 视频详情三 Tab 与同款好物网格

**Files:**
- Modify: `miniprogram/pages/detail/detail.js`
- Modify: `miniprogram/pages/detail/detail.wxml`
- Modify: `miniprogram/pages/detail/detail.wxss`
- Modify: `test/demoCommercePages.test.js`

**Step 1: Write the failing test**

断言详情页 `onLoad` 设置三个演示商品并默认 `activeDetailTab: "products"`；点击 Tab 只更新本地状态。WXML 对视频帖子提供“简介 / 同款好物·3 / 评论”三个 Tab，同款商品为双列网格；卡片类型详情仍可看到原评论区域。

Run: `node test/demoCommercePages.test.js`

Expected: FAIL because the current comments section has no product list.

**Step 2: Write minimal implementation**

- 详情页数据增加 `demoProducts: []` 和 `activeDetailTab: "products"`。
- `onLoad` 在现有内容初始化时设置 `getFeaturedProducts(3)`，不改变评论加载 Promise。
- 增加 `switchDetailTab(e)` 和 `showDemoProduct()`；前者只接受 `intro/products/comments`，后者只显示演示提示。
- 视频帖 hero 保留视频、标题和作者；原文案与“使用绑定卡片”移动到“简介”面板。“同款好物·3”显示三张双列商品卡；“评论”显示原评论列表和输入框。非视频卡片维持现有详情与评论布局。
- WXSS 使用两列稳定网格和大图卡片；商品名最多两行，下面显示卖点、红色演示价格和模拟销量。第三张商品自然落到下一行；Tab 采用下划线激活态。

**Step 3: Run test to verify it passes**

Run: `node test/demoCommercePages.test.js`

Expected: PASS。

**Step 4: Commit**

```bash
git add miniprogram/pages/detail/detail.js miniprogram/pages/detail/detail.wxml miniprogram/pages/detail/detail.wxss test/demoCommercePages.test.js
git commit -m "feat: add demo products above comments"
```

### Task 4: 发布页演示代言商品

**Files:**
- Modify: `miniprogram/pages/publish/publish.js`
- Modify: `miniprogram/pages/publish/publish.wxml`
- Modify: `miniprogram/pages/publish/publish.wxss`
- Modify: `test/demoCommercePages.test.js`

**Step 1: Write the failing test**

捕获发布页 Page 定义，断言：

- 初始 `endorsementEnabled` 为 false；
- 调用开关处理函数后为 true 并设置一个 `endorsementProduct`；
- 再次关闭后清空预览；
- `publishPost` 传给 `apiCommunityPostPublish` 的 payload 不包含商品字段。

Run: `node test/demoCommercePages.test.js`

Expected: FAIL because publish page has no endorsement state or handler.

**Step 2: Write minimal implementation**

- `onLoad` 使用标题、视频 URL 或固定 seed 调用 `pickProduct`，初始化 `endorsementEnabled: false`。
- 增加 `toggleEndorsement()`，只在本地切换开关并设置/清除 `endorsementProduct`。
- WXML 在公开可见选项下增加二元开关和演示商品预览，清楚标注“仅演示，不影响发布”。
- 发布请求维持原字段集合，不添加商品 ID、商品链接或佣金字段。
- WXSS 复用现有 `option-pill`，预览卡使用现有浅蓝/白色圆角风格。

**Step 3: Run test to verify it passes**

Run: `node test/demoCommercePages.test.js`

Expected: PASS。

**Step 4: Commit**

```bash
git add miniprogram/pages/publish/publish.js miniprogram/pages/publish/publish.wxml miniprogram/pages/publish/publish.wxss test/demoCommercePages.test.js
git commit -m "feat: add demo endorsement selection"
```

### Task 5: 全量验证与视觉验收

**Files:**
- Verify: `miniprogram/pages/v_output/*`
- Verify: `miniprogram/pages/detail/*`
- Verify: `miniprogram/pages/publish/*`
- Verify: `miniprogram/utils/demoProducts.js`
- Verify: `test/*.test.js`

**Step 1: Run all Node tests**

Run: `Get-ChildItem test/*.test.js | ForEach-Object { node $_.FullName }`

Expected: all test files exit 0。

**Step 2: Check JavaScript and JSON**

Run Node `--check` for every `miniprogram`/`cloudfunctions` JavaScript file and Node `JSON.parse` for every project JSON file.

Expected: no syntax or parse failures。

**Step 3: Check diff hygiene**

Run: `git diff --check origin/main...HEAD`

Expected: exit 0。

**Step 4: Check network image references**

Run: `rg -n "images\.unsplash\.com|https://" miniprogram/utils/demoProducts.js`

Expected: every demo product image is HTTPS and no local image file is added。

**Step 5: Manual visual verification**

In WeChat DevTools and phone preview, check the landscape video overlay above native controls, detail-page three-tab switching and two-column product grid, card-detail comment compatibility, publish-page toggle/preview, remote image loading, and that the publish request still contains only its original fields。

**Step 6: Commit**

Commit any final test-only adjustments with a focused message; do not add image binaries or real commerce API calls。
