# DocFlow

A lightweight, browser-based rich text document editor with a familiar word-processor layout. DocFlow runs entirely in the client—no server, build step, or account required.

## Overview

DocFlow provides a clean editing surface styled like a printed page (A4), with a menu bar, formatting toolbar, ruler, live word count, and automatic draft recovery via `localStorage`. It is designed for quick document drafting, notes, and export to HTML or plain text.

**Live demo:** [prateekdutta2001.github.io/DocFlow](https://prateekdutta2001.github.io/DocFlow/)

## Features

- **Rich text editing** — Bold, italic, underline, strikethrough, superscript, subscript
- **Typography** — Multiple font families and sizes (8–72 pt)
- **Paragraph styles** — Headings (H1–H4), blockquote, preformatted text
- **Colors** — Text color and highlight palettes with custom color pickers
- **Layout** — Left, center, right, and justified alignment; bullet and numbered lists; indent/outdent
- **Insert** — Tables (configurable rows/columns and header row), images, hyperlinks, horizontal rules, code blocks, page breaks
- **Find & replace** — Search with highlight, navigate matches, replace one or all
- **Zoom** — 50%–200% page scaling
- **Persistence** — Auto-save to browser storage; manual save (`Ctrl+S`)
- **Export** — Download as `.html` or `.txt`; print via browser (`Ctrl+P`)
- **Status bar** — Live word, character, and line counts

## Quick Start

### Requirements

- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Internet connection (for Google Fonts on first load)

### Run locally

1. Clone or download this repository.
2. Open `index.html` in your browser.

   **Windows (PowerShell):**
   ```powershell
   start index.html
   ```

   **macOS:**
   ```bash
   open index.html
   ```

   **Linux:**
   ```bash
   xdg-open index.html
   ```

Alternatively, serve the folder with any static file server (recommended for consistent behavior):

```bash
# Python 3
python -m http.server 8080
```

Then visit `http://localhost:8080`.

> **Note:** DocFlow does not require Node.js, npm, or a bundler. All logic is plain HTML, CSS, and JavaScript.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New document | `Ctrl+N` |
| Save (to browser storage) | `Ctrl+S` |
| Print | `Ctrl+P` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Y` |
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |
| Underline | `Ctrl+U` |
| Select all | `Ctrl+A` |
| Find & replace | `Ctrl+H` |
| Insert tab (in editor) | `Tab` |
| Close panels / menus | `Esc` |

On macOS, use `Cmd` instead of `Ctrl`.

## Project Structure

```
DocFlow/
├── index.html    # Application markup
├── styles.css    # Layout, theme, and editor styles
├── script.js     # Editor logic and interactions
└── README.md     # This file
```

## How It Works

- The editable region is a `contenteditable` element styled as an A4 page.
- Formatting uses the browser’s `document.execCommand` API and targeted DOM updates (e.g. font size via inline spans).
- Draft content is stored under the key `docflow_content` in `localStorage` and restored on load.
- Exported HTML is a minimal standalone document; exported TXT is plain text derived from the editor content.

## Browser Support

DocFlow targets evergreen browsers with support for `contenteditable`, `localStorage`, and modern CSS. Legacy browsers (e.g. Internet Explorer) are not supported.

## Limitations

- Saves are local to the current browser and profile; clearing site data removes drafts.
- Complex layouts (multi-column, advanced tables) are not supported.
- Image insertion embeds files as data URLs, which can increase storage size for large images.

## License

This work is licensed under the [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

## Author

**Prateek Dutta** — [prateekdutta2001.github.io/PrateekDutta.in](https://prateekdutta2001.github.io/PrateekDutta.in/)

---

Part of the **BhasaSetu** project family.
