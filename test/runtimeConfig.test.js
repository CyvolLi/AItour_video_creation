const assert = require("assert");
const fs = require("fs");
const path = require("path");
const runtimeConfig = require("../miniprogram/utils/runtimeConfig.js");
const storeConfig = require("../miniprogram/utils/storeConfig.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

test("uses the cloud1 mini program app id", () => {
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../project.config.json"), "utf8")
  );

  assert.strictEqual(projectConfig.appid, "wxfca20bbcf103c59d");
});

test("exports the configured cloud environment and store defaults", () => {
  assert.strictEqual(
    runtimeConfig.CLOUD_ENV_ID,
    "cloud1-5g34ybsmbfe89727"
  );
  assert.strictEqual(runtimeConfig.STORE_APPID, "wxde7b459287c6bc1b");
  assert.strictEqual(runtimeConfig.DEFAULT_PRODUCT_ID, "10001033506602");
});

test("builds cloud initialization options", () => {
  assert.deepStrictEqual(runtimeConfig.getCloudInitOptions(), {
    env: "cloud1-5g34ybsmbfe89727",
    traceUser: true
  });
});

test("app launch initializes the configured cloud before requesting OpenID", () => {
  const appPath = require.resolve("../miniprogram/app.js");
  const cachedAppModule = require.cache[appPath];
  const hadApp = Object.prototype.hasOwnProperty.call(global, "App");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const originalApp = global.App;
  const originalWx = global.wx;
  const cloudCalls = [];
  let appDefinition;

  global.App = (definition) => {
    appDefinition = definition;
  };
  global.wx = {
    cloud: {
      init(options) {
        cloudCalls.push({ method: "init", options });
      },
      callFunction(options) {
        cloudCalls.push({ method: "callFunction", options });
        return new Promise(() => {});
      }
    }
  };

  try {
    delete require.cache[appPath];
    require(appPath);
    assert.ok(appDefinition, "app.js should register an App definition");

    appDefinition.onLaunch.call(appDefinition);

    assert.strictEqual(
      appDefinition.globalData.env,
      runtimeConfig.CLOUD_ENV_ID
    );
    assert.deepStrictEqual(
      cloudCalls[0],
      {
        method: "init",
        options: runtimeConfig.getCloudInitOptions()
      }
    );
    assert.deepStrictEqual(
      cloudCalls[1],
      {
        method: "callFunction",
        options: {
          name: "quickstartFunctions",
          data: { type: "getOpenId" }
        }
      }
    );
    assert.deepStrictEqual(
      cloudCalls.map((call) => call.method),
      ["init", "callFunction"]
    );
  } finally {
    delete require.cache[appPath];
    if (cachedAppModule) {
      require.cache[appPath] = cachedAppModule;
    }

    if (hadApp) {
      global.App = originalApp;
    } else {
      delete global.App;
    }
    if (hadWx) {
      global.wx = originalWx;
    } else {
      delete global.wx;
    }
  }
});

test("accepts the checked-in runtime configuration", () => {
  assert.deepStrictEqual(runtimeConfig.validateRuntimeConfig(), []);
});

test("reports an empty cloud environment", () => {
  assert.deepStrictEqual(
    runtimeConfig.validateRuntimeConfig({
      cloudEnvId: "",
      storeAppId: runtimeConfig.STORE_APPID,
      defaultProductId: runtimeConfig.DEFAULT_PRODUCT_ID
    }),
    ["CLOUD_ENV_ID is required"]
  );
});

test("reports a store app id without the wx prefix", () => {
  assert.deepStrictEqual(
    runtimeConfig.validateRuntimeConfig({
      cloudEnvId: runtimeConfig.CLOUD_ENV_ID,
      storeAppId: "invalid-app-id",
      defaultProductId: runtimeConfig.DEFAULT_PRODUCT_ID
    }),
    ["STORE_APPID must start with wx"]
  );
});

test("reports an empty default product id", () => {
  assert.deepStrictEqual(
    runtimeConfig.validateRuntimeConfig({
      cloudEnvId: runtimeConfig.CLOUD_ENV_ID,
      storeAppId: runtimeConfig.STORE_APPID,
      defaultProductId: ""
    }),
    ["DEFAULT_PRODUCT_ID is required"]
  );
});

test("store configuration reuses the runtime store app id", () => {
  assert.strictEqual(storeConfig.STORE_APPID, runtimeConfig.STORE_APPID);

  const source = fs.readFileSync(
    path.join(__dirname, "../miniprogram/utils/storeConfig.js"),
    "utf8"
  );
  assert.ok(source.includes('require("./runtimeConfig.js")'));
  assert.ok(!source.includes("wxde7b459287c6bc1b"));
});

test("keeps the existing product list behavior", () => {
  const expectedProductIds = [
    "10001033694379",
    "10001033506602",
    "10000761014408",
    "10000985400109",
    "10000613378012",
    "10000954511072",
    "10000975230585",
    "10000975388982",
    "10000613074238",
    "10000613088752",
    "10000785857711",
    "10000786036588",
    "10000787056809"
  ];

  assert.deepStrictEqual(storeConfig.PRODUCT_IDS, expectedProductIds);
  assert.deepStrictEqual(
    storeConfig.getProductList(),
    expectedProductIds.map((productId, index) => ({
      productId,
      title: `商品 ${index + 1}`
    }))
  );
});
