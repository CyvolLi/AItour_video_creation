const COMMENT_COLLECTION = "comments";

function getDb() {
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

function listByTarget(targetId, limit) {
  const db = getDb();

  if (!db || !targetId) {
    return Promise.resolve([]);
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
      return list.map(normalizeComment);
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

  if (!db || !comment.target_id || !comment.content.trim()) {
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
      return comment;
    });
}

module.exports = {
  listByTarget,
  addComment,
  normalizeComment
};
