const assert = require("assert");

const modulePath = require.resolve(
  "../miniprogram/pages/community/community.js"
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

async function withCommunityPage(run) {
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  let definition;

  global.getApp = () => ({
    globalData: {
      task_data: { landscape: "sharepool" }
    }
  });
  global.Page = (value) => {
    definition = value;
  };
  global.wx = {
    showToast() {}
  };

  try {
    delete require.cache[modulePath];
    require(modulePath);
    assert.ok(definition, "community.js should register a Page definition");
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

async function main() {
  await withCommunityPage(async (definition) => {
    const instance = createPageInstance(definition);
    const rawList = [
      {
        target_id: "post-1",
        title: "旅行作品",
        cover_url: "cover-url"
      }
    ];
    const enrichedList = [
      {
        ...rawList[0],
        author_name: "小明",
        author_avatar: "avatar-url"
      }
    ];
    let resolveProfiles;
    const profilePromise = new Promise((resolve) => {
      resolveProfiles = resolve;
    });

    instance.requestCurrentList = () =>
      Promise.resolve({ data: { list: rawList } });
    instance.attachAuthorProfiles = () => profilePromise;

    const refreshPromise = instance.refreshCurrent();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepStrictEqual(
      instance.data.postList,
      rawList,
      "the raw list should render before author profile hydration completes"
    );

    resolveProfiles(enrichedList);
    await refreshPromise;
    await Promise.resolve();

    assert.deepStrictEqual(instance.data.postList, enrichedList);
  });

  console.log("ok - community list renders before author profile hydration");
}

main().catch((err) => {
  console.error("not ok - community list renders before author profile hydration");
  console.error(err);
  process.exitCode = 1;
});
