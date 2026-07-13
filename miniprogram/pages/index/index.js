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

  enterCommunity() {
    if (this.data.entering) {
      return;
    }

    const openid = app.globalData.task_data && app.globalData.task_data.openid;
    const userInfo = {
      nickName: this.data.nickName || "用户",
      avatarUrl: this.data.avatarUrl === DEFAULT_AVATAR ? "" : this.data.avatarUrl,
      avatarFileID: this.data.avatarFileID
    };

    if (!openid) {
      wx.showToast({
        title: "用户未初始化",
        icon: "none"
      });
      return;
    }

    this.setData({ entering: true });

    avatarStore
      .saveUserInfo(openid, userInfo)
      .then((savedUserInfo) => {
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
