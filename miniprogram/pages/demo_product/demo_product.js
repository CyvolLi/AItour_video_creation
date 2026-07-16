const { getFeaturedProducts } = require("../../utils/demoProducts.js");

Page({
  data: {
    product: null
  },

  onLoad(options) {
    const products = getFeaturedProducts();
    const productId = options && options.id;
    const product =
      products.find((item) => item.id === productId) || products[0] || null;

    this.setData({
      product
    });
  },

  goBack() {
    if (typeof wx.navigateBack === "function") {
      wx.navigateBack();
    }
  }
});
