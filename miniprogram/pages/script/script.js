import WxRequest from "mina-request";

const app = getApp();

const wxRequest = new WxRequest({
  baseURL: "https://ruralv.cn"
});

Page({
  data: {
    count: 0,
    url: "/api/script",
    scriptContent: "",
    loading: false,
    request: "生成这个视频的脚本 script."
  },

  onShow() {
    this.setData({
      count: app.globalData.task_data.count
    });
    setTimeout(() => {
      this.initScriptPage();
    }, 200);
  },

  async initScriptPage() {
    try {
      await this.ensureTaskDataReady();
      await this.sendTaskData();
    } catch (err) {
      console.error("页面初始化失败：", err);
      wx.showToast({
        title: "初始化失败",
        icon: "none"
      });
    }
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

  async sendTaskData() {
    if (this.data.loading) return;

    app.globalData.task_data.request = this.data.request;

    this.setData({
      loading: true
    });

    try {
      const taskData = app.globalData.task_data;
      const url = this.data.url;

      const resp = await wxRequest.post(url, {
        task_data: taskData
      });

      const responseData = resp && resp.data ? resp.data : {};
      const scriptContent = responseData.response || "";

      app.globalData.task_data.scriptContent = scriptContent;

      this.setData({
        scriptContent
      });
    } catch (err) {
      console.error("请求脚本失败：", err);
      wx.showToast({
        title: "请求失败",
        icon: "none"
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  async changeVersion() {
    await this.sendTaskData();
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({
          url: "/pages/dialogue/dialogue"
        });
      }
    });
  },

  onScriptInput(e) {
    const value = e.detail.value;

    this.setData({
      scriptContent: value
    });

    app.globalData.task_data.scriptContent = value;
  },

  showMore() {
    wx.showActionSheet({
      itemList: ["复制脚本内容", "前往生成选项页"],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: this.data.scriptContent || "",
            success() {
              wx.showToast({
                title: "已复制",
                icon: "success"
              });
            }
          });
        } else if (res.tapIndex === 1) {
          wx.navigateTo({
            url: "../v_config/v_config"
          });
        }
      }
    });
  },

  goConfigPage() {
    const count = this.data.count;
    const userText = "请生成一段适合小红书或朋友圈发布的旅行文案。";

    if (count === 0) {
      wx.navigateTo({
        url: "../v_config/v_config"
      });
      return;
    }

    app.globalData.video_extend = true;
    app.globalData.task_data.video_request = this.data.scriptContent;
    app.globalData.task_data.request = userText;
    wx.navigateTo({
      url: "../wait/wait"
    });
  },
  onShareAppMessage() {}
});
