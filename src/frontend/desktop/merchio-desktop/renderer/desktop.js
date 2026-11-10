/* MerchIO desktop bridge — runs in the page. Uses window.desktop (preload) when available; harmless in a plain browser. */
(function () {
  const DK = window.desktop; if (!DK) return;
  /* 1) data lives in a file in the user's profile; localStorage is just the working copy */
  try {
    const v = DK.storeGetSync();
    if (v) localStorage.setItem('merchio', v); else { const c = localStorage.getItem('merchio'); if (c) DK.storeSet(c); }
    const o = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, val) { o.call(this, k, val); if (k === 'merchio') DK.storeSet(val); };
  } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof S === 'undefined' || typeof A === 'undefined') return;
    document.documentElement.classList.add('desktop', 'os-' + DK.platform);
    document.head.insertAdjacentHTML('beforeend', '<style>header,#tn{user-select:none}</style>');
    /* 2) native notifications + dock/taskbar badge for new in-app notifications */
    let last = S.notes[0] && S.notes[0].id;
    bus.on('change', () => {
      if (!S.notes.some(n => n.id === last)) last = S.notes[0] && S.notes[0].id;
      else { const fresh = []; for (const n of S.notes) { if (n.id === last) break; fresh.push(n); } if (fresh.length) { last = S.notes[0].id; fresh.filter(n => !n.read).slice(0, 3).reverse().forEach(n => DK.notify(n.t, n.b)); } }
      DK.setBadge(S.notes.filter(n => !n.read).length);
    });
    /* 3) real file dialogs for export, backup and restore */
    const addBtn = (label, fn) => { const r = [...document.querySelectorAll('#md .row')].pop(); if (!r) return; const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = fn; r.insertBefore(b, r.firstChild); };
    const ex0 = A.exp; A.exp = function (k) { ex0.call(A, k); addBtn('Save as file…', async () => { const p = await DK.saveFile((LBL[k] || k) + '.csv', document.querySelector('#ex').value); if (p) toast('Saved to ' + p); }); };
    const bk0 = A.bk; A.bk = function () { bk0.call(A); addBtn('Save to file…', async () => { const p = await DK.saveFile('merchio-backup-' + D(0) + '.json', document.querySelector('#bk').value); if (p) toast('Saved to ' + p); }); };
    const rs0 = A.rs; A.rs = function () { rs0.call(A); addBtn('Open file…', async () => { const t = await DK.openFile(); if (t != null) document.querySelector('#rb').value = t; }); };
    const th0 = A.theme; A.theme = function (d) { th0.call(A, d); const c = document.querySelector('#dk'); if (c) c.checked = S.theme === 'dark'; };
    /* 4) native menu / shortcuts / tray commands */
    DK.onMenu(m => {
      const mod = typeof cur !== 'undefined' && M[cur] && !P[cur];
      if (m.cmd === 'go') A.go(m.arg); else if (m.cmd === 'search') A.pal(); else if (m.cmd === 'theme') A.theme(S.theme !== 'dark');
      else if (m.cmd === 'new' && mod) A.edit(cur); else if (m.cmd === 'import' && mod) { const i = document.querySelector('#imp'); i && i.click(); }
      else if (m.cmd === 'export' && mod) A.exp(cur); else if (m.cmd === 'backup') A.bk(); else if (m.cmd === 'restore') A.rs();
    });
  });
})();
