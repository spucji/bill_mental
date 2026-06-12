Component({
  properties: {
    option: { type: Object, value: null, observer: 'draw' }
  },

  lifetimes: {
    ready() {
      var self = this
      var query = this.createSelectorQuery()
      query.select('.chart-canvas').fields({ node: true, size: true }).exec(function (res) {
        if (!res || !res[0]) return
        self._canvas = res[0].node
        self._ctx = self._canvas.getContext('2d')
        self._w = res[0].width
        self._h = res[0].height
        self._dpr =  (wx.getWindowInfo &&
          wx.getWindowInfo().pixelRatio) || wx.getSystemInfoSync().pixelRatio || 2
        self._canvas.width = self._w * self._dpr
        self._canvas.height = self._h * self._dpr
        self._ctx.scale(self._dpr, self._dpr)
        self.draw()
      })
    }
  },

  methods: {
    draw() {
      var ctx = this._ctx, w = this._w, h = this._h, opt = this.data.option
      if (!ctx || !w || !h || !opt) return
      ctx.clearRect(0, 0, w, h)
      if (opt.type === 'pie') this.drawPie(ctx, w, h, opt)
      else if (opt.type === 'bar') this.drawBar(ctx, w, h, opt)
      else if (opt.type === 'line') this.drawLine(ctx, w, h, opt)
    },

    drawPie(ctx, w, h, opt) {
      var data = opt.data || []
      if (data.length === 0) return
      var total = 0
      for (var i = 0; i < data.length; i++) total += data[i].value
      if (total === 0) return

      var colors = opt.colors || ['#6B8FA3','#A8B7C5','#C5B9A8','#8C7A5A','#5B8C5A','#C95C4F','#D4A76A','#7A9B8C']
      var titleH = 42, margin = 36
      var cx = w / 2
      var cy = titleH + (h - titleH - margin) / 2
      var maxR = Math.min(w / 2, (h - titleH) / 2) - margin
      var outerR = maxR, innerR = outerR * 0.5

      if (opt.title) {
        ctx.fillStyle = '#4A4946'
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(opt.title, cx, 8)
      }

      var placedLabels = []
      function overlap(lx, ly, text, align) {
        var tw = ctx.measureText(text).width
        var left = align === 'right' ? lx - tw : lx
        var right = align === 'right' ? lx : lx + tw
        for (var j = 0; j < placedLabels.length; j++) {
          var p = placedLabels[j]
          if (left < p.right && right > p.left && ly - 8 < p.bottom && ly + 8 > p.top) return true
        }
        placedLabels.push({ left: left, right: right, top: ly - 8, bottom: ly + 8 })
        return false
      }

      var startAngle = -Math.PI / 2
      for (var i = 0; i < data.length; i++) {
        var item = data[i]
        var angle = (item.value / total) * Math.PI * 2
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, startAngle, startAngle + angle); ctx.closePath()
        ctx.fillStyle = colors[i % colors.length]; ctx.fill()

        var pct = ((item.value / total) * 100)
        var mid = startAngle + angle / 2
        var lx = cx + Math.cos(mid) * (outerR + 32)
        var ly = cy + Math.sin(mid) * (outerR + 32) + 4
        var align = mid > Math.PI / 2 || mid < -Math.PI / 2 ? 'right' : 'left'
        var label = item.name + ' ' + pct.toFixed(0) + '%'
        if (pct >= 4 && !overlap(lx, ly, label, align)) {
          ctx.fillStyle = '#8B8986'; ctx.font = '10px sans-serif'
          ctx.textAlign = align; ctx.textBaseline = 'middle'
          ctx.fillText(label, lx, ly)
        }
        startAngle += angle
      }
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
      ctx.fillStyle = '#F4F3F0'; ctx.fill()
    },

    drawBar(ctx, w, h, opt) {
      var data = opt.data || [], labels = opt.labels || []
      if (data.length === 0) return

      var padL = 60, padR = 28, padT = 52, padB = 48
      var plotW = w - padL - padR, plotH = h - padT - padB
      if (plotW <= 0 || plotH <= 0) return

      var maxVal = 0
      for (var i = 0; i < data.length; i++) maxVal = Math.max(maxVal, Math.abs(data[i].value))
      if (maxVal === 0) maxVal = 1
      maxVal *= 1.2

      if (opt.title) {
        ctx.fillStyle = '#4A4946'; ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(opt.title, w / 2, 8)
      }

      ctx.strokeStyle = '#E8E6E3'; ctx.lineWidth = 0.5
      for (var i = 0; i <= 4; i++) {
        var y = padT + (plotH / 4) * i
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke()
        ctx.fillStyle = '#B5B3B0'; ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText((maxVal - (maxVal / 4) * i).toFixed(0), padL - 8, y)
      }

      var gap = 8, n = data.length, bw = (plotW - gap * (n - 1)) / n
      if (bw < 8) bw = 8
      for (var i = 0; i < n; i++) {
        var x = padL + i * (bw + gap)
        var barH = (Math.abs(data[i].value) / maxVal) * plotH
        var barY = padT + plotH - barH
        ctx.fillStyle = data[i].color || '#6B8FA3'
        ctx.fillRect(x, barY, bw, barH)
        ctx.fillStyle = '#8B8986'; ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(labels[i] || '', x + bw / 2, padT + plotH + 8)
        ctx.fillStyle = '#4A4946'; ctx.font = 'bold 10px sans-serif'
        ctx.textBaseline = 'bottom'
        ctx.fillText(data[i].value.toFixed(0), x + bw / 2, barY - 4)
      }
    },

    drawLine(ctx, w, h, opt) {
      var series = opt.series || [], labels = opt.labels || []
      if (series.length === 0 || labels.length === 0) return

      var padL = 60, padR = 28, padT = 52, padB = 56
      var plotW = w - padL - padR, plotH = h - padT - padB
      if (plotW <= 0 || plotH <= 0) return

      // 全局最大值
      var maxVal = 0
      series.forEach(function (s) { s.data.forEach(function (v) { maxVal = Math.max(maxVal, Math.abs(v)) }) })
      if (maxVal === 0) maxVal = 1
      maxVal *= 1.15

      if (opt.title) {
        ctx.fillStyle = '#4A4946'; ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(opt.title, w / 2, 8)
      }

      // Y 轴网格
      ctx.strokeStyle = '#E8E6E3'; ctx.lineWidth = 0.5
      for (var i = 0; i <= 4; i++) {
        var gy = padT + (plotH / 4) * i
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke()
        ctx.fillStyle = '#B5B3B0'; ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText((maxVal - (maxVal / 4) * i).toFixed(0), padL - 8, gy)
      }

      // X 轴标签（最多展示约 8 个避免拥挤）
      var step = Math.max(1, Math.floor(labels.length / 8))
      ctx.fillStyle = '#8B8986'; ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      for (var i = 0; i < labels.length; i += step) {
        var lx = padL + (i / (labels.length - 1 || 1)) * plotW
        ctx.fillText(labels[i], lx, padT + plotH + 4)
      }

      // 图例
      var legY = padT + plotH + 28
      series.forEach(function (s, idx) {
        var lx = padL + idx * 120
        ctx.fillStyle = s.color; ctx.fillRect(lx, legY, 10, 10)
        ctx.fillStyle = '#8B8986'; ctx.font = '10px sans-serif'
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText(s.name, lx + 14, legY)
      })

      // 画线
      series.forEach(function (s) {
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'
        ctx.beginPath()
        s.data.forEach(function (v, i) {
          var px = padL + (i / (labels.length - 1 || 1)) * plotW
          var py = padT + plotH - (Math.abs(v) / maxVal) * plotH
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()

        // 数据点
        s.data.forEach(function (v, i) {
          var px = padL + (i / (labels.length - 1 || 1)) * plotW
          var py = padT + plotH - (Math.abs(v) / maxVal) * plotH
          ctx.fillStyle = s.color; ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill()
        })
      })
    }
  }
})
