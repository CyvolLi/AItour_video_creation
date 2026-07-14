const assert = require("assert");
const profileDelete = require("../miniprogram/utils/profileDelete.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

test("builds post delete payload from a profile post item", () => {
  const payload = profileDelete.buildDeletePayload("mypost", {
    post_id: "post_001",
    cover_url: "https://example.com/cover.png",
    video_url: "https://example.com/video.mp4"
  });

  assert.deepStrictEqual(payload, {
    post_id: "post_001",
    cover_url: "https://example.com/cover.png",
    video_url: "https://example.com/video.mp4"
  });
});

test("builds card delete payload from a profile card item", () => {
  const payload = profileDelete.buildDeletePayload("mycard", {
    card_id: "card_001",
    image_url: "https://example.com/card.png"
  });

  assert.deepStrictEqual(payload, {
    card_id: "card_001",
    image_url: "https://example.com/card.png"
  });
});

test("removes a deleted post without mutating the original list", () => {
  const list = [
    { post_id: "post_001", title: "A" },
    { post_id: "post_002", title: "B" }
  ];

  const next = profileDelete.removeDeletedItem(list, "mypost", {
    post_id: "post_001"
  });

  assert.deepStrictEqual(next, [{ post_id: "post_002", title: "B" }]);
  assert.strictEqual(list.length, 2);
});

test("returns false when current tab is not deletable", () => {
  assert.strictEqual(profileDelete.canDeleteFromTab("post_liked"), false);
  assert.strictEqual(profileDelete.canDeleteFromTab("card_liked"), false);
});
