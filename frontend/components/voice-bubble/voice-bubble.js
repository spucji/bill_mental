const api = require('../../utils/api')

Component({
  data: {
    recording: false
  },

  lifetimes: {
    attached() {
      this._app = getApp()
      this.recorder = wx.getRecorderManager()
      this._pending = false  // 用户在权限检查期间是否还按着
      var self = this

      this.recorder.onStart(function () {
        // 只有真正开始录音才显示状态
        self.setData({ recording: true })
      })

      this.recorder.onStop(function (res) {
        self.setData({ recording: false })
        self._pending = false
        if (res.duration < 600) {
          wx.showToast({ title: '录音太短', icon: 'none' })
          return
        }
        self.processVoice(res.tempFilePath)
      })

      this.recorder.onError(function () {
        self.setData({ recording: false })
        self._pending = false
        wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
      })
    }
  },

  methods: {
    startRecord() {
      var self = this
      this._pending = true  // 标记：用户正按着

      wx.getSetting({
        success: function (res) {
          // 期间用户可能已松手，再次确认
          if (!self._pending) return

          if (res.authSetting['scope.record'] === false) {
            self._pending = false
            wx.showModal({
              title: '需要麦克风权限',
              content: '语音录入需要麦克风，请在设置中开启',
              confirmText: '去设置',
              success: function (m) { if (m.confirm) wx.openSetting() }
            })
          } else if (res.authSetting['scope.record']) {
            // 再次确认后尝试启动
            if (self._pending) self.recorder.start({ duration: 30000, format: 'mp3' })
          } else {
            wx.authorize({
              scope: 'scope.record',
              success: function () {
                if (self._pending) self.recorder.start({ duration: 30000, format: 'mp3' })
              },
              fail: function () {
                self._pending = false
                wx.showToast({ title: '未授权麦克风', icon: 'none' })
              }
            })
          }
        },
        fail: function () {
          if (self._pending) self.recorder.start({ duration: 30000, format: 'mp3' })
        }
      })
    },

    stopRecord() {
      this._pending = false  // 取消等待中的录音
      this.recorder.stop()   // 如果已在录音则停止（未录音时 stop 是安全的空操作）
    },

    async processVoice(filePath) {
      wx.showLoading({ title: '解析中…', mask: true })
      try {
        var result = await api.parseVoice(filePath)
        var self = this

        var tagIds = []
        ;(result.tags || []).forEach(function(name) {
          var found = self._app.globalData.allTags.find(function(t) { return t.name === name })
          if (found) tagIds.push(found.id)
        })

        var catId = null
        if (result.category) {
          var cats = await api.getCategories()
          var foundCat = (cats || []).find(function(c) { return c.name === result.category })
          if (foundCat) catId = foundCat.id
        }

        var platId = null
        if (result.platform) {
          var plats = await api.getPlatforms()
          var foundPlat = (plats || []).find(function(p) { return p.name === result.platform })
          if (foundPlat) platId = foundPlat.id
        }

        wx.hideLoading()

        // 存入 globalData，跳转到记录编辑页让用户确认
        self._app.globalData.voiceResult = {
          date: result.date || '',
          type: result.type || 'expense',
          amount: result.amount || '',
          note: result.note || '',
          category_id: catId,
          category_name: result.category || '',
          platform_id: platId,
          platform_name: result.platform || '',
          tag_ids: tagIds,
          raw_text: result.raw_text || ''
        }

        wx.navigateTo({ url: '/pages/record-edit/record-edit?from=voice' })
        self.triggerEvent('voicedone', result)
      } catch (e) {
        wx.hideLoading()
        var msg = e.message || '识别失败'
        console.error('[VOICE] error:', msg, e)
        wx.showModal({ title: '语音识别失败', content: msg, showCancel: false })
      }
    }
  }
})
