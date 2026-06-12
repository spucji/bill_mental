// 登录页
window.__render_login = function () {
  var S = __state, el = document.getElementById('page-login')
  var showServer = !S.baseURL

  el.innerHTML =
    '<div class="login-page">' +
      '<div class="ambient-orb orb-top"></div>' +
      '<div class="ambient-orb orb-bottom"></div>' +
      '<div class="login-card card">' +
        '<div class="brand">' +
          '<span class="brand-icon">🌿</span>' +
          '<span class="brand-name">轻记账</span>' +
          '<span class="brand-desc">极简 · 私人 · 专注</span>' +
        '</div>' +
        '<input id="login-server" class="login-input-n" type="text" placeholder="http://服务器IP:端口" value="' + esc(S.baseURL) + '" style="display:' + (showServer ? '' : 'none') + '">' +
        '<input id="login-account" class="login-input-n" type="text" placeholder="输入账号" autofocus>' +
        '<button id="login-btn" class="btn-primary">进入</button>' +
        '<div class="login-hint">账号由管理员创建，请联系开通</div>' +
        '<div class="server-section">' +
          (showServer
            ? ''
            : '<div class="server-row server-cached">' +
                '<span class="server-label">服务器</span>' +
                '<span class="server-val">' + esc(S.baseURL) + '</span>' +
                '<span class="server-edit" id="login-toggle-server">修改</span>' +
              '</div>') +
        '</div>' +
      '</div>' +
    '</div>'

  document.getElementById('login-btn').onclick = doLogin
  var tgl = document.getElementById('login-toggle-server')
  if (tgl) tgl.onclick = function () {
    document.getElementById('login-server').style.display = ''
    tgl.parentElement.style.display = 'none'
    document.getElementById('login-server').focus()
  }
}

function doLogin() {
  var account = document.getElementById('login-account').value.trim()
  if (!account) return

  var url = (document.getElementById('login-server').value || __state.baseURL).trim().replace(/\/+$/, '')
  if (!url) { __ui.toast('请填写服务器地址'); return }

  __state.baseURL = url
  __state.save()

  __api.login(account).then(function (data) {
    __state.token = data.token
    __state.account = account
    __state.save()
    return __api.getTags()
  }).then(function () {
    __router.go('/records')
  }).catch(function (e) {
    __ui.toast(e.message || '登录失败')
  })
}

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;') }
