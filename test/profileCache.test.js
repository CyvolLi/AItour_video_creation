const assert = require("assert");
const profileCache = require("../miniprogram/utils/profileCache.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

test("keeps only display profile fields and save time", () => {
  const cached = profileCache.createEntry({
    openid: "openid-1",
    nickName: "小明",
    avatarUrl: "https://example.com/avatar.jpg",
    avatarFileID: "cloud://avatar",
    openid: "openid-1",
    created_post_list: ["post-1"]
  }, 1000);

  assert.deepStrictEqual(cached, {
    nickName: "小明",
    avatarUrl: "https://example.com/avatar.jpg",
    avatarFileID: "cloud://avatar",
    savedAt: 1000,
    openid: "openid-1"
  });
});

test("returns a fresh cached profile within the max age", () => {
  const cached = profileCache.createEntry(
    {
      openid: "openid-1",
      nickName: "小明",
      avatarUrl: "avatar",
      avatarFileID: "file"
    },
    1000
  );

  assert.deepStrictEqual(
    profileCache.readEntry(cached, 1000 + 60 * 60 * 1000, "openid-1"),
    {
    nickName: "小明",
    avatarUrl: "avatar",
    avatarFileID: "file"
    }
  );
});

test("ignores expired or malformed cached data", () => {
  assert.strictEqual(
    profileCache.readEntry(
      profileCache.createEntry({ nickName: "小明" }, 1000),
      1000 + profileCache.MAX_AGE + 1
    ),
    null
  );
  assert.strictEqual(profileCache.readEntry({ nickName: "小明" }, 1000), null);
  assert.strictEqual(
    profileCache.readEntry(
      profileCache.createEntry({ openid: "openid-1", nickName: "小明" }, 1000),
      1000,
      "openid-2"
    ),
    null
  );
});
