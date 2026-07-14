const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { pickProduct } = require("../miniprogram/utils/demoProducts.js");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

function withDetailPage(app, wxStub, run) {
  const modulePath = require.resolve("../miniprogram/pages/detail/detail.js");
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  let pageDefinition;

  const cleanup = () => {
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
  };

  delete require.cache[modulePath];
  global.getApp = () => app;
  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = wxStub;

  try {
    require(modulePath);
    assert.ok(pageDefinition, "detail.js should register a Page definition");
    const result = run(pageDefinition);

    if (result && typeof result.then === "function") {
      return result.finally(cleanup);
    }

    cleanup();
    return result;
  } catch (err) {
    cleanup();
    throw err;
  }
}

function withVOutputPage(app, wxStub, run) {
  const modulePath = require.resolve(
    "../miniprogram/pages/v_output/v_output.js"
  );
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  let pageDefinition;

  delete require.cache[modulePath];
  global.getApp = () => app;
  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = wxStub;

  try {
    require(modulePath);
    assert.ok(pageDefinition, "v_output.js should register a Page definition");
    return run(pageDefinition);
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

function withPublishPage(app, wxStub, communityStub, run) {
  const modulePath = require.resolve("../miniprogram/pages/publish/publish.js");
  const communityPath = require.resolve(
    "../miniprogram/utils/communityService.js"
  );
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  const previousCommunityModule = require.cache[communityPath];
  let pageDefinition;

  const cleanup = () => {
    if (previousModule) require.cache[modulePath] = previousModule;
    else delete require.cache[modulePath];
    if (previousCommunityModule) {
      require.cache[communityPath] = previousCommunityModule;
    } else {
      delete require.cache[communityPath];
    }

    if (hadGetApp) global.getApp = previousGetApp;
    else delete global.getApp;
    if (hadPage) global.Page = previousPage;
    else delete global.Page;
    if (hadWx) global.wx = previousWx;
    else delete global.wx;
  };

  delete require.cache[modulePath];
  require.cache[communityPath] = {
    id: communityPath,
    filename: communityPath,
    loaded: true,
    exports: communityStub
  };
  global.getApp = () => app;
  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = wxStub;

  try {
    require(modulePath);
    assert.ok(pageDefinition, "publish.js should register a Page definition");
    const result = run(pageDefinition);

    if (result && typeof result.then === "function") {
      return result.finally(cleanup);
    }

    cleanup();
    return result;
  } catch (err) {
    cleanup();
    throw err;
  }
}

function createPageInstance(pageDefinition) {
  return {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(update) {
      Object.assign(this.data, update);
    }
  };
}

test("v_output selects a stable featured product from the video context", () => {
  const videoUrl = "https://example.com/travel-demo.mp4";
  const app = {
    globalData: {
      task_data: {
        count: 1,
        scriptContent: "travel script",
        spot_url: "https://example.com/poster.jpg"
      },
      video_url: videoUrl,
      final_response: "travel copy"
    }
  };
  withVOutputPage(app, {}, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    page.onLoad();
    assert.deepStrictEqual(page.data.featuredProduct, pickProduct(videoUrl));
  });
});

test("v_output demo product action only shows a non-purchasable toast", () => {
  const toastCalls = [];
  const forbiddenCalls = [];
  const wxStub = {
    showToast(options) {
      toastCalls.push(options);
    },
    navigateTo() {
      forbiddenCalls.push("navigateTo");
    },
    openEmbeddedMiniProgram() {
      forbiddenCalls.push("openEmbeddedMiniProgram");
    },
    navigateToMiniProgram() {
      forbiddenCalls.push("navigateToMiniProgram");
    },
    request() {
      forbiddenCalls.push("request");
    }
  };
  const app = { globalData: { task_data: {} } };
  withVOutputPage(app, wxStub, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    page.showDemoProduct();

    assert.strictEqual(toastCalls.length, 1);
    assert.match(toastCalls[0].title, /演示|暂不支持购买/);
    assert.deepStrictEqual(forbiddenCalls, []);
  });
});

