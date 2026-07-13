const COMMUNITY_API = require("./communityApi.js");

const BASE_URL = "https://ruralv.cn";

function post(url, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      data,
      method: "POST",
      header: {
        "Content-Type": "application/json"
      },
      success: (resp) => {
        if (resp.statusCode >= 400) {
          reject(resp);
          return;
        }
        resolve(resp);
      },
      fail: reject
    });
  });
}

function apiCommunityPost(data) {
  return post(COMMUNITY_API.postList, data);
}

function apiCommunityCard(data) {
  return post(COMMUNITY_API.cardList, data);
}

function apiCommunityCardPublish(data) {
  return post(COMMUNITY_API.cardPublish, data);
}

function apiCommunityCardUse(data) {
  return post(COMMUNITY_API.cardUse, data);
}

function apiCommunityPostPublish(data) {
  return post(COMMUNITY_API.postPublish, data);
}

function apiProfileMypost(data) {
  return post(COMMUNITY_API.profileMyPost, data);
}

function apiProfileMycard(data) {
  return post(COMMUNITY_API.profileMyCard, data);
}

function apiProfilePostLiked(data) {
  return post(COMMUNITY_API.profilePostLiked, data);
}

function apiProfileCardLiked(data) {
  return post(COMMUNITY_API.profileCardLiked, data);
}

function apiProfilePostDelete(data) {
  return post(COMMUNITY_API.profilePostDelete, data);
}

function apiProfileCardDelete(data) {
  return post(COMMUNITY_API.profileCardDelete, data);
}

module.exports = {
  apiCommunityPost,
  apiCommunityCard,
  apiCommunityCardPublish,
  apiCommunityCardUse,
  apiCommunityPostPublish,
  apiProfileMypost,
  apiProfileMycard,
  apiProfilePostLiked,
  apiProfileCardLiked,
  apiProfilePostDelete,
  apiProfileCardDelete
};
