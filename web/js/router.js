// hash 路由 + 全局工具函数
window.__router = {
  _current: '',
  _pages: ['login', 'records', 'analysis', 'mine', 'record-edit', 'tags', 'categories', 'platforms'],
  _tabPages: ['records', 'analysis', 'mine'],

  init() {
    var self = this
    window.addEventListener('hashchange', function () { self._onChange() })
    this._onChange()
  },

  go(path) {
    location.hash = '#' + path
  },

  back() {
    history.back()
  },

  _onChange() {
    var hash = location.hash.replace('#/', '') || 'login'
    // 未登录强制回登录页
    if (!__state.token && hash !== 'login') { this.go('login'); return }
    // 已登录访问登录页则跳到明细
    if (__state.token && hash === 'login') { this.go('records'); return }

    this._current = hash
    this._showPage(hash)
    this._updateTabbar(hash)
  },

  _showPage(name) {
    debug.textContent = '_showPage:' + name
    var self = this
    this._pages.forEach(function (p) {
      var el = document.getElementById('page-' + p)
      if (el) {
        if (p === name) { el.classList.add('active') }
        else { el.classList.remove('active') }
      }
    })

    var key = '__render_' + name.replace(/-/g, '_')
    debug.textContent = '_showPage key:' + key + ' type:' + typeof window[key]
    var renderFn = window[key]
    if (renderFn) {
      try { renderFn() } catch(e) { debug.textContent = 'RENDER ERROR:' + e.message; return }
      debug.textContent = '_showPage done'
    } else {
      debug.textContent = 'NO RENDER FN:' + key
    }
  },

  _updateTabbar(hash) {
    var show = this._tabPages.indexOf(hash) >= 0
    document.getElementById('tabbar').style.display = show ? '' : 'none'
    document.querySelectorAll('.tab-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.tab === hash)
    })
  }
}

// ========== 全局 UI 工具 ==========
window.__ui = {
  toast(msg, icon) {
    var el = document.getElementById('toast')
    el.textContent = msg
    el.className = 'toast show' + (icon ? ' toast-' + icon : '')
    clearTimeout(el._t)
    el._t = setTimeout(function () { el.className = 'toast' }, 2000)
  },

  modal(title, content, btns) {
    var el = document.getElementById('modal')
    el.querySelector('.modal-title').textContent = title
    el.querySelector('.modal-body').textContent = content
    var btnsEl = el.querySelector('.modal-btns')
    btnsEl.innerHTML = ''
    ;(btns || [{ text: '确定', primary: true }]).forEach(function (b, i) {
      var btn = document.createElement('button')
      btn.textContent = b.text
      btn.className = b.primary ? 'btn-primary' : 'btn-ghost'
      btn.onclick = function () {
        el.classList.remove('show')
        if (b.onClick) b.onClick()
      }
      btnsEl.appendChild(btn)
    })
    el.classList.add('show')
  },

  loading(show) {
    document.getElementById('loading').classList.toggle('show', show)
  }
}
