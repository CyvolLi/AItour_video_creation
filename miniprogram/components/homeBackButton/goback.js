Component({
  methods: {
    handleTap() {
      let pages = [];

      try {
        pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
      } catch (err) {
        pages = [];
      }

      const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;
      const previousRoute = String((previousPage && previousPage.route) || "")
        .replace(/^\/+/, "")
        .replace(/\/$/, "");

      if (
        previousRoute === "pages/community/community" &&
        typeof wx.navigateBack === "function"
      ) {
        wx.navigateBack({
          delta: 1,
          fail() {
            wx.reLaunch({
              url: "/pages/community/community"
            });
          }
        });
        return;
      }

      wx.reLaunch({
        url: "/pages/community/community"
      });
    }
  }
});
