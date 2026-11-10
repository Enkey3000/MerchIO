#!/usr/bin/env python3
"""Builds merchio-desktop-preview.html from renderer/index.html + renderer/desktop.js (simulated Electron shell)."""
import json, os, re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
html, bridge = rd('renderer/index.html'), rd('renderer/desktop.js')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
html = html.replace('<script src="vendor/chart.umd.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>')
html = html.replace('<script src="desktop.js"></script>', '<script>window.desktop=parent.__desk;</script><script>' + bridge.replace('</script', '<\\/script') + '</script>')
app = json.dumps(html).replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
out = rd('preview/tmpl.html').replace('%%APP%%', app)
open(os.path.join(root, 'merchio-desktop-preview.html'), 'w', encoding='utf-8').write(out)
print('Wrote merchio-desktop-preview.html (%d KB)' % (len(out) // 1024))
