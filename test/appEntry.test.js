const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../miniprogram/app.json"),
    "utf8"
  )
);

assert.strictEqual(
  appConfig.entryPagePath,
  "pages/index/index",
  "the app should start from the main index instead of a debug page"
);

console.log("ok - starts the app from the main index page");
