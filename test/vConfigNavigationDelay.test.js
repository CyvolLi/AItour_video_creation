const assert = require("assert");

const modulePath = require.resolve("../miniprogram/pages/v_config/v_config.js");

function createPageInstance(definition) {
  return {
    ...definition,
    data: {
      ...definition.data,
      avatarUrl: "portrait-url"
    },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

async function main() {
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const hadSetTimeout = Object.prototype.hasOwnProperty.call(global, "setTimeout");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousSetTimeout = global.setTimeout;
  const previousModule = require.cache[modulePath];
  const app = {
    globalData: {
      task_data: {
        scriptContent: "旅行脚本",
        count: 1
      },
      video_extend: true
    }
  };
  let definition;
  let scheduledDelay;
  let scheduledCallback;
  let redirectUrl = "";

  global.getApp = () => app;
  global.Page = (value) => {
    definition = value;
  };
  global.wx = {
    showToast() {},
    redirectTo(options) {
      redirectUrl = options.url;
    }
  };
  global.setTimeout = (callback, delay) => {
    scheduledCallback = callback;
    scheduledDelay = delay;
    return 1;
  };

  try {
    delete require.cache[modulePath];
    require(modulePath);
    assert.ok(definition, "v_config.js should register a Page definition");

    const page = createPageInstance(definition);
    page.generateVideo();

    assert.strictEqual(scheduledDelay, 200);
    assert.strictEqual(page.data.generating, true);

    scheduledCallback();

    assert.strictEqual(redirectUrl, "/pages/wait/wait");
    assert.strictEqual(page.data.generating, false);
    assert.strictEqual(app.globalData.task_data.count, 0);
    assert.strictEqual(app.globalData.video_extend, false);
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
    if (hadSetTimeout) global.setTimeout = previousSetTimeout;
    else delete global.setTimeout;
  }

  console.log("ok - video generation keeps a 200ms navigation delay");
}

main().catch((err) => {
  console.error("not ok - video generation keeps a 200ms navigation delay");
  console.error(err);
  process.exitCode = 1;
});
