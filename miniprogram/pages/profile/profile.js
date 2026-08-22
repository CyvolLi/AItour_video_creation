const communityService = require("../../utils/communityService.js");
const profileStore = require("../../utils/profileStore.js");
const avatarStore = require("../../utils/avatarStore.js");
const avatarRefresh = require("../../utils/avatarRefresh.js");
const profileDelete = require("../../utils/profileDelete.js");
const app = getApp();

Page({
  data: {
    activeTab: "mypost",
    userInfo: {},
    profile: {
      openid: "",
      created_post_list: [],
      created_card_list: [],
      favorite_post_list: [],
      favorite_card_list: []
    },
    currentList: [],
    cache: {
      mypost: [],
      mycard: [],
      post_liked: [],
      card_liked: []
    },
    showPublishMenu: false,
    deleteTargetIndex: -1,
    deleteConfirmVisible: false,
    pendingDelete: null,
    deleting: false,
    loading: false
  },

  onLoad() {
    this.profileLoadedOnce = false;
    this.setData({
      userInfo: app.globalData.userInfo || {}
    });
    this.refreshCurrentUserInfo();
    return this.loadProfile();
  },

  onShow() {
    const refreshUserInfo = this.refreshCurrentUserInfo();

    if (!this.profileLoadedOnce) {
      return refreshUserInfo;
    }

    return Promise.resolve(refreshUserInfo).then(() => this.refreshPrimaryTabs());
  },

  refreshCurrentUserInfo() {
    const openid = app.globalData.task_data && app.globalData.task_data.openid;

    if (openid && app.loadUserProfile) {
      return app.loadUserProfile(openid).then((userInfo) => {
        if (!userInfo) {
          return null;
        }

        this.setData({
          userInfo
        });

        return userInfo;
      });
    }

    if (!app.ensureUserInfo) {
      return Promise.resolve(null);
    }

    return app.ensureUserInfo().then((userInfo) => {
      if (!userInfo) {
        return null;
      }

      this.setData({
        userInfo
      });

      return userInfo;
    });
  },

  loadProfile() {
    const openid = app.globalData.task_data && app.globalData.task_data.openid;

    if (!openid && app.userInfoReady && typeof app.userInfoReady.then === "function") {
      return app.userInfoReady.then(() => this.loadProfile());
    }

    if (!openid) {
      wx.showToast({
        title: "用户初始化失败，请稍后重试",
        icon: "none"
      });
      return;
    }

    return profileStore
      .ensureProfile(openid)
      .then((profile) => {
        this.setData({ profile });
        return this.refreshPrimaryTabs();
      })
      .catch((err) => {
        console.error("profile 加载失败", err);
      })
      .finally(() => {
        this.profileLoadedOnce = true;
      });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;

    if (!tab || tab === this.data.activeTab) {
      return;
    }

    this.setData(
      {
        activeTab: tab,
        deleteTargetIndex: -1,
        deleteConfirmVisible: false,
        pendingDelete: null
      },
      () => {
        this.loadTab(tab);
      }
    );
  },

  requestProfileList(tab, payload) {
    const map = {
      mypost: communityService.apiProfileMypost,
      mycard: communityService.apiProfileMycard,
      post_liked: communityService.apiProfilePostLiked,
      card_liked: communityService.apiProfileCardLiked
    };
    const request = map[tab];

    if (!request) {
      return Promise.resolve({ data: { list: [] } });
    }

    return request(payload).then((resp) => {
      if (tab !== "mycard") {
        return resp;
      }

      const list = this.getResponseList(resp);

      if (list.length) {
        return resp;
      }

      return this.requestLegacyMycardList(payload && payload.openid).then(
        (legacyList) => {
          if (!legacyList.length) {
            return resp;
          }

          return {
            ...resp,
            data: {
              ...((resp && resp.data) || {}),
              list: legacyList
            }
          };
        }
      );
    });
  },

  getResponseList(resp) {
    const data = resp && resp.data ? resp.data : {};
    return Array.isArray(data.list) ? data.list : [];
  },

  getAuthorOpenid(item) {
    return (
      (item &&
        (item.openid ||
          item.author_openid ||
          item.user_openid ||
          item.creator_openid ||
          item.creatorOpenid)) ||
      ""
    );
  },

  dedupeByCardId(list) {
    const seen = {};
    const result = [];

    (Array.isArray(list) ? list : []).forEach((item) => {
      const id = item && (item.card_id || item.target_id || item.id);

      if (!id || seen[id]) {
        return;
      }

      seen[id] = true;
      result.push(item);
    });

    return result;
  },

  requestLegacyMycardList(openid) {
    if (!openid || !communityService.apiCommunityCard) {
      return Promise.resolve([]);
    }

    const taskData = app.globalData.task_data || {};
    const currentLandscape = taskData.landscape || "sharepool";
    const landscapes = Array.from(
      new Set([currentLandscape, "sharepool", "001", "002"].filter(Boolean))
    );

    return Promise.all(
      landscapes.map((landscape) =>
        communityService
          .apiCommunityCard({
            page: 1,
            page_size: 100,
            landscape
          })
          .then((resp) => this.getResponseList(resp))
          .catch((err) => {
            console.warn("legacy mycard fallback failed", err);
            return [];
          })
      )
    ).then((groups) =>
      this.dedupeByCardId(
        groups
          .reduce((all, list) => all.concat(list), [])
          .filter((item) => this.getAuthorOpenid(item) === openid)
      )
    );
  },

  attachAuthorProfiles(list) {
    const safeList = Array.isArray(list) ? list : [];
    const openids = safeList.map((item) => item && item.openid).filter(Boolean);

    if (!openids.length) {
      return Promise.resolve(safeList);
    }

    return profileStore
      .getProfilesByOpenids(openids)
      .then((profileMap) => {
        const normalizedProfiles = {};

        return Promise.all(
          Object.keys(profileMap).map((openid) => {
            const profile = profileMap[openid];

            return avatarStore
              .normalizeAvatar(profile.avatarUrl || "", profile.avatarFileID || "")
              .then((avatar) => {
                normalizedProfiles[openid] = {
                  ...profile,
                  avatarUrl: avatar.avatarUrl,
                  avatarFileID: avatar.avatarFileID
                };
              });
          })
        ).then(() =>
          safeList.map((item) => {
            const profile = normalizedProfiles[item.openid];

            if (!profile) {
              return item;
            }

            return {
              ...item,
              author_name: profile.nickName || item.author_name || "用户",
              author_avatar: profile.avatarUrl || item.author_avatar || "",
              author_avatar_file_id:
                profile.avatarFileID || item.author_avatar_file_id || ""
            };
          })
        );
      })
      .catch((err) => {
        console.error("空间作者资料补全失败", err);
        return safeList;
      });
  },

  getPayload(tab) {
    const openid = app.globalData.task_data && app.globalData.task_data.openid;

    if (tab === "mypost" || tab === "mycard") {
      return { openid };
    }

    if (tab === "post_liked") {
      return {
        post_list: this.data.profile.favorite_post_list || []
      };
    }

    return {
      card_list: this.data.profile.favorite_card_list || []
    };
  },

  loadProfileList(tab) {
    const payload = this.getPayload(tab);

    return this.requestProfileList(tab, payload)
      .then((resp) => this.getResponseList(resp))
      .then((list) => this.attachAuthorProfiles(list));
  },

  refreshPrimaryTabs() {
    this.setData({ loading: true });

    return Promise.all([
      this.loadProfileList("mypost"),
      this.loadProfileList("mycard")
    ])
      .then(([mypost, mycard]) => {
        const nextCache = {
          ...this.data.cache,
          mypost,
          mycard
        };
        const update = {
          cache: nextCache
        };

        if (this.data.activeTab === "mypost") {
          update.currentList = mypost;
        }

        if (this.data.activeTab === "mycard") {
          update.currentList = mycard;
        }

        this.setData(update);
      })
      .catch((err) => {
        console.error("profile primary tabs refresh failed", err);
        wx.showToast({
          title: "加载失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loadTab(tab) {
  this.setData({ loading: true });

  return this.loadProfileList(tab)
    .then((list) => {
      const nextCache = {
        ...this.data.cache,
        [tab]: list
      };

      this.setData({
        cache: nextCache,
        currentList: list
      });
    })
    .catch((err) => {
      console.error("空间列表加载失败", err);
      wx.showToast({
        title: "加载失败",
        icon: "none"
      });
    })
    .finally(() => {
      this.setData({ loading: false });
    });
  },

  preloadTab(tab) {
    return this.loadProfileList(tab)
      .then((list) => {
        const nextCache = {
          ...this.data.cache,
          [tab]: list
        };

        this.setData({
          cache: nextCache
        });
      })
      .catch((err) => {
        console.warn("profile preload failed", err);
      });
  },

  openDetail(e) {
    if (this.data.deleting) {
      return;
    }
    
    if (this.data.deleteTargetIndex !== -1) {
    this.cancelDeleteMode();
    return;
  }

    const item = this.data.currentList[Number(e.currentTarget.dataset.index)];
    
    if (!item) {
      return;
    }

    const type = item.post_id ? "post" : "card";
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

  refreshProfileAvatarOnError() {
    const userInfo = this.data.userInfo || {};
    const avatarFileID = avatarRefresh.getAvatarFileID(userInfo);

    if (!avatarFileID) {
      return;
    }

    avatarStore
      .getTempFileURL(avatarFileID)
      .then((avatarUrl) => {
        const nextUserInfo = {
          ...this.data.userInfo,
          avatarUrl
        };

        app.globalData.userInfo = nextUserInfo;
        this.setData({
          userInfo: nextUserInfo
        });
      })
      .catch((err) => {
        console.warn("个人页头像临时链接刷新失败", err);
      });
  },

  showDeleteButton(e) {
    const tab = this.data.activeTab;

    if (!profileDelete.canDeleteFromTab(tab)) {
      return;
    }

    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.currentList[index];

    if (!item) {
      return;
    }

    this.setData({
      deleteTargetIndex: index
    });
  },
  
  cancelDeleteMode() {
  this.setData({
    deleteTargetIndex: -1
  });
},

  deleteCurrentItem(e) {
    if (this.data.deleting) {
      return;
    }

    const tab = this.data.activeTab;
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.currentList[index];
    const payload = profileDelete.buildDeletePayload(tab, item);
    const deleteId = profileDelete.getDeleteId(tab, item);

    if (!profileDelete.canDeleteFromTab(tab) || !item || !payload || !deleteId) {
      wx.showToast({
        title: "暂不能删除",
        icon: "none"
      });
      return;
    }

    this.setData({
      deleteConfirmVisible: true,
      pendingDelete: {
        tab,
        item,
        payload
      }
    });
  },

  cancelDelete() {
    if (this.data.deleting) {
      return;
    }

    this.setData({
      deleteConfirmVisible: false,
      pendingDelete: null
    });
  },

  confirmDelete() {
    const pendingDelete = this.data.pendingDelete;

    if (!pendingDelete || this.data.deleting) {
      return;
    }

    this.performDelete(
      pendingDelete.tab,
      pendingDelete.item,
      pendingDelete.payload
    );
  },

  performDelete(tab, item, payload) {
    const request =
      tab === "mypost"
        ? communityService.apiProfilePostDelete
        : communityService.apiProfileCardDelete;

    this.setData({ deleting: true });

    request(payload)
      .then(() => {
        const nextList = profileDelete.removeDeletedItem(
          this.data.currentList,
          tab,
          item
        );
        const nextCache = {
          ...this.data.cache,
          [tab]: profileDelete.removeDeletedItem(this.data.cache[tab], tab, item)
        };

        this.setData({
          currentList: nextList,
          cache: nextCache,
          deleteTargetIndex: -1,
          deleteConfirmVisible: false,
          pendingDelete: null
        });

        wx.showToast({
          title: "已删除",
          icon: "success"
        });
      })
      .catch((err) => {
        console.error("删除失败", err);
        wx.showToast({
          title: "删除失败",
          icon: "none"
        });
      })
      .finally(() => {
        this.setData({ deleting: false });
      });
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({
          url: "/pages/community/community"
        });
      }
    });
  },

  goCommunity() {
    wx.reLaunch({
      url: "/pages/community/community"
    });
  },

  goCreate() {
    this.setData({ showPublishMenu: true });
  },

    // 隐藏发布菜单
  hidePublishMenu() {
    this.setData({ showPublishMenu: false });
  },

  preventMove() {},

  // 发布视频帖子
goPublishPost() {
  app.globalData.task_data.card_id = "";
  wx.navigateTo({
    url: '/pages/publish/publish'
  });
},

goCreateTemplate() {
  wx.navigateTo({
    url: '/pages/card_publish/card_publish'
  });
}
});
