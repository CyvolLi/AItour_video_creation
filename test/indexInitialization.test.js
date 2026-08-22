const assert = require("assert");
const fs = require("fs");
const path = require("path");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

async function withIndexPage(appStub, wxStub, run) {
  const modulePath = require.resolve(
    path.join(__dirname, "../miniprogram/pages/index/index.js")
  );
  const previousPage = global.Page;
  const previousGetApp = global.getApp;
  const previousWx = global.wx;
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  let definition;

  delete require.cache[modulePath];
  global.Page = (value) => {
    definition = value;
  };
  global.getApp = () => appStub;
  global.wx = wxStub;

  try {
    require(modulePath);
    assert.ok(definition, "index.js should register a Page definition");
    return await run(definition);
  } finally {
    delete require.cache[modulePath];
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
    data: { ...definition.data },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

test("start button waits for pending openid initialization before entering community", async () => {
  const calls = [];
  let resolveUserInfoReady;
  const appStub = {
    globalData: {
      task_data: {
        openid: ""
      },
      userInfo: null
    },
    userInfoReady: new Promise((resolve) => {
      resolveUserInfoReady = resolve;
    }),
    ensureUserInfo() {
      return Promise.resolve(null);
    }
  };
  const wxStub = {
    showToast(options) {
      calls.push(["toast", options.title]);
    },
    redirectTo(options) {
      calls.push(["redirect", options.url]);
    }
  };

  await withIndexPage(appStub, wxStub, async (definition) => {
    const page = createPageInstance(definition);

    const enterPromise = page.enterCommunity();
    assert.strictEqual(page.data.entering, true);
    assert.deepStrictEqual(calls, []);

    appStub.globalData.task_data.openid = "openid-ready";
    resolveUserInfoReady({ nickName: "测试用户" });

    await enterPromise;
  });

  assert.deepStrictEqual(calls, [["redirect", "../community/community"]]);
});

test("start button shows a clear failure only after openid initialization is unavailable", async () => {
  const calls = [];
  const appStub = {
    globalData: {
      task_data: {
        openid: ""
      },
      userInfo: null
    },
    userInfoReady: Promise.resolve(null),
    ensureUserInfo() {
      return Promise.resolve(null);
    }
  };
  const wxStub = {
    showToast(options) {
      calls.push(options.title);
    }
  };

  await withIndexPage(appStub, wxStub, async (definition) => {
    const page = createPageInstance(definition);
    await page.enterCommunity();
  });

  assert.deepStrictEqual(calls, ["用户初始化失败，请稍后重试"]);
});

test("entry-facing pages do not show the stale user-uninitialized toast", () => {
  [
    "../miniprogram/pages/index/index.js",
    "../miniprogram/pages/profile/profile.js"
  ].forEach((relPath) => {
    const source = fs.readFileSync(path.join(__dirname, relPath), "utf8");
    assert.ok(!source.includes("用户未初始化"), relPath + " should wait for OpenID first");
  });
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
