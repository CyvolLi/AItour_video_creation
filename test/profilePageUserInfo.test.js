const assert = require("assert");

const modulePath = require.resolve(
  "../miniprogram/pages/profile/profile.js"
);

function createPageInstance(definition) {
  return {
    ...definition,
    data: { ...definition.data },
    setData(update, callback) {
      Object.assign(this.data, update);
      if (typeof callback === "function") {
        callback();
      }
    }
  };
}

async function withProfilePage(app, run) {
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  let definition;

  global.getApp = () => app;
  global.Page = (value) => {
    definition = value;
  };
  global.wx = {};

  try {
    delete require.cache[modulePath];
    require(modulePath);
    assert.ok(definition, "profile.js should register a Page definition");
    return await run(definition);
  } finally {
    if (previousModule) {
      require.cache[modulePath] = previousModule;
    } else {
      delete require.cache[modulePath];
    }

    if (hadGetApp) global.getApp = previousGetApp;
    else delete global.getApp;
    if (hadPage) global.Page = previousPage;
    else delete global.Page;
    if (hadWx) global.wx = previousWx;
    else delete global.wx;
  }
}

async function testRefreshesExistingUserInfo() {
  const cachedProfile = {
    nickName: "小明",
    avatarUrl: "cached-avatar",
    avatarFileID: "cloud://avatar"
  };
  const freshProfile = {
    nickName: "小明（已更新）",
    avatarUrl: "fresh-avatar",
    avatarFileID: "cloud://fresh-avatar"
  };
  let loadUserProfileCalls = 0;
  let resolveProfile;
  const app = {
    globalData: {
      task_data: { openid: "openid-1" },
      userInfo: cachedProfile
    },
    loadUserProfile() {
      loadUserProfileCalls += 1;
      return new Promise((resolve) => {
        resolveProfile = resolve;
      });
    }
  };

  await withProfilePage(app, async (definition) => {
    const instance = createPageInstance(definition);

    const refreshPromise = instance.refreshCurrentUserInfo();

    await Promise.resolve();
    assert.deepStrictEqual(instance.data.userInfo, cachedProfile);

    resolveProfile(freshProfile);
    await refreshPromise;

    assert.strictEqual(loadUserProfileCalls, 1);
    assert.deepStrictEqual(instance.data.userInfo, freshProfile);
  });
}

async function testWaitsForExistingUserInfoReady() {
  const profile = {
    nickName: "小明",
    avatarUrl: "ready-avatar",
    avatarFileID: "cloud://ready-avatar"
  };
  let resolveReady;
  let loadUserProfileCalls = 0;
  const userInfoReady = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const app = {
    globalData: {
      task_data: { openid: "openid-1" },
      userInfo: null
    },
    userInfoReady,
    loadUserProfile() {
      loadUserProfileCalls += 1;
      return Promise.resolve(profile);
    }
  };

  await withProfilePage(app, async (definition) => {
    const instance = createPageInstance(definition);
    const refreshPromise = instance.refreshCurrentUserInfo();

    await Promise.resolve();
    assert.strictEqual(loadUserProfileCalls, 0);

    resolveReady(profile);
    await refreshPromise;
    assert.deepStrictEqual(instance.data.userInfo, profile);
  });
}

async function main() {
  await testRefreshesExistingUserInfo();
  await testWaitsForExistingUserInfoReady();
  console.log("ok - profile page refreshes existing user info");
}

main().catch((err) => {
  console.error("not ok - profile page reuses existing user info");
  console.error(err);
  process.exitCode = 1;
});
