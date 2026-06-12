// 统计页
window.__render_analysis = function () {
  var el = document.getElementById('page-analysis')
  el.innerHTML =
    '<div class="ambient-orb orb-top"></div>' +
    '<div id="analysis-dp-wrap"></div>' +
    '<div class="analysis-scroll">' +
      '<div class="chart-wrap" id="chart-wrap"></div>' +
      '<div class="dim-tabs" id="dim-tabs"></div>' +
      '<div id="analysis-summary"></div>' +
    '</div>'

  __renderDatePicker()
  loadAnalysis()
}

function loadAnalysis(params) {
  params = params || {}
  var S = __state

  __api.getSummary({
    start_date: params.startDate || S._startDate || '',
    end_date: params.endDate || S._endDate || ''
  }).then(function (data) {
    renderDims(data)
    renderSummaryBlock(data)
    renderChart('category', data.by_category || [])
  }).catch(function (e) {
    __ui.modal('加载失败', e.message)
  })
}

function onAnalysisDateChange(startDate, endDate) {
  __state._startDate = startDate
  __state._endDate = endDate
  loadAnalysis({ startDate: startDate, endDate: endDate })
}

function renderDims(data) {
  var dims = [
    { key: 'category', label: '类目', list: data.by_category },
    { key: 'platform', label: '平台', list: data.by_platform },
    { key: 'tag', label: '标签', list: data.by_tag }
  ]
  var html = ''
  dims.forEach(function (d, i) {
    html += '<span class="dim-tab' + (i === 0 ? ' active' : '') + '" data-dim="' + d.key + '">' + d.label + '</span>'
  })
  document.getElementById('dim-tabs').innerHTML = html
  document.querySelectorAll('.dim-tab').forEach(function (el) {
    el.onclick = function () {
      document.querySelectorAll('.dim-tab').forEach(function (x) { x.classList.remove('active') })
      el.classList.add('active')
      var key = el.dataset.dim
      var list = key === 'category' ? data.by_category : key === 'platform' ? data.by_platform : data.by_tag
      renderChart(key, list || [])
    }
  })
}

function renderChart(dim, list) {
  var el = document.getElementById('chart-wrap')
  el.innerHTML = '<canvas id="analysis-canvas" width="300" height="300"></canvas>'
  var canvas = document.getElementById('analysis-canvas')
  if (!canvas || list.length === 0) { el.innerHTML = '<div class="empty-state"><span class="empty-text">暂无数据</span></div>'; return }

  var ctx = canvas.getContext('2d')
  var dpr = window.devicePixelRatio || 1
  var w = el.clientWidth || 300
  canvas.width = w * dpr
  canvas.height = 280 * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = '280px'
  ctx.scale(dpr, dpr)

  var total = list.reduce(function (s, it) { return s + it.amount }, 0)
  var colors = ['#4CAF50','#F44336','#2196F3','#FF9800','#9C27B0','#00BCD4','#FF5722','#3F51B5','#8BC34A','#E91E63','#795548','#607D8B']
  var cx = w / 2, cy = 140, r = 100
  var start = -Math.PI / 2

  list.forEach(function (it, i) {
    var slice = (it.amount / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, start, start + slice)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    start += slice
  })

  // 图例
  var lx = 12, ly = 240
  list.forEach(function (it, i) {
    if (ly > 320) return
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(lx, ly, 8, 8)
    ctx.fillStyle = '#4A4946'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText((it.name || it.tag_name) + ' ¥' + it.amount.toFixed(0), lx + 14, ly + 8)
    ly += 18
  })
}

function renderSummaryBlock(data) {
  document.getElementById('analysis-summary').innerHTML =
    '<div class="summary-card card" style="margin-bottom:12px">' +
      '<div class="summary-item"><span class="summary-label">总收入</span><span class="summary-value income">' + (data.total_income || 0).toFixed(2) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">总支出</span><span class="summary-value expense">' + (data.total_expense || 0).toFixed(2) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">结余</span><span class="summary-value">' + ((data.total_income||0) - (data.total_expense||0)).toFixed(2) + '</span></div>' +
    '</div>'
}
