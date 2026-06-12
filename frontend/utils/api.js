// 延迟获取 App 实例，避免模块顶层 getApp() 在 App 初始化前执行
function getAppInstance() {
  return getApp()
}

/**
 * 封装请求，自动带 token
 */
function request(method, path, data, options) {
  var opt = options || {}
  var showLoading = opt.showLoading !== false
  var rawResponse = opt.rawResponse || false
  var skipAuthRedirect = opt.skipAuthRedirect || false
  var loadingShown = false

  // 先定义 cleanup，再使用
  function hideLoadingOnce() {
    if (loadingShown) {
      wx.hideLoading()
      loadingShown = false
    }
  }

  return new Promise(function (resolve, reject) {
    var app = getAppInstance()

    if (!app.globalData.baseURL) {
      reject(new Error('未配置服务器地址'))
      return
    }

    if (showLoading) {
      wx.showLoading({ title: '加载中...' })
      loadingShown = true
    }

    wx.request({
      url: app.globalData.baseURL + path,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + app.globalData.token
      },
      success: function (res) {
        if (res.statusCode === 401) {
          // 登录接口的 401 不上抛为通用「未授权」，交给后端 message
          if (skipAuthRedirect) {
            hideLoadingOnce()
            var body = res.data
            reject(new Error((body && body.message) || '账号不存在，请联系管理员创建'))
            return
          }
          hideLoadingOnce()
          wx.showToast({ title: '登录已过期', icon: 'none' })
          setTimeout(function () { wx.reLaunch({ url: '/pages/login/login' }) }, 1500)
          reject(new Error('unauthorized'))
          return
        }
        if (rawResponse) {
          hideLoadingOnce()
          resolve(res)
          return
        }
        var body = res.data
        if (body.code === 0) {
          hideLoadingOnce()
          resolve(body.data)
        } else {
          hideLoadingOnce()
          reject(new Error(body.message || '请求失败'))
        }
      },
      fail: function (err) {
        hideLoadingOnce()
        console.error('[API] 请求失败:', path, err)
        reject(new Error('网络错误: ' + (err.errMsg || '请检查后端是否运行')))
      },
      complete: function () {
        hideLoadingOnce()
      }
    })
  })
}

var api = {
  // 登录
  login: function (account, password) {
    return request('POST', '/api/login', { account: account, password: password }, { skipAuthRedirect: true })
  },

  // 标签
  getTags: function (params, options) { return request('GET', '/api/tags', null, options) },
  createTag: function (name) { return request('POST', '/api/tags', { name: name }) },
  updateTag: function (id, name) { return request('PUT', '/api/tags/' + id, { name: name }) },
  deleteTag: function (id) { return request('DELETE', '/api/tags/' + id) },

  // 类目
  getCategories: function (options) { return request('GET', '/api/categories', null, options) },
  createCategory: function (name) { return request('POST', '/api/categories', { name: name }) },
  updateCategory: function (id, name) { return request('PUT', '/api/categories/' + id, { name: name }) },
  deleteCategory: function (id) { return request('DELETE', '/api/categories/' + id) },

  // 平台
  getPlatforms: function (options) { return request('GET', '/api/platforms', null, options) },
  createPlatform: function (name) { return request('POST', '/api/platforms', { name: name }) },
  updatePlatform: function (id, name) { return request('PUT', '/api/platforms/' + id, { name: name }) },
  deletePlatform: function (id) { return request('DELETE', '/api/platforms/' + id) },

  // 修改密码
  changePassword: function (oldPw, newPw) {
    return request('PUT', '/api/password', { old_password: oldPw, new_password: newPw }, { showLoading: false })
  },

  // 记录
  getRecord: function (id) { return request('GET', '/api/records/' + id) },
  getRecords: function (params, options) {
    params = params || {}
    var qs = Object.entries(params)
      .filter(function (e) { return e[1] !== '' && e[1] !== undefined && e[1] !== null })
      .map(function (e) { return e[0] + '=' + encodeURIComponent(e[1]) })
      .join('&')
    return request('GET', '/api/records?' + qs, null, options)
  },
  createRecord: function (data) { return request('POST', '/api/records', data) },
  updateRecord: function (id, data) { return request('PUT', '/api/records/' + id, data) },
  deleteRecord: function (id) { return request('DELETE', '/api/records/' + id) },

  // 语音解析
  parseVoice: function (filePath) {
    return new Promise(function (resolve, reject) {
      var app = getAppInstance()
      wx.showLoading({ title: '识别中...' })
      wx.uploadFile({
        url: app.globalData.baseURL + '/api/records/voice',
        filePath: filePath,
        name: 'file',
        header: { 'Authorization': 'Bearer ' + app.globalData.token },
        success: function (res) {
          try {
            var body = JSON.parse(res.data)
            if (body.code === 0) {
              resolve(body.data)
            } else {
              reject(new Error(body.message))
            }
          } catch (e) {
            reject(new Error('返回数据异常'))
          }
        },
        fail: function () { reject(new Error('上传失败')) },
        complete: function () { wx.hideLoading() }
      })
    })
  },

  // 分析
  getSummary: function (params) {
    params = params || {}
    var qs = Object.entries(params)
      .filter(function (e) { return e[1] !== '' && e[1] !== undefined && e[1] !== null })
      .map(function (e) { return e[0] + '=' + encodeURIComponent(e[1]) })
      .join('&')
    return request('GET', '/api/analysis/summary?' + qs)
  },
  getChartURL: function (params) {
    params = params || {}
    var qs = Object.entries(params)
      .filter(function (e) { return e[1] !== '' && e[1] !== undefined && e[1] !== null })
      .map(function (e) { return e[0] + '=' + encodeURIComponent(e[1]) })
      .join('&')
    return getAppInstance().globalData.baseURL + '/api/analysis/chart?' + qs
  }
}

module.exports = api
