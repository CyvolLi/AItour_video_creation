const app = getApp();

const FRAMES = {
  left: "https://data.ruralv.cn/asset/left.gif",
  front: "https://data.ruralv.cn/asset/front.gif",
  right: "https://data.ruralv.cn/asset/right.gif",
};

// 运动范围：左(0) → 中(40) → 右(80) → 中(40) → ... 单位 rpx
const POSITIONS = [
  { key: "left",  offset: 0,  frame: FRAMES.left },
  { key: "front", offset: 40, frame: FRAMES.front },
  { key: "right", offset: 80, frame: FRAMES.right },
  { key: "front", offset: 40, frame: FRAMES.front },
];

const GUIDE_PHRASES = [
  "看到眼前的风景，心里冒出的第一句话是什么？",
  "用一句话形容一下你现在的感受吧～",
  "这片风景让你想起了什么？写下来吧",
  "此时此刻，你心里在想什么呢？",
];

Page({
  data: {
    currentFrame: FRAMES.front,
    mascotOffset: 40,
    transitionDuration: 0.6,
    guidePhrase: "",
    inputValue: "",
    timerId: null,
    posIndex: 1, // 从中间开始
  },

  onShow() {
    this.setData({
      guidePhrase: this.pickRandomPhrase(),
      transitionDuration: 0,
    });
    this.startAnimation();
  },

  onHide() {
    this.stopAnimation();
  },

  startAnimation() {
    // 首次加载后恢复过渡动画
    setTimeout(() => {
      this.setData({ transitionDuration: 0.6 });
    }, 100);
    this.scheduleNextMove();
  },

  scheduleNextMove() {
    const delay = this.randomInterval();
    const timerId = setTimeout(() => {
      this.nextFrame();
      this.scheduleNextMove();
    }, delay);
    this.setData({ timerId });
  },

  stopAnimation() {
    if (this.data.timerId) {
      clearTimeout(this.data.timerId);
      this.setData({ timerId: null });
    }
  },

  randomInterval() {
    return Math.floor(Math.random() * 2000) + 1500; // 1.5s ~ 3.5s
  },

  nextFrame() {
    const nextIdx = (this.data.posIndex + 1) % POSITIONS.length;
    const pos = POSITIONS[nextIdx];

    this.setData({
      currentFrame: pos.frame,
      mascotOffset: pos.offset,
      posIndex: nextIdx,
      guidePhrase: this.pickRandomPhrase(),
    });
  },

  pickRandomPhrase() {
    const idx = Math.floor(Math.random() * GUIDE_PHRASES.length);
    return GUIDE_PHRASES[idx];
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value,
    });
  },

  onConfirm() {
    const text = (this.data.inputValue || "").trim();

    app.globalData.task_data.request = text || "请根据这张风景照片生成一段富有诗意的短视频脚本。";

    wx.navigateTo({
      url: "../dialogue/dialogue",
      fail(err) {
        console.error("跳转 script 失败：", err);
        wx.showToast({
          title: "页面跳转失败",
          icon: "none",
        });
      },
    });
  },
});
