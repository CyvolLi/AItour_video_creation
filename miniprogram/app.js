// app.js
const profileStore = require("./utils/profileStore.js");
const avatarStore = require("./utils/avatarStore.js");

App({
  onLaunch: function () {
    // 1. 初始化全局数据
    this.globalData = {
      env: "cloudbase-d2g8dvtluc8d8face", // 请确保此 ID 与你云开发控制台一致
      userInfo: null,
      hasNavigated: false,
      video_extend: false,
      task_data: {
         openid : null,
         task_id : null,
         video_id: null,
         count: 0,
         card_id: "",
         spot_url: "",
         request: "",
         video_request: "",
         scriptContent: "",
         user_potrait: "",
         landscape: "sharepool",
         landscape_name: "公共分享池",
      },
      video_url: null,
      final_response: null,//存最后小红书配文
    };

    // 2. 初始化云开发
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env:
        wx.cloud.DYNAMIC_CURRENT_ENV || this.globalData.env,
        traceUser: true,
      });
    }

    // 3. 获取 OpenID
    this.userInfoReady = this.getOpenId();
  },

  /** 调用云函数获取 openid */
  getOpenId() {
    const that = this;
    return wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: {
        type: "getOpenId",
      },
    })
    .then((resp) => {
      if (resp.result && resp.result.openid) {
        that.globalData.task_data.openid = resp.result.openid;
        console.log("✅ OpenID 获取成功:", that.globalData.task_data.openid);
        return that.loadUserProfile(resp.result.openid);
      } else {
        console.warn("⚠️ 云函数返回异常:", resp);
        return null;
      }
    })
    .catch((err) => {
      console.error("❌ OpenID 获取失败:", err);
      return null;
    });
  },

  loadUserProfile(openid) {
    if (!openid) {
      return Promise.resolve(null);
    }

    return profileStore
      .ensureProfile(openid)
      .then((profile) => avatarStore.normalizeAvatar(
        profile.avatarUrl || "",
        profile.avatarFileID || ""
      ).then((avatar) => ({
        ...profile,
        avatarUrl: avatar.avatarUrl,
        avatarFileID: avatar.avatarFileID
      })))
      .then((profile) => {
        const userInfo = {
          nickName: profile.nickName || "",
          avatarUrl: profile.avatarUrl || "",
          avatarFileID: profile.avatarFileID || ""
        };

        this.globalData.userInfo = userInfo;
        return userInfo;
      })
      .catch((err) => {
        console.error("❌ 用户资料加载失败:", err);
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

  // 新增方法：获取用户信息并同步到全局数据
  getUserInfo(callback) {
    wx.getUserProfile({
      desc: '用于完善用户资料', // 必填描述，用于授权弹窗
      success: (res) => {
        this.globalData.userInfo = res.userInfo; // 将用户信息（包括头像）存入全局数据
        callback(res.userInfo); // 调用回调函数，传递用户信息
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
      }
    });
  },
});
