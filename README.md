# ObsiPage - Pages Viewer for Obsidian

[日本語版はこちら](README_ja.md)

An Obsidian plugin that enables previewing Apple Pages (`.pages`) files directly within Obsidian.

## How It Works

Apple Pages files are actually ZIP archives that contain a preview image (`preview.jpg`) generated automatically when the document is saved. This plugin extracts that embedded preview and displays it inside Obsidian — no external tools or conversion needed.

```
.pages file (ZIP)
  └── preview.jpg  ← extracted and displayed by this plugin
```

> **Note:** The preview is a snapshot image saved at the time of last edit. Text selection and editing are not supported.

## Features

- **Preview .pages files** — Click a `.pages` file in your vault and see its contents instantly
- **Multi-format support** — Handles both modern (iWork 2013+) and legacy (iWork '08/'09) formats
- **Fallback display** — If no preview image exists, embedded images from the document are shown
- **Open in Pages** — One-click button to open the file in Apple Pages for editing
- **Seamless navigation** — Switch freely between `.pages` files and other files without getting stuck

## Installation

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder named `obsidian-pages-viewer` inside your vault's `.obsidian/plugins/` directory
3. Place the three files into that folder
4. Restart Obsidian
5. Go to **Settings → Community plugins** and enable **Pages Viewer**

### Build from Source

```bash
git clone https://github.com/tamo2918/ObsiPage.git
cd ObsiPage
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/obsidian-pages-viewer/` directory.

## Supported File Formats

| Format | Era | Preview Location |
|--------|-----|-----------------|
| Modern iWork | 2013–present | `preview.jpg` (root) |
| Legacy iWork | 2008–2012 | `QuickLook/Thumbnail.jpg` or `QuickLook/Preview.pdf` |

## Technical Overview

1. Registers the `.pages` extension with a custom `FileView`
2. Reads the file as binary and opens it as a ZIP archive using [JSZip](https://github.com/Stuk/jszip)
3. Searches for preview images in known locations within the archive
4. Converts the extracted image data to a Blob URL and renders it via an `<img>` element

## License

MIT
