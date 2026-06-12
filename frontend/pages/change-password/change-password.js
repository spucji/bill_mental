const api = require('../../utils/api')

Page({
  data: {
    oldPassword: '', newPassword: '', confirmPassword: '',
    showOld: false, showNew: false, showConfirm: false
  },

  onOldInput(e) { this.setData({ oldPassword: e.detail.value }) },
  onNewInput(e) { this.setData({ newPassword: e.detail.value }) },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail.value }) },

  toggleOld() { this.setData({ showOld: !this.data.showOld }) },
  toggleNew() { this.setData({ showNew: !this.data.showNew }) },
  toggleConfirm() { this.setData({ showConfirm: !this.data.showConfirm }) },

  async doSubmit() {
    const oldPw = this.data.oldPassword
    const newPw = this.data.newPassword
    const confirmPw = this.data.confirmPassword

    if (!oldPw) { wx.showToast({ title: '请输入旧密码', icon: 'none' }); return }
    if (!newPw) { wx.showToast({ title: '请输入新密码', icon: 'none' }); return }
    if (newPw.length < 4) { wx.showToast({ title: '新密码至少 4 位', icon: 'none' }); return }
    if (newPw !== confirmPw) { wx.showToast({ title: '两次新密码不一致', icon: 'none' }); return }

    try {
      await api.changePassword(oldPw, newPw)
      wx.showToast({ title: '密码修改成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (e) {
      wx.showModal({ title: '修改失败', content: e.message || '操作失败', showCancel: false })
    }
  }
})
