const COMMENT_COLLECTION = "comments";
const COMMENT_CACHE_PREFIX = "comment_cache_";
const memoryCache = {};

function getDb() {
  if (typeof wx === "undefined") {
    return null;
  }

  if (!wx.cloud || !wx.cloud.database) {
    return null;
  }
  return wx.cloud.database();
}

function now() {
  return Date.now();
}

function createCommentId(targetId) {
  return [
    "comment",
    targetId || "target",
    Date.now(),
    Math.random().toString(36).slice(2, 8)
  ].join("_");
}

function getCacheKey(targetId) {
  return COMMENT_CACHE_PREFIX + String(targetId || "").replace(/[^a-zA-Z0-9]/g, "_");
}

function readStorage(key) {
  try {
    if (typeof wx.getStorageSync === "function") {
      return wx.getStorageSync(key);
    }
  } catch (err) {
    console.warn("评论缓存读取失败", err);
  }

  return null;
}

function writeStorage(key, value) {
  try {
    if (typeof wx.setStorageSync === "function") {
      wx.setStorageSync(key, value);
    }
  } catch (err) {
    console.warn("评论缓存写入失败", err);
  }
}

function normalizeComment(data) {
  const comment = data || {};

  return {
    _id: comment._id || "",
    comment_id: comment.comment_id || "",
    target_id: comment.target_id || "",
    target_type: comment.target_type || "",
    author_openid: comment.author_openid || comment.openid || "",
    content: comment.content || "",
    status: comment.status || "published",
    created_at: comment.created_at || now(),
    updated_at: comment.updated_at || now()
  };
}

function setCachedComments(targetId, comments) {
  if (!targetId) {
    return [];
  }

  const key = getCacheKey(targetId);
  const normalized = (Array.isArray(comments) ? comments : []).map(normalizeComment);

  memoryCache[key] = normalized;
  writeStorage(key, normalized);

  return normalized;
}

function getCachedComments(targetId) {
  if (!targetId) {
    return [];
  }

  const key = getCacheKey(targetId);

  if (Array.isArray(memoryCache[key])) {
    return memoryCache[key].slice();
  }

  const stored = readStorage(key);
  const normalized = Array.isArray(stored) ? stored.map(normalizeComment) : [];
  memoryCache[key] = normalized;

  return normalized.slice();
}

function appendCachedComment(targetId, comment) {
  const cached = getCachedComments(targetId);
  const nextComments = cached.concat([normalizeComment(comment)]);

  return setCachedComments(targetId, nextComments);
}

function listByTarget(targetId, limit) {
  const db = getDb();

  if (!targetId) {
    return Promise.resolve([]);
  }

  if (!db) {
    return Promise.resolve(getCachedComments(targetId));
  }

  return db
    .collection(COMMENT_COLLECTION)
    .where({
      target_id: targetId,
      status: "published"
    })
    .orderBy("created_at", "asc")
    .limit(limit || 50)
    .get()
    .then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      return setCachedComments(targetId, list);
    })
    .catch((err) => {
      err.cachedComments = getCachedComments(targetId);
      throw err;
    });
}

function addComment(data) {
  const db = getDb();
  const comment = normalizeComment({
    ...data,
    comment_id: data.comment_id || createCommentId(data.target_id),
    status: data.status || "published",
    created_at: now(),
    updated_at: now()
  });

  if (!comment.target_id || !comment.content.trim()) {
    return Promise.resolve(comment);
  }

  if (!db) {
    appendCachedComment(comment.target_id, comment);
    return Promise.resolve(comment);
  }

  return db
    .collection(COMMENT_COLLECTION)
    .add({
      data: {
        comment_id: comment.comment_id,
        target_id: comment.target_id,
        target_type: comment.target_type,
        author_openid: comment.author_openid,
        content: comment.content,
        status: comment.status,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }
    })
    .then((res) => {
      comment._id = res._id;
      appendCachedComment(comment.target_id, comment);
      return comment;
    });
}

module.exports = {
  listByTarget,
  addComment,
  normalizeComment,
  getCachedComments,
  setCachedComments
};
