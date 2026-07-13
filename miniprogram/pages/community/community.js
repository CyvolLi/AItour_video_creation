const communityService = require("../../utils/communityService.js");
const profileStore = require("../../utils/profileStore.js");
const avatarStore = require("../../utils/avatarStore.js");
const avatarRefresh = require("../../utils/avatarRefresh.js");
const landscapeUtil = require("../../utils/landscape.js");
const app = getApp();

const DEFAULT_USER_AVATAR = "../../images/default.jpg";

Page({
  data: {
    activeTab: "post",
    landscapeOptions: landscapeUtil.LANDSCAPE_OPTIONS,
    currentLandscape: landscapeUtil.getLandscapeOption("sharepool"),
    landscapeIndex: 0,
    pageSize: 10,
    postPage: 1,
    cardPage: 1,
    postList: [],
    cardList: [],
    postHasMore: true,
    cardHasMore: true,
    loading: false,
    currentListLength: 0,
    hasMore: true,
    leftList: [],
    rightList: [],
    showPublishMenu: false
  },

  onLoad() {
    this.syncLandscapeState();
    this.refreshCurrent();
  },

  onShow() {
    const nextLandscape = app.globalData.task_data.landscape || "sharepool";

    if (nextLandscape !== this.data.currentLandscape.id) {
      const option = this.syncLandscapeState();

      this.setData(
        {
          postPage: 1,
          cardPage: 1,
          postList: [],
          cardList: [],
          postHasMore: true,
          cardHasMore: true,
          currentListLength: 0,
          hasMore: true,
          leftList: [],
          rightList: []
        },
        () => {
          this.refreshCurrent();
        }
      );
      return option;
    }

    return this.syncLandscapeState();
  },

  syncLandscapeState() {
    const option = landscapeUtil.syncTaskLandscape(
      app.globalData.task_data,
      app.globalData.task_data.landscape || "sharepool"
    );
    const landscapeIndex = Math.max(
      0,
      this.data.landscapeOptions.findIndex((item) => item.id === option.id)
    );

    this.setData({
      currentLandscape: option,
      landscapeIndex
    });

    return option;
  },

  switchLandscape(e) {
    const landscape = e.currentTarget.dataset.landscape || "sharepool";
    const option = landscapeUtil.syncTaskLandscape(
      app.globalData.task_data,
      landscape
    );
    const landscapeIndex = Math.max(
      0,
      this.data.landscapeOptions.findIndex((item) => item.id === option.id)
    );

    this.setData(
      {
        currentLandscape: option,
        landscapeIndex,
        postPage: 1,
        cardPage: 1,
        postList: [],
        cardList: [],
        postHasMore: true,
        cardHasMore: true,
        currentListLength: 0,
        hasMore: true,
        leftList: [],
        rightList: []
      },
      () => {
        this.refreshCurrent();
      }
    );
  },

  onLandscapeSwiperChange(e) {
    const index = Number(e.detail.current);
    const option = this.data.landscapeOptions[index];

    if (!option || option.id === this.data.currentLandscape.id) {
      return;
    }

    this.switchLandscape({
      currentTarget: {
        dataset: {
          landscape: option.id
        }
      }
    });
  },

  onPullDownRefresh() {
    this.refreshCurrent().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  syncListState() {
    const list =
      this.data.activeTab === "post" ? this.data.postList : this.data.cardList;
    const hasMore =
      this.data.activeTab === "post"
        ? this.data.postHasMore
        : this.data.cardHasMore;
    const leftList = [];
    const rightList = [];

    list.forEach((item, index) => {
      const nextItem = {
        ...item,
        __index: index
      };

      if (index % 2 === 0) {
        leftList.push(nextItem);
      } else {
        rightList.push(nextItem);
      }
    });

    this.setData({
      currentListLength: list.length,
      hasMore,
      leftList,
      rightList
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;

    if (!tab || tab === this.data.activeTab) {
      return;
    }

    this.setData(
      {
        activeTab: tab
      },
      () => {
        const list = tab === "post" ? this.data.postList : this.data.cardList;
        this.syncListState();

        if (!list.length) {
          this.refreshCurrent();
        }
      }
    );
  },

  requestCommunityPost(page) {
    return communityService.apiCommunityPost({
      page,
      page_size: this.data.pageSize,
      landscape: app.globalData.task_data.landscape || "sharepool"
      
    });
  },

  requestCommunityCard(page) {
    return communityService.apiCommunityCard({
      page,
      page_size: this.data.pageSize,
      landscape: app.globalData.task_data.landscape || "sharepool"
    });
  },

  requestCurrentList(type, page) {
    return type === "post"
      ? this.requestCommunityPost(page)
      : this.requestCommunityCard(page);
  },

  getAuthorOpenid(item) {
    return item && (item.openid || item.author_openid || item.user_openid || "");
  },

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

  refreshCurrent() {
    const type = this.data.activeTab;

    this.setData({ loading: true });

    return this.requestCurrentList(type, 1)
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};
        const list = Array.isArray(data.list) ? data.list : [];
        return this.attachAuthorProfiles(list);
      })
      .then((list) => {

        if (type === "post") {
          this.setData({
            postList: list,
            postPage: 1,
            postHasMore: list.length >= this.data.pageSize
          });
        } else {
          this.setData({
            cardList: list,
            cardPage: 1,
            cardHasMore: list.length >= this.data.pageSize
          });
        }
      })
      .catch((err) => {
        console.error("社区列表加载失败", err);
        wx.showToast({
          title: "列表加载失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ loading: false });
        this.syncListState();
      });
  },

  loadMore() {
    if (this.data.loading || !this.data.hasMore) {
      return;
    }

    const type = this.data.activeTab;
    const nextPage =
      type === "post" ? this.data.postPage + 1 : this.data.cardPage + 1;

    this.setData({ loading: true });

    this.requestCurrentList(type, nextPage)
      .then((resp) => {
        const data = resp && resp.data ? resp.data : {};
        const list = Array.isArray(data.list) ? data.list : [];
        return this.attachAuthorProfiles(list);
      })
      .then((list) => {

        if (type === "post") {
          this.setData({
            postList: this.data.postList.concat(list),
            postPage: nextPage,
            postHasMore: list.length >= this.data.pageSize
          });
        } else {
          this.setData({
            cardList: this.data.cardList.concat(list),
            cardPage: nextPage,
            cardHasMore: list.length >= this.data.pageSize
          });
        }
      })
      .catch((err) => {
        console.error("更多内容加载失败", err);
        wx.showToast({
          title: "加载失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ loading: false });
        this.syncListState();
      });
  },

  getItem(type, index) {
    const list = type === "post" ? this.data.postList : this.data.cardList;
    return list[Number(index)];
  },

  refreshAvatarOnError(e) {
    const type = e.currentTarget.dataset.type;
    const index = Number(e.currentTarget.dataset.index);
    const item = this.getItem(type, index);
    const avatarFileID = avatarRefresh.getAvatarFileID(item);

    if (!avatarFileID) {
      return;
    }

    avatarStore
      .getTempFileURL(avatarFileID)
      .then((avatarUrl) => {
        const listKey = type === "post" ? "postList" : "cardList";
        const list = avatarRefresh.updateListItemAvatar(
          this.data[listKey],
          "target_id",
          item.target_id,
          avatarUrl
        );

        this.setData(
          {
            [listKey]: list
          },
          () => this.syncListState()
        );
      })
      .catch((err) => {
        console.warn("头像临时链接刷新失败", err);
      });
  },

  openDetail(e) {
    const type = e.currentTarget.dataset.type;
    const index = e.currentTarget.dataset.index;
    const item = this.getItem(type, index);

    if (!item) {
      return;
    }

    app.globalData.community_current_item = item;

    wx.navigateTo({
      url:
        "/pages/detail/detail?type=" +
        type +
        "&target_id=" +
        encodeURIComponent(item.target_id || "") +
        "&id=" +
        encodeURIComponent(item.post_id || item.card_id || "")
    });
  },

  useCard(e) {
    const item = this.getItem("card", e.currentTarget.dataset.index);

    if (!item) {
      return;
    }

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
          title: "使用卡片失败",
          icon: "none"
        });
      });
  },

  usePostCard(e) {
    const item = this.getItem("post", e.currentTarget.dataset.index);

    if (!item || !item.card_id) {
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
        console.error("使用卡片失败", err);
        wx.showToast({
          title: "使用卡片失败",
          icon: "none"
        });
      });
  },

  favoriteItem(e) {
    const type = e.currentTarget.dataset.type;
    const item = this.getItem(type, e.currentTarget.dataset.index);
    const openid = app.globalData.task_data && app.globalData.task_data.openid;
    const id = type === "post" ? item && item.post_id : item && item.card_id;

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
  },
  goPublishCurrent() {
    this.setData({ showPublishMenu: true });
  },

  // 隐藏发布菜单
  hidePublishMenu() {
    this.setData({ showPublishMenu: false });
  },
  goCardPublish() {
    wx.navigateTo({
      url: "/pages/card_publish/card_publish"
    });
  },

  goPostPublish() {
    app.globalData.task_data.card_id = "";
    wx.navigateTo({
      url: "/pages/publish/publish"
    });
  }, 
  goProfile() {
    wx.navigateTo({
      url: "/pages/profile/profile"
    });
  }
});
