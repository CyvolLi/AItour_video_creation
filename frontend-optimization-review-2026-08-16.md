# 前端问题梳理（完整版）

日期：2026-08-16
项目：AItour_video_creation

> 说明：本文档基于 2026-08-15 初稿，于 2026-08-16 对照当前仓库代码逐条核验并实测资源体积后修订。核验结论：第 1–9 项问题均仍存在（第 8 项接口路径已部分集中、第 9.4 项工具层已就位，但缓存 / 统一配置 / 任务恢复等核心建议尚未落地）；第 10–13 项为本次新增。代码位置以 2026-08-16 仓库为准，行号随后续改动可能偏移，定位时以「方法名 / 选择器」为辅。环境：基础库 3.16.1；主包共 19 个页面，未配置分包。

---

## 总览

| 编号 | 级别 | 问题 | 关键代码位置 |
| --- | --- | --- | --- |
| 1 | 优先 | 搜索控件功能不一致 | `community.wxml` / `scenery_select.wxml` |
| 2 | 优先 | 个人主页存在演示内容 | `profile.wxml` |
| 3 | 优先 | 发布页面底部导航多余 | `publish.wxml` / `card_publish.wxml` |
| 4 | 后续 | 优选模板页大分类缺左右滑动提示 | `scenery_select.wxml` / `.wxss` |
| 5 | 技术 | 视频制作流程中断后无法继续 | `app.js` / `wait.js` / `v_output.js` |
| 6 | 技术 | 新任务没有统一清理上一次数据 | `mode_select.js` / `v_output.js` / `profile.js` |
| 7 | 技术 | 结果页扩展视频跳转方法写错 | `v_output.js` / `v_output.wxml` |
| 8 | 技术 | 后台服务地址多处重复写死 | `dialogue.js` / `script.js` / `wait.js` / `communityService.js` |
| 9 | 性能 | 小程序前端加载偏慢 | 见第 9 节 |
| 10 | 技术 | v_config 页视频配置选择不持久 | `v_config.js` |
| 11 | 技术 | 深流程页“返回主页”整栈重置风险 | `components/homeBackButton` |
| 12 | 后续 | 详情页评论无缓存、集合缺失静默失败 | `detail.js` / `commentStore.js` |
| 13 | 后续 | 零散小问题汇总（8 条） | 见第 13 项 |

---

## 优先处理

### 1. 搜索控件功能不一致

社区顶部的“搜索”实际执行刷新，景区模板页的搜索框点击后没有功能。

**调整为：** 社区入口明确改成“刷新”；景区模板页暂时去掉无功能的搜索框。

**代码位置：**

- 社区顶部“搜索”文案与图标按钮：`miniprogram/pages/community/community.wxml`
  - 第 25 行：`<text class="dock-label">搜索</text>`（文案写死为“搜索”）
  - 第 34–36 行：搜索图标 `<view class="dock-icon" bindtap="refreshCurrent">`，`src="/images/icons/top-search.png"`
- 社区实际刷新绑定：`miniprogram/pages/community/community.wxml` 第 34 行 `bindtap="refreshCurrent"`，处理函数在 `miniprogram/pages/community/community.js` 第 293 行 `refreshCurrent()`（拉取第一页列表）。
- 模板搜索框：`miniprogram/pages/scenery_select/scenery_select.wxml` 第 30–32 行 `<view class="search-bar" bindtap="onSearchTap">`；`scenery_select.js` 中**不存在** `onSearchTap` 处理函数，点击无响应。

---

### 2. 个人主页存在演示内容

个人主页固定显示虚假的关注数、好友数、身份标签和完整 OpenID，编辑图标也没有功能。

**调整为：** 只保留头像、昵称和真实作品分类；删除固定演示数据、无功能编辑图标和 OpenID 展示，页面文案统一使用中文。

**代码位置：** `miniprogram/pages/profile/profile.wxml`

