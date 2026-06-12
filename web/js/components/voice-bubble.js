// 语音悬浮球 —— MediaRecorder 替代 wx.getRecorderManager
window.__renderVoiceBubble = function () {
  var el = document.getElementById('voice-bubble-wrap')
  if (!el) return

  el.innerHTML = '<div class="voice-bubble" id="voice-bubble">🎤</div>'

  var btn = document.getElementById('voice-bubble')
  var recorder = null
  var chunks = []
  var timer = null

  btn.addEventListener('pointerdown', startRecord)
  btn.addEventListener('pointerup', stopRecord)
  btn.addEventListener('pointerleave', stopRecord)
  // 兼容 touch 事件
  btn.addEventListener('touchstart', function (e) { e.preventDefault(); startRecord() })
  btn.addEventListener('touchend', stopRecord)

  function startRecord() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      try {
        recorder = new MediaRecorder(stream, { mimeType: getMimeType() })
      } catch (e) {
        recorder = new MediaRecorder(stream)
      }
      chunks = []

      recorder.ondataavailable = function (e) {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop() })
        btn.classList.remove('recording')
        var blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp3' })
        if (blob.size < 600) { __ui.toast('录音太短'); return }
        processVoice(blob)
      }

      recorder.onerror = function () {
        btn.classList.remove('recording')
        __ui.toast('录音失败')
      }

      recorder.start()
      btn.classList.add('recording')
    }).catch(function () {
      __ui.toast('请允许麦克风权限')
    })
  }

  function stopRecord() {
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
  }

  function getMimeType() {
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg']
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i]
    }
    return ''
  }

  async function processVoice(blob) {
    __ui.loading(true)
    try {
      var result = await __api.parseVoice(blob)
      var S = __state

      var tagIds = []
      ;(result.tags || []).forEach(function (name) {
        var found = (S.allTags || []).find(function (t) { return t.name === name })
        if (found) tagIds.push(found.id)
      })

      var catId = null, catName = ''
      if (result.category) {
        var cats = await __api.getCategories()
        var foundCat = (cats || []).find(function (c) { return c.name === result.category })
        if (foundCat) { catId = foundCat.id; catName = foundCat.name }
      }

      var platId = null, platName = ''
      if (result.platform) {
        var plats = await __api.getPlatforms()
        var foundPlat = (plats || []).find(function (p) { return p.name === result.platform })
        if (foundPlat) { platId = foundPlat.id; platName = foundPlat.name }
      }

      __ui.loading(false)

      S._voiceResult = {
        type: result.type || 'expense',
        amount: result.amount || 0,
        date: result.date || today(),
        note: result.note || '',
        category_id: catId,
        category: catId ? { id: catId, name: catName } : null,
        platform_id: platId,
        platform: platId ? { id: platId, name: platName } : null,
        tag_ids: tagIds,
        tags: tagIds.map(function (id) { return { id: id } }),
        raw_text: result.raw_text || ''
      }

      __router.go('/record-edit?from=voice')
    } catch (e) {
      __ui.loading(false)
      __ui.modal('语音识别失败', e.message || '请重试')
    }
  }

  function today() {
    var d = new Date()
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n }
}
