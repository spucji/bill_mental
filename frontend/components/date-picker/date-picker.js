Component({
  properties: {
    startDate: { type: String, value: '', observer: 'syncProps' },
    endDate: { type: String, value: '', observer: 'syncProps' }
  },

  data: {
    expanded: false,
    year: 2026, month: 5, today: '',
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    blanks: [], days: []
  },

  lifetimes: {
    attached() {
      var now = new Date()
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        today: this.fmt(now)
      })
      this.buildCalendar()
    }
  },

  methods: {
    syncProps() {
      // 外部更新时同步
    },

    fmt(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    },

    toggle() {
      this.setData({ expanded: !this.data.expanded })
    },

    buildCalendar() {
      var y = this.data.year, m = this.data.month
      var first = new Date(y, m - 1, 1)
      var last = new Date(y, m, 0)
      var dow = first.getDay() || 7
      var blanks = []
      for (var i = 1; i < dow; i++) blanks.push(i)
      var days = []
      for (var d = 1; d <= last.getDate(); d++) {
        days.push(y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'))
      }
      this.setData({ blanks: blanks, days: days })
    },

    prevMonth() {
      var m = this.data.month - 1, y = this.data.year
      if (m <= 0) { m = 12; y-- }
      this.setData({ year: y, month: m })
      this.buildCalendar()
    },

    nextMonth() {
      var m = this.data.month + 1, y = this.data.year
      if (m > 12) { m = 1; y++ }
      this.setData({ year: y, month: m })
      this.buildCalendar()
    },

    tapDay(e) {
      var day = e.currentTarget.dataset.day
      var start = this.data.startDate
      var end = this.data.endDate

      if (!start || (start && end)) {
        // 未选 or 已有一对 → 重新开始
        this.triggerEvent('change', { startDate: day, endDate: '' })
        return
      }
      // 已有 start，设 end
      if (day < start) {
        this.triggerEvent('change', { startDate: day, endDate: start })
      } else {
        this.triggerEvent('change', { startDate: start, endDate: day })
      }
    }
  }
})