test("v_output only shows the product overlay while video is playing", () => {
  const app = { globalData: { task_data: {} } };

  withVOutputPage(app, {}, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    assert.strictEqual(page.data.isVideoPlaying, false);
    page.onVideoPlay();
    assert.strictEqual(page.data.isVideoPlaying, true);
    page.onVideoPause();
    assert.strictEqual(page.data.isVideoPlaying, false);
    page.onVideoPlay();
    page.onVideoEnded();
    assert.strictEqual(page.data.isVideoPlaying, false);
  });
});

test("v_output renders the demo product overlay inside the video card", () => {
  const wxmlPath = path.join(
    __dirname,
    "../miniprogram/pages/v_output/v_output.wxml"
  );
  const wxml = fs.readFileSync(wxmlPath, "utf8");
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/v_output/v_output.wxss"),
    "utf8"
  );
  const cardStart = wxml.indexOf('<view class="video-card">');
  const videoStart = wxml.indexOf("<video", cardStart);
  const overlayStart = wxml.indexOf('<cover-view class="demo-product-overlay"', videoStart);
  const nextCardStart = wxml.indexOf('<view class="copy-card">', cardStart);

  assert.ok(cardStart >= 0, "video-card should exist");
  assert.ok(videoStart > cardStart, "video should be inside video-card");
  assert.ok(overlayStart > videoStart, "overlay should follow the video");
  assert.ok(
    nextCardStart > overlayStart,
    "overlay should remain inside video-card, before the next content card"
  );
  assert.match(
    wxml.slice(overlayStart, nextCardStart),
    /<cover-image[^>]+src="{{featuredProduct\.imageUrl}}"/
  );
  assert.match(wxml, /{{featuredProduct\.title}}/);
  assert.match(wxml, /{{featuredProduct\.price}}/);
  assert.match(wxml, /同款|演示/);
  assert.match(wxml, /<video[\s\S]*?\scontrols(?:\s|>)/);
  assert.match(wxml, /bindplay="onVideoPlay"/);
  assert.match(wxml, /bindpause="onVideoPause"/);
  assert.match(wxml, /bindended="onVideoEnded"/);
  assert.match(
    wxml.slice(overlayStart, nextCardStart),
    /wx:if="{{featuredProduct\s*&&\s*isVideoPlaying}}"/
  );
  assert.match(wxml, /class="publish-bar"/);
  const overlayStyle = wxss.match(
    /\.demo-product-overlay\s*{([^}]*)}/
  )[1];
  const ctaStyle = wxss.match(/\.demo-product-cta\s*{([^}]*)}/)[1];
  const overlayHeight = Number(overlayStyle.match(/height:\s*(\d+)rpx/)[1]);
  const overlayBottom = Number(overlayStyle.match(/bottom:\s*(\d+)rpx/)[1]);

  assert.ok(
    overlayHeight >= 82 && overlayHeight <= 88,
    "overlay should stay compact in an 82-88rpx range"
  );
  assert.ok(
    overlayBottom >= 100 && overlayBottom <= 110,
    "overlay should stay above the native video controls"
  );
  assert.doesNotMatch(overlayStyle, /box-shadow|linear-gradient|background-image/);
  assert.doesNotMatch(ctaStyle, /box-shadow|linear-gradient|background-image/);
  assert.match(ctaStyle, /background-color:\s*#[0-9a-f]{6}/i);
  assert.match(ctaStyle, /color:\s*#fff(?:fff)?/i);
  assert.strictEqual(
    wxml.indexOf('<cover-view class="demo-product-overlay"', overlayStart + 1),
    -1,
    "the product overlay should not be duplicated outside the video card"
  );
});

