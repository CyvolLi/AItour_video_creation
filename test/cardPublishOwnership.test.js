const assert = require("assert");
const path = require("path");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

async function withCardPublishPage(appStub, wxStub, communityStub, profileStoreStub, run) {
  const pagePath = require.resolve(
    path.join(__dirname, "../miniprogram/pages/card_publish/card_publish.js")
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

  delete require.cache[pagePath];
  require.cache[communityPath] = {
    id: communityPath,
    filename: communityPath,
    loaded: true,
    exports: communityStub
  };
  require.cache[profileStorePath] = {
    id: profileStorePath,
    filename: profileStorePath,
    loaded: true,
    exports: profileStoreStub
  };
  global.Page = (value) => {
    definition = value;
  };
  global.getApp = () => appStub;
  global.wx = wxStub;

  try {
    require(pagePath);
    assert.ok(definition, "card_publish.js should register a Page definition");
    return await run(definition);
  } finally {
    delete require.cache[pagePath];
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
    data: { ...definition.data },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

test("card publish sends target_id and records the created card for profile refresh", async () => {
  const publishCalls = [];
  const savedCreatedIds = [];
  const app = {
    globalData: {
      task_data: {
        openid: "openid-card",
        landscape: "001"
      }
    }
  };
  const wxStub = {
    showToast() {},
    reLaunch() {}
  };
  const communityStub = {
    apiCommunityCardPublish(payload) {
      publishCalls.push(payload);
      return Promise.resolve({
        data: {
          card_id: "card-created-001"
        }
      });
    }
  };
  const profileStoreStub = {
    saveCreatedId(openid, type, id) {
      savedCreatedIds.push({ openid, type, id });
      return Promise.resolve({});
    }
  };

  await withCardPublishPage(
    app,
    wxStub,
    communityStub,
    profileStoreStub,
    async (definition) => {
      const page = createPageInstance(definition);
      if (typeof page.onLoad === "function") {
        page.onLoad();
      }
      page.setData({
        imageUrl: "https://example.com/card.jpg",
        emotionText: "我的模板内容",
        title: "模板标题",
        locationName: "广州"
      });
      await page.publishCard();
    }
  );

  assert.strictEqual(publishCalls.length, 1);
  assert.strictEqual(publishCalls[0].openid, "openid-card");
  assert.strictEqual(publishCalls[0].landscape, "001");
  assert.strictEqual(typeof publishCalls[0].target_id, "string");
  assert.match(
    publishCalls[0].target_id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
  assert.deepStrictEqual(savedCreatedIds, [
    {
      openid: "openid-card",
      type: "card",
      id: "card-created-001"
    }
  ]);
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
