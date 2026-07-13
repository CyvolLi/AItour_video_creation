const app = getApp();

const STYLE_OPTIONS = [
  {
    id: "ancient-china",
    name: "国风古装动画风格",
    description:
      "请将内容转化为国风古装动画短片风格，突出东方美学、古典服饰、写意镜头、柔和运镜与诗意氛围，画面具有故事感、人物情绪感和文旅意境，适合生成古风沉浸式旅行视频。",
    themeClass: "option-light"
  },
  {
    id: "short-video-travel",
    name: "短视频旅拍风格",
    description:
      "请将内容转化为短视频旅拍风格，突出轻快节奏、真实人物出镜、旅行打卡感、镜头切换流畅、氛围自然明亮，适合生成具有社交媒体传播感的文旅视频内容。",
    themeClass: "option-blue"
  },
  {
    id: "cinematic-immersive",
    name: "电影沉浸式风格",
    description:
      "请将内容转化为电影沉浸式风格，突出叙事镜头、情绪张力、环境氛围、层次光影和高质感画面表达，让视频具有电影预告片般的沉浸体验与情感感染力。",
    themeClass: "option-green"
  },
  {
    id: "user-based",
    name: "按照用户描述",
    description:
      "请根据脚本内提取的视频风格和用户描述，竭力完成用户描绘的视频氛围以及镜头调用。",
    themeClass: "option-green"
  }
];

const OPTIMIZATION_OPTIONS = [
  {
    id: "xiaohongshu",
    name: "生成小红书配文",
    description:
      "请基于内容生成适合小红书发布的旅行配文，语言真实有氛围感，兼顾种草感、生活方式表达和情绪价值，适合年轻用户阅读，可适度加入吸引互动的话术。",
    themeClass: "option-blue"
  },
  {
    id: "friend-circle",
    name: "生成朋友圈配文",
    description:
      "请基于内容生成适合朋友圈发布的旅行配文，语言简洁自然、有情绪感染力，不过度营销，突出个人体验、风景感受与当下心情，适合熟人社交场景表达。",
    themeClass: "option-blue"
  }
];

Page({
  data: {
    avatarUrl: "",
    generating: false,
    selectedStyleId: STYLE_OPTIONS[0].id,
    selectedOptimizationId: OPTIMIZATION_OPTIONS[0].id,
    styleOptions: STYLE_OPTIONS,
    optimizationOptions: OPTIMIZATION_OPTIONS
  },

  onLoad() {
    this.syncFromGlobalData();
  },

  onShow() {
    this.syncFromGlobalData();
  },

  syncFromGlobalData() {
    const taskData = app.globalData.task_data || {};
    const videoConfig = taskData.videoConfig || {};
    const savedOptimizationIds = videoConfig.optimizationIds || [];

    this.setData({
      avatarUrl: taskData.user_potrait || "",
      selectedStyleId: videoConfig.styleId || STYLE_OPTIONS[0].id,
      selectedOptimizationId:
        videoConfig.optimizationId ||
        savedOptimizationIds[0] ||
        OPTIMIZATION_OPTIONS[0].id
    });
  },

  chooseAndUploadImage() {
    wx.showLoading({
      title: "上传中..."
    });

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (chooseResult) => {
        const tempFile = chooseResult.tempFiles && chooseResult.tempFiles[0];
        const tempFilePath = tempFile ? tempFile.tempFilePath : "";

        if (!tempFilePath) {
          wx.hideLoading();
          wx.showToast({
            title: "图片读取失败",
            icon: "none"
          });
          return;
        }

        wx.cloud
          .uploadFile({
            cloudPath: "user-potrait-" + Date.now() + ".jpg",
            filePath: tempFilePath
          })
          .then((res) => {
            const fileID = res.fileID || "";

            if (!fileID) {
              wx.showToast({
                title: "上传失败",
                icon: "none"
              });
              return;
            }

            // 获取临时链接
            wx.cloud.getTempFileURL({
              fileList: [fileID],
              success: (tempRes) => {
                const tempUrl = tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL;
                if (!tempUrl) {
                  wx.showToast({
                    title: "获取链接失败",
                    icon: "none"
                  });
                  return;
                }

                this.setData({
                  avatarUrl: tempUrl
                });

                app.globalData.task_data.user_potrait = tempUrl;
                
                wx.showToast({
                  title: "图片已上传",
                  icon: "success"
                });
              },
              fail: (err) => {
                wx.showToast({
                  title: "获取链接失败",
                  icon: "none"
                });
              },
              complete: () => {
                wx.hideLoading();
              }
            });
          })
          .catch((err) => {
            console.error("上传头像失败:", err);
            wx.showToast({
              title: "上传失败",
              icon: "none"
            });
          })
          .finally(() => {
            wx.hideLoading();
          });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: "未选择图片",
          icon: "none"
        });
      }
    });
  },

  selectStyle(e) {
    const id = e.currentTarget.dataset.id;

    if (!id || id === this.data.selectedStyleId) {
      return;
    }

    this.setData({
      selectedStyleId: id
    });
  },

  toggleOptimization(e) {
    const id = e.currentTarget.dataset.id;

    if (!id || id === this.data.selectedOptimizationId) {
      return;
    }

    this.setData({
      selectedOptimizationId: id
    });
  },

  getSelectedStyleOption() {
    return (
      STYLE_OPTIONS.find((item) => item.id === this.data.selectedStyleId) ||
      STYLE_OPTIONS[0]
    );
  },

  getSelectedOptimizationOption() {
    return (
      OPTIMIZATION_OPTIONS.find(
        (item) => item.id === this.data.selectedOptimizationId
      ) || OPTIMIZATION_OPTIONS[0]
    );
  },

  joinPrompt(parts) {
    return parts
      .filter((item) => typeof item === "string" && item.trim())
      .join(",");
  },

  saveConfigToGlobalData() {
    const taskData = app.globalData.task_data || {};
    const scriptContent = taskData.scriptContent || "";
    const selectedStyle = this.getSelectedStyleOption();
    const selectedOptimization = this.getSelectedOptimizationOption();

    taskData.user_potrait = this.data.avatarUrl;

    taskData.video_request = this.joinPrompt([
      selectedStyle.description,
      scriptContent
    ]);

    taskData.request = selectedOptimization.description,

    app.globalData.task_data = taskData;
  },

  generateVideo() {
    if (this.data.generating) {
      return;
    }

    if (!this.data.avatarUrl) {
      wx.showToast({
        title: "请先上传个人肖像",
        icon: "none"
      });
      return;
    }

    this.saveConfigToGlobalData();

    this.setData({
      generating: true
    });

    wx.showToast({
      title: "参数已写入",
      icon: "success",
      duration: 800
    });

    setTimeout(() => {
      this.setData({
        generating: false
      });
      
      app.globalData.task_data.count = 0;
      app.globalData.video_extend = false;

      wx.redirectTo({
        url: "/pages/wait/wait"
      });
    }, 500);
  }
});
