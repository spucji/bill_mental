// 标签/类目/平台管理页（共用模板）
function mgmtPage(name, apiList, apiCreate, apiUpdate, apiDelete) {
  return function () {
    var el = document.getElementById('page-' + name)
    el.innerHTML =
      '<div class="page-header">' +
        '<span class="edit-back" onclick="history.back()">‹</span>' +
        '<span class="page-title">' + nameMap(name) + '管理</span>' +
      '</div>' +
      '<div class="mgmt-add-row">' +
        '<input class="input" id="mgmt-input" placeholder="输入名称">' +
        '<button class="btn-sm" id="mgmt-add">添加</button>' +
      '</div>' +
      '<div id="mgmt-list"></div>'

    document.getElementById('mgmt-add').onclick = function () {
      var val = document.getElementById('mgmt-input').value.trim()
      if (!val) { __ui.toast('请输入名称'); return }
      apiCreate(val).then(function () {
        document.getElementById('mgmt-input').value = ''
        load()
      }).catch(function (e) { __ui.toast(e.message) })
    }

    function load() {
      apiList().then(function (data) {
        var html = ''
        ;(data || []).forEach(function (it) {
          html +=
            '<div class="mgmt-list-item">' +
              '<span class="mgmt-name">' + esc(it.name) + '</span>' +
              '<div class="mgmt-actions">' +
                '<button class="btn-sm edit-btn" data-id="' + it.id + '" data-name="' + esc(it.name) + '">编辑</button>' +
                '<button class="btn-danger del-btn" data-id="' + it.id + '">删除</button>' +
              '</div>' +
            '</div>'
        })
        document.getElementById('mgmt-list').innerHTML = html || '<div class="empty-state"><span class="empty-text">暂无' + nameMap(name) + '</span></div>'

        document.querySelectorAll('#mgmt-list .edit-btn').forEach(function (btn) {
          btn.onclick = function () {
            var id = btn.dataset.id, old = btn.dataset.name
            var input = document.createElement('input')
            input.type = 'text'; input.value = old
            input.style.cssText = 'width:100%;padding:10px;font-size:14px;border:1px solid #ddd;border-radius:8px;margin-top:8px'
            __ui.modal('编辑' + nameMap(name), '', [
              { text: '取消', onClick: function () {} },
              { text: '保存', primary: true, onClick: function () {
                var nv = input.value.trim()
                if (!nv) return
                apiUpdate(parseInt(id), nv).then(load).catch(function (e) { __ui.toast(e.message) })
              }}
            ])
            document.querySelector('.modal-body').appendChild(input)
            input.focus()
          }
        })

        document.querySelectorAll('#mgmt-list .del-btn').forEach(function (btn) {
          btn.onclick = function () {
            var id = parseInt(btn.dataset.id)
            __ui.modal('确认删除', '', [
              { text: '取消', onClick: function () {} },
              { text: '删除', primary: true, onClick: function () {
                apiDelete(id).then(load).catch(function (e) { __ui.toast(e.message) })
              }}
            ])
          }
        })
      }).catch(function (e) { __ui.toast(e.message) })
    }

    load()
  }
}

function nameMap(n) { return n === 'tags' ? '标签' : n === 'categories' ? '类目' : '平台' }

window.__render_tags = mgmtPage('tags', __api.getTags, __api.createTag, __api.updateTag, __api.deleteTag)
window.__render_categories = mgmtPage('categories', __api.getCategories, __api.createCategory, __api.updateCategory, __api.deleteCategory)
window.__render_platforms = mgmtPage('platforms', __api.getPlatforms, __api.createPlatform, __api.updatePlatform, __api.deletePlatform)
