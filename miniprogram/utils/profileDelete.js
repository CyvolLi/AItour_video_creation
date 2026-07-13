function canDeleteFromTab(tab) {
  return tab === "mypost" || tab === "mycard";
}

function getDeleteId(tab, item) {
  const safeItem = item || {};

  if (tab === "mypost") {
    return safeItem.post_id || "";
  }

  if (tab === "mycard") {
    return safeItem.card_id || "";
  }

  return "";
}

function buildDeletePayload(tab, item) {
  const safeItem = item || {};

  if (tab === "mypost") {
    return {
      post_id: safeItem.post_id || "",
      cover_url: safeItem.cover_url || "",
      video_url: safeItem.video_url || ""
    };
  }

  if (tab === "mycard") {
    return {
      card_id: safeItem.card_id || "",
      image_url: safeItem.image_url || ""
    };
  }

  return null;
}

function removeDeletedItem(list, tab, item) {
  const safeList = Array.isArray(list) ? list : [];
  const deleteId = getDeleteId(tab, item);

  if (!deleteId) {
    return safeList.slice();
  }

  return safeList.filter((entry) => getDeleteId(tab, entry) !== deleteId);
}

module.exports = {
  canDeleteFromTab,
  getDeleteId,
  buildDeletePayload,
  removeDeletedItem
};