test("detail demo product and back actions stay local to the page", () => {
  const toastCalls = [];
  let backCalls = 0;
  const forbiddenCalls = [];
  const app = { globalData: { task_data: {} } };
  const wxStub = {
    showToast(options) {
      toastCalls.push(options);
    },
    navigateBack() {
      backCalls += 1;
    },
    navigateTo() {
      forbiddenCalls.push("navigateTo");
    },
    openEmbeddedMiniProgram() {
      forbiddenCalls.push("openEmbeddedMiniProgram");
    },
    navigateToMiniProgram() {
      forbiddenCalls.push("navigateToMiniProgram");
    },
    request() {
      forbiddenCalls.push("request");
    }
  };

  withDetailPage(app, wxStub, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    assert.strictEqual(page.data.featuredProduct, null);
    assert.strictEqual(page.data.activeDetailTab, undefined);
    assert.strictEqual(page.switchDetailTab, undefined);

    page.showDemoProduct();
    page.goBack();
    assert.strictEqual(toastCalls.length, 1);
    assert.match(toastCalls[0].title, /演示|暂不支持购买/);
    assert.strictEqual(backCalls, 1);
    assert.deepStrictEqual(forbiddenCalls, []);
  });
});

test("detail renders the post commerce flow in one continuous view", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxml"),
    "utf8"
  );
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxss"),
    "utf8"
  );
  const json = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../miniprogram/pages/detail/detail.json"),
      "utf8"
    )
  );

  assert.strictEqual(json.navigationStyle, "custom");
  assert.match(wxml, /class="custom-header"/);
  assert.match(wxml, /class="back-button"[^>]+bindtap="goBack"/);
  assert.match(wxml, />内容详情</);
  assert.doesNotMatch(wxml, /detail-tabs|product-grid|activeDetailTab|switchDetailTab/);

  const headerStart = wxml.indexOf('class="custom-header"');
  const postStart = wxml.indexOf('class="post-card"');
  const videoStart = wxml.indexOf('class="video"', postStart);
  const authorStart = wxml.indexOf('class="author-line"', videoStart);
  const titleStart = wxml.indexOf('class="title"', authorStart);
  const copyStart = wxml.indexOf('class="copy"', titleStart);
  const useCardStart = wxml.indexOf('bindtap="usePostCard"', copyStart);
  const productStart = wxml.indexOf('class="demo-product-strip"', useCardStart);
  const statsStart = wxml.indexOf('class="target"', productStart);
  const commentsStart = wxml.indexOf('class="comments"', statsStart);

  assert.ok(headerStart >= 0, "custom header should exist");
  assert.ok(postStart > headerStart, "post card should follow the header");
  assert.ok(videoStart > postStart, "video should be inside the post card");
  assert.ok(authorStart > videoStart, "author should follow the video");
  assert.ok(titleStart > authorStart, "title should follow the author");
  assert.ok(copyStart > titleStart, "copy should follow the title");
  assert.ok(useCardStart > copyStart, "use-card action should follow the copy");
  assert.ok(productStart > useCardStart, "product strip should follow use-card");
  assert.ok(statsStart > productStart, "stats should follow the product strip");
  assert.ok(commentsStart > statsStart, "comments should remain visible after stats");

  assert.match(wxml, /class="demo-product-strip"[^>]+wx:if="{{type === 'post' && featuredProduct}}"[^>]+bindtap="showDemoProduct"/);
  assert.match(wxml, /src="{{featuredProduct\.imageUrl}}"[^>]+mode="aspectFill"/);
  assert.match(wxml, /{{featuredProduct\.title}}/);
  assert.match(wxml, /{{featuredProduct\.description}}/);
  assert.match(wxml, /{{featuredProduct\.price}}/);
  assert.match(wxml, /已售{{featuredProduct\.sales}}/);
  assert.match(wxml, /乡村市集/);
  assert.match(wxml, /\+好物购/);
  assert.match(wxml, /class="stat stat-favorite"[^>]+bindtap="favoriteCurrent"/);
  assert.match(wxml, /class="comments"/);
  assert.match(wxss, /\.page\s*{[^}]*background:\s*#[0-9a-f]{6}/is);
  assert.match(wxss, /\.post-card\s*{[^}]*border-radius:\s*(?:2[4-9]|3[0-4])rpx/is);
  assert.match(wxss, /\.demo-product-strip\s*{[^}]*display:\s*flex/is);
  assert.match(wxss, /\.product-name\s*{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/is);
});

