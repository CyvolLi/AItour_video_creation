const { STORE_APPID } = require("../../utils/runtimeConfig.js");

Page({
  data: {
    storeIdUnderTest: STORE_APPID,
    result: ""
  },
  openStore() {
    const that = this;
    wx.openEmbeddedMiniProgram({
      appId: STORE_APPID,
      success() {
        that.setData({
          result:
            "通用跳转 API 成功，可能降级；不能证明实际半屏形态，也不能证明 store-product 参数或商品详情是否有效"
        });
      },
      fail(err) {
        const detail = err ? JSON.stringify(err) : "未知错误";
        that.setData({
          result:
            "通用跳转 API 失败: " +
            detail +
            "；不能证明 store-product 参数或商品详情是否有效"
        });
      }
    });
  }
});
