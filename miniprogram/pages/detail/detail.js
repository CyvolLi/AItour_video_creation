const communityService = require("../../utils/communityService.js");
const commentStore = require("../../utils/commentStore.js");
const profileStore = require("../../utils/profileStore.js");
const avatarStore = require("../../utils/avatarStore.js");
const avatarRefresh = require("../../utils/avatarRefresh.js");
const landscapeUtil = require("../../utils/landscape.js");
const { getRelatedProducts } = require("../../utils/demoProducts.js");
const app = getApp();

const DEFAULT_USER_AVATAR = "../../images/default.jpg";

Page({
  data: {
    type: "post",
    id: "",
    targetId: "",
    item: {},
    target: {
      likes: 0,
      favorites: 0,
      comments: 0,
      List: []
    },
    commentInput: "",
    commentLoading: false,
    commenting: false,
    demoProducts: [],
    statusBarHeight: 20,
    navContentHeight: 44,
    capsuleRightInset: 96
  },

  normalizeTarget(target) {
    const safeTarget = target || {};

    return {
      likes: safeTarget.likes || 0,
      favorites: safeTarget.favorites || 0,
      comments: safeTarget.comments || 0,
      List: Array.isArray(safeTarget.List) ? safeTarget.List : []
    };
  },

  // ====== 新增：与 community.js 一致的 openid 提取方法 ======
  getAuthorOpenid(item) {
    return item && (item.openid || item.author_openid || item.user_openid || "");
  },

  // ====== 新增：与 community.js 一致的头像云函数批量调用 ======
  requestAvatarTempUrls(fileIDs) {
    const safeFileIDs = Array.from(new Set((fileIDs || []).filter(Boolean)));

    if (!safeFileIDs.length) {
      return Promise.resolve({});
    }

    return wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getAvatarTempUrls",
          fileIDs: safeFileIDs
        }
      })
      .then((resp) => {
        const result = resp && resp.result ? resp.result : {};
        return result.urls || {};
      })
      .catch((err) => {
        console.error("头像临时链接获取失败", err);
        return {};
      });
  },

  // ====== 修改：对齐 community.js 的头像处理逻辑 ======
  attachAuthorProfiles(list) {
    const safeList = Array.isArray(list) ? list : [];
    const openids = safeList
      .map((item) => this.getAuthorOpenid(item))
      .filter(Boolean);

    if (!openids.length) {
      return Promise.resolve(safeList);
    }

    return profileStore
      .getProfilesByOpenids(openids)
      .then((profileMap) => {
        const avatarFileIDs = Object.keys(profileMap)
          .map((openid) => profileMap[openid] && profileMap[openid].avatarFileID)
          .filter(Boolean);

        return this.requestAvatarTempUrls(avatarFileIDs).then((avatarUrlMap) =>
          safeList.map((item) => {
            const profile = profileMap[this.getAuthorOpenid(item)];

            if (!profile) {
              return {
                ...item,
                author_name: item.author_name || "忆景创影",
                author_avatar: item.author_avatar || DEFAULT_USER_AVATAR,
                author_avatar_file_id: item.author_avatar_file_id || ""
              };
            }

            return {
              ...item,
              author_name: profile.nickName || item.author_name || "忆景创影",
              author_avatar:
                avatarUrlMap[profile.avatarFileID] ||
                profile.avatarUrl ||
                item.author_avatar ||
                DEFAULT_USER_AVATAR,
              author_avatar_file_id:
                profile.avatarFileID || item.author_avatar_file_id || ""
            };
          })
        );
      })
      .catch((err) => {
        console.error("作者资料补全失败", err);
        return safeList;
      });
  },

  onLoad(options) {
    this.measureNavigation();

    const item = app.globalData.community_current_item || {};
    const target = item.target || item.Target || {};
    const type = options.type || item.type || "post";
    const id = options.id || item.post_id || item.card_id || "";
    const productSeed = item.video_url || item.share_text || item.post_id || id;

    return this.attachAuthorProfiles([item]).then((items) => {
      this.setData({
        type,
        id,
        targetId: options.target_id || item.target_id || "",
        item: items[0] || item,
        target: this.normalizeTarget(target),
        demoProducts:
          type === "post" ? getRelatedProducts(productSeed, 4) : []
      });

      return this.loadComments();
    });
  },

  measureNavigation() {
    let windowInfo = {};
    let menuRect = {};

    try {
      if (typeof wx.getWindowInfo === "function") {
        windowInfo = wx.getWindowInfo() || {};
      } else if (typeof wx.getSystemInfoSync === "function") {
        windowInfo = wx.getSystemInfoSync() || {};
      }
    } catch (err) {
      console.warn("窗口信息获取失败，使用默认导航尺寸", err);
    }

    try {
      if (typeof wx.getMenuButtonBoundingClientRect === "function") {
        menuRect = wx.getMenuButtonBoundingClientRect() || {};
      }
    } catch (err) {
      console.warn("胶囊位置获取失败，使用默认安全间距", err);
    }

    const validNumber = (value, fallback) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? number : fallback;
    };
    const statusBarHeight = validNumber(windowInfo.statusBarHeight, 20);
    const windowWidth = validNumber(
      windowInfo.windowWidth || windowInfo.screenWidth,
      375
    );
    const menuTop = Number(menuRect.top);
    const menuLeft = Number(menuRect.left);
    const menuHeight = validNumber(
      menuRect.height || Number(menuRect.bottom) - menuTop,
      0
    );
    const hasMenuGeometry =
      Number.isFinite(menuTop) && menuTop >= statusBarHeight && menuHeight > 0;
    const navContentHeight = hasMenuGeometry
      ? menuHeight + (menuTop - statusBarHeight) * 2
      : 44;
    const capsuleRightInset =
      Number.isFinite(menuLeft) && menuLeft > 0 && menuLeft < windowWidth
        ? Math.max(72, windowWidth - menuLeft + 8)
        : 96;

    this.setData({
      statusBarHeight,
      navContentHeight,
      capsuleRightInset
    });
  },

  goBack() {
    let pages = [];

    try {
      pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
    } catch (err) {
      console.warn("页面栈获取失败，返回社区页", err);
    }

    if (pages.length > 1 && typeof wx.navigateBack === "function") {
      return wx.navigateBack();
    }

    if (typeof wx.reLaunch === "function") {
      return wx.reLaunch({
        url: "/pages/community/community"
      });
    }

    if (typeof wx.navigateBack === "function") {
      return wx.navigateBack();
    }
  },

  showDemoProduct() {
    wx.showToast({
      title: "演示商品，暂不支持购买",
      icon: "none"
    });
  },

  getCommentTargetId() {
    const item = this.data.item || {};

    return (
      this.data.targetId ||
      item.target_id ||
      item.comment_id ||
      item.post_id ||
      item.card_id ||
      this.data.id
    );
  },

  loadComments() {
    const targetId = this.getCommentTargetId();

    if (!targetId) {
      return Promise.resolve([]);
    }

    this.setData({ commentLoading: true });

    return commentStore
      .listByTarget(targetId)
      .then((comments) => this.attachAuthorProfiles(comments))
      .then((comments) => {
        this.setData({
          target: {
            ...this.data.target,
            comments: comments.length,
            List: comments
          }
        });
        return comments;
      })
      .catch((err) => {
        console.error("评论加载失败", err);
        wx.showToast({
          title: "评论加载失败",
          icon: "none"
        });
        return [];
      })
      .finally(() => {
        this.setData({ commentLoading: false });
      });
  },

  onCommentInput(e) {
    this.setData({
      commentInput: e.detail.value
    });
  },

  submitComment() {
    if (this.data.commenting) {
      return;
    }

    const content = (this.data.commentInput || "").trim();
    const targetId = this.getCommentTargetId();
    const openid = app.globalData.task_data && app.globalData.task_data.openid;

    if (!openid || !targetId || !content) {
      wx.showToast({
        title: "请先填写评论",
        icon: "none"
      });
      return;
    }

    this.setData({ commenting: true });

    commentStore
      .addComment({
        target_id: targetId,
        target_type: this.data.type,
        author_openid: openid,
        content
      })
      .then(() => {
        this.setData({ commentInput: "" });
        return this.loadComments();
      })
      .catch((err) => {
        console.error("评论发布失败", err);
        wx.showToast({
          title: "评论发布失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ commenting: false });
      });
  },

  refreshDetailAvatarOnError() {
    const item = this.data.item || {};
    const avatarFileID = avatarRefresh.getAvatarFileID(item);

    if (!avatarFileID) {
      return;
    }

    avatarStore
      .getTempFileURL(avatarFileID)
      .then((avatarUrl) => {
        this.setData({
          item: {
            ...this.data.item,
            author_avatar: avatarUrl
          }
        });
      })
      .catch((err) => {
        console.warn("详情作者头像临时链接刷新失败", err);
      });
  },

  refreshCommentAvatarOnError(e) {
    const index = Number(e.currentTarget.dataset.index);
    const comments = (this.data.target && this.data.target.List) || [];
    const comment = comments[index];
    const avatarFileID = avatarRefresh.getAvatarFileID(comment);

    if (!avatarFileID) {
      return;
    }

    avatarStore
      .getTempFileURL(avatarFileID)
      .then((avatarUrl) => {
        const nextComments = comments.slice();
        nextComments[index] = {
          ...nextComments[index],
          author_avatar: avatarUrl
        };

        this.setData({
          target: {
            ...this.data.target,
            List: nextComments
          }
        });
      })
      .catch((err) => {
        console.warn("评论头像临时链接刷新失败", err);
      });
  },

  useCard() {
    const item = this.data.item || {};

    communityService
      .apiCommunityCardUse({
        card_id: item.card_id
      })
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};
        const card = data.card || data || item;

        app.globalData.task_data.spot_url = card.image_url || item.image_url || "";
        app.globalData.task_data.request =
          card.emotion_text || item.emotion_text || "";
        app.globalData.task_data.card_id = item.card_id || "";
        landscapeUtil.syncTaskLandscape(
          app.globalData.task_data,
          card.landscape || item.landscape || "sharepool"
        );

        wx.navigateTo({
          url: "/pages/dialogue/dialogue"
        });
      })
      .catch((err) => {
        console.error("使用卡片失败", err);
        wx.showToast({
          title: "使用失败",
          icon: "none"
        });
      });
  },

  usePostCard() {
    const item = this.data.item || {};

    if (!item.card_id) {
      wx.showToast({
        title: "暂无绑定卡片",
        icon: "none"
      });
      return;
    }

    communityService
      .apiCommunityCardUse({
        card_id: item.card_id
      })
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};

        const card = data.card || data || {};

        app.globalData.task_data.spot_url = card.image_url || "";
        app.globalData.task_data.request = card.emotion_text || "";
        app.globalData.task_data.card_id = item.card_id || "";
        landscapeUtil.syncTaskLandscape(
          app.globalData.task_data,
          card.landscape || item.landscape || "sharepool"
        );

        wx.navigateTo({
          url: "/pages/dialogue/dialogue"
        });
      })
      .catch((err) => {
        console.error("使用绑定卡片失败", err);
        wx.showToast({
          title: "使用失败",
          icon: "none"
        });
      });
  },

  favoriteCurrent() {
    const openid = app.globalData.task_data && app.globalData.task_data.openid;
    const item = this.data.item || {};
    const type = this.data.type;
    const id = type === "post" ? item.post_id : item.card_id;

    if (!openid || !id) {
      wx.showToast({
        title: "暂不能收藏",
        icon: "none"
      });
      return;
    }

    return profileStore
      .toggleFavorite(openid, type, id)
      .then((res) => {
        const currentTarget = this.data.target || {};
        const currentFavorites = Number(currentTarget.favorites) || 0;
        const favorites = res && res.isFavorited
          ? currentFavorites + 1
          : Math.max(0, currentFavorites - 1);

        this.setData({
          target: {
            ...currentTarget,
            favorites
          }
        });

        wx.showToast({
          title: res && res.isFavorited ? "已收藏" : "已取消",
          icon: "success"
        });
      })
      .catch((err) => {
        console.error("收藏失败", err);
        wx.showToast({
          title: "收藏失败",
          icon: "none"
        });
      });
  }
});
