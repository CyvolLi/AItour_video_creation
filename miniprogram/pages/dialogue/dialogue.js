import WxRequest from "mina-request";

const app = getApp();

const wxRequest = new WxRequest({
  baseURL: "https://ruralv.cn"
});

const DEFAULT_USER_AVATAR = "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";
let innerAudioContext = null;

Page({
  data: {
    initUrl: "/api/dialogue/init",
    chatUrl: "/api/dialogue/chat",
    ttsUrl: "/api/dialogue/tts",
    inputValue: "",
    loading: false,
    initialized: false,
    showBotTyping: false,
    bot_avatar: "../../images/icons/nanako.jpg",
    bot_name: "菜菜子",
    user_avatar: DEFAULT_USER_AVATAR,
    user_name: "用户",
    CONDUCTING_TTS: false,
    audioSrc: "",
    messages: [],
    botAnimClass: "bot-anim-active",
    ttsLock: false,
  },
  
  onLoad() {
    this.syncUserInfo();

    this.setData({
      initialized: false,
      showBotTyping: true
    });
    setTimeout(() => {
      this.init();
    }, 200);
  },

  async init() {
      try {
        await this.ensureTaskDataReady();
        await this.sendInitialDialogueRequest();
      } catch (err) {
        console.error("对话页初始化失败：", err);
        wx.showToast({
          title: "初始化失败，可手动继续对话",
          icon: "none"
      });

      this.setData({
        initialized: true,
        loading: false,
        showBotTyping: false
      });
    }
  },

  syncUserInfo() {
    const userInfo = app.globalData.userInfo || {};

    this.setData({
      user_avatar: userInfo.avatarUrl || DEFAULT_USER_AVATAR,
      user_name: userInfo.nickName || "用户"
    });
  },

  async ensureTaskDataReady() {
    const taskData = app.globalData.task_data || {};

    if (taskData.openid) {
      return;
    }

    await new Promise((resolve, reject) => {
      let count = 0;
      const maxCount = 20;

      const timer = setInterval(() => {
        const currentTaskData = app.globalData.task_data || {};

        if (currentTaskData.openid) {
          clearInterval(timer);
          resolve();
          return;
        }

        count += 1;
        if (count >= maxCount) {
          clearInterval(timer);
          reject(new Error("openid 未初始化完成"));
        }
      }, 200);
    });
  },

async sendRequest(url, requestText, options = {}) {
  const {
    appendUserMessage = false,
    clearInput = false,
    isInitialRequest = false
  } = options;

  if (this.data.loading) {
    return;
  }

  if (!requestText) {
    wx.showToast({
      title: "请求内容为空",
      icon: "none"
    });
    return;
  }

  const taskData = {
    ...(app.globalData.task_data || {}),
    request: requestText
  };

  const nextMessages = appendUserMessage
    ? this.data.messages.concat([{
      role: "user",
      content: requestText,
      avatar: this.data.user_avatar,
      name: this.data.user_name
    }])
    : this.data.messages.slice();
  this.setData({
    loading: true,
    showBotTyping: true,
    messages: nextMessages,
    inputValue: clearInput ? "" : this.data.inputValue
  });

  try {
    const resp = await wxRequest.post(url, {
      task_data: taskData
    });

    const responseData = resp && resp.data ? resp.data : {};

    // 合并并回写，避免把 init 返回的 task_id 覆盖丢失
    const mergedTaskData = {
      ...(app.globalData.task_data || {}),
      ...taskData
    };

    if (isInitialRequest && responseData.task_id) {
      mergedTaskData.task_id = responseData.task_id;
      app.globalData.task_data = mergedTaskData; // 关键：写回全局
      console.log("init 写入 task_id:", mergedTaskData.task_id, mergedTaskData);
    }

    let replyText = "";
    try {
      replyText =
        typeof responseData === "string"
          ? responseData
          : responseData.response || "";
    if (replyText) {
      this.setData({ showBotTyping: false }); // 先关闭“正在输入...”
      const botMessage = {
        role: "bot",
        content: replyText,
        avatar: this.data.bot_avatar,
        name: this.data.bot_name
      };
      this.setData({
        messages: this.data.messages.concat([botMessage]),
        ttsLock: false // 解锁，允许下一次 TTS 请求
      });
    }
    } catch (err) {
      console.error("请求后端失败：", err);
      wx.showToast({
        title: "请求失败",
        icon: "none"
      });
    } finally {
      if (replyText && !this.data.ttsLock) {
        this.setData({ ttsLock: true }); // 上锁
        const ttsTaskData = {
          ...app.globalData.task_data,
          request: replyText
        };
        const ttsResp = await wxRequest.post(this.data.ttsUrl, {
          task_data: ttsTaskData
        });
        this.setData({
          CONDUCTING_TTS: true,
          botAnimClass: null,
          audioSrc: ttsResp && ttsResp.data ? ttsResp.data.audio_url : ""
        });
        if (this.data.audioSrc) {
    this.playAudio(this.data.audioSrc);
  }
      }
      this.setData({
        loading: false,
        showBotTyping: false
      });
    }
  }catch (err) {
    console.error("请求失败：", err);
    wx.showToast({
      title: "请求失败",
      icon: "none"
    });
    this.setData({
      loading: false,
      showBotTyping: false
    });
  }
},

async sendInitialDialogueRequest() {
  const taskData = app.globalData.task_data || {};
  const requestText = taskData.request || "";

  try{
  await this.sendRequest(this.data.initUrl, requestText, {
    appendUserMessage: false,
    clearInput: false,
    isInitialRequest: true
  });
  this.setData({initialized: true});
}catch(err){
  console.error('初始化失败',err)
  this.setData({initialized: false});
}
},

async sendUserDialogueRequest(text) {
  await this.sendRequest(this.data.chatUrl, text, {
    appendUserMessage: true,
    clearInput: true
  });
},

onInputChange(e) {
  this.setData({
    inputValue: e.detail.value
  });
},

async sendUserMessage() {
  if (!this.data.initialized || this.data.loading) {
    return;
  }

  const text = (this.data.inputValue || "").trim();

  if (!text) {
    wx.showToast({
      title: "请输入内容",
      icon: "none"
    });
    return;
  }
  this.setData({
    CONDUCTING_TTS: false,
    audioSrc: "",
    botAnimClass: 'bot-anim-active'
  });
  await this.sendUserDialogueRequest(text);
},

finishDrawing() {
  const pages = getCurrentPages();
  if (pages.length >= 8) { // 留点余量
    // 超过限制时用 redirectTo 替换当前页
    wx.redirectTo({
      url: '/pages/script/script'
    });
  } else {
    wx.navigateTo({
      url: '/pages/script/script',
      fail(err) {
        console.error("跳转 script 失败：", err);
        wx.showToast({ title: "页面跳转失败", icon: "none" });
      }
    });
  }
},

  
playAudio(audioSrc) {
  if (!audioSrc) return;

  if (innerAudioContext) {
    innerAudioContext.destroy();
    innerAudioContext = null;
  }
  innerAudioContext = wx.createInnerAudioContext({
    useWebAudioImplement: false
  });
  innerAudioContext.src = audioSrc;
  innerAudioContext.autoplay = true;

  this.setData({
    CONDUCTING_TTS: true,
    botAnimClass: 'bot-anim-active',
    audioSrc // 保持data字段一致
  });

  innerAudioContext.onEnded(() => {
    this.setData({
      CONDUCTING_TTS: false,
      botAnimClass: null,
      audioSrc: ""
    });
    innerAudioContext.destroy();
    innerAudioContext = null;
  });

  innerAudioContext.onError((res) => {
    console.error('音频播放错误', res);
    this.setData({
      CONDUCTING_TTS: false,
      botAnimClass: null,
      audioSrc: ""
    });
    innerAudioContext.destroy();
    innerAudioContext = null;
  });

  innerAudioContext.play();
},

onHide() {
    // 页面隐藏时释放资源
  if (innerAudioContext) {
    innerAudioContext.destroy();
    innerAudioContext = null;
  }
},
});
