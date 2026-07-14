// pages/user_custom1/user_custom1.js
const app = getApp();
const FRAMES = {
  left: "https://data.ruralv.cn/asset/left.gif",
  front: "https://data.ruralv.cn/asset/front.gif",
  right: "https://data.ruralv.cn/asset/right.gif",
};
const GUIDE_PHRASES = [
  "快来记录下📸你眼前的风景呀！",
  "或是湖边，那条条垂柳🌿诉说眼前季节？",
  "快看！湖面上有鸭子🦆",
  "😉你想记录怎样的故事？",
  "还是乡野点点烟火，最抚凡人心😊"
];

const POSITIONS = [
  { frame: FRAMES.left, offset: 0 },
  { frame: FRAMES.front, offset: 40 },
  { frame: FRAMES.right, offset: 80 }
];

Page({
  data: {
    scene_url: "",
    imglist: [],
    Selectedimgid: "",
    currentFrame: FRAMES.front,
    mascotOffset: 40,
    transitionDuration: 0.6,
    guidePhrase: "",
    timerId: null,
    posIndex: 1,
    lastPhraseIndex: -1,
    currentThumbIndex: 0
  },

  onLoad() {
    this._uploading = false;
  },

  onShow() {
    const defaultItem = {
      id: "default",
      url: "https://ns-strategy.cdn.bcebos.com/ns-strategy/upload/fc_big_pic/part-00694-1576.jpg"
    };

    if (!this.data.imglist || this.data.imglist.length === 0) {
      this.setData({
        imglist: [defaultItem],
        scene_url: "",
        Selectedimgid: defaultItem.id,
        currentThumbIndex: 0
      });
    }

    this.setData({
      guidePhrase: this.pickRandomPhrase(),
      transitionDuration: 0.6
    });
    this.startAnimation();
  },

  onHide() {
    this.stopAnimation();
  },

  startAnimation() {
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
    return Math.floor(Math.random() * 2000) + 1500;
  },

  nextFrame() {
    const nextIdx = (this.data.posIndex + 1) % POSITIONS.length;
    const pos = POSITIONS[nextIdx];
    const updates = {
      currentFrame: pos.frame,
      mascotOffset: pos.offset,
      posIndex: nextIdx
    };
    if (pos.frame === FRAMES.front) {
      updates.guidePhrase = this.pickRandomPhrase();
    }
    this.setData(updates);
  },

  pickRandomPhrase() {
    const len = GUIDE_PHRASES.length;
    if (len === 0) return "";
    if (len === 1) {
      this.setData({ lastPhraseIndex: 0 });
      return GUIDE_PHRASES[0];
    }
    let idx = Math.floor(Math.random() * len);
    const prev = this.data.lastPhraseIndex;
    while (idx === prev) {
      idx = Math.floor(Math.random() * len);
    }
    this.setData({ lastPhraseIndex: idx });
    return GUIDE_PHRASES[idx];
  },

  handleThumbChange(e) {
    if (e.detail.source === 'touch') {
      const idx = e.detail.current;
      const item = this.data.imglist[idx];
      if (item) {
        this.setData({
          Selectedimgid: item.id,
          scene_url: item.url,
          currentThumbIndex: idx
        });
      }
    }
  },

  chooseImglist(e) {
    const { id, url, index } = e.currentTarget.dataset;
    this.setData({
      Selectedimgid: id,
      scene_url: url,
      currentThumbIndex: index
    });
  },

  chooseAndUploadImage() {
    if (this._uploading) {
      wx.showToast({ title: "正在上传，请稍候", icon: "none" });
      return;
    }
    wx.showLoading({ title: "上传中..." });
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (chooseResult) => {
        const tempFilePath = chooseResult.tempFiles[0]?.tempFilePath;
        if (!tempFilePath) {
          wx.hideLoading();
          return wx.showToast({ title: "图片读取失败", icon: "none" });
        }
        this.uploadFile(tempFilePath);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "未选择图片", icon: "none" });
      }
    });
  },

  uploadFile(filePath) {
    this._uploading = true;
    wx.cloud.uploadFile({
      cloudPath: `user-portrait-${Date.now()}.jpg`,
      filePath: filePath
    }).then(uploadRes => {
      const fileID = uploadRes.fileID;
      return wx.cloud.getTempFileURL({ fileList: [fileID] })
        .then(urlRes => ({ fileID, urlRes }));
    }).then(({ fileID, urlRes }) => {
      const tempUrl = urlRes.fileList[0]?.tempFileURL;
      if (!tempUrl) throw new Error("获取链接失败");

      const newItem = { id: fileID, url: tempUrl };
      const prevList = (this.data.imglist || []).slice();
      const newImgList = [newItem, ...prevList];

      this.setData({
        imglist: newImgList,
        scene_url: tempUrl,
        Selectedimgid: newItem.id,
        currentThumbIndex: 0
      });
      wx.showToast({ title: "图片已上传", icon: "success" });
    }).catch(err => {
      console.error("上传或获取链接失败:", err);
      wx.showToast({ title: err.message || "上传失败", icon: "none" });
    }).finally(() => {
      this._uploading = false;
      wx.hideLoading();
    });
  },

  gotowrite() {
    const url = this.data.scene_url;
    if (url) {
      app.globalData.task_data.spot_url = url;
      app.globalData.task_data.card_id = "";
      wx.navigateTo({ url: "../user_custom2/user_custom2" });
    } else {
      wx.showToast({ title: "请先拍照哟😘", icon: "none", duration: 800 });
    }
  }
});
