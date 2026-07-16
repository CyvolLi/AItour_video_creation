const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  getRelatedProducts,
  pickProduct
} = require("../miniprogram/utils/demoProducts.js");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

function withDetailPage(app, wxStub, run) {
  const modulePath = require.resolve("../miniprogram/pages/detail/detail.js");
  const hadGetApp = Object.prototype.hasOwnProperty.call(global, "getApp");
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const hadGetCurrentPages = Object.prototype.hasOwnProperty.call(
    global,
    "getCurrentPages"
  );
  const previousGetApp = global.getApp;
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousGetCurrentPages = global.getCurrentPages;
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
    if (hadGetCurrentPages) global.getCurrentPages = previousGetCurrentPages;
    else delete global.getCurrentPages;
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

test("v_output matches the detail video product overlay layout", () => {
  const wxmlPath = path.join(
    __dirname,
    "../miniprogram/pages/v_output/v_output.wxml"
  );
  const wxml = fs.readFileSync(wxmlPath, "utf8");
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/v_output/v_output.wxss"),
    "utf8"
  );
  const detailWxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxss"),
    "utf8"
  );
  const cardStart = wxml.indexOf('<view class="video-card">');
  const videoWrapStart = wxml.indexOf('<view class="video-wrap">', cardStart);
  const videoStart = wxml.indexOf("<video", videoWrapStart);
  const overlayStart = wxml.indexOf('<cover-view class="demo-product-overlay"', videoStart);
  const nextCardStart = wxml.indexOf('<view class="copy-card">', cardStart);

  assert.ok(cardStart >= 0, "video-card should exist");
  assert.ok(videoWrapStart > cardStart, "video wrapper should be inside video-card");
  assert.ok(videoStart > videoWrapStart, "video should be inside its wrapper");
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
  assert.match(wxml, />同款\s*›</);
  assert.match(wxml, /<video[\s\S]*?\scontrols(?:\s|>)/);
  assert.match(wxml, /bindplay="onVideoPlay"/);
  assert.match(wxml, /bindpause="onVideoPause"/);
  assert.match(wxml, /bindended="onVideoEnded"/);
  assert.match(
    wxml.slice(overlayStart, nextCardStart),
    /wx:if="{{featuredProduct\s*&&\s*isVideoPlaying}}"/
  );
  assert.doesNotMatch(wxml, /class="publish-bar"/);
  const overlayStyle = wxss.match(
    /\.demo-product-overlay\s*{([^}]*)}/
  )[1];
  const imageStyle = wxss.match(/\.demo-product-image\s*{([^}]*)}/)[1];
  const titleStyle = wxss.match(/\.demo-product-title\s*{([^}]*)}/)[1];
  const priceStyle = wxss.match(/\.demo-product-price\s*{([^}]*)}/)[1];
  const ctaStyle = wxss.match(/\.demo-product-cta\s*{([^}]*)}/)[1];
  const detailOverlayStyle = detailWxss.match(
    /\.video-product-overlay\s*{([^}]*)}/
  )[1];
  const detailImageStyle = detailWxss.match(/\.video-product-image\s*{([^}]*)}/)[1];
  const detailTitleStyle = detailWxss.match(/\.video-product-title\s*{([^}]*)}/)[1];
  const detailPriceStyle = detailWxss.match(/\.video-product-price\s*{([^}]*)}/)[1];
  const detailCtaStyle = detailWxss.match(/\.video-product-action\s*{([^}]*)}/)[1];
  const readProperty = (style, property) => {
    const match = style.match(new RegExp(`${property}:\\s*([^;]+)`));
    return match ? match[1].trim() : undefined;
  };

  [
    "left",
    "bottom",
    "width",
    "height",
    "padding",
    "border",
    "border-radius",
    "background",
    "box-shadow"
  ].forEach((property) => {
    assert.strictEqual(
      readProperty(overlayStyle, property),
      readProperty(detailOverlayStyle, property),
      `overlay ${property} should match detail`
    );
  });
  ["width", "height", "border-radius", "background"].forEach((property) => {
    assert.strictEqual(
      readProperty(imageStyle, property),
      readProperty(detailImageStyle, property),
      `product image ${property} should match detail`
    );
  });
  assert.strictEqual(
    readProperty(titleStyle, "font-size"),
    readProperty(detailTitleStyle, "font-size")
  );
  assert.strictEqual(
    readProperty(priceStyle, "font-size"),
    readProperty(detailPriceStyle, "font-size")
  );
  ["color", "font-size", "font-weight", "white-space"].forEach((property) => {
    assert.strictEqual(
      readProperty(ctaStyle, property),
      readProperty(detailCtaStyle, property),
      `product action ${property} should match detail`
    );
  });
  assert.doesNotMatch(overlayStyle, /\bright\s*:/);
  assert.strictEqual(
    wxml.indexOf('<cover-view class="demo-product-overlay"', overlayStart + 1),
    -1,
    "the product overlay should not be duplicated outside the video card"
  );
});