- 标题与编辑图标：第 38–41 行
  - 第 39 行：`<text class="profile-title">Profile</text>`（英文标题）
  - 第 40 行：`<view class="edit-icon"></view>`（纯样式，无 `bindtap`）
- OpenID 与固定统计：第 49–53 行
  - 第 50 行：`Name: {{userInfo.nickName || '用户'}}`（英文标签）
  - 第 51 行：`ID: @{{profile.openid || 'user'}}`（完整 OpenID 展示）
  - 第 52 行：`Following: 10   Friends: 9`（写死的演示数据）
- 固定身份标签：第 55–59 行
  - `⊛ Add friends`、`⊛ Student`、`⊛ Designer`（写死英文标签）

> 关联样式：`.profile-title` / `.edit-icon` / `.chip` 等见 `miniprogram/pages/profile/profile.wxss` 第 59–93、166–181 行，删除控件时一并清理。

> 注：该页近期已新增真实功能（长按删除我的作品、发布菜单弹出层、头像失败重取，见 `utils/profileDelete.js` 与 `profile.wxml` 新增菜单），改造时注意保留这些功能，只清理演示部分。

---

### 3. 发布页面底部导航多余

“发布视频帖子”和“制作视频模板”页面底部重复显示社区、发布、个人主页三个按钮。

**调整为：** 删除两个发布页面底部的三按钮导航，只保留页面自身的返回操作和发布按钮。

**代码位置：**

- 发布视频帖子底部导航：`miniprogram/pages/publish/publish.wxml` 第 49–59 行（`<view class="bottom-dock">`，含 `backToCommunity` / 中间 compose / `goProfile` 三个图标）。
- 制作视频模板底部导航：`miniprogram/pages/card_publish/card_publish.wxml` 第 25–35 行（同样三个图标）。

> 关联样式：`.bottom-dock` / `.nav-icon` 等见 `publish.wxss`、`card_publish.wxss`；对应 JS 处理函数 `backToCommunity` / `goProfile` 见 `publish.js` 第 54–64 行、`card_publish.js` 第 72–82 行，删除导航后需同步清理无用函数。

> 注：(1) 中间 compose 图标在两个页面中都是无 `bindtap` 的纯装饰元素；(2) 两个页面返回方式不一致——`publish.js` 用 `wx.reLaunch`、`card_publish.js` 用 `wx.redirectTo`，删除导航时一并统一。

---

## 后续处理

### 4. 优选模板页的大分类缺少左右滑动提示

当前不同大池子的分类图片采用横向滑动，但页面没有提示用户左右两侧还有内容。

**调整为：** 在分类图片区域左右两侧加入低透明度的滑动指示，保持颜色浅、占用范围小，不明显遮挡已经露出的图片。

**代码位置：**

- 大分类横向滑动区域：`miniprogram/pages/scenery_select/scenery_select.wxml` 第 12–25 行
  - 第 12 行：`<scroll-view class="feature-scroll" scroll-x>`
  - 第 13–24 行：`feature-grid` 内循环渲染 `feature-card`
- 横向滑动区域样式：`miniprogram/pages/scenery_select/scenery_select.wxss`
  - 第 86–89 行：`.feature-scroll`（`width:100%; white-space:nowrap;`）
  - 第 91–96 行：`.feature-grid`（`display:inline-flex;`，`padding: 0 30rpx;`）

> 实现建议：在 `feature-scroll` 外层加相对定位容器，左右各放一个 `position:absolute` 的渐变/箭头指示，`opacity` 控制在 0.2–0.35、宽度约 40–60rpx，并随 `scroll-x` 位置变化隐藏到边一侧的指示。

---

## 技术问题

### 5. 视频制作流程中断后无法继续

照片、描述、脚本、任务编号和视频地址主要保存在小程序运行内存中。用户中途关闭或重新打开小程序后，未完成的生成任务可能无法恢复。

**调整为：** 先保留现有页面流程，为生成任务增加必要的本地保存和恢复；无法恢复时明确提示用户重新开始。

