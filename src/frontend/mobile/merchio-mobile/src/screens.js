import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Txt, Card, Btn, Pill, Field, Pick, Sheet, useT, Bars, Share, Chart } from './ui';
import { M, ST, LBL, GROUPS, OPTIONAL, PLANS, SRC, getS, save, saveRecord, removeRecord, runAct, importCsv, exportCsv, chat, lab, fmt, note, uid, ago, stats, resetAll, exportJson, restoreJson, replyTicket } from './engine';

const fcol = k => M[k].cols.find(c => c[0] === 'status' && c[2] === 'sel') || M[k].cols.find(c => c[2] === 'sel');
const isNum = c => c[2] === 'num' || c[2] === 'money';
const show = (c, v) => c[2] === 'money' ? fmt(v) : String(v ?? '');
const H = ({ t, s, children }) => <View style={{ marginBottom: 12 }}><Txt s={24} b>{t}</Txt>{s ? <Txt mu>{s}</Txt> : null}{children}</View>;

export function Home({ nav }) {
  const S = getS(), st = stats();
  return <ScrollView contentContainerStyle={{ padding: 16 }}>
    <H t="Welcome back 👋" s="Live overview of your store" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>{st.kpis.map(k => <View key={k[0]} style={{ width: '50%', padding: 5 }}><Card onPress={() => nav.go(k[2])} style={{ marginBottom: 0 }}><Txt mu s={12}>{k[0]}</Txt><Txt b s={22}>{k[1]}</Txt></Card></View>)}</View>
    <Card style={{ marginTop: 12 }}><Txt b>Revenue by month</Txt><Bars rows={st.monthly} /></Card>
    <Card><Txt b>Orders by status</Txt><Share rows={st.byStatus} /></Card>
    {S.charts.map(c => <Card key={c.id}><Txt b>{c.title}</Txt><Chart c={c} /></Card>)}
    <Card><Txt b>Recent activity</Txt>{S.notes.slice(0, 5).map(n => <View key={n.id} style={{ marginTop: 8 }}><Txt b s={13}>{n.t}</Txt><Txt mu s={12}>{n.b}</Txt></View>)}</Card>
  </ScrollView>;
}

export function Group({ g, nav }) {
  const S = getS(), items = g[3].filter(i => S.mods[i[0]] !== false);
  return <ScrollView contentContainerStyle={{ padding: 16 }}><H t={g[1]} s="Choose a module" />{items.map(i => <Card key={i[0]} onPress={() => nav.go(i[0])}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Txt s={26}>{i[2]}</Txt><View style={{ marginLeft: 12, flex: 1 }}><Txt b>{i[1]}</Txt>{M[i[0]] && getS()[i[0]] ? <Txt mu s={12}>{getS()[i[0]].length} records</Txt> : null}</View><Txt mu s={20}>›</Txt></View></Card>)}</ScrollView>;
}

