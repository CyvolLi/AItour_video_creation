const assert = require("assert");
const avatarRefresh = require("../miniprogram/utils/avatarRefresh.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

test("updates matching item avatar without mutating the original list", () => {
  const list = [
    { target_id: "a", author_avatar: "old-a" },
    { target_id: "b", author_avatar: "old-b" }
  ];

  const next = avatarRefresh.updateListItemAvatar(
    list,
    "target_id",
    "b",
    "fresh-b"
  );

  assert.strictEqual(next[0].author_avatar, "old-a");
  assert.strictEqual(next[1].author_avatar, "fresh-b");
  assert.strictEqual(list[1].author_avatar, "old-b");
});

test("returns the same list when the matching id is missing", () => {
  const list = [{ target_id: "a", author_avatar: "old-a" }];

  const next = avatarRefresh.updateListItemAvatar(
    list,
    "target_id",
    "",
    "fresh"
  );

  assert.deepStrictEqual(next, list);
});
