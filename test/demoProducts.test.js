const assert = require("assert");

const {
  DEMO_PRODUCTS,
  getFeaturedProducts,
  getRelatedProducts,
  pickProduct
} = require("../miniprogram/utils/demoProducts.js");

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    console.error("not ok - " + name);
    throw err;
  }
}

test("provides at least four complete demo products with fixed remote images", () => {
  assert.ok(Array.isArray(DEMO_PRODUCTS));
  assert.ok(DEMO_PRODUCTS.length >= 4);

  DEMO_PRODUCTS.forEach((product) => {
    ["id", "title", "price", "tag", "description", "imageUrl", "sales"].forEach(
      (field) => {
        assert.ok(product[field], `${field} should be present`);
      }
    );
    assert.match(product.imageUrl, /^https:\/\//);
    assert.ok(product.imageUrl.includes("images.unsplash.com/"));
    assert.ok(!product.imageUrl.includes("random"));
    assert.ok(!product.imageUrl.startsWith("/"));
    const imageUrl = new URL(product.imageUrl);
    assert.strictEqual(imageUrl.searchParams.get("w"), "640");
    assert.strictEqual(imageUrl.searchParams.get("h"), "640");
    assert.strictEqual(imageUrl.searchParams.get("fit"), "crop");
  });
});

test("limits featured products and handles non-positive or excessive limits", () => {
  assert.deepStrictEqual(getFeaturedProducts(0), []);
  assert.deepStrictEqual(getFeaturedProducts(-2), []);
  assert.strictEqual(getFeaturedProducts(2).length, 2);
  assert.strictEqual(
    getFeaturedProducts(DEMO_PRODUCTS.length + 10).length,
    DEMO_PRODUCTS.length
  );
});

test("returns featured product copies without exposing shared data", () => {
  const products = getFeaturedProducts(2);
  const originalTitle = DEMO_PRODUCTS[0].title;

  assert.notStrictEqual(products, DEMO_PRODUCTS);
  assert.notStrictEqual(products[0], DEMO_PRODUCTS[0]);
  products[0].title = "changed";
  products.pop();

  assert.strictEqual(DEMO_PRODUCTS[0].title, originalTitle);
  assert.ok(DEMO_PRODUCTS.length >= 4);
});

test("picks the same product for the same seed without randomness", () => {
  const originalRandom = Math.random;
  Math.random = () => {
    throw new Error("pickProduct must not use Math.random");
  };

  try {
    assert.strictEqual(pickProduct("travel-video").id, pickProduct("travel-video").id);
  } finally {
    Math.random = originalRandom;
  }
});

test("uses seeds to reach different product indexes", () => {
  const pickedIds = new Set(
    ["coffee", "shoes", "food", "bottle", "journey"].map(
      (seed) => pickProduct(seed).id
    )
  );

  assert.ok(pickedIds.size > 1);
});

test("uses the first product when the seed is empty", () => {
  assert.strictEqual(pickProduct().id, DEMO_PRODUCTS[0].id);
  assert.strictEqual(pickProduct("").id, DEMO_PRODUCTS[0].id);
});

test("puts the seeded primary product first without duplicates", () => {
  const seed = "video-1";
  const primary = pickProduct(seed);
  const originalTitle = primary.title;

  assert.strictEqual(primary.id, DEMO_PRODUCTS[3].id);
  assert.strictEqual(typeof getRelatedProducts, "function");

  const related = getRelatedProducts(seed, 3);
  assert.strictEqual(related.length, 3);
  assert.strictEqual(related[0].id, primary.id);
  assert.strictEqual(new Set(related.map((product) => product.id)).size, 3);

  related[0].title = "changed";
  related.pop();
  assert.strictEqual(primary.title, originalTitle);
  assert.strictEqual(DEMO_PRODUCTS.length, 4);
});

test("handles non-positive and excessive related product limits", () => {
  assert.deepStrictEqual(getRelatedProducts("video-1", 0), []);
  assert.deepStrictEqual(getRelatedProducts("video-1", -2), []);
  assert.strictEqual(
    getRelatedProducts("video-1", DEMO_PRODUCTS.length + 10).length,
    DEMO_PRODUCTS.length
  );
});
