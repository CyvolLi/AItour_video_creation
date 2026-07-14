const {
  STORE_APPID,
  DEFAULT_PRODUCT_ID
} = require("../../utils/runtimeConfig.js");

Page({
  data: {
    storeAppId: STORE_APPID,
    productId: DEFAULT_PRODUCT_ID,
    platform: "未知",
    system: "未知",
    SDKVersion: "未知",
    storeHomeSupported: false,
    storeProductSupported: false,
    environmentNotice: "",
    productEnterResult: "尚未触发商品跳转"
  },

  onLoad() {
    const deviceInfo =
      typeof wx.getDeviceInfo === "function" ? wx.getDeviceInfo() || {} : {};
    const appBaseInfo =
      typeof wx.getAppBaseInfo === "function" ? wx.getAppBaseInfo() || {} : {};
    const canIUse =
      typeof wx.canIUse === "function" ? wx.canIUse.bind(wx) : () => false;
    const platform = deviceInfo.platform || "未知";
    const system = deviceInfo.system || "未知";
    const desktopEnvironment = /devtools|windows|mac/i.test(
      `${platform} ${system}`
    );

    this.setData({
      platform,
      system,
      SDKVersion: appBaseInfo.SDKVersion || "未知",
      storeHomeSupported: canIUse("store-home"),
      storeProductSupported: canIUse("store-product"),
      environmentNotice: desktopEnvironment
        ? "当前为开发者工具或桌面环境，微信小店结果必须使用手机真机复核。"
        : "当前为移动端环境，请结合手机真机上的实际结果判读。"
    });
  },

  onEnterSuccess(event) {
    const detail = (event && event.detail) || {};
    console.log("[store-product] 商品跳转成功", detail);
    this.setData({
      productEnterResult: "商品跳转成功"
    });
  },

  onEnterError(event) {
    const detail = (event && event.detail) || {};
    const code = detail.code === undefined ? "未知" : detail.code;
    const message = detail.message || detail.errMsg || "未知错误";
    console.error("[store-product] 商品跳转失败", detail);
    this.setData({
      productEnterResult: `商品跳转失败（错误码：${code}，信息：${message}）`
    });
  }
});
