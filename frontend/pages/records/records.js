const app = getApp()

Page({
  data: {
    records: [],
    summary: { income: '0.00', expense: '0.00', net: '0.00' },
    noMore: false,
    startDate: '',
    endDate: ''
  },

  onShow() {
    if (!app.globalData.token) { wx.reLaunch({ url: '/pages/login/login' }); return }

    var now = new Date()
    var y = now.getFullYear()
    var m = String(now.getMonth() + 1).padStart(2, '0')
    var today = y + '-' + m + '-' + String(now.getDate()).padStart(2, '0')

    if (!this.data.startDate) {
      // 首次打开不限制日期，加载最近记录；日期选择器显示当月
      this.setData({ startDate: y + '-' + m + '-01', endDate: today })
      this.onDateRangeChange()
    } else {
      // 从其他页返回时按已选日期刷新
      this.onDateRangeChange(this.data.startDate, this.data.endDate)
    }

    if (app.globalData.allTags.length === 0) app.refreshTags()
  },

  renderFromGlobal() {
    var records = app.globalData.allRecords || []
    this.setData({
      records: records, summary: this.calcSummary(records), noMore: records.length < 20
    })
  },

  calcSummary(list) {
    var i = 0, e = 0
    list.forEach(function (r) { if (r.type === 'income') i += r.amount; else e += r.amount })
    return { income: i.toFixed(2), expense: e.toFixed(2), net: (i - e).toFixed(2) }
  },

  onCalendarChange(e) {
    var s = e.detail.startDate, ed = e.detail.endDate
    this.setData({ startDate: s, endDate: ed })
    if (s && ed) this.onDateRangeChange(s, ed)
  },

  async onDateRangeChange(s, e) {
    var has = !!(s && e)
    app.setDateRange(s || '', e || '')
    try {
      await app.refreshRecords(has ? { startDate: s, endDate: e } : {})
    } catch (err) {
      wx.showModal({
        title: '加载失败',
        content: err.message || '网络异常，请检查后端是否运行',
        showCancel: false
      })
    }
    this.renderFromGlobal()
  },

  loadMore() { this.setData({ noMore: true }) },
  addRecord() { wx.navigateTo({ url: '/pages/record-edit/record-edit' }) },
  editRecord(e) { wx.navigateTo({ url: '/pages/record-edit/record-edit?id=' + e.currentTarget.dataset.id }) },

  onVoiceDone() {
    this.renderFromGlobal()
  }
})
