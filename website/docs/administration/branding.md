---
title: Branding
sidebar_position: 4
---

**Product name:** set `PANEL_NAME` in `.env` (default `PVE Panel`) and restart. It
appears on both sign-in pages, in the sidebar and in browser tabs.

**Own OS icons:** the panel shows neutral glyphs for Windows and Linux servers. To
use your own icons instead, put `os-windows.svg` and/or `os-linux.svg` (or `.png` /
`.webp`) into the branding folder: `BRANDING_DIR`, default `data/branding/` next to
the database. With Docker, mount a folder and set `BRANDING_DIR` (see
`docker-compose.yml`). Only these file names are served, with a strict sandbox
policy. Make sure you're allowed to use the images you put there.

## Color scheme

**Settings → Appearance** sets the color scheme for **everyone**: the admin interface, the
customer portal, both sign-in pages and the emails the panel sends.

![The color schemes, and Orchid in dark mode](/color-schemes.png)

| Scheme | Look |
|---|---|
| **Harbor** (default) | signal blue on slate — the original look |
| **Forest** | calm green on deep pine |
| **Ember** | warm orange on dark brown |
| **Orchid** | violet on aubergine |
| **Graphite** | neutral graphite with teal |
| **Ocean** | clear sky blue on deep sea |
| **Rose** | raspberry pink on dark plum |
| **Sand** | warm gold on dark umber |

![Appearance settings](/appearance-settings.png)

- Click a scheme to **preview** it on your admin page; **Save for everyone** applies it.
  Open pages pick it up when they reload.
- Every scheme has a **light and a dark variant**; the panel follows each device's light/dark
  setting.
- All text reaches at least **4.5:1 contrast** (WCAG AA; 3:1 for large text) in every scheme
  and mode. This is **measured on the rendered pages** by an automated browser test — every
  visible text, including form fields and placeholders, on the customer and admin pages, in
  all eight schemes, light and dark — so a scheme can't ship with unreadable text.
- Charts use two clearly different colors in every scheme (e.g. green and amber in *Forest*).
- Status colors — green *running*, orange warnings, red for dangerous actions — are the same in
  every scheme, so they always mean the same thing.
- Users can't choose their own scheme (yet); the setting applies to everyone.
