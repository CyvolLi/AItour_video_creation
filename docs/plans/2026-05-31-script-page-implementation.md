# Script Page Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the mini program `script` page to `reference/UI_Image/script.png` while keeping the current script generation logic intact.

**Architecture:** Replace the current glassmorphism presentation with a page-local structured shell: top chrome, white editor card, stacked action buttons, and bottom dock. Keep existing page data flow and add only minimal navigation helpers needed by the new layout.

**Tech Stack:** WeChat Mini Program `wxml`, `wxss`, page `js`

---

### Task 1: Rebuild the `script` page visual shell

**Files:**
- Modify: `miniprogram/pages/script/script.wxml`
- Modify: `miniprogram/pages/script/script.wxss`
- Reference: `reference/UI_Image/script.png`

**Step 1: Replace page shell**

- Add top bar wrapper with back button and title pill
- Keep the textarea binding untouched
- Replace the existing button block with vertically stacked action buttons
- Add bottom dock structure consistent with the reference

**Step 2: Restyle the page**

- Update the page gradient and spacing
- Convert the editor to a large white rounded card
- Convert action controls into soft pill buttons
- Add dock spacing and icon styling

### Task 2: Add minimal navigation hooks

**Files:**
- Modify: `miniprogram/pages/script/script.js`

**Step 1: Add visual-shell navigation helpers**

- Add `goBack`
- Add `goCommunity`
- Add `goCreate`
- Add `goProfile`

**Step 2: Preserve core logic**

- Do not change script request flow
- Do not change `scriptContent` editing behavior

### Task 3: Static validation

**Files:**
- Verify: `docs/plans/2026-05-31-script-page-design.md`
- Verify: `docs/plans/2026-05-31-script-page-implementation.md`
- Verify: `miniprogram/pages/script/script.wxml`
- Verify: `miniprogram/pages/script/script.wxss`
- Verify: `miniprogram/pages/script/script.js`

**Step 1: Run verification**

Run: `git diff --check -- docs/plans/2026-05-31-script-page-design.md docs/plans/2026-05-31-script-page-implementation.md miniprogram/pages/script/script.wxml miniprogram/pages/script/script.wxss miniprogram/pages/script/script.js`

Expected:
- exit code `0`
- no whitespace or malformed diff issues
