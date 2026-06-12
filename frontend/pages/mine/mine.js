var app = getApp()

Page({
  data: { account: '', serverInfo: '' },

  onShow() {
    this.setData({
      account: app.globalData.account || '',
      serverInfo: app.globalData.baseURL || '未配置'
    })
  },

  goTags() { wx.navigateTo({ url: '/pages/tags/tags' }) },
  goCategories() { wx.navigateTo({ url: '/pages/categories/categories' }) },
  goPlatforms() { wx.navigateTo({ url: '/pages/platforms/platforms' }) },
  goChangePassword() { wx.navigateTo({ url: '/pages/change-password/change-password' }) },

  goServerSettings() {
    var self = this
    wx.showModal({
      title: '服务器地址',
      editable: true,
      placeholderText: 'http://服务器IP:端口',
      content: app.globalData.baseURL,
      success: function (res) {
        if (res.confirm && res.content) {
          var url = res.content.trim().replace(/\/+$/, '')
          app.globalData.baseURL = url
          wx.setStorageSync('baseURL', url)
          self.setData({ serverInfo: url })
        }
      }
    })
  },

  doLogout() {
    wx.showModal({
      title: '退出',
      content: '确定要退出当前账号？',
      success: function (res) {
        if (res.confirm) {
          app.globalData.token = ''
          app.globalData.account = ''
          wx.removeStorageSync('token')
          wx.removeStorageSync('account')
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
