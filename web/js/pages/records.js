// 明细页
window.__render_records = function () {
  var el = document.getElementById('page-records')
  var S = __state
  var now = new Date()
  var y = now.getFullYear()
  var m = pad(now.getMonth() + 1)
  var today = y + '-' + m + '-' + pad(now.getDate())

  if (!S._startDate) {
    S._startDate = y + '-' + m + '-01'
    S._endDate = today
  }

  el.innerHTML =
    '<div class="ambient-orb orb-top"></div>' +
    '<div id="date-picker-wrap"></div>' +
    '<div class="add-bar"><div class="add-btn" id="btn-add-record">+ 记一笔</div></div>' +
    '<div class="summary-card card"><div class="summary-row">' +
      '<div class="summary-item"><span class="summary-label">收入</span><span class="summary-value income" id="sum-income">0.00</span></div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-item"><span class="summary-label">支出</span><span class="summary-value expense" id="sum-expense">0.00</span></div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-item"><span class="summary-label">结余</span><span class="summary-value" id="sum-net">0.00</span></div>' +
    '</div></div>' +
    '<div class="record-scroll" id="record-list"></div>' +
    '<div id="voice-bubble-wrap"></div>'

  document.getElementById('btn-add-record').onclick = function () { __router.go('/record-edit') }
  __renderDatePicker()
  __renderVoiceBubble()
  loadRecords()
}

function loadRecords(params) {
  params = params || {}
  var S = __state

  __api.getRecords({
    start_date: params.startDate || S._startDate || '',
    end_date: params.endDate || S._endDate || '',
    page: 1,
    page_size: 200
  }).then(function (data) {
    S.allRecords = (data.list || []).map(function (r) {
      r._sign = r.type === 'income' ? '+' : '-'
      r._amountStr = Number(r.amount).toFixed(2)
      var d = r.date.split('T')[0].split('-')
      r._dateStr = d[1] + '/' + d[2]
      r._tagsStr = (r.tags || []).map(function (t) { return t.name }).join(',')
      r._catName = r.category ? r.category.name : ''
      r._platName = r.platform ? r.platform.name : ''
      return r
    })
    renderRecords(S.allRecords)
    renderSummary(S.allRecords)
  }).catch(function (e) {
    __ui.modal('加载失败', e.message || '网络异常')
  })
}

function renderRecords(list) {
  var html = ''
  if (!list || list.length === 0) {
    html = '<div class="empty-state"><span class="empty-icon">☁️</span><span class="empty-text">暂无记录</span><span class="empty-hint">点击「+ 记一笔」快速记账</span></div>'
  } else {
    list.forEach(function (r) {
      var tagsHtml = ''
      if (r._catName) tagsHtml += '<span class="meta-pill meta-cat">' + esc(r._catName) + '</span>'
      if (r._platName) tagsHtml += '<span class="meta-pill meta-plat">' + esc(r._platName) + '</span>'
      if (r._tagsStr) r._tagsStr.split(',').forEach(function (t) {
        if (t) tagsHtml += '<span class="tag-pill">' + esc(t) + '</span>'
      })
      if (!tagsHtml) tagsHtml = '<span class="tag-pill tag-empty">未标记</span>'

      html +=
        '<div class="record-item card" data-id="' + r.id + '">' +
          '<div class="record-left">' +
            '<div class="record-meta">' + tagsHtml + '</div>' +
            '<div class="record-date">' + r._dateStr + ' · ' + esc(r.note || '无备注') + '</div>' +
          '</div>' +
          '<div class="record-right ' + r.type + '">' + r._sign + r._amountStr + '</div>' +
        '</div>'
    })
  }
  document.getElementById('record-list').innerHTML = html

  // 点击编辑
  document.querySelectorAll('#record-list .record-item').forEach(function (el) {
    el.onclick = function () { __router.go('/record-edit?id=' + el.dataset.id) }
  })
}

function renderSummary(list) {
  var income = 0, expense = 0
  list.forEach(function (r) {
    if (r.type === 'income') income += r.amount; else expense += r.amount
  })
  document.getElementById('sum-income').textContent = income.toFixed(2)
  document.getElementById('sum-expense').textContent = expense.toFixed(2)
  document.getElementById('sum-net').textContent = (income - expense).toFixed(2)
}

function onRecordsDateChange(startDate, endDate) {
  __state._startDate = startDate
  __state._endDate = endDate
  loadRecords({ startDate: startDate, endDate: endDate })
}