**代码位置：**

- 全局任务数据（仅内存）：`miniprogram/app.js` 第 8–29 行 `this.globalData = { ... task_data: { openid, task_id, video_id, count, card_id, spot_url, request, video_request, scriptContent, user_potrait, landscape, landscape_name }, video_url, final_response }`。
- 等待页读取任务数据：`miniprogram/pages/wait/wait.js`
  - 第 27–39 行 `onLoad` 读取 `app.globalData.task_data` / `video_extend` / `count` / `spot_url`；
  - 第 46–56 行 `startTaskFlow` 校验 `taskData.openid && taskData.task_id`，缺失时仅 `showToast("任务未初始化")` 后静默返回，无重开引导。
- 结果页读取生成结果：`miniprogram/pages/v_output/v_output.js` 第 12–22 行 `onLoad` 读取 `task_data.count / scriptContent / spot_url` 与 `globalData.video_url / final_response`，均为内存数据。

> 注：全目录搜索 `setStorageSync/getStorageSync` 仅测试页命中一处，任务数据仍无任何持久化。另见第 11 项：深流程页的 homeBackButton 用 `wx.reLaunch` 整栈重置，会直接清空内存中的任务现场，与此项问题叠加。

---

### 6. 新任务没有统一清理上一次数据

“重新生成”等入口只重置少数字段，上一次任务的照片、脚本、任务编号或视频编号可能继续留在全局任务数据中。

**调整为：** 增加统一的“开始新任务”重置方法，保留用户身份信息，清空上一次视频任务的数据。

**代码位置：**

- 视频生成方式选择：`miniprogram/pages/mode_select/mode_select.js`
  - 第 11–15 行 `official()` 直接 `navigateTo` 到 `scenery_select`，**未清理**旧任务数据；
  - 第 17–22 行 `personalize()` 仅 `task_data.card_id = ""`。
- 结果页重新生成：`miniprogram/pages/v_output/v_output.js` 第 24–29 行 `backToGenerate()` 仅 `task_data.count = 0` 后 `redirectTo` 到 `mode_select`，`scriptContent` / `spot_url` / `task_id` / `video_id` / `request` 等旧数据仍在。
- 其它零散清理点：`publish.js` 第 31–34 行 `onUnload` 仅清 `card_id`；`community.js` 第 560–565 行 `goPostPublish` 仅清 `card_id`；`profile.js` 第 445–450 行 `goPublishPost` 同样仅清 `card_id`。

> 建议在 `app.js` 增加 `resetTaskData()`：保留 `openid`，把 `task_id / video_id / count / card_id / spot_url / request / video_request / scriptContent / user_potrait` 等重置为初始值，同时清 `video_url / final_response / video_extend`，再由各“开始新任务”入口统一调用。

---

### 7. 结果页扩展视频的跳转方法写错

结果页的扩展视频代码使用了不存在的 `wx.reLaunchTo()`。当前按钮被隐藏，所以暂时不会触发；以后重新启用时会跳转失败。

**调整为：** 启用扩展视频前改用微信小程序支持的跳转方法，并检查返回生成页和对话页的路径。

**代码位置：**

- 错误的跳转方法：`miniprogram/pages/v_output/v_output.js`
  - 第 40 行：`wx.reLaunchTo({ url: "/pages/mode_select/mode_select" })`
  - 第 48 行：`wx.reLaunchTo({ url: "/pages/dialogue/dialogue" })`
  - 均应为 `wx.reLaunch(...)`（微信小程序无 `reLaunchTo`）。
- 当前隐藏的扩展视频按钮：`miniprogram/pages/v_output/v_output.wxml` 第 37 行（被注释）：
  `<!--<button class="action-pill action-pill-secondary" bindtap="backToExtend">扩展视频</button>-->`
- 相关处理函数：`v_output.js` 第 31–51 行 `backToExtend()`；启用前同时核对 `mode_select`、`dialogue` 的跳转路径与页面栈（扩展流程建议用 `reLaunch` 重置页面栈，避免历史栈过深）。

