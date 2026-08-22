const communityService = require("../../utils/communityService.js");
const profileStore = require("../../utils/profileStore.js");
const { createTargetId } = require("../../utils/targetId.js");
const app = getApp();

Page({
  data: {
    imageUrl: "",
    title: "",
    emotionText: "",
    locationName: "",
    targetId: "",
    publishing: false
  },

  onLoad() {
    this.setData({
      targetId: createTargetId()
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        const path = file && file.tempFilePath;

        if (!path) {
          return;
        }

        wx.showLoading({ title: "上传中..." });
        wx.cloud
          .uploadFile({
            cloudPath: "community-card-" + Date.now() + ".png",
            filePath: path
          })
          .then((uploadRes) =>
            wx.cloud.getTempFileURL({
              fileList: [uploadRes.fileID]
            })
          )
          .then((urlRes) => {
            const item = urlRes.fileList && urlRes.fileList[0];
            const imageUrl = item && item.tempFileURL;
            if (!imageUrl) {
              throw new Error("missing temp file url");
            }

            this.setData({ imageUrl });
          })
          .catch((err) => {
            console.error("卡片图片上传失败", err);
            wx.showToast({
              title: "上传失败",
              icon: "none"
            });
          })
          .finally(() => {
            wx.hideLoading();
          });
      }
    });
  },

  onTextInput(e) {
    this.setData({ emotionText: e.detail.value });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ locationName: e.detail.value });
  },

  backToCommunity() {
    wx.redirectTo({
      url: "/pages/community/community"
    });
  },

  goProfile() {
    wx.redirectTo({
      url: "/pages/profile/profile"
    });
  },

  publishCard() {
    if (this.data.publishing) {
      return;
    }

    const taskData = app.globalData.task_data || {};
    const openid = taskData.openid || "";

    if (!openid || !this.data.imageUrl || !this.data.emotionText.trim()) {
      wx.showToast({
        title: "请补全卡片信息",
        icon: "none"
      });
      return;
    }

    this.setData({ publishing: true });
    const targetId = this.data.targetId || createTargetId();

    return communityService
      .apiCommunityCardPublish({
        openid,
        target_id: targetId,
        landscape: app.globalData.task_data.landscape || "sharepool",
        image_url: this.data.imageUrl,
        emotion_text: this.data.emotionText,
        title: this.data.title || "旅行卡片",
        location_name: (this.data.locationName || "").trim()
      })
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};
        const card = data.card || {};
        const createdCardId =
          data.card_id || card.card_id || data.target_id || card.target_id || targetId;

        return profileStore
          .saveCreatedId(openid, "card", createdCardId)
          .catch((err) => {
            console.warn("模板归属记录失败，稍后可通过刷新重试", err);
          });
      })
      .then(() => {
        wx.showToast({
          title: "发布成功",
          icon: "success"
        });
        wx.reLaunch({
          url: "/pages/community/community"
        });
      })
      .catch((err) => {
        console.error("发布卡片失败", err);
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
