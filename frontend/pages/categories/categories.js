const api = require('../../utils/api')

Page({
  data: { list: [], newName: '', editingId: null, editName: '' },

  onShow() {
    var app = getApp()
    // 先用缓存秒开，再后台刷新
    if (app.globalData.allCategories && app.globalData.allCategories.length > 0) {
      this.setData({ list: app.globalData.allCategories })
    }
    this.load()
  },

  async load() {
    try {
      var d = await api.getCategories({ showLoading: false })
      this.setData({ list: d || [] })
      getApp().globalData.allCategories = d || []
    } catch (e) {}
  },

  onInput(e) { this.setData({ newName: e.detail.value.trim() }) },

  async addItem() {
    var name = this.data.newName
    if (!name) return
    try {
      await api.createCategory(name)
      this.setData({ newName: '' })
      this.load()
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },

  startEdit(e) {
    var id = Number(e.currentTarget.dataset.id)
    var name = e.currentTarget.dataset.name
    this.setData({ editingId: id, editName: name })
  },

  onEditInput(e) { this.setData({ editName: e.detail.value.trim() }) },

  async saveEdit() {
    var id = this.data.editingId
    var name = this.data.editName
    if (!name) { this.setData({ editingId: null, editName: '' }); return }
    try {
      await api.updateCategory(id, name)
      this.setData({ editingId: null, editName: '' })
      this.load()
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },

  async deleteItem(e) {
    var id = Number(e.currentTarget.dataset.id)
    var name = e.currentTarget.dataset.name
    var self = this
    var confirmed = await new Promise(function (resolve) {
      wx.showModal({
        title: '删除交易类别',
        content: '确认删除「' + name + '」？',
        success: function (res) { resolve(res.confirm) }
      })
    })
    if (!confirmed) return
    try {
      await api.deleteCategory(id)
      self.load()
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  }
})