> 注：全 pages 目录扫描确认除这两处外无其它 wx API 误写；核心链路跳转路径均与 app.json 注册一致（example 页有一处例外，见第 13 项）。

---

### 8. 后台服务地址在多个页面重复写死

对话页、脚本页和等待页分别写了相同的后台地址。以后更换服务地址时，漏改其中一个页面就会造成部分流程可用、部分流程失败。

**调整为：** 把后台服务地址放到一个公共配置文件中，各页面统一读取。

**代码位置：**

- 对话页后台地址：`miniprogram/pages/dialogue/dialogue.js` 第 5–7 行 `new WxRequest({ baseURL: "https://ruralv.cn" })`。
- 脚本页后台地址：`miniprogram/pages/script/script.js` 第 5–7 行，同上。
- 等待页后台地址：`miniprogram/pages/wait/wait.js` 第 6–8 行，同上。
- 社区/个人页相关请求：`miniprogram/utils/communityService.js` 第 3 行 `const BASE_URL = "https://ruralv.cn"`。

> 建议新增 `miniprogram/utils/config.js`（或 `envList.js` 扩展）集中维护 `BASE_URL`、各接口路径、超时时间等，`dialogue/script/wait/communityService` 统一引用；接口路径目前分散在 `dialogue.js`（`/api/dialogue/*`）、`script.js`（`/api/script`）、`wait.js`（`/api/share`、`/api/first_shot`、`/api/video`、`/api/video/status`）与 `communityApi.js`，可一并收敛。

> 现状补充（2026-08-16）：接口路径已部分集中——`utils/communityApi.js` 集中维护 12 条社区/个人接口路径常量（`/data/community/*`、`/data/profile/*`），`communityService.js` 已改为引用它；但 `BASE_URL` 与超时仍未集中。`envList.js` 当前是空的云环境列表，扩展它需先填充环境 ID。`utils/storeConfig.js` 是微信小店配置（与后台地址无关），且无代码引用，属死代码（见第 13 项）。

---

## 小程序前端加载偏慢优化

> 加载偏慢主要来自四类原因：**包体积与资源冗余**、**启动链路串行阻塞**、**图片/CDN 无优化**、**重复网络请求与 setData 粒度偏大**。以下按影响从大到小排列。

### 9.1 主包未分包 + 存在未引用的本地大图（GIF）

**现状：**
- `miniprogram/app.json` 第 3–23 行把 19 个页面全部放在主包，**未配置 `subPackages`**，首包下载体积无法摊薄。已启用 `"lazyCodeLoading": "requiredComponents"`（第 37 行，正面配置）。
- `miniprogram/images/` 下存在 6 个本地 GIF，合计约 **880 KB**（实测 901,654 字节），但代码中实际引用的都是远程 `https://data.ruralv.cn/asset/*.gif`，本地 GIF **无任何引用**（全目录搜索零命中），属于冗余资产：

| 本地文件 | 大小(KB) | 实际引用 |
| --- | --- | --- |
| `images/scroll.gif` | 279.6 | 远程 `data.ruralv.cn/asset/scroll.gif`（`user_custom2.wxml:4`） |
| `images/home-hero.gif` | 244.5 | 远程 `data.ruralv.cn/asset/home-hero.gif`（`index.wxml:5`） |
| `images/left.gif` | 99.0 | 远程（`user_custom1.js:4` / `user_custom2.js:4`） |
| `images/front.gif` | 92.0 | 远程（`user_custom1.js:5` / `user_custom2.js:5`） |
| `images/right.gif` | 91.3 | 远程（`user_custom1.js:6` / `user_custom2.js:6`） |
| `images/camera.gif` | 74.2 | 远程（`user_custom1.wxml:46`） |

