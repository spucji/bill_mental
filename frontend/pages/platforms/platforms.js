const api = require('../../utils/api')

Page({
  data: { list: [], newName: '', editingId: null, editName: '' },

  onShow() {
    var app = getApp()
    if (app.globalData.allPlatforms && app.globalData.allPlatforms.length > 0) {
      this.setData({ list: app.globalData.allPlatforms })
    }
    this.load()
  },

  async load() {
    try {
      var d = await api.getPlatforms({ showLoading: false })
      this.setData({ list: d || [] })
      getApp().globalData.allPlatforms = d || []
    } catch (e) {}
  },

  onInput(e) { this.setData({ newName: e.detail.value.trim() }) },

  async addItem() {
    var name = this.data.newName
    if (!name) return
    try { await api.createPlatform(name); this.setData({ newName: '' }); this.load() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  },

  startEdit(e) {
    this.setData({ editingId: Number(e.currentTarget.dataset.id), editName: e.currentTarget.dataset.name })
  },

  onEditInput(e) { this.setData({ editName: e.detail.value.trim() }) },

  async saveEdit() {
    var id = this.data.editingId, name = this.data.editName
    if (!name) { this.setData({ editingId: null, editName: '' }); return }
    try { await api.updatePlatform(id, name); this.setData({ editingId: null, editName: '' }); this.load() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  },

  async deleteItem(e) {
    var id = Number(e.currentTarget.dataset.id), name = e.currentTarget.dataset.name
    var self = this
    var confirmed = await new Promise(function (resolve) {
      wx.showModal({ title: '删除交易平台', content: '确认删除「' + name + '」？', success: function (res) { resolve(res.confirm) } })
    })
    if (!confirmed) return
    try { await api.deletePlatform(id); self.load() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  }
})
