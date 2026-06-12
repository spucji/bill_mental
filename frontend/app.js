const api = require('./utils/api')

App({
  globalData: {
    baseURL: '',
    token: '',
    account: '',
    allRecords: [],
    allTags: [],
    allCategories: [],
    allPlatforms: [],
    recordsVersion: 0
  },

  onLaunch() {
    const savedURL = wx.getStorageSync('baseURL')
    if (savedURL) this.globalData.baseURL = savedURL

    const token = wx.getStorageSync('token')
    const account = wx.getStorageSync('account')
    if (token && account) {
      this.globalData.token = token
      this.globalData.account = account
    }
  },

  onShow() {
    var pages = getCurrentPages()
    if (!pages || pages.length === 0) return
    var current = pages[pages.length - 1]
    if (!this.globalData.token && current && current.route !== 'pages/login/login') {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },

  async touchRecords() {
    await this.refreshRecords()
  },

  async refreshRecords(params = {}) {
    const data = await api.getRecords({
      start_date: params.startDate || this._startDate || '',
      end_date: params.endDate || this._endDate || '',
      type: params.type || '',
      page: 1,
      page_size: 200
    }, { showLoading: false })

    console.log('[app] refreshRecords 收到:', data.total, '条, list长度:', (data.list || []).length)

    this.globalData.allRecords = (data.list || []).map(r => {
      r._sign = r.type === 'income' ? '+' : '-'
      r._amountStr = Number(r.amount).toFixed(2)
      var d = r.date.split('T')[0].split('-')
      r._dateStr = d[1] + '/' + d[2]
      return r
    })
    this.globalData.recordsVersion++
    return this.globalData.allRecords
  },

  async refreshTags() {
    try {
      const tags = await api.getTags(null, { showLoading: false })
      this.globalData.allTags = tags || []
      return this.globalData.allTags
    } catch (e) {
      return this.globalData.allTags
    }
  },

  async refreshCategories() {
    try {
      const cats = await api.getCategories({ showLoading: false })
      this.globalData.allCategories = cats || []
    } catch (e) {}
  },

  async refreshPlatforms() {
    try {
      const plats = await api.getPlatforms({ showLoading: false })
      this.globalData.allPlatforms = plats || []
    } catch (e) {}
  },

  setDateRange(startDate, endDate) {
    this._startDate = startDate
    this._endDate = endDate
  }
})
