const profileStore = require("../../utils/profileStore.js");
const commentStore = require("../../utils/commentStore.js");
const app = getApp();

Page({
  data: {
    openid: "",
    inputOpenid: "",
    activeTab: "profile",   // "profile" | "comment"
    results: [],
    passedCount: 0,
    running: false,
    // comment 测试用
    commentTargetId: "",
    commentIdList: []
  },

  onLoad() {
    const src1 = app.globalData.task_data && app.globalData.task_data.openid;
    const src2 = app.globalData && app.globalData.openid;
    const src3 = wx.getStorageSync("openid");
    const openid = src1 || src2 || src3 || "";
    if (openid) {
      this.setData({ openid, inputOpenid: openid });
      this.addResult("初始化", true, { openid });
    } else {
      this.setData({ openid: "未获取到openid，请手动输入" });
      this.addResult("初始化", false, "openid 为空，请在下方手动输入后重试");
    }
  },

  getOpenid() {
    const fromInput = (this.data.inputOpenid || "").trim();
    if (fromInput) return fromInput;
    return app.globalData.task_data && app.globalData.task_data.openid;
  },

  onInput(e) { this.setData({ inputOpenid: e.detail.value }); },

  confirmOpenid() {
    const val = (this.data.inputOpenid || "").trim();
    if (!val) { wx.showToast({ title: "请输入openid", icon: "none" }); return; }
    this.setData({ openid: val, results: [] });
    wx.showToast({ title: "openid 已设置", icon: "success" });
  },

  tryLogin() {
    wx.login({
      success: (res) => this.addResult("wx.login", true, { code: (res.code || "").slice(0, 12) + "..." }),
      fail: (err) => this.addResult("wx.login", false, err.errMsg || String(err))
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, results: [] });
  },

  addResult(caseName, pass, data) {
    const results = this.data.results.concat([{
      case: caseName, pass, dataStr: JSON.stringify(data)
    }]);
    this.setData({ results, passedCount: results.filter(r => r.pass).length });
  },

  // ==================== Profile 测试 ====================

  async runAllProfile() {
    const openid = this.getOpenid();
    if (!openid) { this.addResult("前置检查", false, "openid 为空"); return; }
    this.setData({ results: [], running: true });
    try { await this.profileEnsure(); } catch (e) {}
    try { await this.profileCreatePost(); } catch (e) {}
    try { await this.profileCreateCard(); } catch (e) {}
    try { await this.profileFavPost(); } catch (e) {}
    try { await this.profileFavCard(); } catch (e) {}
    try { await this.profileDedup(); } catch (e) {}
    this.setData({ running: false });
  },

  async profileEnsure() {
    this.setData({ running: true });
    try {
      const profile = await profileStore.ensureProfile(this.getOpenid());
      const pass = profile.openid === this.getOpenid()
        && Array.isArray(profile.created_post_list)
        && Array.isArray(profile.created_card_list)
        && Array.isArray(profile.favorite_post_list)
        && Array.isArray(profile.favorite_card_list);
      this.addResult("ensureProfile（读取/创建用户空间）", pass, {
        created_post: profile.created_post_list.length,
        created_card: profile.created_card_list.length,
        fav_post: profile.favorite_post_list.length,
        fav_card: profile.favorite_card_list.length
      });
    } catch (err) {
      this.addResult("ensureProfile", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async profileCreatePost() {
    this.setData({ running: true });
    try {
      const id = "test_post_" + Date.now();
      const saved = await profileStore.saveCreatedId(this.getOpenid(), "post", id);
      const pass = profileStore.listHasId(saved.created_post_list, id);
      this.addResult("saveCreatedId(post)", pass, { id, hasId: pass });
    } catch (err) {
      this.addResult("saveCreatedId(post)", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async profileCreateCard() {
    this.setData({ running: true });
    try {
      const id = "test_card_" + Date.now();
      const saved = await profileStore.saveCreatedId(this.getOpenid(), "card", id);
      const pass = profileStore.listHasId(saved.created_card_list, id);
      this.addResult("saveCreatedId(card)", pass, { id, hasId: pass });
    } catch (err) {
      this.addResult("saveCreatedId(card)", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async profileFavPost() {
    this.setData({ running: true });
    try {
      const id = "test_fav_post_" + Date.now();
      const r1 = await profileStore.toggleFavorite(this.getOpenid(), "post", id);
      const added = r1.isFavorited === true;
      const r2 = await profileStore.toggleFavorite(this.getOpenid(), "post", id);
      const removed = r2.isFavorited === false;
      this.addResult("toggleFavorite(post)", added && removed, { id, added, removed });
    } catch (err) {
      this.addResult("toggleFavorite(post)", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async profileFavCard() {
    this.setData({ running: true });
    try {
      const id = "test_fav_card_" + Date.now();
      const r1 = await profileStore.toggleFavorite(this.getOpenid(), "card", id);
      const added = r1.isFavorited === true;
      const r2 = await profileStore.toggleFavorite(this.getOpenid(), "card", id);
      const removed = r2.isFavorited === false;
      this.addResult("toggleFavorite(card)", added && removed, { id, added, removed });
    } catch (err) {
      this.addResult("toggleFavorite(card)", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async profileDedup() {
    this.setData({ running: true });
    try {
      const id = "test_dup_" + Date.now();
      await profileStore.saveCreatedId(this.getOpenid(), "post", id);
      await profileStore.saveCreatedId(this.getOpenid(), "post", id);
      const profile = await profileStore.ensureProfile(this.getOpenid());
      const count = profile.created_post_list.filter(i => i && i.id === id).length;
      this.addResult("去重测试", count === 1, { id, count });
    } catch (err) {
      this.addResult("去重测试", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async cleanupProfile() {
    this.setData({ running: true });
    try {
      const openid = this.getOpenid();
      const profile = await profileStore.ensureProfile(openid);
      const filterTest = list => (list || []).filter(i => {
        const id = i && i.id || "";
        return !id.startsWith("test_");
      });
      const db = wx.cloud.database();
      const res = await db.collection("profiles").where({ openid }).limit(1).get();
      if (res.data && res.data[0]) {
        await db.collection("profiles").doc(res.data[0]._id).update({
          data: {
            created_post_list: filterTest(profile.created_post_list),
            created_card_list: filterTest(profile.created_card_list),
            favorite_post_list: filterTest(profile.favorite_post_list),
            favorite_card_list: filterTest(profile.favorite_card_list),
            updated_at: Date.now()
          }
        });
        this.addResult("清理Profile", true, "已移除所有 test_ 前缀的记录");
      } else {
        this.addResult("清理Profile", true, "无数据需清理");
      }
    } catch (err) {
      this.addResult("清理Profile", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  // ==================== Comment 测试 ====================

  async runAllComment() {
    this.setData({ results: [], running: true });
    // 先生成测试 target
    const targetId = "test_target_" + Date.now();
    this.setData({ commentTargetId: targetId, commentIdList: [] });

    try { await this.commentCheckCollection(); } catch (e) {}
    try { await this.commentAdd(); } catch (e) {}
    try { await this.commentAddSecond(); } catch (e) {}
    try { await this.commentList(); } catch (e) {}
    try { await this.commentNormalize(); } catch (e) {}

    this.setData({ running: false });
  },

  // 检查 comments 集合是否存在
  async commentCheckCollection() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection("comments").limit(1).get();
      this.addResult("comments集合访问", true, { count: (res.data || []).length });
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("502005") || msg.includes("not exist")) {
        this.addResult("comments集合访问", false, "集合不存在，请在云开发控制台手动创建 'comments' 集合");
      } else {
        this.addResult("comments集合访问", false, msg);
      }
    }
  },

  // 1. 新增评论
  async commentAdd() {
    this.setData({ running: true });
    try {
      const c = await commentStore.addComment({
        target_id: this.data.commentTargetId,
        target_type: "post",
        author_openid: this.getOpenid(),
        author_name: "测试用户",
        content: "这是一条测试评论 " + Date.now()
      });
      const pass = !!c.comment_id && !!c._id && c.content.length > 0 && c.target_id === this.data.commentTargetId;
      if (pass) this.setData({ commentIdList: [c.comment_id] });
      this.addResult("addComment（新增评论）", pass, {
        comment_id: c.comment_id,
        _id: c._id,
        content: c.content,
        status: c.status
      });
    } catch (err) {
      this.addResult("addComment", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  // 2. 新增第二条评论（用于测试列表排序）
  async commentAddSecond() {
    this.setData({ running: true });
    try {
      const c = await commentStore.addComment({
        target_id: this.data.commentTargetId,
        target_type: "post",
        author_openid: this.getOpenid(),
        author_name: "测试用户2",
        content: "第二条评论 " + Date.now()
      });
      const pass = !!c.comment_id && !!c._id;
      if (pass) {
        const ids = this.data.commentIdList.concat([c.comment_id]);
        this.setData({ commentIdList: ids });
      }
      this.addResult("addComment（第二条）", pass, { comment_id: c.comment_id });
    } catch (err) {
      this.addResult("addComment（第二条）", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  // 3. 查询评论列表
  async commentList() {
    this.setData({ running: true });
    try {
      const list = await commentStore.listByTarget(this.data.commentTargetId);
      const pass = list.length >= 2;
      this.addResult("listByTarget（按target查评论）", pass, {
        count: list.length,
        items: list.map(c => ({ comment_id: c.comment_id, content: c.content }))
      });
    } catch (err) {
      this.addResult("listByTarget", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  // 4. normalized 结构验证
  async commentNormalize() {
    this.setData({ running: true });
    try {
      const normalized = commentStore.normalizeComment({
        _id: "test_id",
        comment_id: "test_cid",
        target_id: "test_target",
        target_type: "post",
        author_openid: "test_openid",
        author_name: "测试",
        content: "内容",
        status: "published"
      });
      const hasAllFields =
        normalized.comment_id === "test_cid" &&
        normalized.target_id === "test_target" &&
        normalized.target_type === "post" &&
        normalized.author_openid === "test_openid" &&
        normalized.author_name === "测试" &&
        normalized.content === "内容" &&
        normalized.status === "published" &&
        typeof normalized.created_at === "number" &&
        typeof normalized.updated_at === "number";
      this.addResult("normalizeComment（字段规范化）", hasAllFields, normalized);
    } catch (err) {
      this.addResult("normalizeComment", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  async cleanupComment() {
    this.setData({ running: true });
    try {
      const db = wx.cloud.database();

      // 清理测试 comments
      const res = await db.collection("comments")
        .where({ target_id: this.data.commentTargetId || "" })
        .get();
      const docs = res.data || [];
      for (const doc of docs) {
        if (doc._id) {
          await db.collection("comments").doc(doc._id).remove();
        }
      }
      this.addResult("清理Comment", true, { deleted: docs.length });
    } catch (err) {
      this.addResult("清理Comment", false, err.message || String(err));
    }
    this.setData({ running: false });
  },

  // 手动创建集合指引
  createCollection() {
    const tab = this.data.activeTab;
    wx.showModal({
      title: "手动创建集合",
      content: tab === "profile"
        ? "云开发控制台 → 数据库 → 添加集合\n输入名称: profiles\n\n创建完成后回来点测试"
        : "云开发控制台 → 数据库 → 添加集合\n输入名称: comments\n\n创建完成后回来点测试",
      showCancel: false
    });
  }
});
