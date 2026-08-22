# Commerce UI Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 根据参考图细调内容详情、横屏视频商品条和发布商品预览，同时保持演示数据、交互边界和发布 payload 不变。

**Architecture:** 继续复用 `demoProducts.js` 和现有页面状态，不新增页面或真实交易能力。详情页从 Tab 布局收敛为同屏内容流；视频覆盖层仅调整安全尺寸和视觉；发布页只调整演示预览结构与样式。

**Tech Stack:** 微信小程序 JavaScript、WXML、WXSS、Node.js `assert` 测试、公开 Unsplash HTTPS 图片。

---

### Task 1: 内容详情同屏布局

**Files:**
- Modify: `miniprogram/pages/detail/detail.js`
- Modify: `miniprogram/pages/detail/detail.wxml`
- Modify: `miniprogram/pages/detail/detail.wxss`
- Modify: `test/demoCommercePages.test.js`

**Steps:**

1. 先修改测试，断言视频详情不再渲染三 Tab；主内容顺序为视频信息、简介与同款按钮、横向商品条、统计、评论。
2. 运行测试确认 RED，失败原因是现有 Tab 和双列网格仍存在。
3. 移除 `activeDetailTab` / `switchDetailTab` 及对应 WXML；保留 `demoProducts`，使用首个关联商品作为 `featuredProduct`。
4. 在主内容卡中组织视频、作者、标题、正文；按钮下增加商品横条，包含远程图、乡村市集标签、商品信息、演示价格、销量和“+ 好物购”。
5. 评论区域恢复始终可见；非 post 卡片保持原 useCard 和评论行为。
6. WXSS 按参考图调整浅绿背景、圆角主卡、统计条和评论气泡；点击商品仍仅 toast。
7. 运行目标/全量测试、`node --check detail.js`、`git diff --check`，提交 `feat: refine commerce detail layout`。

### Task 2: 横屏视频商品条与结果页层级

**Files:**
- Modify: `miniprogram/pages/v_output/v_output.wxml`
- Modify: `miniprogram/pages/v_output/v_output.wxss`
- Modify: `test/demoCommercePages.test.js`

**Steps:**

1. 先增加结构/样式测试：覆盖层仍在 video-card 内、仅播放显示、使用半透明纯色背景、紧凑高度、无 gradient/shadow，并保留 controls 安全距离。
2. 运行 RED，确认现有不透明覆盖层和结果页层级不满足新参考。
3. 将覆盖层改为半透明白色、小尺寸、底部偏左；保证不铺满视频、不遮挡主要画面和 controls。
4. 细调视频卡、文案卡、标签卡与按钮的圆角、间距和阴影；不改变保存、发布、重生成处理函数。
5. 为远程图片容器增加统一浅灰绿背景，不新增本地图片。
6. 运行目标/全量测试和 diff 检查，提交 `style: refine video commerce overlay`。

### Task 3: 发布页演示商品预览

**Files:**
- Modify: `miniprogram/pages/publish/publish.wxml`
- Modify: `miniprogram/pages/publish/publish.wxss`
- Modify: `test/demoCommercePages.test.js`

**Steps:**

1. 先增加 WXML 结构测试：乡村市集标签、大图、红色价格、模拟销量、智能匹配说明和 switch 均存在。
2. 运行 RED，确认现有预览结构缺少参考图视觉元素。
3. 保持 JS 选品与本地状态不变，仅重排 WXML 商品卡和 WXSS。
4. 确认发布 payload 测试仍严格为原字段集合。
5. 运行目标/全量测试、`git diff --check`，提交 `style: refine demo endorsement card`。

### Task 4: 全量验证与真机交接

**Files:**
- Verify: `miniprogram/pages/detail/*`
- Verify: `miniprogram/pages/v_output/*`
- Verify: `miniprogram/pages/publish/*`
- Verify: `test/*.test.js`

**Steps:**

1. 顺序运行全部测试文件。
2. 对所有 JS 执行 `node --check`，所有 JSON 执行 Node `JSON.parse`。
3. 运行 `git diff --check origin/main...HEAD`，确认无新增二进制/本地商品图片。
4. 确认生产代码未新增真实 commerce API，发布 payload 无商品字段。
5. 在开发者工具与 Android/iOS 真机检查视频覆盖层、详情同屏评论和发布页滚动；确认 `images.unsplash.com` 合法域名配置。