test("v_output keeps download, publish, and regenerate in one action panel", () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/v_output/v_output.wxml"),
    "utf8"
  );
  const wxss = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/v_output/v_output.wxss"),
    "utf8"
  );
  const panelStart = wxml.indexOf('<view class="actions-panel">');
  const panelEnd = wxml.indexOf("</scroll-view>", panelStart);
  const actions = wxml.slice(panelStart, panelEnd);
  const saveStart = actions.indexOf('bindtap="saveVideo"');
  const publishStart = actions.indexOf('bindtap="publishPost"');
  const regenerateStart = actions.indexOf('bindtap="backToGenerate"');

  assert.ok(panelStart >= 0, "actions-panel should exist");
  assert.ok(saveStart >= 0, "download action should remain available");
  assert.ok(publishStart > saveStart, "publish should follow download");
  assert.ok(regenerateStart > publishStart, "regenerate should follow publish");
  assert.doesNotMatch(wxml, /class="publish-bar"/);
  assert.doesNotMatch(wxss, /\.publish-bar\s*{/);
  assert.match(wxss, /\.content-shell\s*{[^}]*padding:\s*[^;]*\b(?:[4-9]\d|1[01]\d)rpx/is);
});

test("detail product entry opens the local list and back stays local", () => {
  const navigationCalls = [];
  let backCalls = 0;
  const forbiddenCalls = [];
  const app = { globalData: { task_data: {} } };
  const wxStub = {
    showToast() {
      forbiddenCalls.push("showToast");
    },
    navigateBack() {
      backCalls += 1;
    },
    reLaunch() {
      forbiddenCalls.push("reLaunch");
    },
    navigateTo(options) {
      navigationCalls.push(options.url);
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
    global.getCurrentPages = () => [{ route: "pages/community/community" }, { route: "pages/detail/detail" }];

    assert.deepStrictEqual(page.data.demoProducts, []);
    assert.strictEqual(page.data.featuredProduct, undefined);
    assert.strictEqual(page.data.activeDetailTab, undefined);
    assert.strictEqual(page.switchDetailTab, undefined);
    assert.strictEqual(page.showDemoProduct, undefined);
    assert.strictEqual(typeof page.openProductList, "function");

    page.openProductList();
    page.goBack();
    assert.deepStrictEqual(navigationCalls, [
      "/pages/product_list/product_list"
    ]);
    assert.strictEqual(backCalls, 1);
    assert.deepStrictEqual(forbiddenCalls, []);
  });
});

