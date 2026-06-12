const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    editId: null,
    form: { type: 'expense', amount: '', date: '', note: '' },
    selectedTagIds: [],
    selectedCategoryId: 0,
    selectedPlatformId: 0,
    allTags: [],
    allCategories: [],
    allPlatforms: [],
    voiceRawText: ''
  },

  onShow() {
    // 从管理页面返回时刷新列表
    this.setData({ allTags: app.globalData.allTags || [] })
    this.loadMeta()
  },

  onLoad(options) {
    const now = new Date()
    this.setData({
      'form.date': `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
      allTags: app.globalData.allTags || []
    })
    this.loadMeta()

    if (options.id) {
      const id = Number(options.id)
      this.setData({ editId: id })
      this.loadRecord(id)
    } else if (options.from === 'voice') {
      this.loadVoiceResult()
    }
  },

  loadVoiceResult() {
    var v = app.globalData.voiceResult
    if (!v) return
    app.globalData.voiceResult = null  // 用完清掉

    this.setData({
      form: {
        type: v.type || 'expense',
        amount: String(v.amount || ''),
        date: v.date || this.data.form.date,
        note: v.note || ''
      },
      selectedTagIds: v.tag_ids || [],
      selectedCategoryId: v.category_id || 0,
      selectedPlatformId: v.platform_id || 0,
      voiceRawText: v.raw_text || ''
    })
  },

  async loadMeta() {
    var app = getApp()
    // 优先用缓存
    if (app.globalData.allCategories && app.globalData.allCategories.length > 0) {
      this.setData({ allCategories: app.globalData.allCategories })
    }
    if (app.globalData.allPlatforms && app.globalData.allPlatforms.length > 0) {
      this.setData({ allPlatforms: app.globalData.allPlatforms })
    }
    // 后台刷新
    try {
      const [cats, plats] = await Promise.all([
        api.getCategories({ showLoading: false }),
        api.getPlatforms({ showLoading: false })
      ])
      this.setData({ allCategories: cats || [], allPlatforms: plats || [] })
      app.globalData.allCategories = cats || []
      app.globalData.allPlatforms = plats || []
    } catch (e) {}
  },

  async loadRecord(id) {
    try {
      const record = await api.getRecord(id)
      this.setData({
        form: {
          type: record.type,
          amount: String(record.amount),
          date: record.date.split('T')[0],
          note: record.note || ''
        },
        selectedTagIds: (record.tags || []).map(t => t.id),
        selectedCategoryId: record.category ? record.category.id : 0,
        selectedPlatformId: record.platform ? record.platform.id : 0
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  switchType(e) { this.setData({ 'form.type': e.currentTarget.dataset.type }) },
  onDatePick(e) { this.setData({ 'form.date': e.detail.value }) },

  onField(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value })
  },

  pickCategory(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.setData({ selectedCategoryId: id })
  },

  pickPlatform(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.setData({ selectedPlatformId: id })
  },

  toggleTag(e) {
    const id = e.currentTarget.dataset.id
    let selected = this.data.selectedTagIds.slice()
    const idx = selected.indexOf(id)
    if (idx >= 0) selected.splice(idx, 1)
    else selected.push(id)
    this.setData({ selectedTagIds: selected })
  },

  manageTags() { wx.navigateTo({ url: '/pages/tags/tags' }) },
  manageCategories() { wx.navigateTo({ url: '/pages/categories/categories' }) },
  managePlatforms() { wx.navigateTo({ url: '/pages/platforms/platforms' }) },

  async saveRecord() {
    const { form, selectedTagIds, selectedCategoryId, selectedPlatformId, editId } = this.data
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const payload = {
      date: form.date,
      type: form.type,
      amount,
      note: form.note,
      tag_ids: selectedTagIds,
      category_id: selectedCategoryId || null,
      platform_id: selectedPlatformId || null
    }

    try {
      if (editId) {
        await api.updateRecord(editId, payload)
      } else {
        await api.createRecord(payload)
      }
      app.touchRecords()
      wx.showToast({ title: editId ? '已更新' : '已录入', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },

  async deleteRecord() {
    const r = await new Promise(resolve => {
      wx.showModal({ title: '确认删除', content: '删除后无法恢复', success: res => resolve(res.confirm) })
    })
    if (!r) return
    try {
      await api.deleteRecord(this.data.editId)
      app.touchRecords()
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
    }
  }
})
