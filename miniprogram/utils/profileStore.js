const PROFILE_COLLECTION = "profiles";

function getDb() {
  if (!wx.cloud || !wx.cloud.database) {
    return null;
  }
  return wx.cloud.database();
}

function normalizeProfile(openid, data) {
  const legacyPostList = Array.isArray(data && data.post_list) ? data.post_list : [];
  const legacyCardList = Array.isArray(data && data.card_list) ? data.card_list : [];

  return {
    openid,
    nickName: (data && data.nickName) || (data && data.nick_name) || "用户",
    avatarUrl: (data && data.avatarUrl) || (data && data.avatar_url) || "",
    avatarFileID:
      (data && data.avatarFileID) || (data && data.avatar_file_id) || "",
    created_post_list: Array.isArray(data && data.created_post_list)
      ? data.created_post_list
      : legacyPostList,
    created_card_list: Array.isArray(data && data.created_card_list)
      ? data.created_card_list
      : legacyCardList,
    favorite_post_list: Array.isArray(data && data.favorite_post_list)
      ? data.favorite_post_list
      : [],
    favorite_card_list: Array.isArray(data && data.favorite_card_list)
      ? data.favorite_card_list
      : []
  };
}

function ensureProfile(openid) {
  const db = getDb();

  if (!db || !openid) {
    return Promise.resolve(normalizeProfile(openid, {}));
  }

  return db
    .collection(PROFILE_COLLECTION)
    .where({ openid })
    .limit(1)
    .get()
    .then((res) => {
      const existed = res.data && res.data[0];

      if (existed) {
        return normalizeProfile(openid, existed);
      }

      const profile = normalizeProfile(openid, {});

      return db
        .collection(PROFILE_COLLECTION)
        .add({
          data: {
            ...profile,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        })
        .then(() => profile);
    });
}

function getProfilesByOpenids(openids) {
  const db = getDb();
  const uniqueOpenids = Array.from(new Set((openids || []).filter(Boolean)));

  if (!db || !uniqueOpenids.length) {
    return Promise.resolve({});
  }

  const _ = db.command;

  return db
    .collection(PROFILE_COLLECTION)
    .where({
      openid: _.in(uniqueOpenids)
    })
    .get()
    .then((res) => {
      const profiles = {};
      const list = Array.isArray(res.data) ? res.data : [];

      list.forEach((item) => {
        const profile = normalizeProfile(item.openid, item);
        profiles[profile.openid] = profile;
      });

      return profiles;
    });
}

function updateProfileLists(openid, nextProfile) {
  const db = getDb();

  if (!db || !openid) {
    return Promise.resolve(nextProfile);
  }

  return db
    .collection(PROFILE_COLLECTION)
    .where({ openid })
    .limit(1)
    .get()
    .then((res) => {
      const existed = res.data && res.data[0];

      if (existed && existed._id) {
        return db
          .collection(PROFILE_COLLECTION)
          .doc(existed._id)
          .update({
            data: {
              created_post_list: nextProfile.created_post_list,
              created_card_list: nextProfile.created_card_list,
              favorite_post_list: nextProfile.favorite_post_list,
              favorite_card_list: nextProfile.favorite_card_list,
              updated_at: Date.now()
            }
          })
          .then(() => nextProfile);
      }

      return db
        .collection(PROFILE_COLLECTION)
        .add({
          data: {
            ...nextProfile,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        })
        .then(() => nextProfile);
    });
}

function updateProfileUserInfo(openid, userInfo) {
  const db = getDb();
  const safeUserInfo = userInfo || {};

  if (!db || !openid) {
    return Promise.resolve(normalizeProfile(openid, safeUserInfo));
  }

  return ensureProfile(openid).then((profile) => {
    const nextProfile = normalizeProfile(openid, {
      ...profile,
      nickName: safeUserInfo.nickName || profile.nickName || "用户",
      avatarUrl: safeUserInfo.avatarUrl || profile.avatarUrl || "",
      avatarFileID: safeUserInfo.avatarFileID || profile.avatarFileID || ""
    });

    return db
      .collection(PROFILE_COLLECTION)
      .where({ openid })
      .limit(1)
      .get()
      .then((res) => {
        const existed = res.data && res.data[0];

        if (existed && existed._id) {
          return db
            .collection(PROFILE_COLLECTION)
            .doc(existed._id)
            .update({
              data: {
                nickName: nextProfile.nickName,
                avatarUrl: nextProfile.avatarUrl,
                avatarFileID: nextProfile.avatarFileID,
                updated_at: Date.now()
              }
            })
            .then(() => nextProfile);
        }

        return db
          .collection(PROFILE_COLLECTION)
          .add({
            data: {
              ...nextProfile,
              created_at: Date.now(),
              updated_at: Date.now()
            }
          })
          .then(() => nextProfile);
      });
  });
}

function listHasId(list, id) {
  return Array.isArray(list) && list.some((item) => item && item.id === id);
}

function appendUnique(list, id) {
  const safeList = Array.isArray(list) ? list.slice() : [];

  if (!id || listHasId(safeList, id)) {
    return safeList;
  }

  return safeList.concat([{ id }]);
}

function toggleId(list, id) {
  const safeList = Array.isArray(list) ? list.slice() : [];

  if (!id) {
    return safeList;
  }

  if (listHasId(safeList, id)) {
    return safeList.filter((item) => item && item.id !== id);
  }

  return safeList.concat([{ id }]);
}

function saveCreatedId(openid, type, id) {
  return ensureProfile(openid).then((profile) => {
    const nextProfile = normalizeProfile(openid, profile);

    if (type === "post") {
      nextProfile.created_post_list = appendUnique(
        nextProfile.created_post_list,
        id
      );
    }

    if (type === "card") {
      nextProfile.created_card_list = appendUnique(
        nextProfile.created_card_list,
        id
      );
    }

    return updateProfileLists(openid, nextProfile);
  });
}

function toggleFavorite(openid, type, id) {
  return ensureProfile(openid).then((profile) => {
    const nextProfile = normalizeProfile(openid, profile);

    if (type === "post") {
      nextProfile.favorite_post_list = toggleId(
        nextProfile.favorite_post_list,
        id
      );
    }

    if (type === "card") {
      nextProfile.favorite_card_list = toggleId(
        nextProfile.favorite_card_list,
        id
      );
    }

    return updateProfileLists(openid, nextProfile).then((savedProfile) => ({
      profile: savedProfile,
      isFavorited:
        type === "post"
          ? listHasId(savedProfile.favorite_post_list, id)
          : listHasId(savedProfile.favorite_card_list, id)
    }));
  });
}

module.exports = {
  ensureProfile,
  getProfilesByOpenids,
  saveUserInfo: updateProfileUserInfo,
  saveCreatedId,
  toggleFavorite,
  listHasId
};