test("detail product overlay follows the video playback state", () => {
  const app = { globalData: { task_data: {} } };

  withDetailPage(app, {}, (pageDefinition) => {
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

test("detail measures the custom navigation around the menu capsule", async () => {
  let windowInfoCalls = 0;
  let menuRectCalls = 0;
  const app = {
    globalData: {
      task_data: {},
      community_current_item: { type: "post", post_id: "post-nav" }
    }
  };
  const wxStub = {
    cloud: null,
    showToast() {},
    getWindowInfo() {
      windowInfoCalls += 1;
      return { statusBarHeight: 47, windowWidth: 390 };
    },
    getMenuButtonBoundingClientRect() {
      menuRectCalls += 1;
      return { top: 51, bottom: 83, height: 32, left: 296, right: 383 };
    }
  };

  await withDetailPage(app, wxStub, async (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    await page.onLoad({ type: "post", id: "post-nav" });

    assert.strictEqual(windowInfoCalls, 1);
    assert.strictEqual(menuRectCalls, 1);
    assert.strictEqual(page.data.statusBarHeight, 47);
    assert.strictEqual(page.data.navContentHeight, 40);
    assert.strictEqual(page.data.capsuleRightInset, 102);
  });
});

test("detail custom navigation falls back when modern window APIs are missing", async () => {
  let systemInfoCalls = 0;
  const app = {
    globalData: {
      task_data: {},
      community_current_item: { type: "card", card_id: "card-nav" }
    }
  };
  const wxStub = {
    cloud: null,
    showToast() {},
    getSystemInfoSync() {
      systemInfoCalls += 1;
      return { statusBarHeight: 24, windowWidth: 360 };
    }
  };

  await withDetailPage(app, wxStub, async (pageDefinition) => {
    const page = createPageInstance(pageDefinition);

    await page.onLoad({ type: "card", id: "card-nav" });

    assert.strictEqual(systemInfoCalls, 1);
    assert.strictEqual(page.data.statusBarHeight, 24);
    assert.strictEqual(page.data.navContentHeight, 44);
    assert.strictEqual(page.data.capsuleRightInset, 96);
  });
});

test("detail falls back to the community when opened without a previous page", () => {
  const navigationCalls = [];
  const app = { globalData: { task_data: {} } };
  const wxStub = {
    navigateBack() {
      navigationCalls.push("navigateBack");
    },
    reLaunch(options) {
      navigationCalls.push({ reLaunch: options.url });
    }
  };

  withDetailPage(app, wxStub, (pageDefinition) => {
    const page = createPageInstance(pageDefinition);
    global.getCurrentPages = () => [{ route: "pages/detail/detail" }];

    page.goBack();

    assert.deepStrictEqual(navigationCalls, [
      { reLaunch: "/pages/community/community" }
    ]);
  });
});

test("detail keeps the product banner while adding an overlay inside the post video", () => {
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
  assert.match(
    wxml,
    /class="custom-header"[^>]+style="padding-top: {{statusBarHeight}}px;"/
  );
  assert.match(
    wxml,
    /class="header-row"[^>]+style="height: {{navContentHeight}}px; padding-right: {{capsuleRightInset}}px;"/
  );
  assert.match(wxml, /class="back-button"[^>]+bindtap="goBack"/);
  assert.match(wxml, />内容详情</);
  assert.doesNotMatch(wxml, /detail-tabs|activeDetailTab|switchDetailTab/);

  const headerStart = wxml.indexOf('class="custom-header"');
  const postStart = wxml.indexOf('class="post-card"');
  const videoWrapStart = wxml.indexOf('class="video-wrap"', postStart);
  const videoStart = wxml.indexOf('class="video"', videoWrapStart);
  const productStart = wxml.indexOf('class="video-product-overlay"', videoStart);
  const authorStart = wxml.indexOf('class="author-line"', videoStart);
  const titleStart = wxml.indexOf('class="title"', authorStart);
  const copyStart = wxml.indexOf('class="copy"', titleStart);
  const useCardStart = wxml.indexOf('bindtap="usePostCard"', copyStart);
  const bannerStart = wxml.indexOf('class="product-banner"', useCardStart);
  const statsStart = wxml.indexOf('class="target"', bannerStart);
  const commentsStart = wxml.indexOf('class="comments"', statsStart);

  assert.ok(headerStart >= 0, "custom header should exist");
  assert.ok(postStart > headerStart, "post card should follow the header");
  assert.ok(videoWrapStart > postStart, "video wrapper should be inside the post card");
  assert.ok(videoStart > videoWrapStart, "video should be inside its wrapper");
  assert.ok(productStart > videoStart, "product overlay should be inside the video wrapper");
  assert.ok(authorStart > videoStart, "author should follow the video");
  assert.ok(titleStart > authorStart, "title should follow the author");
  assert.ok(copyStart > titleStart, "copy should follow the title");
  assert.ok(useCardStart > copyStart, "use-card action should follow the copy");
  assert.ok(bannerStart > useCardStart, "product banner should remain above stats");
  assert.ok(statsStart > bannerStart, "stats should follow the product banner");
  assert.ok(commentsStart > statsStart, "comments should remain visible after stats");

  assert.match(wxml, /class="video-product-overlay"[^>]+wx:if="{{type === 'post' && demoProducts\.length && isVideoPlaying}}"/);
  assert.match(wxml, /class="video"[^>]+bindplay="onVideoPlay"[^>]+bindpause="onVideoPause"[^>]+bindended="onVideoEnded"/s);
  assert.doesNotMatch(wxml, /wx:for="{{demoProducts}}"/);
  assert.match(wxml, /class="video-product-overlay"[^>]+bindtap="openProductList"/);
  assert.match(wxml, /<cover-image[^>]+src="{{demoProducts\[0\]\.imageUrl}}"/s);
  assert.match(wxml, /class="product-banner"[^>]+wx:if="{{type === 'post' && demoProducts\.length}}"/);
  assert.match(wxml, /class="product-banner"[^>]+bindtap="openProductList"/);
  assert.match(wxml, /class="product-media"[^>]+src="{{demoProducts\[0\]\.imageUrl}}"/);
  assert.match(wxml, /{{demoProducts\[0\]\.title}}/);
  assert.match(wxml, /{{demoProducts\[0\]\.description}}/);
  assert.match(wxml, /{{demoProducts\[0\]\.price}}/);
  assert.match(wxml, /{{demoProducts\[0\]\.sales}}/);
  assert.match(wxml, />同款\s*›</);
  assert.match(wxml, /class="product-action"/);
  assert.match(wxml, /class="stat stat-favorite"[^>]+bindtap="favoriteCurrent"/);
  assert.match(wxml, /class="comments"/);
  assert.match(wxss, /\.page\s*{[^}]*background:\s*#[0-9a-f]{6}/is);
  assert.match(wxss, /\.post-card\s*{[^}]*border-radius:\s*(?:2[4-9]|3[0-4])rpx/is);
  assert.match(wxss, /\.video-wrap\s*{[^}]*position:\s*relative/is);
  assert.match(wxss, /\.video-product-overlay\s*{[^}]*position:\s*absolute[^}]*left:\s*24rpx[^}]*bottom:\s*74rpx[^}]*width:\s*55%[^}]*height:\s*72rpx/is);
  assert.match(wxss, /\.video-product-overlay\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/is);
  assert.match(wxss, /\.video-product-image\s*{[^}]*width:\s*64rpx[^}]*height:\s*64rpx/is);
  assert.match(wxss, /\.video-product-title\s*{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/is);
  assert.match(wxss, /\.video-product-price\s*{[^}]*color:\s*#(?:d|e|f)[0-9a-f]{5}/is);
  assert.match(wxss, /\.product-banner\s*{[^}]*display:\s*flex[^}]*align-items:\s*center[^}]*justify-content:\s*space-between/is);
  assert.match(wxss, /\.product-media\s*{[^}]*width:\s*150rpx[^}]*height:\s*150rpx/is);
  assert.match(wxss, /\.product-title\s*{[^}]*overflow:\s*hidden/is);
  assert.match(wxss, /\.product-price\s*{[^}]*color:\s*#(?:d|e|f)[0-9a-f]{5}/is);
  assert.match(wxss, /\.header-title\s*{[^}]*flex:\s*1;[^}]*min-width:\s*0/is);
  assert.doesNotMatch(wxss, /padding:\s*[^;]*190rpx/);
});

