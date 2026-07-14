const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { pickProduct } = require("../miniprogram/utils/demoProducts.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
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
