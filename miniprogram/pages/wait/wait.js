// pages/wait/wait.js
import WxRequest from "mina-request";

const app = getApp();

const wxRequest = new WxRequest({
  baseURL: "https://ruralv.cn"
});

Page({
  data: {
    debugOnlyShot: false,
    use_extend: false,
    count: 0,
    coverUrl: "",
    progress: 0,
    videoStatus: "idle",
    pollingTimer: null,
    fakeTimer: null,
    requestUrl: "/api/share",
    genshotUrl: "/api/first_shot",
    extendURL: "/api/video/extend",
    videoReq: "/api/video",
    videoStatusUrl: "/api/video/status"
  },

  onLoad() {
    const taskData = app.globalData.task_data || {};

    this.setData({
      use_extend: app.globalData.video_extend || false,
      count: app.globalData.task_data.count || 0,
      coverUrl: taskData.spot_url || taskData.user_potrait || ""
    });
    setTimeout(() => {
      this.startFakeProgress();
      this.startTaskFlow();
    }, 200);
  },

  onUnload() {
    this.clearPolling();
    this.clearFakeProgress();
  },

  async startTaskFlow() {
    console.log("轮询使用的 task_data:", app.globalData.task_data);
    const taskData = app.globalData.task_data || {};

    if (!taskData.openid || !taskData.task_id) {
      wx.showToast({
        title: "任务未初始化",
        icon: "none"
      });
      return;
    }

    wx.showLoading({
      title: "任务提交中..."
    });

    const fullTaskData = { ...taskData };

    // ========== 新增：非 extend 模式下先请求首帧图片 ==========
    if (!this.data.use_extend) {
      try {
        const shotResp = await wxRequest.post(this.data.genshotUrl, {
          task_data: fullTaskData,
          timeout: 180000  // 150秒，比 app.json 的 180s 略小留出余量
        });
        const shotData = shotResp && shotResp.data ? shotResp.data : {};

        if (shotData.success === true && shotData.cover_url) {
          // 更新页面封面图
          this.setData({
            coverUrl: shotData.cover_url
          });
          // 同步更新 globalData 中的 spot_url
          app.globalData.task_data = {
            ...(app.globalData.task_data || {}),
            spot_url: shotData.cover_url
          };
          // 刷新 fullTaskData，确保后续请求使用最新的 spot_url
          fullTaskData.spot_url = shotData.cover_url;
          console.log("首帧图片生成成功，cover_url:", shotData.cover_url);
        } else {
          console.log("首帧图片生成失败或未返回 cover_url，继续后续流程");
        }
      } catch (err) {
        // first_shot 失败不阻塞后续流程
        console.error("首帧图片请求失败：", err);
      }
    }
    // ========== 新增结束 ==========

    // 🔧 调试：只生成图片不生成视频
    if (this.data.debugOnlyShot) {
      wx.hideLoading();
      console.log("🔧 debugOnlyShot=true，跳过视频生成流程");
      return;
    }

    try {
      const shareResp = await wxRequest.post(this.data.requestUrl, {
        task_data: fullTaskData
      });

      const shareData = shareResp && shareResp.data ? shareResp.data : {};
      const finalResponse =
        typeof shareData === "string"
          ? shareData
          : shareData.response || "";

      app.globalData.final_response = finalResponse;
    } catch (err) {
      console.error("分享文案生成失败：", err);
    }

    try {
      let videoResp;
      if (this.data.use_extend) {
  videoResp = await wxRequest.post(this.data.extendURL, {
    task_data: fullTaskData
  });
} else {
  videoResp = await wxRequest.post(this.data.videoReq, {
    task_data: fullTaskData
  });
}

      const videoData = videoResp && videoResp.data ? videoResp.data : {};
      const videoTaskId = videoData.video_id || videoData.task_id || "";

      if (videoTaskId) {
        app.globalData.task_data = {
          ...(app.globalData.task_data || {}),
          task_id: videoTaskId,
          video_id: videoTaskId
        };
      }
      this.setData({
        videoStatus: videoData.video_status || "processing"
      });
      wx.hideLoading();
      console.log("轮询使用的 task_data:", app.globalData.task_data);

      if (!videoTaskId) {
        console.error("视频任务启动成功但缺少 video_id/task_id:", videoData);
        wx.showToast({
          title: "视频任务创建异常",
          icon: "none"
        });
        wx.reLaunch({
          url: "/pages/community/community"
        });
        return;
      }

      this.startPolling();
    } catch (err) {
      wx.hideLoading();
      console.error("视频任务启动失败：", err);
      wx.showToast({
        title: "视频任务启动失败",
        icon: "none"
      });
      wx.reLaunch({
        url: "/pages/community/community"
      });
    }
  },

  startPolling() {
    if (this.data.pollingTimer) {
      return;
    }

    const timer = setInterval(() => {
      this.checkVideoStatus();
    }, 15000);

    this.setData({
      pollingTimer: timer
    });
  },

  clearPolling() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.setData({
        pollingTimer: null
      });
    }
  },

  startFakeProgress() {
    if (this.data.fakeTimer) {
      return;
    }

    const timer = setInterval(() => {
      const current = this.data.progress || 0;
      let next = current + Math.floor(Math.random() * 2) + 1;  // 每次涨1~2

      if (next >= 20) {
        next = 20;
      }

      this.setData({
        progress: next
      });

      if (next >= 20) {
        this.clearFakeProgress();
      }
    }, 2000);  // 每2秒跳一次

    this.setData({
      fakeTimer: timer
    });
  },

  clearFakeProgress() {
    if (this.data.fakeTimer) {
      clearInterval(this.data.fakeTimer);
      this.setData({
        fakeTimer: null
      });
    }
  },

  async checkVideoStatus() {
    try {
      const taskData = app.globalData.task_data || {};
      const pollingVideoId = taskData.video_id || taskData.task_id;

      if (!pollingVideoId) {
        this.clearPolling();
        this.clearFakeProgress();
        wx.showToast({
          title: "缺少视频任务ID",
          icon: "none"
        });
        return;
      }

      const pollingTaskData = {
        ...taskData,
        task_id: pollingVideoId,
        video_id: pollingVideoId
      };

      const resp = await wxRequest.post(this.data.videoStatusUrl, {
        task_data: pollingTaskData
      });

      const data = resp && resp.data ? resp.data : {};
      const videoStatus = data.video_status || "idle";
      const videoUrl = data.video_url || "";
      const backendProgress =
        typeof data.progress === "number" ? data.progress : null;
      const progress =
        backendProgress == null
          ? this.data.progress
          : Math.min(100, Math.max(20, 20 + backendProgress * 0.8));

      this.setData({
        progress,
        videoStatus
      });

      if (videoStatus === "complete" && videoUrl) {
        this.handleVideoReady(videoUrl, data);
        return;
      }

      if (videoStatus === "failed") {
        this.clearPolling();
        this.clearFakeProgress();

        wx.showToast({
          title: data.video_error || data.error_message || "视频生成失败",
          icon: "none",
          duration: 1500
        });

        setTimeout(() => {
          wx.reLaunch({
            url: "/pages/community/community"
          });
        }, 1500);
      }
    } catch (err) {
      console.error("轮询视频状态失败：", err);
      const detail =
        err &&
        err.response &&
        err.response.data &&
        (err.response.data.detail || err.response.data.error_message);

      if (detail) {
        console.error("状态查询失败详情:", detail);
      }
    }
  },

  handleVideoReady(videoUrl, videoResponse = {}) {
    this.clearPolling();
    this.clearFakeProgress();

    this.setData({
      progress: 100,
      videoStatus: "complete"
    });

    app.globalData.video_url = videoUrl;

    if (videoResponse.cover_url) {
      app.globalData.coverUrl = videoResponse.cover_url;
    }

    setTimeout(() => {
      wx.redirectTo({
        url: "../v_output/v_output"
      });
    }, 400);
  }
});