test("detail updates the local favorite count after toggling", async () => {
  const profileStore = require("../miniprogram/utils/profileStore.js");
  const originalToggleFavorite = profileStore.toggleFavorite;
  const toggleResults = [{ isFavorited: true }, { isFavorited: false }, { isFavorited: false }];
  const toastCalls = [];
  const app = { globalData: { task_data: { openid: "openid-detail" } } };
  const wxStub = {
    showToast(options) {
      toastCalls.push(options);
    }
  };

  profileStore.toggleFavorite = () => Promise.resolve(toggleResults.shift());

  try {
    await withDetailPage(app, wxStub, async (pageDefinition) => {
      const page = createPageInstance(pageDefinition);
      page.setData({
        type: "post",
        item: { post_id: "post-favorite" },
        target: { likes: 8, favorites: 2, comments: 3, List: [{ comment_id: "c1" }] }
      });

      await page.favoriteCurrent();
      assert.strictEqual(page.data.target.favorites, 3);
      assert.strictEqual(page.data.target.likes, 8);
      assert.strictEqual(page.data.target.comments, 3);
      assert.strictEqual(page.data.target.List.length, 1);

      await page.favoriteCurrent();
      assert.strictEqual(page.data.target.favorites, 2);

      page.setData({ target: { ...page.data.target, favorites: 0 } });
      await page.favoriteCurrent();
      assert.strictEqual(page.data.target.favorites, 0);
      assert.deepStrictEqual(toastCalls.map((call) => call.title), [
        "已收藏",
        "已取消",
        "已取消"
      ]);
    });
  } finally {
    profileStore.toggleFavorite = originalToggleFavorite;
  }
});

