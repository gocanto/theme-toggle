# Dark Mode - Lite

A compact Chrome extension that applies dark mode to regular web pages. The project now builds an MV3 extension with Vite+, Vue, TypeScript, Tailwind CSS 4, and shadcn-vue style components.

## Features

- Manifest V3 extension emitted to `dist`.
- Vue popup built with shadcn-vue style controls and Lucide icons.
- TypeScript content script for the page dark-mode engine.
- Tailwind CSS 4 styling through the official Vite plugin.
- Global enable/disable switch.
- Per-site enable/disable using the normalized hostname.
- Smart mode that darkens light surfaces while leaving already-dark areas alone.
- Invert mode for broad page coverage, with images, video, canvas, SVG, and iframes inverted back.
- Soft mode for simpler pages where direct dark CSS is preferable.
- Brightness, contrast, and sepia controls stored in `chrome.storage.sync`.

## Install

1. Install dependencies with `npm install`.
2. Build the extension with `npm run build`.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the `dist` folder.

## Development

- `npm run dev` starts the Vite popup preview.
- `pnpm run format` and `pnpm run format-all` format through the go-fmt wrapper.
- `npm run typecheck` runs Vue and TypeScript checks.
- `npm run build` emits the loadable extension under `dist`.
- `npm run check` runs typecheck and build together.

## Limits

This is intentionally not a full Dark Reader clone. It does not parse every CSS rule,
generate site-specific color maps, sync public site fixes, or handle every shadow DOM
edge case. It is meant to be a compact extension you can inspect and modify.
