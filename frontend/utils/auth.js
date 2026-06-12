function checkLogin() {
  const app = getApp()
  if (!app.globalData.token) {
    wx.redirectTo({ url: '/pages/login/login' })
    return false
  }
  return true
}

function saveToken(token, userInfo) {
  const app = getApp()
  app.globalData.token = token
  app.globalData.userInfo = userInfo
  wx.setStorageSync('token', token)
  wx.setStorageSync('userInfo', userInfo)
}

function logout() {
  const app = getApp()
  app.globalData.token = ''
  app.globalData.userInfo = null
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
  wx.redirectTo({ url: '/pages/login/login' })
}

module.exports = { checkLogin, saveToken, logout }
