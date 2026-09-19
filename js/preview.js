/*
 * docum/preview.js
 *
 * Preview renderer: produces eye-ball feedback per document mode.
 * - txt  -> escaped <pre>
 * - md   -> minimal markdown -> HTML
 * - json -> pretty-printed + syntax-colored <pre>
 * - xml  -> syntax-colored <pre>
 * - html -> returned raw; the app renders it inside a sandboxed iframe
 */
window.Docum = window.Docum || {};

Docum.Preview = (function () {
  'use strict';

  var esc = Docum.Semantic.escapeHtml;

  /* ---------------- markdown ---------------- */

  function inlineMd(s) {
    // inline code first so markers inside code aren't re-processed
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // bold
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    // italic
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    // images before links
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img src="$2" alt="$1">');
    // links
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  function mdToHtml(src) {
    var lines = src.replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var para = [];

    function flushPara() {
      if (para.length) {
        out.push('<p>' + inlineMd(para.join(' ')) + '</p>');
        para = [];
      }
    }

    var i = 0;
    var inCode = false;
    var codeBuf = [];

    while (i < lines.length) {
      var line = lines[i];

      // fenced code block
      if (/^[ \t]*```/.test(line)) {
        if (!inCode) {
          flushPara();
          inCode = true;
          codeBuf = [];
        } else {
          inCode = false;
          out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
        }
        i++;
        continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      // blank line ends paragraph
      if (/^[ \t]*$/.test(line)) { flushPara(); i++; continue; }

      // heading
      var hm = line.match(/^(#{1,6})[ \t]+(.*)$/);
      if (hm) {
        flushPara();
        var lvl = hm[1].length;
        out.push('<h' + lvl + '>' + inlineMd(hm[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }

      // horizontal rule
      if (/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/.test(line)) {
        flushPara();
        out.push('<hr>');
        i++;
        continue;
      }

      // blockquote
      if (/^[ \t]*>[ \t]?/.test(line)) {
        flushPara();
        var bq = [];
        while (i < lines.length && /^[ \t]*>[ \t]?/.test(lines[i])) {
          bq.push(lines[i].replace(/^[ \t]*>[ \t]?/, ''));
          i++;
        }
        out.push('<blockquote>' + mdToHtml(bq.join('\n')) + '</blockquote>');
        continue;
      }

      // list (ordered or unordered)
      if (/^[ \t]*([-*+]|\d+\.)[ \t]+/.test(line)) {
        flushPara();
        var ordered = /^[ \t]*\d+\./.test(line);
        var items = [];
        while (i < lines.length && /^[ \t]*([-*+]|\d+\.)[ \t]+/.test(lines[i])) {
          items.push('<li>' + inlineMd(lines[i].replace(/^[ \t]*([-*+]|\d+\.)[ \t]+/, '')) + '</li>');
          i++;
        }
        out.push(ordered ? '<ol>' + items.join('') + '</ol>' : '<ul>' + items.join('') + '</ul>');
        continue;
      }

      // paragraph text
      para.push(line.trim());
      i++;
    }

    flushPara();
    if (inCode) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');

    return out.join('\n');
  }

  function prettyJson(src) {
    try {
      return JSON.stringify(JSON.parse(src), null, 2);
    } catch (e) {
      return src; // fall back to raw
    }
  }

  /* Render preview HTML for non-iframe modes. */
  function render(mode, src) {
    switch (mode) {
      case 'md':
        return mdToHtml(src);
      case 'json':
        return '<pre class="pv-pre">' + Docum.Semantic.highlight(prettyJson(src), 'json') + '</pre>';
      case 'xml':
        return '<pre class="pv-pre">' + Docum.Semantic.highlight(src, 'xml') + '</pre>';
      case 'html':
        return src; // handled by the app as a sandboxed iframe
      case 'txt':
      default:
        return '<pre class="pv-pre">' + esc(src) + '</pre>';
    }
  }

  return {
    render: render,
    mdToHtml: mdToHtml,
    inlineMd: inlineMd,
    prettyJson: prettyJson
  };
})();
