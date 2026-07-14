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

function loadAdverPage(wxStub, run) {
  const pagePath = require.resolve("../miniprogram/pages/adver/adver.js");
  const cachedPageModule = require.cache[pagePath];
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const originalPage = global.Page;
  const originalWx = global.wx;
  const originalLog = console.log;
  const originalError = console.error;
  let pageDefinition;

  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = wxStub;
  console.log = () => {};
  console.error = () => {};

  try {
    delete require.cache[pagePath];
    require(pagePath);
    assert.ok(pageDefinition, "adver.js should register a Page definition");
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
    console.log = originalLog;
    console.error = originalError;
  }
}

test("renders store home and product with product navigation callbacks", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/adver/adver.wxml"),
    "utf8"
  );

  assert.match(wxml, /<store-home\b[^>]*appid="{{storeAppId}}"/);
  assert.match(wxml, /<store-product\b[^>]*appid="{{storeAppId}}"/);
  assert.match(wxml, /product-id="{{productId}}"/);
  assert.match(wxml, /bindentersuccess="onEnterSuccess"/);
  assert.match(wxml, /bindentererror="onEnterError"/);
  assert.ok(!wxml.includes("custom-style"));
  assert.ok(!wxml.includes("custom-content"));
});

test("loads runtime configuration and reports environment capabilities", () => {
  const capabilityQueries = [];
  const wxStub = {
    getDeviceInfo() {
      return { platform: "devtools", system: "Windows 11" };
    },
    getAppBaseInfo() {
      return { SDKVersion: "3.14.3" };
    },
    canIUse(capability) {
      capabilityQueries.push(capability);
      return capability === "store-home";
    }
  };

  loadAdverPage(wxStub, (page) => {
    assert.strictEqual(page.data.storeAppId, runtimeConfig.STORE_APPID);
    assert.strictEqual(page.data.productId, runtimeConfig.DEFAULT_PRODUCT_ID);

    const dataUpdates = [];
    const instance = {
      ...page,
      setData(update) {
        dataUpdates.push(update);
        Object.assign(this.data, update);
      },
      data: { ...page.data }
    };

    instance.onLoad();

    assert.deepStrictEqual(capabilityQueries, ["store-home", "store-product"]);
    assert.strictEqual(dataUpdates.length, 1);
    assert.strictEqual(instance.data.platform, "devtools");
    assert.strictEqual(instance.data.system, "Windows 11");
    assert.strictEqual(instance.data.SDKVersion, "3.14.3");
    assert.strictEqual(instance.data.storeHomeSupported, true);
    assert.strictEqual(instance.data.storeProductSupported, false);
    assert.match(instance.data.environmentNotice, /真机/);
  });
});

test("handles missing environment fields without crashing", () => {
  loadAdverPage(
    {
      getDeviceInfo() {
        return {};
      },
      getAppBaseInfo() {
        return {};
      },
      canIUse() {
        return false;
      }
    },
    (page) => {
      const instance = {
        ...page,
        data: { ...page.data },
        setData(update) {
          Object.assign(this.data, update);
        }
      };

      assert.doesNotThrow(() => instance.onLoad());
      assert.strictEqual(typeof instance.data.platform, "string");
      assert.strictEqual(typeof instance.data.system, "string");
      assert.strictEqual(typeof instance.data.SDKVersion, "string");
    }
  );
});

test("records product navigation success and error details", () => {
  loadAdverPage({}, (page) => {
    const instance = {
      ...page,
      data: { ...page.data },
      setData(update) {
        Object.assign(this.data, update);
      }
    };

    instance.onEnterSuccess({ detail: { productId: "product-1" } });
    assert.match(instance.data.productEnterResult, /成功/);

    instance.onEnterError({
      detail: { code: 60004, message: "product not found" }
    });
    assert.match(instance.data.productEnterResult, /60004/);
    assert.match(instance.data.productEnterResult, /product not found/);
  });
});
