const STORAGE_KEY = "profile_cache_v1";
const MAX_AGE = 60 * 60 * 1000;

function createEntry(profile, savedAt) {
  const data = profile || {};

  return {
    openid: data.openid || "",
    nickName: data.nickName || "",
    avatarUrl: data.avatarUrl || "",
    avatarFileID: data.avatarFileID || "",
    savedAt: Number.isFinite(savedAt) ? savedAt : Date.now()
  };
}

function readEntry(rawEntry, now, expectedOpenid) {
  let entry = rawEntry;

  if (typeof entry === "string") {
    try {
      entry = JSON.parse(entry);
    } catch (err) {
      return null;
    }
  }

  if (!entry || !Number.isFinite(entry.savedAt)) {
    return null;
  }

  if (expectedOpenid && entry.openid !== expectedOpenid) {
    return null;
  }

  const currentTime = Number.isFinite(now) ? now : Date.now();

  if (currentTime - entry.savedAt > MAX_AGE) {
    return null;
  }

  return {
    nickName: entry.nickName || "",
    avatarUrl: entry.avatarUrl || "",
    avatarFileID: entry.avatarFileID || ""
  };
}

function load(expectedOpenid) {
  if (typeof wx === "undefined" || typeof wx.getStorageSync !== "function") {
    return null;
  }

  try {
    return readEntry(wx.getStorageSync(STORAGE_KEY), Date.now(), expectedOpenid);
  } catch (err) {
    console.warn("读取个人资料缓存失败", err);
    return null;
  }
}

function save(profile, openid) {
  const entry = createEntry({
    ...(profile || {}),
    openid: (profile && profile.openid) || openid || ""
  });

  if (typeof wx === "undefined" || typeof wx.setStorageSync !== "function") {
    return entry;
  }

  try {
    wx.setStorageSync(STORAGE_KEY, entry);
  } catch (err) {
    console.warn("保存个人资料缓存失败", err);
  }

  return entry;
}

function clear() {
  if (typeof wx === "undefined" || typeof wx.removeStorageSync !== "function") {
    return;
  }

  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (err) {
    console.warn("清理个人资料缓存失败", err);
  }
}

module.exports = {
  STORAGE_KEY,
  MAX_AGE,
  createEntry,
  readEntry,
  load,
  save,
  clear
};
