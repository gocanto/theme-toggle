# Personal Dark Mode Lite

A small dependency-free Chrome extension that applies dark mode to regular web pages.

## Features

- Manifest V3 extension with no build step and no package dependencies.
- Global enable/disable switch.
- Per-site enable/disable using the normalized hostname.
- Smart mode that darkens light surfaces while leaving already-dark areas alone.
- Invert mode for broad page coverage, with images, video, canvas, SVG, and iframes inverted back.
- Soft mode for simpler pages where direct dark CSS is preferable.
- Brightness, contrast, and sepia controls stored in `chrome.storage.sync`.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this folder.

## Limits

This is intentionally not a full Dark Reader clone. It does not parse every CSS rule,
generate site-specific color maps, sync public site fixes, or handle every shadow DOM
edge case. It is meant to be a compact personal extension you can inspect and modify.
