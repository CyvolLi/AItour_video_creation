# 忆景创影 — JS 代码全景讲解文档

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 基础知识速览](#2-基础知识速览)
- [3. 文件详解](#3-文件详解)
  - [3.1 app.js — 应用入口](#31-appjs--应用入口)
  - [3.2 cloudfunctions/quickstartFunctions/index.js — 云函数](#32-cloudfunctionsquickstartfunctionsindexjs--云函数)
  - [3.3 pages/index/index.js — 首页/登录](#33-pagesindexindexjs--首页登录)
  - [3.4 pages/mode_select/mode_select.js — 模式选择](#34-pagesmode_selectmode_selectjs--模式选择)
  - [3.5 pages/scenery_select/scenery_select.js — 景点选择](#35-pagesscenery_selectscenery_selectjs--景点选择)
  - [3.6 pages/dialogue/dialogue.js — AI 对话页](#36-pagesdialoguedialoguejs--ai-对话页)
  - [3.7 pages/script/script.js — 脚本生成页](#37-pagesscriptscriptjs--脚本生成页)
  - [3.8 pages/v_config/v_config.js — 视频配置页](#38-pagesv_configv_configjs--视频配置页)
  - [3.9 pages/wait/wait.js — 视频生成等待页](#39-pageswaitwaitjs--视频生成等待页)
  - [3.10 pages/v_output/v_output.js — 视频结果页](#310-pagesv_outputv_outputjs--视频结果页)
  - [3.11 pages/user_custom1/user_custom1.js — 自定义拍照](#311-pagesuser_custom1user_custom1js--自定义拍照)
  - [3.12 pages/user_custom2/user_custom2.js — 自定义输入](#312-pagesuser_custom2user_custom2js--自定义输入)
  - [3.13 utils/communityApi.js — API 路径配置](#313-utilscommunityapijs--api-路径配置)
  - [3.14 utils/communityService.js — 社区请求服务](#314-utilscommunityservicejs--社区请求服务)
  - [3.15 pages/community/community.js — 社区广场](#315-pagescommunitycommunityjs--社区广场)
  - [3.16 pages/detail/detail.js — 帖子/卡片详情](#316-pagesdetaildetailjs--帖子卡片详情)
  - [3.17 pages/publish/publish.js — 发布帖子](#317-pagespublishpublishjs--发布帖子)
  - [3.18 pages/card_publish/card_publish.js — 发布卡片](#318-pagescard_publishcard_publishjs--发布卡片)
  - [3.19 pages/profile/profile.js — 个人空间](#319-pagesprofileprofilejs--个人空间)
  - [3.20 utils/profileStore.js — 用户资料存储](#320-utilsprofilestorejs--用户资料存储)
  - [3.21 utils/commentStore.js — 评论存储](#321-utilscommentstorejs--评论存储)
  - [3.22 utils/util.js — 工具函数](#322-utilsutiljs--工具函数)
- [4. 核心概念速查表](#4-核心概念速查表)
- [5. 数据流全景图](#5-数据流全景图)

---

## 1. 项目概览

| 项目 | 说明 |
|------|------|
| **名称** | 忆景创影 |
| **类型** | 微信小程序 |
| **功能** | AI 驱动的文旅短视频生成 + 社区分享 |
| **后端** | `https://ruralv.cn` (HTTP API) + 微信云开发 (CloudBase) |
| **npm 依赖** | `mina-request`（HTTP 请求封装库） |

### 页面地图

```
index (首页/登录)
  └─ community (社区广场)
       ├─ detail (详情页)
       ├─ card_publish (发布卡片)
       ├─ publish (发布帖子)
       └─ profile (个人空间)
  └─ mode_select (模式选择)
       ├─ scenery_select (官方景点选择)
       │    └─ dialogue (AI对话)
       │         └─ script (生成脚本)
       │              └─ v_config (视频风格配置)
       │                   └─ wait (等待视频生成)
       │                        └─ v_output (视频结果)
       └─ user_custom1 (自定义拍照)
            └─ user_custom2 (自定义输入)
                 └─ dialogue → script → v_config → wait → v_output
```

---

## 2. 基础知识速览

> **如果你对这些概念不熟悉，可以先看本节，再对照各文件的讲解阅读代码。**

### 2.1 微信小程序框架

| 概念 | 定义 |
|------|------|
| `App()` | 注册整个小程序应用。在 `app.js` 中调用，只能调用一次。传入的对象的 `onLaunch` 方法在应用启动时自动执行。 |
| `Page()` | 注册一个页面。每个页面 JS 文件必须调用它。传入的对象的 `data` 是该页面的初始数据。 |
| `this.setData({key: value})` | 更新页面数据并触发页面重新渲染。**必须**用这个方法更新 data，直接赋值不会触发渲染。 |
| `getApp()` | 在其他页面中获取 `App()` 返回的全局应用实例，用于访问 `globalData`。 |

### 2.2 页面生命周期

| 函数 | 触发时机 |
|------|---------|
| `onLoad(options)` | 页面加载时调用一次，`options` 是跳转时传入的参数 |
| `onShow()` | 页面显示/从后台切回时调用（每次都会调用） |
| `onHide()` | 页面隐藏/切到后台时调用 |
| `onUnload()` | 页面被关闭时调用（redirectTo、用户返回等） |
| `onPullDownRefresh()` | 用户下拉刷新时调用 |

### 2.3 页面路由（三兄弟）

| 方法 | 行为 | 是否有返回按钮 |
|------|------|:---:|
| `wx.navigateTo({url})` | 保留当前页，新开页面（push 到页面栈） | 有 |
| `wx.redirectTo({url})` | 关闭当前页，替换为新页面 | 无 |
| `wx.reLaunch({url})` | 关闭所有页面，打开新页面 | 无 |

### 2.4 CommonJS 模块系统

```js
// 导出（文件A）
module.exports = { funcA, funcB };

// 导入（文件B）
const moduleA = require("./fileA.js");
moduleA.funcA();
```

### 2.5 ES Module（另一种导入方式）

```js
// 导出（文件A）
export default class MyClass { }

// 导入（文件B）
import MyClass from "./fileA.js";
```

本项目混合使用两种方式：`require` 用于自己的模块，`import` 用于 npm 包 `mina-request`。

### 2.6 Promise — 处理"未来"的值

```
状态流转：pending → fulfilled (成功，有结果值)
            ↘ rejected  (失败，有原因)
```

```js
// 创建 Promise
new Promise((resolve, reject) => {
    // 异步操作...
    if (成功) resolve(result);
    else reject(error);
});

// 使用 Promise
somePromise
    .then(result => { /* 成功时执行 */ })
    .catch(error  => { /* 失败时执行 */ });
```

**关键性质**：`.then()` 和 `.catch()` 都返回新的 Promise，所以可以 `.then().then().catch()` 链式调用。

### 2.7 async/await — 用同步写法写异步代码

```js
// async 函数自动返回 Promise
async function doWork() {
    const a = await step1();  // 等待 Promise 完成，拿到值
    const b = await step2(a); // 用 a 的结果继续
    return b;
}
```

**`await` 只暂停当前 async 函数的执行，不阻塞整个 JS 线程。**

### 2.8 定时器

```js
// 延迟执行（一次）
const tid1 = setTimeout(() => { ... }, 200);  // 200ms 后执行
clearTimeout(tid1);  // 取消

// 重复执行
const tid2 = setInterval(() => { ... }, 1000);  // 每 1 秒执行
clearInterval(tid2);  // 停止
```

**重要**：页面隐藏/卸载时必须清理定时器，否则会内存泄漏。

### 2.9 云开发三大能力

| 能力 | 代码 | 用途 |
|------|------|------|
| 云函数 | `wx.cloud.callFunction({name, data})` | 调用部署在云端的函数（如获取 openid） |
| 云数据库 | `wx.cloud.database().collection("xxx")` | 增删改查数据库 |
| 云存储 | `wx.cloud.uploadFile({cloudPath, filePath})` | 上传文件 → 得到 fileID |

**上传文件两步操作**：
1. `uploadFile()` → 返回 `fileID`（形如 `cloud://xxx`）
2. `getTempFileURL({fileList: [fileID]})` → 返回临时 HTTP URL（才能在 `<image>` 中显示）

---

## 3. 文件详解

---

### 3.1 `app.js` — 应用入口

```
路径：miniprogram/app.js
角色：整个应用的"心脏"
```

#### 代码结构

```
App({
  onLaunch() {
    1. 初始化 globalData（全局共享数据仓库）
    2. 初始化云开发环境
    3. 调用 getOpenId() 获取用户唯一标识
  }
})
```

#### globalData 结构

```js
globalData = {
    env: "cloud1-5g34ybsmbfe89727",   // 云开发环境 ID
    userInfo: null,                     // 用户头像、昵称
    hasNavigated: false,                // 是否已跳转（首页登录控制）
    video_extend: false,                // 是否是"延长视频"模式
    video_url: null,                    // 生成的视频地址
    final_response: null,               // 小红书/朋友圈配文
    task_data: {
        openid: null,                   // 微信用户唯一标识
        task_id: null,                  // AI 对话任务 ID
        video_id: null,                 // 视频生成任务 ID
        count: 0,                       // 视频延长次数（最多2次）
        card_id: "",                    // 使用的社区卡片 ID
        spot_url: "",                   // 景点图片 URL
        request: "",                    // 发给 AI 的文本请求
        video_request: "",              // 视频生成的 prompt
        scriptContent: "",              // AI 生成的脚本
        user_potrait: "",               // 用户肖像 URL
    }
}
```

#### getOpenId() — "发射后不管" 的异步操作

```
getOpenId()
  │
  └─ wx.cloud.callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } })
       │  └─ 返回 Promise（不等待！）
       │
       └─ .then(resp => {
            globalData.task_data.openid = resp.result.openid
          })
```

**关键**：这个函数不等 Promise 完成就返回。openid 可能稍后才写入 globalData，所以后面的页面需要 `ensureTaskDataReady()` 来等待它。

---

### 3.2 `cloudfunctions/quickstartFunctions/index.js` — 云函数

```
路径：cloudfunctions/quickstartFunctions/index.js
角色：后端云函数入口（运行在微信服务器上）
```

#### 代码结构

```js
exports.main = async (event, context) => {
    switch (event.type) {
        case "getOpenId":         return await getOpenId();
        case "createCollection":  return await createCollection();
        // ...
    }
};
```

**`event.type`** 是前端 `callFunction` 时 `data` 中的 `type` 字段，用于路由到不同功能。

#### getOpenId 为什么放在云函数？

因为 `wx.getWXContext().OPENID` 只能在云函数端调用——这是微信的安全机制，**前端代码无法直接拿到 openid**。

---

### 3.3 `pages/index/index.js` — 首页/登录

```
路径：miniprogram/pages/index/index.js
角色：用户入口 → 选择头像/昵称 → 跳转社区
```

#### 流程

```
用户进入首页
  │
  ├─ 选择头像（onChooseAvatar）
  │    └─ 头像和昵称都有 → 跳转 community
  │
  ├─ 输入昵称（onInputChange）
  │    └─ 头像和昵称都有 → 跳转 community
  │
  └─ 或用微信授权（getUserProfile）
       └─ 跳转 community
```

#### `onShow` 中的重置逻辑

```js
if (app.globalData.hasNavigated) {
    // 用户从其他页面回来时，重置头像/昵称为默认
    this.setData({ userInfo: { avatarUrl: defaultAvatarUrl, nickName: "" } });
    app.globalData.hasNavigated = false;  // 重置标记
}
```

**设计意图**：用户从社区页面可以回到首页（通过 redirectTo），回来后首页应该恢复为"未登录"状态，避免显示上一任用户信息。

---

### 3.4 `pages/mode_select/mode_select.js` — 模式选择

```
路径：miniprogram/pages/mode_select/mode_select.js
角色：两个入口的分叉点
```

```js
official()    → wx.navigateTo("../scenery_select/scenery_select")    // 官方推荐景点
personalize() → wx.navigateTo("../user_custom1/user_custom1")        // 自己拍照上传
```

---

### 3.5 `pages/scenery_select/scenery_select.js` — 景点选择

```
路径：miniprogram/pages/scenery_select/scenery_select.js
角色：展示 5 个预设景点 → 用户选一个 → 写入 globalData → 跳转 AI 对话
```

#### 选景点 → 写入全局数据

```js
app.globalData.task_data.spot_url = selectedSpot.cover;    // 景点图片 URL
app.globalData.task_data.request   = selectedSpot.text;     // 景点描述文本
app.globalData.task_data.card_id   = "";                    // 清除 community card
```

#### `e.currentTarget.dataset` 是什么？

WXML 模板中：
```html
<view data-index="{{index}}" bindtap="selectSpot">
```

JS 中：
```js
selectSpot(e) {
    const index = Number(e.currentTarget.dataset.index);
    // dataset 中的值都是字符串，需要 Number() 转换
}
```

---

### 3.6 `pages/dialogue/dialogue.js` — AI 对话页

```
路径：miniprogram/pages/dialogue/dialogue.js
角色：与 AI 对话的核心页面（最复杂的文件）
```

#### 数据结构

```js
data: {
    // 三个后端 API 地址
    initUrl:  "/api/dialogue/init",   // 初始化对话
    chatUrl:  "/api/dialogue/chat",   // 发送消息
    ttsUrl:   "/api/dialogue/tts",    // 语音合成

    messages: [],           // 对话消息列表 [{role, content, avatar, name}, ...]
    loading: false,         // 是否正在请求（防止重复发送）
    initialized: false,     // 对话是否已初始化
    showBotTyping: false,   // 是否显示 "对方正在输入..."
    CONDUCTING_TTS: false,  // 是否正在播放语音
    ttsLock: false,         // TTS 请求锁（防抖）
}
```

#### 初始化流程

```
onLoad()
  │
  ├─ syncUserInfo()            // 从 globalData 同步头像和昵称到页面 data
  ├─ setData({ showBotTyping: true })
  └─ setTimeout(() => init(), 200)  // 等 200ms 让渲染就绪
       │
       └─ init()
            ├─ await ensureTaskDataReady()   // 等 openid 就绪
            └─ await sendInitialDialogueRequest()  // 发 init 请求给后端
```

#### ensureTaskDataReady() — 轮询等待 openid

```js
await new Promise((resolve, reject) => {
    let count = 0;
    const timer = setInterval(() => {
        if (globalData.task_data.openid) {
            clearInterval(timer);
            resolve();  // 拿到了！继续往下走
        }
        if (++count >= 20) {
            clearInterval(timer);
            reject(new Error("openid 未初始化完成"));  // 4 秒超时
        }
    }, 200);  // 每 200ms 检查一次
});
```

**为什么需要这个？** 因为 `app.js` 中的 `getOpenId()` 是异步的，可能还没跑完。这里用 `setInterval` 循环检查，等 openid 到位后才继续。

#### sendRequest() — 核心请求函数

```
sendRequest(url, requestText, options)
  │
  ├─ 1. 防重复检查：if (this.data.loading) return;
  │
  ├─ 2. 构建 task_data = { ...globalData.task_data, request: requestText }
  │
  ├─ 3. 可选：将用户消息加入 messages 列表
  │
  ├─ 4. setData({ loading: true, showBotTyping: true })
  │
  ├─ 5. await wxRequest.post(url, { task_data })
  │       │
  │       └─ 如果是 init 请求 → 把后端返回的 task_id 写回 globalData
  │
  ├─ 6. 将 AI 回复加入 messages 列表
  │
  ├─ 7. 如果 ttsLock 没锁 → 加锁 → 请求 TTS 语音 → playAudio()
  │
  └─ 8. setData({ loading: false, showBotTyping: false })
```

#### ttsLock 防抖机制

```
第一次收到AI回复
  ttsLock === false → 执行 TTS 请求 → 立即设置 ttsLock = true
                       (防止紧接着的第二条回复又触发 TTS)
```

#### playAudio() — 音频播放

```js
playAudio(audioSrc) {
    innerAudioContext = wx.createInnerAudioContext();  // 创建播放器实例
    innerAudioContext.src = audioSrc;                   // 设置音频源
    innerAudioContext.autoplay = true;                   // 自动开始播放
    innerAudioContext.onEnded(() => {
        // 播放完毕 → 更新 UI 状态 → 销毁播放器
        innerAudioContext.destroy();
    });
}
```

#### 页面隐藏时清理

```js
onHide() {
    if (innerAudioContext) {
        innerAudioContext.destroy();  // 释放音频资源
        innerAudioContext = null;
    }
}
```

---

### 3.7 `pages/script/script.js` — 脚本生成页

```
路径：miniprogram/pages/script/script.js
角色：请求 AI 生成视频脚本 → 展示脚本 → 跳转配置页
```

#### 流程

```
onShow()
  └─ setTimeout → initScriptPage()
                    ├─ ensureTaskDataReady()
                    └─ sendTaskData()
                         └─ POST /api/script { task_data }
                              └─ 拿到脚本 → 存入 globalData.task_data.scriptContent
```

#### goConfigPage() — 两条路径

```js
if (count == 0) {
    // 第一次：跳转 v_config（配置风格和配文类型）
    wx.navigateTo({ url: "../v_config/v_config" });
} else {
    // 延长模式（count >= 1）：跳过配置，直接生成视频
    app.globalData.video_extend = true;
    app.globalData.task_data.video_request = this.data.scriptContent;
    wx.navigateTo({ url: "../wait/wait" });
}
```

---

### 3.8 `pages/v_config/v_config.js` — 视频配置页

```
路径：miniprogram/pages/v_config/v_config.js
角色：选择视频风格 + 配文类型 → 上传头像 → 拼接 prompt → 跳转等待页
```

#### 四种视频风格 + 两种配文类型

```js
STYLE_OPTIONS = [
    { id: "ancient-china",       name: "国风古装动画风格", ... },
    { id: "short-video-travel",  name: "短视频旅拍风格",   ... },
    { id: "cinematic-immersive", name: "电影沉浸式风格",   ... },
    { id: "user-based",          name: "按照用户描述",     ... },
];

OPTIMIZATION_OPTIONS = [
    { id: "xiaohongshu",  name: "生成小红书配文", ... },
    { id: "friend-circle", name: "生成朋友圈配文", ... },
];
```

#### Prompt 拼接逻辑

```js
saveConfigToGlobalData() {
    // 视频 prompt：风格描述 + 脚本内容
    taskData.video_request = joinPrompt([styleDescription, scriptContent]);
    // 配文 prompt：配文描述
    taskData.request = optimizationDescription;
}
```

最终发给后端的两个字段：
- **`video_request`**：`"国风古装动画...特征描述, [用户脚本内容]"`  → 指导视频生成
- **`request`**：`"请基于内容生成适合小红书发布的旅行配文..."` → 指导配文生成

#### 上传头像（两步操作）

```
chooseMedia() → 选本地图片
    ↓
wx.cloud.uploadFile() → 上传到云存储 → 得到 fileID (cloud://xxx)
    ↓
wx.cloud.getTempFileURL() → cloud:// → https:// (临时HTTP链接)
    ↓
写入 app.globalData.task_data.user_potrait
```

---

### 3.9 `pages/wait/wait.js` — 视频生成等待页

```
路径：miniprogram/pages/wait/wait.js
角色：提交视频任务 → 轮询等待 → 完成后跳转结果页（逻辑最复杂的页面）
```

#### 完整流程

```
onLoad()
  │
  └─ setTimeout 200ms
       │
       ├──────────────────────────────────┐
       v                                  v
  startFakeProgress()              startTaskFlow()
  (假进度条动画)                    (真正的任务流程)
  每 600ms 前进 1~6 步                 │
  到 20% 停止                         ├─ POST /api/share
                                      │    └─ 拿到配文 → globalData.final_response
                                      │
                                      ├─ POST /api/video 或 /api/video/extend
                                      │    └─ 拿到 task_id → 写回 globalData
                                      │
                                      └─ startPolling()
                                           └─ 每 10 秒 checkVideoStatus()
                                                ├─ complete → handleVideoReady()
                                                ├─ failed   → 提示失败
                                                └─ 其他     → 继续轮询
```

#### Fake Progress（假进度条）

```
真实进度 0%     后端进度未知      后端返回进度    完成
|               |                 |              |
0% ──────────── 20% ──────────── 开始叠加 ──── 100%
    假进度条         后端真实进度 × 0.8
    (动画)           (映射到 20%~100%)
```

```js
const progress = backendProgress == null
    ? this.data.progress                          // 无后端进度 → 保持假进度
    : Math.min(100, Math.max(20, 20 + backendProgress * 0.8));  // 映射
```

#### 轮询（Polling）

```js
startPolling() {
    const timer = setInterval(() => {
        this.checkVideoStatus();  // 每 10 秒 POST /api/video/status
    }, 10000);
}
```

#### 页面卸载时清理

```js
onUnload() {
    this.clearPolling();       // 停止轮询定时器
    this.clearFakeProgress();  // 停止假进度条定时器
}
```

**如果不清理**：用户离开页面后定时器还在跑 → 浪费网络、可能干扰后续页面的状态。

---

### 3.10 `pages/v_output/v_output.js` — 视频结果页

```
路径：miniprogram/pages/v_output/v_output.js
角色：展示生成的视频 + 脚本 + 配文 → 保存/延长/发布
```

#### 延长视频逻辑

```js
backToExtend() {
    const newCount = count + 1;
    if (newCount >= 3) {
        // 最多延长 2 次（总共 3 个版本）
        wx.showToast({ title: "已达视频延长上限" });
        return;
    }
    app.globalData.task_data.count = newCount;
    app.globalData.video_extend = true;  // 标记为延长模式
    wx.redirectTo({ url: "/pages/dialogue/dialogue" });  // 回到对话页重新生成
}
```

**count 的生命周期**：v_config 中设为 0 → backToExtend 中 +1 → script.js 的 goConfigPage 判断 count 决定跳过配置 → 最多到 2 封顶。

#### saveVideo() — 下载到相册

```
wx.downloadFile({ url: videoUrl })     → 下载到本地临时文件
  └─ wx.saveVideoToPhotosAlbum()       → 保存到系统相册
```

---

### 3.11 `pages/user_custom1/user_custom1.js` — 自定义拍照

```
路径：miniprogram/pages/user_custom1/user_custom1.js
角色：用户拍照上传 → 选图片 → 跳转文字输入页
```

#### 动画逻辑 — 递归 setTimeout

```js
scheduleNextMove() {
    const timerId = setTimeout(() => {
        this.nextFrame();            // 切换到下一帧
        this.scheduleNextMove();     // 递归调度下一次（随机间隔 1.5s~3.5s）
    }, this.randomInterval());
}

nextFrame() {
    const nextIdx = (this.data.posIndex + 1) % POSITIONS.length;
    // 在左(offset=0)、前(offset=40)、右(offset=80) 之间循环
}
```

**为什么用 setTimeout 而不是 setInterval？** 因为 `setInterval` 是固定间隔，而这里每次要在 1.5~3.5 秒之间随机取一个间隔，用递归 `setTimeout` 更灵活。

---

### 3.12 `pages/user_custom2/user_custom2.js` — 自定义输入

```
路径：miniprogram/pages/user_custom2/user_custom2.js
角色：用户输入文字描述 → 写入 task_data.request → 跳转 AI 对话
```

```js
onConfirm() {
    app.globalData.task_data.request = text || "请根据这张风景照片生成...";
    wx.navigateTo({ url: "../dialogue/dialogue" });
}
```

---

### 3.13 `utils/communityApi.js` — API 路径配置

```
路径：miniprogram/utils/communityApi.js
角色：纯配置层——定义所有社区相关 API 的路径常量
```

```js
const COMMUNITY_API = {
    postList:          "/data/community/post",           // 帖子列表
    cardList:          "/data/community/card",           // 卡片列表
    cardUse:           "/data/community/card/use",       // 使用卡片
    postPublish:       "/data/community/post/publish",   // 发布帖子
    cardPublish:       "/data/community/card/publish",   // 发布卡片
    profileMyPost:     "/data/profile/mypost",           // "我的帖子"
    profileMyCard:     "/data/profile/mycard",           // "我的卡片"
    profilePostLiked:  "/data/profile/post_liked",       // "点赞的帖子"
    profileCardLiked:  "/data/profile/card_liked",       // "点赞的卡片"
};
```

---

### 3.14 `utils/communityService.js` — 社区请求服务

```
路径：miniprogram/utils/communityService.js
角色：服务层——封装 wx.request，导出每个 API 对应的调用函数
```

#### 通用请求函数

```js
function post(url, data) {
    return new Promise((resolve, reject) => {
        wx.request({
            url: BASE_URL + url,          // 拼接完整 URL
            data,                          // 请求体（JSON）
            method: "POST",
            header: { "Content-Type": "application/json" },
            success: (resp) => {
                // HTTP 状态码 >= 400 → reject
                resp.statusCode >= 400 ? reject(resp) : resolve(resp);
            },
            fail: reject                   // 网络错误 → reject
        });
    });
}
```

**设计模式**：将微信的 `success`/`fail` 回调式 API 包装成 Promise，这样调用方可以用 `await` 或 `.then()`。

#### 按 API 暴露的函数

```js
module.exports = {
    apiCommunityPost,        // 获取帖子列表
    apiCommunityCard,        // 获取卡片列表
    apiCommunityCardPublish, // 发布卡片
    apiCommunityCardUse,     // 使用卡片
    apiCommunityPostPublish, // 发布帖子
    apiProfileMypost,        // 我的帖子
    apiProfileMycard,        // 我的卡片
    apiProfilePostLiked,     // 点赞的帖子
    apiProfileCardLiked,     // 点赞的卡片
};
```

---

### 3.15 `pages/community/community.js` — 社区广场

```
路径：miniprogram/pages/community/community.js
角色：社区广场 → 分 Tab（帖子/卡片）→ 分页加载 → 使用卡片/收藏/跳转详情
```

#### 数据管理

```js
data: {
    activeTab: "post",        // 当前 Tab：post 或 card
    postPage: 1,              // 帖子当前页码
    cardPage: 1,              // 卡片当前页码
    postList: [],             // 帖子列表
    cardList: [],             // 卡片列表
    postHasMore: true,        // 帖子是否还有更多
    cardHasMore: true,        // 卡片是否还有更多
    pageSize: 10,             // 每页数量
}
```

#### Tab 切换

```js
switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    // 如果该 Tab 的列表为空 → 请求第一页数据
    if (!list.length) this.refreshCurrent();
}
```

#### 分页加载（loadMore）

```js
loadMore() {
    const nextPage = type === "post" ? this.data.postPage + 1 : this.data.cardPage + 1;
    this.requestCurrentList(type, nextPage).then(resp => {
        // 追加到已有列表后面
        this.setData({
            postList: this.data.postList.concat(list),
            postHasMore: list.length >= this.data.pageSize  // < 一页 = 没有更多
        });
    });
}
```

#### "使用卡片" → 进入 AI 流程

```js
useCard(e) {
    communityService.apiCommunityCardUse({ card_id: item.card_id }).then(resp => {
        app.globalData.task_data.spot_url = card.image_url;  // 卡片图片
        app.globalData.task_data.request = card.emotion_text; // 卡片描述
        app.globalData.task_data.card_id = item.card_id;      // 卡片 ID
        wx.navigateTo({ url: "/pages/dialogue/dialogue" });  // 进入对话
    });
}
```

---

### 3.16 `pages/detail/detail.js` — 帖子/卡片详情

```
路径：miniprogram/pages/detail/detail.js
角色：查看帖子/卡片详情 + 加载评论 + 发表评论 + 收藏
```

#### 评论加载

```js
loadComments() {
    commentStore.listByTarget(targetId).then(comments => {
        this.setData({ target: { ...this.data.target, comments: comments.length, List: comments } });
    });
}
```

#### 发表评论

```js
submitComment() {
    commentStore.addComment({
        target_id: targetId,
        author_openid: openid,
        author_name: userInfo.nickName,
        content: content
    }).then(() => {
        this.setData({ commentInput: "" });  // 清空输入框
        return this.loadComments();           // 重新加载评论列表
    });
}
```

---

### 3.17 `pages/publish/publish.js` — 发布帖子

```
路径：miniprogram/pages/publish/publish.js
角色：填写帖子信息 → 调用后端 API → 记录到用户 profile → 跳回社区
```

#### 发布流程

```
publishPost()
  │
  ├─ 1. 收集数据：openid, 作者名, 头像, title, coverUrl, videoUrl, shareText
  │
  ├─ 2. communityService.apiCommunityPostPublish({...})  → 后端创建帖子
  │       └─ 返回 post_id
  │
  ├─ 3. profileStore.saveCreatedId(openid, "post", post_id)  → 写入用户资料
  │
  └─ 4. wx.redirectTo("/pages/community/community")
```

---

### 3.18 `pages/card_publish/card_publish.js` — 发布卡片

```
路径：miniprogram/pages/card_publish/card_publish.js
角色：上传卡片图片 + 填写情绪文字 → 调用后端 → 记录到 profile
```

#### normalizeAvatarUrl — 处理头像 URL

> 头像可能是临时本地路径（`wxfile://` 或 `http://tmp/`），不能直接发布到社区，需要先上传到云存储。

```js
normalizeAvatarUrl(avatarUrl) {
    if (/^https?:\/\//.test(avatarUrl) && !avatarUrl.startsWith("http://tmp/")) {
        return Promise.resolve(avatarUrl);  // 已经是有效 URL → 直接用
    }
    // 否则上传到云存储
    return wx.cloud.uploadFile({...}).then(uploadRes =>
        wx.cloud.getTempFileURL({...})
    ).then(urlRes => tempFileURL);
}
```

---

### 3.19 `pages/profile/profile.js` — 个人空间

```
路径：miniprogram/pages/profile/profile.js
角色：展示用户创建/收藏的帖子和卡片
```

#### 四个 Tab

| Tab | 内容 | 后端 API |
|-----|------|---------|
| `mypost` | 我创建的帖子 | `apiProfileMypost({openid})` |
| `mycard` | 我创建的卡片 | `apiProfileMycard({openid})` |
| `post_liked` | 我收藏的帖子 | `apiProfilePostLiked({post_list})` |
| `card_liked` | 我收藏的卡片 | `apiProfileCardLiked({card_list})` |

#### 缓存机制

```js
cache: {
    mypost: [],
    mycard: [],
    post_liked: [],
    card_liked: []
}
```

切换 Tab 时，如果 `cache[tab]` 已有数据，可以避免重复请求（虽然当前代码中是每次 `loadTab` 都重新请求）。

---

### 3.20 `utils/profileStore.js` — 用户资料存储

```
路径：miniprogram/utils/profileStore.js
角色：云数据库操作 —— 管理用户的 profiles 记录
```

#### 数据结构

```js
// 云数据库 profiles 集合，每条记录：
{
    openid: "xxx",                          // 唯一标识
    created_post_list:  [{ id: "xxx" }],   // 用户创建的帖子 ID 列表
    created_card_list:  [{ id: "xxx" }],   // 用户创建的卡片 ID 列表
    favorite_post_list: [{ id: "xxx" }],   // 用户收藏的帖子 ID 列表
    favorite_card_list: [{ id: "xxx" }],   // 用户收藏的卡片 ID 列表
    created_at: timestamp,
    updated_at: timestamp,
}
```

#### ensureProfile(openid)

```
查询 profiles 集合 where({ openid })
  │
  ├─ 找到 → 返回已有记录
  └─ 没找到 → 创建新记录 → 返回空 profile
```

#### toggleFavorite(openid, type, id) — 收藏/取消

```
1. ensureProfile(openid) → 拿到当前 profile
2. toggleId(list, id):
   ├─ id 在列表中 → 移除
   └─ id 不在列表中 → 加入
3. updateProfileLists() → 写回数据库
4. 返回 { profile, isFavorited }
```

#### 辅助函数

```js
// 判断列表里有没有某个 id
function listHasId(list, id) {
    return Array.isArray(list) && list.some(item => item && item.id === id);
}

// 追加（不重复）
function appendUnique(list, id) {
    if (listHasId(list, id)) return list;  // 已有 → 不追加
    return list.concat([{ id }]);
}

// 切换（有则删，无则加）
function toggleId(list, id) {
    if (listHasId(list, id)) return list.filter(item => item.id !== id);
    return list.concat([{ id }]);
}
```

---

### 3.21 `utils/commentStore.js` — 评论存储

```
路径：miniprogram/utils/commentStore.js
角色：云数据库操作 —— 管理 comments 集合
```

#### 数据结构

```js
// 云数据库 comments 集合，每条记录：
{
    comment_id: "comment_post123_1234567890_abc123",  // 唯一评论 ID
    target_id: "xxx",           // 被评论的目标 ID（帖子ID 或 卡片ID）
    target_type: "post",       // 目标类型
    author_openid: "xxx",     // 评论者
    author_name: "用户",
    author_avatar: "",
    content: "评论内容",
    status: "published",
    created_at: timestamp,
}
```

#### listByTarget(targetId)

```js
db.collection("comments")
    .where({ target_id: targetId, status: "published" })
    .orderBy("created_at", "asc")     // 按时间正序排列
    .limit(50)
    .get()
```

---

### 3.22 `utils/util.js` — 工具函数

```
路径：miniprogram/utils/util.js
角色：通用工具函数
```

```js
const formatTime = date => {
    // 将 Date 对象格式化为 "YYYY/MM/DD HH:mm:ss"
    const year = date.getFullYear();
    const month = date.getMonth() + 1;  // getMonth() 返回 0~11
    // ...
    return `${[year, month, day].map(formatNumber).join('/')} ${...}`;
};

const formatNumber = n => {
    // 个位数补零：5 → "05"
    n = n.toString();
    return n[1] ? n : `0${n}`;
};

module.exports = { formatTime };
```

**`getMonth() + 1` 的原因**：JS 的 `Date.getMonth()` 返回值是 0（一月）到 11（十二月），所以需要 +1。

---

## 4. 核心概念速查表

| 序号 | 概念 | 一句话定义 | 文件 |
|:---:|------|-----------|------|
| 1 | `App()` | 注册整个小程序的全局函数 | `app.js` |
| 2 | `Page()` | 注册一个页面的全局函数 | 每个 `pages/**/xxx.js` |
| 3 | `this.setData()` | 更新页面 data 并触发重新渲染 | 几乎所有页面 |
| 4 | `getApp()` | 获取全局 App 实例（用来访问 `globalData`） | 几乎所有页面 |
| 5 | `wx.navigateTo()` | 保留当前页，打开新页（有返回按钮） | 多处 |
| 6 | `wx.redirectTo()` | 关闭当前页，替换为新页（无返回按钮） | 多处 |
| 7 | `wx.cloud.callFunction()` | 调用云端云函数 | `app.js` |
| 8 | `wx.cloud.database()` | 获取云数据库操作对象 | `profileStore.js`, `commentStore.js` |
| 9 | `wx.cloud.uploadFile()` | 上传文件到云存储 → 得到 fileID | `v_config.js`, `card_publish.js` |
| 10 | `wx.cloud.getTempFileURL()` | fileID → 临时 HTTP URL | `v_config.js`, `card_publish.js` |
| 11 | `wx.request()` | 发起 HTTP 请求 | `communityService.js` |
| 12 | `wx.createInnerAudioContext()` | 创建音频播放器 | `dialogue.js` |
| 13 | `wx.downloadFile()` | 下载远程文件 | `v_output.js` |
| 14 | `Promise` | 代表异步操作最终结果的对象 | 几乎所有文件 |
| 15 | `async/await` | 用同步写法写异步代码 | `dialogue.js`, `script.js`, `wait.js` |
| 16 | `setTimeout()` | 延迟执行一次 | `dialogue.js`, `user_custom1.js` |
| 17 | `setInterval()` | 周期性重复执行 | `wait.js`, `dialogue.js` |
| 18 | `onLoad` / `onShow` / `onHide` / `onUnload` | 页面生命周期函数 | 每个页面 |
| 19 | `module.exports` / `require()` | CommonJS 模块导入导出 | `utils/*.js` |
| 20 | `e.currentTarget.dataset` | 获取绑定事件的元素上的 `data-*` 属性值 | 多处 |
| 21 | `globalData` | 跨页面共享的全局数据仓库 | `app.js` → `getApp().globalData` |

---

## 5. 数据流全景图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          app.globalData                                        │
│                                                                                │
│  task_data = {                                                                 │
│    openid ──────── 云函数获取 ──→ 所有 API 请求的身份标识                        │
│    task_id ─────── AI 对话 init ─→ chat / script / video / share 请求的凭证     │
│    video_id ────── 视频提交后 ──→ video/status 轮询的凭证                        │
│    spot_url ────── 景点选择 ────→ dialogue / v_config / v_output 中显示          │
│    request ─────── 景点/用户输入 ─→ 发给 AI 的文本 / 配文引导                     │
│    video_request ─ v_config 拼接 ─→ 发给视频生成 AI 的 prompt                    │
│    scriptContent ─ script 页 ────→ v_config 拼接 / v_output 显示                │
│    user_potrait ── v_config ────→ 头像上传后的临时 URL                           │
│    card_id ─────── community ───→ publish 时绑定                                │
│    count ───────── v_output ────→ 延长次数（0/1/2）                              │
│  }                                                                             │
│  video_url ─────── wait 轮询 ───→ v_output 展示 / publish 发布                 │
│  final_response ── wait 中 /api/share ─→ publish 中 shareText / v_output 展示  │
│  video_extend ──── script.js 设置 ─→ wait.js 判断用 /api/video 还是 /extend    │
└──────────────────────────────────────────────────────────────────────────────┘

各页面如何读写 globalData：

  scenery_select ──写入──→ task_data.spot_url, task_data.request
  user_custom1/2 ──写入──→ task_data.spot_url, task_data.request
  dialogue ────读写──→ task_data.task_id, task_data.request
  script ──────写入──→ task_data.scriptContent
  v_config ────写入──→ task_data.video_request, task_data.request, task_data.count
  wait ────────读写──→ task_data.task_id, video_url, final_response
  v_output ────读取──→ video_url, final_response, scriptContent
  publish ─────读取──→ video_url, card_id, final_response
  community ───写入──→ task_data (通过使用卡片)
```
