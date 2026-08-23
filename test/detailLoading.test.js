const assert = require("assert");

const modulePath = require.resolve("../miniprogram/pages/detail/detail.js");

function createPageInstance(definition) {
  return {
    ...definition,
    data: {
      ...definition.data,
      target: { ...definition.data.target }
    },
    setData(update, callback) {
      Object.assign(this.data, update);
      if (typeof callback === "function") {
        callback();
      }
    }
  };
}

async function withDetailPage(app, run) {
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
  global.wx = {
    getWindowInfo() {
      return { statusBarHeight: 20, windowWidth: 375 };
    },
    getMenuButtonBoundingClientRect() {
      return {};
    },
    showToast() {}
  };

  try {
    delete require.cache[modulePath];
    require(modulePath);
    assert.ok(definition, "detail.js should register a Page definition");
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
  const rawItem = {
    type: "post",
    post_id: "post-1",
    target_id: "target-1",
    title: "旅行作品",
    video_url: "video-url",
    target: { likes: 3, favorites: 2, comments: 1, List: [] }
  };
  const enrichedItem = {
    ...rawItem,
    author_name: "小明",
    author_avatar: "avatar-url"
  };
  const app = {
    globalData: {
      community_current_item: rawItem
    }
  };

  await withDetailPage(app, async (definition) => {
    const page = createPageInstance(definition);
    let resolveProfiles;
    let commentsStarted = false;

    page.attachAuthorProfiles = () =>
      new Promise((resolve) => {
        resolveProfiles = resolve;
      });
    page.loadComments = () => {
      commentsStarted = true;
      return Promise.resolve([]);
    };

    const loading = page.onLoad({
      type: "post",
      target_id: "target-1",
      id: "post-1"
    });

    assert.strictEqual(
      page.data.item,
      rawItem,
      "detail content should render before author profile hydration finishes"
    );
    assert.strictEqual(
      commentsStarted,
      true,
      "comments should start loading without waiting for author profiles"
    );

    resolveProfiles([enrichedItem]);
    await loading;

    assert.strictEqual(page.data.item.author_name, "小明");
    assert.strictEqual(page.data.item.author_avatar, "avatar-url");
  });

  console.log("ok - detail content renders before background data hydration");
}

main().catch((err) => {
  console.error("not ok - detail content renders before background data hydration");
  console.error(err);
  process.exitCode = 1;
});
