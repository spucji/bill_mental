// 日期选择器组件
window.__renderDatePicker = (function () {
  var S = __state
  var currentMonth = new Date().getFullYear() + '-' + pad(new Date().getMonth() + 1)
  var selectStart = ''
  var selectEnd = ''
  var selecting = false

  return function () {
    var el = document.getElementById('date-picker-wrap')
    if (!el) return

    var sd = S._startDate || ''
    var ed = S._endDate || ''

    el.innerHTML =
      '<div class="date-picker">' +
        '<div class="date-header">' +
          '<button class="date-range-btn" id="dp-btn">' + formatRange(sd, ed) + '</button>' +
          '<div class="date-presets">' +
            '<span class="date-preset" data-range="7d">近7天</span>' +
            '<span class="date-preset active" data-range="30d">近30天</span>' +
            '<span class="date-preset" data-range="3m">近3月</span>' +
          '</div>' +
        '</div>' +
        '<div class="date-panel" id="dp-panel"></div>' +
      '</div>'

    document.getElementById('dp-btn').onclick = function () {
      var panel = document.getElementById('dp-panel')
      panel.classList.toggle('open')
      if (panel.classList.contains('open')) renderCalendar(currentMonth)
    }

    document.querySelectorAll('.date-preset').forEach(function (p) {
      p.onclick = function () {
        document.querySelectorAll('.date-preset').forEach(function (x) { x.classList.remove('active') })
        p.classList.add('active')
        var range = p.dataset.range
        var end = new Date()
        var start = new Date()
        if (range === '7d') start.setDate(end.getDate() - 7)
        else if (range === '30d') start.setDate(end.getDate() - 30)
        else start.setMonth(end.getMonth() - 3)
        var s = fmtDate(start), e = fmtDate(end)
        S._startDate = s; S._endDate = e
        document.getElementById('dp-btn').textContent = formatRange(s, e)
        document.getElementById('dp-panel').classList.remove('open')
        triggerChange(s, e)
      }
    })

    selectStart = sd; selectEnd = ed
  }

  function renderCalendar(month) {
    var panel = document.getElementById('dp-panel')
    var parts = month.split('-')
    var y = parseInt(parts[0]), m = parseInt(parts[1])
    var firstDay = new Date(y, m - 1, 1).getDay()
    var daysInMonth = new Date(y, m, 0).getDate()

    var ym = y + '年' + m + '月'
    var html =
      '<div class="cal-nav">' +
        '<button id="cal-prev">‹</button>' +
        '<span class="cal-month-label">' + ym + '</span>' +
        '<button id="cal-next">›</button>' +
      '</div>' +
      '<div class="cal-weekdays">' +
        '<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>' +
      '</div>' +
      '<div class="cal-days">'

    for (var i = 0; i < firstDay; i++) html += '<span class="cal-day other"></span>'

    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = y + '-' + pad(m) + '-' + pad(d)
      var cls = 'cal-day'
      if (dateStr === selectStart || dateStr === selectEnd) cls += ' selected'
      html += '<span class="' + cls + '" data-date="' + dateStr + '">' + d + '</span>'
    }
    html += '</div>'
    panel.innerHTML = html

    document.getElementById('cal-prev').onclick = function () {
      m--; if (m < 1) { m = 12; y-- }
      currentMonth = y + '-' + pad(m)
      renderCalendar(currentMonth)
    }
    document.getElementById('cal-next').onclick = function () {
      m++; if (m > 12) { m = 1; y++ }
      currentMonth = y + '-' + pad(m)
      renderCalendar(currentMonth)
    }

    panel.querySelectorAll('.cal-day:not(.other)').forEach(function (day) {
      day.onclick = function () {
        if (!selecting) {
          selectStart = day.dataset.date
          selectEnd = ''
          selecting = true
        } else {
          selectEnd = day.dataset.date
          if (selectEnd < selectStart) { var t = selectStart; selectStart = selectEnd; selectEnd = t }
          selecting = false
          S._startDate = selectStart
          S._endDate = selectEnd
          document.getElementById('dp-btn').textContent = formatRange(selectStart, selectEnd)
          panel.classList.remove('open')
          triggerChange(selectStart, selectEnd)
        }
        renderCalendar(currentMonth)
      }
    })
  }

  function triggerChange(s, e) {
    var fn = window.__router._current === 'analysis' ? onAnalysisDateChange : onRecordsDateChange
    if (typeof fn === 'function') fn(s, e)
  }

  function formatRange(s, e) {
    if (!s) return '选择日期'
    return s + (e && e !== s ? ' ~ ' + e : '')
  }

  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

  function pad(n) { return n < 10 ? '0' + n : '' + n }
})()
