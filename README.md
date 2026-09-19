# docum

An HTML-based document editor with semantic coloring, semantic decorations, and
a document-preview mode. Save/load documents from HTML5 storage, distinguished
by a unique name.

## Live

Try it on GitHub Pages: <https://arkenidar.github.io/docum/>

## Document types

- `txt`
- `md`
- `json`
- `xml`
- `html`

## Running

Open `craft.html` in a browser (no build step, no dependencies). Documents are
persisted to `localStorage` under the `docum:` namespace.

## Architecture

```
craft.html        entry point / UI shell
css/style.css     theme + layout + syntax palette
js/storage.js     persistence layer (pluggable backend)
js/semantic.js    tokenizer (syntax coloring) + analyzers (semantic feedback)
js/preview.js     preview renderer per mode
js/app.js         application glue (events, view switching)
api/*.php         optional PHP filesystem backend (backend headroom)
```

### Editor

The editing surface is a transparent `<textarea>` layered over a highlighted
`<pre>`. Typing re-tokenizes the content and re-renders the colored layer
underneath, giving native editing with live syntax coloring. A gutter shows line
numbers and error markers; the status bar reports validity, error lines, and
per-mode stats (word/line counts, markdown outline, JSON top-level keys).

### Storage seam

`js/storage.js` exposes a `backend` contract (`list`, `load`, `save`, `remove`).
The default is a synchronous `localStorage` backend. A `Docum.Storage.HttpBackend`
factory is provided for the optional PHP endpoints under `api/`.

> Note: the HTTP backend returns Promises. The current app wires to the
> synchronous path, so switching to HTTP also requires adapting the call sites
> in `app.js` to async. To enable it:
>
> ```js
> Docum.Storage.setBackend(Docum.Storage.HttpBackend());
> ```

### PHP backend (optional)

Serve `api/` with any PHP web server, e.g.:

```sh
php -S localhost:8000
```

Documents are stored as JSON files under `api/data/`. Endpoints:

| Endpoint            | Method | Description                          |
| ------------------- | ------ | ------------------------------------ |
| `api/list.php`      | GET    | list documents                       |
| `api/load.php?name` | GET    | load one document (or `null`)        |
| `api/save.php`      | POST   | save `{ name, mode, content }`       |
| `api/delete.php`    | GET    | delete one document                  |

## Semantics

- **txt** — plain text (no tokens), word/line/char stats.
- **json** — keys, strings, numbers, keywords, punctuation; validity via `JSON.parse`.
- **xml** — tags, attributes, strings, comments, CDATA, doctype; well-formedness via `DOMParser`.
- **html** — same tokens as XML; basic tag-balance checking (void elements aware).
- **md** — headings, bold/italic, inline & fenced code, links, blockquote, list markers; heading outline.

## Roadmap

Planned next steps:

- **Wire the backend** — add a backend toggle in the UI and adapt `app.js` to async so the PHP filesystem backend (`api/*.php`) can be selected as the persistence target.
- **Richer storage** — an IndexedDB backend for larger documents, using the same backend contract.
- **Fuller markdown** — tables, nested lists, task lists, strikethrough, and reference-style links in both highlighting and preview.
- **More document types** — e.g. `yaml`, `css`, `js`.
- **Editor ergonomics** — undo/redo history, find/replace, bracket matching, and a line-wrap toggle.
- **Deeper decorations** — inline error underlines and an outline/minimap sidebar.
- **Import/export** — open/save local files (File System Access API) and download-as-file.
