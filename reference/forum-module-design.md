# 论坛模块设计文档

来源：`小程序后续优化思路方向.docx`

本文档整理“小程序后续优化思路方向”中关于社区/论坛部分的产品设想，并结合当前项目的视频生成链路，形成后续开发可参考的模块文档。

本期明确不包含充值、积分、付费、订单和扣费系统。

## 1. 模块定位

论坛模块用于承接用户生成内容，让用户可以分享作品、复用他人的创作灵感，并沉淀可再次使用的场景卡片。

当前项目已有“景点/描述 - 对话 - 脚本 - 视频配置 - 视频生成 - 结果输出”的主流程。论坛模块不替代主流程，而是为主流程提供两个新的入口：

- 从他人的作品进入，使用同款内容生成视频。
- 从他人的卡片进入，快速带入照片和情绪描述生成视频。

## 2. 内容类型

论坛内容分为两类：`post` 和 `card`。

### 2.1 post：作品帖子

`post` 是用户生成视频后的分享内容，面向作品展示。

核心内容：

- 视频地址
- 视频封面
- 生成文案
- 作者信息
- 发布时间
- 使用同款入口

主要用途：

- 展示用户生成的视频成品。
- 让其他用户通过“使用同款”快速复用该作品的创作参数。

### 2.2 card：卡片帖子

`card` 是用户主动制作的情绪/场景卡片，面向创作起点。

核心内容：

- 照片或场景图片
- 情绪描述
- 作者信息
- 收藏状态
- 评论列表
- 立即使用入口

主要用途：

- 让用户把某个场景和当时情绪沉淀成可复用模板。
- 让其他用户收藏或使用这张卡片进入视频生成流程。

## 3. 页面设计

### 3.1 社区首页

建议新增 `community` 页面，作为论坛入口。

页面结构：

- 顶部 tab：`作品广场`、`卡片广场`
- 当前 tab 下展示对应列表
- 列表支持下拉刷新和分页加载

### 3.2 作品广场

顶部提供“发布我的作品”按钮。

列表展示用户分享的 `post`：

- 封面图或视频预览
- 作者头像和昵称
- 作品标题或生成文案摘要
- 发布时间
- “使用同款”按钮

点击“发布我的作品”：

- 方案一：跳转到 `mode_select`，引导用户从头生成作品。
- 方案二：如果用户刚完成视频生成，则从 `v_output` 直接发布当前作品。

建议优先支持方案二，因为当前项目已经在结果页持有 `video_url` 和 `final_response`。

### 3.3 卡片广场

顶部提供“制作我的 card”按钮。

列表展示用户分享的 `card`：

- 场景图片
- 情绪描述摘要
- 作者头像和昵称
- 收藏按钮
- 评论入口
- “立即使用”按钮

点击“制作我的 card”进入 card 制作页。

### 3.4 card 制作页

页面保持简约风格，适合老用户快速制作。

主要表单项：

- 上传照片
- 填写情绪描述

底部操作：

- 发布至广场
- 立即使用
- 保存到我的 card

行为说明：

- 发布至广场：创建公开 card，同时自动保存到我的 card。
- 立即使用：不一定发布，直接将 card 内容写入当前生成流程。
- 保存到我的 card：仅保存到个人资源，不进入广场。

## 4. 核心流程

### 4.1 发布作品流程

适用场景：用户完成视频生成后，希望把作品分享到社区。

流程：

1. 用户在 `v_output` 页面点击“发布到广场”。
2. 前端读取当前生成结果：
   - `app.globalData.video_url`
   - `app.globalData.coverUrl`
   - `app.globalData.final_response`
   - `app.globalData.task_data`
3. 用户可补充标题或编辑文案。
4. 前端调用发布接口创建 `post`。
5. 发布成功后跳转到作品广场或提示发布成功。

### 4.2 使用同款 post 流程

适用场景：用户看到他人的作品后，希望基于同款风格生成自己的视频。

流程：

1. 用户在作品帖子下点击“使用同款”。
2. 前端请求该 `post` 的可复用参数。
3. 将参数写入 `app.globalData.task_data`。
4. 跳转到 `mode_select`、`dialogue` 或 `v_config`。

推荐跳转策略：

- 如果 post 只提供灵感和基础描述，跳转到 `dialogue`。
- 如果 post 已有完整脚本和风格参数，跳转到 `v_config`。

### 4.3 制作 card 流程

