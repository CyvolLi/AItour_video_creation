const communityService = require("../../utils/communityService.js");
const commentStore = require("../../utils/commentStore.js");
const profileStore = require("../../utils/profileStore.js");
const avatarStore = require("../../utils/avatarStore.js");
const avatarRefresh = require("../../utils/avatarRefresh.js");
const landscapeUtil = require("../../utils/landscape.js");
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
    commenting: false
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
    const item = app.globalData.community_current_item || {};
    const target = item.target || item.Target || {};
    const type = options.type || item.type || "post";
    const id = options.id || item.post_id || item.card_id || "";

    this.attachAuthorProfiles([item]).then((items) => {
      this.setData({
        type,
        id,
        targetId: options.target_id || item.target_id || "",
        item: items[0] || item,
        target: this.normalizeTarget(target)
      });

      this.loadComments();
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

    profileStore
      .toggleFavorite(openid, type, id)
      .then((res) => {
        wx.showToast({
          title: res.isFavorited ? "已收藏" : "已取消",
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
