const app = getApp();
const avatarStore = require("../../utils/avatarStore.js");

const DEFAULT_AVATAR = "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";

Page({
  data: {
    avatarUrl: DEFAULT_AVATAR,
    avatarFileID: "",
    nickName: "",
    entering: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {};

    this.setData({
      avatarUrl: userInfo.avatarUrl || DEFAULT_AVATAR,
      avatarFileID: userInfo.avatarFileID || "",
      nickName: userInfo.nickName || ""
    });

    if (app.ensureUserInfo) {
      app.ensureUserInfo().then((savedUserInfo) => {
        if (!savedUserInfo) {
          return;
        }

        this.setData({
          avatarUrl:
            this.data.avatarUrl === DEFAULT_AVATAR
              ? savedUserInfo.avatarUrl || DEFAULT_AVATAR
              : this.data.avatarUrl,
          avatarFileID: savedUserInfo.avatarFileID || this.data.avatarFileID || "",
          nickName: this.data.nickName || savedUserInfo.nickName || ""
        });
      });
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;

    if (!avatarUrl) {
      return;
    }

    this.setData({
      avatarUrl,
      avatarFileID: ""
    });
  },

  onNicknameInput(e) {
    this.setData({
      nickName: e.detail.value
    });
  },

  getReadyOpenid() {
    const currentTaskData = app.globalData.task_data || {};

    if (currentTaskData.openid) {
      return Promise.resolve(currentTaskData.openid);
    }

    if (app.userInfoReady && typeof app.userInfoReady.then === "function") {
      return app.userInfoReady.then(() => {
        const nextTaskData = app.globalData.task_data || {};
        return nextTaskData.openid || "";
      });
    }

    return Promise.resolve("");
  },

  enterCommunity() {
    if (this.data.entering) {
      return Promise.resolve();
    }

    const userInfo = {
      nickName: this.data.nickName || "用户",
      avatarUrl: this.data.avatarUrl === DEFAULT_AVATAR ? "" : this.data.avatarUrl,
      avatarFileID: this.data.avatarFileID
    };

    this.setData({ entering: true });

    return this.getReadyOpenid()
      .then((openid) => {
        if (!openid) {
          wx.showToast({
            title: "用户初始化失败，请稍后重试",
            icon: "none"
          });
          return null;
        }

        return avatarStore.saveUserInfo(openid, userInfo);
      })
      .then((savedUserInfo) => {
        if (!savedUserInfo) {
          return;
        }

        app.globalData.userInfo = savedUserInfo;

        wx.redirectTo({
          url: "../community/community"
        });
      })
      .catch((err) => {
        console.error("用户头像保存失败", err);
        wx.showToast({
          title: "头像保存失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ entering: false });
      });
  }
});
