const assert = require("assert");
const fs = require("fs");
const path = require("path");

const testCases = [];

function test(name, fn) {
  testCases.push({ name, fn });
}

function loadTargetIdModule() {
  const modulePath = path.join(
    __dirname,
    "../miniprogram/utils/targetId.js"
  );

  assert.ok(fs.existsSync(modulePath), "targetId utility should exist");
  return require(modulePath);
}

test("creates a UUID v4 target id string", () => {
  const { createTargetId } = loadTargetIdModule();
  const targetId = createTargetId(() => 0);

  assert.strictEqual(typeof targetId, "string");
  assert.match(
    targetId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
});

test("creates different target ids from different random input", () => {
  const { createTargetId } = loadTargetIdModule();
  const first = createTargetId(() => 0);
  const second = createTargetId(() => 0.5);

  assert.notStrictEqual(first, second);
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
