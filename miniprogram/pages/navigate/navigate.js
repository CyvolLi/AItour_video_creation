Page({
  data: { result: '' },
  openStore() {
    var that = this
    wx.openEmbeddedMiniProgram({
      appId: 'wxde7b459287c6bc1b',
      success: function() { that.setData({ result: '跳转成功' }) },
      fail: function(err) { that.setData({ result: '失败: ' + JSON.stringify(err) }) }
    })
  }
})
