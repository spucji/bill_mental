const app = getApp()

Page({
  data: {
    account: ''
  },

  onShow() {
    this.setData({ account: app.globalData.account || '轻记账用户' })
  },

  goBill() {
    wx.switchTab({ url: '/pages/records/records' })
  },

  goMental() {
    wx.navigateTo({ url: '/pages/mental-home/mental-home' })
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