export function Module({ k, nav }) {
  const S = getS(), m = M[k], [q, setQ] = useState(''), [f, setF] = useState(''), [lim, setLim] = useState(30), [io, setIo] = useState(null), [txt, setTxt] = useState(''), [msg, setMsg] = useState('');
  const fc = k === 'leads' ? ['stage', 'Stage', 'sel', ST] : fcol(k);
  let L = S[k].filter(r => (!q || Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase())) && (!f || !fc || r[fc[0]] === f));
  if (k === 'appts') L = L.slice().sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
  const act = (id, i) => { const e = runAct(k, id, i); if (e) setMsg(e); else setMsg(''); };
  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }} keyboardShouldPersistTaps="handled">
    <H t={LBL[k]} s={m.s} />
    <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#8fb0d6" style={{ backgroundColor: '#7fa8d422', borderRadius: 12, padding: 11, marginBottom: 8 }} />
    {fc ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{[''].concat(fc[3]).map(o => <Btn key={o} small kind={f === o ? 'p' : ''} t={o || 'All'} onPress={() => setF(o)} />)}</ScrollView> : null}
    <View style={{ flexDirection: 'row', marginBottom: 6 }}><Btn small t="Import CSV" onPress={() => { setTxt(''); setIo('in'); }} /><Btn small t="Export CSV" onPress={() => { setTxt(exportCsv(k)); setIo('out'); }} /></View>
    {msg ? <Card style={{ borderColor: '#dc2626' }}><Txt c="#dc2626" s={13}>{msg}</Txt></Card> : null}
    {L.slice(0, lim).map(r => <Card key={r.id} onPress={() => nav.push('form', { k, id: r.id })}>
      <Txt b s={16}>{k === 'leads' ? r.name : lab(r)}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>{m.cols.slice(1).map(c => ['status', 'priority', 'stage'].includes(c[0]) ? <Pill key={c[0]} v={r[c[0]]} /> : (r[c[0]] !== '' && r[c[0]] != null && c[2] !== 'area') ? <Txt key={c[0]} mu s={12} style={{ marginRight: 10, marginTop: 4 }}>{c[1]}: {show(c, r[c[0]])}</Txt> : null)}</View>
      {m.flag && m.flag(r) ? <View style={{ flexDirection: 'row' }}><Pill v={m.flag(r)} /></View> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(m.acts || []).map((a, i) => <Btn key={a[0]} small t={a[0]} onPress={() => act(r.id, i)} />)}{k === 'tickets' ? <Btn small t="Thread" onPress={() => nav.push('ticket', { id: r.id })} /> : null}{k === 'leads' && r.stage !== 'Won' ? <Btn small t="Next stage →" onPress={() => { saveRecord('leads', r.id, { stage: ST[ST.indexOf(r.stage) + 1] }); }} /> : null}</View>
    </Card>)}
    {!L.length ? <Txt mu style={{ textAlign: 'center', padding: 30 }}>No records yet — tap + to add one.</Txt> : null}
    {L.length > lim ? <Btn t="Show more" onPress={() => setLim(lim + 30)} /> : null}
  </ScrollView>
    <TouchableOpacity onPress={() => nav.push('form', { k })} style={{ position: 'absolute', right: 18, bottom: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: '#0176d5', alignItems: 'center', justifyContent: 'center', elevation: 6 }}><Txt c="#fff" s={30}>+</Txt></TouchableOpacity>
    <Sheet show={io} onClose={() => setIo(null)}><Txt b s={18}>{io === 'in' ? 'Import CSV' : 'Export CSV'}</Txt><Txt mu s={12}>{io === 'in' ? 'Paste CSV text with a header row matching the column names.' : 'Select all and copy.'}</Txt><TextInput value={txt} onChangeText={setTxt} multiline editable={io === 'in'} style={{ borderWidth: 1, borderColor: '#7fa8d455', borderRadius: 10, padding: 10, minHeight: 140, marginVertical: 8, color: '#888' }} />{io === 'in' ? <Btn kind="p" t="Import" onPress={() => { try { const r = importCsv(k, txt); setMsg(r.n + ' imported' + (r.sk ? ' · skipped: ' + r.sk : '')); } catch (e) { setMsg('Could not read that CSV'); } setIo(null); }} /> : null}</Sheet>
  </View>;
}

