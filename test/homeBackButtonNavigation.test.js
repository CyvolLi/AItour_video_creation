const assert = require("assert");

const modulePath = require.resolve(
  "../miniprogram/components/homeBackButton/goback.js"
);

async function withComponent(getCurrentPagesValue, run) {
  const hadComponent = Object.prototype.hasOwnProperty.call(global, "Component");
  const hadGetCurrentPages = Object.prototype.hasOwnProperty.call(
    global,
    "getCurrentPages"
  );
  const hadWx = Object.prototype.hasOwnProperty.call(global, "wx");
  const previousComponent = global.Component;
  const previousGetCurrentPages = global.getCurrentPages;
  const previousWx = global.wx;
  const previousModule = require.cache[modulePath];
  let definition;

  global.Component = (value) => {
    definition = value;
  };
  global.getCurrentPages = () => getCurrentPagesValue;

  const calls = {
    navigateBack: 0,
    reLaunch: 0
  };
  global.wx = {
    navigateBack() {
      calls.navigateBack += 1;
    },
    reLaunch() {
      calls.reLaunch += 1;
    }
  };

  try {
    delete require.cache[modulePath];
    require(modulePath);
    assert.ok(definition, "goback.js should register a Component definition");
    return await run(definition, calls);
  } finally {
    if (previousModule) {
      require.cache[modulePath] = previousModule;
    } else {
      delete require.cache[modulePath];
    }

    if (hadComponent) global.Component = previousComponent;
    else delete global.Component;
    if (hadGetCurrentPages) global.getCurrentPages = previousGetCurrentPages;
    else delete global.getCurrentPages;
    if (hadWx) global.wx = previousWx;
    else delete global.wx;
  }
}

async function testReturnsToExistingCommunityPage() {
  await withComponent(
    [{ route: "pages/community/community" }, { route: "pages/detail/detail" }],
    async (definition, calls) => {
      definition.methods.handleTap();

      assert.strictEqual(calls.navigateBack, 1);
      assert.strictEqual(calls.reLaunch, 0);
    }
  );
}

async function testFallsBackToCommunityWhenNoCommunityPageExists() {
  await withComponent(
    [{ route: "pages/profile/profile" }],
    async (definition, calls) => {
      definition.methods.handleTap();

      assert.strictEqual(calls.navigateBack, 0);
      assert.strictEqual(calls.reLaunch, 1);
    }
  );
}

async function main() {
  await testReturnsToExistingCommunityPage();
  await testFallsBackToCommunityWhenNoCommunityPageExists();
  console.log("ok - home back button reuses existing community page");
}

main().catch((err) => {
  console.error("not ok - home back button reuses existing community page");
  console.error(err);
  process.exitCode = 1;
});
