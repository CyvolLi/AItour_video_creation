const communityService = require("../../utils/communityService.js");
const app = getApp();

Page({
  data: {
    title: "",
    cardId: "",
    videoUrl: "",
    coverUrl: "",
    shareText: "",
    locationName: "",
    hasVideo: false,
    publishing: false
  },

  onLoad() {
    const taskData = app.globalData.task_data || {};
    const videoUrl = app.globalData.video_url || app.globalData.videoUrl || "";

    this.setData({
      title: "",
      cardId: taskData.card_id || "",
      videoUrl,
      coverUrl: app.globalData.coverUrl || taskData.spot_url || "",
      shareText: app.globalData.final_response || "",
      locationName: taskData.location_name || taskData.spot_name || "",
      hasVideo: !!videoUrl
    });
  },

  onUnload() {
    // 清理全局数据，避免残留影响后续任务
    app.globalData.task_data.card_id = "";
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onShareInput(e) {
    this.setData({ shareText: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ locationName: e.detail.value });
  },

  goCreateVideo() {
    wx.redirectTo({
      url: "/pages/mode_select/mode_select"
    });
  },

  backToCommunity() {
    wx.reLaunch({
      url: "/pages/community/community"
    });
  },

  goProfile() {
    wx.reLaunch({
      url: "/pages/profile/profile"
    });
  },

  publishPost() {
    if (this.data.publishing) {
      return;
    }

    const taskData = app.globalData.task_data || {};
    const openid = taskData.openid || "";

    if (!openid || !this.data.videoUrl || !this.data.title) {
      wx.showToast({
        title: "缺少发布信息",
        icon: "none"
      });
      return;
    }

    this.setData({ publishing: true });

    communityService
      .apiCommunityPostPublish({
        openid,
        card_id: this.data.cardId || "none",
        landscape: app.globalData.task_data.landscape || "sharepool",
        title: this.data.title || "旅行作品",
        cover_url: this.data.coverUrl || "",
        video_url: this.data.videoUrl,
        share_text: this.data.shareText || "",
        location_name: (this.data.locationName || "").trim()
      })
      .then(() => {
        app.globalData.video_url = "";
        app.globalData.final_response = "";
        
        wx.showToast({
          title: "发布成功",
          icon: "success"
        });
        wx.reLaunch({
          url: "/pages/community/community"
        });
      })
      .catch((err) => {
        console.error("发布帖子失败", err);
        wx.showToast({
          title: "发布失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ publishing: false });
      });
  }
});
