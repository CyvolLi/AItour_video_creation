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

test("app initialization reuses the runtime cloud configuration", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../miniprogram/app.js"),
    "utf8"
  );

  assert.ok(!source.includes("cloudbase-d2g8dvtluc8d8face"));
  assert.ok(source.includes('require("./utils/runtimeConfig.js")'));
  assert.match(source, /env:\s*runtimeConfig\.CLOUD_ENV_ID/);
  assert.match(
    source,
    /wx\.cloud\.init\(runtimeConfig\.getCloudInitOptions\(\)\)/
  );
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
