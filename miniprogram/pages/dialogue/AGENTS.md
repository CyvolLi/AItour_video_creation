# AGENTS — 小程序 CosyVoice TTS 使用说明

目的
- 指导开发者和 AI 助手在本仓库的 `pages/dialogue` 页面使用微信内置 WebSocket（`wx.connectSocket` / SocketTask）与 CosyVoice 实现流式 TTS。

快速参考
- 握手 URL（中国内地）：`wss://dashscope.aliyuncs.com/api-ws/v1/inference`
- 握手 Header：`Authorization: bearer <API_KEY>`（通过 `wx.connectSocket` 的 `header` 设置）
- 推荐使用：SocketTask（通过 `wx.connectSocket` 返回的任务对象）管理连接。

必须遵守的时序
- 连接打开后发送 `run-task`（`payload.input` 必须存在且为 `{}`），并生成唯一且全程一致的 `task_id`（UUID）。
- 收到 `task-started` 事件后发送 `continue-task`（实际文本）；任两次文本片段发送间隔不得超过 23 秒。
- 文本发送完毕后立即发送 `finish-task`（`payload.input = {}`），等待 `task-finished` 后可选择复用连接或关闭。

二进制音频处理（建议）
- 在 `onMessage` 中接收二进制帧，使用 `wx.arrayBufferToBase64()` 将 ArrayBuffer 转成 base64，按顺序追加到内存数组。
- 任务结束时，将 base64 拼接并写入文件（`wx.getFileSystemManager().writeFile`，`encoding: 'base64'`），再通过 `InnerAudioContext` 播放或提供文件路径给页面使用。

安全与架构建议
- 小程序支持在握手阶段设置自定义 header，目前为了保证tts流程全部在前端跑通，吧api_key硬编码进去就行
- 处理小程序前后台切换：在 `onHide/onShow` 中处理连接中断与重连策略。
- 日志：记录所有发送的 JSON 指令与收到的 `header`，便于定位 `task-failed`。

错误处理与重连策略
- 处理 `task-failed`，记录 `header.error_message`、`header.error_code`，失败后关闭连接并采用指数退避重连（重连后使用新 `task_id`）。
- 常见握手问题：401/403（鉴权），确认 `Authorization` 格式 `bearer <API_KEY>`。

实现建议（模块化）
- 建议在 `pages/dialogue/` 下新增 `websocketTts.js`，提供 API：`init({apiKey,url})`、`connect()`、`runTask(options)`、`sendText(taskId,text)`、`finishTask(taskId)`、`close()`。
- 模块职责：连接管理、指令队列化（保证时序与 23s 超时）、二进制拼接、文件写入与播放接口、错误/重连策略、日志记录。

调试要点
- 打印并保存每条发送的 JSON 指令与收到的事件（包含 `header`）。
- 保存 `task-finished` / `result-generated` 中的 `request_uuid` 便于与服务端支持沟通。

为何放入仓库
- 便于 AI 助手和新开发者快速遵循统一实现约定，避免安全与时序问题，便于维护和复用。

下一步
- 我已准备好将 `AGENTS.md` 写入仓库根目录，并创建 `pages/dialogue/websocketTts.js` 的初始实现。
