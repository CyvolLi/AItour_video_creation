const assert = require("assert");
const path = require("path");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

async function withProfilePage(appStub, run, stubs = {}) {
  const modulePath = require.resolve(
    path.join(__dirname, "../miniprogram/pages/profile/profile.js")
  );
  const communityPath = require.resolve(
    path.join(__dirname, "../miniprogram/utils/communityService.js")
  );
  const profileStorePath = require.resolve(
    path.join(__dirname, "../miniprogram/utils/profileStore.js")
  );
  const previousPage = global.Page;
  const previousGetApp = global.getApp;
  const previousWx = global.wx;
  const previousCommunity = require.cache[communityPath];
  const previousProfileStore = require.cache[profileStorePath];
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  let definition;

  delete require.cache[modulePath];

  if (stubs.communityService) {
    require.cache[communityPath] = {
      id: communityPath,
      filename: communityPath,
      loaded: true,
      exports: stubs.communityService
    };
  }

  if (stubs.profileStore) {
    require.cache[profileStorePath] = {
      id: profileStorePath,
      filename: profileStorePath,
      loaded: true,
      exports: stubs.profileStore
    };
  }

  global.Page = (value) => {
    definition = value;
  };
  global.getApp = () => appStub;
  global.wx = {
    showToast() {},
    navigateTo() {},
    navigateBack() {},
    reLaunch() {}
  };

  try {
    require(modulePath);
    assert.ok(definition, "profile.js should register a Page definition");
    return await run(definition);
  } finally {
    delete require.cache[modulePath];
    if (previousCommunity) require.cache[communityPath] = previousCommunity;
    else delete require.cache[communityPath];
    if (previousProfileStore) require.cache[profileStorePath] = previousProfileStore;
    else delete require.cache[profileStorePath];
    if (hadPage) global.Page = previousPage;
    else delete global.Page;
    if (hadGetApp) global.getApp = previousGetApp;
    else delete global.getApp;
    if (hadWx) global.wx = previousWx;
    else delete global.wx;
  }
}

function createPageInstance(definition) {
  return {
    ...definition,
    data: { ...definition.data, cache: { ...definition.data.cache } },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

test("profile onLoad preloads mycard without replacing the current mypost list", async () => {
  const appStub = {
    globalData: {
      task_data: {
        openid: "openid-profile",
        landscape: "sharepool"
      },
      userInfo: {
        nickName: "测试用户",
        avatarUrl: ""
      }
    },
    loadUserProfile() {
      return Promise.resolve({
        nickName: "测试用户",
        avatarUrl: ""
      });
    }
  };
  const communityService = {
    apiProfileMypost() {
      return Promise.resolve({
        data: {
          list: [{ post_id: "post-1", target_id: "target-post-1" }]
        }
      });
    },
    apiProfileMycard() {
      return Promise.resolve({
        data: {
          list: [{ card_id: "card-1", target_id: "target-card-1" }]
        }
      });
    },
    apiProfilePostLiked() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiProfileCardLiked() {
      return Promise.resolve({ data: { list: [] } });
    }
  };
  const profileStore = {
    ensureProfile(openid) {
      return Promise.resolve({
        openid,
        created_post_list: [],
        created_card_list: [],
        favorite_post_list: [],
        favorite_card_list: []
      });
    },
    getProfilesByOpenids() {
      return Promise.resolve({});
    }
  };

  await withProfilePage(
    appStub,
    async (definition) => {
      const page = createPageInstance(definition);
      await page.onLoad.call(page);
      await new Promise((resolve) => setImmediate(resolve));

      assert.strictEqual(page.data.activeTab, "mypost");
      assert.deepStrictEqual(page.data.currentList, [
        { post_id: "post-1", target_id: "target-post-1" }
      ]);
      assert.deepStrictEqual(page.data.cache.mycard, [
        { card_id: "card-1", target_id: "target-card-1" }
      ]);
    },
    { communityService, profileStore }
  );
});

test("profile onLoad updates mypost and mycard counts in the same render", async () => {
  const cacheUpdates = [];
  const appStub = {
    globalData: {
      task_data: {
        openid: "openid-profile",
        landscape: "sharepool"
      },
      userInfo: {}
    },
    loadUserProfile() {
      return Promise.resolve({});
    }
  };
  const communityService = {
    apiProfileMypost() {
      return Promise.resolve({
        data: {
          list: [{ post_id: "post-1", target_id: "target-post-1" }]
        }
      });
    },
    apiProfileMycard() {
      return Promise.resolve({
        data: {
          list: [{ card_id: "card-1", target_id: "target-card-1" }]
        }
      });
    },
    apiProfilePostLiked() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiProfileCardLiked() {
      return Promise.resolve({ data: { list: [] } });
    }
  };
  const profileStore = {
    ensureProfile(openid) {
      return Promise.resolve({
        openid,
        created_post_list: [],
        created_card_list: [],
        favorite_post_list: [],
        favorite_card_list: []
      });
    },
    getProfilesByOpenids() {
      return Promise.resolve({});
    }
  };

  await withProfilePage(
    appStub,
    async (definition) => {
      const page = {
        ...createPageInstance(definition),
        setData(update) {
          Object.assign(this.data, update);
          if (update.cache) {
            cacheUpdates.push({
              mypost: update.cache.mypost.length,
              mycard: update.cache.mycard.length
            });
          }
        }
      };

      await page.onLoad.call(page);
      await new Promise((resolve) => setImmediate(resolve));

      assert.deepStrictEqual(cacheUpdates, [
        {
          mypost: 1,
          mycard: 1
        }
      ]);
    },
    { communityService, profileStore }
  );
});

test("profile mycard falls back to legacy community cards created by the current user", async () => {
  const appStub = {
    globalData: {
      task_data: {
        openid: "openid-profile",
        landscape: "sharepool"
      },
      userInfo: {}
    }
  };
  const communityCalls = [];
  const communityService = {
    apiProfileMypost() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiProfileMycard() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiProfilePostLiked() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiProfileCardLiked() {
      return Promise.resolve({ data: { list: [] } });
    },
    apiCommunityCard(payload) {
      communityCalls.push(payload);
      return Promise.resolve({
        data: {
          list: [
            {
              card_id: "card-owned",
              target_id: "target-owned",
              openid: "openid-profile"
            },
            {
              card_id: "card-other",
              target_id: "target-other",
              openid: "openid-other"
            }
          ]
        }
      });
    }
  };

  await withProfilePage(
    appStub,
    async (definition) => {
      const page = createPageInstance(definition);
      await page.loadTab("mycard");
      await new Promise((resolve) => setImmediate(resolve));

      assert.deepStrictEqual(page.data.currentList, [
        {
          card_id: "card-owned",
          target_id: "target-owned",
          openid: "openid-profile"
        }
      ]);
      assert.deepStrictEqual(page.data.cache.mycard, page.data.currentList);
      assert.ok(
        communityCalls.some((payload) => payload.landscape === "sharepool"),
        "legacy fallback should check the current landscape"
      );
    },
    {
      communityService,
      profileStore: {
        ensureProfile(openid) {
          return Promise.resolve({
            openid,
            created_post_list: [],
            created_card_list: [],
            favorite_post_list: [],
            favorite_card_list: []
          });
        },
        getProfilesByOpenids() {
          return Promise.resolve({});
        }
      }
    }
  );
});

async function main() {
  for (const item of testCases) {
    try {
      await item.fn();
      console.log("ok - " + item.name);
    } catch (err) {
      console.error("not ok - " + item.name);
      console.error(err);
      process.exitCode = 1;
    }
  }
}

main();
