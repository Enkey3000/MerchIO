# MerchIO Desktop (Electron) — Windows · macOS · Linux

The MerchIO web app wrapped in a secure Electron shell, plus a small desktop layer (`renderer/desktop.js`) that adds native features.

## Run
```bash
npm install
npm start
```

## Build installers
```bash
npm run dist:win     # NSIS installer (.exe)
npm run dist:mac     # .dmg + .zip   (sign/notarize with your Apple Developer ID)
npm run dist:linux   # AppImage + .deb
```
Config is in `electron-builder.yml`. App icon comes from `assets/icon.png` (1024×1024, your original logo).

## What the desktop layer adds
- **File-based data store** — `userData/merchio-data.json`, atomic writes, plus 7 rolling daily backups in `userData/backups/`
- **Native menu & shortcuts** — New/Import/Export/Backup/Restore, Toggle Dark Mode (Ctrl/Cmd+D), Go to modules (Ctrl/Cmd+1–6), Search (Ctrl/Cmd+K)
- **Real file dialogs** — "Save as file…" for CSV export and backup, "Open file…" for restore
- **Native notifications + badge count** for new in-app notifications (click opens Notifications)
- **System tray** (Open, New Order, Quit), **single-instance lock**, **window size/position memory**
- **`merchio://` deep links** (e.g. `merchio://orders`)
- **Security**: sandboxed renderer, context isolation, no Node in the page, strict CSP, navigation blocked, external links open in the browser, IPC inputs validated

## Structure
- `main.js` — main process (window, menu, tray, IPC, file store)
- `preload.js` — the only bridge (`window.desktop`)
- `renderer/index.html` — the MerchIO app (works offline; Chart.js is bundled in `renderer/vendor/`)
- `renderer/desktop.js` — desktop-only behaviour (does nothing in a plain browser)
- `preview/` — builds `merchio-desktop-preview.html` (`npm run preview`, needs Python 3) so you can revise and test in a browser with a simulated Electron shell

## Notes
- Data is local to the machine; there is no server sync yet (see the backend plan).
- Auto-update is not wired: add `electron-updater` and a `publish:` provider in `electron-builder.yml` once you have a release host.
- The CSP allows inline scripts/handlers because the app uses them; tighten by moving them to files when you refactor.
- Unsigned builds trigger SmartScreen (Windows) and Gatekeeper (macOS) warnings.