export function Form({ k, id, nav }) {
  const S = getS(), m = M[k], rec = id ? S[k].find(x => x.id === id) : { ...(m.def ? m.def() : {}) };
  const [v, setV] = useState(() => { const o = {}; m.cols.forEach(c => { o[c[0]] = rec[c[0]] ?? (c[2] === 'sel' ? c[3][0] : ''); }); return o; });
  const [err, setErr] = useState(''), [del, setDel] = useState(false);
  const set = (c, x) => setV({ ...v, [c[0]]: x });
  const go = () => { const e = saveRecord(k, id || null, v); if (e) setErr(e); else nav.pop(); };
  return <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
    <H t={(id ? 'Edit ' : 'New ') + LBL[k]} />
    {m.cols.map(c => { const lb = c[1] + ((m.req || []).includes(c[0]) ? ' *' : ''); return c[2] === 'sel' ? <Pick key={c[0]} label={lb} value={v[c[0]]} options={c[3]} onChange={x => set(c, x)} /> : c[2] === 'ref' ? <Pick key={c[0]} label={lb} value={v[c[0]]} options={[''].concat([...new Set(S[c[3]].map(x => x[c[4]]).filter(Boolean))])} onChange={x => set(c, x)} /> : <Field key={c[0]} label={lb} value={v[c[0]]} onChange={x => set(c, x)} multi={c[2] === 'area'} num={isNum(c)} ph={c[2] === 'date' ? 'YYYY-MM-DD' : ''} />; })}
    {err ? <Txt c="#dc2626" s={13} style={{ marginBottom: 8 }}>{err}</Txt> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}><Btn kind="p" t="Save" onPress={go} />{id ? (m.acts || []).map((a, i) => <Btn key={a[0]} t={a[0]} onPress={() => { const e = runAct(k, id, i); if (e) setErr(e); else nav.pop(); }} />) : null}<Btn t="Cancel" onPress={nav.pop} />{id ? <Btn kind="d" t="Delete" onPress={() => setDel(true)} /> : null}</View>
    <Sheet show={del} onClose={() => setDel(false)}><Txt b s={18}>Delete this record?</Txt><Txt mu>This can’t be undone.</Txt><Btn kind="d" t="Delete" onPress={() => { removeRecord(k, id); nav.pop(); }} /></Sheet>
  </ScrollView>;
}

export function Ticket({ id, nav }) {
  const t = getS().tickets.find(x => x.id === id), [x, setX] = useState('');
  if (!t) return <Txt>Ticket not found</Txt>;
  return <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"><H t={t.subject} s={t.customer + (t.assignee ? ' · ' + t.assignee : '')} /><View style={{ flexDirection: 'row' }}><Pill v={t.priority} /><Pill v={t.status} /></View>
    {(t.comments || []).map((c, i) => <Card key={i} style={{ marginTop: 10 }}><Txt>{c.t}</Txt><Txt mu s={11}>{ago(c.ts)}</Txt></Card>)}{!(t.comments || []).length ? <Txt mu style={{ marginTop: 10 }}>No replies yet.</Txt> : null}
    <Field label="Reply" value={x} onChange={setX} multi /><Btn kind="p" t="Send reply" onPress={() => { replyTicket(id, x); setX(''); }} /></ScrollView>;
}

export function Notes() {
  const S = getS();
  return <ScrollView contentContainerStyle={{ padding: 16 }}><H t="Notifications" s="Created by orders, stock, campaigns, tickets and workflows" /><View style={{ flexDirection: 'row' }}><Btn small t="Mark all read" onPress={() => { S.notes.forEach(n => n.read = true); save(); }} /><Btn small kind="d" t="Clear" onPress={() => { S.notes = []; save(); }} /></View>
    {S.notes.map(n => <Card key={n.id} onPress={() => { n.read = !n.read; save(); }} style={{ marginTop: 10 }}><Txt b>{n.read ? '' : '● '}{n.t}</Txt><Txt mu s={13}>{n.b}</Txt><Txt mu s={11}>{ago(n.ts)}</Txt></Card>)}
    <Card><Txt b>Activity log</Txt>{S.log.slice(0, 20).map((l, i) => <Txt key={i} mu s={12} style={{ marginTop: 4 }}>{ago(l.ts)} · {l.t}</Txt>)}</Card></ScrollView>;
}