适用场景：用户想把自己的照片和情绪描述做成卡片。

流程：

1. 用户进入 card 制作页。
2. 上传照片，得到图片 URL。
3. 输入情绪描述。
4. 选择操作：
   - 发布至广场
   - 立即使用
   - 保存到我的 card
5. 根据操作调用对应接口或进入生成流程。

### 4.4 收藏 card 流程

适用场景：用户在卡片广场看到喜欢的卡片，希望保存备用。

流程：

1. 用户点击“收藏至我的 card”。
2. 前端调用收藏接口。
3. 后端记录用户与 card 的收藏关系。
4. 前端更新收藏状态。

### 4.5 使用 card 生成视频流程

适用场景：用户直接基于某张 card 开始创作。

流程：

1. 用户点击 card 下方“立即使用”。
2. 前端将 card 内容写入 `app.globalData.task_data`：
   - `spot_url` 使用 card 图片地址。
   - `request` 使用 card 情绪描述。
3. 跳转到 `dialogue` 页面，进入现有对话初始化流程。
4. 后续沿用当前项目已有链路：
   - `dialogue`
   - `script`
   - `v_config`
   - `wait`
   - `v_output`

## 5. 数据结构建议

### 5.1 post

```json
{
  "post_id": "post_001",
  "openid": "user_openid",
  "author_name": "用户昵称",
  "author_avatar": "https://example.com/avatar.png",
  "title": "旅行作品标题",
  "cover_url": "https://example.com/cover.png",
  "video_url": "https://example.com/video.mp4",
  "share_text": "生成的分享文案",
  "reusable_task_data": {
    "spot_url": "https://example.com/spot.png",
    "request": "用户创作需求",
    "video_request": "视频生成提示词",
    "scriptContent": "视频脚本"
  },
  "status": "published",
  "created_at": "2026-05-11T00:00:00+08:00",
  "updated_at": "2026-05-11T00:00:00+08:00"
}
```

### 5.2 card

```json
{
  "card_id": "card_001",
  "openid": "user_openid",
  "author_name": "用户昵称",
  "author_avatar": "https://example.com/avatar.png",
  "image_url": "https://example.com/card.png",
  "emotion_text": "我站在湖边时感到很平静，希望视频有温柔、舒缓的感觉。",
  "visibility": "public",
  "favorite_count": 0,
  "comment_count": 0,
  "use_count": 0,
  "created_at": "2026-05-11T00:00:00+08:00",
  "updated_at": "2026-05-11T00:00:00+08:00"
}
```

### 5.3 card_favorite

```json
{
  "favorite_id": "fav_001",
  "card_id": "card_001",
  "openid": "user_openid",
  "created_at": "2026-05-11T00:00:00+08:00"
}
```

### 5.4 comment

```json
{
  "comment_id": "comment_001",
  "target_type": "card",
  "target_id": "card_001",
  "openid": "user_openid",
  "author_name": "用户昵称",
  "author_avatar": "https://example.com/avatar.png",
  "content": "评论内容",
  "status": "visible",
  "created_at": "2026-05-11T00:00:00+08:00"
}
```

## 6. 接口建议

接口路径仅作为联调建议，可根据后端实际路由调整。

### 6.1 获取作品列表

`GET /api/community/posts`

请求参数：

```json
{
  "page": 1,
  "page_size": 10
}
```

响应示例：

```json
{
  "success": true,
  "list": [],
  "has_more": true
}
```

### 6.2 发布作品

`POST /api/community/posts`

请求参数：

```json
{
  "openid": "user_openid",
  "title": "作品标题",
  "cover_url": "https://example.com/cover.png",
  "video_url": "https://example.com/video.mp4",
  "share_text": "生成文案",
  "reusable_task_data": {}
}
```

### 6.3 获取卡片列表

`GET /api/community/cards`

请求参数：

```json
{
  "page": 1,
  "page_size": 10
}
```

### 6.4 创建卡片

`POST /api/community/cards`

请求参数：

```json
{
  "openid": "user_openid",
  "image_url": "https://example.com/card.png",
  "emotion_text": "情绪描述",
  "visibility": "public"
}
```

### 6.5 收藏卡片

`POST /api/community/cards/favorite`

该接口用于处理用户对 card 的收藏状态。建议设计为“状态切换”接口：如果用户尚未收藏，则新增收藏关系；如果用户已经收藏，则取消收藏关系。

请求参数：

