const profileStore = require("./profileStore.js");

function isRemoteUrl(url) {
  return /^https?:\/\//.test(url) && !url.startsWith("http://tmp/");
}

function isCloudFileID(url) {
  return /^cloud:\/\/./.test(url);
}

function getAvatarExtension(path) {
  const match = String(path || "").match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match ? match[1].toLowerCase() : "jpg";
}

function getTempFileURL(fileID) {
  if (!fileID) {
    return Promise.resolve("");
  }

  return wx.cloud
    .getTempFileURL({
      fileList: [fileID]
    })
    .then((urlRes) => {
      const item = urlRes.fileList && urlRes.fileList[0];
      const tempFileURL = item && item.tempFileURL;

      if (!tempFileURL) {
        throw new Error("missing avatar temp file url");
      }

      return tempFileURL;
    });
}

function normalizeAvatar(avatarUrl, avatarFileID) {
  // 1. 有 fileID → 直接换临时链接
  if (avatarFileID) {
    return getTempFileURL(avatarFileID).then((nextAvatarUrl) => ({
      avatarUrl: nextAvatarUrl,
      avatarFileID
    }));
  }

  // 2. 空值 → 返回空
  if (!avatarUrl) {
    return Promise.resolve({
      avatarUrl: "",
      avatarFileID: ""
    });
  }

  // 3. 远程 https URL → 直接使用
  if (isRemoteUrl(avatarUrl)) {
    return Promise.resolve({
      avatarUrl,
      avatarFileID: ""
    });
  }

  // ====== 新增 ======
  // 4. cloud:// 云文件ID → 获取临时链接
  if (isCloudFileID(avatarUrl)) {
    return getTempFileURL(avatarUrl).then((tempUrl) => ({
      avatarUrl: tempUrl,
      avatarFileID: avatarUrl  // 把 cloud:// 本身当作 fileID 存下
    }));
  }
  // ====== 新增结束 ======

  // 5. 本地临时文件路径 → 上传到云存储
  return wx.cloud
    .uploadFile({
      cloudPath:
        "community-avatar-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 8) +
        "." +
        getAvatarExtension(avatarUrl),
      filePath: avatarUrl
    })
    .then((uploadRes) => {
      const fileID = uploadRes.fileID;

      if (!fileID) {
        throw new Error("missing avatar file id");
      }

      return getTempFileURL(fileID).then((nextAvatarUrl) => ({
        avatarUrl: nextAvatarUrl,
        avatarFileID: fileID
      }));
    });
}

function saveUserInfo(openid, userInfo) {
  const safeUserInfo = userInfo || {};

  return normalizeAvatar(
    safeUserInfo.avatarUrl || "",
    safeUserInfo.avatarFileID || ""
  ).then((avatar) => {
    const nextUserInfo = {
      nickName: safeUserInfo.nickName || "用户",
      avatarUrl: avatar.avatarUrl,
      avatarFileID: avatar.avatarFileID
    };

    return profileStore
      .saveUserInfo(openid, nextUserInfo)
      .then(() => nextUserInfo);
  });
}

module.exports = {
  getTempFileURL,
  normalizeAvatar,
  saveUserInfo
};
