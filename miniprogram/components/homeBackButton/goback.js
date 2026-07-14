Component({
  methods: {
    handleTap() {
      wx.reLaunch({
        url: "/pages/community/community"
      });
    }
  }
});