/*
 * docum/semantic.js
 *
 * Semantic layer: tokenization for syntax coloring and analyzers that
 * produce semantic feedback (validity, errors, and per-mode stats).
 */
window.Docum = window.Docum || {};

Docum.Semantic = (function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /*
   * Token rules per mode. Each rule has a `type` (maps to .tok-<type>) and a
   * regex with NO capturing groups (use (?:...)); the tokenizer wraps each in
   * its own capture group and reads back which alternative matched.
   * Order matters: earlier rules win at a given position.
   */
  var RULES = {
    txt: [],

    json: [
      { type: 'key',     re: /"(?:\\.|[^"\\])*"(?=\s*:)/ },
      { type: 'string',  re: /"(?:\\.|[^"\\])*"/ },
      { type: 'number',  re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/ },
      { type: 'keyword', re: /\b(?:true|false|null)\b/ },
      { type: 'punct',   re: /[{}[\],:]/ }
    ],

    xml: [
      { type: 'comment', re: /<!--[\s\S]*?-->/ },
      { type: 'string',  re: /<!\[CDATA\[[\s\S]*?\]\]>/ },
      { type: 'keyword', re: /<!DOCTYPE[^>]*>/i },
      { type: 'keyword', re: /<\?[\s\S]*?\?>/ },
      { type: 'tag',     re: /<\/?[A-Za-z][\w:.-]*/ },
      { type: 'attr',    re: /[A-Za-z_:][\w:.-]*(?=[ \t]*=)/ },
      { type: 'string',  re: /"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/ },
      { type: 'punct',   re: /[<>/=]/ }
    ],

    md: [
      { type: 'code',    re: /```[\s\S]*?```/ },
      { type: 'heading', re: /^#{1,6}[ \t]+[^\n]*/ },
      { type: 'keyword', re: /^>[ \t]?/ },
      { type: 'keyword', re: /^[ \t]*(?:[-*+]|\d+\.)[ \t]+/ },
      { type: 'link',    re: /!?\[[^\]\n]*\]\([^)\n]*\)/ },
      { type: 'bold',    re: /\*\*[^*\n]+\*\*|__[^_\n]+__/ },
      { type: 'italic',  re: /\*[^*\n]+\*|_[^_\n]+_/ },
      { type: 'code',    re: /`[^`\n]+`/ }
    ]
  };
  RULES.html = RULES.xml;

  /* Tokenize `src` for `mode` into [{ type, text }, ...]. */
  function tokenize(src, mode) {
    var defs = RULES[mode] || [];
    if (!defs.length) return [{ type: 'plain', text: src }];

    var pattern = defs.map(function (d) { return '(' + d.re.source + ')'; }).join('|');
    var re = new RegExp(pattern, 'gm');
    var out = [];
    var last = 0;
    var m;

    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out.push({ type: 'plain', text: src.slice(last, m.index) });

      var type = 'plain';
      for (var i = 1; i < m.length; i++) {
        if (m[i] !== undefined) { type = defs[i - 1].type; break; }
      }
      out.push({ type: type, text: m[0] });

      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++; // safety against zero-length matches
    }
    if (last < src.length) out.push({ type: 'plain', text: src.slice(last) });

    return out;
  }


  /* Produce syntax-highlighted HTML for the highlight layer. */
  function highlight(src, mode) {
    return tokenize(src, mode).map(function (t) {
      return '<span class="tok-' + t.type + '">' + escapeHtml(t.text) + '</span>';
    }).join('');
  }

  /* ------------------------- analyzers ------------------------- */

  function lineAt(src, pos) {
    return src.slice(0, pos).split('\n').length;
  }

  function analyzeJson(src, result) {
    try {
      var value = JSON.parse(src);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result.stats.topKeys = Object.keys(value).length;
      }
    } catch (e) {
      var msg = e.message || 'Invalid JSON';
      var line = 1;
      var lm = msg.match(/line\s+(\d+)/i);
      var pm = msg.match(/position\s+(\d+)/i);
      if (lm) line = parseInt(lm[1], 10);
      else if (pm) line = lineAt(src, parseInt(pm[1], 10));
      result.errors.push({ line: line, message: msg });
    }
  }

  function analyzeXml(src, result) {
    var doc = new DOMParser().parseFromString(src, 'application/xml');
    var errors = doc.getElementsByTagName('parsererror');
    if (errors.length) {
      var text = errors[0].textContent || '';
      var first = text.trim().split('\n')[0] || 'XML parse error';
      var lm = text.match(/line\s+(\d+)/i);
      result.errors.push({ line: lm ? parseInt(lm[1], 10) : 1, message: first });
    }
  }

  var VOID_TAGS = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1,
    link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
  };

  function analyzeHtml(src, result) {
    var re = /<\/?([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*?)?\/?>/g;
    var stack = [];
    var m;
    while ((m = re.exec(src)) !== null) {
      var full = m[0];
      var tag = m[1].toLowerCase();
      var isClose = /^<\//.test(full);
      var isSelfClose = /\/>$/.test(full);
      var line = lineAt(src, m.index);

      if (isClose) {
        if (!stack.length) {
          result.errors.push({ line: line, message: 'Unexpected closing tag </' + tag + '>' });
        } else {
          var top = stack.pop();
          if (top.tag !== tag) {
            result.errors.push({ line: line, message: 'Mismatched tag: expected </' + top.tag + '> but found </' + tag + '>' });
          }
        }
      } else if (!isSelfClose && !VOID_TAGS[tag]) {
        stack.push({ tag: tag, line: line });
      }
    }
    for (var i = 0; i < stack.length; i++) {
      result.errors.push({ line: stack[i].line, message: 'Unclosed tag <' + stack[i].tag + '>' });
    }
  }

  function analyzeMd(src, result) {
    var headings = [];
    var lines = src.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^(#{1,6})[ \t]+(.*)$/);
      if (m) headings.push({ level: m[1].length, text: m[2], line: i + 1 });
    }
    result.stats.headings = headings;
  }

  function analyze(mode, src) {
    var result = {
      valid: true,
      errors: [],
      stats: {
        lines: src.split('\n').length,
        chars: src.length,
        words: (src.match(/\S+/g) || []).length
      }
    };

    switch (mode) {
      case 'json': analyzeJson(src, result); break;
      case 'xml': analyzeXml(src, result); break;
      case 'html': analyzeHtml(src, result); break;
      case 'md': analyzeMd(src, result); break;
      default: break;
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  return {
    tokenize: tokenize,
    highlight: highlight,
    analyze: analyze,
    escapeHtml: escapeHtml
  };
})();

