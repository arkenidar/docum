/*
 * docum/storage.js
 *
 * Persistence layer with a pluggable backend.
 *
 * Default backend: localStorage (HTML5 storage), keyed by unique document name.
 * An HTTP backend factory is provided for the optional PHP (or other) server
 * backend under /api — switch it in via Docum.Storage.setBackend(...).
 *
 * Backend contract (each method):
 *   list()          -> array of { name, mode, updatedAt, size }
 *   load(name)      -> { name, mode, content, updatedAt } | null
 *   save(doc)       -> { name, mode, updatedAt, size }     (doc: { name, mode, content })
 *   remove(name)    -> void
 *
 * Note: the localStorage backend is synchronous. The HTTP backend returns
 * Promises; the current app wires to the synchronous path, so swapping to HTTP
 * additionally requires adapting the call sites in app.js to async.
 */
window.Docum = window.Docum || {};

Docum.Storage = (function () {
  'use strict';

  var KEY_PREFIX = 'docum:doc:';
  var INDEX_KEY = 'docum:index';

  function readIndex() {
    try {
      return JSON.parse(localStorage.getItem(INDEX_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeIndex(index) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  /* ------------------------------------------------------------------ *
   * localStorage backend (default)
   * ------------------------------------------------------------------ */
  var localStorageBackend = {
    kind: 'localStorage',

    list: function () {
      var index = readIndex();
      return Object.keys(index).map(function (key) { return index[key]; });
    },

    load: function (name) {
      var raw = localStorage.getItem(KEY_PREFIX + name);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    save: function (doc) {
      var index = readIndex();
      var updatedAt = new Date().toISOString();
      var content = doc.content || '';
      var meta = {
        name: doc.name,
        mode: doc.mode || 'txt',
        updatedAt: updatedAt,
        size: content.length
      };
      index[doc.name] = meta;
      writeIndex(index);
      localStorage.setItem(KEY_PREFIX + doc.name, JSON.stringify({
        name: doc.name,
        mode: doc.mode || 'txt',
        content: content,
        updatedAt: updatedAt
      }));
      return meta;
    },

    remove: function (name) {
      localStorage.removeItem(KEY_PREFIX + name);
      var index = readIndex();
      delete index[name];
      writeIndex(index);
    }
  };

  /* ------------------------------------------------------------------ *
   * HTTP backend factory (optional PHP backend under /api)
   * ------------------------------------------------------------------ */
  function createHttpBackend(base) {
    base = base || '';

    function fetchJson(url, options) {
      return fetch(base + url, options).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return res.json();
      });
    }

    return {
      kind: 'http',
      list: function () { return fetchJson('api/list.php'); },
      load: function (name) {
        return fetchJson('api/load.php?name=' + encodeURIComponent(name));
      },
      save: function (doc) {
        return fetchJson('api/save.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc)
        }).then(function (res) { return res.meta; });
      },
      remove: function (name) {
        return fetchJson('api/delete.php?name=' + encodeURIComponent(name));
      }
    };
  }

  var activeBackend = localStorageBackend;

  return {
    HttpBackend: createHttpBackend,

    get backend() { return activeBackend; },

    setBackend: function (backend) { activeBackend = backend; },

    list: function () { return activeBackend.list(); },
    load: function (name) { return activeBackend.load(name); },
    save: function (doc) { return activeBackend.save(doc); },
    remove: function (name) { return activeBackend.remove(name); }
  };
})();
