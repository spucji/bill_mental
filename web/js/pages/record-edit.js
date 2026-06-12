// 记录编辑页
window.__render_record_edit = function () {
  var S = __state, el = document.getElementById('page-record-edit')
  var id = getParam('id')
  var fromVoice = getParam('from') === 'voice'

  var record = { type: 'expense', date: today(), amount: '', note: '' }
  if (id) {
    var found = S.allRecords.find(function (r) { return r.id == id })
    if (found) record = found
  } else if (fromVoice && S._voiceResult) {
    record = S._voiceResult
    S._voiceResult = null
  }

  el.innerHTML =
    '<div class="page-header">' +
      '<span class="edit-back" id="edit-back">‹</span>' +
      '<span class="page-title">' + (id ? '编辑记录' : '记一笔') + '</span>' +
      (id ? '<button class="btn-danger" id="edit-delete">删除</button>' : '') +
    '</div>' +

    '<div class="form-group"><label class="form-label">类型</label>' +
      '<div class="type-switch">' +
        '<button class="type-btn ' + (record.type === 'expense' ? 'active-expense' : '') + '" data-type="expense">支出</button>' +
        '<button class="type-btn ' + (record.type === 'income' ? 'active-income' : '') + '" data-type="income">收入</button>' +
      '</div></div>' +

    '<div class="form-group"><label class="form-label">金额</label>' +
      '<input class="input" id="edit-amount" type="number" step="0.01" placeholder="0.00" value="' + (record.amount || '') + '"></div>' +

    '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">日期</label><input class="input" id="edit-date" type="date" value="' + formatDate(record.date) + '"></div>' +
    '</div>' +

    '<div class="form-group"><label class="form-label">备注</label><input class="input" id="edit-note" placeholder="选填" value="' + esc(record.note || '') + '"></div>' +

    '<div class="form-group"><label class="form-label">类目</label><select class="input" id="edit-category"></select></div>' +
    '<div class="form-group"><label class="form-label">平台</label><select class="input" id="edit-platform"></select></div>' +
    '<div class="form-group"><label class="form-label">标签</label><div id="edit-tags" class="tag-chips"></div></div>' +

    (record.raw_text ? '<div class="voice-raw-text">原文: ' + esc(record.raw_text) + '</div>' : '') +

    '<button class="btn-primary" id="edit-save" style="margin-top:20px">保存</button>'

  document.getElementById('edit-back').onclick = function () { history.back() }
  if (id) document.getElementById('edit-delete').onclick = function () { deleteRecord(id) }

  document.querySelectorAll('.type-btn').forEach(function (btn) {
    btn.onclick = function () { record.type = btn.dataset.type; renderTypeBtns(record.type) }
  })

  loadSelects(record)
  document.getElementById('edit-save').onclick = function () { saveRecord(record, id) }
}

function renderTypeBtns(type) {
  document.querySelectorAll('.type-btn').forEach(function (btn) {
    btn.className = 'type-btn'
    if (btn.dataset.type === type) btn.classList.add('active-' + type)
  })
}

function loadSelects(record) {
  Promise.all([__api.getCategories(), __api.getPlatforms(), __api.getTags()]).then(function (r) {
    var cats = r[0] || [], plats = r[1] || [], tags = r[2] || []
    fillSelect('edit-category', cats, record.category_id || (record.category ? record.category.id : null), '类目')
    fillSelect('edit-platform', plats, record.platform_id || (record.platform ? record.platform.id : null), '平台')
    renderTagChips(tags, record.tag_ids || (record.tags || []).map(function (t) { return t.id }))
  }).catch(function () {})
}

function fillSelect(id, items, val, placeholder) {
  var s = '<option value="">-- ' + placeholder + ' --</option>'
  items.forEach(function (it) {
    s += '<option value="' + it.id + '"' + (val == it.id ? ' selected' : '') + '>' + esc(it.name) + '</option>'
  })
  document.getElementById(id).innerHTML = s
}

function renderTagChips(all, selected) {
  var el = document.getElementById('edit-tags')
  el.innerHTML = ''
  all.forEach(function (t) {
    var chip = document.createElement('span')
    chip.textContent = t.name
    chip.className = 'tag-chip'
    if (selected.indexOf(t.id) >= 0) chip.classList.add('active')
    chip.onclick = function () {
      var idx = selected.indexOf(t.id)
      if (idx >= 0) selected.splice(idx, 1); else selected.push(t.id)
      chip.classList.toggle('active')
    }
    el.appendChild(chip)
  })
}

function saveRecord(record, id) {
  var body = {
    type: record.type,
    amount: parseFloat(document.getElementById('edit-amount').value) || 0,
    date: document.getElementById('edit-date').value,
    note: document.getElementById('edit-note').value.trim(),
    category_id: nullVal(document.getElementById('edit-category').value),
    platform_id: nullVal(document.getElementById('edit-platform').value),
    tag_ids: []
  }

  document.querySelectorAll('#edit-tags .tag-chip.active').forEach(function (el) {
    var name = el.textContent
    var t = __state.allTags.find(function (x) { return x.name === name })
    if (t) body.tag_ids.push(t.id)
  })

  if (!body.amount || !body.date) { __ui.toast('金额和日期必填'); return }

  __ui.loading(true)
  var promise = id ? __api.updateRecord(id, body) : __api.createRecord(body)
  promise.then(function () {
    __ui.loading(false)
    __router.back()
  }).catch(function (e) {
    __ui.loading(false)
    __ui.toast(e.message || '保存失败')
  })
}

function deleteRecord(id) {
  __ui.modal('删除确认', '确定要删除这条记录？', [
    { text: '取消', onClick: function () {} },
    { text: '删除', primary: true, onClick: function () {
      __api.deleteRecord(id).then(function () { __router.back() }).catch(function (e) { __ui.toast(e.message) })
    }}
  ])
}

function formatDate(val) {
  if (!val) return today()
  return (typeof val === 'string' ? val : val.split('T')[0]).substring(0, 10)
}

function nullVal(v) { return v ? parseInt(v) : null }

function getParam(name) {
  var match = location.hash.match(new RegExp('[?&]' + name + '=([^&]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function today() {
  var d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function pad(n) { return n < 10 ? '0' + n : '' + n }