- 实测量级：`miniprogram/images/` 合计 1,104 KB，整个 `miniprogram/`（排除 miniprogram_npm/node_modules）合计 1,746 KB，冗余 GIF 约占主包一半以上。
- 主包还包含 3 个非正式页面——`pages/navigate`（嵌入式小程序演示）、`pages/example`（组件演示）、`pages/profile_test`（本地测试页），发布前可直接删除；`components/cloudTipModal` 组件仅被 example 页使用；`images/icons/post-compose.png`(21.2 KB)/`post-stack.png`(17.1 KB)/`post-user.png`(8.1 KB) 较同目录图标(<1 KB)明显偏大，合计约 46 KB。

**代码位置：** `miniprogram/app.json`（pages 数组，无 subPackages）；`miniprogram/images/*.gif`；引用方见上表。

**建议：**
1. 删除 6 个未引用的本地 GIF（约省 880 KB，占主包当前体积一半以上）。
2. 配置分包：把社区/发布/个人/详情等相对低频页面放入分包（如 `community` 分包、`creator` 分包），首包只保留 `adver`、`index`、核心创作链入口，降低首屏下载。
3. 发布前删除本地测试页 `profile_test` 与演示页 `navigate`/`example`、仅 example 使用的 `cloudTipModal` 组件，压缩或替换偏大图标。
4. 对仍需本地化的动图压缩或转 `webp` / 短 `mp4`（动图体积通常可降 50% 以上）。

---

### 9.2 启动链路串行阻塞首屏

**现状：**
- `app.js` 的 `onLaunch` 串行执行：`getOpenId()`（云函数）→ `loadUserProfile()`（`ensureProfile` 查数据库 + `normalizeAvatar` 可能再走 `getTempFileURL`）。首屏页面若依赖 `userInfo`，会叠加这串网络耗时。全目录确认无任何 `userInfo/profile` 的 Storage 缓存。
- `index.js` 的 `onLoad` 又调用 `app.ensureUserInfo()` 再拉一次资料，与 `onLaunch` 重复；且 openid 已就绪而 userInfo 未就绪时，`ensureUserInfo` 会与 onLaunch 链**并发执行第二次** `loadUserProfile`（`ensureProfile` 无并发去重），同一 openid 冷启动可能双查库。当前 index.js 已改为先以 `globalData.userInfo` 渲染占位、`ensureUserInfo` 只做回填，不阻塞首帧，但重复与并发请求仍在。
- `dialogue.js` / `script.js` 的 `onLoad/onShow` 用 `setTimeout(..., 200)` 人为延迟 200ms；`dialogue.js` / `script.js` 的 `ensureTaskDataReady()` 以 200ms 间隔轮询 `openid`（最多 20 次）。

**代码位置：**
- `miniprogram/app.js` 第 6–44 行 `onLaunch`（`userInfoReady` 事件在第 43 行）、第 47–69 行 `getOpenId`、第 71–100 行 `loadUserProfile`、第 102–114 行 `ensureUserInfo`。
- `miniprogram/pages/index/index.js` 第 14–39 行 `onLoad`（第 23–38 行调 `app.ensureUserInfo()`）。
- `miniprogram/pages/dialogue/dialogue.js` 第 39–41 行（`setTimeout`）、第 72–99 行（`ensureTaskDataReady` 轮询）；`miniprogram/pages/script/script.js` 第 22–24 行（`setTimeout`）、第 40–67 行（轮询）；`miniprogram/pages/wait/wait.js` 第 35–38 行（`setTimeout`）。

**建议：**
1. 首屏不阻塞等待 `openid`：先渲染骨架/占位，`openid` 与 `userInfo` 就绪后再回填。
2. 用本地 `wx.setStorageSync/getStorageSync` 缓存 `userInfo` / `profile`，命中缓存先渲染，后台再校验刷新，避免每次冷启动重复查库。
3. 去掉无必要的 `setTimeout(..., 200)`；`ensureTaskDataReady` 由轮询改为 Promise 化回调（`userInfoReady` 已存在，见 `app.js:43`，可直接复用）。
4. `ensureUserInfo` 加并发去重（如 Promise 单例/加载中标记），避免与 `onLaunch` 双查。

