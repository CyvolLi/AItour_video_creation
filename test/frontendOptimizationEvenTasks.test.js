const assert = require("assert");
const fs = require("fs");
const path = require("path");

const testCases = [];
const root = path.join(__dirname, "..");

function test(name, fn) {
  testCases.push({ name, fn });
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function freshRequire(relPath) {
  const modulePath = require.resolve(path.join(root, relPath));
  delete require.cache[modulePath];
  return require(modulePath);
}

function withCapturedApp(run) {
  const modulePath = require.resolve(path.join(root, "miniprogram/app.js"));
  const previousApp = global.App;
  const hadApp = Object.prototype.hasOwnProperty.call(global, "App");
  let definition;

  delete require.cache[modulePath];
  global.App = (value) => {
    definition = value;
  };

  try {
    require(modulePath);
    assert.ok(definition, "app.js should register App definition");
    return run(definition);
  } finally {
    delete require.cache[modulePath];
    if (hadApp) global.App = previousApp;
    else delete global.App;
  }
}

function withCapturedPage(relPath, appStub, run) {
  const modulePath = require.resolve(path.join(root, relPath));
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
  global.wx = {};

  try {
    require(modulePath);
    assert.ok(definition, relPath + " should register a Page definition");
    return run(definition);
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

test("task 2: profile header removes fixed demo identity and uses Chinese copy", () => {
  const wxml = read("miniprogram/pages/profile/profile.wxml");

  [
    "edit-icon",
    "Name:",
    "ID: @",
    "Following:",
    "Friends:",
    "Add friends",
    "Student",
    "Designer"
  ].forEach((text) => {
    assert.ok(!wxml.includes(text), "profile should not include demo text: " + text);
  });

  assert.doesNotMatch(wxml, />\s*Profile\s*</);
  assert.match(wxml, /个人主页/);
  assert.match(wxml, /{{userInfo\.nickName \|\| '用户'}}/);
  assert.match(wxml, /我的帖子/);
  assert.match(wxml, /我制作的模板/);
});

test("task 4: scenery category carousel exposes subtle horizontal scroll hints", () => {
  const wxml = read("miniprogram/pages/scenery_select/scenery_select.wxml");
  const wxss = read("miniprogram/pages/scenery_select/scenery_select.wxss");

  assert.match(wxml, /class="feature-scroll-wrap"/);
  assert.match(wxml, /class="feature-scroll-hint feature-scroll-hint-left"/);
  assert.match(wxml, /class="feature-scroll-hint feature-scroll-hint-right"/);
  assert.match(wxml, /<scroll-view class="feature-scroll" scroll-x/);
  assert.match(wxss, /\.feature-scroll-wrap\s*{[^}]*position:\s*relative/is);
  assert.match(wxss, /\.feature-scroll-hint\s*{[^}]*position:\s*absolute[^}]*pointer-events:\s*none[^}]*opacity:\s*0\.(2|3)\d?/is);
  assert.match(wxss, /\.feature-scroll-hint-left\s*{[^}]*left:\s*0/is);
  assert.match(wxss, /\.feature-scroll-hint-right\s*{[^}]*right:\s*0/is);
});

test("task 6: resetTaskData keeps openid and clears stale generation state", () => {
  withCapturedApp((appDefinition) => {
    assert.strictEqual(typeof appDefinition.resetTaskData, "function");
    appDefinition.globalData = {
      video_extend: true,
      video_url: "https://example.com/old.mp4",
      final_response: "old copy",
      task_data: {
        openid: "openid-123",
        task_id: "task-old",
        video_id: "video-old",
        count: 2,
        card_id: "card-old",
        spot_url: "https://example.com/old.png",
        request: "old request",
        video_request: "old video request",
        scriptContent: "old script",
        user_potrait: "old portrait",
        landscape: "old-landscape",
        landscape_name: "old name"
      }
    };

    const nextTaskData = appDefinition.resetTaskData();

    assert.strictEqual(nextTaskData.openid, "openid-123");
    assert.strictEqual(appDefinition.globalData.task_data.openid, "openid-123");
    [
      "task_id",
      "video_id",
      "card_id",
      "spot_url",
      "request",
      "video_request",
      "scriptContent",
      "user_potrait"
    ].forEach((key) => {
      assert.strictEqual(appDefinition.globalData.task_data[key], "", key + " should be cleared");
    });
    assert.strictEqual(appDefinition.globalData.task_data.count, 0);
    assert.strictEqual(appDefinition.globalData.task_data.landscape, "sharepool");
    assert.strictEqual(appDefinition.globalData.video_url, null);
    assert.strictEqual(appDefinition.globalData.final_response, null);
    assert.strictEqual(appDefinition.globalData.video_extend, false);
  });

  assert.match(read("miniprogram/pages/mode_select/mode_select.js"), /app\.resetTaskData\(\)/);
  assert.match(read("miniprogram/pages/v_output/v_output.js"), /app\.resetTaskData\(\)/);
});

test("task 8: backend API base URL is centralized in service config", () => {
  const serviceConfig = freshRequire("miniprogram/utils/serviceConfig.js");

  assert.strictEqual(serviceConfig.API_BASE_URL, "https://ruralv.cn");
  [
    "miniprogram/pages/dialogue/dialogue.js",
    "miniprogram/pages/script/script.js",
    "miniprogram/pages/wait/wait.js",
    "miniprogram/utils/communityService.js"
  ].forEach((relPath) => {
    const source = read(relPath);
    assert.ok(
      source.includes("serviceConfig") || source.includes("API_BASE_URL"),
      relPath + " should import shared service config"
    );
    assert.ok(!source.includes('"https://ruralv.cn"'), relPath + " should not hard-code API URL");
  });
});

test("task 10: video config selection persists style and optimization ids", () => {
  const appStub = {
    globalData: {
      task_data: {
        scriptContent: "脚本内容"
      }
    }
  };

  withCapturedPage("miniprogram/pages/v_config/v_config.js", appStub, (definition) => {
    const page = createPageInstance(definition);

    page.setData({
      avatarUrl: "https://example.com/avatar.jpg",
      selectedStyleId: "cinematic-immersive",
      selectedOptimizationId: "friend-circle"
    });
    page.saveConfigToGlobalData();

    assert.deepStrictEqual(appStub.globalData.task_data.videoConfig, {
      styleId: "cinematic-immersive",
      optimizationId: "friend-circle",
      optimizationIds: ["friend-circle"]
    });
    assert.match(appStub.globalData.task_data.video_request, /电影沉浸式风格/);
    assert.match(appStub.globalData.task_data.request, /朋友圈/);
  });

  assert.doesNotMatch(
    read("miniprogram/pages/v_config/v_config.js"),
    /taskData\.request\s*=\s*selectedOptimization\.description\s*,/
  );
});

test("task 12: comment store caches by target and exposes cached comments on query failure", async () => {
  const storage = {};
  let shouldFail = false;
  const dbComments = [
    {
      _id: "db1",
      comment_id: "comment-1",
      target_id: "target-1",
      content: "第一条评论",
      status: "published",
      created_at: 10
    }
  ];

  global.wx = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    cloud: {
      database() {
        return {
          collection() {
            return {
              where() {
                return this;
              },
              orderBy() {
                return this;
              },
              limit() {
                return this;
              },
              get() {
                return shouldFail
                  ? Promise.reject(new Error("collection missing"))
                  : Promise.resolve({ data: dbComments });
              }
            };
          }
        };
      }
    }
  };

  const commentStore = freshRequire("miniprogram/utils/commentStore.js");
  const comments = await commentStore.listByTarget("target-1");

  assert.strictEqual(comments.length, 1);
  assert.strictEqual(storage.comment_cache_target_1[0].content, "第一条评论");
  assert.deepStrictEqual(commentStore.getCachedComments("target-1"), comments);

  shouldFail = true;
  await assert.rejects(
    () => commentStore.listByTarget("target-1"),
    (err) => {
      assert.match(err.message, /collection missing/);
      assert.strictEqual(err.cachedComments.length, 1);
      assert.strictEqual(err.cachedComments[0].content, "第一条评论");
      return true;
    }
  );

  delete global.wx;
});

test("task 12: detail page renders a distinct comment fallback message", () => {
  const detailJs = read("miniprogram/pages/detail/detail.js");
  const detailWxml = read("miniprogram/pages/detail/detail.wxml");

  assert.match(detailJs, /commentError:\s*""/);
  assert.match(detailJs, /cachedComments/);
  assert.match(detailJs, /评论暂时无法加载/);
  assert.match(detailWxml, /wx:if="{{commentError}}"/);
  assert.match(detailWxml, /class="empty comment-error"/);
  assert.match(
    detailWxml,
    /wx:if="{{!commentLoading && !commentError && \(!target\.List \|\| target\.List\.length === 0\)}}"/
  );
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
