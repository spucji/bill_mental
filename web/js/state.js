// 全局状态 —— 替代小程序 getApp().globalData + wx.Storage
window.__state = {
  baseURL: localStorage.getItem('baseURL') || '',
  token: localStorage.getItem('token') || '',
  account: localStorage.getItem('account') || '',
  allRecords: [],
  allTags: [],
  _startDate: '',
  _endDate: '',

  save(force) {
    if (this.baseURL) localStorage.setItem('baseURL', this.baseURL)
    if (this.token) localStorage.setItem('token', this.token)
    else localStorage.removeItem('token')
    if (this.account) localStorage.setItem('account', this.account)
    else localStorage.removeItem('account')
  },

  clear() {
    this.token = ''
    this.account = ''
    localStorage.removeItem('token')
    localStorage.removeItem('account')
  }
}
