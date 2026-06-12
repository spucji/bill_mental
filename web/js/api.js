// API 层 —— fetch 封装，替代 wx.request / wx.uploadFile
window.__api = (function () {
  var S = window.__state

  function showLoading() { document.getElementById('loading').classList.add('show') }
  function hideLoading() { document.getElementById('loading').classList.remove('show') }

  async function request(method, path, body, noLoading) {
    if (!S.baseURL) throw new Error('未配置服务器地址')
    if (!noLoading) showLoading()
    try {
      var headers = { 'Content-Type': 'application/json' }
      if (S.token) headers['Authorization'] = 'Bearer ' + S.token

      var res = await fetch(S.baseURL + path, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
      })

      if (res.status === 401) {
        S.clear()
        __router.go('/login')
        throw new Error('登录已过期')
      }

      var data = await res.json()
      if (data.code === 0) return data.data
      throw new Error(data.message || '请求失败')
    } catch (e) {
      if (e.message === 'Failed to fetch') throw new Error('网络错误，请检查后端是否运行')
      throw e
    } finally {
      if (!noLoading) hideLoading()
    }
  }

  function get(path, noLoading) { return request('GET', path, null, noLoading) }
  function post(path, body, noLoading) { return request('POST', path, body, noLoading) }
  function put(path, body, noLoading) { return request('PUT', path, body, noLoading) }
  function del(path, noLoading) { return request('DELETE', path, null, noLoading) }

  return {
    login: function (account) { return post('/api/login', { account: account }) },

    getTags: function () { return get('/api/tags', true) },
    createTag: function (name) { return post('/api/tags', { name: name }) },
    updateTag: function (id, name) { return put('/api/tags/' + id, { name: name }) },
    deleteTag: function (id) { return del('/api/tags/' + id) },

    getCategories: function () { return get('/api/categories', true) },
    createCategory: function (name) { return post('/api/categories', { name: name }) },
    updateCategory: function (id, name) { return put('/api/categories/' + id, { name: name }) },
    deleteCategory: function (id) { return del('/api/categories/' + id) },

    getPlatforms: function () { return get('/api/platforms', true) },
    createPlatform: function (name) { return post('/api/platforms', { name: name }) },
    updatePlatform: function (id, name) { return put('/api/platforms/' + id, { name: name }) },
    deletePlatform: function (id) { return del('/api/platforms/' + id) },

    getRecord: function (id) { return get('/api/records/' + id) },
    getRecords: function (params) {
      var qs = buildQS(params || {})
      return get('/api/records?' + qs, true)
    },
    createRecord: function (data) { return post('/api/records', data) },
    updateRecord: function (id, data) { return put('/api/records/' + id, data) },
    deleteRecord: function (id) { return del('/api/records/' + id) },

    parseVoice: async function (blob) {
      showLoading()
      try {
        var form = new FormData()
        form.append('file', blob, 'voice.mp3')
        var res = await fetch(S.baseURL + '/api/records/voice', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + S.token },
          body: form
        })
        var data = await res.json()
        if (data.code === 0) return data.data
        throw new Error(data.message || '识别失败')
      } finally {
        hideLoading()
      }
    },

    getSummary: function (params) {
      var qs = buildQS(params || {})
      return get('/api/analysis/summary?' + qs)
    }
  }

  function buildQS(params) {
    return Object.entries(params)
      .filter(function (e) { return e[1] !== '' && e[1] !== undefined && e[1] !== null })
      .map(function (e) { return e[0] + '=' + encodeURIComponent(e[1]) })
      .join('&')
  }
})()
