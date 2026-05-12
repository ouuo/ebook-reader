# Ebook Reader

A self-hosted, lightweight ebook reader that runs entirely in Node.js with zero build steps. Drop your books into a folder and start reading immediately.

## Features

- **Multi-format support** — EPUB, PDF, MOBI, AZW3, TXT, Markdown, JSON
- **Zero build step** — Pure Node.js server, no compilation or bundling required
- **Drag & drop import** — Drag files or folders directly into the browser to add books
- **Local path import** — Add books from any local directory on the server
- **Bookshelf management** — Remove books from the shelf (source files are never deleted)
- **Table of contents** — Navigate chapters with a collapsible TOC sidebar
- **Full-text search** — Search across all chapters and jump to results
- **Page numbers** — Global page numbers across the entire book
- **Responsive** — Works on desktop and mobile browsers
- **Cover images** — Automatically extracts and displays EPUB covers

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ouuo/ebook-reader.git
cd ebook-reader

# Install dependencies
npm install

# Start the server
npm start
```

Open http://localhost:3200 in your browser.

## Adding Books

There are three ways to add books:

1. **Drag & drop** — Drag files or folders from your file manager directly onto the bookshelf page
2. **Add local path** — Click the "Add Book" button and enter a file path or directory on the server. Directories are scanned recursively
3. **Manual** — Copy files into the `books/` directory and refresh the page

Supported file types: `.epub`, `.pdf`, `.mobi`, `.azw`, `.azw3`, `.txt`, `.md`, `.json`

### JSON Book Format

For structured content, use a JSON file with this format:

```json
{
  "title": "Book Title",
  "author": "Author Name",
  "chapters": [
    { "title": "Chapter 1", "text": "Content here..." },
    { "title": "Chapter 2", "text": "More content..." }
  ]
}
```

### Directory as Book

Place a folder in `books/` containing `.txt`, `.md`, or `.html` files. Each file becomes a chapter, sorted alphabetically by filename.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `PORT` | 3200 | Server port (change in `server.js`) |

Books are stored in `books/`, covers in `covers/`, and extracted EPUB assets in `book-assets/`. These directories are created automatically and excluded from git.

## Removing Books

Use the trash icon on the bookshelf to remove a book. This only hides it from the shelf — the original file on disk is never deleted.

## Tech Stack

- **Backend** — Node.js HTTP server (no framework)
- **Frontend** — Vanilla JS + CSS (no build tools)
- **Dependencies**:
  - `jszip` — EPUB parsing
  - `pdf-parse` — PDF text extraction
  - `pdfjs-dist` — PDF rendering
  - `@lingo-reader/mobi-parser` — MOBI/AZW3 parsing
  - `epub2` — EPUB metadata (fallback)

## License

MIT