export function Bot() {
  const S = getS(), [msgs, setMsgs] = useState([['b', 'Hi! I’m the MerchIO assistant. Ask about an order (e.g. ORD-4821), shipping, returns…']]), [x, setX] = useState('');
  const send = t => { t = (t || x).trim(); if (!t) return; setX(''); setMsgs(m => m.concat([['u', t]])); setTimeout(() => setMsgs(m => m.concat([['b', chat(t)]])), 400); };
  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 16 }}>{msgs.map((m, i) => <View key={i} style={{ alignSelf: m[0] === 'u' ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: m[0] === 'u' ? '#0176d5' : '#7fa8d433', borderRadius: 14, padding: 10, marginBottom: 8 }}><Txt c={m[0] === 'u' ? '#fff' : undefined}>{m[1]}</Txt></View>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{S.faqs.filter(f => f.a).slice(0, 3).map(f => <Btn key={f.id} small t={f.q} onPress={() => send(f.q)} />)}</View></ScrollView>
    <View style={{ flexDirection: 'row', padding: 10 }}><TextInput value={x} onChangeText={setX} onSubmitEditing={() => send()} placeholder="Type a message…" placeholderTextColor="#8fb0d6" style={{ flex: 1, backgroundColor: '#7fa8d422', borderRadius: 20, paddingHorizontal: 14 }} /><Btn kind="p" t="Send" onPress={() => send()} /></View></View>;
}

export function Sub() {
  const S = getS();
  return <ScrollView contentContainerStyle={{ padding: 16 }}><H t="Subscription" s="Switch plans instantly in this prototype" />{PLANS.map(p => <Card key={p[0]} style={S.plan === p[0] ? { borderColor: '#0176d5', borderWidth: 2 } : null}><Txt b s={18}>{p[0]}{S.plan === p[0] ? ' · current' : ''}</Txt><Txt b s={26}>${p[1]}<Txt mu s={13}>/mo</Txt></Txt>{p[2].map(f => <Txt key={f} s={13}>✓ {f}</Txt>)}<Btn kind={S.plan === p[0] ? '' : 'p'} t={S.plan === p[0] ? 'Current plan' : 'Select'} onPress={() => { S.plan = p[0]; note('Plan changed', 'You are now on ' + p[0]); save(); }} /></Card>)}
    <Card><Txt b>Usage</Txt>{[['Orders', S.orders.length, S.plan === 'Starter' ? 500 : 0], ['Team seats', S.team.length, S.plan === 'Starter' ? 3 : S.plan === 'Professional' ? 15 : 0]].map(u => <Txt key={u[0]} mu style={{ marginTop: 6 }}>{u[0]}: {u[1]}{u[2] ? ' / ' + u[2] : ' · unlimited'}</Txt>)}</Card></ScrollView>;
}

export function Prefs() {
  const S = getS(), [bk, setBk] = useState(null), [txt, setTxt] = useState(''), [err, setErr] = useState('');
  return <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"><H t="Settings" />
    <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt b>Dark mode</Txt><Switch value={S.theme === 'dark'} onValueChange={v => { S.theme = v ? 'dark' : 'light'; save(); }} /></View></Card>
    <Card><Pick label="Currency" value={S.company.cur} options={['USD', 'EUR', 'GBP']} onChange={x => { S.company.cur = x; save(); }} /><Pick label="Language" value={S.company.lang} options={['English', 'Spanish', 'French']} onChange={x => { S.company.lang = x; save(); }} /></Card>
    <Card><Txt b>Modules</Txt><Txt mu s={12}>Core modules are always on. Toggle optional ones.</Txt>{OPTIONAL.map(id => <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}><Txt>{LBL[id]}</Txt><Switch value={S.mods[id] !== false} onValueChange={v => { S.mods[id] = v; save(); }} /></View>)}</Card>
    <Card><Txt b>Backup & restore</Txt><View style={{ flexDirection: 'row' }}><Btn small t="Export JSON" onPress={() => { setTxt(exportJson()); setErr(''); setBk('out'); }} /><Btn small t="Restore" onPress={() => { setTxt(''); setErr(''); setBk('in'); }} /><Btn small kind="d" t="Reset demo data" onPress={() => resetAll()} /></View></Card>
    <Sheet show={bk} onClose={() => setBk(null)}><Txt b s={18}>{bk === 'in' ? 'Restore from backup' : 'Backup'}</Txt><TextInput value={txt} onChangeText={setTxt} multiline editable={bk === 'in'} style={{ borderWidth: 1, borderColor: '#7fa8d455', borderRadius: 10, padding: 10, minHeight: 140, marginVertical: 8, color: '#888' }} />{err ? <Txt c="#dc2626">{err}</Txt> : null}{bk === 'in' ? <Btn kind="p" t="Restore" onPress={() => { const e = restoreJson(txt); if (e) setErr(e); else setBk(null); }} /> : null}</Sheet></ScrollView>;
}

