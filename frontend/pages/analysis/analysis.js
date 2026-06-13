const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    filters: { startDate: '', endDate: '', type: 'all', dim: 'time', agg: 'auto' },
    summary: { total_income: '0.00', total_expense: '0.00', net_amount: '0.00' },
    ratioText: '',
    chartOption: null,
    displayList: [],
    displayTitle: '',
    today: ''
  },

  onShow() {
    if (!app.globalData.token) { wx.reLaunch({ url: '/pages/login/login' }); return }
    var now = new Date()
    var y = now.getFullYear()
    var m = String(now.getMonth() + 1).padStart(2, '0')
    var today = y + '-' + m + '-' + String(now.getDate()).padStart(2, '0')
    this.setData({
      today: today,
      'filters.startDate': y + '-' + m + '-01',
      'filters.endDate': today
    })
    this.loadAll()
  },

  goSpaceSelect() { wx.navigateTo({ url: '/pages/space-select/space-select' }) },

  onCalendarChange(e) {
    var start = e.detail.startDate, end = e.detail.endDate
    this.setFilter('startDate', start)
    this.setFilter('endDate', end)
    if (start && end) this.reload()
  },

  setType(e) { this.setFilter('type', e.currentTarget.dataset.type); this.reload() },
  setDim(e) { this.setFilter('dim', e.currentTarget.dataset.dim); this.loadAll() },
  setAgg(e) { this.setFilter('agg', e.currentTarget.dataset.agg); this.loadAll() },

  setFilter(key, val) {
    var filters = this.data.filters
    filters[key] = val
    this.setData({ filters: filters })
  },

  reload() { this.loadAll() },

  async loadAll() {
    await this.loadSummary()
    if (this.data.filters.dim === 'time') {
      await this.loadTimeSeries()
    } else {
      this.renderPieChart()
    }
  },

  async loadSummary() {
    var f = this.data.filters
    try {
      var data = await api.getSummary({
        start_date: f.startDate, end_date: f.endDate,
        type: f.type === 'all' ? '' : f.type
      })
      var ti = data.total_income || 0, te = data.total_expense || 0, total = ti + te
      this.setData({
        summary: {
          total_income: ti.toFixed(2), total_expense: te.toFixed(2),
          net_amount: (ti - te).toFixed(2),
          by_tag: data.by_tag || [], by_category: data.by_category || [],
          by_platform: data.by_platform || []
        },
        ratioText: total > 0
          ? '收入占比 ' + ((ti / total) * 100).toFixed(1) + '%  ·  支出占比 ' + ((te / total) * 100).toFixed(1) + '%'
          : ''
      })
    } catch (e) { console.error(e) }
  },

  // ===== 时间趋势折线图 =====
  async loadTimeSeries() {
    var f = this.data.filters
    try {
      var data = await api.getRecords({
        start_date: f.startDate, end_date: f.endDate,
        type: f.type === 'all' ? '' : f.type,
        page: 1, page_size: 500
      })
      var list = data.list || []
      if (list.length === 0) {
        this.setData({ chartOption: null, displayList: [], displayTitle: '' })
        return
      }

      var agg = f.agg === 'auto' ? this.autoAgg(f.startDate, f.endDate) : f.agg
      var buckets = {}
      var self = this
      list.forEach(function (r) {
        var key = self.aggKey(r.date, agg)
        if (!buckets[key]) buckets[key] = { income: 0, expense: 0 }
        if (r.type === 'income') buckets[key].income += r.amount
        else buckets[key].expense += r.amount
      })

      var keys = Object.keys(buckets).sort()
      var labels = [], incomeData = [], expenseData = [], series = []

      keys.forEach(function (k) {
        labels.push(k)
        var inc = buckets[k].income, exp = buckets[k].expense
        incomeData.push(inc)
        expenseData.push(exp)
      })

      // 标题根据类型选择变化
      var typeLabel = f.type === 'income' ? '收入' : f.type === 'expense' ? '支出' : '收支'
      var title = typeLabel + '趋势 (' + self.aggLabel(agg) + ')'

      // 根据类型控制显示哪些线
      if (f.type === 'all' || f.type === 'income') {
        series.push({ name: '收入', data: incomeData, color: '#5B8C5A' })
      }
      if (f.type === 'all' || f.type === 'expense') {
        series.push({ name: '支出', data: expenseData, color: '#C95C4F' })
      }

      this.setData({
        chartOption: { type: 'line', title: title, labels: labels, series: series },
        displayList: [], displayTitle: ''
      })
    } catch (e) { console.error(e) }
  },

  autoAgg(start, end) {
    if (!start || !end) return 'month'
    var days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    if (days <= 14) return 'day'
    if (days <= 93) return 'week'
    if (days <= 730) return 'month'
    return 'year'
  },

  aggKey(dateStr, agg) {
    var d = new Date(dateStr)
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')

    if (agg === 'day') return m + '-' + day
    if (agg === 'year') return String(y)
    if (agg === 'week') {
      // 周一起止日期
      var dow = d.getDay() || 7
      var mon = new Date(d); mon.setDate(d.getDate() - dow + 1)
      var sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return this.fmtMD(mon) + '~' + this.fmtMD(sun)
    }
    return y + '-' + m
  },

  fmtMD(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  },

  aggLabel(agg) {
    if (agg === 'day') return '日'
    if (agg === 'week') return '周'
    if (agg === 'year') return '年'
    return '月'
  },

  // ===== 饼图 =====
  renderPieChart() {
    var dim = this.data.filters.dim, s = this.data.summary, list, dimTitle
    if (dim === 'category') { list = s.by_category; dimTitle = '交易类别' }
    else if (dim === 'platform') { list = s.by_platform; dimTitle = '交易平台' }
    else if (dim === 'tag') {
      list = (s.by_tag || []).map(function (t) { return { name: t.tag_name, amount: t.amount } })
      dimTitle = '其他标签'
    }

    if (!list || list.length === 0) {
      this.setData({ chartOption: null, displayList: [], displayTitle: '' })
      return
    }

    var total = (parseFloat(s.total_income) || 0) + (parseFloat(s.total_expense) || 0) || 1
    var sorted = list.slice().sort(function (a, b) { return b.amount - a.amount })
    sorted.forEach(function (item) { item._pct = ((item.amount / total) * 100).toFixed(1) })

    var typeLabel = ''
    if (this.data.filters.type === 'income') typeLabel = '（收入）'
    else if (this.data.filters.type === 'expense') typeLabel = '（支出）'

    this.setData({
      chartOption: {
        type: 'pie',
        title: dimTitle + '占比' + typeLabel,
        data: sorted.map(function (item) { return { name: item.name, value: item.amount } })
      },
      displayList: sorted,
      displayTitle: dimTitle + '分布' + typeLabel
    })
  }
})
