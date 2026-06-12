const app = getApp()

Page({
  data: {
    adminKey: '',
    showKey: false,
    newAccount: '',
    users: []
  },

  onLoad() {
    this.setData({ adminKey: wx.getStorageSync('adminKey') || '' })
    if (this.data.adminKey) this.loadUsers()
  },

  onKeyInput(e) {
    this.setData({ adminKey: e.detail.value.trim() })
  },

  onAccountInput(e) {
    this.setData({ newAccount: e.detail.value.trim() })
  },

  toggleKey() {
    this.setData({ showKey: !this.data.showKey })
  },

  saveKey() {
    wx.setStorageSync('adminKey', this.data.adminKey)
    wx.showToast({ title: '已保存', icon: 'success' })
    this.loadUsers()
  },

  adminRequest(method, path, data) {
    const key = this.data.adminKey
    if (!key) {
      wx.showToast({ title: '请先填写管理员密钥', icon: 'none' })
      return Promise.reject(new Error('missing admin key'))
    }
    return new Promise((resolve, reject) => {
      wx.request({
        url: app.globalData.baseURL + path,
        method: method,
        data: data,
        header: {
          'Content-Type': 'application/json',
          'X-Admin-Key': key
        },
        success: (res) => {
          const body = res.data || {}
          if (res.statusCode < 200 || res.statusCode >= 300 || body.code !== 0) {
            reject(new Error(body.message || ('请求失败: ' + res.statusCode)))
            return
          }
          resolve(body.data)
        },
        fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
      })
    })
  },

  async loadUsers() {
    try {
      wx.showLoading({ title: '加载中...' })
      const users = await this.adminRequest('GET', '/api/admin/users')
      this.setData({ users: users || [] })
    } catch (e) {
      wx.showModal({ title: '加载失败', content: e.message || '请检查管理员密钥', showCancel: false })
    } finally {
      wx.hideLoading()
    }
  },

  async createUser() {
    const account = this.data.newAccount
    if (!account) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    try {
      await this.adminRequest('POST', '/api/admin/users', { account: account })
      this.setData({ newAccount: '' })
      wx.showToast({ title: '创建成功', icon: 'success' })
      this.loadUsers()
    } catch (e) {
      wx.showModal({ title: '创建失败', content: e.message || '创建失败', showCancel: false })
    }
  },

  resetPassword(e) {
    const id = e.currentTarget.dataset.id
    const account = e.currentTarget.dataset.account
    wx.showModal({
      title: '重置密码',
      content: `确定将 ${account} 的密码重置为 1234？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await this.adminRequest('PUT', `/api/admin/users/${id}/password`)
          wx.showToast({ title: '已重置', icon: 'success' })
        } catch (err) {
          wx.showModal({ title: '重置失败', content: err.message || '重置失败', showCancel: false })
        }
      }
    })
  },

  deleteUser(e) {
    const id = e.currentTarget.dataset.id
    const account = e.currentTarget.dataset.account
    wx.showModal({
      title: '删除用户',
      content: `确定删除 ${account}？该用户记账和心灵数据也会删除。`,
      confirmColor: '#C95C4F',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await this.adminRequest('DELETE', `/api/admin/users/${id}`)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadUsers()
        } catch (err) {
          wx.showModal({ title: '删除失败', content: err.message || '删除失败', showCancel: false })
        }
      }
    })
  }
})
