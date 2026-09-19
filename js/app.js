/*
 * docum/app.js
 *
 * Application glue: binds the editor surface, storage, semantic layer, and
 * preview together. No framework — plain DOM.
 */
window.Docum = window.Docum || {};

(function () {
  'use strict';

  var els = {
    name: document.getElementById('name'),
    mode: document.getElementById('mode'),
    editor: document.getElementById('editor'),
    highlight: document.getElementById('highlight'),
    highlightCode: document.getElementById('highlight-code'),
    gutter: document.getElementById('gutter'),
    gutterLines: document.getElementById('gutter-lines'),
    docList: document.getElementById('doc-list'),
    statusbar: document.getElementById('statusbar'),
    editorView: document.getElementById('editor-view'),
    previewView: document.getElementById('preview-view'),
    btnNew: document.getElementById('btn-new'),
    btnSave: document.getElementById('btn-save'),
    btnDelete: document.getElementById('btn-delete'),
    btnView: document.getElementById('btn-view')
  };

  var state = { name: '', mode: 'txt', dirty: false, view: 'edit' };

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function content() { return els.editor.value; }

  function renderHighlight() {
    els.highlightCode.innerHTML = Docum.Semantic.highlight(content(), state.mode);
  }

  function renderGutter() {
    var count = content().split('\n').length;
    var html = '';
    for (var i = 1; i <= count; i++) html += '<div class="gutter-line">' + i + '</div>';
    els.gutterLines.innerHTML = html;
  }

  function renderStatus() {
    var a = Docum.Semantic.analyze(state.mode, content());
    var parts = [];

    parts.push('<span class="st-meta">' + escapeHtml(state.mode) + (state.dirty ? ' •' : '') + '</span>');
    parts.push('<span class="st-meta">' + a.stats.lines + ' lines · ' +
      a.stats.chars + ' chars · ' + a.stats.words + ' words</span>');

    if (a.valid) parts.push('<span class="st-ok">✓ valid</span>');
    else parts.push('<span class="st-err">✗ ' + a.errors.length + ' error' +
      (a.errors.length > 1 ? 's' : '') + '</span>');

    els.statusbar.innerHTML = parts.join('');

    if (a.errors.length) {
      var list = a.errors.slice(0, 8).map(function (e) {
        return '<div class="st-error">L' + e.line + ': ' + escapeHtml(e.message) + '</div>';
      }).join('');
      els.statusbar.innerHTML += '<div class="st-panel">' + list +
        (a.errors.length > 8 ? '<div class="st-more">… ' + (a.errors.length - 8) + ' more</div>' : '') +
        '</div>';
    }

    if (a.stats.headings && a.stats.headings.length) {
      var h = a.stats.headings.map(function (x) {
        return '<div class="st-outline" style="padding-left:' + (x.level * 8) + 'px">' +
          escapeHtml(x.text) + '</div>';
      }).join('');
      els.statusbar.innerHTML += '<div class="st-panel"><div class="st-panel-title">Outline</div>' + h + '</div>';
    }

    var errLines = {};
    a.errors.forEach(function (e) { errLines[e.line] = true; });
    Array.prototype.forEach.call(els.gutterLines.children, function (node, idx) {
      node.classList.toggle('gutter-error', !!errLines[idx + 1]);
    });
  }

  function update() {
    renderHighlight();
    renderGutter();
    renderStatus();
  }

  function refreshDocList() {
    var docs = Docum.Storage.list().sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    els.docList.innerHTML = '';
    if (!docs.length) {
      els.docList.innerHTML = '<li class="empty">(no documents)</li>';
      return;
    }
    docs.forEach(function (d) {
      var li = document.createElement('li');
      li.className = 'doc-item';

      var info = document.createElement('div');
      info.className = 'doc-info';
      info.innerHTML = '<span class="doc-name">' + escapeHtml(d.name) + '</span>' +
        '<span class="doc-mode">' + escapeHtml(d.mode || 'txt') + '</span>';
      info.title = 'updated ' + (d.updatedAt || 'unknown');

      var del = document.createElement('button');
      del.className = 'doc-del';
      del.textContent = '×';
      del.title = 'Delete';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteDoc(d.name);
      });

      li.appendChild(info);
      li.appendChild(del);
      li.addEventListener('click', function () { loadDoc(d.name); });
      els.docList.appendChild(li);
    });
  }

  function flash(msg) {
    var el = document.createElement('div');
    el.className = 'flash';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 1600);
  }

  function save() {
    var name = els.name.value.trim();
    if (!name) { flash('A document name is required to save.'); els.name.focus(); return; }
    Docum.Storage.save({ name: name, mode: state.mode, content: content() });
    state.name = name;
    state.dirty = false;
    refreshDocList();
    renderStatus();
    flash('Saved “' + name + '”.');
  }

  function loadDoc(name) {
    var doc = Docum.Storage.load(name);
    if (!doc) { flash('Document “' + name + '” not found.'); return; }
    state.name = name;
    state.mode = doc.mode || 'txt';
    els.name.value = name;
    els.mode.value = state.mode;
    els.editor.value = doc.content || '';
    state.dirty = false;
    update();
    refreshPreview();
    flash('Loaded “' + name + '”.');
  }

  function deleteDoc(name) {
    if (!window.confirm('Delete “' + name + '”?')) return;
    Docum.Storage.remove(name);
    if (state.name === name) newDoc();
    refreshDocList();
    flash('Deleted “' + name + '”.');
  }

  function newDoc() {
    state.name = '';
    state.mode = 'txt';
    state.dirty = false;
    els.name.value = '';
    els.mode.value = 'txt';
    els.editor.value = '';
    update();
    refreshPreview();
    els.editor.focus();
  }

  function setView(view) {
    state.view = view;
    var editing = view === 'edit';
    els.editorView.hidden = !editing;
    els.previewView.hidden = editing;
    els.btnView.textContent = editing ? 'Preview' : 'Edit';
    if (!editing) refreshPreview();
  }

  function refreshPreview() {
    var src = content();
    if (state.mode === 'html') {
      els.previewView.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.className = 'preview-iframe';
      iframe.sandbox = '';
      iframe.srcdoc = src;
      els.previewView.appendChild(iframe);
    } else {
      els.previewView.innerHTML = Docum.Preview.render(state.mode, src);
    }
  }

  function onEdit() {
    state.dirty = true;
    update();
    if (state.view === 'preview') refreshPreview();
  }

  /* ---------- events ---------- */

  els.editor.addEventListener('input', onEdit);

  els.editor.addEventListener('scroll', function () {
    els.highlight.scrollTop = els.editor.scrollTop;
    els.highlight.scrollLeft = els.editor.scrollLeft;
    els.gutterLines.style.transform = 'translateY(' + (-els.editor.scrollTop) + 'px)';
  });

  els.editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = els.editor.selectionStart;
      var end = els.editor.selectionEnd;
      els.editor.value = els.editor.value.slice(0, start) + '  ' + els.editor.value.slice(end);
      els.editor.selectionStart = els.editor.selectionEnd = start + 2;
      onEdit();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  els.name.addEventListener('input', function () {
    state.name = els.name.value.trim();
    state.dirty = true;
    renderStatus();
  });

  els.mode.addEventListener('change', function () {
    state.mode = els.mode.value;
    state.dirty = true;
    update();
    refreshPreview();
  });

  els.btnNew.addEventListener('click', newDoc);
  els.btnSave.addEventListener('click', save);
  els.btnDelete.addEventListener('click', function () {
    if (!state.name) { flash('Nothing to delete (no saved name).'); return; }
    deleteDoc(state.name);
  });
  els.btnView.addEventListener('click', function () {
    setView(state.view === 'edit' ? 'preview' : 'edit');
  });

  /* ---------- init ---------- */
  refreshDocList();
  newDoc();
  setView('edit');
})();