export function Charts() {
  const S = getS(), [type, setType] = useState('bars'), [title, setTitle] = useState('My Chart'), [rows, setRows] = useState([['Q1', 42], ['Q2', 58], ['Q3', 51], ['Q4', 74]]);
  const ch = (i, j, x) => setRows(rows.map((r, a) => a === i ? r.map((y, b) => b === j ? (j ? +x || 0 : x) : y) : r));
  return <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"><H t="Chart Builder" s="Build from scratch or live platform data" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[['bars', 'Bars'], ['hbars', 'Horizontal'], ['share', 'Share']].map(t => <Btn key={t[0]} small kind={type === t[0] ? 'p' : ''} t={t[1]} onPress={() => setType(t[0])} />)}</View>
    <Pick label="Data source" value="Choose…" options={['Manual'].concat(Object.keys(SRC))} onChange={x => { if (SRC[x]) { setRows(SRC[x]()); setTitle(x); } }} />
    <Field label="Title" value={title} onChange={setTitle} />
    <Card><Chart c={{ type, rows }} /></Card>
    {rows.map((r, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 2 }}><Field label="" value={r[0]} onChange={x => ch(i, 0, x)} /></View><View style={{ flex: 1, marginLeft: 8 }}><Field label="" value={r[1]} num onChange={x => ch(i, 1, x)} /></View><Btn small kind="d" t="✕" onPress={() => setRows(rows.filter((_, a) => a !== i))} /></View>)}
    <View style={{ flexDirection: 'row' }}><Btn small t="+ Row" onPress={() => setRows(rows.concat([['New', 0]]))} /><Btn kind="p" t="Save to dashboard" onPress={() => { S.charts.unshift({ id: uid(), type, title, rows: rows.map(r => r.slice()) }); save(); }} /></View>
    {S.charts.length ? <Txt b s={18} style={{ marginTop: 16 }}>Saved dashboards</Txt> : null}{S.charts.map(c => <Card key={c.id}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt b>{c.title}</Txt><Btn small kind="d" t="✕" onPress={() => { S.charts = S.charts.filter(x => x.id !== c.id); save(); }} /></View><Chart c={c} /></Card>)}</ScrollView>;
}

export function Search({ nav }) {
  const S = getS(), [q, setQ] = useState(''), out = [];
  if (q.trim()) Object.keys(M).forEach(k => (S[k] || []).forEach(r => { if (out.length < 30 && Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase())) out.push([k, r]); }));
  return <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"><H t="Search" s="Across every module" /><Field label="" value={q} onChange={setQ} ph="Orders, products, tickets, contacts…" />{out.map(([k, r]) => <Card key={k + r.id} onPress={() => nav.push('form', { k, id: r.id })}><Txt b>{lab(r)}</Txt><Txt mu s={12}>{LBL[k] || k}</Txt></Card>)}{q && !out.length ? <Txt mu>No matches.</Txt> : null}</ScrollView>;
}