---

### 9.3 图片与 CDN 资源加载无优化

**现状：**
- 远程图片直连多个域名：`ruralv.cn`、`qunarzz.com`、`sinaimg.cn`、`bcebos.com`、`mmbiz.qpic.cn`，无统一 CDN、无尺寸裁剪参数、无 `lazy-load`、无本地缓存策略（全目录搜索 `lazy-load` 零命中）。
- 头像/封面 `image` 未加 `lazy-load`，列表首屏会一次性请求全部封面与头像。
- `images/icons/nanako.jpg`（72.3 KB）作为 bot 头像偏大。

**代码位置：**
- 列表封面/头像：`miniprogram/pages/community/community.wxml` 第 79、95 行（封面）、第 82、98 行（头像）等。
- 个人页头像与缩略图：`miniprogram/pages/profile/profile.wxml` 第 44 行（头像）、第 82 行（作品缩略图）。
- 景区/模板图：`miniprogram/pages/scenery_select/scenery_select.wxml` 第 20、48 行。
- 固定远程图：`miniprogram/utils/landscape.js` 第 7、14、21 行；`user_custom1.js` 第 4–6、44 行。
- bot 头像：`miniprogram/pages/dialogue/dialogue.js` 第 21 行。

**建议：**
1. 远程图统一走自有域名/云存储，加尺寸裁剪参数（如 `?imageView2/...` 或 CDN 缩略参数）与 `lazy-load`。
2. 复用云存储 `getTempFileURL` 的临时链接（默认 2 小时有效），避免每次都换链接。
3. 压缩 `nanako.jpg` 等本地大图，图标类资源优先 SVG/小尺寸 PNG。

---

### 9.4 社区/个人列表每次刷新重复串行拉取作者资料

**现状：**
- `community.attachAuthorProfiles` 每次刷新都要：`getProfilesByOpenids`（云数据库查询）→ `getAvatarTempUrls`（云函数）→ 对每项 `normalizeAvatar`，形成多次串行网络往返，且**无缓存**。
- `profile.attachAuthorProfiles` 对每个作者**逐项**调 `normalizeAvatar`（每项一次单文件 `getTempFileURL`），未像 community 走 `getAvatarTempUrls` 批量云函数，N 个作者 = N 次存储接口往返。
- 头像加载失败已有缓解：`community.wxml:82/98`、`profile.wxml:44` 的头像加了 `binderror`，失败时经 `avatarStore.getTempFileURL` 按需重取临时链接，属“错误重取”，不是缓存。
- `community.js:405–410` 单条头像重取成功后 `setData` 又调 `syncListState()` 全量重建左右列，小更新扩散为全列表重渲染。

**代码位置：**
- `miniprogram/pages/community/community.js` 第 218–241 行（`requestAvatarTempUrls`）、第 243–291 行（`attachAuthorProfiles`）、第 384–415 行（头像错误重取）。
- `miniprogram/pages/profile/profile.js` 第 134–183 行（`attachAuthorProfiles`，逐项 normalizeAvatar 在 147–160 行）、第 267–291 行（头像错误重取）。
- 工具层（2026-08 新增，均无缓存）：`miniprogram/utils/avatarStore.js`（`getTempFileURL` 16–35 行每次直调云端，已支持 `cloud://` 云文件 ID）、`utils/profileStore.js`（`getProfilesByOpenids` 69–96 行每次实时查库）、`utils/avatarRefresh.js`（纯函数）。

**建议：**
1. 在已就位的 store 层直接实现缓存：`openid → profile`、`fileID → tempURL` 内存 + 本地缓存，命中直接复用，避免重复请求。
2. `profile.js` 改用 `getAvatarTempUrls` 批量获取临时链接，与 community 保持一致，减少往返次数。
3. 列表数据可做分页缓存，避免每次切换 tab 全量重拉。

