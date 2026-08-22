// pages/mode_select/mode_select.js
const app = getApp();

Page({
  data: {},

  onLoad() {
    app.globalData.hasNavigated = true;
  },

  official() {
    if (typeof app.resetTaskData === "function") {
      app.resetTaskData();
    }

    wx.navigateTo({
      url: "../scenery_select/scenery_select",
    });
  },

  personalize() {
    if (typeof app.resetTaskData === "function") {
      app.resetTaskData();
    }

    wx.navigateTo({
      url: "../user_custom1/user_custom1",
    });
  },
});
