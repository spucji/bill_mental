// Chart Canvas 组件 —— 原生 Canvas 2D（已内嵌到分析页，这里预留独立组件）
window.__ChartCanvas = {
  drawPie: function (canvas, data, colors) {
    var ctx = canvas.getContext('2d')
    var w = canvas.width, h = canvas.height
    var total = data.reduce(function (s, d) { return s + d.value }, 0)
    if (total === 0) return
    var cx = w / 2, cy = h * 0.45, r = Math.min(cx, cy) - 10
    var start = -Math.PI / 2
    data.forEach(function (d, i) {
      var slice = (d.value / total) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, start + slice)
      ctx.closePath()
      ctx.fillStyle = (colors || [])[i % (colors || []).length] || '#ccc'
      ctx.fill()
      start += slice
    })
  }
}
