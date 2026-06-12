const api = require('../../utils/api')

Page({
  data: {
    account: '',
    password: '',
    baseURL: '',
    showServerInput: false,
    showPassword: false
  },

  onLoad() {
    const app = getApp()
    const saved = wx.getStorageSync('baseURL') || ''
    this.setData({ baseURL: saved, showServerInput: !saved })
    if (app.globalData.token && app.globalData.account) {
      wx.switchTab({ url: '/pages/records/records' })
    }
  },

  onInput(e) { this.setData({ account: e.detail.value.trim() }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onServerInput(e) { this.setData({ baseURL: e.detail.value.trim() }) },
  toggleServer() { this.setData({ showServerInput: true }) },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }) },

  async doLogin() {
    const account = this.data.account
    const password = this.data.password
    const url = this.data.baseURL.replace(/\/+$/, '')

    if (!url) { wx.showToast({ title: '请填写服务器地址', icon: 'none' }); return }
    if (!account) return
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }

    const app = getApp()
    app.globalData.baseURL = url

    try {
      const data = await api.login(account, password)
      wx.setStorageSync('baseURL', url)
      app.globalData.token = data.token
      app.globalData.account = account
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('account', account)
      await app.refreshTags()
      app.refreshCategories()
      app.refreshPlatforms()
      wx.switchTab({ url: '/pages/records/records' })
    } catch (e) {
      wx.showModal({ title: '登录失败', content: e.message || '登录失败', showCancel: false })
    }
  }
})