test("detail onLoad shows only the endorsed product without breaking comments", () => {
  const endorsedProduct = pickProduct("video-1");
  const app = {
    globalData: {
      task_data: { landscape: "sharepool" },
      community_current_item: {
        type: "post",
        post_id: "post-demo",
        landscape: "001",
        title: "demo video",
        video_url: "video-1",
        endorsement_product: endorsedProduct,
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
      assert.deepStrictEqual(
        page.data.demoProducts,
        [endorsedProduct]
      );
      assert.strictEqual(page.data.demoProducts.length, 1);
      assert.strictEqual(page.data.featuredProduct, undefined);
      assert.strictEqual(page.data.item.post_id, "post-demo");
      assert.strictEqual(page.data.commentLoading, false);
      assert.deepStrictEqual(page.data.target.List, []);
    });
  });
});

test("detail hides products when a post has no endorsed product", () => {
  const app = {
    globalData: {
      task_data: { landscape: "001" },
      community_current_item: {
        type: "post",
        post_id: "post-yuexiu-legacy",
        video_url: "video-yuexiu-legacy",
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

    await page.onLoad({ type: "post", id: "post-yuexiu-legacy" });

    assert.deepStrictEqual(page.data.demoProducts, []);
  });
});

test("detail does not add products to a video from another landscape", () => {
  const app = {
    globalData: {
      task_data: { landscape: "001" },
      community_current_item: {
        type: "post",
        post_id: "post-campus",
        landscape: "002",
        video_url: "video-campus",
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

    await page.onLoad({ type: "post", id: "post-campus" });

    assert.deepStrictEqual(page.data.demoProducts, []);
  });
});

test("detail does not add products to an unmarked post in the public pool", () => {
  const app = {
    globalData: {
      task_data: { landscape: "sharepool" },
      community_current_item: {
        type: "post",
        post_id: "post-public",
        video_url: "video-public",
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

    await page.onLoad({ type: "post", id: "post-public" });

    assert.deepStrictEqual(page.data.demoProducts, []);
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
    assert.doesNotMatch(wxml, /detail-tabs|activeDetailTab|switchDetailTab/);
    assert.match(wxml, /class="card-view"[^>]+wx:if="{{type !== 'post'}}"/);
    assert.match(wxml, /class="comments"/);
    assert.doesNotMatch(wxml, /class="comments"[^>]+wx:if=/);
    assert.deepStrictEqual(page.data.demoProducts, []);
    assert.match(wxml, /class="video-product-overlay"[^>]+wx:if="{{type === 'post' && demoProducts\.length && isVideoPlaying}}"/);
    assert.match(wxml, /class="product-banner"[^>]+wx:if="{{type === 'post' && demoProducts\.length}}"/);
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

test("publish forces a generated string target_id into the payload", async () => {
  const publishCalls = [];
  const app = {
    globalData: {
      task_data: {
        openid: "openid-demo",
        target_id: "target-demo",
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
    const generatedTargetId = page.data.targetId;
    page.setData({ title: "发布标题" });
    page.onEndorsementChange({ detail: { value: true } });
    page.publishPost();

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(publishCalls.length, 1);
    assert.deepStrictEqual(Object.keys(publishCalls[0]).sort(), [
      "card_id",
      "cover_url",
      "endorsement_product",
      "landscape",
      "location_name",
      "openid",
      "share_text",
      "target_id",
      "title",
      "video_url"
    ]);
    assert.strictEqual(typeof generatedTargetId, "string");
    assert.match(
      generatedTargetId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    assert.strictEqual(publishCalls[0].target_id, generatedTargetId);
    assert.deepStrictEqual(
      publishCalls[0].endorsement_product,
      page.data.endorsementCandidate
    );
    assert.notStrictEqual(publishCalls[0].target_id, "target-demo");
    assert.notStrictEqual(publishCalls[0].target_id, "card-demo");
    assert.notStrictEqual(publishCalls[0].target_id, "none");
  });
});

test("publish reuses the generated target_id after a failed request", async () => {
  const publishCalls = [];
  const errorCalls = [];
  const originalConsoleError = console.error;
  const app = {
    globalData: {
      task_data: {
        openid: "openid-retry",
        target_id: "legacy-target",
        card_id: "card-retry",
        landscape: "001"
      },
      video_url: "https://example.com/retry-video.mp4",
      final_response: "retry copy"
    }
  };
  const wxStub = {
    showToast() {},
    reLaunch() {}
  };
  const communityStub = {
    apiCommunityPostPublish(payload) {
      publishCalls.push(payload);
      return publishCalls.length === 1
        ? Promise.reject(new Error("temporary publish failure"))
        : Promise.resolve({});
    }
  };

  console.error = (...args) => errorCalls.push(args);

  try {
    await withPublishPage(app, wxStub, communityStub, async (pageDefinition) => {
      const page = createPageInstance(pageDefinition);
      page.onLoad();
      const generatedTargetId = page.data.targetId;

      page.publishPost();
      await new Promise((resolve) => setImmediate(resolve));
      assert.strictEqual(page.data.publishing, false);

      page.publishPost();
      await new Promise((resolve) => setImmediate(resolve));

      assert.strictEqual(publishCalls.length, 2);
      assert.strictEqual(publishCalls[0].target_id, generatedTargetId);
      assert.strictEqual(publishCalls[1].target_id, generatedTargetId);
      assert.notStrictEqual(generatedTargetId, "legacy-target");
      assert.notStrictEqual(generatedTargetId, "card-retry");
      assert.strictEqual(errorCalls.length, 1);
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test("publish uses a default title when the title input is empty", async () => {
  const publishCalls = [];
  const toastCalls = [];
  const app = {
    globalData: {
      task_data: {
        openid: "openid-demo",
        target_id: "target-demo",
        card_id: "card-demo",
        landscape: "001"
      },
      video_url: "https://example.com/video.mp4",
      final_response: "travel copy"
    }
  };
  const wxStub = {
    showToast(options) {
      toastCalls.push(options);
    },
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
    page.publishPost();

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(publishCalls.length, 1);
    assert.strictEqual(publishCalls[0].title, "旅行作品");
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(
        publishCalls[0],
        "endorsement_product"
      ),
      false
    );
    assert.strictEqual(
      toastCalls.some((call) => call.title === "缺少发布信息"),
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
  assert.match(
    wxml,
    /class="endorsement-image endorsement-image-large"[^>]+src="{{endorsementProduct\.imageUrl}}"[^>]+mode="aspectFill"/
  );
  assert.match(wxml, /class="endorsement-market"[^>]*>乡村市集</);
  assert.match(wxml, /{{endorsementProduct\.title}}/);
  assert.match(
    wxml,
    /class="endorsement-price endorsement-price-demo"[^>]*>{{endorsementProduct\.price}}/
  );
  assert.match(wxml, /class="endorsement-sales"[^>]*>已售{{endorsementProduct\.sales}}/);
  assert.match(wxml, /智能匹配，仅演示，不影响发布/);
  assert.doesNotMatch(wxml, /<view[^>]+bindtap="onEndorsementChange"/);
  assert.match(
    wxss,
    /\.endorsement-preview\s*{[^}]*border-radius:[^;}]+;[^}]*background:\s*(?:#fff(?:fff)?|rgba\(255,\s*255,\s*255,[^)]+\))/s
  );
  assert.match(
    wxss,
    /\.endorsement-image-large\s*{[^}]*width:\s*(?:2[0-9]{2}|[3-9][0-9]{2})rpx;[^}]*height:\s*(?:2[0-9]{2}|[3-9][0-9]{2})rpx;/s
  );
  assert.match(
    wxss,
    /\.endorsement-price-demo\s*{[^}]*color:\s*#(?:e[0-9a-f]{5}|f[0-7][0-9a-f]{4});/is
  );
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
