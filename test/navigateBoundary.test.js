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

test("uses the store id only as a path-free embedded navigation experiment", () => {
  let receivedOptions;

  loadNavigatePage(
    {
      openEmbeddedMiniProgram(options) {
        receivedOptions = options;
      }
    },
    (page) => {
      const instance = createPageInstance(page);

      assert.strictEqual(
        instance.data.storeIdUnderTest,
        runtimeConfig.STORE_APPID
      );
      instance.openStore();
      assert.strictEqual(receivedOptions.appId, runtimeConfig.STORE_APPID);
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(receivedOptions, "path"),
        false
      );

      receivedOptions.success();
      assert.match(instance.data.result, /通用跳转 API 成功/);
      assert.match(instance.data.result, /不能证明.*store-product/);
      assert.match(instance.data.result, /商品详情/);
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
      assert.match(instance.data.result, /通用跳转 API 失败/);
      assert.match(instance.data.result, /permission denied/);
      assert.match(instance.data.result, /不能证明.*store-product/);
      assert.match(instance.data.result, /商品详情/);

      assert.doesNotThrow(() => receivedOptions.fail());
      assert.match(instance.data.result, /通用跳转 API 失败: 未知错误/);
      assert.match(instance.data.result, /不能证明.*store-product/);
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
  assert.match(wxml, /STORE_APPID/);
  assert.match(wxml, /小店 ID/);
  assert.match(wxml, /同时也是可跳转目标小程序 AppID/);
  assert.match(wxml, /半屏小程序管理/);
  assert.match(wxml, /绑定\/许可获批/);
  assert.match(wxml, /才可能成功/);
  assert.match(wxml, /成功或失败/);
  assert.match(wxml, /不能证明\s*store-product\s*参数有效/);
  assert.match(wxml, /不能证明商品详情/);
  assert.match(wxml, /不应猜测微信小店内部商品\s*path/);
  assert.match(wxml, /尝试半屏打开（实验\/对照）/);
  assert.match(wxml, /{{storeIdUnderTest}}/);
});
