// 我的页
window.__render_mine = function () {
  var S = __state, el = document.getElementById('page-mine')

  el.innerHTML =
    '<div class="mine-header">' +
      '<div class="mine-avatar">👤</div>' +
      '<div class="mine-account">' + esc(S.account) + '</div>' +
    '</div>' +

    '<div class="mine-menu">' +
      '<div class="mine-menu-item" id="mine-tags"><span>标签管理</span><span class="menu-arrow">›</span></div>' +
      '<div class="mine-menu-item" id="mine-categories"><span>类目管理</span><span class="menu-arrow">›</span></div>' +
      '<div class="mine-menu-item" id="mine-platforms"><span>平台管理</span><span class="menu-arrow">›</span></div>' +
      '<div class="mine-menu-item" id="mine-server">' +
        '<span>服务器</span>' +
        '<span class="menu-val">' + esc(S.baseURL || '未配置') + '</span>' +
      '</div>' +
    '</div>' +

    '<button class="logout-btn" id="btn-logout">退出登录</button>'

  document.getElementById('mine-tags').onclick = function () { __router.go('/tags') }
  document.getElementById('mine-categories').onclick = function () { __router.go('/categories') }
  document.getElementById('mine-platforms').onclick = function () { __router.go('/platforms') }

  document.getElementById('mine-server').onclick = function () {
    var input = document.createElement('input')
    input.type = 'text'
    input.value = S.baseURL || ''
    input.placeholder = 'http://服务器IP:端口'
    input.style.cssText = 'width:100%;padding:10px;font-size:14px;border:1px solid #ddd;border-radius:8px;margin-top:8px'

    __ui.modal('服务器地址', '', [
      { text: '取消', onClick: function () {} },
      { text: '保存', primary: true, onClick: function () {
        var url = input.value.trim().replace(/\/+$/, '')
        if (url) { S.baseURL = url; S.save(); __router.go('/mine') }
      }}
    ])
    document.querySelector('.modal-body').appendChild(input)
    input.focus()
  }

  document.getElementById('btn-logout').onclick = function () {
    __ui.modal('退出', '确定退出当前账号？', [
      { text: '取消', onClick: function () {} },
      { text: '退出', primary: true, onClick: function () {
        S.clear(); __router.go('/login')
      }}
    ])
  }
}