---

### 9.5 渲染与 setData 粒度偏大、请求封装重复

**现状：**
- `community.syncListState` 每次全量 `setData({ leftList, rightList, ... })`；`profile` 每次全量 `setData({ cache, currentList })`，且 `loadTab` 从不读页内 `data.cache`，每次切换 tab 全量重拉，数据量增大时渲染开销明显。
- `wxRequest` 在 `dialogue` / `script` / `wait` 每页各自 `new` 一次实例且 `baseURL` 写死（与第 8 节同源），无统一超时/重试/缓存。
- 列表 `wx:key` 用 `target_id`，但同一内容跨 tab 可能重复，影响 diff 效率（次要）。

**代码位置：**
- `miniprogram/pages/community/community.js` 第 138–167 行（`syncListState`）。
- `miniprogram/pages/profile/profile.js` 第 203–235 行（`loadTab`，整体 `setData` 在第 220–223 行）。
- `dialogue.js:5-7`、`script.js:5-7`、`wait.js:6-8`、`communityService.js:3`（baseURL/请求实例，见第 8 节）。

**建议：**
1. 与第 8 节合并落地：统一公共请求封装与配置，复用同一 `WxRequest` 实例，加统一超时、失败提示。
2. `setData` 采用按需/路径更新（只更新变化字段），长列表做分页渲染或虚拟列表。
3. 列表首屏只渲染可视区域项，图片懒加载。

---

### 9.6 本人资料与详情页评论每次进入直查云端

**现状：**
- `profile.js` 的 `onShow`（第 42–78 行）每次进入个人页都调 `app.loadUserProfile()`（`ensureProfile` 查库 + `normalizeAvatar` 换临时链接），无任何缓存，与 9.4 的“作者资料”问题同构（本人资料维度）。
- 详情页评论经 `commentStore.listByTarget` 每次直查 `comments` 集合，同样无缓存（集合缺失时的静默失败见第 12 项）。

**代码位置：** `miniprogram/pages/profile/profile.js` 第 42–78 行（`onShow`）；`miniprogram/app.js` 第 71–100 行（`loadUserProfile`）；`miniprogram/pages/detail/detail.js` 第 153–163 行；`miniprogram/utils/commentStore.js`。

**建议：** 与 9.2 建议 2 合并——`userInfo/profile` 落 Storage 缓存先渲染后校验；评论列表按 `target_id` 做内存缓存；均可直接在 store 层实现。

---

## 新发现问题（2026-08-16 新增）

### 10. v_config 页视频配置选择不持久

`saveConfigToGlobalData` 从不写回 `styleId` / `optimizationIds`，而 `syncFromGlobalData` 读取的 `taskData.videoConfig` 因此永远是旧值/undefined：用户在配置页选择的风格与优化项，重新进入页面时无法还原，后续生成流程可能拿到过期配置。另第 236 行 `taskData.request = selectedOptimization.description,` 用逗号运算符代替分号，属语法隐患（当前不报错但易被误改）。

**调整为：** `saveConfigToGlobalData` 完整写回 `styleId` / `optimizationIds`；第 236 行逗号改分号。

**代码位置：** `miniprogram/pages/v_config/v_config.js` 第 69–82 行（`syncFromGlobalData`）、第 223–239 行（`saveConfigToGlobalData`）、第 236 行（逗号运算符）。

---

### 11. 深流程页“返回主页”整栈重置，误触丢失创作现场

`components/homeBackButton/goback.js:4` 点击后直接 `wx.reLaunch` 到 community，整个页面栈被清空。该组件用于 8 个页面（`dialogue`、`scenery_select`、`user_custom1/2`、`v_output`、`script`、`mode_select`、`v_config`），在 script/dialogue 等深流程页误触“返回主页”会丢失未完成的照片、脚本、任务上下文——与第 5/6 项任务恢复主题直接相关。

