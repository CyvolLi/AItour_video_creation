const app = getApp();

Page({
  data: {
    count: 0,
    script: "",
    videoUrl: "",
    coverUrl: "",
    finalResponse: ""
  },

  onLoad() {
    const taskData = app.globalData.task_data || {};

    this.setData({
      count: taskData.count || 0,
      script: taskData.scriptContent || "",
      videoUrl: app.globalData.video_url || app.globalData.videoUrl || "",
      coverUrl: taskData.spot_url || "",
      finalResponse: app.globalData.final_response || ""
    });
  },

  backToGenerate() {
    app.globalData.task_data.count = 0;
    wx.redirectTo({
      url: "/pages/mode_select/mode_select"
    });
  },

  backToExtend() {
    const newCount = this.data.count + 1;

    if (newCount >= 3) {
      wx.showToast({
        title: "已达视频延长上限",
        icon: "none"
      });
      app.globalData.task_data.count = 0;
      wx.reLaunchTo({
        url: "/pages/mode_select/mode_select"
      });
      return;
    }

    app.globalData.task_data.count = newCount;
    app.globalData.task_data.request = this.data.script;
    wx.reLaunchTo({
      url: "/pages/dialogue/dialogue"
    });
  },

  publishPost() {
    wx.navigateTo({
      url: "/pages/publish/publish"
    });
  },

  saveVideo() {
    const videoUrl = this.data.videoUrl;

    if (!videoUrl) {
      wx.showToast({
        title: "暂未获取到视频地址",
        icon: "none"
      });
      return;
    }

    wx.showLoading({
      title: "下载中..."
    });

    wx.downloadFile({
      url: videoUrl,
      success(res) {
        if (res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({
            title: "下载失败",
            icon: "none"
          });
          return;
        }

        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.hideLoading();
            wx.showToast({
              title: "已保存到相册",
              icon: "success"
            });
            console.log("视频下载地址:", videoUrl);
          },
          fail() {
            wx.hideLoading();
            wx.showToast({
              title: "保存失败或未授权",
              icon: "none"
            });
          }
        });
      },
      fail() {
        wx.hideLoading();
        wx.showToast({
          title: "下载失败",
          icon: "none"
        });
      }
    });
  }
});
