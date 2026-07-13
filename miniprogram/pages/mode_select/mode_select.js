// pages/mode_select/mode_select.js
const app = getApp();

Page({
  data: {},

  onLoad() {
    app.globalData.hasNavigated = true;
  },

  official() {
    wx.navigateTo({
      url: "../scenery_select/scenery_select",
    });
  },

  personalize() {
    app.globalData.task_data.card_id = "";
    wx.navigateTo({
      url: "../user_custom1/user_custom1",
    });
  },
});
