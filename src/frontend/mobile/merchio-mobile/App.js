import React, { useEffect, useReducer, useRef, useState } from 'react';
import { View, Image, TouchableOpacity, BackHandler, Platform, SafeAreaView, StatusBar, Text } from 'react-native';
import { ThemeCtx, light, dark, Txt } from './src/ui';
import { init, subscribe, tick, save, getS, GROUPS, LBL } from './src/engine';
import { Home, Group, Module, Form, Ticket, Notes, Bot, Sub, Prefs, Charts, Search } from './src/screens';

const lockup = require('./assets/lockup.png');
const SPECIAL = { notes: Notes, bot: Bot, sub: Sub, prefs: Prefs, charts: Charts };
const TABS = [['home', 'Home', '🏠']].concat(GROUPS.map(g => [g[0], g[1], g[2]]));

export default function App() {
  const [ready, setReady] = useState(false), [, force] = useReducer(x => x + 1, 0), [stack, setStack] = useState([]), [tab, setTab] = useState('home'), sr = useRef([]);
  const push = (n, p) => { sr.current = sr.current.concat([{ n, p }]); setStack(sr.current); };
  const pop = () => { sr.current = sr.current.slice(0, -1); setStack(sr.current); };
  const nav = { push, pop, go: k => push(SPECIAL[k] ? 'special' : 'module', { k }) };
  useEffect(() => {
    init().then(() => setReady(true));
    const u = subscribe(force), iv = setInterval(tick, 30000), bh = Platform.OS === 'web' ? { remove() {} } : BackHandler.addEventListener('hardwareBackPress', () => { if (sr.current.length) { pop(); return true; } return false; });
    return () => { u(); clearInterval(iv); bh.remove(); };
  }, []);
  const S = ready ? getS() : null, T = S && S.theme === 'dark' ? dark : light, unread = S ? S.notes.filter(n => !n.read).length : 0;
  const top = stack.length ? stack[stack.length - 1] : null, inset = Platform.OS === 'web' ? (global.__INSET || 0) : Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  let body = null, title = '';
  if (ready) {
    if (!top) { const g = GROUPS.find(x => x[0] === tab); body = tab === 'home' ? <Home nav={nav} /> : <Group g={g} nav={nav} />; }
    else if (top.n === 'module') { body = <Module key={top.p.k} k={top.p.k} nav={nav} />; title = LBL[top.p.k]; }
    else if (top.n === 'special') { const C = SPECIAL[top.p.k]; body = <C nav={nav} />; title = LBL[top.p.k]; }
    else if (top.n === 'form') { body = <Form key={top.p.k + top.p.id} k={top.p.k} id={top.p.id} nav={nav} />; title = LBL[top.p.k]; }
    else if (top.n === 'ticket') { body = <Ticket id={top.p.id} nav={nav} />; title = 'Ticket'; }
    else if (top.n === 'search') { body = <Search nav={nav} />; title = 'Search'; }
  }
  const Wrap = Platform.OS === 'ios' ? SafeAreaView : View;
  return <ThemeCtx.Provider value={T}><Wrap style={{ flex: 1, backgroundColor: T.bg, paddingTop: inset }}>
    <StatusBar barStyle={S && S.theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomColor: T.bd, borderBottomWidth: 1 }}>
      {top ? <TouchableOpacity onPress={pop} style={{ paddingRight: 12 }}><Txt s={26} c={T.ac}>‹</Txt></TouchableOpacity> : null}
      {top ? <Txt b s={18} style={{ flex: 1 }}>{title}</Txt> : <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 3 }}><Image source={lockup} style={{ width: 120, height: 26 }} resizeMode="contain" /></View>}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => push('search', {})} style={{ padding: 8 }}><Text style={{ fontSize: 18 }}>🔍</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => nav.go('notes')} style={{ padding: 8 }}><Text style={{ fontSize: 18 }}>🔔</Text>{unread ? <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: T.er, borderRadius: 9, minWidth: 16, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread}</Text></View> : null}</TouchableOpacity>
        <TouchableOpacity onPress={() => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); }} style={{ padding: 8 }}><Text style={{ fontSize: 18 }}>{S && S.theme === 'dark' ? '☀️' : '🌙'}</Text></TouchableOpacity>
      </View>
    </View>
    <View style={{ flex: 1 }}>{ready ? body : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Txt mu>Loading…</Txt></View>}</View>
    {!top && ready ? <View style={{ flexDirection: 'row', borderTopColor: T.bd, borderTopWidth: 1, paddingBottom: Platform.OS === 'android' ? 6 : 0, backgroundColor: T.bg }}>{TABS.map(t => <TouchableOpacity key={t[0]} onPress={() => setTab(t[0])} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}><Text style={{ fontSize: 20, opacity: tab === t[0] ? 1 : 0.55 }}>{t[2]}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: tab === t[0] ? T.ac : T.mu }}>{t[1]}</Text></TouchableOpacity>)}</View> : null}
  </Wrap></ThemeCtx.Provider>;
}
