const { STORE_APPID } = require("../../utils/runtimeConfig.js");

Page({
  data: {
    storeAppId: STORE_APPID,
    result: ""
  },
  openStore() {
    const that = this;
    wx.openEmbeddedMiniProgram({
      appId: STORE_APPID,
      success() {
        that.setData({ result: "跳转成功" });
      },
      fail(err) {
        const detail = err ? JSON.stringify(err) : "未知错误";
        that.setData({ result: "失败: " + detail });
      }
    });
  }
});