**调整为：** 深流程页改用 `wx.navigateBack`，或对 `reLaunch` 加二次确认；至少与第 5 项任务持久化配套落地，保证误触后可恢复。

**代码位置：** `miniprogram/components/homeBackButton/goback.js:4`；各使用页 wxml 中的 `<homeBackButton>`。

---

### 12. 详情页评论依赖 comments 集合，加载无缓存且缺失时静默失败

`detail.js:153–163` 每次进入详情页经 `commentStore.listByTarget` 直查云数据库 `comments` 集合，无任何缓存；若集合未创建（需在云开发控制台手动创建，不存在时错误码 502005）或查询失败，页面**静默无提示**，用户只看到空评论列表，无法区分“无评论”与“评论功能不可用”。评论 UI 已实现（`detail.wxml:28–40`），属文档此前未覆盖的新功能。

**调整为：** 集合缺失/查询失败时给出明确提示或兜底文案；评论列表按 `target_id` 做内存 + 本地缓存，与 9.4 的 store 层缓存建议一并实现。

**代码位置：** `miniprogram/pages/detail/detail.js` 第 2、153–163 行；`miniprogram/utils/commentStore.js`；`miniprogram/pages/detail/detail.wxml` 第 28–40 行。

---

### 13. 零散小问题汇总

| 严重度 | 位置 | 问题 | 建议 |
| --- | --- | --- | --- |
| 中 | `pages/example/index.js:456` | `wx.navigateTo` 指向未注册且目录不存在的 `pages/web/index`，点击必跳转失败 | example 为演示页（见 9.1 建议 3），可整体删除；保留则修正或移除该入口 |
| 低 | `pages/community/community.wxml:2` | `catchtouchmove="preventMove"` 绑定了 community.js 中不存在的方法（`profile.js:442` 有同名方法），发布菜单打开时底部页面可滚动穿透并产生告警 | 在 community.js 补 `preventMove() {}` 或删除该绑定 |
| 低 | `pages/wait/wait.js:69` | 注释写“150秒，比 app.json 的 180s 略小留出余量”，实际传 `180000`（180 秒），注释与代码不符 | 统一注释或数值 |
| 低 | `pages/wait/wait.js:293–304` | `checkVideoStatus` 的 catch 仅 `console.error`，轮询失败用户无感知 | 加失败计数与用户提示 |
| 低 | `pages/script/script.js:136–144` | `wx.setClipboardData` 只有 success 无 fail 回调，复制失败无提示 | 补 fail 回调 |
| 低 | `utils/storeConfig.js` | 微信小店配置（STORE_APPID/PRODUCT_IDS）无任何代码引用（仅 `pages/adver/formatref.md` 提及），死代码 | 删除，或真正接入 adver 页 |
| 低 | `pages/profile/profile.js:203–235` | `loadTab` 方法体缩进异常；`openDetail`（237–265 行）在删除态索引命中时提前 return，存在误触交互缝隙 | 随第 2 项个人页改造一并整理 |
| 低 | `test/` | store 层（profileStore/commentStore/avatarStore）无单测，仅 avatarRefresh/profileDelete 有 | 随缓存改造补 store 层测试 |

---

## 落地优先级建议

1. **P0（功能正确性）**：第 5、6、7、8、10 项 —— 任务恢复/重置、错误跳转 API、统一后台配置、v_config 配置持久化，直接影响核心链路可用性。
2. **P1（体验明显 / 发布前）**：第 1、2、3 项 —— 控件语义、个人页去演示数据、发布页去多余导航；第 9.1 项（删冗余 GIF + 分包 + 删除测试/演示页）。
3. **P2（体验细化/性能）**：第 4 项（滑动指示）、第 9.2–9.6 项（启动链路、图片、请求缓存、渲染粒度、个人资料/评论缓存）、第 11 项（返回按钮防误触）、第 12 项（评论兜底与缓存）、第 13 项（零散小问题）。

---

*文档维护：AItour_video_creation 前端优化梳理（2026-08-16 完整版）。*
