'use strict';
(() => {
  const KEY = 'budgetwise.v1';
  const RATE_API = 'https://open.er-api.com/v6/latest/';
  const RATE_MAX_AGE = 6 * 3600e3;

  // [code, country, symbol, decimals shown]
  const CURRENCIES = [
    ['AUD', 'Australia', 'A$', 2], ['PHP', 'Philippines', '₱', 0], ['NZD', 'New Zealand', 'NZ$', 2],
    ['CAD', 'Canada', 'C$', 2], ['GBP', 'United Kingdom', '£', 2], ['USD', 'United States', 'US$', 2],
    ['AED', 'UAE', 'AED ', 2], ['SAR', 'Saudi Arabia', 'SAR ', 2], ['QAR', 'Qatar', 'QAR ', 2],
    ['SGD', 'Singapore', 'S$', 2], ['HKD', 'Hong Kong', 'HK$', 2], ['JPY', 'Japan', '¥', 0],
    ['KRW', 'South Korea', '₩', 0], ['TWD', 'Taiwan', 'NT$', 0], ['EUR', 'Europe (Euro)', '€', 2],
    ['INR', 'India', '₹', 0], ['NPR', 'Nepal', 'Rs ', 0], ['LKR', 'Sri Lanka', 'Rs ', 0],
    ['PKR', 'Pakistan', 'Rs ', 0], ['BDT', 'Bangladesh', '৳', 0], ['VND', 'Vietnam', '₫', 0],
    ['IDR', 'Indonesia', 'Rp ', 0], ['THB', 'Thailand', '฿', 0], ['MYR', 'Malaysia', 'RM ', 2],
    ['CNY', 'China', 'CN¥', 2], ['FJD', 'Fiji', 'FJ$', 2], ['WST', 'Samoa', 'WS$', 2],
    ['TOP', 'Tonga', 'T$', 2], ['PGK', 'Papua New Guinea', 'K ', 2], ['ZAR', 'South Africa', 'R ', 2],
    ['NGN', 'Nigeria', '₦', 0], ['KES', 'Kenya', 'KSh ', 0], ['BRL', 'Brazil', 'R$', 2], ['MXN', 'Mexico', 'MX$', 2]
  ];
  const CUR = Object.fromEntries(CURRENCIES.map(([code, country, sym, dec]) => [code, { code, country, sym, dec }]));
  const REPEATS = [['once', 'Once'], ['week', 'Weekly'], ['fortnight', 'Fortnightly'], ['month', 'Monthly'], ['quarter', 'Every 3 months'], ['year', 'Yearly']];
  const REP = Object.fromEntries(REPEATS);
  const FREQS = [['week', 'Weekly', 'Every 7 days'], ['fortnight', 'Fortnightly', 'Every 14 days'], ['month', 'Monthly', 'Same date'], ['custom', 'Custom', 'e.g. 3rd Friday']];
  const FREQ_LABEL = { week: 'week', fortnight: 'fortnight', month: 'month', custom: 'payday' };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const NTH = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: 'Last' };
  const UNIT = { week: 7, fortnight: 14, month: 30.44, quarter: 91.31, year: 365.25 };

  const ICON = {
    logo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    budget: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></svg>',
    history: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    setup: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>'
  };

  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast');

  let S = load();
  let view = S.profile ? 'home' : 'setup';
  let tab = 'other';
  let openMonth = null;
  let draft = null;
  let confirmReset = false;
  let rateBusy = false;
  let undo = null;
  let toastTimer = 0;

  // ---------- storage ----------
  function blank() { return { v: 1, profile: null, items: [], rate: null, history: {}, seen: null, nextId: 1 }; }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return Object.assign(blank(), s);
    } catch (e) { /* storage blocked or corrupt */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save on this device'); }
  }

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const keyToDate = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1); };
  const monthEnd = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const nextMonthKey = k => { const d = keyToDate(k); return monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };
  const daysBetween = (a, b) => Math.round((b - a) / 864e5);
  const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  const shortDate = d => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const inDays = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  const num = v => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };
  const sym = code => (CUR[code] || { sym: code + ' ' }).sym;
  function money(n, code) {
    const c = CUR[code] || { sym: code + ' ', dec: 2 };
    return (n < 0 ? '−' : '') + c.sym + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec });
  }
  function clock(ts) {
    const d = new Date(ts), h = d.getHours();
    return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function since(ts) {
    const n = daysBetween(new Date(new Date(ts).toDateString()), today());
    return n <= 0 ? `today ${clock(ts)}` : n === 1 ? `yesterday ${clock(ts)}` : `${n} days ago`;
  }

  // ---------- dates ----------
  function step(a, rep, k) {
    if (rep === 'week') return addDays(a, 7 * k);
    if (rep === 'fortnight') return addDays(a, 14 * k);
    const mm = { month: 1, quarter: 3, year: 12 }[rep];
    const t = new Date(a.getFullYear(), a.getMonth() + mm * k, 1);
    return new Date(t.getFullYear(), t.getMonth(), Math.min(a.getDate(), monthEnd(t).getDate()));
  }
  const isDebt = it => it.rep !== 'once' && it.left > 0;
  // Every due date of a cost between from and to (inclusive). Nothing before the month it was added.
  function occurrences(it, from, to) {
    const a = parse(it.due), out = [];
    const floor = it.created ? keyToDate(it.created.slice(0, 7)) : from;
    const lo = from > floor ? from : floor;
    if (it.rep === 'once') { if (a >= lo && a <= to) out.push(a); return out; }
    const kmax = isDebt(it) ? it.left - 1 : Infinity;
    for (let k = Math.floor(daysBetween(a, lo) / UNIT[it.rep]) - 2; k <= kmax; k++) {
      const d = step(a, it.rep, k);
      if (d > to) break;
      if (d >= lo) out.push(d);
    }
    return out;
  }
  const nextDue = it => occurrences(it, today(), addDays(today(), 800))[0] || null;
  function debtState(it) {
    if (!isDebt(it)) return null;
    const a = parse(it.due), t = today();
    let remaining = 0;
    for (let k = 0; k < it.left; k++) if (step(a, it.rep, k) >= t) remaining++;
    return { remaining, end: step(a, it.rep, it.left - 1), toGo: remaining * it.amt };
  }
  function nthWeekday(y, m, nth, wd) {
    if (nth === 5) { const d = new Date(y, m + 1, 0); while (d.getDay() !== wd) d.setDate(d.getDate() - 1); return d; }
    const d = new Date(y, m, 1);
    while (d.getDay() !== wd) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (nth - 1) * 7);
    return d;
  }
  function paydays(from, to, p = S.profile) {
    const out = [];
    if (p.freq === 'week' || p.freq === 'fortnight') {
      const a = parse(p.last), n = p.freq === 'week' ? 7 : 14;
      for (let k = Math.floor(daysBetween(a, from) / n) - 1; ; k++) {
        const d = addDays(a, n * k);
        if (d > to) break;
        if (d >= from) out.push(d);
      }
      return out;
    }
    for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const d = p.freq === 'month'
        ? new Date(m.getFullYear(), m.getMonth(), Math.min(parse(p.last).getDate(), monthEnd(m).getDate()))
        : nthWeekday(m.getFullYear(), m.getMonth(), p.nth, p.wd);
      if (d >= from && d <= to) out.push(d);
    }
    return out;
  }
  function payLabel(p = S.profile) {
    if (p.freq === 'custom') return `${NTH[p.nth]} ${DOW_LONG[p.wd]} of the month`;
    return FREQ_LABEL[p.freq];
  }

  // ---------- money maths ----------
  const pairKey = () => `${S.profile.home}-${S.profile.other}`;
  function rateValue() {
    const p = S.profile;
    if (p.home === p.other) return 1;
    return S.rate && S.rate.pair === pairKey() ? S.rate.value : null;
  }
  function toHome(amount, cur, rate = rateValue()) {
    if (cur === S.profile.home) return amount;
    return rate ? amount / rate : null;
  }
  function summary(from, to, rate = rateValue()) {
    const pays = paydays(from, to).length, income = pays * S.profile.salary;
    const t = { other: 0, home: 0 }, lines = [];
    let missing = false;
    for (const it of S.items) {
      const n = occurrences(it, from, to).length;
      if (!n) continue;
      const v = toHome(it.amt, it.cur, rate);
      if (v == null) { missing = true; continue; }
      t[it.list] += n * v;
      lines.push({ list: it.list, name: it.name, n, amt: n * v });
    }
    return { pays, income, other: t.other, home: t.home, costs: t.other + t.home, saved: income - t.other - t.home, missing, lines };
  }

  // A finished month is kept in History the first time the app opens in a later month.
  function rollover() {
    if (!S.profile) return;
    const cur = monthKey(today());
    if (!S.seen) { S.seen = cur; save(); return; }
    let changed = false;
    for (let k = S.seen; k < cur; k = nextMonthKey(k)) {
      if (S.history[k]) continue;
      const f = keyToDate(k), s = summary(f, monthEnd(f));
      S.history[k] = {
        pays: s.pays, income: s.income, salary: S.profile.salary, other: s.other, home: s.home, saved: s.saved,
        rate: rateValue(), homeCur: S.profile.home, otherCur: S.profile.other, lines: s.lines
      };
      changed = true;
    }
    if (S.seen !== cur) { S.seen = cur; changed = true; }
    if (changed) save();
  }

  // ---------- exchange rate ----------
  async function refreshRate(force) {
    const p = S.profile;
    if (!p || p.home === p.other || rateBusy) return;
    const fresh = S.rate && S.rate.pair === pairKey() && Date.now() - S.rate.at < RATE_MAX_AGE;
    if (!force && (fresh || (S.rate && S.rate.manual && S.rate.pair === pairKey()))) return;
    rateBusy = true;
    if (view === 'home') render();
    try {
      const r = await fetch(RATE_API + encodeURIComponent(p.home), { cache: 'no-store' });
      const j = await r.json();
      const value = j && j.rates && j.rates[p.other];
      if (!value) throw new Error('no rate');
      S.rate = { pair: pairKey(), value, at: Date.now(), manual: false };
      save();
      if (force) toast(`Rate updated: ${sym(p.home)}1 = ${sym(p.other)}${value.toFixed(2)}`);
    } catch (e) {
      if (force) toast(rateValue() ? 'Offline — using the saved rate' : 'Could not get a rate. Check your internet, or set your own rate in Setup.');
    }
    rateBusy = false;
    render();
  }

  // ---------- toast ----------
  function toast(msg, action) {
    clearTimeout(toastTimer);
    $toast.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" data-act="toast">${esc(action.label)}</button>` : ''}`;
    $toast.hidden = false;
    $toast.onclick = e => { if (e.target.closest('[data-act="toast"]') && action) { action.run(); $toast.hidden = true; } };
    toastTimer = setTimeout(() => { $toast.hidden = true; }, action ? 6000 : 3000);
  }

  // ---------- views ----------
  function render() {
    if (!S.profile) view = 'setup';
    $app.innerHTML = view === 'setup' ? setupHtml() : view === 'history' ? historyHtml() : homeHtml();
    if (view === 'setup') syncSetup();
  }

  function navHtml() {
    const b = (v, label) => `<button type="button" data-act="nav" data-view="${v}"${view === v ? ' aria-current="page"' : ''}>${ICON[v === 'home' ? 'budget' : v]}${label}</button>`;
    return `<nav class="nav" aria-label="Main"><div class="nav-brand"><span class="logo" aria-hidden="true">${ICON.logo}</span>BudgetWise</div><div class="nav-in">${b('home', 'Budget')}${b('history', 'History')}${b('setup', 'Setup')}</div><p class="nav-foot">Saved on this device only</p></nav>`;
  }

  function rateBtnHtml() {
    const p = S.profile;
    if (p.home === p.other) return '';
    const v = rateValue();
    const main = v ? `${sym(p.home)}1 = ${sym(p.other)}${v.toFixed(2)}` : 'No rate yet';
    const sub = rateBusy ? 'checking…' : !v ? 'tap to get it' : S.rate.manual ? 'your own rate' : since(S.rate.at);
    return `<button type="button" class="rate-btn${rateBusy ? ' busy' : ''}" data-act="rate" aria-label="Exchange rate ${esc(main)}, ${esc(sub)}. Tap to check now."><span><b>${esc(main)}</b><small>${esc(sub)}</small></span>${ICON.refresh}</button>`;
  }

  function dueDesc(it) {
    const a = parse(it.due);
    if (it.rep === 'once') return 'Once · ' + shortDate(a);
    if (it.rep === 'week' || it.rep === 'fortnight') return `${REP[it.rep]} · ${DOW[a.getDay()]}`;
    if (it.rep === 'month') return 'Monthly · ' + ord(a.getDate());
    return `${REP[it.rep]} · ${a.getDate()} ${MON[a.getMonth()]}`;
  }

  function homeHtml() {
    const p = S.profile, t = today(), from = new Date(t.getFullYear(), t.getMonth(), 1), to = monthEnd(t);
    const s = summary(from, to), rate = rateValue();
    const np = paydays(addDays(t, 1), addDays(t, 400))[0];
    const otherName = CUR[p.other].country;
    const pct = n => s.income > 0 ? Math.max(0, Math.min(100, n / s.income * 100)).toFixed(1) + '%' : '0%';
    const saveLabel = s.saved >= 0 ? 'You can save' : 'Over budget';
    const badge = s.income <= 0 ? 'no payday' : s.saved >= 0 ? Math.round(s.saved / s.income * 100) + '% of income' : 'cut costs';

    const soon = [];
    for (const it of S.items) for (const d of occurrences(it, t, addDays(t, 7))) soon.push({ d, it });
    soon.sort((a, b) => a.d - b.d);

    const tabs = [
      ['other', otherName, money(s.other, p.home), 'dot-other'],
      ['home', 'Local', money(s.home, p.home), 'dot-home'],
      ['soon', 'Due soon', `${soon.length} in 7 days`, 'dot-soon']
    ].map(([k, label, sub, dot]) => `<button type="button" role="tab" class="tab" id="tab-${k}" aria-controls="panel" aria-selected="${tab === k}" data-act="tab" data-tab="${k}"><span class="tab-l"><span class="dot ${dot}"></span><span>${esc(label)}</span></span><small>${esc(sub)}</small></button>`).join('');

    // One list's rows: the phone shows one at a time under the tabs, tablet and desktop show them side by side.
    const body = key => {
    if (key === 'soon') {
      return soon.length ? soon.map(({ d, it }) => {
        const n = daysBetween(t, d), urgent = n <= 1;
        return `<button type="button" class="row" data-act="edit" data-id="${it.id}" style="min-height:62px">
          <span class="cal"><small class="${urgent ? 'urgent' : ''}">${DOW[d.getDay()]}</small><b>${d.getDate()}</b></span>
          <span class="row-main"><span class="row-name">${esc(it.name)}</span><span class="row-sub ${urgent ? 'urgent' : ''}">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'}</span></span>
          <span class="row-amt"><b>${money(it.amt, it.cur)}</b>${it.cur !== p.home && rate ? `<small>≈ ${money(it.amt / rate, p.home)}</small>` : ''}</span>
        </button>`;
      }).join('') + `<p class="hint">Everything due in the next 7 days, from both lists.</p>`
        : `<div class="empty"><b>Nothing due this week</b><span>Costs due in the next 7 days show here.</span></div>`;
    } else {
      const list = S.items.filter(it => it.list === key).map(it => ({ it, nd: nextDue(it) }))
        .sort((a, b) => (a.nd ? a.nd.getTime() : 9e15) - (b.nd ? b.nd.getTime() : 9e15));
      const rows = list.map(({ it, nd }) => {
        const n = occurrences(it, from, to).length, dd = nd ? daysBetween(t, nd) : null, ds = debtState(it);
        const conv = it.cur !== p.home ? (rate ? `<small>≈ ${money(it.amt / rate, p.home)}</small>` : '<small>needs a rate</small>') : '';
        const debtTag = ds ? `<span class="tag-debt">${ds.remaining ? `${ds.remaining} left · ends ${MON[ds.end.getMonth()]} ${ds.end.getFullYear()}` : 'Paid off'}</span>` : '';
        return `<button type="button" class="row${nd ? '' : ' done'}" data-act="edit" data-id="${it.id}">
          <span class="ini ini-${it.list}" aria-hidden="true">${esc((it.name.trim()[0] || '?').toUpperCase())}</span>
          <span class="row-main"><span class="row-name">${esc(it.name)}</span><span class="row-sub">${esc(dueDesc(it))}${n > 1 ? ` · ${n}× this month` : ''}</span>${debtTag}</span>
          <span class="row-amt"><b>${money(it.amt, it.cur)}</b>${conv}<small class="due${dd !== null && dd <= 3 ? ' urgent' : ''}">${nd ? 'due ' + inDays(dd) : ds ? 'paid off' : 'done'}</small></span>
        </button>`;
      }).join('');
      const empty = `<div class="empty"><b>No ${key === 'other' ? esc(otherName) : 'local'} costs yet</b><span>${key === 'other' ? 'Money you send or pay in ' + esc(otherName) + ' — family allowance, loans, bills.' : 'Rent, groceries, phone, transport, bills.'}</span></div>`;
      return (rows || empty) + `<button type="button" class="add-btn" data-act="add" data-list="${key}">${ICON.plus}Add a cost</button>`;
    }
    };
    const cols = [
      ['other', otherName, money(s.other, p.home) + ' this month', 'dot-other'],
      ['home', 'Local', money(s.home, p.home) + ' this month', 'dot-home'],
      ['soon', 'Due soon', 'next 7 days', 'dot-soon']
    ].map(([k, label, sub, dot]) => `<section class="col col-${k}" aria-label="${esc(label)}"><header class="col-h"><span class="dot ${dot}"></span><h2>${esc(label)}</h2><small>${esc(sub)}</small></header><div class="col-b">${body(k)}</div></section>`).join('');

    return `<div class="wrap">
      <header class="top">
        <div class="logo" aria-hidden="true">${ICON.logo}</div>
        <div class="top-name"><span class="eyebrow">BudgetWise</span><span class="hello">Hi, ${esc(p.name)}</span></div>
        ${rateBtnHtml()}
      </header>
      <section class="hero" aria-label="This month">
        <div class="hero-top">
          <div><div class="hero-label">${saveLabel} · ${MON_LONG[t.getMonth()]}</div><div class="hero-amt${s.saved < 0 ? ' neg' : ''}">${money(Math.abs(s.saved), p.home)}</div></div>
          <span class="badge">${badge}</span>
        </div>
        <div class="bar" aria-hidden="true"><span style="width:${pct(s.other)};background:var(--other-bar)"></span><span style="width:${pct(s.home)};background:var(--home-bar)"></span></div>
        <div class="hero-grid">
          <div><small>Income</small><b>${money(s.income, p.home)}</b><small>${s.pays} payday${s.pays === 1 ? '' : 's'}</small></div>
          <div><small>Costs</small><b>${money(s.costs, p.home)}</b><small>both lists</small></div>
          <div><small>Next pay</small><b>${np ? shortDate(np) : '—'}</b><small class="accent">${np ? inDays(daysBetween(t, np)) : ''}</small></div>
        </div>
        ${s.missing ? `<div class="hero-note">Some ${esc(otherName)} costs aren't counted yet — no exchange rate. Tap the rate button or set one in Setup.</div>` : ''}
      </section>
      <div class="tabs" role="tablist" aria-label="Budget lists">${tabs}</div>
      <div class="panel" id="panel" role="tabpanel" aria-labelledby="tab-${tab}">${body(tab)}</div>
      <div class="cols">${cols}</div>
    </div>${navHtml()}`;
  }

  function historyHtml() {
    const p = S.profile, t = today(), cur = monthKey(t);
    const live = summary(new Date(t.getFullYear(), t.getMonth(), 1), monthEnd(t));
    const months = [{ key: cur, live: true, pays: live.pays, income: live.income, salary: p.salary, other: live.other, home: live.home, saved: live.saved, rate: rateValue(), homeCur: p.home, otherCur: p.other, lines: live.lines }]
      .concat(Object.keys(S.history).filter(k => k < cur).sort().reverse().map(k => Object.assign({ key: k }, S.history[k])));
    const first = months[months.length - 1].key;
    const total = months.reduce((a, m) => a + m.saved, 0);
    if (!openMonth) openMonth = cur;

    const chartMonths = months.slice(0, 6).reverse();
    const max = Math.max(1, ...chartMonths.map(m => Math.abs(m.saved)));
    const bars = chartMonths.map(m => {
      const d = keyToDate(m.key), h = Math.max(0.06, Math.abs(m.saved) / max).toFixed(3);
      return `<button type="button" data-act="month" data-key="${m.key}" aria-pressed="${openMonth === m.key}" aria-label="${MON_LONG[d.getMonth()]}: saved ${esc(money(m.saved, m.homeCur))}">
        <small>${m.saved < 0 ? '−' : ''}${Math.abs(m.saved) >= 1000 ? (Math.abs(m.saved) / 1000).toFixed(1) + 'k' : Math.round(Math.abs(m.saved))}</small><i class="${m.saved < 0 ? 'neg' : ''}" style="--h:${h}"></i><b>${MON[d.getMonth()]}</b></button>`;
    }).join('');

    const rows = months.map(m => {
      const d = keyToDate(m.key), open = openMonth === m.key;
      const extra = (p.freq === 'fortnight' && m.pays >= 3) || (p.freq === 'week' && m.pays >= 5);
      const tag = m.live ? 'In progress' : extra ? `${m.pays} paydays` : '';
      const otherLabel = (CUR[m.otherCur] || {}).country || 'Overseas';
      const lines = l => m.lines.filter(x => x.list === l).map(x => `<div class="li"><span>${esc(x.name)}${x.n > 1 ? ` × ${x.n}` : ''}</span><span>${money(x.amt, m.homeCur)}</span></div>`).join('');
      return `<div class="month">
        <button type="button" class="month-btn" data-act="month" data-key="${m.key}" aria-expanded="${open}">
          <span class="month-h"><b>${MON_LONG[d.getMonth()]} ${d.getFullYear()}</b>${tag ? `<span class="tag">${tag}</span>` : ''}${ICON.chev}</span>
          <span class="trio"><span><small>Income</small><b>${money(m.income, m.homeCur)}</b></span><span><small>Costs</small><b>${money(m.other + m.home, m.homeCur)}</b></span><span><small>Saved</small><b class="${m.saved < 0 ? 'lost' : 'saved'}">${money(m.saved, m.homeCur)}</b></span></span>
        </button>
        ${open ? `<div class="detail">
          <div><span class="k">Paydays</span><span>${m.pays} × ${money(m.salary, m.homeCur)}</span></div>
          <div><span class="lst"><span class="dot dot-other"></span>${esc(otherLabel)}</span><span>${money(m.other, m.homeCur)}</span></div>${lines('other')}
          <div><span class="lst"><span class="dot dot-home"></span>Local</span><span>${money(m.home, m.homeCur)}</span></div>${lines('home')}
          ${m.otherCur !== m.homeCur ? `<div><span class="k">Rate used</span><span>${m.rate ? `${sym(m.homeCur)}1 = ${sym(m.otherCur)}${m.rate.toFixed(2)}` : 'none'}</span></div>` : ''}
          <div><span class="k">Saved</span><b>${m.income > 0 ? Math.round(m.saved / m.income * 100) + '% of income' : '—'}</b></div>
        </div>` : ''}
      </div>`;
    }).join('');

    const fd = keyToDate(first);
    return `<div class="wrap">
      <h1 class="page">History</h1>
      <section class="hero" aria-label="Savings summary">
        <div class="hero-top">
          <div><div class="hero-label">Saved since ${MON_LONG[fd.getMonth()]}${fd.getFullYear() !== t.getFullYear() ? ' ' + fd.getFullYear() : ''}</div><div class="hero-amt${total < 0 ? ' neg' : ''}">${money(total, p.home)}</div></div>
          <span class="badge">avg ${money(total / months.length, p.home)}/mo</span>
        </div>
        <div class="chart" style="grid-template-columns:repeat(${chartMonths.length},minmax(0,1fr))">${bars}</div>
      </section>
      <div class="months">${rows}</div>
      <p class="hint">This month counts what's due so far and still to come. Each month is kept here automatically when the next one starts.</p>
    </div>${navHtml()}`;
  }

  function currencyOptions(selected) {
    return CURRENCIES.slice().sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, country, s]) => `<option value="${code}"${code === selected ? ' selected' : ''}>${esc(country)} · ${esc(s.trim())}</option>`).join('');
  }

  function setupHtml() {
    const first = !S.profile;
    const p = S.profile || { name: '', home: 'AUD', other: 'PHP', salary: '', freq: 'fortnight', last: ymd(today()), nth: 3, wd: 5 };
    const manual = !!(S.rate && S.rate.manual && S.profile && S.rate.pair === pairKey());
    const head = first
      ? `<div class="welcome"><div class="brand"><div class="logo" aria-hidden="true">${ICON.logo}</div>BudgetWise</div><h1>Set up your budget</h1><p>Takes a minute. Everything stays on this phone — no account, no login.</p></div>`
      : `<h1 class="page">Setup</h1>`;
    return `<div class="wrap narrow${first ? ' first' : ''}">
      ${head}
      <form class="setup" id="setup" novalidate>
        <label class="fld"><span>Your name</span><input class="inp" name="name" value="${esc(p.name)}" autocomplete="given-name" maxlength="40" required></label>
        <div class="fld">
          <div class="grid2">
            <label class="fld"><span>I live in</span><select class="inp" name="home">${currencyOptions(p.home)}</select></label>
            <label class="fld"><span>I also pay for</span><select class="inp" name="other">${currencyOptions(p.other)}</select></label>
          </div>
          <small>Your two lists and the exchange rate follow these.</small>
        </div>
        <label class="fld"><span>Salary each payday (after tax)</span>
          <span class="prefix"><span id="sal-sym">${esc(sym(p.home).trim())}</span><input name="salary" inputmode="decimal" value="${p.salary ? esc(Number(p.salary).toFixed(2)) : ''}" placeholder="0.00" autocomplete="off" required></span>
        </label>
        <fieldset class="fld" style="border:0;margin:0;padding:0">
          <legend class="lbl" style="padding:0;margin-bottom:6px">When does your salary arrive?</legend>
          <input type="hidden" name="freq" value="${p.freq}">
          <div class="grid2">${FREQS.map(([k, l, h]) => `<button type="button" class="opt" data-act="freq" data-freq="${k}" aria-pressed="${p.freq === k}"><span class="radio"></span><span><b>${l}</b><small>${h}</small></span></button>`).join('')}</div>
          <div class="box" id="custom-box" style="margin-top:4px">
            <span class="sub">Paid on the</span>
            <div class="grid2">
              <select class="inp" name="nth" aria-label="Which week">${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${+p.nth === n ? ' selected' : ''}>${NTH[n]}</option>`).join('')}</select>
              <select class="inp" name="wd" aria-label="Which day">${[1, 2, 3, 4, 5, 6, 0].map(n => `<option value="${n}"${+p.wd === n ? ' selected' : ''}>${DOW_LONG[n]}</option>`).join('')}</select>
            </div>
            <span class="sub">of every month</span>
          </div>
          <label class="fld" id="last-box" style="margin-top:6px"><span>Your last payday</span><input class="inp" type="date" name="last" value="${esc(p.last)}"></label>
        </fieldset>
        <div class="box"><span class="eyebrow">Your next paydays</span><div class="tiles" id="pay-tiles"></div></div>
        ${first ? '' : `<div class="box" id="rate-box">
          <label class="chk"><input type="checkbox" name="manual"${manual ? ' checked' : ''}> Use my own exchange rate</label>
          <div class="fld" id="manual-f"><span class="sub">e.g. your remittance centre's rate</span>
            <span class="prefix"><span id="rate-l">${esc(sym(p.home).trim())}1 =</span><input name="rate" inputmode="decimal" value="${manual ? esc(S.rate.value) : ''}" placeholder="${rateValue() ? esc(rateValue().toFixed(2)) : '0.00'}"></span></div>
          <span class="credit">Otherwise the market rate is checked automatically. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates by Exchange Rate API</a></span>
        </div>`}
        <p class="err" id="setup-err" hidden></p>
        <button class="btn" type="submit">${first ? 'Start my budget' : 'Save changes'}</button>
      </form>
      ${first ? '' : `<h2 class="section-t">Your data</h2>
      <div class="box">
        <span class="sub">Your budget lives only in this browser. Save a backup file now and then, so you can restore it on a new phone or if the browser is cleared.</span>
        <div class="btn-row">
          <button type="button" class="btn-ghost" data-act="backup">Save backup</button>
          <label class="btn-ghost" style="display:flex;align-items:center;cursor:pointer">Restore<input type="file" accept="application/json,.json" data-act="restore" hidden></label>
          <button type="button" class="btn-danger" data-act="reset">${confirmReset ? 'Tap again to delete everything' : 'Start over'}</button>
        </div>
      </div>`}
    </div>${first ? '' : navHtml()}`;
  }

  function readSetup() {
    const f = document.getElementById('setup');
    if (!f) return null;
    const v = n => f.elements[n] ? f.elements[n].value : '';
    return {
      name: v('name').trim(), home: v('home'), other: v('other'), salary: num(v('salary')),
      freq: v('freq'), last: v('last'), nth: +v('nth'), wd: +v('wd'),
      manual: f.elements.manual ? f.elements.manual.checked : false, rate: num(v('rate'))
    };
  }

  function syncSetup() {
    const p = readSetup();
    if (!p) return;
    document.querySelectorAll('[data-act="freq"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.freq === p.freq));
    document.getElementById('custom-box').hidden = p.freq !== 'custom';
    document.getElementById('last-box').hidden = p.freq === 'custom';
    document.getElementById('sal-sym').textContent = sym(p.home).trim();
    const rl = document.getElementById('rate-l');
    if (rl) rl.textContent = `${sym(p.home).trim()}1 =`;
    const mf = document.getElementById('manual-f');
    if (mf) mf.hidden = !p.manual;
    const rb = document.getElementById('rate-box');
    if (rb) rb.hidden = p.home === p.other;
    const tiles = document.getElementById('pay-tiles');
    if (p.freq !== 'custom' && !p.last) { tiles.innerHTML = '<span class="sub">Pick your last payday</span>'; return; }
    const t = today(), ds = paydays(addDays(t, 1), addDays(t, 400), p).slice(0, 3);
    tiles.innerHTML = ds.map(d => `<div class="tile"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b><span>${MON[d.getMonth()]} ${d.getFullYear()}</span></div>`).join('');
  }

  function submitSetup() {
    const p = readSetup(), err = document.getElementById('setup-err');
    const fail = m => { err.textContent = m; err.hidden = false; };
    if (!p.name) return fail('Please enter your name.');
    if (!(p.salary > 0)) return fail('Please enter your salary for each payday.');
    if (p.freq !== 'custom' && !p.last) return fail('Please pick your last payday.');
    if (p.manual && !(p.rate > 0)) return fail('Please enter your exchange rate, or untick "Use my own exchange rate".');
    const first = !S.profile, old = S.profile;
    S.profile = { name: p.name, home: p.home, other: p.other, salary: p.salary, freq: p.freq, last: p.last || ymd(today()), nth: p.nth, wd: p.wd };
    if (old) {
      for (const it of S.items) {
        if (it.cur === old.home) it.cur = p.home;
        else if (it.cur === old.other) it.cur = p.other;
        if (it.cur !== p.home && it.cur !== p.other) it.cur = it.list === 'home' ? p.home : p.other;
      }
    }
    if (p.manual) S.rate = { pair: pairKey(), value: p.rate, at: Date.now(), manual: true };
    else if (S.rate && (S.rate.manual || S.rate.pair !== pairKey())) S.rate = null;
    if (first) S.seen = monthKey(today());
    save();
    view = 'home';
    tab = 'other';
    render();
    window.scrollTo(0, 0);
    toast(first ? `Welcome, ${p.name}! Add your costs to see what you can save.` : 'Saved');
    refreshRate(false);
  }

  // ---------- cost editor ----------
  function openEditor(it, list) {
    const p = S.profile;
    draft = it ? Object.assign({}, it, { amt: String(it.amt), left: it.left ? String(it.left) : '' })
      : { id: null, list, name: '', amt: '', cur: list === 'home' ? p.home : p.other, rep: 'month', due: ymd(today()), left: '' };
    clearTimeout(toastTimer);
    $toast.hidden = true;
    renderEditor();
    const n = document.getElementById('d-name');
    if (n && !it) n.focus();
  }
  function closeEditor() { draft = null; $modal.innerHTML = ''; }

  function editorTexts() {
    const p = S.profile, d = draft, amt = num(d.amt), rate = rateValue();
    let conv = '';
    if (p.home !== p.other && amt > 0) {
      if (d.cur === p.home) conv = rate ? `≈ ${money(amt * rate, p.other)} in ${CUR[p.other].country}` : '';
      else conv = rate ? `≈ ${money(amt / rate, p.home)} at ${rate.toFixed(2)}` : 'No exchange rate yet';
    }
    const it = Object.assign({}, d, { amt, left: d.rep === 'once' ? 0 : Math.floor(num(d.left)), created: null });
    let next = '';
    if (d.due) {
      const nd = nextDue(it);
      next = nd ? `${dueDesc(it)} · due ${inDays(daysBetween(today(), nd))}` : d.rep === 'once' ? 'This date has passed' : 'All payments made';
    }
    let debt = '';
    const ds = d.due && isDebt(it) ? debtState(it) : null;
    if (ds) debt = ds.remaining ? `${ds.remaining} payment${ds.remaining === 1 ? '' : 's'} left · paid off ${MON[ds.end.getMonth()]} ${ds.end.getFullYear()} · ${money(ds.toGo, d.cur)} to go` : 'Paid off';
    return { conv, next, debt };
  }
  function updateEditorTexts() {
    const x = editorTexts();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('d-conv', x.conv); set('d-next', x.next); set('d-debt-t', x.debt);
  }

  function renderEditor() {
    const p = S.profile, d = draft, x = editorTexts();
    const listName = d.list === 'home' ? 'Local' : CUR[p.other].country;
    const debtOn = d.left !== '';
    const curs = p.home === p.other ? '' : `<div class="seg" role="group" aria-label="Currency">${[p.other, p.home].map(c => `<button type="button" data-act="cur" data-cur="${c}" aria-pressed="${d.cur === c}" aria-label="${esc(CUR[c].country)} currency">${esc(sym(c).trim())}</button>`).join('')}</div>`;
    $modal.innerHTML = `<div class="overlay" data-act="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
      <div class="dlg-head"><h2 id="dlg-t">${d.id ? 'Edit cost' : 'New cost'}</h2><span class="pill pill-${d.list}">${esc(listName)}</span></div>
      <label class="fld"><span>Name</span><input class="inp" id="d-name" value="${esc(d.name)}" placeholder="${d.list === 'home' ? 'e.g. Rent' : 'e.g. Family allowance'}" maxlength="60"></label>
      <div class="fld"><span>Amount each time</span>
        <div class="amt-row">${curs}<input class="inp num" id="d-amt" inputmode="decimal" value="${esc(d.amt)}" placeholder="0" style="text-align:right" aria-label="Amount"></div>
        <small id="d-conv">${esc(x.conv)}</small></div>
      <div class="fld"><span>Repeats</span><div class="chips">${REPEATS.map(([k, l]) => `<button type="button" class="chip" data-act="rep" data-rep="${k}" aria-pressed="${d.rep === k}">${l}</button>`).join('')}</div></div>
      <label class="fld"><span>${d.rep === 'once' ? 'Due on' : 'Next due'}</span><input class="inp" type="date" id="d-due" value="${esc(d.due)}"><small id="d-next" class="ok">${esc(x.next)}</small></label>
      ${d.rep === 'once' ? '' : `<div class="debt-box">
        <label class="chk"><input type="checkbox" id="d-debt"${debtOn ? ' checked' : ''}> Debt or loan — it ends</label>
        ${debtOn ? `<label class="inline"><span>Payments left, including the next one</span><input class="inp" id="d-left" inputmode="numeric" value="${esc(d.left)}"></label><small id="d-debt-t" class="debt-t">${esc(x.debt)}</small>` : ''}
      </div>`}
      <p class="err" id="d-err" hidden></p>
      <div class="dlg-actions">
        ${d.id ? '<button type="button" class="btn-danger" data-act="remove">Remove</button>' : ''}
        <button type="button" class="btn-ghost" data-act="cancel">Cancel</button>
        <button type="button" class="btn" data-act="save-item">Save</button>
      </div>
    </div></div>`;
  }

  function saveItem() {
    const d = draft, err = document.getElementById('d-err');
    const fail = m => { err.textContent = m; err.hidden = false; };
    const amt = num(d.amt), left = Math.floor(num(d.left));
    if (!d.name.trim()) return fail('Please give this cost a name.');
    if (!(amt > 0)) return fail('Please enter an amount.');
    if (!d.due) return fail('Please pick a due date.');
    if (d.left !== '' && d.rep !== 'once' && !(left > 0)) return fail('Please enter how many payments are left.');
    const item = {
      id: d.id || S.nextId++, list: d.list, name: d.name.trim(), amt, cur: d.cur, rep: d.rep, due: d.due,
      left: d.rep !== 'once' && d.left !== '' ? left : 0,
      created: d.created || ymd(new Date(Math.min(today(), parse(d.due))))
    };
    const i = S.items.findIndex(x => x.id === item.id);
    if (i >= 0) S.items[i] = item; else S.items.push(item);
    save();
    closeEditor();
    render();
    toast(i >= 0 ? 'Saved' : `Added ${item.name}`);
  }

  function removeItem() {
    const i = S.items.findIndex(x => x.id === draft.id);
    if (i < 0) return closeEditor();
    const [gone] = S.items.splice(i, 1);
    save();
    closeEditor();
    render();
    undo = { item: gone, index: i };
    toast(`Removed ${gone.name}`, { label: 'Undo', run: () => { S.items.splice(undo.index, 0, undo.item); save(); render(); } });
  }

  // ---------- backup ----------
  function backup() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budgetwise-backup-${ymd(today())}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Backup saved to your downloads');
  }
  function restore(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || s.v !== 1 || !s.profile || !Array.isArray(s.items)) throw new Error('bad');
        S = Object.assign(blank(), s);
        save();
        rollover();
        view = 'home';
        render();
        toast('Backup restored');
      } catch (e) { toast('That file is not a BudgetWise backup'); }
    };
    r.readAsText(file);
  }

  // ---------- events ----------
  $app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'nav') { view = b.dataset.view; confirmReset = false; render(); window.scrollTo(0, 0); }
    else if (act === 'tab') { tab = b.dataset.tab; render(); }
    else if (act === 'rate') refreshRate(true);
    else if (act === 'add') openEditor(null, b.dataset.list);
    else if (act === 'edit') { const it = S.items.find(x => x.id === +b.dataset.id); if (it) openEditor(it); }
    else if (act === 'month') { openMonth = openMonth === b.dataset.key && b.classList.contains('month-btn') ? '-' : b.dataset.key; render(); }
    else if (act === 'freq') { document.querySelector('#setup [name="freq"]').value = b.dataset.freq; syncSetup(); }
    else if (act === 'backup') backup();
    else if (act === 'reset') {
      if (!confirmReset) { confirmReset = true; render(); return; }
      try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
      S = blank(); confirmReset = false; view = 'setup'; render(); toast('Everything deleted');
    }
  });
  $app.addEventListener('input', e => { if (e.target.closest('#setup')) syncSetup(); });
  $app.addEventListener('change', e => {
    if (e.target.matches('[data-act="restore"]') && e.target.files[0]) restore(e.target.files[0]);
    else if (e.target.closest('#setup')) syncSetup();
  });
  $app.addEventListener('submit', e => { e.preventDefault(); submitSetup(); });

  $modal.addEventListener('click', e => {
    if (!draft) return;
    if (e.target.matches('[data-act="scrim"]')) return closeEditor();
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'cancel') closeEditor();
    else if (act === 'save-item') saveItem();
    else if (act === 'remove') removeItem();
    else if (act === 'cur') { draft.cur = b.dataset.cur; renderEditor(); }
    else if (act === 'rep') { draft.rep = b.dataset.rep; renderEditor(); }
  });
  $modal.addEventListener('input', e => {
    if (!draft) return;
    const id = e.target.id;
    if (id === 'd-name') draft.name = e.target.value;
    else if (id === 'd-amt') draft.amt = e.target.value;
    else if (id === 'd-due') draft.due = e.target.value;
    else if (id === 'd-left') draft.left = e.target.value.replace(/[^0-9]/g, '');
    updateEditorTexts();
  });
  $modal.addEventListener('change', e => {
    if (!draft) return;
    if (e.target.id === 'd-due') { draft.due = e.target.value; updateEditorTexts(); }
    if (e.target.id === 'd-debt') {
      draft.left = e.target.checked ? '12' : '';
      renderEditor();
      const l = document.getElementById('d-left');
      if (l) l.focus();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && draft) closeEditor(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !S.profile) return;
    rollover();
    if (!draft && view !== 'setup') render();
    refreshRate(false);
  });

  // ---------- start ----------
  rollover();
  render();
  refreshRate(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
