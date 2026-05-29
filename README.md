# Rustle

A desktop EPUB reader built with Tauri, SvelteKit, and Rust.

## Overview

Rustle is an offline e-book reader focused on fast book loading and a distraction-free reading experience. It uses memory-mapped file I/O and a custom zero-copy EPUB parser ([light-epub](https://github.com/foxpc-ai/light-epub)) to keep things responsive even with large libraries.

## Features

- **Library management** - Import books by scanning a folder. Books are indexed locally with cover extraction and metadata parsing.
- **Reading** - Chapter-based navigation with table of contents, keyboard controls, and reading progress persistence.
- **Annotations** - Highlights, bookmarks, and notes tied to specific text positions. Annotations survive across sessions.
- **Theming** - Light, sepia, and dark modes with adjustable font size and brightness.
- **CSS sanitization** - Strips publisher styles down to a safe subset to keep rendering consistent.


## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
pnpm install
pnpm tauri dev
```

## Roadmap

- [ ] In-book text search
- [ ] PDF support
- [ ] Dictionary lookup
- [ ] Page-height scroll (Space/PgDown)
- [ ] Export annotations (Markdown/JSON)
- [ ] Reading time tracking
- [ ] Paginated Layout Mode
- [ ] OPDS catalog support
- [ ] Cross-platform testing (Linux, macOS)

## License

This project is licensed under the AGPL-3.0
