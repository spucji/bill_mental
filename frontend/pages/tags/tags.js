const app = getApp()
const api = require('../../utils/api')

Page({
  data: { tags: [], newName: '', editingId: null, editName: '' },

  onShow() {
    this.setData({ tags: app.globalData.allTags || [] })
  },

  async reload() {
    await app.refreshTags()
    this.setData({ tags: app.globalData.allTags || [] })
  },

  onInput(e) { this.setData({ newName: e.detail.value.trim() }) },

  async addItem() {
    var name = this.data.newName
    if (!name) return
    try { await api.createTag(name); this.setData({ newName: '' }); this.reload() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  },

  startEdit(e) {
    this.setData({ editingId: Number(e.currentTarget.dataset.id), editName: e.currentTarget.dataset.name })
  },

  onEditInput(e) { this.setData({ editName: e.detail.value.trim() }) },

  async saveEdit() {
    var id = this.data.editingId, name = this.data.editName
    if (!name) { this.setData({ editingId: null, editName: '' }); return }
    try { await api.updateTag(id, name); this.setData({ editingId: null, editName: '' }); this.reload() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  },

  async deleteItem(e) {
    var id = Number(e.currentTarget.dataset.id), name = e.currentTarget.dataset.name
    var self = this
    var confirmed = await new Promise(function (resolve) {
      wx.showModal({ title: '删除其他标签', content: '确认删除「' + name + '」？', success: function (res) { resolve(res.confirm) } })
    })
    if (!confirmed) return
    try { await api.deleteTag(id); self.reload() } catch (e) { wx.showToast({ title: e.message, icon: 'none' }) }
  }
})
