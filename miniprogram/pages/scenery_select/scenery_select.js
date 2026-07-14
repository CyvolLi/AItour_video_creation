// pages/scenery_select/scenery_select.js
const communityService = require("../../utils/communityService.js");
const landscapeUtil = require("../../utils/landscape.js");
const app = getApp()

Page({
  data: {
    current: 0,
    selectedSpot: null,
    selectedTemplateId: null,
    currentLandscape: landscapeUtil.getLandscapeOption("sharepool"),
    templateLoading: false,
    recommendList: [],
    spotList: [
      {
        id: 1,
        landscape: "sharepool",
        landscapeName: "公共分享池",
        cover: "https://tr-osdcp.qunarzz.com/tr-osd-tr-space/img/bfce80ecbf046c6d76d46759b04e10eb.jpg",
        text: "分享池中包含了多个景区的通用模板，提供多样化的风格和设计。"
      },
      {
        id: 2,
        landscape: "001",
        landscapeName: "越秀风行",
        cover: "https://data.ruralv.cn/asset/yue.jpg",
        text: "广东田园风光，感受自然的美丽与宁静，体验田园生活的悠闲与惬意。"
      },
      {
        id: 3,
        landscape: "002",
        landscapeName: "哈工深",
        cover: "https://n.sinaimg.cn/sinacn01/786/w980h606/20181117/b503-hnyuqhh2236078.png",
        text: "深圳大学城，在这里发现了不一样的风景，感受到了浓厚的学术氛围和青春活力。"
      }
    ]
  },

  normalizeCardTemplate(card, index) {
    return {
      id: card.card_id || card.target_id || card.id || `template_${index}`,
      card_id: card.card_id || "",
      target_id: card.target_id || "",
      landscape: card.landscape || app.globalData.task_data.landscape || "sharepool",
      landscapeName: landscapeUtil.getLandscapeName(
        card.landscape || app.globalData.task_data.landscape
      ),
      cover: card.image_url || card.cover || "",
      text: card.emotion_text || card.text || "我的旅行卡片"
    };
  },

  syncLandscape(landscape) {
    const option = landscapeUtil.syncTaskLandscape(
      app.globalData.task_data,
      landscape
    );

    this.setData({
      currentLandscape: option
    });

    return option;
  },

  loadLandscapeTemplates(landscape) {
    if (this.data.templateLoading) {
      return Promise.resolve();    // 正在加载中，直接跳过
    }

    const option = this.syncLandscape(landscape);

    this.setData({ templateLoading: true });

    return communityService
      .apiCommunityCard({
        page: 1,
        page_size: 10,
        landscape: option.id
      })
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};
        const list = Array.isArray(data.list) ? data.list : [];
        const recommendList = list
          .map((item, index) => this.normalizeCardTemplate(item, index))
          .filter((item) => item.cover);

        this.setData({ recommendList });
      })
      .catch((err) => {
        console.warn("景区模板加载失败", err);
        this.setData({ recommendList: [] });
      })
      .finally(() => {
        this.setData({ templateLoading: false });
      });
  },

  selectSpot(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selectedSpot = this.data.spotList[index];

    this.setData({
      current: index,
      selectedSpot,
      selectedTemplateId: null      // 切景区时清除旧模板选中
    });

    this.loadLandscapeTemplates(selectedSpot.landscape || "sharepool");
    console.log("selected spot:", selectedSpot);
  },

  selectTemplate(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.recommendList[index];

    if (!item) return;

    this.syncLandscape(item.landscape || "sharepool");
    this.setData({
      current: -1,
      selectedSpot: item,
      selectedTemplateId: item.id
    });

    wx.showToast({
      title: item.text || "模板已选中",
      icon: "none",
      duration: 2000
    });
  },

  onLoad() {
    const initialLandscape =
      app.globalData.task_data.landscape ||
      (this.data.spotList[0] && this.data.spotList[0].landscape) ||
      "sharepool";
    const selectedSpot =
      this.data.spotList.find((item) => item.landscape === initialLandscape) ||
      this.data.spotList[0];

    this.setData({
    current: this.data.spotList.indexOf(selectedSpot),
    selectedSpot,
    recommendList: []
    });
    this.loadLandscapeTemplates(initialLandscape);
  },

  confirmSelection() {
    if (!this.data.selectedTemplateId) {
      wx.showToast({ title: "请先选择一个模板", icon: "none" });
      return;
    }

    const selectedSpot = this.data.selectedSpot;

    app.globalData.task_data.spot_url = selectedSpot.cover;
    app.globalData.task_data.request = selectedSpot.text;
    app.globalData.task_data.card_id = selectedSpot.card_id || "";
    landscapeUtil.syncTaskLandscape(
      app.globalData.task_data,
      selectedSpot.landscape || "sharepool"
    );
    wx.navigateTo({
      url: "../dialogue/dialogue",
      success: () => {
        console.log("confirmed spot:", selectedSpot);
      },
      fail: (err) => {
        console.error("跳转失败：", err);
        wx.showToast({ title: "页面跳转失败", icon: "none" });
      }
    });
  }
});
