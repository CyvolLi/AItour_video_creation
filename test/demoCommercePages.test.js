const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { pickProduct } = require("../miniprogram/utils/demoProducts.js");

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      return result.then(
        () => console.log("ok - " + name),
        (err) => {
          console.error("not ok - " + name);
          console.error(err);
          process.exitCode = 1;
        }
      );
    }
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
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

test("detail defaults to the products tab and only accepts known tabs", () => {
  const toastCalls = [];
  const forbiddenCalls = [];
  const app = { globalData: { task_data: {} } };
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

  withDetailPage(app, wxStub, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    assert.strictEqual(page.data.activeDetailTab, "products");
    ["intro", "products", "comments"].forEach((tab) => {
      page.switchDetailTab({ currentTarget: { dataset: { tab } } });
      assert.strictEqual(page.data.activeDetailTab, tab);
    });
    page.switchDetailTab({ currentTarget: { dataset: { tab: "checkout" } } });
    assert.strictEqual(page.data.activeDetailTab, "comments");

    page.showDemoProduct();
    assert.strictEqual(toastCalls.length, 1);
    assert.match(toastCalls[0].title, /演示|暂不支持购买/);
    assert.deepStrictEqual(forbiddenCalls, []);
  });
});

test("detail renders video commerce tabs and keeps card comments visible", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxml"),
    "utf8"
  );
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxss"),
    "utf8"
  );

  assert.match(wxml, /class="detail-tabs"[^>]+wx:if="{{type === 'post'}}"/);
  assert.match(wxml, /data-tab="intro"[^>]+bindtap="switchDetailTab"/);
  assert.match(wxml, /data-tab="products"[^>]+bindtap="switchDetailTab"/);
  assert.match(wxml, /data-tab="comments"[^>]+bindtap="switchDetailTab"/);
  assert.match(wxml, /简介/);
  assert.match(wxml, /同款好物·{{demoProducts\.length}}/);
  assert.match(wxml, /评论/);
  assert.match(wxml, /activeDetailTab === 'products' \? 'active' : ''/);

  assert.match(
    wxml,
    /class="detail-intro"[^>]+wx:if="{{type === 'post' && activeDetailTab === 'intro'}}"[\s\S]*?{{item\.share_text[\s\S]*?bindtap="usePostCard"/
  );
  assert.match(
    wxml,
    /class="product-grid"[^>]+wx:if="{{type === 'post' && activeDetailTab === 'products'}}"[\s\S]*?wx:for="{{demoProducts}}"[\s\S]*?bindtap="showDemoProduct"/
  );
  assert.match(wxml, /src="{{item\.imageUrl}}"[^>]+mode="aspectFill"/);
  assert.match(wxml, /{{item\.title}}/);
  assert.match(wxml, /{{item\.description}}/);
  assert.match(wxml, /{{item\.price}}/);
  assert.match(wxml, /{{item\.sales}}/);
  assert.match(wxml, /演示商品/);
  assert.match(
    wxml,
    /class="comments"[^>]+wx:if="{{type !== 'post' \|\| activeDetailTab === 'comments'}}"/
  );

  assert.match(wxss, /\.product-grid\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(wxss, /\.product-image\s*{[^}]*width:\s*100%;[^}]*height:\s*\d+rpx;[^}]*object-fit:\s*cover/s);
});

test("detail onLoad provides three demo products without breaking comments", () => {
  const app = {
    globalData: {
      task_data: {},
      community_current_item: {
        type: "post",
        post_id: "post-demo",
        title: "demo video",
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
      assert.strictEqual(page.data.demoProducts.length, 3);
      assert.strictEqual(page.data.item.post_id, "post-demo");
      assert.strictEqual(page.data.commentLoading, false);
      assert.deepStrictEqual(page.data.target.List, []);
    });
  });
});
