function updateListItemAvatar(list, idKey, idValue, avatarUrl) {
  const safeList = Array.isArray(list) ? list : [];

  if (!idKey || !idValue || !avatarUrl) {
    return safeList.slice();
  }

  return safeList.map((item) => {
    if (!item || item[idKey] !== idValue) {
      return item;
    }

    return {
      ...item,
      author_avatar: avatarUrl
    };
  });
}

function getAvatarFileID(item) {
  return (
    (item && item.author_avatar_file_id) ||
    (item && item.avatarFileID) ||
    (item && item.avatar_file_id) ||
    ""
  );
}

module.exports = {
  updateListItemAvatar,
  getAvatarFileID
};
