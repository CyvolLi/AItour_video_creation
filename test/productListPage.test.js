const assert = require("assert");
const fs = require("fs");
const path = require("path");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

function withProductListPage(wxStub, run) {
  const modulePath = require.resolve(
    "../miniprogram/pages/product_list/product_list.js"
  );
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousGetCurrentPages = global.getCurrentPages;
  const hadPage = Object.prototype.hasOwnProperty.call(global, "Page");
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const hadGetCurrentPages = Object.prototype.hasOwnProperty.call(
    global,
    "getCurrentPages"
  );
  let definition;

  delete require.cache[modulePath];
  global.Page = (value) => {
    definition = value;
  };
  global.wx = wxStub;
  global.getCurrentPages = () => [
    { route: "pages/detail/detail" },
    { route: "pages/product_list/product_list" }
  ];

  try {
    require(modulePath);
    assert.ok(definition, "product_list.js should register a Page definition");
    return run(definition);
  } finally {
    delete require.cache[modulePath];
    if (hadPage) global.Page = previousPage;
    else delete global.Page;
    if (hadWx) global.wx = previousWx;
    else delete global.wx;
    if (hadGetCurrentPages) global.getCurrentPages = previousGetCurrentPages;
    else delete global.getCurrentPages;
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

test("registers the product list and binds both detail product entries to it", () => {
  const appConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../miniprogram/app.json"), "utf8")
  );
  const detailWxml = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.wxml"),
    "utf8"
  );

  assert.ok(appConfig.pages.includes("pages/product_list/product_list"));
  assert.match(
    detailWxml,
    /class="video-product-overlay"[^>]+bindtap="openProductList"/
  );
  assert.match(
    detailWxml,
    /class="product-banner"[^>]+bindtap="openProductList"/
  );
});

test("detail opens only the local product list page", () => {
  const detailJs = fs.readFileSync(
    path.join(__dirname, "../miniprogram/pages/detail/detail.js"),
    "utf8"
  );
  const method = detailJs.match(/openProductList\(\)[\s\S]*?\n  },/);

  assert.ok(method, "detail should define openProductList");
  assert.match(
    method[0],
    /wx\.navigateTo\([\s\S]*?\/pages\/product_list\/product_list/
  );
  assert.doesNotMatch(
    method[0],
    /request|openEmbeddedMiniProgram|navigateToMiniProgram/
  );
});

test("provides all four files required by the registered page", () => {
  const root = path.join(
    __dirname,
    "../miniprogram/pages/product_list/product_list"
  );

  [".js", ".wxml", ".wxss", ".json"].forEach((extension) => {
    assert.ok(fs.existsSync(root + extension), `missing product_list${extension}`);
  });
});

test("loads all products and filters them locally", () => {
  withProductListPage({}, (definition) => {
    const page = createPageInstance(definition);

    assert.strictEqual(typeof page.onLoad, "function");
    assert.strictEqual(typeof page.onSearchInput, "function");
    page.onLoad();
    assert.strictEqual(page.data.products.length, 4);
    assert.strictEqual(page.data.filteredProducts.length, 4);

    page.onSearchInput({ detail: { value: "咖啡" } });
    assert.deepStrictEqual(
      page.data.filteredProducts.map((product) => product.id),
      ["demo-travel-coffee"]
    );

    page.onSearchInput({ detail: { value: "" } });
    assert.strictEqual(page.data.filteredProducts.length, 4);
  });
});

test("keeps product and checkout actions as local demo notices", () => {
  const calls = [];
  const wxStub = {
    showToast(options) {
      calls.push(options.title);
    },
    request() {
      calls.push("request");
    },
    navigateToMiniProgram() {
      calls.push("navigateToMiniProgram");
    }
  };

  withProductListPage(wxStub, (definition) => {
    const page = createPageInstance(definition);

    assert.strictEqual(typeof page.showDemoProduct, "function");
    assert.strictEqual(typeof page.showCheckoutNotice, "function");
    assert.strictEqual(typeof page.showContinueNotice, "function");
    page.showDemoProduct();
    page.showCheckoutNotice();
    page.showContinueNotice();

    assert.deepStrictEqual(calls, [
      "演示商品，暂不支持购买",
      "演示页面，暂不支持结算",
      "已为你保留当前好物"
    ]);
  });
});

test("measures the custom header and returns to the previous page", () => {
  let backCalls = 0;
  const wxStub = {
    getWindowInfo() {
      return { statusBarHeight: 47, windowWidth: 390 };
    },
    getMenuButtonBoundingClientRect() {
      return { top: 51, bottom: 83, height: 32, left: 296 };
    },
    navigateBack() {
      backCalls += 1;
    }
  };

  withProductListPage(wxStub, (definition) => {
    const page = createPageInstance(definition);

    assert.strictEqual(typeof page.measureNavigation, "function");
    assert.strictEqual(typeof page.goBack, "function");
    page.measureNavigation();
    assert.strictEqual(page.data.statusBarHeight, 47);
    assert.strictEqual(page.data.navContentHeight, 40);
    assert.strictEqual(page.data.capsuleRightInset, 102);
    page.goBack();
    assert.strictEqual(backCalls, 1);
  });
});

test("renders a reference-aligned two-column catalog", () => {
  const pageRoot = path.join(
    __dirname,
    "../miniprogram/pages/product_list/product_list"
  );
  const wxml = fs.readFileSync(pageRoot + ".wxml", "utf8");
  const wxss = fs.readFileSync(pageRoot + ".wxss", "utf8");
  const json = JSON.parse(fs.readFileSync(pageRoot + ".json", "utf8"));

  assert.strictEqual(json.navigationStyle, "custom");
  assert.match(wxml, /bindinput="onSearchInput"/);
  assert.match(wxml, /wx:for="{{filteredProducts}}"/);
  assert.match(wxml, /wx:key="id"/);
  assert.match(wxml, /src="{{item.imageUrl}}"/);
  assert.match(wxml, /{{item.title}}/);
  assert.match(wxml, /{{item.price}}/);
  assert.match(wxml, /已售{{item.sales}}/);
  assert.match(wxml, /wx:if="{{!filteredProducts.length}}"/);
  assert.match(wxml, /bindtap="showCheckoutNotice"/);
  assert.match(wxml, /bindtap="showContinueNotice"/);
  assert.doesNotMatch(
    wxml,
    /我的列表|乡村市集|活动倒计时|class="filter-row"|class="filter-pill"|class="countdown"/
  );
  assert.match(
    wxss,
    /\.product-grid\s*{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/is
  );
  assert.match(wxss, /\.product-card\s*{[^}]*width:\s*calc\(50%/is);
  assert.match(wxss, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(
    wxss,
    /\.filter-row\s*{|\.filter-pill(?:-active)?\s*{|\.countdown\s*{/
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
