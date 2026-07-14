const assert = require("assert");
const fs = require("fs");
const path = require("path");
const runtimeConfig = require("../miniprogram/utils/runtimeConfig.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

function loadNavigatePage(wxStub, run) {
  const pagePath = require.resolve(
    "../miniprogram/pages/navigate/navigate.js"
  );
  const cachedPageModule = require.cache[pagePath];
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const originalPage = global.Page;
  const originalWx = global.wx;
  let pageDefinition;

  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = wxStub;

  try {
    delete require.cache[pagePath];
    require(pagePath);
    assert.ok(pageDefinition, "navigate.js should register a Page definition");
    run(pageDefinition);
  } finally {
    delete require.cache[pagePath];
    if (cachedPageModule) {
      require.cache[pagePath] = cachedPageModule;
    }

    if (hadPage) {
      global.Page = originalPage;
    } else {
      delete global.Page;
    }
    if (hadWx) {
      global.wx = originalWx;
    } else {
      delete global.wx;
    }
  }
}

function createPageInstance(page) {
  return {
    ...page,
    data: { ...page.data },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

test("opens the embedded mini program with the shared store app id", () => {
  let receivedOptions;

  loadNavigatePage(
    {
      openEmbeddedMiniProgram(options) {
        receivedOptions = options;
      }
    },
    (page) => {
      const instance = createPageInstance(page);

      assert.strictEqual(instance.data.storeAppId, runtimeConfig.STORE_APPID);
      instance.openStore();
      assert.strictEqual(receivedOptions.appId, runtimeConfig.STORE_APPID);

      receivedOptions.success();
      assert.strictEqual(instance.data.result, "跳转成功");
    }
  );
});

test("shows embedded mini program failures and handles an empty error", () => {
  let receivedOptions;

  loadNavigatePage(
    {
      openEmbeddedMiniProgram(options) {
        receivedOptions = options;
      }
    },
    (page) => {
      const instance = createPageInstance(page);

      instance.openStore();
      receivedOptions.fail({ errMsg: "permission denied" });
      assert.match(instance.data.result, /失败/);
      assert.match(instance.data.result, /permission denied/);

      assert.doesNotThrow(() => receivedOptions.fail());
      assert.strictEqual(instance.data.result, "失败: 未知错误");
    }
  );
});

test("explains the boundary between embedded navigation and store-product", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/navigate/navigate.wxml"),
    "utf8"
  );

  assert.match(wxml, /普通\/半屏小程序跳转能力对照/);
  assert.match(wxml, /不是\s*store-product\s*的替代方案/);
  assert.match(wxml, /半屏小程序管理/);
  assert.match(wxml, /embeddedAppIdList/);
  assert.match(wxml, /不等于完成后台绑定/);
  assert.match(wxml, /不应猜测微信小店内部商品\s*path/);
  assert.match(wxml, /不能只凭\s*product ID/);
  assert.match(wxml, /官方\s*store-product/);
  assert.match(wxml, /手机真机复核/);
  assert.match(wxml, /{{storeAppId}}/);
});