```json
{
  "openid": "user_openid",
  "card_id": "card_001",
  "action": "toggle"
}
```

参数说明：

- `openid`：当前用户标识。
- `card_id`：被操作的 card。
- `action`：收藏动作，建议支持 `favorite`、`unfavorite`、`toggle`。前端按钮点击可优先使用 `toggle`。

处理逻辑：

1. 根据 `openid + card_id` 查询 `card_favorites` 是否已有记录。
2. 如果 `action` 是 `favorite`：
   - 已存在记录时直接返回成功，避免重复收藏。
   - 不存在记录时新增收藏关系，并将 `cards.favorite_count` 加 1。
3. 如果 `action` 是 `unfavorite`：
   - 已存在记录时删除收藏关系，并将 `cards.favorite_count` 减 1。
   - 不存在记录时直接返回成功，避免前端状态不同步导致报错。
4. 如果 `action` 是 `toggle`：
   - 已存在记录则取消收藏。
   - 不存在记录则新增收藏。
5. 返回最新收藏状态和最新收藏数量。

响应示例：

```json
{
  "success": true,
  "card_id": "card_001",
  "is_favorited": true,
  "favorite_count": 18
}
```

注意事项：

- `card_favorites` 是真实收藏关系表，`favorite_count` 只是冗余统计字段。
- 建议通过云函数或后端事务同时处理收藏关系和计数，避免前端直接修改 `favorite_count`。
- 收藏夹删除只删除 `card_favorites` 关系，不删除原 card。
- 原 card 被作者删除时，建议将 `cards.status` 改为 `deleted`，收藏关系可保留或由后台异步清理。

### 6.6 记录卡片使用次数

`POST /api/community/cards/use`

该接口不是“使用 card 进入生成流程”的必需接口。前端已经在卡片列表中加载了 card 数据，点击“立即使用”时可以直接将 `image_url` 和 `emotion_text` 写入 `app.globalData.task_data`，然后跳转到 `dialogue` 页面。

该接口仅作为可选统计接口，用于记录 card 被使用次数、热门排序或后续运营分析。记录失败不应阻塞用户进入生成流程。

请求参数：

```json
{
  "openid": "user_openid",
  "card_id": "card_001"
}
```

响应示例：

```json
{
  "success": true,
  "use_count": 12
}
```

## 7. 与现有链路的衔接

当前项目通过 `app.globalData.task_data` 串联视频生成链路。论坛模块也应沿用这一结构。

### 7.1 使用 card 时写入

```js
app.globalData.task_data.spot_url = card.image_url;
app.globalData.task_data.request = card.emotion_text;
```

随后跳转：

```js
wx.navigateTo({
  url: "../dialogue/dialogue"
});
```

### 7.2 使用 post 同款时写入

```js
app.globalData.task_data = {
  ...app.globalData.task_data,
  ...post.reusable_task_data
};
```

跳转位置根据复用数据完整度决定：

- 只有图片和描述：跳转 `dialogue`。
- 已有脚本：跳转 `script`。
- 已有完整视频参数：跳转 `v_config`。

## 8. 本期范围

本期包含：

- 作品广场
- 卡片广场
- 发布作品
- 制作 card
- 收藏 card
- 评论 card
- 使用同款生成
- 使用 card 生成

本期不包含：

- 充值页面
- 积分购买
- 积分消耗
- 微信支付
- 订单系统
- 付费内容权限

## 9. 实现优先级建议

### P0：最小可用论坛

- 新增社区首页。
- 支持作品列表。
- 支持卡片列表。
- 支持点击 card 后写入 `task_data` 并进入 `dialogue`。

### P1：内容发布

- 在 `v_output` 增加“发布到广场”。
- 增加 card 制作页。
- 支持发布 card 和 post。

### P2：互动能力

- 收藏 card。
- card 评论。
- 我的 card。

### P3：体验优化

- 列表分页。
- 下拉刷新。
- 发布成功反馈。
- 内容审核状态展示。

## 10. 风险与注意事项

- 社区内容需要考虑审核机制，否则正式上线存在合规风险。
- `post` 的“使用同款”不要直接复用他人的私人图片或隐私信息。
- `card` 上传图片需要限制大小和格式。
- 评论内容需要审核或敏感词过滤。
- 后端应校验 `openid`，不能只相信前端传参。
- 当前项目存在部分中文编码异常，开发社区页面前建议先统一修复文案编码。
