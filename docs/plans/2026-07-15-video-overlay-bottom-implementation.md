# Video Product Overlay Bottom Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the landscape-video demo product strip closer to the bottom and make it smaller without changing playback or commerce behavior.

**Architecture:** Keep the existing WXML and JavaScript event flow. Tighten the WXSS overlay geometry and its child sizes, with source-contract tests guarding bottom alignment, compactness, translucency, and controls clearance.

**Tech Stack:** WeChat Mini Program WXML/WXSS, Node.js assertion tests.

---

### Task 1: Lower And Compact The Video Product Overlay

**Files:**
- Modify: `miniprogram/pages/v_output/v_output.wxss`
- Test: `test/demoCommercePages.test.js`

**Step 1: Write the failing test**

- Change the overlay geometry contract to require a `64-68rpx` height.
- Require a `64-84rpx` bottom offset, proving the banner is visibly below the previous `104rpx` position while retaining a controls buffer.
- Require a larger right inset so the strip stays short and leaves more video visible.
- Keep translucent solid-white background, no gradient/shadow, video-card containment, and play/pause/ended assertions.

**Step 2: Run the target test to verify RED**

Run: `node test/demoCommercePages.test.js`

Expected: FAIL because the current overlay is `72rpx` high with `bottom: 104rpx`.

**Step 3: Implement the minimal style change**

- Set the overlay height near `64rpx`, bottom offset near `72rpx`, and increase the right inset.
- Reduce image, spacing, typography, and CTA dimensions only as needed to fit the new height.
- Keep `background-color: rgba(255, 255, 255, 0.82-0.86)` and do not add gradients or shadows.
- Do not modify WXML, JavaScript, handlers, native controls, or product data.

**Step 4: Run the target test to verify GREEN**

Run: `node test/demoCommercePages.test.js`

Expected: all page-contract scenarios pass.

**Step 5: Run broader verification**

- Run all `test/*.test.js` files.
- Run `node --check miniprogram/pages/v_output/v_output.js`.
- Run `git diff --check`.
- Confirm the diff contains no WXML/JS behavior changes, local images, or commerce APIs.

**Step 6: Commit**

```bash
git add miniprogram/pages/v_output/v_output.wxss test/demoCommercePages.test.js
git commit -m "style: lower video product overlay"
```