test("detail onLoad selects one video-related product without breaking comments", () => {
  const app = {
    globalData: {
      task_data: {},
      community_current_item: {
        type: "post",
        post_id: "post-demo",
        title: "demo video",
        video_url: "video-1",
        target: { comments: 0, List: [] }
      }
    }
  };
  const wxStub = {
    cloud: null,
    showToast() {}
  };

  return withDetailPage(app, wxStub, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    const loading = page.onLoad({ type: "post", id: "post-demo" });

    assert.ok(loading && typeof loading.then === "function");
    return loading.then(() => {
      assert.strictEqual(page.data.demoProducts, undefined);
      assert.strictEqual(pickProduct("video-1").id, "demo-travel-bottle");
      assert.strictEqual(
        page.data.featuredProduct.id,
        pickProduct("video-1").id
      );
      assert.strictEqual(page.data.item.post_id, "post-demo");
      assert.strictEqual(page.data.commentLoading, false);
      assert.deepStrictEqual(page.data.target.List, []);
    });
  });
});

test("detail keeps card pages on the card view with comments reachable", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxml"),
    "utf8"
  );
  const app = {
    globalData: {
      task_data: {},
      community_current_item: {
        type: "card",
        card_id: "card-demo",
        emotion_text: "card copy",
        target: { comments: 0, List: [] }
      }
    }
  };
  const wxStub = {
    cloud: null,
    showToast() {}
  };

  return withDetailPage(app, wxStub, async (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    await page.onLoad({ type: "card", id: "card-demo" });

    assert.strictEqual(page.data.type, "card");
    assert.strictEqual(page.data.item.card_id, "card-demo");
    assert.strictEqual(page.getCommentTargetId(), "card-demo");
    assert.strictEqual(page.data.commentLoading, false);
    assert.deepStrictEqual(page.data.target.List, []);
    assert.doesNotMatch(wxml, /detail-tabs|product-grid|activeDetailTab|switchDetailTab/);
    assert.match(wxml, /class="card-view"[^>]+wx:if="{{type !== 'post'}}"/);
    assert.match(wxml, /class="comments"/);
    assert.doesNotMatch(wxml, /class="comments"[^>]+wx:if=/);
    assert.match(wxml, /class="demo-product-strip"[^>]+wx:if="{{type === 'post' && featuredProduct}}"/);
  });
});

test("publish prepares a stable endorsement candidate while staying disabled", () => {
  const videoUrl = "https://example.com/publish-travel.mp4";
  const app = {
    globalData: {
      task_data: {
        card_id: "card-demo",
        location_name: "泉州"
      },
      video_url: videoUrl,
      final_response: "travel copy"
    }
  };

  withPublishPage(app, {}, {}, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    assert.strictEqual(page.data.endorsementEnabled, false);
    assert.strictEqual(page.data.endorsementProduct, null);
    page.onLoad();
    assert.deepStrictEqual(page.data.endorsementCandidate, pickProduct(videoUrl));
    assert.strictEqual(page.data.endorsementEnabled, false);
    assert.strictEqual(page.data.endorsementProduct, null);
  });
});

test("publish endorsement switch only controls the local product preview", () => {
  const app = {
    globalData: {
      task_data: { spot_name: "鼓浪屿" },
      final_response: "海边旅行"
    }
  };

  withPublishPage(app, {}, {}, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    page.onLoad();
    const candidate = page.data.endorsementCandidate;

    page.onEndorsementChange({ detail: { value: true } });
    assert.strictEqual(page.data.endorsementEnabled, true);
    assert.deepStrictEqual(page.data.endorsementProduct, candidate);

    page.onEndorsementChange({ detail: { value: false } });
    assert.strictEqual(page.data.endorsementEnabled, false);
    assert.strictEqual(page.data.endorsementProduct, null);

    assert.doesNotThrow(() => page.onEndorsementChange());
    assert.strictEqual(page.data.endorsementEnabled, false);
    assert.strictEqual(page.data.endorsementProduct, null);
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(app.globalData, "endorsementProduct"),
      false
    );
  });
});

