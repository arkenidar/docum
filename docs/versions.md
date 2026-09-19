# docum — Versions

Versioned changelog for the `docum` project. Entries are newest-first.

Format convention for future entries:

```
## vX.Y.Z (YYYY-MM-DD)

### Added
- …

### Changed
- …

### Fixed
- …
```

Use `Added` for new features, `Changed` for behavioral/structural changes, and
`Fixed` for bug fixes. Bump the version with [SemVer](https://semver.org/):
major for breaking changes, minor for features, patch for fixes.

---

## v0.1.0 (2026-09-19)

Initial working version of the HTML-based document editor.

### Added

- **Document types** — `txt`, `md`, `json`, `xml`, `html`, selected via the
  toolbar mode dropdown.
- **Editor surface** — a transparent `<textarea>` layered over a highlighted
  `<pre>`, giving native editing with live syntax coloring.
- **Semantic coloring** per mode:
  - `json` — keys, strings, numbers, keywords (`true`/`false`/`null`), punctuation.
  - `xml`/`html` — tags, attributes, attribute values, comments, CDATA, doctype.
  - `md` — headings, bold, italic, inline & fenced code, links, blockquote, list markers.
- **Semantic decorations** — line-number gutter with red error markers, and a
  status bar reporting validity, error lines, and per-mode stats (word/line/char
  counts, markdown heading outline, JSON top-level key count).
- **Preview mode** — Edit/Preview toggle:
  - `md` → rendered HTML (minimal markdown converter).
  - `json` → pretty-printed, syntax-colored output.
  - `xml` → syntax-colored source.
  - `html` → rendered inside a sandboxed `<iframe>`.
  - `txt` → escaped `<pre>`.
- **Persistence** — save/load/delete from `localStorage`, keyed by unique
  document name, with a document list sidebar.
- **Backend seam** — `js/storage.js` exposes a backend contract and a
  `Docum.Storage.HttpBackend()` factory for the optional PHP endpoints under `api/`.
- **PHP backend stubs** — `api/{list,load,save,delete}.php` (filesystem JSON
  persistence under `api/data/`).
- **Docs** — `README.md` (architecture + usage) and this file.

### File inventory

| Path            | Role |
| --------------- | ---- |
| `craft.html`    | Entry point / UI shell |
| `css/style.css` | Theme, layout, syntax palette |
| `js/storage.js` | Persistence layer (pluggable backend) |
| `js/semantic.js`| Tokenizer (coloring) + analyzers (feedback) |
| `js/preview.js` | Preview renderer per mode |
| `js/app.js`     | Application glue (events, view switching) |
| `api/*.php`     | Optional PHP filesystem backend |
| `README.md`     | Architecture + usage |
| `.clinerules`   | Project intent/spec |

### Known limitations

- The HTTP backend returns Promises; the app currently wires to the synchronous
  `localStorage` path, so switching backends requires adapting `app.js` to async.
- HTML validity checking is a lightweight tag-balance heuristic (void-element
  aware); it does not fully parse malformed attribute quoting.
- Markdown support is intentionally minimal (no tables, nested lists, or
  reference-style links).
- No build step or dependencies — open `craft.html` directly in a browser.
