(() => {
  const C = window.CAMP;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('tagged.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tagged.' + k, JSON.stringify(v)); } catch {} },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith('tagged.')).forEach(k => localStorage.removeItem(k)); } catch {} },
  };

  // ---------- fake roster (prototype only) ----------
  const FIRST = ['Ava','Noah','Mia','Liam','Zoe','Ethan','Ruby','Jack','Ella','Lucas','Grace','Mason','Lily','Caleb','Hannah','Isaac','Sophie','Josh','Chloe','Nate','Eden','Levi','Tessa','Micah','Kayla','Elijah','Jade','Sam','Ivy','Declan','Maya','Owen','Leah','Eli','Skye','Ben','Rosie','Theo','Abby','Jonah'];
  const LAST = 'ABCDEFGHJKLMNOPRSTW'.split('');
  const players = Array.from({ length: 280 }, (_, i) => ({
    id: i,
    name: `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 11) % LAST.length]}.`,
    team: C.teams[i % C.teams.length].id,
  }));
  const team = id => C.teams.find(t => t.id === id) || C.teams[0];

  // ---------- state ----------
  const state = {
    tab: 'home',
    day: null,
    me: LS.get('me', null),
    demo: LS.get('demo', { on: true, day: 1, min: 10 * 60 + 30 }),
    game: LS.get('game', { out: players.filter(p => p.id % 5 === 0).map(p => p.id), cursor: 3, tags: 0, eliminated: false, feed: [] }),
    done: LS.get('done', []),
    bonus: LS.get('bonus', {}),
    inbox: LS.get('inbox', [
      { t: 'Welcome to TAGGED', b: 'Turn on notifications so you never miss a worship or a twist.', w: 'Thu 12:30' },
    ]),
    unread: LS.get('unread', 1),
    tipDismissed: LS.get('tip', false),
  };
  const save = () => { LS.set('game', state.game); LS.set('done', state.done); LS.set('bonus', state.bonus); LS.set('inbox', state.inbox); LS.set('unread', state.unread); LS.set('demo', state.demo); };

  // ---------- time ----------
  const fmt = m => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; return `${((h + 11) % 12) + 1}:${mm} ${ap}`; };
  const fmtShort = m => fmt(m).replace(':00', '');
  function now() {
    if (state.demo.on) return { day: state.demo.day, min: state.demo.min, demo: true };
    const d = new Date(); const map = { 4: 0, 5: 1, 6: 2, 0: 3, 1: 4 }; const day = map[d.getDay()];
    return { day: day === undefined ? null : day, min: d.getHours() * 60 + d.getMinutes(), demo: false };
  }
  const dayEvents = d => C.events.filter(e => e.day === d).sort((a, b) => a.s - b.s);
  function currentEvent(n) { return n.day == null ? null : dayEvents(n.day).find(e => n.min >= e.s && n.min < e.e) || null; }
  function nextEvent(n) {
    if (n.day == null) return C.events[0];
    const later = dayEvents(n.day).find(e => e.s > n.min);
    if (later) return later;
    for (let d = n.day + 1; d < C.days.length; d++) { const e = dayEvents(d)[0]; if (e) return e; }
    return null;
  }
  function gameStatus(n) {
    if (state.game.eliminated) return { live: false, why: 'You are out of the chain' };
    if (n.day == null) return { live: false, why: 'Game starts when camp does' };
    if (n.day === 0 && n.min < 17 * 60) return { live: false, why: 'Chains are assigned after check-in' };
    if (n.min < 7 * 60 || n.min >= 22 * 60) return { live: false, why: 'Lights out. Sleep is sacred' };
    if (n.day === 4 && n.min >= 10 * 60) return { live: false, why: 'The game is over. Pass it on' };
    const ev = currentEvent(n);
    if (ev && !C.types[ev.type].game) return { live: false, why: `Paused for ${ev.title}` };
    return { live: true, why: 'Tagging is live' };
  }

  // ---------- game ----------
  const alive = () => players.filter(p => !state.game.out.includes(p.id) && p.id !== 9999);
  function target() {
    if (!state.me) return null;
    const pool = alive().filter(p => p.team !== state.me.team);
    if (!pool.length) return null;
    return pool[state.game.cursor % pool.length];
  }
  function survivors() { return 280 - state.game.out.length; }
  const ago = i => ['12 min ago', '38 min ago', '1 hr ago', '2 hr ago', '3 hr ago'][i] || 'earlier';
  function feedItems() {
    const seeded = state.game.out.slice(-5).reverse().map((id, i) => ({ t: ago(i + (state.game.feed.length ? 1 : 0)), txt: `${players[id].name} (${team(players[id].team).name}) has fallen` }));
    return [...state.game.feed, ...seeded].slice(0, 8);
  }

  // ---------- notifications ----------
  function notify(title, body) {
    const n = now();
    state.inbox.unshift({ t: title, b: body, w: n.day == null ? 'now' : `${C.days[n.day].short} ${fmtShort(n.min)}` });
    state.inbox = state.inbox.slice(0, 30);
    state.unread++; save();
    toast(title, body); renderTop();
    try {
      if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icon.svg', badge: 'icon.svg', tag: 'tagged' }));
      }
    } catch {}
  }
  let toastTimer;
  function toast(title, body) {
    const el = $('#toast'); el.innerHTML = `<b>${esc(title)}</b>${body ? esc(body) : ''}`;
    el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
  }
  const notifState = () => !('Notification' in window) ? 'unsupported' : Notification.permission;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  // ---------- views ----------
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    game: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.2c2.6 0 4.5 1.8 4.5 4.6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  function renderTop() {
    $('#top').innerHTML = state.me ? `
      <div class="logo">TAGGED</div>
      <div class="top-actions">
        <button class="chip" id="demoBtn" aria-label="Demo controls">${state.demo.on ? '⏱ DEMO' : '⏱'}</button>
        <button class="chip" id="bellBtn" aria-label="Notifications">${svg('bell').replace('<svg', '<svg width="20" height="20" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2"')}${state.unread ? '<span class="dot"></span>' : ''}</button>
      </div>` : '<div></div>';
    const d = $('#demoBtn'), b = $('#bellBtn');
    if (d) d.onclick = openDemo; if (b) b.onclick = openInbox;
  }
  function renderTabs() {
    if (!state.me) { $('#tabs').innerHTML = ''; return; }
    const items = [['home', 'Home'], ['schedule', 'Schedule'], ['game', 'Game'], ['team', 'Team']];
    $('#tabs').innerHTML = `<div class="inner">${items.map(([k, l]) => `<button class="tab" data-tab="${k}" ${state.tab === k ? 'aria-current="page"' : ''}>${svg(k)}${l}</button>`).join('')}</div>`;
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); window.scrollTo(0, 0); });
  }

  function evCard(e, opts = {}) {
    const ty = C.types[e.type];
    return `<div class="ev ${e.type === 'worship' ? 'worship' : ''} ${opts.now ? 'nowev' : ''}" style="--c:${ty.color}">
      <div class="time">${fmtShort(e.s)}<small>${fmtShort(e.e)}</small></div>
      <div class="body">
        <span class="pill" style="color:${ty.color}">${opts.now ? '<i class="dotlive"></i> Now · ' : ''}${ty.label}</span>
        <h3>${esc(e.title)}${e.tbc ? '<span class="tbc">TIME TBC</span>' : ''}</h3>
        ${e.place ? `<div class="meta">${esc(e.place)}</div>` : ''}
        ${!ty.game ? '<div class="nogame">Tag game paused</div>' : ''}
      </div></div>`;
  }

  function viewOnboard() {
    const picked = state._pick || null;
    return `<div class="hero">
        <div class="logo">TAGGED</div>
        <p class="h-tag" style="margin-top:20px">You've been called. Now pass it on.</p>
        <p>Schedule, worships, the tag game and your team, all in one place.</p>
      </div>
      <div class="field"><label for="nm">Your first name</label><input id="nm" class="input" autocomplete="given-name" maxlength="18" placeholder="e.g. Sam" value="${esc(state._name || '')}"></div>
      <div class="field"><label>Your team colour</label>
        <div class="swatches">${C.teams.map(t => `<button class="swatch" style="--c:${t.color}" data-t="${t.id}" aria-pressed="${picked === t.id}">${t.name}</button>`).join('')}</div>
        <p class="mut" style="margin-top:10px;font-size:14px">In the real thing, your team comes pre-loaded from the roster. Scan the code on your wristband.</p>
      </div>
      <div class="field"><button class="btn" id="go" ${picked ? '' : 'disabled'}>Get tagged</button></div>`;
  }

  function viewHome() {
    const n = now(), cur = currentEvent(n), nxt = nextEvent(n), gs = gameStatus(n), tm = team(state.me.team);
    const prog = cur ? Math.round(((n.min - cur.s) / (cur.e - cur.s)) * 100) : 0;
    const dayTxt = n.day == null ? 'Camp starts Thu 25 Mar' : `${C.days[n.day].long} ${C.days[n.day].date}`;
    const ns = notifState();
    const needTip = !state.tipDismissed && !standalone();
    return `
      <p class="eyebrow">${esc(dayTxt)}</p>
      <h1 class="h-tag" style="margin-top:4px">Yo, ${esc(state.me.name)}.</h1>
      <div class="row" style="margin-top:6px"><span class="sw" style="--c:${tm.color}"></span><span class="eyebrow" style="color:var(--ink)">Team ${tm.name}</span></div>

      <section>
        <div class="sticker now tilt-l" style="--team:${cur ? C.types[cur.type].color : '#9a968c'}">
          ${cur ? `<span class="pill" style="color:${C.types[cur.type].color}"><i class="dotlive"></i> Happening now</span>
          <div class="big">${esc(cur.title)}</div>
          <div class="mut">${fmtShort(cur.s)} – ${fmtShort(cur.e)}${cur.place ? ' · ' + esc(cur.place) : ''}</div>
          <div class="bar" style="--c:${C.types[cur.type].color}"><i style="width:${prog}%"></i></div>`
          : `<span class="pill mut">Nothing scheduled</span><div class="big">Breathe. Hydrate.</div><div class="mut">Check what's next below.</div>`}
          ${nxt ? `<div class="nextrow"><div><div class="eyebrow">Up next</div><div style="font-weight:600;font-size:17px;margin-top:2px">${esc(nxt.title)}</div></div><div style="text-align:right"><div class="eyebrow">${n.day != null && nxt.day !== n.day ? C.days[nxt.day].short : 'Today'}</div><div style="font-family:var(--label);font-weight:700;font-size:20px">${fmtShort(nxt.s)}</div></div></div>` : ''}
        </div>
      </section>

      <section>
        <button class="card" id="goGame" style="width:100%;text-align:left;border-color:${gs.live ? 'var(--lime)' : 'var(--line)'}">
          <div class="row" style="justify-content:space-between">
            <div><span class="pill" style="color:${gs.live ? 'var(--lime)' : 'var(--mut)'}">${gs.live ? '<i class="dotlive"></i> Live' : 'Paused'}</span>
            <div style="font-family:var(--label);font-weight:700;font-size:20px;letter-spacing:.04em;margin-top:6px">${esc(gs.why)}</div>
            <div class="mut" style="font-size:14px">${survivors()} survivors left · ${state.game.tags} tags by you</div></div>
            <span style="font-family:var(--display);font-size:28px">→</span>
          </div>
        </button>
      </section>

      ${ns === 'default' || (ns === 'unsupported' && isIOS()) ? `<section><div class="card"><div class="eyebrow">Don't miss a thing</div>
        <p style="margin:6px 0 12px">${ns === 'unsupported' ? 'On iPhone: tap Share, then <b>Add to Home Screen</b>, then open TAGGED from your home screen to switch on notifications.' : 'Get a buzz before worship, twists and when the cannon fires.'}</p>
        ${ns === 'default' ? '<button class="btn lime sm" id="enableN">Turn on notifications</button>' : ''}</div></section>` : ''}
      ${ns === 'denied' ? `<section><div class="card"><div class="eyebrow">Notifications are blocked</div><p class="mut" style="margin-top:6px">Allow them for this app in your phone's settings.</p></div></section>` : ''}

      ${needTip && ns !== 'unsupported' ? `<section><div class="card"><div class="eyebrow">Tip</div><p style="margin:6px 0 10px">Install TAGGED on your home screen so it opens like a normal app and works with no signal.</p><button class="linkbtn" id="dismissTip">Got it</button></div></section>` : ''}

      <section>
        <div class="sec-title"><h2>Today's twist</h2></div>
        <div class="banner" style="--c:${tm.color}"><span style="font-size:20px">⚡</span><span>${esc(C.twists[n.day == null ? 0 : n.day])}</span></div>
      </section>

      <section>
        <div class="sec-title"><h2>Announcements</h2></div>
        ${C.announcements.map(a => `<div class="card" style="margin-bottom:10px"><div class="eyebrow">${esc(a.when)}</div><p style="margin-top:4px">${esc(a.text)}</p></div>`).join('')}
      </section>`;
  }

  function viewSchedule() {
    const n = now(); const d = state.day ?? (n.day ?? 0);
    const cur = currentEvent(n);
    const evs = dayEvents(d);
    return `
      <h1 class="h-tag">The plan</h1>
      <p class="mut" style="margin:4px 0 14px">Times follow last year's sheet. Anything marked <span class="tbc" style="margin:0">TIME TBC</span> is a placeholder.</p>
      <div class="daytabs" role="tablist">${C.days.map(x => `<button class="day ${x.id === d ? 'on' : ''}" data-d="${x.id}" role="tab" aria-selected="${x.id === d}">${x.short}<small>${x.date}</small></button>`).join('')}</div>
      ${evs.map(e => evCard(e, { now: cur === e && n.day === d })).join('')}
      <p class="mut" style="text-align:center;margin-top:6px;font-size:14px">Discussion time slots will be added once confirmed.</p>`;
  }

  function viewGame() {
    const n = now(), gs = gameStatus(n), tg = target(), tm = team(state.me.team);
    const twist = C.twists[n.day == null ? 0 : n.day];
    const out = state.game.eliminated;
    return `
      <h1 class="h-tag">The Game</h1>
      <p class="mut" style="margin:4px 0 14px">Tag your target without anyone seeing. Tag them and you inherit their target. Last one standing wins.</p>
      <div class="banner" style="--c:${gs.live ? 'var(--lime)' : '#9a968c'}"><i class="dotlive"></i><span>${gs.live ? 'Live' : 'Paused'} · ${esc(gs.why)}</span></div>

      <section>
        ${out ? `<div class="sticker ghost-card tilt-l" style="--team:#9a968c"><div class="stencil" style="color:#9a968c">Eliminated</div>
          <div class="target-name">You're a gamemaker now</div>
          <p class="mut" style="margin-top:8px">You can still earn points for your team with missions, and help revive fallen tributes in challenges.</p>
          <div style="margin-top:16px"><button class="btn ghost" id="revive">Demo: bring me back</button></div></div>`
        : tg ? `<div class="sticker arena tilt-l splat" id="targetCard">
          <div class="stencil">Your target</div>
          <div class="target-name">${esc(tg.name)}</div>
          <div class="target-team"><span class="sw" style="--c:${team(tg.team).color}"></span>Team ${team(tg.team).name}</div>
          <p class="mut" style="margin:14px 0 18px;font-size:14px">Keep it secret. Only tag when nobody else sees you.</p>
          <button class="btn" id="tagBtn" ${gs.live ? '' : 'disabled'}>I tagged them</button>
          <div style="margin-top:10px"><button class="linkbtn" id="gotTagged">I just got tagged</button></div>
        </div>` : `<div class="card">No targets left. You win!</div>`}
      </section>

      <section><div class="stats">
        <div class="stat"><b>${survivors()}</b><span>Survivors</span></div>
        <div class="stat"><b>${state.game.tags}</b><span>Your tags</span></div>
        <div class="stat"><b style="color:${tm.color}">${state.game.out.length}</b><span>Fallen</span></div>
      </div></section>

      <section><div class="sec-title"><h2>Today's twist</h2></div>
        <div class="banner" style="--c:${tm.color}"><span style="font-size:20px">⚡</span><span>${esc(twist)}</span></div></section>

      <section><div class="sec-title"><h2>The cannon</h2><span class="eyebrow">Fallen tributes</span></div>
        <div class="card"><ul class="feed">${feedItems().map(f => `<li><span class="t">${esc(f.t)}</span><span>💥 ${esc(f.txt)}</span></li>`).join('')}</ul></div></section>

      <section><button class="linkbtn" id="rules" style="width:100%">How the game works and safety rules</button></section>`;
  }

  function teamPoints() {
    return C.teams.map(t => ({ ...t, total: t.pts + (state.bonus[t.id] || 0) })).sort((a, b) => b.total - a.total);
  }
  function viewTeam() {
    const tm = team(state.me.team), lb = teamPoints(), max = lb[0].total || 1;
    const mine = state.done.length;
    return `
      <h1 class="h-tag">Team ${tm.name}</h1>
      <p class="mut" style="margin:4px 0 14px">${players.filter(p => p.team === tm.id).length} people · your discussion group and your crew all weekend.</p>

      <section><div class="sec-title"><h2>Leaderboard</h2><span class="eyebrow">Points</span></div>
        <div class="lb">${lb.map((t, i) => `<div class="lbrow ${t.id === tm.id ? 'me' : ''}" style="--c:${t.color}"><span class="rank">${i + 1}</span><div><div class="nm"><span class="sw" style="--c:${t.color}"></span>${t.name}${t.id === tm.id ? ' · you' : ''}</div><div class="track"><i style="width:${Math.round(t.total / max * 100)}%"></i></div></div><span class="pts">${t.total}</span></div>`).join('')}</div></section>

      <section><div class="sec-title"><h2>Pass it on</h2><span class="eyebrow">${mine}/${C.missions.length} done</span></div>
        ${C.missions.map(m => { const d = state.done.includes(m.id); return `<div class="mission ${d ? 'done' : ''}" data-m="${m.id}"><button class="check" aria-label="${d ? 'Done' : 'Mark done'}">${d ? '✓' : ''}</button><div style="flex:1"><h3>${esc(m.title)}</h3><p>${esc(m.body)}</p><span class="pill" style="color:var(--lime);margin-top:8px">+${m.pts} pts for ${tm.name}</span></div></div>`; }).join('')}
      </section>`;
  }

  function render() {
    renderTop(); renderTabs();
    const v = $('#view');
    if (!state.me) { v.innerHTML = viewOnboard(); bindOnboard(); return; }
    document.documentElement.style.setProperty('--team', team(state.me.team).color);
    v.innerHTML = { home: viewHome, schedule: viewSchedule, game: viewGame, team: viewTeam }[state.tab]();
    bindView();
  }

  // ---------- bindings ----------
  function bindOnboard() {
    const nm = $('#nm'), go = $('#go');
    const sync = () => { go.disabled = !(state._pick && nm.value.trim()); };
    nm.oninput = () => { state._name = nm.value; sync(); };
    document.querySelectorAll('.swatch').forEach(b => b.onclick = () => {
      state._pick = b.dataset.t;
      document.documentElement.style.setProperty('--team', team(state._pick).color);
      document.querySelectorAll('.swatch').forEach(x => x.setAttribute('aria-pressed', x === b));
      sync();
    });
    go.onclick = () => { state.me = { name: nm.value.trim(), team: state._pick }; LS.set('me', state.me); state.tab = 'home'; render(); toast('You are in', `Welcome to Team ${team(state.me.team).name}.`); };
    sync();
  }

  function bindView() {
    const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
    on('#goGame', () => { state.tab = 'game'; render(); window.scrollTo(0, 0); });
    on('#dismissTip', () => { state.tipDismissed = true; LS.set('tip', true); render(); });
    on('#enableN', async () => {
      try { const r = await Notification.requestPermission(); if (r === 'granted') notify('Notifications on', 'You will get a buzz for worships, twists and the cannon.'); } catch {}
      render();
    });
    document.querySelectorAll('.day').forEach(b => b.onclick = () => { state.day = +b.dataset.d; render(); });
    on('#rules', openRules);
    on('#revive', () => { state.game.eliminated = false; save(); render(); });
    on('#gotTagged', () => confirmSheet('Got tagged?', 'Your tagger will be told and your team keeps earning points through missions. This takes you out of the chain.', 'Yes, I was tagged', () => {
      state.game.eliminated = true; state.game.feed.unshift({ t: 'just now', txt: `${state.me.name} (${team(state.me.team).name}) has fallen` }); save(); closeSheet(); notify('💥 Cannon fired', 'You have been tagged. You are a gamemaker now.'); render();
    }));
    on('#tagBtn', () => {
      const tg = target(); if (!tg) return;
      confirmSheet(`Tag ${tg.name}?`, 'Only confirm if you really got them without being seen. They will be asked to confirm too. Disputes go to a leader.', 'Yes, I got them', () => {
        state.game.out.push(tg.id); state.game.tags++; state.game.cursor++;
        state.bonus[state.me.team] = (state.bonus[state.me.team] || 0) + 5;
        state.game.feed.unshift({ t: 'just now', txt: `${tg.name} (${team(tg.team).name}) was tagged by ${state.me.name}` });
        save(); closeSheet(); notify('💥 Cannon fired', `${tg.name} has fallen. +5 pts for ${team(state.me.team).name}. New target assigned.`); render();
      });
    });
    document.querySelectorAll('.mission .check').forEach(b => b.onclick = () => {
      const id = b.closest('.mission').dataset.m, m = C.missions.find(x => x.id === id);
      if (state.done.includes(id)) { state.done = state.done.filter(x => x !== id); state.bonus[state.me.team] = (state.bonus[state.me.team] || 0) - m.pts; }
      else { state.done.push(id); state.bonus[state.me.team] = (state.bonus[state.me.team] || 0) + m.pts; toast('Passed on', `+${m.pts} pts for ${team(state.me.team).name}`); }
      save(); render();
    });
  }

  // ---------- sheets ----------
  function openSheet(html) { const s = $('#sheet'); s.innerHTML = `<div class="panel" role="dialog" aria-modal="true">${html}</div>`; s.hidden = false; s.onclick = e => { if (e.target === s) closeSheet(); }; }
  function closeSheet() { $('#sheet').hidden = true; }
  function confirmSheet(title, body, yes, fn) {
    openSheet(`<h2>${esc(title)}</h2><p class="mut" style="margin-bottom:16px">${esc(body)}</p><div class="stack"><button class="btn" id="yes">${esc(yes)}</button><button class="btn ghost" id="no">Cancel</button></div>`);
    $('#yes').onclick = fn; $('#no').onclick = closeSheet;
  }
  function openInbox() {
    state.unread = 0; save(); renderTop();
    openSheet(`<h2>Notifications</h2>${state.inbox.map(x => `<div class="notif"><b>${esc(x.t)}</b><p>${esc(x.b)}</p><p style="font-size:12px">${esc(x.w)}</p></div>`).join('') || '<p class="mut">Nothing yet.</p>'}<div style="margin-top:16px"><button class="btn ghost" id="x">Close</button></div>`);
    $('#x').onclick = closeSheet;
  }
  function openRules() {
    openSheet(`<h2>How it works</h2><div class="stack" style="line-height:1.45">
      <p><b>1.</b> Everyone gets a secret target from another team.</p>
      <p><b>2.</b> Tag them without anyone else seeing. Tap <b>I tagged them</b> and they confirm.</p>
      <p><b>3.</b> You inherit their target. The chain gets shorter all weekend.</p>
      <p><b>4.</b> Last one standing is crowned at Worship #6.</p>
      <h2 style="margin-top:14px;font-size:22px">Safety rules</h2>
      <p>No tagging in cabins, bathrooms, or after lights out.</p>
      <p>Game pauses during worship, devotionals, meals and the offsite day.</p>
      <p>Gentle taps only. No running into people, no tackling, no leaving camp bounds.</p>
      <p>Leaders can pause the game any time. Their word is final.</p>
      <button class="btn" id="x" style="margin-top:8px">Got it</button></div>`);
    $('#x').onclick = closeSheet;
  }
  function openDemo() {
    const d = state.demo;
    openSheet(`<h2>Demo controls</h2><p class="mut" style="margin-bottom:12px">For the prototype only: jump to any moment of the weekend.</p>
      <div class="stack">
        <label class="eyebrow" for="dd">Day</label>
        <select id="dd" class="input">${C.days.map(x => `<option value="${x.id}" ${x.id === d.day ? 'selected' : ''}>${x.long} ${x.date}</option>`).join('')}</select>
        <label class="eyebrow" for="dt">Time: <b id="dtl" style="color:var(--ink)">${fmt(d.min)}</b></label>
        <input id="dt" class="range" type="range" min="420" max="1380" step="15" value="${d.min}">
        <button class="btn lime sm" id="usedemo" style="display:${d.on ? 'none' : 'inline-block'}">Use demo time</button>
        <button class="btn ghost" id="real">${d.on ? 'Switch to real clock' : 'Using real clock'}</button>
        <button class="btn ghost" id="test">Send a test notification</button>
        <button class="btn ghost" id="reset">Reset everything</button>
        <button class="btn" id="x">Done</button>
      </div>`);
    const apply = () => { state.demo = { on: true, day: +$('#dd').value, min: +$('#dt').value }; $('#dtl').textContent = fmt(state.demo.min); save(); render(); renderTop(); };
    $('#dd').onchange = apply; $('#dt').oninput = apply;
    $('#real').onclick = () => { state.demo.on = !state.demo.on; save(); closeSheet(); render(); };
    $('#usedemo').onclick = () => { state.demo.on = true; save(); closeSheet(); render(); };
    $('#test').onclick = () => { closeSheet(); notify('⛪ Worship in 10 minutes', 'Head to the main hall with your team.'); };
    $('#reset').onclick = () => { LS.clear(); location.reload(); };
    $('#x').onclick = closeSheet;
  }

  // ---------- boot ----------
  render();
  setInterval(() => { if (!$('#sheet').hidden || state.tab === 'schedule' && false) return; if (state.me && !state.demo.on) render(); }, 60000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