test("publish demo endorsement action only shows an informational toast", () => {
  const toastCalls = [];
  const forbiddenCalls = [];
  const wxStub = {
    showToast(options) {
      toastCalls.push(options);
    },
    navigateTo() {
      forbiddenCalls.push("navigateTo");
    },
    openEmbeddedMiniProgram() {
      forbiddenCalls.push("openEmbeddedMiniProgram");
    },
    navigateToMiniProgram() {
      forbiddenCalls.push("navigateToMiniProgram");
    },
    request() {
      forbiddenCalls.push("request");
    }
  };
  const app = { globalData: { task_data: {} } };

  withPublishPage(app, wxStub, {}, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    page.showDemoProduct();

    assert.strictEqual(toastCalls.length, 1);
    assert.match(toastCalls[0].title, /演示|不影响发布/);
    assert.deepStrictEqual(forbiddenCalls, []);
  });
});

test("publish payload remains unchanged when demo endorsement is enabled", async () => {
  const publishCalls = [];
  const app = {
    globalData: {
      task_data: {
        openid: "openid-demo",
        card_id: "card-demo",
        landscape: "001",
        spot_url: "https://example.com/cover.jpg"
      },
      video_url: "https://example.com/video.mp4",
      final_response: "travel copy"
    }
  };
  const wxStub = {
    showToast() {},
    reLaunch() {}
  };
  const communityStub = {
    apiCommunityPostPublish(payload) {
      publishCalls.push(payload);
      return Promise.resolve({});
    }
  };

  await withPublishPage(app, wxStub, communityStub, async (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    page.onLoad();
    page.setData({ title: "发布标题" });
    page.onEndorsementChange({ detail: { value: true } });
    page.publishPost();

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(publishCalls.length, 1);
    assert.deepStrictEqual(Object.keys(publishCalls[0]).sort(), [
      "card_id",
      "cover_url",
      "landscape",
      "location_name",
      "openid",
      "share_text",
      "title",
      "video_url"
    ]);
    assert.strictEqual(
      Object.keys(publishCalls[0]).some((key) =>
        /product|endorsement|promotion|link/i.test(key)
      ),
      false
    );
  });
});

test("publish renders an isolated demo endorsement option and preview", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/publish/publish.wxml"),
    "utf8"
  );
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/publish/publish.wxss"),
    "utf8"
  );
  const visibilityStart = wxml.indexOf("公开可见");
  const endorsementStart = wxml.indexOf("选择代言商品");
  const publishButtonStart = wxml.indexOf("发布笔记");

  assert.ok(visibilityStart >= 0, "visibility option should exist");
  assert.ok(
    endorsementStart > visibilityStart,
    "endorsement option should follow visibility"
  );
  assert.ok(
    publishButtonStart > endorsementStart,
    "endorsement option should remain above the publish button"
  );
  assert.match(
    wxml,
    /<switch[^>]+checked="{{endorsementEnabled}}"[^>]+bindchange="onEndorsementChange"/
  );
  assert.match(wxml, /选择代言商品/);
  assert.match(wxml, /演示/);
  assert.match(
    wxml,
    /class="endorsement-preview"[^>]+wx:if="{{endorsementEnabled && endorsementProduct}}"[^>]+bindtap="showDemoProduct"/
  );
  assert.match(wxml, /src="{{endorsementProduct\.imageUrl}}"/);
  assert.match(wxml, /{{endorsementProduct\.title}}/);
  assert.match(wxml, /{{endorsementProduct\.price}}/);
  assert.match(wxml, /智能匹配/);
  assert.match(wxml, /仅演示，不影响发布/);
  assert.doesNotMatch(wxml, /<view[^>]+bindtap="onEndorsementChange"/);
  assert.match(wxss, /\.endorsement-preview\s*{/);
  assert.match(wxss, /\.endorsement-image\s*{[^}]*border-radius:/s);
});

async function main() {
  for (const testCase of testCases) {
    try {
      await testCase.fn();
      console.log("ok - " + testCase.name);
    } catch (err) {
      console.error("not ok - " + testCase.name);
      console.error(err);
      process.exitCode = 1;
    }
  }
}

main();
