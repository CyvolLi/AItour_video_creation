# Detail Product Grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single detail-page demo product strip with a two-column grid of four non-purchasable demo products above comments.

**Architecture:** Reuse `getRelatedProducts` and the existing deterministic video seed, but expose four products as `demoProducts` on video post details. Render the list with WXML iteration and keep all cards bound to the existing Toast-only handler; non-post detail behavior remains unchanged.

**Tech Stack:** WeChat Mini Program JavaScript, WXML, WXSS, Node.js assertion tests.

---

### Task 1: Detail Product Grid

**Files:**
- Modify: `miniprogram/pages/detail/detail.js`
- Modify: `miniprogram/pages/detail/detail.wxml`
- Modify: `miniprogram/pages/detail/detail.wxss`
- Test: `test/demoCommercePages.test.js`

**Step 1: Write the failing tests**

- Change the detail data test to expect `demoProducts` to contain four deterministic related products for a video seed.
- Change the WXML contract to require a post-only `product-grid` between the use-card action and statistics.
- Require `wx:for="{{demoProducts}}"`, stable product keys, a clickable card bound to `showDemoProduct`, and image/title/description/price/sales fields from each item.
- Require a two-column grid and large square remote image styles.
- Keep non-post, comments, navigation, favorites, and Toast-only interaction assertions.

**Step 2: Run the target test to verify RED**

Run: `node test/demoCommercePages.test.js`

Expected: FAIL because detail still exposes one `featuredProduct` and renders one horizontal `demo-product-strip`.

**Step 3: Implement the minimal data change**

- Initialize `demoProducts` as an empty array.
- For post details, set `demoProducts: getRelatedProducts(productSeed, 4)`.
- Remove detail-page use of `featuredProduct` without changing `v_output` or publish page data.

**Step 4: Implement the minimal WXML and WXSS change**

- Replace the single strip with a post-only two-column grid rendered from `demoProducts`.
- Render a large square image, title, one-line description, red price, and simulated sales count on each card.
- Bind every card to `showDemoProduct`; do not add purchase buttons, navigation, APIs, tabs, or local images.
- Keep statistics and comments immediately after the grid and preserve non-post layouts.

**Step 5: Verify GREEN**

Run: `node test/demoCommercePages.test.js`

Expected: all page-contract scenarios pass.

**Step 6: Run broader verification**

- Run all `test/*.test.js` files.
- Run `node --check miniprogram/pages/detail/detail.js`.
- Run `git diff --check`.
- Confirm the changed diff adds no local image files or real commerce APIs.

**Step 7: Commit**

```bash
git add miniprogram/pages/detail/detail.js miniprogram/pages/detail/detail.wxml miniprogram/pages/detail/detail.wxss test/demoCommercePages.test.js
git commit -m "style: add detail product grid"
```
