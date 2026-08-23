const profileStore = require("./utils/profileStore.js");
const avatarStore = require("./utils/avatarStore.js");
const profileCache = require("./utils/profileCache.js");
const runtimeConfig = require("./utils/runtimeConfig.js");

function createTaskData(openid) {
  return {
    openid: openid || null,
    task_id: "",
    video_id: "",
    count: 0,
    card_id: "",
    spot_url: "",
    request: "",
    video_request: "",
    scriptContent: "",
    user_potrait: "",
    landscape: "sharepool",
    landscape_name: "公共分享池",
    videoConfig: {
      styleId: "",
      optimizationId: "",
      optimizationIds: []
    }
  };
}

App({
  onLaunch() {
    this.globalData = {
      env: runtimeConfig.CLOUD_ENV_ID,
      userInfo: null,
      hasNavigated: false,
      video_extend: false,
      openidReady: false,
      openidError: null,
      task_data: createTaskData(null),
      video_url: null,
      final_response: null
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init(runtimeConfig.getCloudInitOptions());
    }

    this.userInfoReady = this.getOpenId();
  },

  resetTaskData() {
    const currentTaskData = (this.globalData && this.globalData.task_data) || {};
    const openid = currentTaskData.openid || null;

    this.globalData.task_data = createTaskData(openid);
    this.globalData.video_url = null;
    this.globalData.final_response = null;
    this.globalData.video_extend = false;

    return this.globalData.task_data;
  },

  getOpenId() {
    return wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getOpenId"
        }
      })
      .then((resp) => {
        if (resp.result && resp.result.openid) {
          this.globalData.task_data.openid = resp.result.openid;
          this.globalData.openidReady = true;
          this.globalData.openidError = null;
          console.log("OpenID 获取成功:", this.globalData.task_data.openid);
          const cachedUserInfo = profileCache.load(resp.result.openid);
          if (cachedUserInfo) {
            this.globalData.userInfo = cachedUserInfo;
          }
          return this.loadUserProfile(resp.result.openid);
        }

        this.globalData.openidReady = false;
        this.globalData.openidError = resp;
        console.warn("云函数返回异常", resp);
        return null;
      })
      .catch((err) => {
        this.globalData.openidReady = false;
        this.globalData.openidError = err;
        console.error("OpenID 获取失败:", err);
        return null;
      });
  },

  loadUserProfile(openid) {
    if (!openid) {
      return Promise.resolve(null);
    }

    return profileStore
      .ensureProfile(openid)
      .then((profile) =>
        avatarStore
          .normalizeAvatar(profile.avatarUrl || "", profile.avatarFileID || "")
          .then((avatar) => ({
            ...profile,
            avatarUrl: avatar.avatarUrl,
            avatarFileID: avatar.avatarFileID
          }))
      )
      .then((profile) => {
        const userInfo = {
          nickName: profile.nickName || "",
          avatarUrl: profile.avatarUrl || "",
          avatarFileID: profile.avatarFileID || ""
        };

        this.globalData.userInfo = userInfo;
        profileCache.save(userInfo, openid);
        return userInfo;
      })
      .catch((err) => {
        console.error("用户资料加载失败:", err);
        return null;
      });
  },

  ensureUserInfo() {
    if (this.globalData.userInfo) {
      return Promise.resolve(this.globalData.userInfo);
    }

    const openid = this.globalData.task_data && this.globalData.task_data.openid;

    if (openid) {
      return this.loadUserProfile(openid);
    }

    return this.userInfoReady || Promise.resolve(null);
  },

  getUserInfo(callback) {
    wx.getUserProfile({
      desc: "用于完善用户资料",
      success: (res) => {
        this.globalData.userInfo = res.userInfo;
        callback(res.userInfo);
      },
      fail: (err) => {
        console.error("获取用户信息失败", err);
      }
    });
  }
});
