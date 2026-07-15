本文介绍如何通过WebSocket连接访问CosyVoice语音合成服务。

DashScope SDK目前仅支持Java和Python。若想使用其他编程语言开发CosyVoice语音合成应用程序，可以通过WebSocket连接与服务进行通信。

**用户指南：**关于模型介绍和选型建议请参见[实时语音合成-CosyVoice/Sambert](https://help.aliyun.com/zh/model-studio/text-to-speech)。

WebSocket是一种支持全双工通信的网络协议。客户端和服务器通过一次握手建立持久连接，双方可以互相主动推送数据，因此在实时性和效率方面具有显著优势。

对于常用编程语言，有许多现成的WebSocket库和示例可供参考，例如：

-   Go：`gorilla/websocket`
    
-   PHP：`Ratchet`
    
-   Node.js：`ws`
    

建议您先了解WebSocket的基本原理和技术细节，再参照本文进行开发。

**重要**

CosyVoice 系列模型**仅支持通过 WebSocket 连接调用，不支持 HTTP REST API**。如果使用 HTTP 请求（如 POST 方式）调用，将返回 InvalidParameter 或 url error 错误。

## **前提条件**

已[获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)。

## **模型与价格**

参见[实时语音合成-CosyVoice/Sambert](https://help.aliyun.com/zh/model-studio/text-to-speech)

## **语音合成文本限制与格式规范**

### **文本长度限制**

单次通过[continue-task指令](#974b0beb59ob5)发送的待合成文本长度不得超过 20000 字符，多次调用[continue-task指令](#974b0beb59ob5)累计发送的文本总长度不得超过 20 万字符。

### **字符计算规则**

-   汉字（包括简/繁体汉字、日文汉字和韩文汉字）按2个字符计算，其他所有字符（如标点符号、字母、数字、日韩文假名/谚文等）均按 1个字符计算
    
-   计算文本长度时，不包含SSML 标签内容
    
-   示例：
    
    -   `"你好"` → 2(你)+2(好)=4字符
        
    -   `"中A文123"` → 2(中)+1(A)+2(文)+1(1)+1(2)+1(3)=8字符
        
    -   `"中文。"` → 2(中)+2(文)+1(。)=5字符
        
    -   `"中 文。"` → 2(中)+1(空格)+2(文)+1(。)=6字符
        
    -   `"<speak>你好</speak>"` → 2(你)+2(好)=4字符
        

### **编码格式**

需采用UTF-8编码。

### **数学表达式支持说明**

当前数学表达式解析功能仅适用于cosyvoice-v3.5-flash、cosyvoice-v3.5-plus、cosyvoice-v3-flash、cosyvoice-v3-plus和cosyvoice-v2模型，支持识别中小学常见的数学表达式，包括但不限于基础运算、代数、几何等内容。

详情请参见[LaTeX 公式转语音](https://help.aliyun.com/zh/model-studio/latex-capability-support-description)。

### [SSML](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language)标记语言支持说明

使用 SSML 功能需要同时满足以下条件：

1.  **模型支持**：仅cosyvoice-v3.5-flash、cosyvoice-v3.5-plus、cosyvoice-v3-flash、cosyvoice-v3-plus和cosyvoice-v2模型支持SSML功能
    
2.  **音色支持**: 必须使用支持 SSML 的音色。支持 SSML 的音色包括
    
    -   所有复刻音色（通过声音复刻 API 创建的自定义音色）
        
    -   [音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)中标记为支持SSML的系统音色
        
    
    **说明**
    
    如果使用不支持 SSML 的系统音色（如部分基础音色），即使开启 `enable_ssml` 参数，也会报错“SSML text is not supported at the moment!”。
    
3.  **参数配置**: 在[run-task指令](#12d8a57443dmz)中将 `enable_ssml` 参数设为 `true`
    

满足上述条件后，通过[continue-task指令](#974b0beb59ob5)发送包含SSML的文本即可使用 SSML 功能。完整示例请参见[快速开始](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language#3a58f3ee8cs1c)。

## 交互流程

![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/zh-CN/7036173771/CAEQaxiBgID50pCW3hkiIDVlOWNkODdhOGYyYjQ2ZDFiMzgyYjNmMmUzOGZkNGVh4709861_20241015153444.149.svg)

客户端发送给服务端的消息称作[指令](#271eb7a50ft6r)；服务端返回给客户端的消息有两种：JSON格式的[事件](#a989eb7099wjv)和二进制音频流。

按时间顺序，客户端与服务端的交互流程如下：

1.  建立连接：客户端与服务端建立WebSocket连接。
    
2.  开启任务：客户端发送[run-task指令](#12d8a57443dmz)以开启任务。
    
3.  等待确认：客户端收到服务端返回的[task-started事件](#2942cede42z9e)，标志着任务已成功开启，可以进行后续步骤。
    
4.  发送待合成文本：
    
    客户端按顺序向服务端发送一个或多个包含待合成文本的[continue-task指令](#974b0beb59ob5)，服务端接收到完整语句后返回[result-generated事件](#e9420a4d7bock)和音频流（文本长度有约束， 详情参见[continue-task指令](#974b0beb59ob5)中`text`字段描述）。
    
    **说明**
    
    您可以多次发送[continue-task指令](#974b0beb59ob5)，按顺序提交文本片段。服务端接收文本片段后自动进行分句：
    
    -   完整语句立即合成，此时客户端能够接收到服务端返回的音频
        
    -   不完整语句缓存至完整后合成，语句不完整时服务端不返回音频
        
    
    当发送[finish-task指令](#2e967d2d349es)时，服务端会强制合成所有缓存内容。
    
5.  接收音频：通过 `binary` 通道接收音频流
    
6.  通知服务端结束任务：
    
    待文本发送完毕后，客户端发送[finish-task指令](#2e967d2d349es)通知服务端结束任务，并继续接收服务端返回的音频流（注意不要遗漏该步骤，否则可能收不到语音或收不到结尾部分的语音）。
    
7.  任务结束：
    
    客户端收到服务端返回的[task-finished事件](#f11a341732xug)，标志着任务结束。
    
8.  关闭连接：客户端关闭WebSocket连接。
    

为提高资源利用率，建议复用 WebSocket 连接处理多个任务，而非为每个任务建立新连接。参见[关于建连开销和连接复用](#3f38d194cb6id)。

**重要**

**task\_id 必须全程一致：**同一次合成任务中，**run-task、所有 continue-task、finish-task 必须使用相同的 task\_id**。

**错误后果**：如使用不同的 task\_id，会导致：

-   服务端无法关联请求，音频流返回顺序混乱
    
-   文本内容被错误分配到不同任务，语音内容错位
    
-   任务状态异常，可能收不到 task-finished 事件
    
-   无法正确计费，usage 统计不准确
    

**正确做法**：

-   在 run-task 时生成唯一的 task\_id（如使用UUID）
    
-   将该 task\_id 存储在变量中
    
-   后续所有 continue-task 和 finish-task 都使用该 task\_id
    
-   任务结束后（收到 task-finished），如需发起新任务，生成新的 task\_id
    

### **客户端实现注意事项**

在实现 WebSocket 客户端时，特别是使用 Flutter、Web 或移动端平台时，需要明确服务端与客户端的职责划分，以确保语音合成任务的完整性和稳定性。

#### **服务端与客户端职责**

##### **服务端职责**

服务端保证按顺序返回完整的音频流。您无需担心音频数据的顺序性或完整性，服务端会按照文本顺序依次生成并推送所有音频分片。

##### **客户端职责**

客户端需要负责以下关键任务：

1.  **读取并拼接所有音频分片**
    
    服务端返回的音频是以多个二进制分片（Binary Frame）的形式推送的。客户端必须完整接收所有分片，并按接收顺序拼接成最终的音频文件。示例代码如下：
    
    ```
    # Python 示例：拼接音频分片
    with open("output.mp3", "ab") as f:  # 追加模式写入
        f.write(audio_chunk)  # audio_chunk 为每次接收到的二进制音频数据
    ```
    
    ```
    // JavaScript 示例：拼接音频分片
    const audioChunks = [];
    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        audioChunks.push(event.data);  // 收集所有音频分片
      }
    };
    // 任务完成后合并音频
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    ```
    
2.  **保证 WebSocket 生命周期完整**
    
    在整个语音合成任务过程中（从发送 [run-task指令](#12d8a57443dmz) 到接收 [task-finished事件](#f11a341732xug)），**不要提前断开 WebSocket 连接**。常见错误包括：
    
    -   在所有音频分片返回前就关闭连接，导致音频不完整；
        
    -   忘记发送 [finish-task指令](#2e967d2d349es)，导致服务端缓存的文本未能合成；
        
    -   页面跳转、应用切换到后台等场景下，未妥善处理 WebSocket 的保活机制。
        
    
    **重要**
    
    移动端应用（如 Flutter、iOS、Android）需要特别注意应用进入后台时的网络连接管理。建议在后台任务或服务中维护 WebSocket 连接，或在恢复前台时检查任务状态并重新建立连接。
    
3.  **ASR→LLM→TTS 联动场景的文本完整性**
    
    在语音识别（ASR）→大语言模型（LLM）→语音合成（TTS）的联动流程中，确保传递给 TTS 的文本是完整的，不被中途截断。例如：
    
    -   等待 LLM 生成完整句子或段落后，再发送 [continue-task指令](#974b0beb59ob5)，而非逐字推送；
        
    -   如果需要流式合成（边生成边播放），可以按自然语句边界（如句号、问号）分批发送文本；
        
    -   在 LLM 输出完成后，务必发送 [finish-task指令](#2e967d2d349es)，避免遗漏尾部内容。
        

#### **平台特定提示**

-   **Flutter：**使用 `web_socket_channel` 包时，注意在 `dispose` 方法中正确关闭连接，避免内存泄漏。同时，处理应用生命周期事件（如 `AppLifecycleState.paused`）以应对后台切换场景。
    
-   **Web（浏览器）：**部分浏览器对 WebSocket 连接数有限制，建议复用同一连接处理多个任务。另外，使用 `beforeunload` 事件在页面关闭前主动断开连接，避免残留连接。
    
-   **移动端（iOS/Android 原生）：**在应用进入后台时，操作系统可能会暂停或终止网络连接。建议使用后台任务（Background Task）或前台服务（Foreground Service）保持 WebSocket 活跃，或在恢复前台时重新初始化任务。
    

## **URL**

WebSocket URL固定如下：

## 中国内地

在[中国内地部署模式](https://help.aliyun.com/zh/model-studio/regions/#080da663a75xh)下，接入点与数据存储均位于**北京地域**，模型推理计算资源仅限于中国内地。

WebSocket URL：`wss://dashscope.aliyuncs.com/api-ws/v1/inference`

## 国际

在[国际部署模式](https://help.aliyun.com/zh/model-studio/regions/#080da663a75xh)下，接入点与数据存储均位于**新加坡地域**，模型推理计算资源在全球范围内动态调度（不含中国内地）。

WebSocket URL：`wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference`

**重要**

**常见 URL 配置错误：**

-   **错误**：使用 http:// 或 https:// 开头的 URL → **正确**：必须使用 wss:// 协议
    
-   **错误**：将 Authorization 参数放在 URL 查询字符串中（如 `?Authorization=bearer <your_api_key>`）→ **正确**：Authorization 必须在 HTTP 握手的 Headers 中设置（参见[Headers](#b02603aacf7e9)）
    
-   **错误**：URL 末尾添加模型名称或其他路径参数 → **正确**：URL 固定不变，模型通过[run-task指令](#12d8a57443dmz)的 `payload.model` 参数指定
    

## **Headers**

请求头中需添加如下信息：

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| Authorization | string | 是   | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
| user-agent | string | 否   | 客户端标识，便于服务端追踪来源。 |
| X-DashScope-WorkSpace | string | 否   | 阿里云百炼[业务空间ID](https://help.aliyun.com/zh/model-studio/use-workspace#c5222ec081sbo)。 |
| X-DashScope-DataInspection | string | 否   | 是否启用数据合规检测功能。默认不传或设为`enable`。如非必要，请勿启用该参数。 |

**重要**

**鉴权验证时机与常见错误**

Authorization 鉴权在 WebSocket 握手阶段进行验证，而非后续发送[run-task指令](#12d8a57443dmz)时。如果 Authorization 头缺失或 API Key 无效，服务端将拒绝握手并返回 HTTP 401/403 错误，客户端库通常解析为 WebSocketBadStatus 异常。

### **鉴权失败排查步骤**

若 WebSocket 连接失败，请按以下步骤排查：

1.  **检查 API Key 格式**：确认 Authorization 头格式为`bearer <your_api_key>`，注意 bearer 和 API Key 之间有一个空格。
    
2.  **验证 API Key 有效性**：在百炼控制台确认 API Key 未被删除或禁用，且具有调用 CosyVoice 模型的权限。
    
3.  **检查 Headers 设置**：确认 Authorization 头在 WebSocket 握手时正确设置。不同编程语言的 WebSocket 库设置方式不同：
    
    -   Python（websockets 库）：`extra_headers={"Authorization": f"bearer {api_key}"}`
        
    -   JavaScript：WebSocket 标准 API 不支持自定义 Headers,需使用服务端中转或其他库（如 ws）
        
    -   Go（gorilla/websocket）：`header.Add("Authorization", fmt.Sprintf("bearer %s", apiKey))`
        
4.  **网络连通性测试**：使用 curl 或 Postman 测试 API Key 是否有效（通过其他支持 HTTP 的 DashScope API）。
    

### **浏览器环境 WebSocket 使用说明**

在浏览器环境（如 Vue3、React 等前端框架）中使用 WebSocket 时，存在以下限制：浏览器 WebSocket API 不支持自定义 Headers。浏览器原生的 `new WebSocket(url)` API **不支持在握手时设置自定义请求头**（如 Authorization），这是浏览器安全策略的限制。因此，无法直接在前端代码中使用 API Key 进行鉴权。

**解决方案**：**使用后端代理**

1.  在后端服务（Node.js、Java、Python 等）中建立 WebSocket 连接到 CosyVoice 服务，后端可以正确设置 Authorization 头。
    
2.  前端通过 WebSocket 连接到自己的后端服务，后端作为代理转发消息到 CosyVoice。
    
3.  优点：API Key 不暴露在前端，更安全；可以在后端添加额外的业务逻辑（如鉴权、日志、限流等）。
    

**重要**

不要将 API Key 硬编码在前端代码中或通过浏览器直接发送。API Key 泄露会导致账号被盗用、产生高额费用或数据泄露风险。

**示例代码**：

如需其他编程语言实现，您可以参考示例中的逻辑，使用对应语言实现。或者使用AI工具将示例转换为目标语言。

-   前端（原生 Web）+ 后端（Node.js Express）：[cosyvoiceNodeJs\_zh.zip](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260203/voeumo/cosyvoiceNodeJs_zh.zip)
    
-   前端（原生 Web）+ 后端（Python Flask）：[cosyvoiceFlask\_zh.zip](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260203/hwdubc/cosyvoiceFlask_zh.zip)
    

## **指令（客户端→服务端）**

指令是客户端发送给服务端的消息，为JSON格式，以Text Frame方式发送，用于控制任务的起止和标识任务边界。

发送指令需严格遵循以下时序，否则可能导致任务失败：

1.  **发送** [run-task指令](#12d8a57443dmz)
    
    -   用于启动语音合成任务。
        
    -   返回的 `task_id` 需在后续发送[continue-task指令](#974b0beb59ob5)和[finish-task指令](#2e967d2d349es)时使用，必须保持一致。
        
2.  **发送**[continue-task指令](#974b0beb59ob5)
    
    -   用于发送待合成文本。
        
    -   必须在接收到服务端返回的[task-started事件](#2942cede42z9e)后，才能发送此指令。
        
3.  **发送**[finish-task指令](#2e967d2d349es)
    
    -   用于结束语音合成任务。
        
    -   在所有[continue-task指令](#974b0beb59ob5)发送完毕后发送此指令。
        

### **1\. run-task指令：开启任务**

该指令用于开启语音合成任务。可在该指令中对音色、采样率等请求参数进行设置。

**重要**

-   **发送时机**：WebSocket连接建立后。
    
-   **不要发送待合成文本**：在 run-task 指令中发送文本不利于问题排查，应避免在此发送文本。待合成文本应通过[continue-task指令](#974b0beb59ob5)发送。
    
-   **input 字段必须存在**：payload 中必须包含 input 字段（格式为 `{}`），不可省略，否则会报错“task can not be null”。
    

**示例：**

```
{
    "header": {
        "action": "run-task",
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx", // 随机uuid
        "streaming": "duplex"
    },
    "payload": {
        "task_group": "audio",
        "task": "tts",
        "function": "SpeechSynthesizer",
        "model": "cosyvoice-v3-flash",
        "parameters": {
            "text_type": "PlainText",
            "voice": "longanyang",            // 音色
            "format": "mp3",		        // 音频格式
            "sample_rate": 22050,	        // 采样率
            "volume": 50,			// 音量
            "rate": 1,				// 语速
            "pitch": 1				// 音调
        },
        "input": {// input不能省去，不然会报错
        }
    }
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| header.action | string | 是   | 指令类型。 当前指令中，固定为"run-task"。 |
| header.task\\_id | string | 是   | 当次任务ID。 为32位通用唯一识别码（UUID），由32个随机生成的字母和数字组成。可以带横线（如 `"2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx"`）或不带横线（如 `"2bf83b9abaeb4fda8d9axxxxxxxxxxxx"`）。大多数编程语言都内置了生成UUID的API，例如Python： ``` import uuid def generateTaskId(self): # 生成随机UUID return uuid.uuid4().hex ``` 在后续发送[continue-task指令](#974b0beb59ob5)和[finish-task指令](#2e967d2d349es)时，用到的task\\_id需要和发送run-task指令时使用的task\\_id保持一致。 |
| header.streaming | string | 是   | 固定字符串："duplex" |

`**payload**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| payload.task\\_group | string | 是   | 固定字符串："audio"。 |
| payload.task | string | 是   | 固定字符串："tts"。 |
| payload.function | string | 是   | 固定字符串："SpeechSynthesizer"。 |
| payload.model | string | 是   | 语音合成[模型](https://help.aliyun.com/zh/model-studio/models#7a960cc042zwt)。 不同模型版本需要使用对应版本的音色： - cosyvoice-v3.5-flash/cosyvoice-v3.5-plus：无系统音色，仅支持使用声音设计/复刻音色。 - cosyvoice-v3-flash/cosyvoice-v3-plus：使用longanyang等音色。 - cosyvoice-v2：使用longxiaochun\\_v2等音色。 - cosyvoice-v1：使用longwan等音色。 - 完整音色列表请参见[音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)。 |
| payload.input | object | 是   | **run-task 指令中必须包含 input 字段（不可省略），但不应在此发送待合成文本**（因此应使用空对象 `{}`）。待合成文本应通过后续的[continue-task指令](#974b0beb59ob5)发送，以便于问题排查和流式合成。 `input`格式为： ``` "input": {} ``` **重要** **常见错误**：省略 input 字段或在 input 中包含非预期字段（如 mode、content 等）会导致服务端拒绝请求并返回“InvalidParameter: task can not be null”或连接关闭（WebSocket code 1007）错误。 |
| **payload.parameters** |   |   |   |
| text\\_type | string | 是   | 固定字符串：“PlainText”。 |
| voice | string | 是   | 语音合成所使用的音色。 支持系统音色和复刻音色： - **系统音色**：参见[音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)。 - **复刻音色**：通过[声音复刻](https://help.aliyun.com/zh/model-studio/voice-replica-1/)功能定制。使用复刻音色时，请确保声音复刻与语音合成使用同一账号。 使用声音复刻生成的复刻音色时，本请求的`model`参数值，必须与创建该音色时所用的模型版本（即`target_model`参数）完全一致。 - **声音设计音色**：通过[声音设计](https://help.aliyun.com/zh/model-studio/cosyvoice-clone-design-api)功能定制。使用声音设计音色时，请确保声音设计与语音合成使用同一账号。 使用声音设计生成的音色时，本请求的`model`参数值，必须与创建该音色时所用的模型版本（即`target_model`参数）完全一致。 |
| format | string | 否   | 音频编码格式。 - 所有模型均支持的编码格式：pcm、wav和mp3（默认） - 除`cosyvoice-v1`外，其他模型支持的编码格式：opus 音频格式为opus时，支持通过`bit_rate`参数调整码率。 |
| sample\\_rate | integer | 否   | 音频采样率（单位：Hz）。 默认值：22050。 取值范围：8000, 16000, 22050, 24000, 44100, 48000。 **说明** 默认采样率代表当前音色的最佳采样率，缺省条件下默认按照该采样率输出，同时支持降采样或升采样。 |
| volume | integer | 否   | 音量。 默认值：50。 取值范围：\\[0, 100\\]。50代表标准音量。音量大小与该值呈线性关系，0为静音，100为最大音量。 |
| rate | float | 否   | 语速。 默认值：1.0。 取值范围：\\[0.5, 2.0\\]。1.0为标准语速，小于1.0则减慢，大于1.0则加快。 |
| pitch | float | 否   | 音高。该值作为音高调节的乘数，但其与听感上的音高变化并非严格的线性或对数关系，建议通过测试选择合适的值。 默认值：1.0。 取值范围：\\[0.5, 2.0\\]。1.0为音色自然音高。大于1.0则音高变高，小于1.0则音高变低。 |
| enable\\_ssml | boolean | 否   | 是否开启SSML功能。 该参数设为 `true` 后，仅允许发送一次文本（只允许发送一次[continue-task指令](#974b0beb59ob5)）。 |
| bit\\_rate | int | 否   | 音频码率（单位kbps）。音频格式为opus时，支持通过`bit_rate`参数调整码率。 默认值：32。 取值范围：\\[6, 510\\]。 `cosyvoice-v1`模型不支持该参数。 |
| word\\_timestamp\\_enabled | boolean | 否   | 是否开启字级别时间戳。 默认值：false。 - true：开启。 - false：关闭。 该功能仅适用于cosyvoice-v3-flash、cosyvoice-v3-plus和cosyvoice-v2模型的复刻音色，以及[音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)中标记为支持的系统音色。 开启 word\\_timestamp\\_enabled 后，时间戳信息会在 **result-generated 事件**中返回。示例如下： ``` { "header": { "task_id": "3f39be22-efbd-4844-91d5-xxxxxxxxxxxx", "event": "result-generated", "attributes": {} }, "payload": { "output": { "sentence": { "index": 0, "words": [ { "text": "床", "begin_index": 0, "end_index": 1, "begin_time": 280, "end_time": 640 } ] }, "type": "sentence-begin", "original_text": "床前明月光，" } } } ``` |
| seed | int | 否   | 生成时使用的随机数种子，使合成的效果产生变化。在模型版本、文本、音色及其他参数均相同的前提下，使用相同的seed可复现相同的合成结果。 默认值0。 取值范围：\\[0, 65535\\]。 cosyvoice-v1不支持该功能。 |
| language\\_hints | array\\[string\\] | 否   | 指定语音合成的目标语言，提升合成效果。cosyvoice-v1不支持该功能。 当数字、缩写、符号等朗读方式或者小语种合成效果不符合预期时使用，例如： - 数字朗读方式不符合预期，“hello, this is 110”读成“hello, this is one one zero”而非“hello, this is 幺幺零” - 符号朗读不准确，“@”读成“艾特”而非“at” - 小语种合成效果差，合成不自然 取值范围： - zh：中文 - en：英文 - fr：法语 - de：德语 - ja：日语 - ko：韩语 - ru：俄语 - pt：葡萄牙语 - th：泰语 - id：印尼语 - vi：越南语 **注意**：此参数为数组，但当前版本仅处理第一个元素，因此建议只传入一个值。 **重要** 此参数用于指定语音合成的目标语言，该设置与声音复刻时的样本音频的语种无关。如果您需要设置复刻任务的源语言，请参见[CosyVoice声音复刻/设计API](https://help.aliyun.com/zh/model-studio/cosyvoice-clone-design-api)。 |
| instruction | string | 否   | 设置指令，用于控制方言、情感或角色等合成效果。该功能仅适用于cosyvoice-v3.5-flash、cosyvoice-v3.5-plus和cosyvoice-v3-flash模型的复刻音色，以及[音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)中标记为支持Instruct的系统音色。 **长度限制**：100字符。 > 汉字（包括简/繁体汉字、日文汉字和韩文汉字）按2个字符计算，其他所有字符（如标点符号、字母、数字、日韩文假名/谚文等）均按 1个字符计算 **使用要求**（因模型而异）： - cosyvoice-v3.5-flash和cosyvoice-v3.5-plus：可以输入任意指令控制合成效果（如情感、语速等） **重要** cosyvoice-v3.5-flash和cosyvoice-v3.5-plus无系统音色，仅支持使用声音设计/复刻音色。 指令示例： ``` 请用非常激昂且高亢的语气说话，表现出获得重大成功后的狂喜与激动。 语速请保持中等偏慢，语气要显得优雅、知性，给人以从容不迫的安心感。 语气要充满哀伤与怀念，带有轻微的鼻音，仿佛正在诉说一段令人心碎的往事。 请尝试用气声说话，音量极轻，营造出一种在耳边亲密低语的神秘感。 语气要显得非常急躁且不耐烦，语速加快，句子之间的停顿要尽量缩短。 请模拟一位慈祥、温和的长辈，语速平稳，声音中要透出满满的关怀与爱意。 语气要充满讽刺和不屑，在关键词上加重读音，句尾语调略微上扬。 请用一种极度恐惧且颤抖的声音说话。 语气要像专业的新闻播音员一样，冷静、客观且字正腔圆，情绪保持中立。 语气要显得活泼俏皮，带着明显的笑意，让声音听起来充满朝气与阳光。 ``` - cosyvoice-v3-flash：需遵照如下要求 - 复刻音色：可使用任意自然语言控制语音合成效果。 指令示例： ``` 请用广东话表达。（支持的方言：广东话、东北话、甘肃话、贵州话、河南话、湖北话、江西话、闽南话、宁夏话、山西话、陕西话、山东话、上海话、四川话、天津话、云南话。） 请尽可能非常大声地说一句话。 请用尽可能慢地语速说一句话。 请用尽可能快地语速说一句话。 请非常轻声地说一句话。 你可以慢一点说吗 你可以非常快一点说吗 你可以非常慢一点说吗 你可以快一点说吗 请非常生气地说一句话。 请非常开心地说一句话。 请非常恐惧地说一句话。 请非常伤心地说一句话。 请非常惊讶地说一句话。 请尽可能表现出坚定的感觉。 请尽可能表现出愤怒的感觉。 请尝试一下亲和的语调。 请用冷酷的语调讲话。 请用威严的语调讲话。 我想体验一下自然的语气。 我想看看你如何表达威胁。 我想看看你怎么表现智慧。 我想看看你怎么表现诱惑。 我想听听用活泼的方式说话。 我想听听你用激昂的感觉说话。 我想听听用沉稳的方式说话的样子。 我想听听你用自信的感觉说话。 你能用兴奋的感觉和我交流吗？ 你能否展示狂傲的情绪表达？ 你能展现一下优雅的情绪吗？ 你可以用幸福的方式回答问题吗？ 你可以做一个温柔的情感演示吗？ 能用冷静的语调和我谈谈吗？ 能用深沉的方法回答我吗？ 能用粗犷的情绪态度和我对话吗？ 用阴森的声音告诉我这个答案。 用坚韧的声音告诉我这个答案。 用自然亲切的闲聊风格叙述。 用广播剧博客主的语气讲话。 ``` - 系统音色：指令必须使用固定格式和内容，详情请参见[音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list) |
| enable\\_aigc\\_tag | boolean | 否   | 是否在生成的音频中添加AIGC隐性标识。设置为true时，会将隐性标识嵌入到支持格式（wav/mp3/opus）的音频中。 默认值：false。 仅cosyvoice-v3-flash、cosyvoice-v3-plus、cosyvoice-v2支持该功能。 |
| aigc\\_propagator | string | 否   | 设置AIGC隐性标识中的 `ContentPropagator` 字段，用于标识内容的传播者。仅在 `enable_aigc_tag` 为 `true` 时生效。 默认值：阿里云UID。 仅cosyvoice-v3-flash、cosyvoice-v3-plus、cosyvoice-v2支持该功能。 |
| aigc\\_propagate\\_id | string | 否   | 设置AIGC隐性标识中的 `PropagateID` 字段，用于唯一标识一次具体的传播行为。仅在 `enable_aigc_tag` 为 `true` 时生效。 默认值：本次语音合成请求Request ID。 仅cosyvoice-v3-flash、cosyvoice-v3-plus、cosyvoice-v2支持该功能。 |
| hot\\_fix | object | 否   | 文本热修复配置，用于自定义指定词语的发音或对待合成文本进行替换。仅cosyvoice-v3-flash复刻音色支持该功能。 参数介绍： - pronunciation：自定义发音。指定词语的拼音标注，用于纠正默认发音不准确的情况。 - replace：文本替换。在语音合成前将指定词语替换为目标文本，替换后的文本将作为实际合成内容。 示例： ``` "hot_fix": { "pronunciation": [ {"天气": "tian1 qi4"} ], "replace": [ {"今天": "金天"} ] } ``` |
| enable\\_markdown\\_filter | boolean | 否   | 是否启用 Markdown 过滤。启用该功能后，系统在合成语音前自动过滤输入文本中的 Markdown 标记符号，避免将其朗读为文字内容。仅cosyvoice-v3-flash复刻音色支持该功能。 默认值：false。 取值范围： - true：启用Markdown过滤 - false：禁用Markdown过滤 |

### **2\. continue-task指令**

该指令专门用来发送待合成文本。

可以在一个`continue-task`指令中一次性发送待合成文本，也可以将文本分段并按顺序在多个`continue-task`指令中发送。

**重要**

**发送时机：**在收到[task-started事件](#2942cede42z9e)后发送。

**说明**

发送文本片段的间隔不得超过23秒，否则触发“request timeout after 23 seconds”异常。

若无待发送文本，需及时发送[finish-task指令](#2e967d2d349es)结束任务。

> 服务端强制设定23秒超时机制，客户端无法修改该配置。

**示例：**

```
{
    "header": {
        "action": "continue-task",
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx", // 随机uuid
        "streaming": "duplex"
    },
    "payload": {
        "input": {
            "text": "床前明月光，疑是地上霜"
        }
    }
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| header.action | string | 是   | 指令类型。 当前指令中，固定为"continue-task"。 |
| header.task\\_id | string | 是   | 当次任务ID。 需要和发送[run-task指令](#12d8a57443dmz)时使用的task\\_id保持一致。 |
| header.streaming | string | 是   | 固定字符串："duplex" |

`**payload**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| input.text | string | 是   | 待合成文本。 |

### **3\. finish-task指令：结束任务**

该指令用于结束语音合成任务。

**请务必确保发送该指令**，否则会出现以下问题：

-   **音频不完整**：服务端缓存的不完整语句不会被强制合成，导致音频缺失尾部内容。
    
-   **连接超时**：如果在最后一次[continue-task指令](#974b0beb59ob5)后超过 23 秒未发送 finish-task，连接会因超时而断开。
    
-   **计费异常**：未正常结束的任务可能无法返回准确的 usage 信息。
    

**重要**

**发送时机**：finish-task 应在所有[continue-task指令](#974b0beb59ob5)发送完毕后**立即**发送，不要等待音频返回完毕或延迟发送，否则可能触发超时。

**示例：**

```
{
    "header": {
        "action": "finish-task",
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "streaming": "duplex"
    },
    "payload": {
        "input": {}//input不能省去，否则会报错
    }
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| header.action | string | 是   | 指令类型。 当前指令中，固定为"finish-task"。 |
| header.task\\_id | string | 是   | 当次任务ID。 需要和发送[run-task指令](#12d8a57443dmz)时使用的task\\_id保持一致。 |
| header.streaming | string | 是   | 固定字符串："duplex" |

`**payload**`**参数说明：**

| **参数** | **类型** | **是否必选** | **说明** |
| --- | --- | --- | --- |
| payload.input | object | 是   | 固定格式：{}。 |

## **事件（服务端→客户端）**

事件是服务端返回给客户端的消息，为JSON格式，代表不同的处理阶段。

**说明**

服务端返回给客户端的二进制音频不包含在任何事件中，需单独接收。

### **1\. task-started事件：任务已开启**

当监听到服务端返回的`task-started`事件时，标志着任务已成功开启。只有在接收到该事件后，才能向服务端发送[continue-task指令](#974b0beb59ob5)或[finish-task指令](#2e967d2d349es)；否则，任务将执行失败。

`task-started`事件的`payload`没有内容。

**示例：**

```
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-started",
        "attributes": {}
    },
    "payload": {}
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| header.event | string | 事件类型。 当前事件中，固定为"task-started"。 |
| header.task\\_id | string | 客户端生成的task\\_id |

### **2\. result-generated事件**

客户端发送[continue-task指令](#974b0beb59ob5)和[finish-task指令](#2e967d2d349es)的同时，服务端持续返回`result-generated`事件。

为了让用户能够将音频数据与对应的文本内容关联，服务端在返回音频数据的同时，通过`result-generated`事件返回句子的元信息。服务端会对用户输入的文本进行自动分句，每个句子的合成过程包含以下3个子事件：

-   `**sentence-begin**`：标识句子开始，返回待合成的句子文本内容
    
-   `**sentence-synthesis**`：标识音频数据块，每个此事件后立即通过WebSocket binary通道传输一个音频数据帧
    
    -   一个句子的合成过程中会产生多个`sentence-synthesis`事件，每个对应一个音频数据块
        
    -   客户端需要按顺序接收这些音频数据块并以追加模式写入同一文件
        
    -   `sentence-synthesis`事件与其后的音频数据帧是一一对应的关系，不会出现错位
        
-   `**sentence-end**`：标识句子结束，返回句子文本内容和累计的计费字符数
    

通过`payload.output.type`字段区分子事件类型。

**示例：**

## sentence-begin

```
{
    "header": {
        "task_id": "3f2d5c86-0550-45c0-801f-xxxxxxxxxx",
        "event": "result-generated",
        "attributes": {}
    },
    "payload": {
        "output": {
            "sentence": {
                "index": 0,
                "words": []
            },
            "type": "sentence-begin",
            "original_text": "床前明月光，"
        }
    }
}
```

## sentence-synthesis

```
{
    "header": {
        "task_id": "3f2d5c86-0550-45c0-801f-xxxxxxxxxx",
        "event": "result-generated",
        "attributes": {}
    },
    "payload": {
        "output": {
            "sentence": {
                "index": 0,
                "words": []
            },
            "type": "sentence-synthesis"
        }
    }
}
```

## sentence-end

```
{
    "header": {
        "task_id": "3f2d5c86-0550-45c0-801f-xxxxxxxxxx",
        "event": "result-generated",
        "attributes": {}
    },
    "payload": {
        "output": {
            "sentence": {
                "index": 0,
                "words": []
            },
            "type": "sentence-end",
            "original_text": "床前明月光，"
        },
        "usage": {
            "characters": 11
        }
    }
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| header.event | string | 事件类型。 当前事件中，固定为"result-generated"。 |
| header.task\\_id | string | 客户端生成的task\\_id。 |
| header.attributes | object | 附加属性，通常为空对象。 |

`**payload**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| payload.output.type | string | 子事件类型。 取值范围： - `**sentence-begin**`：标识句子开始，返回待合成的句子文本内容 - `**sentence-synthesis**`：标识音频数据块，每个此事件后立即通过WebSocket binary通道传输一个音频数据帧 - 一个句子的合成过程中会产生多个`sentence-synthesis`事件，每个对应一个音频数据块 - 客户端需要按顺序接收这些音频数据块并以追加模式写入同一文件 - `sentence-synthesis`事件与其后的音频数据帧是一一对应的关系，不会出现错位 - `**sentence-end**`：标识句子结束，返回句子文本内容和累计的计费字符数 完整的事件流程 对于每个待合成的句子，服务端按以下顺序返回事件： 1. **sentence-begin**：标识句子开始，包含句子文本内容（`original_text`） 2. **sentence-synthesis** (多次) ：每个事件后立即跟随一个二进制音频数据帧 3. **sentence-end**：标识句子结束，包含句子文本内容和累计计费字符数 |
| payload.output.sentence.index | integer | 句子的编号，从0开始。 |
| payload.output.sentence.words | array | 字级别信息数组。 |
| payload.output.sentence.words.text | string | 字的文本。 |
| payload.output.sentence.words.begin\\_index | integer | 字在句子中的开始位置索引，从 0 开始。 |
| payload.output.sentence.words.end\\_index | integer | 字在句子中的结束位置索引，从 1 开始。 |
| payload.output.sentence.words.begin\\_time | integer | 字对应音频的开始时间戳，单位为毫秒。 |
| payload.output.sentence.words.end\\_time | integer | 字对应音频的结束时间戳，单位为毫秒。 |
| payload.output.original\\_text | string | 对用户输入文本进行分句后的句内容。最后一个句子可能没有此字段。 |
| payload.usage.characters | integer | 截止当前，本次请求中计费的有效字符数。 在一次任务中，`usage`可能会出现在[result-generated事件](#e9420a4d7bock)或[task-finished事件](#f11a341732xug)中。下发的`usage`字段为累加后的结果，请按最后一次为准。 |

### **3\. task-finished事件：任务已结束**

当监听到服务端返回的`task-finished`事件时，说明任务已结束。

结束任务后可以关闭WebSocket连接结束程序，也可以复用WebSocket连接，重新发送[run-task指令](#12d8a57443dmz)开启下一个任务（参见[关于建连开销和连接复用](#3f38d194cb6id)）。

**示例：**

```
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-finished",
        "attributes": {
            "request_uuid": "0a9dba9e-d3a6-45a4-be6d-xxxxxxxxxxxx"
        }
    },
    "payload": {
        "output": {
            "sentence": {
                "words": []
            }
        },
        "usage": {
            "characters": 13
        }
    }
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| header.event | string | 事件类型。 当前事件中，固定为"task-finished"。 |
| header.task\\_id | string | 客户端生成的task\\_id。 |
| header.attributes.request\\_uuid | string | Request ID，可提供给CosyVoice开发人员定位问题。 |

`**payload**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| payload.usage.characters | integer | 截止当前，本次请求中计费的有效字符数。 在一次任务中，`usage`可能会出现在[result-generated事件](#e9420a4d7bock)或[task-finished事件](#f11a341732xug)中。下发的`usage`字段为累加后的结果，请按最后一次为准。 |

### **4\. task-failed事件：任务失败**

如果接收到`task-failed`事件，表示任务失败。此时需要关闭WebSocket连接并处理错误。通过分析报错信息，如果是由于编程问题导致的任务失败，您可以调整代码进行修正。

**示例：**

```
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-failed",
        "error_code": "InvalidParameter",
        "error_message": "[tts:]Engine return error code: 418",
        "attributes": {}
    },
    "payload": {}
}
```

`**header**`**参数说明：**

| **参数** | **类型** | **说明** |
| --- | --- | --- |
| header.event | string | 事件类型。 当前事件中，固定为task-failed。 |
| header.task\\_id | string | 客户端生成的task\\_id。 |
| header.error\\_code | string | 报错类型描述。 |
| header.error\\_message | string | 具体报错原因。 |

## **任务中断方式**

在流式合成过程中，如需提前终止当前任务（如用户取消播放、实时对话中打断等），可通过以下方式实现：

| **中断方式** | **服务端行为** | **适用场景** |
| 直接关闭连接 | - 服务端立即停止合成 - 已生成但未发送的音频被丢弃 - 客户端不会收到 task-finished 事件 - 连接断开后无法复用 | **立即中断**：用户取消播放、切换内容、应用退出等 |
| 发送 finish-task | - 服务端强制合成所有缓存文本 - 返回剩余音频片段 - 返回 task-finished 事件 - 连接可复用（可发起新任务） | **优雅结束**：停止发送新文本，但需接收已缓存内容的音频 |

## **关于建连开销和连接复用**

WebSocket服务支持连接复用以提升资源的利用效率，避免建立连接开销。

服务端收到客户端发送的 [run-task指令](#12d8a57443dmz)后，将启动一个新的任务，客户端发送[finish-task指令](#2e967d2d349es)后，服务端在任务完成时返回[task-finished事件](#f11a341732xug)以结束该任务。结束任务后WebSocket连接可以被复用，客户端重新发送[run-task指令](#12d8a57443dmz)即可开启下一个任务。

**重要**

1.  在服务端返回[task-finished事件](#f11a341732xug)后才可以发送新的[run-task指令](#12d8a57443dmz)。
    
2.  在复用连接中的不同任务需要使用不同 task\_id。
    
3.  如果在任务执行过程中发生失败，服务将依然返回[task-failed事件](#ea4609132a8u7)，并关闭该连接。此时这个连接无法继续复用。
    
4.  如果在任务结束后60秒没有新的任务，连接会超时自动断开。
    

## **性能指标与并发限制**

### **并发限制**

具体限制请参见[限流](https://help.aliyun.com/zh/model-studio/rate-limit)。

如需提升并发配额（如支持更多并发连接数），请联系客服申请。配额调整可能需要审核，一般在 1~3 个工作日内完成。

**说明**

**最佳实践**：为提高资源利用率，建议复用 WebSocket 连接处理多个任务，而非为每个任务建立新连接。参见[关于建连开销和连接复用](#3f38d194cb6id)。

### **连接性能与延迟**

**正常连接耗时**：

-   中国内地客户端：WebSocket 连接建立（从 newWebSocket 到 onOpen）通常耗时 200~1000 毫秒。
    
-   跨境连接（如香港、海外地域）：可能出现 1~3 秒的连接延迟，偶发情况下可能达到 10~30 秒。
    

**连接耗时过长排查**：

如果 WebSocket 连接建立耗时超过 30 秒，可能的原因包括：

1.  **网络问题**：客户端与服务端之间的网络延迟较高（如跨境连接、运营商网络质量问题）。
    
2.  **DNS 解析慢**：dashscope.aliyuncs.com 的 DNS 解析耗时较长。可尝试使用公共 DNS（如 8.8.8.8）或配置本地 hosts 文件。
    
3.  **TLS 握手慢**：客户端 TLS 版本过低或证书校验耗时。建议使用 TLS 1.2 或更高版本。
    
4.  **代理或防火墙**：企业网络可能限制 WebSocket 连接或需要通过代理。
    

**排查工具**:

-   使用 Wireshark 或 tcpdump 抓包分析 TCP 握手、TLS 握手、WebSocket Upgrade 各阶段耗时。
    
-   使用 curl 测试 HTTP 连接延迟：`curl -w "@curl-format.txt" -o /dev/null -s https://dashscope.aliyuncs.com`
    

**说明**

CosyVoice WebSocket API 部署在中国内地（北京）地域。如果客户端位于其他地域（如香港、海外），建议使用就近的中转服务器或 CDN 加速连接。

### **音频生成性能**

**合成速度**：

-   实时率（RTF）: CosyVoice 各模型的合成速度通常为 0.1~0.5 倍实时率（即 1 秒音频约需 0.1~0.5 秒生成），具体速度取决于模型版本、文本长度和服务端负载。
    
-   首包延迟：从发送 continue-task 指令到接收到第一个音频分片，通常在 200~800 毫秒之间。
    

## **示例代码**

示例代码仅提供最基础的服务调通实现，实际业务场景的相关代码需您自行开发。

在编写WebSocket客户端代码时，为了同时发送和接收消息，通常采用异步编程。您可以按照以下步骤来编写程序：

1.  **建立WebSocket连接**
    
    调用WebSocket库函数（具体实现方式因编程语言或库函数而异），传入[Headers](#b02603aacf7e9)和[URL](#07bfd546805pn)建立WebSocket连接。
    
2.  **监听服务端消息**
    
    通过 WebSocket 库提供的回调函数（观察者模式），您可以监听服务端返回的消息。具体实现方式因编程语言不同而有所差异。
    
    服务端返回的消息分为两类：二进制音频流和[事件](#a989eb7099wjv)。
    
    **监听**[事件](#a989eb7099wjv)
    
    -   **task-started：**当接收到[task-started事件](#2942cede42z9e)时，表示任务已成功开启。只有在此事件触发后，才能向服务端发送[continue-task指令](#974b0beb59ob5)或[finish-task指令](#2e967d2d349es)；否则任务会失败。
        
    -   **result-generated：**客户端发送[continue-task指令](#974b0beb59ob5)或[finish-task指令](#2e967d2d349es)时，服务端可能会持续返回[result-generated事件](#e9420a4d7bock)。
        
    -   **task-finished：**接收到[task-finished事件](#f11a341732xug)时，表示任务已完成。此时可以关闭 WebSocket 连接并结束程序。
        
    -   **task-failed：**如果接收到[task-failed事件](#ea4609132a8u7)，表示任务失败。需要关闭 WebSocket 连接，并根据报错信息调整代码进行修正。
        
    
    **处理二进制音频流**：服务端通过 `binary` 通道分帧下发音频流。完整的音频数据被分成多个数据包传输。
    
    -   流式语音合成中，对于mp3/opus等压缩格式，音频分段传输需使用流式播放器，不可逐帧播放，避免解码失败。
        
        > 支持流式播放的播放器：ffmpeg、pyaudio (Python)、AudioFormat (Java)、MediaSource (Javascript)等。
        
    -   将音频数据合成完整的音频文件时，应以追加模式写入同一文件。
        
    -   流式语音合成的wav/mp3 格式音频仅首帧包含头信息，后续帧为纯音频数据。
        
    
3.  **向服务端发送消息（请务必注意时序）**
    
    在不同于监听服务端消息的线程（如主线程，具体实现因编程语言而异）中，向服务端发送指令。
    
    发送指令需严格遵循以下时序，否则可能导致任务失败：
    
    1.  **发送** [run-task指令](#12d8a57443dmz)
        
        -   用于启动语音合成任务。
            
        -   返回的 `task_id` 需在后续发送[continue-task指令](#974b0beb59ob5)和[finish-task指令](#2e967d2d349es)时使用，必须保持一致。
            
    2.  **发送**[continue-task指令](#974b0beb59ob5)
        
        -   用于发送待合成文本。
            
        -   必须在接收到服务端返回的[task-started事件](#2942cede42z9e)后，才能发送此指令。
            
    3.  **发送**[finish-task指令](#2e967d2d349es)
        
        -   用于结束语音合成任务。
            
        -   在所有[continue-task指令](#974b0beb59ob5)发送完毕后发送此指令。
            
    
4.  **关闭WebSocket连接**
    
    在程序正常结束、运行中出现异常或接收到[task-finished事件](#f11a341732xug)、[task-failed事件](#ea4609132a8u7)时，关闭WebSocket连接。通常通过调用工具库中的`close`函数来实现。
    

点击查看完整示例

## Go

```
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
	wsURL      = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/"
	outputFile = "output.mp3"
)

func main() {
	// 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
	// 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey := "sk-xxx"
	apiKey := os.Getenv("DASHSCOPE_API_KEY")

	// 清空输出文件
	os.Remove(outputFile)
	os.Create(outputFile)

	// 连接WebSocket
	header := make(http.Header)
	header.Add("X-DashScope-DataInspection", "enable")
	header.Add("Authorization", fmt.Sprintf("bearer %s", apiKey))

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		if resp != nil {
			fmt.Printf("连接失败 HTTP状态码: %d\n", resp.StatusCode)
		}
		fmt.Println("连接失败:", err)
		return
	}
	defer conn.Close()

	// 生成任务ID
	taskID := uuid.New().String()
	fmt.Printf("生成任务ID: %s\n", taskID)

	// 发送run-task指令
	runTaskCmd := map[string]interface{}{
		"header": map[string]interface{}{
			"action":    "run-task",
			"task_id":   taskID,
			"streaming": "duplex",
		},
		"payload": map[string]interface{}{
			"task_group": "audio",
			"task":       "tts",
			"function":   "SpeechSynthesizer",
			"model":      "cosyvoice-v3-flash",
			"parameters": map[string]interface{}{
				"text_type":   "PlainText",
				"voice":       "longanyang",
				"format":      "mp3",
				"sample_rate": 22050,
				"volume":      50,
				"rate":        1,
				"pitch":       1,
				// 如果enable_ssml设为true，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
				"enable_ssml": false,
			},
			"input": map[string]interface{}{},
		},
	}

	runTaskJSON, _ := json.Marshal(runTaskCmd)
	fmt.Printf("发送run-task指令: %s\n", string(runTaskJSON))

	err = conn.WriteMessage(websocket.TextMessage, runTaskJSON)
	if err != nil {
		fmt.Println("发送run-task失败:", err)
		return
	}

	textSent := false

	// 处理消息
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("读取消息失败:", err)
			break
		}

		// 处理二进制消息
		if messageType == websocket.BinaryMessage {
			fmt.Printf("收到二进制消息，长度: %d\n", len(message))
			file, _ := os.OpenFile(outputFile, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
			file.Write(message)
			file.Close()
			continue
		}

		// 处理文本消息
		messageStr := string(message)
		fmt.Printf("收到文本消息: %s\n", strings.ReplaceAll(messageStr, "\n", ""))

		// 简单解析JSON获取event类型
		var msgMap map[string]interface{}
		if json.Unmarshal(message, &msgMap) == nil {
			if header, ok := msgMap["header"].(map[string]interface{}); ok {
				if event, ok := header["event"].(string); ok {
					fmt.Printf("事件类型: %s\n", event)

					switch event {
					case "task-started":
						fmt.Println("=== 收到task-started事件 ===")

						if !textSent {
							// 发送continue-task指令

							texts := []string{"床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"}

							for _, text := range texts {
								continueTaskCmd := map[string]interface{}{
									"header": map[string]interface{}{
										"action":    "continue-task",
										"task_id":   taskID,
										"streaming": "duplex",
									},
									"payload": map[string]interface{}{
										"input": map[string]interface{}{
											"text": text,
										},
									},
								}

								continueTaskJSON, _ := json.Marshal(continueTaskCmd)
								fmt.Printf("发送continue-task指令: %s\n", string(continueTaskJSON))

								err = conn.WriteMessage(websocket.TextMessage, continueTaskJSON)
								if err != nil {
									fmt.Println("发送continue-task失败:", err)
									return
								}
							}

							textSent = true

							// 延迟发送finish-task
							time.Sleep(500 * time.Millisecond)

							// 发送finish-task指令
							finishTaskCmd := map[string]interface{}{
								"header": map[string]interface{}{
									"action":    "finish-task",
									"task_id":   taskID,
									"streaming": "duplex",
								},
								"payload": map[string]interface{}{
									"input": map[string]interface{}{},
								},
							}

							finishTaskJSON, _ := json.Marshal(finishTaskCmd)
							fmt.Printf("发送finish-task指令: %s\n", string(finishTaskJSON))

							err = conn.WriteMessage(websocket.TextMessage, finishTaskJSON)
							if err != nil {
								fmt.Println("发送finish-task失败:", err)
								return
							}
						}

					case "task-finished":
						fmt.Println("=== 任务完成 ===")
						return

					case "task-failed":
						fmt.Println("=== 任务失败 ===")
						if header["error_message"] != nil {
							fmt.Printf("错误信息: %s\n", header["error_message"])
						}
						return

					case "result-generated":
						fmt.Println("收到result-generated事件")
					}
				}
			}
		}
	}
}
```

## C#

```
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

class Program {
    // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    // 若没有配置环境变量，请用百炼API Key将下行替换为：private static readonly string ApiKey = "sk-xxx"
    private static readonly string ApiKey = Environment.GetEnvironmentVariable("DASHSCOPE_API_KEY") ?? throw new InvalidOperationException("DASHSCOPE_API_KEY environment variable is not set.");

    // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
    private const string WebSocketUrl = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/";
    // 输出文件路径
    private const string OutputFilePath = "output.mp3";

    // WebSocket客户端
    private static ClientWebSocket _webSocket = new ClientWebSocket();
    // 取消令牌源
    private static CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();
    // 任务ID
    private static string? _taskId;
    // 任务是否已启动
    private static TaskCompletionSource<bool> _taskStartedTcs = new TaskCompletionSource<bool>();

    static async Task Main(string[] args) {
        try {
            // 清空输出文件
            ClearOutputFile(OutputFilePath);

            // 连接WebSocket服务
            await ConnectToWebSocketAsync(WebSocketUrl);

            // 启动接收消息的任务
            Task receiveTask = ReceiveMessagesAsync();

            // 发送run-task指令
            _taskId = GenerateTaskId();
            await SendRunTaskCommandAsync(_taskId);

            // 等待task-started事件
            await _taskStartedTcs.Task;

            // 持续发送continue-task指令
            string[] texts = {
                "床前明月光",
                "疑是地上霜",
                "举头望明月",
                "低头思故乡"
            };
            foreach (string text in texts) {
                await SendContinueTaskCommandAsync(text);
            }

            // 发送finish-task指令
            await SendFinishTaskCommandAsync(_taskId);

            // 等待接收任务完成
            await receiveTask;

            Console.WriteLine("任务完成，连接已关闭。");
        } catch (OperationCanceledException) {
            Console.WriteLine("任务被取消。");
        } catch (Exception ex) {
            Console.WriteLine($"发生错误：{ex.Message}");
        } finally {
            _cancellationTokenSource.Cancel();
            _webSocket.Dispose();
        }
    }

    private static void ClearOutputFile(string filePath) {
        if (File.Exists(filePath)) {
            File.WriteAllText(filePath, string.Empty);
            Console.WriteLine("输出文件已清空。");
        } else {
            Console.WriteLine("输出文件不存在，无需清空。");
        }
    }

    private static async Task ConnectToWebSocketAsync(string url) {
        var uri = new Uri(url);
        if (_webSocket.State == WebSocketState.Connecting || _webSocket.State == WebSocketState.Open) {
            return;
        }

        // 设置WebSocket连接的头部信息
        _webSocket.Options.SetRequestHeader("Authorization", $"bearer {ApiKey}");
        _webSocket.Options.SetRequestHeader("X-DashScope-DataInspection", "enable");

        try {
            await _webSocket.ConnectAsync(uri, _cancellationTokenSource.Token);
            Console.WriteLine("已成功连接到WebSocket服务。");
        } catch (OperationCanceledException) {
            Console.WriteLine("WebSocket连接被取消。");
        } catch (Exception ex) {
            Console.WriteLine($"WebSocket连接失败: {ex.Message}");
            throw;
        }
    }

    private static async Task SendRunTaskCommandAsync(string taskId) {
        var command = CreateCommand("run-task", taskId, "duplex", new {
            task_group = "audio",
            task = "tts",
            function = "SpeechSynthesizer",
            model = "cosyvoice-v3-flash",
            parameters = new
            {
                text_type = "PlainText",
                voice = "longanyang",
                format = "mp3",
                sample_rate = 22050,
                volume = 50,
                rate = 1,
                pitch = 1,
                // 如果enable_ssml设为true，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
                enable_ssml = false
            },
            input = new { }
        });

        await SendJsonMessageAsync(command);
        Console.WriteLine("已发送run-task指令。");
    }

    private static async Task SendContinueTaskCommandAsync(string text) {
        if (_taskId == null) {
            throw new InvalidOperationException("任务ID未初始化。");
        }

        var command = CreateCommand("continue-task", _taskId, "duplex", new {
            input = new {
                text
            }
        });

        await SendJsonMessageAsync(command);
        Console.WriteLine("已发送continue-task指令。");
    }

    private static async Task SendFinishTaskCommandAsync(string taskId) {
        var command = CreateCommand("finish-task", taskId, "duplex", new {
            input = new { }
        });

        await SendJsonMessageAsync(command);
        Console.WriteLine("已发送finish-task指令。");
    }

    private static async Task SendJsonMessageAsync(string message) {
        var buffer = Encoding.UTF8.GetBytes(message);
        try {
            await _webSocket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, _cancellationTokenSource.Token);
        } catch (OperationCanceledException) {
            Console.WriteLine("消息发送被取消。");
        }
    }

    private static async Task ReceiveMessagesAsync() {
        while (_webSocket.State == WebSocketState.Open) {
            var response = await ReceiveMessageAsync();
            if (response != null) {
                var eventStr = response.RootElement.GetProperty("header").GetProperty("event").GetString();
                switch (eventStr) {
                    case "task-started":
                        Console.WriteLine("任务已启动。");
                        _taskStartedTcs.TrySetResult(true);
                        break;
                    case "task-finished":
                        Console.WriteLine("任务已完成。");
                        _cancellationTokenSource.Cancel();
                        break;
                    case "task-failed":
                        Console.WriteLine("任务失败：" + response.RootElement.GetProperty("header").GetProperty("error_message").GetString());
                        _cancellationTokenSource.Cancel();
                        break;
                    default:
                        // result-generated可在此处理
                        break;
                }
            }
        }
    }

    private static async Task<JsonDocument?> ReceiveMessageAsync() {
        var buffer = new byte[1024 * 4];
        var segment = new ArraySegment<byte>(buffer);

        try {
            WebSocketReceiveResult result = await _webSocket.ReceiveAsync(segment, _cancellationTokenSource.Token);

            if (result.MessageType == WebSocketMessageType.Close) {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", _cancellationTokenSource.Token);
                return null;
            }

            if (result.MessageType == WebSocketMessageType.Binary) {
                // 处理二进制数据
                Console.WriteLine("接收到二进制数据...");

                // 将二进制数据保存到文件
                using (var fileStream = new FileStream(OutputFilePath, FileMode.Append)) {
                    fileStream.Write(buffer, 0, result.Count);
                }

                return null;
            }

            string message = Encoding.UTF8.GetString(buffer, 0, result.Count);
            return JsonDocument.Parse(message);
        } catch (OperationCanceledException) {
            Console.WriteLine("消息接收被取消。");
            return null;
        }
    }

    private static string GenerateTaskId() {
        return Guid.NewGuid().ToString("N").Substring(0, 32);
    }

    private static string CreateCommand(string action, string taskId, string streaming, object payload) {
        var command = new {
            header = new {
                action,
                task_id = taskId,
                streaming
            },
            payload
        };

        return JsonSerializer.Serialize(command);
    }
}
```

## PHP

示例代码目录结构为：

my-php-project/

├── composer.json

├── vendor/

└── index.php

composer.json内容如下，相关依赖的版本号请根据实际情况自行决定：

```
{
    "require": {
        "react/event-loop": "^1.3",
        "react/socket": "^1.11",
        "react/stream": "^1.2",
        "react/http": "^1.1",
        "ratchet/pawl": "^0.4"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

index.php内容如下：

```
<?php

require __DIR__ . '/vendor/autoload.php';

use Ratchet\Client\Connector;
use React\EventLoop\Loop;
use React\Socket\Connector as SocketConnector;

// 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
// 若没有配置环境变量，请用百炼API Key将下行替换为：$api_key = "sk-xxx"
$api_key = getenv("DASHSCOPE_API_KEY");
// 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
$websocket_url = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'; // WebSocket服务器地址
$output_file = 'output.mp3'; // 输出文件路径

$loop = Loop::get();

if (file_exists($output_file)) {
    // 清空文件内容
    file_put_contents($output_file, '');
}

// 创建自定义的连接器
$socketConnector = new SocketConnector($loop, [
    'tcp' => [
        'bindto' => '0.0.0.0:0',
    ],
    'tls' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
    ],
]);

$connector = new Connector($loop, $socketConnector);

$headers = [
    'Authorization' => 'bearer ' . $api_key,
    'X-DashScope-DataInspection' => 'enable'
];

$connector($websocket_url, [], $headers)->then(function ($conn) use ($loop, $output_file) {
    echo "连接到WebSocket服务器\n";

    // 生成任务ID
    $taskId = generateTaskId();

    // 发送 run-task 指令
    sendRunTaskMessage($conn, $taskId);

    // 定义发送 continue-task 指令的函数
    $sendContinueTask = function() use ($conn, $loop, $taskId) {
        // 待发送的文本
        $texts = ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"];
        $continueTaskCount = 0;
        foreach ($texts as $text) {
            $continueTaskMessage = json_encode([
                "header" => [
                    "action" => "continue-task",
                    "task_id" => $taskId,
                    "streaming" => "duplex"
                ],
                "payload" => [
                    "input" => [
                        "text" => $text
                    ]
                ]
            ]);
            echo "准备发送continue-task指令: " . $continueTaskMessage . "\n";
            $conn->send($continueTaskMessage);
            $continueTaskCount++;
        }
        echo "发送的continue-task指令个数为：" . $continueTaskCount . "\n";

        // 发送 finish-task 指令
        sendFinishTaskMessage($conn, $taskId);
    };

    // 标记是否收到 task-started 事件
    $taskStarted = false;

    // 监听消息
    $conn->on('message', function($msg) use ($conn, $sendContinueTask, $loop, &$taskStarted, $taskId, $output_file) {
        if ($msg->isBinary()) {
            // 写入二进制数据到本地文件
            file_put_contents($output_file, $msg->getPayload(), FILE_APPEND);
        } else {
            // 处理非二进制消息
            $response = json_decode($msg, true);

            if (isset($response['header']['event'])) {
                handleEvent($conn, $response, $sendContinueTask, $loop, $taskId, $taskStarted);
            } else {
                echo "未知的消息格式\n";
            }
        }
    });

    // 监听连接关闭
    $conn->on('close', function($code = null, $reason = null) {
        echo "连接已关闭\n";
        if ($code !== null) {
            echo "关闭代码: " . $code . "\n";
        }
        if ($reason !== null) {
            echo "关闭原因：" . $reason . "\n";
        }
    });
}, function ($e) {
    echo "无法连接：{$e->getMessage()}\n";
});

$loop->run();

/**
 * 生成任务ID
 * @return string
 */
function generateTaskId(): string {
    return bin2hex(random_bytes(16));
}

/**
 * 发送 run-task 指令
 * @param $conn
 * @param $taskId
 */
function sendRunTaskMessage($conn, $taskId) {
    $runTaskMessage = json_encode([
        "header" => [
            "action" => "run-task",
            "task_id" => $taskId,
            "streaming" => "duplex"
        ],
        "payload" => [
            "task_group" => "audio",
            "task" => "tts",
            "function" => "SpeechSynthesizer",
            "model" => "cosyvoice-v3-flash",
            "parameters" => [
                "text_type" => "PlainText",
                "voice" => "longanyang",
                "format" => "mp3",
                "sample_rate" => 22050,
                "volume" => 50,
                "rate" => 1,
                "pitch" => 1,
                // 如果enable_ssml设为true，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
                "enable_ssml" => false
            ],
            "input" => (object) []
        ]
    ]);
    echo "准备发送run-task指令: " . $runTaskMessage . "\n";
    $conn->send($runTaskMessage);
    echo "run-task指令已发送\n";
}

/**
 * 读取音频文件
 * @param string $filePath
 * @return bool|string
 */
function readAudioFile(string $filePath) {
    $voiceData = file_get_contents($filePath);
    if ($voiceData === false) {
        echo "无法读取音频文件\n";
    }
    return $voiceData;
}

/**
 * 分割音频数据
 * @param string $data
 * @param int $chunkSize
 * @return array
 */
function splitAudioData(string $data, int $chunkSize): array {
    return str_split($data, $chunkSize);
}

/**
 * 发送 finish-task 指令
 * @param $conn
 * @param $taskId
 */
function sendFinishTaskMessage($conn, $taskId) {
    $finishTaskMessage = json_encode([
        "header" => [
            "action" => "finish-task",
            "task_id" => $taskId,
            "streaming" => "duplex"
        ],
        "payload" => [
            "input" => (object) []
        ]
    ]);
    echo "准备发送finish-task指令: " . $finishTaskMessage . "\n";
    $conn->send($finishTaskMessage);
    echo "finish-task指令已发送\n";
}

/**
 * 处理事件
 * @param $conn
 * @param $response
 * @param $sendContinueTask
 * @param $loop
 * @param $taskId
 * @param $taskStarted
 */
function handleEvent($conn, $response, $sendContinueTask, $loop, $taskId, &$taskStarted) {
    switch ($response['header']['event']) {
        case 'task-started':
            echo "任务开始，发送continue-task指令...\n";
            $taskStarted = true;
            // 发送 continue-task 指令
            $sendContinueTask();
            break;
        case 'result-generated':
            // 收到result-generated事件
            break;
        case 'task-finished':
            echo "任务完成\n";
            $conn->close();
            break;
        case 'task-failed':
            echo "任务失败\n";
            echo "错误代码：" . $response['header']['error_code'] . "\n";
            echo "错误信息：" . $response['header']['error_message'] . "\n";
            $conn->close();
            break;
        case 'error':
            echo "错误：" . $response['payload']['message'] . "\n";
            break;
        default:
            echo "未知事件：" . $response['header']['event'] . "\n";
            break;
    }

    // 如果任务已完成，关闭连接
    if ($response['header']['event'] == 'task-finished') {
        // 等待1秒以确保所有数据都已传输完毕
        $loop->addTimer(1, function() use ($conn) {
            $conn->close();
            echo "客户端关闭连接\n";
        });
    }

    // 如果没有收到 task-started 事件，关闭连接
    if (!$taskStarted && in_array($response['header']['event'], ['task-failed', 'error'])) {
        $conn->close();
    }
}
```

## Node.js

需安装相关依赖：

```
npm install ws
npm install uuid
```

示例代码如下：

```
const WebSocket = require('ws');
const fs = require('fs');
const uuid = require('uuid').v4;

// 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
// 若没有配置环境变量，请用百炼API Key将下行替换为：const apiKey = "sk-xxx"
const apiKey = process.env.DASHSCOPE_API_KEY;
// 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
const url = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
// 输出文件路径
const outputFilePath = 'output.mp3';

// 清空输出文件
fs.writeFileSync(outputFilePath, '');

// 创建WebSocket客户端
const ws = new WebSocket(url, {
  headers: {
    Authorization: `bearer ${apiKey}`,
    'X-DashScope-DataInspection': 'enable'
  }
});

let taskStarted = false;
let taskId = uuid();

ws.on('open', () => {
  console.log('已连接到WebSocket服务器');

  // 发送run-task指令
  const runTaskMessage = JSON.stringify({
    header: {
      action: 'run-task',
      task_id: taskId,
      streaming: 'duplex'
    },
    payload: {
      task_group: 'audio',
      task: 'tts',
      function: 'SpeechSynthesizer',
      model: 'cosyvoice-v3-flash',
      parameters: {
        text_type: 'PlainText',
        voice: 'longanyang', // 音色
        format: 'mp3', // 音频格式
        sample_rate: 22050, // 采样率
        volume: 50, // 音量
        rate: 1, // 语速
        pitch: 1, // 音调
        enable_ssml: false // 是否开启SSML功能。如果enable_ssml设为true，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
      },
      input: {}
    }
  });
  ws.send(runTaskMessage);
  console.log('已发送run-task消息');
});

const fileStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
ws.on('message', (data, isBinary) => {
  if (isBinary) {
    // 写入二进制数据到文件
    fileStream.write(data);
  } else {
    const message = JSON.parse(data);

    switch (message.header.event) {
      case 'task-started':
        taskStarted = true;
        console.log('任务已开始');
        // 发送continue-task指令
        sendContinueTasks(ws);
        break;
      case 'task-finished':
        console.log('任务已完成');
        ws.close();
        fileStream.end(() => {
          console.log('文件流已关闭');
        });
        break;
      case 'task-failed':
        console.error('任务失败：', message.header.error_message);
        ws.close();
        fileStream.end(() => {
          console.log('文件流已关闭');
        });
        break;
      default:
        // 可以在这里处理result-generated
        break;
    }
  }
});

function sendContinueTasks(ws) {
  const texts = [
    '床前明月光，',
    '疑是地上霜。',
    '举头望明月，',
    '低头思故乡。'
  ];

  texts.forEach((text, index) => {
    setTimeout(() => {
      if (taskStarted) {
        const continueTaskMessage = JSON.stringify({
          header: {
            action: 'continue-task',
            task_id: taskId,
            streaming: 'duplex'
          },
          payload: {
            input: {
              text: text
            }
          }
        });
        ws.send(continueTaskMessage);
        console.log(`已发送continue-task，文本：${text}`);
      }
    }, index * 1000); // 每隔1秒发送一次
  });

  // 发送finish-task指令
  setTimeout(() => {
    if (taskStarted) {
      const finishTaskMessage = JSON.stringify({
        header: {
          action: 'finish-task',
          task_id: taskId,
          streaming: 'duplex'
        },
        payload: {
          input: {}
        }
      });
      ws.send(finishTaskMessage);
      console.log('已发送finish-task');
    }
  }, texts.length * 1000 + 1000); // 在所有continue-task指令发送完毕后1秒发送
}

ws.on('close', () => {
  console.log('已断开与WebSocket服务器的连接');
});
```

## Java

如您使用Java编程语言，建议采用Java DashScope SDK进行开发，详情请参见[Java SDK](https://help.aliyun.com/zh/model-studio/cosyvoice-java-sdk)。

以下是Java WebSocket的调用示例。在运行示例前，请确保已导入以下依赖：

-   `Java-WebSocket`
    
-   `jackson-databind`
    

推荐您使用Maven或Gradle管理依赖包，其配置如下：

## pom.xml

```
<dependencies>
    <!-- WebSocket Client -->
    <dependency>
        <groupId>org.java-websocket</groupId>
        <artifactId>Java-WebSocket</artifactId>
        <version>1.5.3</version>
    </dependency>

    <!-- JSON Processing -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.13.0</version>
    </dependency>
</dependencies>
```

## build.gradle

```
// 省略其它代码
dependencies {
  // WebSocket Client
  implementation 'org.java-websocket:Java-WebSocket:1.5.3'
  // JSON Processing
  implementation 'com.fasterxml.jackson.core:jackson-databind:2.13.0'
}
// 省略其它代码
```

Java代码如下：

```
import com.fasterxml.jackson.databind.ObjectMapper;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.util.*;

public class TTSWebSocketClient extends WebSocketClient {
    private final String taskId = UUID.randomUUID().toString();
    private final String outputFile = "output_" + System.currentTimeMillis() + ".mp3";
    private boolean taskFinished = false;

    public TTSWebSocketClient(URI serverUri, Map<String, String> headers) {
        super(serverUri, headers);
    }

    @Override
    public void onOpen(ServerHandshake serverHandshake) {
        System.out.println("连接成功");

        // 发送run-task指令
        // 如果enable_ssml设为true，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
        String runTaskCommand = "{ \"header\": { \"action\": \"run-task\", \"task_id\": \"" + taskId + "\", \"streaming\": \"duplex\" }, \"payload\": { \"task_group\": \"audio\", \"task\": \"tts\", \"function\": \"SpeechSynthesizer\", \"model\": \"cosyvoice-v3-flash\", \"parameters\": { \"text_type\": \"PlainText\", \"voice\": \"longanyang\", \"format\": \"mp3\", \"sample_rate\": 22050, \"volume\": 50, \"rate\": 1, \"pitch\": 1, \"enable_ssml\": false }, \"input\": {} }}";
        send(runTaskCommand);
    }

    @Override
    public void onMessage(String message) {
        System.out.println("收到服务端返回的消息：" + message);
        try {
            // Parse JSON message
            Map<String, Object> messageMap = new ObjectMapper().readValue(message, Map.class);

            if (messageMap.containsKey("header")) {
                Map<String, Object> header = (Map<String, Object>) messageMap.get("header");

                if (header.containsKey("event")) {
                    String event = (String) header.get("event");

                    if ("task-started".equals(event)) {
                        System.out.println("收到服务端返回的task-started事件");

                        List<String> texts = Arrays.asList(
                                "床前明月光，疑是地上霜",
                                "举头望明月，低头思故乡"
                        );

                        for (String text : texts) {
                            // 发送continue-task指令
                            sendContinueTask(text);
                        }

                        // 发送finish-task指令
                        sendFinishTask();
                    } else if ("task-finished".equals(event)) {
                        System.out.println("收到服务端返回的task-finished事件");
                        taskFinished = true;
                        closeConnection();
                    } else if ("task-failed".equals(event)) {
                        System.out.println("任务失败：" + message);
                        closeConnection();
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("出现异常：" + e.getMessage());
        }
    }

    @Override
    public void onMessage(ByteBuffer message) {
        System.out.println("收到的二进制音频数据大小为：" + message.remaining());

        try (FileOutputStream fos = new FileOutputStream(outputFile, true)) {
            byte[] buffer = new byte[message.remaining()];
            message.get(buffer);
            fos.write(buffer);
            System.out.println("音频数据已写入本地文件" + outputFile + "中");
        } catch (IOException e) {
            System.err.println("音频数据写入本地文件失败：" + e.getMessage());
        }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        System.out.println("连接关闭：" + reason + " (" + code + ")");
    }

    @Override
    public void onError(Exception ex) {
        System.err.println("报错：" + ex.getMessage());
        ex.printStackTrace();
    }

    private void sendContinueTask(String text) {
        String command = "{ \"header\": { \"action\": \"continue-task\", \"task_id\": \"" + taskId + "\", \"streaming\": \"duplex\" }, \"payload\": { \"input\": { \"text\": \"" + text + "\" } }}";
        send(command);
    }

    private void sendFinishTask() {
        String command = "{ \"header\": { \"action\": \"finish-task\", \"task_id\": \"" + taskId + "\", \"streaming\": \"duplex\" }, \"payload\": { \"input\": {} }}";
        send(command);
    }

    private void closeConnection() {
        if (!isClosed()) {
            close();
        }
    }

    public static void main(String[] args) {
        try {
            // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
            // 若没有配置环境变量，请用百炼API Key将下行替换为：String apiKey = "sk-xxx"
            String apiKey = System.getenv("DASHSCOPE_API_KEY");
            if (apiKey == null || apiKey.isEmpty()) {
                System.err.println("请设置 DASHSCOPE_API_KEY 环境变量");
                return;
            }

            Map<String, String> headers = new HashMap<>();
            headers.put("Authorization", "bearer " + apiKey);
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
            TTSWebSocketClient client = new TTSWebSocketClient(new URI("wss://dashscope.aliyuncs.com/api-ws/v1/inference/"), headers);

            client.connect();

            while (!client.isClosed() && !client.taskFinished) {
                Thread.sleep(1000);
            }
        } catch (Exception e) {
            System.err.println("连接WebSocket服务失败：" + e.getMessage());
            e.printStackTrace();
        }
    }
}
```

## Python

如您使用Python编程语言，建议采用Python DashScope SDK进行开发，详情请参见[Python SDK](https://help.aliyun.com/zh/model-studio/cosyvoice-python-sdk)。

以下是Python WebSocket的调用示例。在运行示例前，请确保通过如下方式导入依赖：

```
pip uninstall websocket-client
pip uninstall websocket
pip install websocket-client
```

**重要**

请不要将运行示例代码的Python文件命名为“websocket.py”，否则会报错（AttributeError: module 'websocket' has no attribute 'WebSocketApp'. Did you mean: 'WebSocket'?）。

```
import websocket
import json
import uuid
import os
import time


class TTSClient:
    def __init__(self, api_key, uri):
        """
    初始化 TTSClient 实例

    参数:
        api_key (str): 鉴权用的 API Key
        uri (str): WebSocket 服务地址
    """
        self.api_key = api_key  # 替换为你的 API Key
        self.uri = uri  # 替换为你的 WebSocket 地址
        self.task_id = str(uuid.uuid4())  # 生成唯一任务 ID
        self.output_file = f"output_{int(time.time())}.mp3"  # 输出音频文件路径
        self.ws = None  # WebSocketApp 实例
        self.task_started = False  # 是否收到 task-started
        self.task_finished = False  # 是否收到 task-finished / task-failed

    def on_open(self, ws):
        """
    WebSocket 连接建立时回调函数
    发送 run-task 指令开启语音合成任务
    """
        print("WebSocket 已连接")

        # 构造 run-task 指令
        run_task_cmd = {
            "header": {
                "action": "run-task",
                "task_id": self.task_id,
                "streaming": "duplex"
            },
            "payload": {
                "task_group": "audio",
                "task": "tts",
                "function": "SpeechSynthesizer",
                "model": "cosyvoice-v3-flash",
                "parameters": {
                    "text_type": "PlainText",
                    "voice": "longanyang",
                    "format": "mp3",
                    "sample_rate": 22050,
                    "volume": 50,
                    "rate": 1,
                    "pitch": 1,
                    # 如果enable_ssml设为True，只允许发送一次continue-task指令，否则会报错“Text request limit violated, expected 1.”
                    "enable_ssml": False
                },
                "input": {}
            }
        }

        # 发送 run-task 指令
        ws.send(json.dumps(run_task_cmd))
        print("已发送 run-task 指令")

    def on_message(self, ws, message):
        """
    接收到消息时的回调函数
    区分文本和二进制消息处理
    """
        if isinstance(message, str):
            # 处理 JSON 文本消息
            try:
                msg_json = json.loads(message)
                print(f"收到 JSON 消息: {msg_json}")

                if "header" in msg_json:
                    header = msg_json["header"]

                    if "event" in header:
                        event = header["event"]

                        if event == "task-started":
                            print("任务已启动")
                            self.task_started = True

                            # 发送 continue-task 指令
                            texts = [
                                "床前明月光，疑是地上霜",
                                "举头望明月，低头思故乡"
                            ]

                            for text in texts:
                                self.send_continue_task(text)

                            # 所有 continue-task 发送完成后发送 finish-task
                            self.send_finish_task()

                        elif event == "task-finished":
                            print("任务已完成")
                            self.task_finished = True
                            self.close(ws)

                        elif event == "task-failed":
                            error_msg = msg_json.get("error_message", "未知错误")
                            print(f"任务失败: {error_msg}")
                            self.task_finished = True
                            self.close(ws)

            except json.JSONDecodeError as e:
                print(f"JSON 解析失败: {e}")
        else:
            # 处理二进制消息（音频数据）
            print(f"收到二进制消息，大小: {len(message)} 字节")
            with open(self.output_file, "ab") as f:
                f.write(message)
            print(f"已将音频数据写入本地文件{self.output_file}中")

    def on_error(self, ws, error):
        """发生错误时的回调"""
        print(f"WebSocket 出错: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭时的回调"""
        print(f"WebSocket 已关闭: {close_msg} ({close_status_code})")

    def send_continue_task(self, text):
        """发送 continue-task 指令，附带要合成的文本内容"""
        cmd = {
            "header": {
                "action": "continue-task",
                "task_id": self.task_id,
                "streaming": "duplex"
            },
            "payload": {
                "input": {
                    "text": text
                }
            }
        }

        self.ws.send(json.dumps(cmd))
        print(f"已发送 continue-task 指令，文本内容: {text}")

    def send_finish_task(self):
        """发送 finish-task 指令，结束语音合成任务"""
        cmd = {
            "header": {
                "action": "finish-task",
                "task_id": self.task_id,
                "streaming": "duplex"
            },
            "payload": {
                "input": {}
            }
        }

        self.ws.send(json.dumps(cmd))
        print("已发送 finish-task 指令")

    def close(self, ws):
        """主动关闭连接"""
        if ws and ws.sock and ws.sock.connected:
            ws.close()
            print("已主动关闭连接")

    def run(self):
        """启动 WebSocket 客户端"""
        # 设置请求头部（鉴权）
        header = {
            "Authorization": f"bearer {self.api_key}",
            "X-DashScope-DataInspection": "enable"
        }

        # 创建 WebSocketApp 实例
        self.ws = websocket.WebSocketApp(
            self.uri,
            header=header,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )

        print("正在监听 WebSocket 消息...")
        self.ws.run_forever()  # 启动长连接监听


# 示例使用方式
if __name__ == "__main__":
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：API_KEY = "sk-xxx"
    API_KEY = os.environ.get("DASHSCOPE_API_KEY")
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference/
    SERVER_URI = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/"  # 替换为你的 WebSocket 地址

    client = TTSClient(API_KEY, SERVER_URI)
    client.run()
```

## **错误码**

如遇报错问题，请参见[错误信息](https://help.aliyun.com/zh/model-studio/error-code)进行排查。

.unionContainer .markdown-body p + blockquote { margin-top: 4px; } /\* 让表格里的引用上下间距调为 0 ，避免换行时不连续 \*/ .unionContainer .markdown-body blockquote { margin: 0; } .unionContainer .markdown-body table { table-layout: auto; } .unionContainer .markdown-body table tr { border-bottom: 1px solid #E9E9E9; } .unionContainer .markdown-body table.table-no-border tr { border: none; } .unionContainer .markdown-body table tr:last-child { border: none; } .unionContainer .markdown-body h2 span.ph.tips { color: #666; font-size: 16px; }

## **常见问题**

### **功能特性/计量计费/限流**

#### **Q：当遇到发音不准的情况时，有什么解决方案可以尝试？**

通过[SSML](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language)可以对语音合成效果进行个性化定制。

#### **Q：为什么使用WebSocket协议而非HTTP/HTTPS协议？为什么不提供RESTful API？**

语音服务选择 WebSocket 而非 HTTP/HTTPS/RESTful，根本在于其依赖全双工通信能力——WebSocket 允许服务端与客户端主动双向传输数据（如实时推送语音合成/识别进度），而基于 HTTP 的 RESTful 仅支持客户端发起的单向请求-响应模式，无法满足实时交互需求。

#### **Q：**语音合成是按文本字符数计费的，要如何查看或获取每次合成的文本长度？

通过服务端返回的[result-generated事件](#e9420a4d7bock)中`payload.usage.characters`参数获取字符数，请以收到的最后一个result-generated事件为准。

### **故障排查**

**重要**

代码报错时，建议您检查发送至服务端的[指令](#271eb7a50ft6r)是否正确：可以通过打印指令内容，检查是否存在格式有误或必填参数遗漏的情况。如指令正确，请根据[错误码](#75df3e20f46ro)中的信息进行排查。

#### **Q：如何获取**Request ID**？**

通过以下两种方式可以获取：

-   解析[result-generated事件](#e9420a4d7bock)中服务端返回的信息。
    
-   解析[task-finished事件](#f11a341732xug)中服务端返回的信息。
    

#### **Q：使用SSML功能失败是什么原因？**

请按以下步骤排查：

1.  确保[限制与约束](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language#923300b3e9a3z)正确
    
2.  确保用正确的方式进行调用，详情请参见[SSML标记语言支持说明](#99f13f3817ptm)
    
3.  确保待合成文本为纯文本格式且符合格式要求，详情请参见[SSML标记语言介绍](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language)
    

#### **Q：****为什么TTS语音合成的语音和WAV文件显示的时间长度不一致？例如语音文件显示长度是7秒钟，但实际语音只有不到5秒？**

TTS是流式合成机制，也就是边合成边返回数据，因此保存下来的WAV文件头是一个预估的值，有一定的误差。如果对于时长要求较为严格，您可以设置format为pcm，在获取的完整的一句合成结果文件中自行添加WAV头信息，这样就会得到更为精确的时长。

#### **Q：为什么音频无法播放？**

请根据以下场景逐一排查：

1.  音频保存为完整文件（如xx.mp3）的情况
    
    1.  音频格式一致性：确保请求参数中设置的音频格式与文件后缀一致。例如，如果请求参数设置的音频格式为wav，但文件后缀为mp3，可能会导致播放失败。
        
    2.  播放器兼容性：确认使用的播放器是否支持该音频文件的格式和采样率。例如，某些播放器可能不支持高采样率或特定编码的音频文件。
        
2.  流式播放音频的情况
    
    1.  将音频流保存为完整文件，尝试使用播放器播放。如果文件无法播放，请参考场景 1 的排查方法。
        
    2.  如果文件可以正常播放，则问题可能出在流式播放的实现上。请确认使用的播放器是否支持流式播放。
        
        常见的支持流式播放的工具和库包括：ffmpeg、pyaudio (Python)、AudioFormat (Java)、MediaSource (Javascript)等。
        

#### **Q：为什么音频播放卡顿？**

请根据以下场景逐一排查：

1.  检查文本发送速度： 确保发送文本的间隔合理，避免前一句音频播放完毕后，下一句文本未能及时发送。
    
2.  检查回调函数性能：
    
    -   检查回调函数中是否存在过多业务逻辑，导致阻塞。
        
    -   回调函数运行在 WebSocket 线程中，若被阻塞，可能会影响 WebSocket 接收网络数据包，进而导致音频接收卡顿。
        
    -   建议将音频数据写入一个独立的音频缓冲区（audio buffer），然后在其他线程中读取并处理，避免阻塞 WebSocket 线程。
        
3.  检查网络稳定性： 确保网络连接稳定，避免因网络波动导致音频传输中断或延迟。
    

#### **Q：语音合成慢（合成时间长）是什么原因？**

请按以下步骤排查：

1.  检查输入间隔
    
    如果是流式语音合成，请确认文字发送间隔是否过长（如上段发出后延迟数秒才发送下段），过久间隔会导致合成总时长增加。
    
2.  分析性能指标
    
    -   首包延迟：正常500ms左右。
        
    -   RTF（RTF = 合成总耗时/音频时长）：正常小于1.0。
        

#### **Q：合成的语音发音错误如何处理？**

请使用SSML的[<phoneme>标签](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language#title-m9h-7yc-48k)指定正确的发音。

#### **Q：为什么没有返回语音？为什么结尾部分的文本没能成功转换成语音？（合成语音缺失）**

请确认是否忘记发送[finish-task指令](#2e967d2d349es)。在语音合成过程中，服务端会在缓存足够文本后才开始合成。如果忘记发送[finish-task指令](#2e967d2d349es)，可能会导致缓存中的结尾部分文本未能被合成为语音。

#### **Q：为什么返回的音频流顺序错乱？导致播放内容混乱**

请从以下两个方面排查：

-   确保同一个合成任务的 [run-task指令](#12d8a57443dmz)、[continue-task指令](#974b0beb59ob5)和[finish-task指令](#2e967d2d349es)使用相同的`task_id`。
    
-   检查异步操作是否导致音频文件写入顺序与接收二进制数据的顺序不一致。
    

#### **Q：WebSocket 连接错误如何处理？**

-   **WebSocket 连接关闭（code 1007）如何处理？**
    
    WebSocket 连接在发送 run-task 指令后立即关闭，且关闭码为 1007。
    
    -   **错误原因**：服务端检测到协议或数据格式错误，主动断开连接。常见原因包括：
        
        -   run-task 指令的 payload 中包含非法字段（如在 payload 中误加了 `"input": {}` 以外的其他字段）。
            
        -   JSON 格式错误（如缺少逗号、括号不匹配等）。
            
        -   必填字段缺失（如 task\_id、action 等）。
            
    -   **解决方案**：
        
        1.  检查 JSON 格式：验证请求体格式是否正确。
            
        2.  检查必填字段：确认 header.action、header.task\_id、header.streaming、payload.task\_group、payload.task、payload.function、payload.model、payload.input 均已正确设置。
            
        3.  移除无效字段：run-task 的 payload.input 中仅允许空对象 `{}` 或包含 text 字段，不要添加其他字段。
            
-   WebSocket 连接报错 WebSocketBadStatus 或 401/403 如何处理？
    
    在建立 WebSocket 连接时报错 WebSocketBadStatus、401 Unauthorized 或 403 Forbidden。
    
    -   **错误原因**: 鉴权失败。服务端在 WebSocket 握手阶段验证 Authorization 头，如果 API Key 无效或缺失，将拒绝连接。
        
    -   **解决方案**：参见[鉴权失败排查步骤](#auth-troubleshooting-title)。
        

### **权限与认证**

#### **Q：**我希望我的 API Key 仅用于 CosyVoice 语音合成服务，而不被百炼其他模型使用（权限隔离），我该如何做**？**

可以通过新建业务空间并只授权特定模型来限制API Key的使用范围。详情请参见[业务空间管理](https://help.aliyun.com/zh/model-studio/use-workspace)。

##### **Q：使用子业务空间的API Key是否可以调用CosyVoice模型？**

对于默认业务空间，模型均可调用。

对于子业务空间：需要为API Key对应的子业务空间进行[模型授权](https://help.aliyun.com/zh/model-studio/model-authentication-instructions)，详情请参见[子业务空间的模型调用](https://help.aliyun.com/zh/model-studio/model-calling-in-sub-workspace)。

### **更多问题**

请参见GitHub [QA](https://github.com/aliyun/alibabacloud-bailian-speech-demo/blob/master/docs/QA/cosyvoice.md)。