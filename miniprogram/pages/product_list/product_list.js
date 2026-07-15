const { getFeaturedProducts } = require("../../utils/demoProducts.js");

Page({
  data: {
    products: [],
    filteredProducts: [],
    keyword: "",
    statusBarHeight: 20,
    navContentHeight: 44,
    capsuleRightInset: 96
  },

  onLoad() {
    this.measureNavigation();
    const products = getFeaturedProducts();

    this.setData({
      products,
      filteredProducts: products
    });
  },

  onSearchInput(event) {
    const keyword = String(
      event && event.detail ? event.detail.value || "" : ""
    ).trim();
    const needle = keyword.toLowerCase();
    const filteredProducts = needle
      ? this.data.products.filter((product) =>
          [product.title, product.description, product.tag]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : this.data.products.slice();

    this.setData({
      keyword,
      filteredProducts
    });
  },

  measureNavigation() {
    const windowInfo =
      typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() || {} : {};
    const menuRect =
      typeof wx.getMenuButtonBoundingClientRect === "function"
        ? wx.getMenuButtonBoundingClientRect() || {}
        : {};
    const statusBarHeight = Number(windowInfo.statusBarHeight) || 20;
    const windowWidth =
      Number(windowInfo.windowWidth || windowInfo.screenWidth) || 375;
    const menuTop = Number(menuRect.top);
    const menuHeight = Number(
      menuRect.height || Number(menuRect.bottom) - menuTop
    );
    const hasMenuGeometry =
      Number.isFinite(menuTop) &&
      menuTop >= statusBarHeight &&
      menuHeight > 0;

    this.setData({
      statusBarHeight,
      navContentHeight: hasMenuGeometry
        ? menuHeight + (menuTop - statusBarHeight) * 2
        : 44,
      capsuleRightInset:
        Number(menuRect.left) > 0
          ? Math.max(72, windowWidth - Number(menuRect.left) + 8)
          : 96
    });
  },

  goBack() {
    const pages =
      typeof getCurrentPages === "function" ? getCurrentPages() : [];

    if (pages.length > 1 && typeof wx.navigateBack === "function") {
      return wx.navigateBack();
    }

    if (typeof wx.reLaunch === "function") {
      return wx.reLaunch({
        url: "/pages/community/community"
      });
    }
  },

  showDemoProduct() {
    wx.showToast({
      title: "演示商品，暂不支持购买",
      icon: "none"
    });
  },

  showCheckoutNotice() {
    wx.showToast({
      title: "演示页面，暂不支持结算",
      icon: "none"
    });
  },

  showContinueNotice() {
    wx.showToast({
      title: "已为你保留当前好物",
      icon: "none"
    });
  }
});
