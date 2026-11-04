<script>
(() => {
  const ME = 'Kyros';
  const SEATS = {
    Damon: { c: '#2f5d9e', b: 'Δ' }, Nikos: { c: '#2b2420', b: 'Ν' },
    Theron: { c: '#7c4d79', b: 'Θ' }, Kyros: { c: '#a83226', b: 'Κ' },
  };
  const ORDER = ['Damon', 'Nikos', 'Theron', 'Kyros'];
  const BY_SEAL = { 'Δ': 'Damon', 'Ν': 'Nikos', 'Θ': 'Theron', 'Κ': 'Kyros' };
  const CAPITAL = { '-5,0': 'Kyros', '-5,6': 'Nikos', '2,1': 'Theron', '4,-3': 'Damon' };
  const STOCK = { wood: 1, stone: 1, food: 0, gold: 2, influence: 9 };
  // building prices as the live build shows them: Harbour Dues (a standing Law) moves Marketplace and Port
  const BUILD = {
    Estate: { icon: 'buildings/estate', fx: 'Each slave here makes 2; not on a hill', cost: { wood: 4 }, cls: 'Slaves' },
    Marketplace: { icon: 'buildings/marketplace', fx: 'Each freeman here makes 2 gold', cost: { wood: 3, gold: 4 }, cls: 'Freemen', law: 'Harbour Dues: base 3 wood, 2 gold' },
    Forum: { icon: 'buildings/forum', fx: 'Each citizen here makes 2 influence', cost: { stone: 3 }, cls: 'Citizens' },
    Temple: { icon: 'buildings/temple', fx: '+1 happiness', cost: { stone: 3 }, cls: 'Civic' },
    Granary: { icon: 'buildings/granary', fx: '+2 food income', cost: { wood: 4 }, cls: 'Civic' },
    Port: { icon: 'buildings/port', fx: 'Claims one adjacent luxury good; needs the coast', cost: { stone: 2 }, cls: 'Civic', law: 'Harbour Dues: base 4 gold, 2 stone' },
  };
  const PORT_AT = { GORTYN: 'Tyrian Dye' }; // the only settlement of Kyros's beside a free good (the alarm says so)
  // what each seat's tooltip says in the live build
  const SEAT_INFO = {
    Damon: { slaves: 5, freemen: 2, citizens: 4, cities: 2, colonies: 3, happy: '+2', laws: 2, votes: 5, voice: 'held', dev: 0, ideas: ['Public Dole'] },
    Nikos: { slaves: 7, freemen: 0, citizens: 6, cities: 3, colonies: 3, happy: '+4', laws: 0, votes: 7, voice: 'unheld', dev: 0, ideas: ['Civic Tradition', 'Good Harvest'] },
    Theron: { slaves: 8, freemen: 7, citizens: 5, cities: 2, colonies: 3, happy: '−2', laws: 0, votes: 6, voice: 'unheld', dev: 1, ideas: ['City Pioneers', 'New Settlers'] },
    Kyros: { slaves: 6, freemen: 1, citizens: 3, cities: 2, colonies: 4, happy: '−2', laws: 0, votes: 4, voice: 'unheld', dev: 0, ideas: ['Frontier Charter'] },
  };
  const TITLES = [
    { n: 'Polis Builder', icon: 'victory/polis-builder', v: [2, 3, 2, 2], rule: 'most cities standing, min 3', held: 'Nikos' },
    { n: 'Demos', icon: 'victory/demos', v: [11, 13, 20, 10], rule: 'most total pops, min 14', held: 'Theron' },
    { n: 'Civic Elite', icon: 'victory/civic-elite', v: [4, 6, 5, 3], rule: 'most citizens, min 5', held: 'Nikos' },
    { n: 'Treasurer', icon: 'victory/treasurer', v: [1, 2, 16, 2], rule: 'largest gold stock, min 30', held: null, lead: 'Theron leads, short of 30' },
    { n: 'Beloved of the People', icon: 'victory/beloved', v: [2, 4, -2, -2], rule: 'highest happiness, min 4', held: 'Nikos' },
    { n: 'Voice of the Assembly', icon: 'victory/voice', v: [2, 0, 0, 0], rule: 'most standing Laws authored, min 2', held: 'Damon' },
  ];
  const IDEAS = [
    ['Good Harvest', '+2 food at each year’s income', 'Nikos'], ['Public Dole', 'Your Dole buys 1 food for 2 influence', 'Damon'],
    ['Urban Planning', 'Each of your cities has one extra work slot', null], ['Civic Tradition', '+2 influence at each year’s income', 'Nikos'],
    ['Frontier Charter', 'You have one extra colony piece', 'Kyros'], ['New Settlers', 'When taken, add one slave or freeman to a settlement with room', 'Theron'],
    ['City Pioneers', 'Upgrading a colony adds one freeman to that city if it has room', 'Theron'], ['Slave Colonies', 'When you found a colony, add one slave there, as room allows', null],
    ['Harbour Planning', 'Your Ports take no work slot', null], ['Treasury Grant', 'When taken, gain 4 gold', null],
    ['Assembly Brokers', 'You may buy a third vote at each Assembly', null],
  ];
  const ORATORS = [
    ['Demosthenes', 'agricultural reformer', [0, 0, 0, 0], 'no stele'], ['Perdiccas', 'urban planner', [0, 0, 0, 0], 'no stele'],
    ['Kleistophenes', 'rural expansionist', [2, 0, 0, 0], 'patron Damon', 0], ['Stratokles', 'cunning populist', [0, 2, 2, 0], 'monuments, split, no patron'],
  ];
  const COSTS = [
    ['Expand', null, [['settlements/found', 'Found a colony', { wood: 4, food: 1 }], ['settlements/upgrade', 'Upgrade to a city', { wood: 3, stone: 3 }], ['pops/slaves', 'Grow a slave', { food: 2 }], ['pops/freemen', 'Grow a freeman', { food: 3 }], ['pops/move', 'Move a pop', { food: 1 }]]],
    ['Build', 'city or capital · one of each', Object.entries(BUILD).map(([n, b]) => [b.icon, n, b.cost, b.law])],
    ['Civic', null, [['pops/promote', 'Slave to freeman', { food: 2 }], ['pops/promote', 'Freeman to citizen', { gold: 2 }], ['pops/demote', 'Demote one step', { influence: 1 }], ['unrest/calm-verb', 'Civic calm', [{ influence: 2 }, { gold: 2 }]], ['unrest/bread-dole', 'The Dole', { influence: 3 }], ['events/convoy', 'Buy a card', { gold: 2 }], ['assembly/national-idea', 'Buy an Idea', { influence: 6 }]]],
    ['Assembly', 'at a sitting', [['assembly/propose', 'Draw and propose', { influence: 2 }], ['assembly/repeal', 'Propose a repeal', { influence: 3 }], ['assembly/vote', 'Buy a vote', [{ gold: 2 }, { influence: 2 }]]]],
  ];
  const CODEX = /*CODEX*/[];
  const CHRON = /*CHRON*/[];
  /*TILES*/
  const SETTLE = /^([A-Z]+), (\w+)'s (city|colony): (\d+) pops?(?: \(([^)]*)\))?, (\d+) built, (\d+) worked, (\d+) open$/;
  for (const t of TILES) {
    const parts = t.label.split('; ');
    const head = parts[0].match(/^Hex (-?\d+,-?\d+), (\w+) tile, (\d+) slots?(?: for (\w+))?/);
    t.terrain = head[2]; t.slots = +head[3]; t.res = head[4] || null;
    t.towns = [];
    for (const p of parts.slice(1)) {
      const m = p.match(SETTLE);
      if (m) {
        const pops = { citizens: 0, freemen: 0, slaves: 0 };
        (m[5] || '').split(', ').filter(Boolean).forEach(s => {
          const [n, w] = s.split(' ');
          pops[w.startsWith('citizen') ? 'citizens' : w.startsWith('free') ? 'freemen' : 'slaves'] = +n;
        });
        t.towns.push({ name: m[1], owner: m[2], kind: m[3], total: +m[4], pops, built: +m[6], worked: +m[7], open: +m[8], blds: [], port: null, notes: [] });
      } else if (t.towns.length) {
        const town = t.towns[t.towns.length - 1];
        if (/on the way/.test(p)) town.notes.push(p);
        else p.split(', ').forEach(b => {
          const pm = b.match(/^Port holding (.+)$/);
          if (pm) { town.blds.push('Port'); town.port = pm[1]; } else town.blds.push(b);
        });
      }
    }
    if (CAPITAL[t.id] && t.towns[0]) t.towns[0].capital = true;
  }
  const byId = Object.fromEntries(TILES.map(t => [t.id, t]));
  const MY = TILES.flatMap(t => t.towns.filter(w => w.owner === ME).map(w => ({ t, w })));

  // what a settlement makes a turn (engine rules: a worked slave 1 of the land, a citizen 1 influence
  // and −1 food, a freeman 1 gold and −1 food; Forum doubles citizens, Marketplace freemen)
  function makes(t, town) {
    const out = {}; const add = (k, v) => { if (v) out[k] = (out[k] || 0) + v; };
    const per = {};
    const sl = Math.min(town.pops.slaves, town.worked);
    if (t.res) { add(t.res, sl); per.slaves = sl ? `+${sl} ${t.res}` : 'none working'; } else per.slaves = town.pops.slaves ? 'make nothing on a hill' : '';
    const cm = town.blds.includes('Forum') ? 2 : 1, fm = town.blds.includes('Marketplace') ? 2 : 1;
    add('influence', town.pops.citizens * cm); add('food', -town.pops.citizens);
    add('gold', town.pops.freemen * fm); add('food', -town.pops.freemen);
    per.citizens = town.pops.citizens ? `+${town.pops.citizens * cm} influence, −${town.pops.citizens} food` : '';
    per.freemen = town.pops.freemen ? `+${town.pops.freemen * fm} gold, −${town.pops.freemen} food` : '';
    return { out, per };
  }

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), wrapEl = $('#stage-wrap'), world = $('#world'), dock = $('#dock'), inspEl = $('#insp'), railEl = $('#rail'), handEl = $('#hand');
  const st = {
    today: false, pick: null, win: null, floats: [], fpos: {}, topF: false, menu: false, mode: 'terrain', fan: null, drop: null, moment: null,
    chapter: 0, q: '', to: 'table',
    outl: { open: true, cfg: false, show: { settle: true, trade: true, assembly: true, rivals: false }, sort: 'needs', shut: {} },
    hand: 'sample', play: null, drawn: null, deal: { want: {}, give: {} },
    asmMin: false, ins: {}, leave: 'SAMOS:freemen:0', offer: false, confirm: null, who: null,
    b: true, // Proposal B: the owner's 2026-11-04 changes on a copy of the Proposal
  };
  // D10: menu windows remember where you left them, per browser (the frame may refuse storage; then per page)
  const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
  st.fpos = LS.get('hegemony-ui-fpos', {});
  const REALM_TABS = ['overview', 'cities', 'people'];
  // geometry: the rail holds four buttons; the dock and the outliner share one width down the right edge
  const RAIL = 195, TOP = 108, DOCK_W = 320, LOGH = 320, OUTL_TOP = 60, DRAWER_W = 640;
  // the hand keeps one place and one size: right of the widest the corner gets (the inspector beside a drawer), left of the dock
  // B: drawers are the outliner's width, so the widest the corner gets is the large inspector
  const drawerW = () => st.b ? DOCK_W : DRAWER_W;
  const handBox = () => { const l = (st.b ? 540 : 64 + DRAWER_W) + 20; return [l, 1440 - DOCK_W - 16 - l]; };
  // B: the rail is a centred tab with larger buttons; it rises clear of the inspector
  const RAIL_B = 4 * 50 + 3 * 4 + 10;

  let K = 1;
  function fit() { K = wrapEl.clientWidth / 1440; stage.style.transform = `scale(${K})`; }
  new ResizeObserver(fit).observe(wrapEl); fit();
  const rel = el => { const a = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: (a.left - s.left) / K, y: (a.top - s.top) / K, w: a.width / K, h: a.height / K }; };
  // replace a container's markup only when it changed, so open panels keep their elements (and their transitions)
  const setHtml = (el, html) => { if (el._h === html) return false; el.innerHTML = html; el._h = html; return true; };

  const ico = p => `icons/${p}.svg`;
  const one = (cost) => Object.entries(cost).map(([k, v]) => `<span class="${(STOCK[k] ?? 0) < v ? 'short' : ''}"><img src="${ico('resources/' + k)}" alt="${k}">${v}</span>`).join('');
  const costHtml = (cost) => `<span class="cost">${Array.isArray(cost) ? cost.map(one).join('<span class="or">or</span>') : one(cost)}</span>`;
  function shortfall(cost) {
    if (Array.isArray(cost)) { const all = cost.map(shortfall); return all.includes(null) ? null : all[0]; }
    const miss = Object.entries(cost).filter(([k, v]) => (STOCK[k] ?? 0) < v).map(([k, v]) => `${v - (STOCK[k] ?? 0)} ${k}`);
    return miss.length ? miss.join(' and ') + ' short' : null;
  }
  const gap = c => Object.entries(c).reduce((s, [k, v]) => s + Math.max(0, v - (STOCK[k] ?? 0)), 0);
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const nameCase = s => s[0] + s.slice(1).toLowerCase();
  const seatDot = (who, cls = 'seatc') => `<span class="${cls}" style="background:${SEATS[who].c}">${SEATS[who].b}</span>`;
  const room = w => (w.kind === 'colony' ? 3 : 8);

  // ── development cards: the engine's own cards. Kyros holds none on this board; the sample hand is four real cards. ──
  const DEV = {
    settlers: { n: 'Settlers', kind: 'held', icon: 'pops/freemen', text: 'Gain a freeman in one of your settlements with room.', flavor: 'Families and seed-grain, seeking a kinder shore.' },
    raiders: { n: 'Raiders', kind: 'rival', icon: 'unrest/riot', text: 'Take up to 3 wood, stone, food or gold from a rival you pick: one kind, and no more than they hold.', flavor: 'They come at night and are gone before the alarm.' },
    caravan: { n: 'Caravan', kind: 'held', icon: 'events/convoy', text: 'Gain 1 wood, stone or food for each of your settlements: one kind, chosen when you play it.', flavor: 'Mules loaded at every gate, bound wherever you send them.' },
    festival: { n: 'Festival Day', kind: 'held', icon: 'unrest/calm', text: 'Clear one of your Unrest tokens.', flavor: 'Garlands, wine, and a day off work.' },
    woodcutters: { n: 'Woodcutters', kind: 'yield', icon: 'resources/wood', text: 'Gain 1 wood for each of your settlements.', flavor: 'Axes ring in every village wood.' },
  };
  const SAMPLE = [{ id: 'settlers' }, { id: 'raiders' }, { id: 'caravan', fresh: true }, { id: 'festival' }];
  const hand = () => (st.hand === 'sample' ? SAMPLE : []);
  const GOLD = { Damon: 1, Nikos: 2, Theron: 16 }; // the Treasurer row: gold in store
  function blocked(c) {
    if (c.fresh) return 'A card is never played on the turn it came in.';
    if (c.id === 'festival') return 'You have no Unrest token to clear.';
    return null;
  }
  function dcHtml(c, big) {
    const d = DEV[c.id];
    return `<div class="dc k-${d.kind}${big ? ' big' : ''}"><div class="band">${big ? 'Development · ' + d.kind : d.kind}</div><b class="t">${d.n}</b><span class="em"><img src="${ico(d.icon)}" alt=""></span><p>${d.text}</p>${big ? `<blockquote>${d.flavor}</blockquote>` : ''}${c.fresh ? '<span class="new">New · plays from your next turn</span>' : ''}</div>`;
  }

  // ── hotspots ──
  const hots = $('#hots');
  for (const t of TILES) {
    const b = document.createElement('button');
    b.className = 'hot'; b.type = 'button';
    Object.assign(b.style, { left: t.x + 'px', top: t.y + 'px', width: t.w + 'px', height: t.h + 'px' });
    b.setAttribute('aria-label', t.label);
    b.addEventListener('click', e => { e.stopPropagation(); pick(t.id); });
    b.addEventListener('mousemove', e => showTip(tileTip(t), e, b));
    b.addEventListener('mouseleave', hideTip);
    hots.appendChild(b);
  }
  $('#map').addEventListener('click', () => { if (st.menu) st.menu = false; else if (st.fan) st.fan = null; else if (st.drop) st.drop = null; else st.pick = null; render(); });

  function tileTip(t) {
    const land = `${cap(t.terrain)} · ${t.slots} slot${t.slots > 1 ? 's' : ''}${t.res ? ' for ' + t.res : ''}`;
    if (t.terrain === 'oracle') return `<b>The Oracle</b><br>Sacred ground: never settled`;
    if (!t.towns.length) return `<b>${cap(t.terrain)}</b><br>${land}<br>Unsettled`;
    return t.towns.map(w => `<b>${w.name}</b> · ${w.owner}'s ${w.capital ? 'capital' : w.kind}<br>${w.total} pop${w.total === 1 ? '' : 's'}${w.blds.length ? ' · ' + w.blds.join(', ') : ''}`).join('<br>') + `<br><span style="opacity:.75">${land}</span>`;
  }

  // ── terms a tooltip can open. Rest on a tooltip with underlined words and it locks; a word then opens its own tooltip beside it (Imperator 2.0, from Crusader Kings III) ──
  const T = (k, w) => `<u data-term="${k}">${w}</u>`;
  const TERMS = {
    happiness: `<b>Happiness</b><br>A level read off the board, never saved up: +1 a Temple, +2 a ${T('luxury', 'luxury good')}, −1 for every two ${T('slaves', 'slaves')}, −1 an ${T('unrest', 'Unrest token')}, +2 each ${T('calm', 'Calm')} this year.<hr>−3 or below starts a ${T('riot', 'Riot')}, −6 or below a ${T('revolt', 'revolt')}. +3 or higher, Calm left out, draws a free card.`,
    riot: `<b>Riot</b><br>At −3 or below when you end your turn. Your ${T('unrest', 'Unrest tokens')} clear and a die decides the loss, from a pop and a building on a 1 to nothing on a 6. Bread (4 food), a concession (demote a citizen) and patronage (3 influence) each add +1 to the roll. Pops go slaves first.`,
    revolt: `<b>Revolt</b><br>At −6 or below, in place of a ${T('riot', 'Riot')}. Nothing is rolled: half your slaves leave, rounded down, and your Unrest tokens clear.`,
    calm: `<b>Calm</b><br>+2 happiness until the year turns, for 2 gold or 2 influence, up to three a turn. It counts at your riot check, but not for the free card or ${T('beloved', 'Beloved of the People')}.`,
    unrest: `<b>Unrest token</b><br>−1 happiness each, and the one part of happiness that stays from turn to turn. Cards place them. Festival clears them all, and so does a ${T('riot', 'Riot')}. You cannot buy one off.`,
    luxury: `<b>Luxury good</b><br>+2 happiness to whoever holds it. The first ${T('port', 'Port')} raised beside it claims it, and it counts while you keep a Port beside it. It trades only to a seat with a Port beside it.`,
    port: `<b>Port</b><br>A building on the coast, one a settlement; a colony may raise one too. It claims a free ${T('luxury', 'luxury good')} beside it.`,
    slaves: `<b>Slave</b><br>Works an open slot for 1 of the tile's resource and eats nothing. Every two in your realm, those on the move included, take 1 from ${T('happiness', 'happiness')}.`,
    freemen: `<b>Freeman</b><br>Makes 1 gold and eats 1 food. Promote one to citizen for 2 gold.`,
    citizens: `<b>Citizen</b><br>Makes 1 ${T('influence', 'influence')}, holds a vote in the Assembly and eats 1 food. Never grown: every citizen is a promoted freeman.`,
    influence: `<b>Influence</b><br>Made by citizens. It pays for ${T('calm', 'Calm')}, demotions, the Dole, riot patronage, a second Idea, and the Assembly's draws, repeals and bought votes.`,
    titles: `<b>Titles</b><br>Six victory cards, each held by the sole leader past its minimum: Polis Builder, Demos, Civic Elite, Treasurer, ${T('beloved', 'Beloved of the People')} and Voice of the Assembly. A tie holds nothing. Hold three when your turn starts and you win.`,
    beloved: `<b>Beloved of the People</b><br>The title for the highest happiness level, ${T('calm', 'Calm')} left out. Its minimum is 4.`,
  };

  // ── tooltips for chrome ──
  const TIPS = {
    wood: `<b>Wood</b> 1 in store<div class="r"><span>Gortyn</span><span class="up">+1</span></div>`,
    stone: `<b>Stone</b> 1 in store<div class="r"><span>Aigai</span><span class="up">+1</span></div>`,
    food: `<b>Food</b> 0 in store<div class="r"><span>Olynthos</span><span class="up">+2</span></div><div class="r"><span>Rhodos</span><span class="dn">−1</span></div><div class="r"><span>Samos</span><span class="dn">−1</span></div>`,
    gold: `<b>Gold</b> 2 in store<div class="r"><span>Samos</span><span class="up">+1</span></div>`,
    influence: `<b>${T('influence', 'Influence')}</b> 9 in store<div class="r"><span>Rhodos</span><span class="up">+6</span></div>`,
    citizens: `<b>${T('citizens', 'Citizens')}</b> 3, all in Rhodos`,
    freemen: `<b>${T('freemen', 'Freemen')}</b> 1, in Samos`,
    slaves: `<b>${T('slaves', 'Slaves')}</b> 6<div class="r"><span>Rhodos, Olynthos</span><span>2 each</span></div><div class="r"><span>Gortyn, Aigai</span><span>1 each</span></div>`,
    room: `<b>Room</b> 10 pops of 28: cities hold 8, colonies 3`,
    mood: `<b>${T('happiness', 'Happiness')} −2</b>, discontent<div class="r"><span>Temple in Rhodos</span><span class="up">+1</span></div><div class="r"><span>6 ${T('slaves', 'slaves')}</span><span class="dn">−3</span></div><hr>A ${T('riot', 'Riot')} rolls at −3 when you end your turn. Click for ${T('calm', 'Calm')}.`,
    seal: `<b>Realm of Kyros</b><br>Opens the Realm drawer: Overview, Cities, People`,
    'm-terrain': `<b>Terrain</b> · key 1<br>The land as it lies`, 'm-political': `<b>Political</b> · key 2<br>Each realm in its colour`,
    'm-economy': `<b>Economy</b> · key 3<br>What each tile makes`, 'm-trade': `<b>Trade</b> · key 4<br>Goods, their holders, routes`,
    'd-trade': `<b>Trade</b><br>Opens the composer. A picked rival is chosen for you.`,
    'd-buy': `<b>Buy a card</b><br>2 gold, once a turn. Asks before it spends.`, 'd-dole': `<b>The Dole</b><br>3 ${T('influence', 'influence')} buys 1 food, up to three a turn. Asks before it spends.`,
    'a-threat': `<b>Three ${T('titles', 'titles')}</b><br>Nikos wins when their turn starts.`,
    'a-year': `<b>This year’s card: Festival</b><br>Everyone clears their ${T('unrest', 'Unrest tokens')}.`,
    'a-unrest': `<b>Discontent</b><br>A ${T('riot', 'Riot')} starts at −3 ${T('happiness', 'happiness')}.`,
    'a-port': `<b>A free luxury</b><br>A ${T('port', 'Port')} at Gortyn claims Tyrian Dye, a ${T('luxury', 'luxury good')}, for +2 happiness. It costs 2 stone, more than you hold.`,
    'r-cities': `<b>Cities</b> · every settlement`, 'r-people': `<b>People</b> · the ladder`,
    'r-ideas': `<b>Ideas</b> · National Ideas`, 'r-agora': `<b>Agora</b> · Laws and the Assembly`,
    endturn: `<b>End turn</b><br>Hold to end Kyros's turn. At −3 happiness a ${T('riot', 'Riot')} rolls first.`,
    chron: `<b>Chronicle</b><br>Opens the full log out of this line`,
    'a-offer': `<b>Theron offers you a trade</b><br>3 gold for 2 influence · 0 of 1 answered`,
    menu: `<b>Menu</b><br>Victory, Codex, Costs and Plates, as windows you can move and keep open`,
    outl: `<b>Outliner</b><br>Your places, trade and the Assembly`,
    'outl-cfg': `<b>Outliner settings</b><br>What it lists, and in what order`,
    'outl-close': `<b>Tuck it away</b><br>A tab on the edge brings it back`,
  };
  const LOCK_MS = 600, tipsEl = $('#tips');
  let tips = [], keep = 0, trimT = null;
  const stageXY = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / K, (e.clientY - r.top) / K]; };
  function closeTips(from = 0) { clearTimeout(trimT); trimT = null; while (tips.length > from) { const t = tips.pop(); clearTimeout(t.lockT); t.el.remove(); } }
  function placeAt(el, x, y) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (x + w > 1430) x -= w + 32; if (y + h > 890) y -= h + 36;
    el.style.left = Math.max(10, x) + 'px'; el.style.top = Math.max(10, y) + 'px';
  }
  function openTip(level, html, anchor, e, key = null) {
    closeTips(level);
    const el = document.createElement('div'); el.className = 'tip'; el.innerHTML = html;
    // a word whose tooltip is already open in the stack reads as plain text
    const shown = new Set([key, ...tips.map(t => t.key)]);
    el.querySelectorAll('[data-term]').forEach(u => { if (shown.has(u.dataset.term)) u.outerHTML = u.innerHTML; });
    const nests = !!el.querySelector('[data-term]');
    if (nests) el.insertAdjacentHTML('beforeend', '<i class="lock" aria-hidden="true"></i>');
    tipsEl.appendChild(el);
    if (!level) { const [x, y] = stageXY(e); placeAt(el, x + 16, y + 18); }
    else {
      // beside its parent, on whichever side covers no open tooltip; failing both, under the lowest
      const p = rel(tips[level - 1].el), a = rel(anchor), w = el.offsetWidth, h = el.offsetHeight;
      const open = tips.slice(0, level).map(t => rel(t.el)), y0 = Math.max(10, Math.min(a.y - 8, 890 - h));
      const hits = (x, y) => open.some(o => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
      const xs = [p.x + p.w + 6, p.x - w - 6].filter(x => x >= 10 && x + w <= 1430);
      let x = xs.find(x => !hits(x, y0)), y = y0;
      if (x === undefined) { x = xs[0] ?? 10; y = Math.min(890 - h, Math.max(...open.map(o => o.y + o.h)) + 6); }
      el.style.left = x + 'px'; el.style.top = y + 'px';
    }
    const t = { el, anchor, nests, key };
    if (nests) t.lockT = setTimeout(() => el.classList.add('locked'), LOCK_MS);
    tips[level] = t;
  }
  // keep the first n tooltips; the rest close after a short grace, so the pointer can cross a gap
  function keepTips(n) {
    keep = n;
    if (tips.length <= n) { clearTimeout(trimT); trimT = null; }
    else if (!trimT) trimT = setTimeout(() => { trimT = null; closeTips(keep); }, 300);
  }
  function showTip(html, e, anchor) {
    const t0 = tips[0];
    if (t0 && t0.anchor === anchor) { keepTips(1); if (!t0.nests) { const [x, y] = stageXY(e); placeAt(t0.el, x + 16, y + 18); } return; }
    openTip(0, html, anchor, e);
  }
  function hideTip() { if (tips[0]?.el.classList.contains('locked')) keepTips(0); else closeTips(0); }
  stage.addEventListener('mousemove', e => {
    const inTip = e.target.closest('#tips .tip');
    if (inTip) {
      const lvl = tips.findIndex(t => t.el === inTip), term = e.target.closest('[data-term]');
      const k = term?.dataset.term;
      if (term && inTip.classList.contains('locked') && TERMS[k] && !tips.slice(0, lvl + 1).some(t => t.key === k)) {
        if (tips[lvl + 1]?.anchor !== term) openTip(lvl + 1, TERMS[k], term, null, k);
        keepTips(lvl + 2);
      } else keepTips(lvl + 1);
      return;
    }
    const el = e.target.closest('[data-tip]'), t = el && TIPS[el.dataset.tip];
    if (t) showTip(typeof t === 'function' ? t() : t, e, el);
    else if (!e.target.closest('.hot')) hideTip();
  });
  stage.addEventListener('mouseleave', () => closeTips(0));

  let toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600); }

  // ── the dock: Trade opens the composer; Buy a card and the Dole ask first ──
  dock.querySelector('[data-dact="buy"] .c').innerHTML = costHtml({ gold: 2 });
  dock.querySelector('[data-dact="dole"] .c').innerHTML = costHtml({ influence: 3 }).replace(/<\/span>$/, '<span class="or">→</span><span><img src="icons/resources/food.svg" alt="food">1</span></span>');
  dock.addEventListener('click', e => {
    const d = e.target.closest('[data-dact]'); if (!d) return;
    const k = d.dataset.dact;
    st.drop = null; st.menu = false;
    if (k === 'trade') { const t = st.pick && byId[st.pick], r = t && t.towns.find(x => x.owner !== ME); st.fan = null; st.to = r ? r.owner : 'table'; st.moment = 'composer'; }
    else if (k === 'buy') { tryAsk(ASK.buy()); return; }
    else tryAsk(ASK.dole());
    render();
  });

  // ── the confirm: every action that spends asks once, in one quiet bar over the centre ──
  const words = c => Object.entries(c).map(([k, v]) => `${v} ${k}`).join(' and ');
  function ask(c) { st.confirm = c; st.fan = null; render(); }
  function tryAsk(c) { const why = shortfall(c.cost); if (why) { toast(`Not now: you are ${why}.`); return; } ask(c); }
  const ASK = {
    buy: () => ({ icon: 'events/convoy', what: 'buy a card', cost: { gold: 2 }, more: 'Once a turn. A yield pays at once; any other card goes to your hand.', go: 'Buy a card', done: () => { st.moment = 'drawn'; st.drawn = 'woodcutters'; st.play = null; } }),
    dole: () => ({ icon: 'unrest/bread-dole', what: 'buy 1 food with the Dole', cost: { influence: 3 }, gain: { food: 1 }, more: 'Up to 3 a turn; this is the first.', go: 'Buy 1 food' }),
    calm: k => ({ icon: 'unrest/calm-verb', what: `pay for Calm in ${k}`, cost: { [k]: 2 }, more: 'Happiness −2 → <span class="up">0</span> until the year turns. Up to three a turn.', go: 'Calm', done: () => { st.drop = null; } }),
    rung: (k, dir, where) => { const r = RUNG[k][dir], up = dir === 'up'; return { icon: up ? 'pops/promote' : 'pops/demote', what: `${up ? 'promote' : 'demote'} ${r[0]} in ${where}`, cost: r[1], more: 'Up to three ladder moves a turn.', go: up ? 'Promote' : 'Demote' }; },
    idea: n => ({ icon: 'assembly/national-idea', what: `take ${n} as your second Idea`, cost: { influence: 6 }, more: `Once a game. ${IDEAS.find(x => x[0] === n)[1]}.`, go: 'Take the Idea' }),
  };
  function confirmHtml() {
    const c = st.confirm; if (!c) return '';
    const after = [...Object.entries(c.cost).map(([k, v]) => `${k} ${STOCK[k]} → <span class="dn">${STOCK[k] - v}</span>`), ...Object.entries(c.gain || {}).map(([k, v]) => `${k} ${STOCK[k] ?? 0} → <span class="up">${(STOCK[k] ?? 0) + v}</span>`)].join(', ');
    return `<div class="cfm-scrim" data-cfm="no"><div class="cfm" role="alertdialog" aria-label="Are you sure?"><img class="i" src="${ico(c.icon)}" alt=""><div class="t"><b>Are you sure you want to ${c.what}?</b><span>This will cost ${words(c.cost)}: ${after}.${c.more ? ' ' + c.more : ''}</span></div><div class="b"><button type="button" class="q" data-cfm="no">Cancel</button><button type="button" data-cfm="yes">${c.go}</button></div></div></div>`;
  }
  function answer(yes) {
    const c = st.confirm; st.confirm = null;
    if (yes && c.done) c.done();
    render();
  }
  $('#cfm').addEventListener('click', e => { const b = e.target.closest('[data-cfm]'); if (b && (b === e.target || b.tagName === 'BUTTON')) answer(b.dataset.cfm === 'yes'); });

  function ownTown() {
    const t = st.pick && byId[st.pick];
    const w = t && t.towns.find(x => x.owner === ME);
    return w ? { t, w } : null;
  }
  const grp = label => `<div style="padding:7px 14px 3px;font:700 10.5px/1 var(--f-sans);letter-spacing:.16em;text-transform:uppercase;color:var(--g-ink-66);background:var(--g-bone)">${label}</div>`;
  function opt(icon, n, cost, extra, data = '') {
    const why = cost ? shortfall(cost) : null;
    return `<div class="opt ${why ? 'off' : ''}" ${data}><img class="i" src="${ico(icon)}" alt=""><span class="n">${n}</span>${cost ? costHtml(cost) : '<span></span>'}<span class="why ${why ? '' : extra ? 'plain' : 'ok'}">${why || extra || 'Ready'}</span></div>`;
  }
  function fanHtml(id) {
    const own = ownTown();
    const where = own ? nameCase(own.w.name) : null;
    let title, sub, body, foot;
    if (id === 'grow') {
      title = where ? `Grow in ${where}` : 'Grow'; sub = 'one grow per settlement a turn';
      body = opt('pops/slaves', 'A slave', { food: 2 }, null, 'data-do="grow:slave"') + opt('pops/freemen', 'A freeman', { food: 3 }, null, 'data-do="grow:freeman"');
      foot = where ? `Grows in ${where}. Pick another settlement to change it.` : 'Then pick a settlement on the map.';
    } else if (id === 'build') {
      const colony = own && own.w.kind === 'colony';
      title = where ? `Build in ${where}` : 'Build'; sub = own ? `${own.w.open} slot${own.w.open === 1 ? '' : 's'} open` : 'one of each per settlement';
      const have = own ? own.w.blds : [];
      const row = ([n, b]) => {
        if (have.includes(n)) return `<div class="opt off"><img class="i" src="${ico(b.icon)}" alt=""><span class="n">${n}</span><span></span><span class="why plain">Already built here</span></div>`;
        if (colony && n !== 'Port') return `<div class="opt off"><img class="i" src="${ico(b.icon)}" alt=""><span class="n">${n}</span>${costHtml(b.cost)}<span class="why plain">Colonies raise only a Port</span></div>`;
        if (own && n === 'Port' && !PORT_AT[own.w.name]) return `<div class="opt off"><img class="i" src="${ico(b.icon)}" alt=""><span class="n">${n}</span>${costHtml(b.cost)}<span class="why plain">No luxury good beside ${where}</span></div>`;
        const extra = n === 'Port' && own && PORT_AT[own.w.name] ? `Claims ${PORT_AT[own.w.name]}` : b.law ? b.law : b.fx;
        return opt(b.icon, n, b.cost, shortfall(b.cost) ? null : extra, `data-do="raise:${n}"`);
      };
      const classes = ['Slaves', 'Freemen', 'Citizens', 'Civic'];
      body = classes.map(c => grp(c) + Object.entries(BUILD).filter(([, b]) => b.cls === c).map(row).join('')).join('');
      foot = where ? `Builds in ${where}.` : 'Then pick one of your cities.';
    }
    return `<div class="fan" data-for="${id}"><header><b>${title}</b><span>${sub}</span></header>${body}<footer>${foot}</footer></div>`;
  }
  $('#fan').addEventListener('click', e => {
    const o = e.target.closest('.opt'); if (!o) return;
    const own = ownTown(), d = o.dataset.do;
    if (o.classList.contains('off') || !d) { toast('Not now: the line says why.'); return; }
    if (!own) return;
    const where = nameCase(own.w.name), [k, v] = d.split(':');
    if (k === 'grow') tryAsk({ icon: 'pops/' + (v === 'slave' ? 'slaves' : 'freemen'), what: `grow a ${v} in ${where}`, cost: v === 'slave' ? { food: 2 } : { food: 3 }, more: 'Up to three a turn in each settlement.', go: 'Grow' });
    else tryAsk({ icon: BUILD[v].icon, what: `raise ${v === 'Estate' ? 'an' : 'a'} ${v} in ${where}`, cost: BUILD[v].cost, more: BUILD[v].fx + '.', go: 'Raise it' });
  });

  // ── inspector ──
  function slotsHtml(t, w, own) {
    const out = [];
    w.blds.forEach(n => out.push(`<div class="slot" title="${n}: ${n === 'Port' && w.port ? 'holds ' + w.port : BUILD[n]?.fx || ''}"><img src="${ico(BUILD[n]?.icon || 'buildings/build')}" alt="">${n}</div>`));
    for (let i = 0; i < w.worked; i++) out.push(`<div class="slot worked" title="A slave works this slot"><img src="${ico('resources/' + (t.res || 'stockpile'))}" alt="">Worked</div>`);
    for (let i = 0; i < w.open; i++) out.push(own ? `<div class="slot open" data-act="raise"><b>+</b>${w.kind === 'colony' ? 'Open' : 'Raise'}</div>` : `<div class="slot open" style="cursor:default"><b>·</b>Open</div>`);
    return out.join('');
  }
  const RUNG = { slaves: { up: ['a slave to freeman', { food: 2 }] }, freemen: { up: ['a freeman to citizen', { gold: 2 }], down: ['a freeman to slave', { influence: 1 }] }, citizens: { down: ['a citizen to freeman', { influence: 1 }] } };
  function ladderHtml(k, w) {
    const b = (dir, glyph) => {
      const r = RUNG[k][dir];
      if (!r || !w.pops[k]) return `<button type="button" disabled title="${!r ? (dir === 'up' ? 'Top of the ladder' : 'Bottom of the ladder') : 'None here'}">${glyph}</button>`;
      const why = shortfall(r[1]);
      return `<button type="button" data-act="rung" data-dir="${dir}" data-k="${k}" class="${why ? 'short' : ''}" title="${dir === 'up' ? 'Promote' : 'Demote'} ${r[0]}: ${Object.entries(r[1]).map(([x, v]) => v + ' ' + x).join(', ')}${why ? ' · ' + why : ''}">${glyph}</button>`;
    };
    return `<div class="ladder">${b('up', '▲')}${b('down', '▼')}</div>`;
  }
  function popsHtml(w, per, own) {
    const P = [['citizens', 'Citizens'], ['freemen', 'Freemen'], ['slaves', 'Slaves']];
    return P.map(([k, n]) => `<div class="pop"><img src="${ico('pops/' + k)}" alt=""><b>${w.pops[k]}<small>${n.toUpperCase()}</small></b><span>${per ? (per[k] || (w.pops[k] ? '' : 'none here')) : (w.pops[k] ? '' : 'none here')}</span>${own ? ladderHtml(k, w) : ''}</div>`).join('');
  }
  function inspHtml() {
    const t = st.pick && byId[st.pick]; if (!t) return '';
    const own = t.towns.find(x => x.owner === ME);
    const w = own || t.towns[0];
    const land = `${cap(t.terrain)}${t.res ? ', ' + t.res : ''}`;
    const x = `<button class="x" type="button" data-act="close" aria-label="Close">×</button>`;
    if (!w) {
      if (t.terrain === 'oracle') return `<section class="insp s" aria-label="The Oracle"><header class="ih"><img class="k" src="${ico('terrain/oracle')}" alt=""><div><h3>The Oracle</h3><p>Sacred ground</p></div>${x}</header><div class="ib"><div class="facts"><div><img src="${ico('unrest/locked')}" alt="">Never settled: not by founding, upgrade or any Event</div><div><img src="${ico('pops/slaves')}" alt="">No slots, and slaves would make nothing here</div></div></div></section>`;
      const cost = { wood: 4, food: 1 }, why = shortfall(cost);
      return `<section class="insp s" aria-label="${cap(t.terrain)}">
        <header class="ih"><img class="k" src="${ico('terrain/' + t.terrain)}" alt=""><div><h3>${cap(t.terrain)}</h3><p>Unsettled · ${t.slots} slot${t.slots > 1 ? 's' : ''}${t.res ? ' for ' + t.res : ''}</p></div>${x}</header>
        <div class="ib"><div class="facts">
          <div><img src="${ico('pops/slaves')}" alt="">${t.res ? `Slaves here make 1 ${t.res} each` : 'Slaves here make nothing: a hill holds buildings'}</div>
          <div><img src="${ico('pops/capacity')}" alt="">Room for 3 pops as a colony</div>
          <div><img src="${ico('settlements/found')}" alt="">You have 1 colony piece left</div>
        </div></div>
        <footer class="ia"><button class="act ${why ? 'off' : 'go'}" type="button" data-act="found"><span>Found a colony here</span>${costHtml(cost)}${why ? `<span class="why">${why}</span>` : ''}</button></footer>
      </section>`;
    }
    const seat = SEATS[w.owner];
    const capacity = room(w);
    const used = w.built + w.worked;
    const shared = t.towns.length > 1 ? t.towns.filter(y => y !== w).map(y => `${nameCase(y.name)} (${y.owner})`).join(', ') : null;
    const what = w.capital ? 'capital' : w.kind;
    const sub = own ? `Your ${what} · ${land}` : `${w.owner}'s ${what} · ${land}`;
    const head = `<header class="ih">${own ? `<img class="k" src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt="">` : `<button class="who" type="button" data-act="seat" data-who="${w.owner}" aria-label="${w.owner}: open their card" title="${w.owner}: open their card" style="background:${seat.c}">${seat.b}</button>`}<div><h3>${nameCase(w.name)}</h3><p>${sub}</p></div>${x}</header>`;
    const mk = own ? makes(t, w) : null;
    const makesCell = own ? `<div class="stat"><div class="k">Makes a turn</div><div class="v">${Object.entries(mk.out).filter(([, v]) => v).map(([k, v]) => `<span class="${v > 0 ? 'up' : 'dn'}" style="display:inline-flex;align-items:center;gap:3px"><img src="${ico('resources/' + k)}" alt="${k}">${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join('') || '<small>nothing</small>'}</div></div>`
      : `<div class="stat"><div class="k">Buildings</div><div class="v">${w.built}<small>${w.blds.join(', ') || 'none'}</small></div></div>`;
    const stats = `<div class="stats">
      <div class="stat"><div class="k">People</div><div class="v">${w.total}<small>/ ${capacity}</small></div><div class="bar2"><i style="width:${Math.min(100, w.total / capacity * 100)}%"></i></div></div>
      <div class="stat"><div class="k">Slots used</div><div class="v">${used}<small>/ ${t.slots}</small></div><div class="bar2"><i style="width:${w.built / t.slots * 100}%"></i><i class="w" style="width:${w.worked / t.slots * 100}%"></i></div></div>
      ${makesCell}</div>`;
    const portHint = own && PORT_AT[w.name] ? `A Port here claims ${PORT_AT[w.name]}: +2 happiness.` : null;
    const portHeld = w.port ? `Its Port holds ${w.port}.` : null;
    const notes = [shared ? `Shares the tile with ${shared}.` : null, portHeld, portHint, ...w.notes.map(cap)].filter(Boolean);
    let foot;
    if (own) {
      const grow = { food: 2 }, gw = shortfall(grow);
      const acts = [`<button class="act ${gw ? 'off' : 'go'}" type="button" data-act="grow"><span>Grow here</span>${costHtml(grow)}${gw ? `<span class="why">${gw}</span>` : ''}</button>`];
      if (w.kind === 'colony') {
        const up = { wood: 3, stone: 3 }, uw = shortfall(up);
        acts.push(`<button class="act ${uw ? 'off' : 'go'}" type="button" data-act="upgrade"><span>Make it a city</span>${costHtml(up)}${uw ? `<span class="why">${uw}</span>` : ''}</button>`);
      } else {
        const free = Object.entries(BUILD).filter(([n]) => !w.blds.includes(n) && (n !== 'Port' || PORT_AT[w.name]) && (n !== 'Estate' || t.terrain !== 'hill'));
        const any = free.find(([, b]) => !shortfall(b.cost));
        const cheapest = free.map(([n, b]) => [n, shortfall(b.cost), gap(b.cost)]).sort((a, b) => a[2] - b[2])[0];
        acts.push(`<button class="act ${w.open && any ? 'go' : 'off'}" type="button" data-act="raise"><span>Raise a building</span><span class="why">${!w.open ? 'No open slot' : any ? '' : `Nothing affordable: ${cheapest[0]} is ${cheapest[1]}`}</span></button>`);
      }
      if (w.total) { const mv = shortfall({ food: 1 }); acts.push(`<button class="act ${mv ? 'off' : 'go'}" type="button" data-act="move"><span>Move a pop out</span>${costHtml({ food: 1 })}${mv ? `<span class="why">${mv}</span>` : ''}</button>`); }
      foot = `<footer class="ia">${acts.join('')}</footer>`;
    } else {
      foot = `<footer class="ia"><button class="act go" type="button" data-act="offer" data-to="${w.owner}"><span>Offer ${w.owner} a trade</span><span style="font-weight:500;font-size:12px;opacity:.85">opens the composer, ${w.owner} chosen</span></button></footer>`;
    }
    return `<section class="insp ${own ? 'l' : 'm'}" aria-label="${nameCase(w.name)}">${head}<div class="ib">${stats}
      <div class="two"><div class="isec"><h4>Slots · ${t.slots}</h4><div class="slots">${slotsHtml(t, w, !!own)}</div></div>
      <div class="isec"><h4>People</h4><div class="pops">${popsHtml(w, mk && mk.per, !!own)}</div></div></div>
      ${notes.length ? `<div class="note">${notes.join(' ')}</div>` : ''}</div>${foot}</section>`;
  }
  inspEl.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'close') { st.pick = null; render(); return; }
    if (act === 'raise') { st.fan = 'build'; render(); return; }
    if (act === 'grow') { st.fan = 'grow'; render(); return; }
    if (act === 'rung') { tryAsk(ASK.rung(a.dataset.k, a.dataset.dir, nameCase(ownTown().w.name))); return; }
    if (act === 'seat') { st.who = a.dataset.who; st.drop = st.drop === 'seat' ? null : 'seat'; st.fan = null; render(); return; }
    if (act === 'found') { tryAsk({ icon: 'settlements/found', what: 'found a colony here', cost: { wood: 4, food: 1 }, more: 'Your last colony piece.', go: 'Found it' }); return; }
    if (act === 'upgrade') { tryAsk({ icon: 'settlements/upgrade', what: `make ${nameCase(ownTown().w.name)} a city`, cost: { wood: 3, stone: 3 }, go: 'Make it a city' }); return; }
    if (act === 'move') { if (a.classList.contains('off')) toast('Not now: you are 1 food short.'); return; }
    if (act === 'offer') { st.to = a.dataset.to; st.moment = 'composer'; render(); return; }
    if (a.classList.contains('off')) toast('Not now: the button says why.');
  });

  // ── windows: realm drawers on the left, menu windows that float ──
  const WIN_TITLE = { overview: 'Realm of Kyros', cities: 'Realm of Kyros', people: 'Realm of Kyros', ideas: 'National Ideas', agora: 'Agora', victory: 'Victory', codex: 'Codex', costs: 'Costs', plates: 'Plates' };
  const WIN_SUB = { ideas: 'One per seat from the draft; a second for 6 influence', agora: 'What the Assembly left standing', victory: 'Three titles at your turn’s start win', codex: 'The rules, by chapter', costs: 'Every price, as it stands under today’s Laws', plates: 'How tile badges look; kept per browser' };
  const WIN_ICON = { ideas: 'assembly/national-idea', agora: 'assembly/agora', victory: 'victory/laurel', codex: 'chrome/codex', costs: 'market/treasury', plates: 'settlements/slot' };
  const FW = { victory: 660, codex: 720, costs: 640, plates: 360 };
  function placesChips() { return MY.map(({ t, w }) => `<button class="chip" type="button" data-goto="${t.id}"><img src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt="">${nameCase(w.name)}</button>`).join(' '); }
  const nextFor = ({ w }) => w.kind === 'colony'
    ? (w.total ? { s: 'City: ' + (shortfall({ wood: 3, stone: 3 }) || 'ready'), k: '' } : { s: 'Empty: grow or move a pop in', k: 'warn' })
    : PORT_AT[w.name] ? { s: `A Port claims ${PORT_AT[w.name]}: +2 happiness`, k: 'good' } : w.open ? { s: `${w.open} slot open`, k: '' } : { s: 'Full', k: '' };
  const alaw = (n, fx, meta) => `<div class="alaw"><img src="${ico('assembly/law')}" alt=""><b>${n}</b><p>${fx}</p><span>${meta}</span></div>`;
  const STANDING = alaw('Harbour Dues', 'Ports cost 2 stone; Marketplaces cost 3 wood and 4 gold.', 'Damon · Year X') + alaw('Frontier Spirit', 'Founding a colony grants a free slave, but colonies hold 3 pops.', 'Damon · Year XII') + '<div class="alaw empty">Two stelae stand empty</div>';
  function winBody(id) {
    if (id === 'overview') return `<dl class="ledger">
        <dt>Places</dt><dd>${placesChips()}</dd>
        <dt>Pieces left</dt><dd><img src="${ico('settlements/colony')}" alt="">1 colony &nbsp; <img src="${ico('settlements/city')}" alt="">2 cities</dd>
        <dt>Titles</dt><dd><img src="${ico('victory/laurel')}" alt="">0 of 3 · <span class="dn">Nikos holds 3 and wins at their turn</span></dd>
        <dt>Ideas</dt><dd><img src="${ico('assembly/national-idea')}" alt="">Frontier Charter · a second costs 6 influence</dd>
        <dt>Luxury goods</dt><dd><img src="${ico('resources/luxury')}" alt="">None held · a Port at Gortyn would claim Tyrian Dye</dd>
        <dt>Assembly</dt><dd><img src="${ico('assembly/vote')}" alt="">4 votes · next sitting in 2 turns</dd>
        <dt>Cards</dt><dd><img src="${ico('events/venture')}" alt="">${hand().length ? `${hand().length} development cards held · <button class="chip" type="button" data-hand="1">View the hand</button>` : 'No development cards held'}</dd>
      </dl><p class="note" style="margin-top:14px">Stores, income, people by class and mood are in the top bar, so this page does not repeat them.</p>`;
    if (id === 'cities') return `<table class="places"><thead><tr><th>Place</th><th>Land</th><th>People</th><th>Slots</th><th>Makes a turn</th><th>Next</th></tr></thead><tbody>${MY.map(x => {
        const { t, w } = x;
        const mk = makes(t, w).out;
        const m = Object.entries(mk).filter(([, v]) => v).map(([k, v]) => `<span class="${v > 0 ? 'up' : 'dn'}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${k}</span>`).join(', ') || '<span style="color:var(--g-ink-66)">nothing</span>';
        return `<tr class="row" data-goto="${t.id}"><td class="nm"><img src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt="">${nameCase(w.name)}</td><td>${cap(t.terrain)}</td><td>${w.total} / ${room(w)}</td><td>${w.built + w.worked} / ${t.slots}</td><td>${m}</td><td class="note">${nextFor(x).s}</td></tr>`;
      }).join('')}</tbody></table><p class="note" style="margin-top:12px">A row opens the place in the inspector; the drawer makes room for it.</p>`;
    if (id === 'people') {
      const row = (k, n, count, does, up, down) => `<tr><td class="nm"><img src="${ico('pops/' + k)}" alt="">${n}</td><td class="c"><b>${count}</b></td><td>${does}</td><td>${up}</td><td>${down}</td></tr>`;
      const pr = (label, cost) => `<span style="display:inline-flex;gap:6px;align-items:center">${label} ${costHtml(cost)}</span>${shortfall(cost) ? `<div class="dn" style="font-size:12px">${shortfall(cost)}</div>` : ''}`;
      return `<table class="places"><thead><tr><th>Class</th><th class="c">Count</th><th>Makes and eats a turn</th><th>Raise</th><th>Lower</th></tr></thead><tbody>
        ${row('citizens', 'Citizens', 3, '<span class="up">+6 influence</span>, <span class="dn">−3 food</span>', '—', pr('to freeman', { influence: 1 }))}
        ${row('freemen', 'Freemen', 1, '<span class="up">+1 gold</span>, <span class="dn">−1 food</span>', pr('to citizen', { gold: 2 }), pr('to slave', { influence: 1 }))}
        ${row('slaves', 'Slaves', 6, '<span class="up">+1 wood, +1 stone, +4 food</span>', pr('to freeman', { food: 2 }), '—')}
        </tbody></table>
        <h5 style="margin-top:18px">Where they live</h5><dl class="ledger" style="grid-template-columns:repeat(6,auto);gap:8px 18px">${MY.map(({ w }) => `<dt>${nameCase(w.name)}</dt>`).join('')}${MY.map(({ w }) => `<dd style="font:700 18px var(--f-sans)">${w.total}</dd>`).join('')}</dl>
        <p class="note" style="margin-top:12px">Up to three ladder moves a turn. Net a turn, all classes: +1 wood, +1 stone, ±0 food, +1 gold, +6 influence.</p>`;
    }
    if (id === 'ideas') return `<p class="lead">You hold <b>Frontier Charter</b> from the draft. A second Idea costs ${costHtml({ influence: 6 })} once a game, from the untaken ones.</p>
      <div class="ideas">${IDEAS.map(([n, fx, who]) => `<div class="idea ${who === ME ? 'yours' : who ? 'taken' : 'free'}" ${who ? '' : `data-buy="${n}"`}><b>${n}</b><p>${fx}</p><span class="holder">${who ? `<i style="background:${SEATS[who].c}">${SEATS[who].b}</i>${who === ME ? 'Yours' : 'Taken by ' + who}` : 'Free · buy for 6 influence'}</span></div>`).join('')}</div>`;
    if (id === 'victory') return `<div class="banner">${seatDot('Nikos', 'who')}<div><b>Nikos holds three titles</b> and wins when their turn starts, after you and Damon. Break one before then: Polis Builder, Civic Elite or Beloved of the People.</div></div>
      <table class="places"><thead><tr><th>Title</th>${ORDER.map(s => `<th class="c">${seatDot(s)}</th>`).join('')}<th>Rule</th></tr></thead><tbody>${TITLES.map(T => `<tr><td class="nm"><img src="${ico(T.icon)}" alt="">${T.n}</td>${T.v.map((v, i) => `<td class="c ${T.held === ORDER[i] ? 'held' : ''}">${v < 0 ? '−' + Math.abs(v) : v}</td>`).join('')}<td class="vt-sub">${T.rule} · ${T.held ? 'held by ' + T.held : T.lead}</td></tr>`).join('')}</tbody></table>
      <p class="note" style="margin-top:12px">You hold 0 of 3. A tie awards nothing; every title reads what stands on the board now. If Year XIV passes with nobody on 3, the most titles wins.</p>`;
    if (id === 'agora') return `<p class="lead"><b>Next Assembly in 2 turns.</b> Laws stand until repealed; each sitting may add or break one.</p>
      <h5 style="display:flex;align-items:center;gap:10px">Standing laws · 2 of 4 stelae <span class="stelae" style="margin:0"><span></span><span></span><span class="empty"></span><span class="empty"></span></span></h5>
      <div class="alaws">${STANDING}</div>
      <h5 style="margin-top:16px">Orators · stelae raised under each</h5>
      <table class="places agora-t"><thead><tr><th>Orator</th>${ORDER.map(s => `<th class="c">${seatDot(s)}</th>`).join('')}<th></th></tr></thead><tbody>${ORATORS.map(([n, ep, v, line]) => `<tr><td class="nm"><img src="${ico('assembly/politician')}" alt="">${n}</td>${v.map((x, i) => `<td class="c ${line.includes(ORDER[i]) ? 'held' : ''}">${x}</td>`).join('')}<td class="vt-sub">${ep} · ${line}</td></tr>`).join('')}</tbody></table>`;
    if (id === 'plates') {
      const seg = (opts, on) => `<span class="seg2">${opts.map(o => `<span class="${o === on ? 'on' : ''}">${o}</span>`).join('')}</span>`;
      return `<div class="plates" style="padding:0"><span>Look</span>${seg(['Dark', 'Ivory', 'Dots'], 'Dark')}<span>Size</span>${seg(['Small', 'Large'], 'Small')}<span>Close in</span>${seg(['Fade', 'Keep'], 'Fade')}<span></span><span class="note">Hold Alt to show every plate.</span></div>`;
    }
    if (id === 'costs') return `<div class="costs">${COSTS.map(([g, sub, rows]) => `<section><h5>${g}${sub ? `<span>${sub}</span>` : ''}</h5>${rows.map(([ic, n, c, law]) => `<div class="crow ${law ? 'law' : ''}"><img class="i" src="${ico(ic)}" alt=""><span>${n}${law ? `<small>${law}</small>` : ''}</span>${costHtml(c)}</div>`).join('')}</section>`).join('')}</div>
      <p class="note">Red is what you cannot pay from today’s store. A tinted row is moved by a standing Law.</p>`;
    if (id === 'codex') {
      const q = st.q.trim().toLowerCase();
      const list = CODEX.map((c, i) => ({ c, i })).filter(({ c }) => !q || (c.t + ' ' + c.body.join(' ')).toLowerCase().includes(q));
      const ch = CODEX[st.chapter];
      const isHead = l => /^[A-Z0-9 &'’,·–—\-]+$/.test(l) && l.length > 2;
      const isShort = l => l.length <= 44 && !isHead(l) && !/[.:]$/.test(l.replace(/\d\.$/, ''));
      let body = '', run = [];
      const flush = () => { if (!run.length) return; if (run.length === 1) body += `<p>${run[0]}</p>`; else { body += '<dl>'; for (let i = 0; i < run.length; i += 2) body += `<dt>${run[i]}</dt><dd>${run[i + 1] ?? ''}</dd>`; body += '</dl>'; } run = []; };
      ch.body.forEach(l => {
        if (isHead(l)) { flush(); body += `<h6>${l}</h6>`; }
        else if (l.length <= 60 && (isShort(l) || run.length % 2 === 1)) run.push(l);
        else { flush(); body += `<p>${l}</p>`; }
      });
      flush();
      return `<div class="codex"><nav><input type="search" placeholder="Search the rules" value="${st.q.replace(/"/g, '&quot;')}" aria-label="Search the rules">${list.map(({ c, i }) => `<button type="button" data-ch="${i}" aria-current="${i === st.chapter}"><i>${c.n}</i>${c.t}</button>`).join('') || '<p class="note">Nothing matches.</p>'}</nav><article><h4>${ch.n} · ${ch.t}</h4>${ch.intro ? `<p>${ch.intro}</p>` : ''}${body}</article></div>`;
    }
    return '';
  }
  function winHtml(id) {
    if (!id) return '';
    if (st.b) return winHtmlB(id);
    const isRealm = REALM_TABS.includes(id);
    const sub = isRealm ? '2 cities · 4 colonies · Year XII of XIV' : WIN_SUB[id];
    const mark = isRealm ? `<span class="who" style="background:#a83226">Κ</span>` : `<img class="k" src="${ico(WIN_ICON[id])}" alt="">`;
    const head = `<header class="ih">${mark}<div><h3>${WIN_TITLE[id]}</h3><p>${sub}</p></div><button class="x" type="button" data-act="close-win" aria-label="Close">×</button></header>`;
    const tabs = isRealm ? `<nav class="tabs" role="tablist">${REALM_TABS.map(k => `<button type="button" role="tab" data-tab="${k}" aria-selected="${id === k}">${{ overview: 'Overview', cities: 'Cities', people: 'People' }[k]}</button>`).join('')}</nav>` : '';
    return `<section class="win" aria-label="${WIN_TITLE[id]}">${head}${tabs}<div class="wb">${winBody(id)}</div></section>`;
  }
  // ── Proposal B drawers: the outliner's width, Imperator's build: icon tiles, banded section heads, centred tab buttons; the words move into tooltips ──
  const tipAt = (k, html) => { TIPS[k] = html; return `data-tip="${k}"`; };
  const band = t => `<h5 class="band"><span>${t}</span></h5>`;
  const pip = (k, v) => `<span class="${v > 0 ? 'up' : v < 0 ? 'dn' : ''}"><img src="${ico('resources/' + k)}" alt="${k}">${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}</span>`;
  const IDEA_ICON = { 'Good Harvest': 'resources/food', 'Public Dole': 'unrest/bread-dole', 'Urban Planning': 'buildings/build', 'Civic Tradition': 'resources/influence', 'Frontier Charter': 'settlements/colony', 'New Settlers': 'pops/freemen', 'City Pioneers': 'settlements/upgrade', 'Slave Colonies': 'pops/slaves', 'Harbour Planning': 'buildings/port', 'Treasury Grant': 'market/treasury', 'Assembly Brokers': 'assembly/vote' };
  const B_TABS = { overview: ['settlements/seal', 'Overview'], cities: ['settlements/city', 'Cities'], people: ['pops/crowd', 'People'] };
  function winHtmlB(id) {
    const isRealm = REALM_TABS.includes(id), title = isRealm ? 'Realm of Kyros' : WIN_TITLE[id];
    const mark = isRealm ? `<span class="who" style="background:#a83226">Κ</span>` : `<img class="k" src="${ico(WIN_ICON[id])}" alt="">`;
    const head = `<header class="ih">${mark}<h3>${title}</h3><button class="x" type="button" data-act="close-win" aria-label="Close">×</button></header>`;
    const tabs = isRealm ? `<nav class="btabs" role="tablist">${REALM_TABS.map(k => `<button type="button" role="tab" data-tab="${k}" aria-selected="${id === k}"><img src="${ico(B_TABS[k][0])}" alt="">${B_TABS[k][1]}</button>`).join('')}</nav>` : '';
    return `<section class="win bw" aria-label="${title}">${head}${tabs}<div class="wb">${winBodyB(id)}</div></section>`;
  }
  function winBodyB(id) {
    const tile = (k, icon, v, label, tip) => `<div class="bt" ${tipAt('b-' + k, tip)}><img src="${ico(icon)}" alt=""><b>${v}</b><span>${label}</span></div>`;
    if (id === 'overview') {
      const n = hand().length;
      return `<div class="btiles">
          ${tile('col', 'settlements/colony', 1, 'Colonies left', '<b>Colony pieces</b><br>1 left to found with')}
          ${tile('city', 'settlements/city', 2, 'Cities left', '<b>City pieces</b><br>2 left to raise colonies into cities')}
          ${tile('titles', 'victory/laurel', '0/3', 'Titles', `<b>${T('titles', 'Titles')}</b><br>You hold none. Nikos holds three and wins when their turn starts.`)}
          ${tile('ideas', 'assembly/national-idea', 1, 'Ideas', '<b>National Ideas</b><br>Frontier Charter, from the draft. A second costs 6 influence.')}
          ${tile('lux', 'resources/luxury', 0, 'Luxuries', `<b>${T('luxury', 'Luxury goods')}</b><br>None held. A ${T('port', 'Port')} at Gortyn would claim Tyrian Dye.`)}
          ${tile('votes', 'assembly/vote', 4, 'Votes', '<b>Votes</b><br>4 at the Assembly, which sits in 2 turns.')}
        </div>
        <div class="bwarn" ${tipAt('b-warn', `<b>Three ${T('titles', 'titles')}</b><br>Nikos holds Polis Builder, Civic Elite and Beloved of the People. A tie breaks one.`)}>${seatDot('Nikos', 'who')}<span><b>Nikos</b> holds 3 titles</span><span class="ls"><img src="${ico('victory/polis-builder')}" alt=""><img src="${ico('victory/civic-elite')}" alt=""><img src="${ico('victory/beloved')}" alt=""></span></div>
        ${band('Places')}
        <div class="bplaces">${MY.map(({ t, w }) => `<button class="bp" type="button" data-goto="${t.id}"><img src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt=""><b>${nameCase(w.name)}</b><span>${w.total}/${room(w)}</span></button>`).join('')}</div>
        ${band('Cards')}
        <div class="bcenter">${n ? `<button class="bbtn" type="button" data-hand="1"><img src="${ico('events/venture')}" alt="">View the hand · ${n}</button>` : `<span class="bnone"><img src="${ico('events/venture')}" alt="">No cards held</span>`}</div>`;
    }
    if (id === 'cities') return `<div class="bcities">${MY.map(x => {
        const { t, w } = x, nx = nextFor(x), mk = makes(t, w).out;
        const ys = Object.entries(mk).filter(([, v]) => v).map(([k, v]) => pip(k, v)).join('') || '<span class="none">makes nothing</span>';
        return `<button class="bc ${nx.k}" type="button" data-goto="${t.id}" ${tipAt('b-c' + t.id, `<b>${nameCase(w.name)}</b> · ${cap(t.terrain)}<br>${nx.s}`)}>
          <img class="i" src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt=""><b>${nameCase(w.name)}</b>
          <span class="n"><img src="${ico('pops/crowd')}" alt="people">${w.total}/${room(w)}</span>
          <span class="y">${ys}</span><span class="n"><img src="${ico('settlements/slot')}" alt="slots">${w.built + w.worked}/${t.slots}</span></button>`;
      }).join('')}</div>`;
    if (id === 'people') {
      const rung = (dir, cost, what) => cost ? `<span class="rg" ${tipAt(`b-${what}`, `<b>${what}</b><br>From a settlement's inspector. Up to three ladder moves a turn.`)}><img src="${ico('pops/' + (dir === 'up' ? 'promote' : 'demote'))}" alt="${dir === 'up' ? 'Raise' : 'Lower'}">${costHtml(cost)}</span>` : '<span class="rg none">—</span>';
      const cls = (k, n, count, makes, up, down) => `<div class="bcl" ${tipAt('b-cl-' + k, TIPS[k])}><img class="i" src="${ico('pops/' + k)}" alt=""><b>${count}</b><span class="nm">${n}</span><span class="y">${makes}</span>${rung('up', up?.[1], up?.[0])}${rung('down', down?.[1], down?.[0])}</div>`;
      return `<div class="bclasses">
          ${cls('citizens', 'Citizens', 3, pip('influence', 6) + pip('food', -3), null, ['Lower a citizen to freeman', { influence: 1 }])}
          ${cls('freemen', 'Freemen', 1, pip('gold', 1) + pip('food', -1), ['Raise a freeman to citizen', { gold: 2 }], ['Lower a freeman to slave', { influence: 1 }])}
          ${cls('slaves', 'Slaves', 6, pip('wood', 1) + pip('stone', 1) + pip('food', 4), ['Raise a slave to freeman', { food: 2 }], null)}
        </div>
        ${band('Ladder moves this turn')}
        <div class="bpips" ${tipAt('b-ladder', '<b>Ladder moves</b><br>Up to three a turn, raises and lowerings together.')}><i></i><i></i><i></i><span>0 of 3 used</span></div>
        ${band('Where they live')}
        <div class="bwhere">${MY.map(({ t, w }) => `<button type="button" data-goto="${t.id}" ${tipAt('b-w' + t.id, `<b>${nameCase(w.name)}</b><br>${w.total} of ${room(w)} pops`)}><img src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt=""><b>${w.total}</b></button>`).join('')}</div>
        ${band('Net a turn')}
        <div class="bnet">${pip('wood', 1)}${pip('stone', 1)}${pip('food', 0)}${pip('gold', 1)}${pip('influence', 6)}</div>`;
    }
    if (id === 'ideas') {
      const card = ([n, fx, who]) => `<button type="button" class="bi ${who === ME ? 'yours' : who ? 'taken' : 'free'}" ${who ? '' : `data-buy="${n}"`} ${tipAt('b-i' + n, `<b>${n}</b><br>${fx}<hr>${who === ME ? 'Yours, from the draft' : who ? 'Taken by ' + who : 'Free: buy it for 6 influence, once a game'}`)}><img src="${ico(IDEA_ICON[n])}" alt=""><b>${n}</b>${who ? `<i class="sd" style="background:${SEATS[who].c}">${SEATS[who].b}</i>` : `<span class="c">${costHtml({ influence: 6 })}</span>`}</button>`;
      return `${band('Free · one more, once a game')}<div class="bideas">${IDEAS.filter(i => !i[2]).map(card).join('')}</div>
        ${band('Taken')}<div class="bideas">${[...IDEAS.filter(i => i[2] === ME), ...IDEAS.filter(i => i[2] && i[2] !== ME)].map(card).join('')}</div>`;
    }
    if (id === 'agora') {
      const law = (n, fx, who, yr) => `<div class="bl" ${tipAt('b-l' + n, `<b>${n}</b><br>${fx}<hr>Raised by ${who}, ${yr}`)}><img src="${ico('assembly/stele')}" alt=""><b>${n}</b>${seatDot(who)}</div>`;
      return `<div class="bnext" ${tipAt('b-next', '<b>The Assembly</b><br>Laws stand until repealed; each sitting may add or break one.')}><img src="${ico('assembly/agora')}" alt=""><div><b>2 turns</b><span>to the next sitting</span></div><div class="v"><img src="${ico('assembly/vote')}" alt=""><b>4</b><span>votes</span></div></div>
        ${band('Standing laws · 2 of 4')}
        <div class="bstelae">${law('Harbour Dues', 'Ports cost 2 stone; Marketplaces cost 3 wood and 4 gold.', 'Damon', 'Year X')}${law('Frontier Spirit', 'Founding a colony grants a free slave, but colonies hold 3 pops.', 'Damon', 'Year XII')}<div class="bl empty"><img src="${ico('assembly/stele')}" alt=""><b>Empty</b></div><div class="bl empty"><img src="${ico('assembly/stele')}" alt=""><b>Empty</b></div></div>
        ${band('Orators · stelae under each')}
        <table class="bor"><thead><tr><th></th>${ORDER.map(s => `<th>${seatDot(s)}</th>`).join('')}</tr></thead><tbody>${ORATORS.map(([n, ep, v, line]) => `<tr ${tipAt('b-o' + n, `<b>${n}</b>, ${ep}<br>${cap(line)}`)}><td class="nm"><img src="${ico('assembly/politician')}" alt="">${n}</td>${v.map((x, i) => `<td class="${line.includes(ORDER[i]) ? 'held' : ''} ${x ? '' : 'z'}">${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    return '';
  }
  function openWin(id) {
    const same = st.win === id || (REALM_TABS.includes(id) && REALM_TABS.includes(st.win) && id === 'overview');
    st.win = same ? null : id; st.topF = false; st.fan = null; st.drop = null; st.moment = null; st.menu = false; render();
  }
  function openFloat(id) {
    if (!st.floats.includes(id)) {
      const n = st.floats.length;
      if (!st.fpos[id]) st.fpos[id] = { x: 1440 - FW[id] - 12 - n * 30, y: 64 + n * 30 };
      st.floats.push(id);
    } else st.floats = [...st.floats.filter(x => x !== id), id];
    st.topF = true; st.menu = false; st.fan = null;
  }
  $('#win').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]'); if (tab) { st.win = tab.dataset.tab; render(); return; }
    if (e.target.closest('[data-act="close-win"]')) { st.win = null; render(); return; }
    const buy = e.target.closest('[data-buy]'); if (buy) { tryAsk(ASK.idea(buy.dataset.buy)); return; }
    if (e.target.closest('[data-hand]')) { st.moment = 'hand'; st.play = null; render(); return; }
    const row = e.target.closest('[data-goto]'); if (row) { pick(row.dataset.goto); return; }
    st.topF = false; render();
  });
  $('#seal').addEventListener('click', () => openWin('overview'));
  railEl.addEventListener('click', e => { const b = e.target.closest('[data-win]'); if (b) openWin(b.dataset.win); });

  // floating windows: kept as elements by id, so dragging and typing never rebuild them
  const floatHost = $('#float');
  function floatInner(id) {
    const head = `<header class="ih" data-drag="1"><span class="grip" aria-hidden="true"></span><img class="k" src="${ico(WIN_ICON[id])}" alt=""><div><h3>${WIN_TITLE[id]}</h3><p>${WIN_SUB[id]}</p></div><button class="x" type="button" data-act="close-float" aria-label="Close">×</button></header>`;
    return head + (id === 'codex' ? winBody(id) : `<div class="wb">${winBody(id)}</div>`);
  }
  function renderFloats() {
    for (const el of [...floatHost.children]) if (!st.floats.includes(el.dataset.id)) el.remove();
    st.floats.forEach((id, i) => {
      let el = floatHost.querySelector(`.fw[data-id="${id}"]`);
      if (!el) { el = document.createElement('section'); el.className = `fw ${id}-f`; el.dataset.id = id; el.setAttribute('aria-label', WIN_TITLE[id]); floatHost.appendChild(el); }
      setHtml(el, floatInner(id));
      const p = st.fpos[id]; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.zIndex = 26 + i;
    });
  }
  let drag = null;
  floatHost.addEventListener('pointerdown', e => {
    const w = e.target.closest('.fw'); if (!w) return;
    const id = w.dataset.id;
    if (st.floats[st.floats.length - 1] !== id || !st.topF) { st.floats = [...st.floats.filter(x => x !== id), id]; st.topF = true; st.floats.forEach((f, i) => { const el = floatHost.querySelector(`.fw[data-id="${f}"]`); if (el) el.style.zIndex = 26 + i; }); }
    if (!e.target.closest('[data-drag]') || e.target.closest('button,input')) return;
    drag = { id, el: w, sx: e.clientX, sy: e.clientY, x: st.fpos[id].x, y: st.fpos[id].y };
    w.classList.add('dragging'); w.setPointerCapture(e.pointerId); e.preventDefault(); closeTips(0);
  });
  floatHost.addEventListener('pointermove', e => {
    if (!drag) return;
    const x = Math.max(120 - FW[drag.id], Math.min(1440 - 120, drag.x + (e.clientX - drag.sx) / K));
    const y = Math.max(50, Math.min(900 - 60, drag.y + (e.clientY - drag.sy) / K));
    st.fpos[drag.id] = { x, y }; drag.el.style.left = x + 'px'; drag.el.style.top = y + 'px';
  });
  const endDrag = () => { if (drag) { drag.el.classList.remove('dragging'); drag = null; LS.set('hegemony-ui-fpos', st.fpos); render(); } };
  floatHost.addEventListener('pointerup', endDrag); floatHost.addEventListener('pointercancel', endDrag);
  floatHost.addEventListener('click', e => {
    const x = e.target.closest('[data-act="close-float"]'); if (x) { const id = x.closest('.fw').dataset.id; st.floats = st.floats.filter(f => f !== id); render(); return; }
    const ch = e.target.closest('[data-ch]'); if (ch) { st.chapter = +ch.dataset.ch; render(); return; }
  });
  floatHost.addEventListener('input', e => {
    if (e.target.matches('input[type="search"]')) {
      st.q = e.target.value; const pos = e.target.selectionStart;
      render(); const i = $('#float input[type="search"]'); if (i && document.activeElement !== i) { i.focus(); i.setSelectionRange(pos, pos); }
    }
  });

  // the menu
  function menuHtml() {
    if (!st.menu) return '';
    const row = (id, icon, n, sub) => `<button type="button" role="menuitem" data-float="${id}"><img src="${ico(icon)}" alt=""><b>${n}</b><span>${sub}</span>${st.floats.includes(id) ? '<em>Open</em>' : ''}</button>`;
    return `<div class="menu" role="menu" aria-label="Menu">${row('victory', 'victory/laurel', 'Victory', 'The six titles, and who is close')}${row('codex', 'chrome/codex', 'Codex', 'The rules by chapter, with search')}${row('costs', 'market/treasury', 'Costs', 'Every price under today’s Laws')}${row('plates', 'settlements/slot', 'Plates', 'How tile badges look')}</div>`;
  }
  $('#menu-btn').addEventListener('click', e => { e.stopPropagation(); st.menu = !st.menu; st.fan = null; render(); });
  $('#menu').addEventListener('click', e => { const b = e.target.closest('[data-float]'); if (b) { openFloat(b.dataset.float); render(); } });
  stage.addEventListener('pointerdown', e => { if (st.menu && !e.target.closest('#menu, #menu-btn')) { st.menu = false; render(); } }, true);

  // ── outliner: right edge, under the table ──
  const GOODS = TILES.flatMap(t => t.towns.filter(w => w.port).map(w => ({ good: w.port, owner: w.owner, town: w.name, id: t.id })));
  const RIVALS = TILES.flatMap(t => t.towns.filter(w => w.owner !== ME).map(w => ({ t, w }))).sort((a, b) => ORDER.indexOf(a.w.owner) - ORDER.indexOf(b.w.owner) || b.w.total - a.w.total);
  function outlHtml() {
    const o = st.outl;
    if (!o.open) return `<button class="ol-tab" type="button" data-ol="open" data-tip="outl">Outliner ◂</button>`;
    const sec = (key, title, count, body) => `<section class="osec"><button class="osh" type="button" data-sec="${key}" aria-expanded="${!o.shut[key]}"><i>${o.shut[key] ? '▸' : '▾'}</i>${title}<span>${count}</span></button>${o.shut[key] ? '' : body}</section>`;
    const out = [];
    if (o.cfg) {
      const box = (k, label) => `<label><input type="checkbox" data-show="${k}" ${o.show[k] ? 'checked' : ''}>${label}</label>`;
      const so = (k, label) => `<button type="button" data-sort="${k}" aria-pressed="${o.sort === k}">${label}</button>`;
      out.push(`<div class="ocfg"><h6>Show</h6>${box('settle', 'Your settlements')}${box('trade', 'Trade: offers and goods')}${box('assembly', 'The Assembly')}${box('rivals', 'Rivals’ settlements')}<h6 style="margin-top:4px">Sort your places</h6><div class="seg3">${so('needs', 'Needs you')}${so('people', 'People')}${so('az', 'A–Z')}</div></div>`);
    }
    if (o.show.settle) {
      const rank = x => ({ warn: 0, good: 1 }[nextFor(x).k] ?? 2);
      const list = [...MY].sort((a, b) => o.sort === 'people' ? b.w.total - a.w.total : o.sort === 'az' ? a.w.name.localeCompare(b.w.name) : rank(a) - rank(b) || a.w.name.localeCompare(b.w.name));
      out.push(sec('settle', 'Your settlements', MY.length, list.map(x => { const nx = nextFor(x), { t, w } = x; return `<button class="orow ${st.pick === t.id ? 'on' : ''}" type="button" data-goto="${t.id}"><img class="ic" src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt=""><span class="nm">${nameCase(w.name)}</span><span class="n">${w.total}/${room(w)}</span><span class="sub ${nx.k}">${nx.s}</span></button>`; }).join('')));
    }
    if (o.show.trade) {
      out.push(sec('trade', 'Trade', st.offer ? '1 offer' : 'no offers', (st.offer ? `<button class="orow on" type="button" data-odrop="offer"><span class="sd" style="background:${SEATS.Theron.c}">Θ</span><span class="nm">Theron offers you</span><span class="n">Answer ▸</span><span class="sub warn">Wants 2 influence, gives 3 gold</span></button>` : '') + `<button class="orow" type="button" data-ocomp="1"><img class="ic" src="${ico('market/handshake')}" alt=""><span class="nm">${st.offer ? 'Make an offer' : 'No offers open'}</span><span class="n">Offer ▸</span><span class="sub">Offers close when the turn ends</span></button>`
        + GOODS.map(g => `<button class="orow" type="button" data-goto="${g.id}"><img class="ic" src="${ico('resources/luxury')}" alt=""><span class="nm">${g.good}</span><span class="n">${seatDot(g.owner)}</span><span class="sub">${g.owner}’s, by the Port at ${nameCase(g.town)}</span></button>`).join('')
        + `<button class="orow" type="button" data-goto="-2,-1"><img class="ic" src="${ico('resources/luxury')}" alt=""><span class="nm">Tyrian Dye</span><span class="n"></span><span class="sub good">Free · a Port at Gortyn claims it, 2 stone</span></button>`));
    }
    if (o.show.assembly) {
      out.push(sec('assembly', 'The Assembly', 'in 2 turns', `<button class="orow" type="button" data-owin="agora"><img class="ic" src="${ico('assembly/agora')}" alt=""><span class="nm">Next sitting</span><span class="n">2 turns</span><span class="sub">You hold 4 votes · 2 of 4 stelae stand</span></button>`
        + `<button class="orow" type="button" data-owin="agora"><img class="ic" src="${ico('assembly/law')}" alt=""><span class="nm">Harbour Dues</span><span class="n">${seatDot('Damon')}</span><span class="sub">Ports 2 stone; Marketplaces 3 wood, 4 gold</span></button>`
        + `<button class="orow" type="button" data-owin="agora"><img class="ic" src="${ico('assembly/law')}" alt=""><span class="nm">Frontier Spirit</span><span class="n">${seatDot('Damon')}</span><span class="sub">A free slave on founding; colonies hold 3</span></button>`));
    }
    if (o.show.rivals) {
      out.push(sec('rivals', 'Rivals’ settlements', RIVALS.length, RIVALS.map(({ t, w }) => `<button class="orow ${st.pick === t.id ? 'on' : ''}" type="button" data-goto="${t.id}"><span class="sd" style="background:${SEATS[w.owner].c}">${SEATS[w.owner].b}</span><span class="nm">${nameCase(w.name)}</span><span class="n">${w.total}</span><span class="sub">${w.owner}’s ${w.capital ? 'capital' : w.kind}${w.port ? ' · ' + w.port : ''}</span></button>`).join('')));
    }
    return `<aside class="outl" aria-label="Outliner"><header><b data-tip="outl">Outliner</b><button type="button" data-ol="cfg" aria-pressed="${o.cfg}" aria-label="Outliner settings" data-tip="outl-cfg"><img src="${ico('chrome/settings')}" alt=""></button><button type="button" data-ol="close" aria-label="Tuck the outliner away" data-tip="outl-close">—</button></header><div class="ob">${out.join('') || '<p class="onote" style="padding:10px 12px">Nothing chosen to show.</p>'}</div></aside>`;
  }
  $('#outl').addEventListener('click', e => {
    const b = e.target.closest('[data-ol]');
    if (b) { const k = b.dataset.ol; if (k === 'open') st.outl.open = true; else if (k === 'close') { st.outl.open = false; st.outl.cfg = false; } else st.outl.cfg = !st.outl.cfg; render(); return; }
    const s = e.target.closest('[data-sec]'); if (s) { st.outl.shut[s.dataset.sec] = !st.outl.shut[s.dataset.sec]; render(); return; }
    const so = e.target.closest('[data-sort]'); if (so) { st.outl.sort = so.dataset.sort; render(); return; }
    const g = e.target.closest('[data-goto]'); if (g) { pick(g.dataset.goto); return; }
    const w = e.target.closest('[data-owin]'); if (w) { st.win = null; openWin(w.dataset.owin); return; }
    if (e.target.closest('[data-ocomp]')) { st.to = 'table'; st.moment = 'composer'; render(); return; }
    const od = e.target.closest('[data-odrop]'); if (od) { st.drop = od.dataset.odrop; render(); }
  });
  $('#outl').addEventListener('change', e => { const k = e.target.dataset.show; if (k) { st.outl.show[k] = e.target.checked; render(); } });

  // ── the hand ──
  function handHtml() {
    const cards = hand();
    if (!cards.length) return `<div class="hand-empty" data-act="hand-view" role="button" tabindex="0"><img src="${ico('events/venture')}" alt=""><span><b>No cards held</b>Buy one in the dock: 2 gold, once a turn</span></div>`;
    return `<div class="tab">Hand · ${cards.length}<button type="button" data-act="hand-view">View<kbd>H</kbd></button></div>` + cards.map((c, i) => `<div class="hc" tabindex="0" data-card="${i}" aria-label="${DEV[c.id].n}">${dcHtml(c)}</div>`).join('');
  }
  handEl.addEventListener('click', e => { if (e.target.closest('[data-act="hand-view"], .hc')) { st.moment = 'hand'; st.play = null; st.fan = null; render(); } });
  function playHtml(p) {
    const c = hand()[p.i], d = DEV[c.id];
    let ask, opts = '', ready = false, line = '';
    if (c.id === 'settlers') {
      ask = 'Where does the freeman go?';
      opts = MY.map(({ t, w }) => { const left = room(w) - w.total; return `<button type="button" data-sel="tile" data-v="${t.id}" aria-pressed="${p.tile === t.id}" class="${left > 0 ? '' : 'off'}"><img src="${ico('settlements/' + (w.capital ? 'capital' : w.kind))}" alt=""><span>${nameCase(w.name)}<small>${w.total} of ${room(w)} · ${left > 0 ? left + ' room' : 'full'}</small></span></button>`; }).join('');
      ready = !!p.tile;
      line = ready ? `The chronicle will read: “Kyros played Settlers: a freeman in ${nameCase(byId[p.tile].towns.find(x => x.owner === ME).name)}.”` : 'Pick a settlement with room.';
    } else if (c.id === 'raiders') {
      ask = 'Which rival, and what do you take?';
      opts = ['Damon', 'Nikos', 'Theron'].map(s => `<button type="button" data-sel="seat" data-v="${s}" aria-pressed="${p.seat === s}">${seatDot(s)}<span>${s}<small>${GOLD[s]} gold in store</small></span></button>`).join('')
        + '<span style="flex-basis:100%;height:0"></span>'
        + ['wood', 'stone', 'food', 'gold'].map(k => `<button type="button" data-sel="res" data-v="${k}" aria-pressed="${p.res === k}"><img src="${ico('resources/' + k)}" alt=""><span>${cap(k)}<small>${k === 'gold' && p.seat ? 'takes ' + Math.min(3, GOLD[p.seat]) : 'up to 3, as they hold'}</small></span></button>`).join('');
      ready = !!(p.seat && p.res);
      line = !ready ? 'Pick a rival, then one kind.' : p.res === 'gold' ? `The chronicle will read: “Kyros played Raiders on ${p.seat}: took ${Math.min(3, GOLD[p.seat])} gold.”` : `Takes up to 3 ${p.res}, no more than ${p.seat} holds.`;
    }
    return `<div class="choose">${dcHtml(c, true)}<div><h4>${ask}</h4><p class="line">${d.text}</p><div class="opts">${opts}</div><footer><button type="button" data-act="play-go" ${ready ? '' : 'disabled'}>Play ${d.n}</button><button class="q" type="button" data-act="play-back">Back to the hand</button></footer><p class="line" style="margin-top:12px">${line}</p></div></div>`;
  }
  function handViewHtml() {
    const cards = hand(), p = st.play;
    let body;
    if (p) body = playHtml(p);
    else if (!cards.length) body = `<div class="row" style="padding:30px 26px"><p class="lead" style="margin:0">No cards held. Buy one here or in the dock for ${costHtml({ gold: 2 })}, once a turn: a yield pays at once, any other card comes here face down.</p></div>`;
    else body = `<div class="row">${cards.map((c, i) => { const why = blocked(c); return `<div class="slot2">${dcHtml(c, true)}${why ? `<span class="why">${why}</span>` : `<button type="button" data-play="${i}">Play</button>`}</div>`; }).join('')}</div>`;
    const facts = `<div class="facts2">
      <div><h6>Buy a card</h6>${costHtml({ gold: 2 })} once a turn. A yield pays on the draw; any other card comes to the hand, face down to the table.<br><button type="button" class="buy" data-act="buy">Buy a card</button></div>
      <div><h6>A free card</h6>When your turn ends at +3 happiness or higher. You stand at −2.</div>
      <div><h6>At risk</h6>A Riot may take a held card in place of a pop. A rival’s Informer discards one at random.</div></div>`;
    const sub = `${cards.length} held · 40 in the deck · Theron holds 1 · one played a turn`;
    return `<div class="scrim" data-act="close-moment"><div class="handv" role="dialog" aria-label="Your hand"><header class="ih"><img class="k" src="${ico('events/venture')}" alt=""><div><h3>${p ? 'Play ' + DEV[cards[p.i].id].n : 'Your hand'}</h3><p>${sub}</p></div><button class="x" type="button" data-act="close-moment" aria-label="Close">×</button></header>${body}${p ? '' : facts}</div></div>`;
  }

  // ── alarms, drops, moments ──
  document.querySelectorAll('.alarm').forEach(a => a.addEventListener('click', () => {
    const k = a.dataset.alarm;
    if (k === 'year') { st.moment = st.moment === 'year' ? null : 'year'; st.drop = null; }
    else st.drop = st.drop === k ? null : k;
    st.fan = null; render();
  }));
  $('.endturn').addEventListener('click', () => toast('Hold to end the turn.'));
  $('#asm-pill').addEventListener('click', () => { st.asmMin = false; st.moment = 'assembly'; render(); });
  $('#chron').addEventListener('click', () => { st.drop = st.drop === 'chron' ? null : 'chron'; st.fan = null; render(); });
  $('#mood').addEventListener('click', () => { st.drop = st.drop === 'mood' ? null : 'mood'; st.fan = null; st.menu = false; render(); });
  // the chronicle opens out of its last line: oldest at the top, the newest just above the line
  const LOG = (() => { const g = []; CHRON.forEach(r => r[0] === 'Y' ? g.push([r]) : g[g.length - 1].push(r)); g[0].splice(1, 1); return g.reverse().flatMap(([y, ...es]) => [y, ...es.reverse()]); })();
  const logw = $('#logw');
  logw.innerHTML = `<header>Chronicle · Years XI and XII<button type="button" data-act="close-log" aria-label="Close">×</button></header><div class="log">${LOG.map(([s, text]) => s === 'Y' ? `<div class="yr">${text}</div>` : `<div>${s ? `<span class="dot" style="background:${SEATS[BY_SEAL[s]].c}">${s}</span>` : '<span></span>'}<span>${text}</span></div>`).join('')}</div>`;
  logw.querySelector('.log').scrollTop = 1e6;
  logw.addEventListener('click', e => { if (e.target.closest('[data-act="close-log"]')) { e.stopPropagation(); st.drop = null; render(); } });
  function seatCard(who, style) {
    const s = SEAT_INFO[who], held = TITLES.filter(t => t.held === who).map(t => t.n);
    const r = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    const sub = { Damon: 'Plays next', Nikos: 'Plays after Damon', Theron: 'Plays after Nikos' }[who];
    return `<div class="threat seatcard" style="${style}"><header class="ih"><span class="who" style="background:${SEATS[who].c}">${SEATS[who].b}</span><div><h3>${who}</h3><p>${sub} · ${held.length} of 3 titles</p></div><button class="x" type="button" data-act="close-drop" aria-label="Close">×</button></header>
      <dl class="ledger">${r('People', `${s.citizens} citizens · ${s.freemen} freemen · ${s.slaves} slaves`)}${r('Places', `${s.cities} cities · ${s.colonies} colonies`)}${r('Happiness', `<span class="${s.happy.startsWith('+') ? 'up' : 'dn'}">${s.happy}</span>`)}${r('Gold', `${GOLD[who]} in store`)}${r('Titles', held.length ? held.join(', ') + (held.length >= 3 ? ' <span class="dn">· wins when their turn starts</span>' : '') : 'none')}${r('Assembly', `${s.laws} Laws authored · ${s.votes} votes`)}${r('Cards', `${s.dev} development card${s.dev === 1 ? '' : 's'} held`)}${r('Ideas', s.ideas.join(', '))}</dl>
      <div class="ia"><button class="act go" type="button" data-act="offer" data-to="${who}"><span>Offer ${who} a trade</span></button></div></div>`;
  }
  function moodCard(style) {
    const calm = (n, c) => { const why = shortfall(c); return `<button class="act ${why ? 'off' : 'go'}" type="button" data-act="calm" data-pay="${Object.keys(c)[0]}"><span>${n}</span>${costHtml(c)}${why ? `<span class="why">${why}</span>` : ''}</button>`; };
    return `<div class="threat" style="${style}"><header class="ih"><img class="k" src="${ico('unrest/discontent')}" alt=""><div><h3>Happiness −2</h3><p>Discontent · a Riot starts at −3</p></div><button class="x" type="button" data-act="close-drop" aria-label="Close">×</button></header>
      <div class="row"><img src="${ico('pops/slaves')}" alt=""><b>Why −2</b><span>+1 from the Temple in Rhodos, −3 for 6 slaves. No Unrest tokens: Festival cleared them.</span></div>
      <div class="row"><img src="${ico('unrest/riot')}" alt=""><b>One step from a Riot</b><span>End a turn at −3 or below and a Riot rolls before the turn passes. −6 is a Revolt.</span></div>
      <div class="row"><img src="${ico('unrest/calm-verb')}" alt=""><b>Calm</b><span>+2 until the year turns, up to three a turn: −2 → <span class="up">0</span>. It does not count toward Beloved of the People.</span></div>
      <div class="ia">${calm('Calm, paid in gold', { gold: 2 })}${calm('Calm, paid in influence', { influence: 2 })}</div></div>`;
  }
  function dropHtml(dockTop, cornerW) {
    const bottom = 900 - dockTop + 8;
    if (st.drop === 'seat') return seatCard(st.who, `left:${cornerW + 8}px;top:auto;bottom:8px;width:400px`);
    if (st.drop === 'mood') { const r = rel($('#mood')); return moodCard(`width:440px;top:54px;left:${Math.round(r.x + r.w - 440)}px`); }
    if (st.drop === 'unrest') return moodCard('width:440px;left:150px');
    if (st.drop === 'threat') {
      const row = (icon, n, lead, gapTxt) => `<div class="row"><img src="${ico(icon)}" alt=""><b>${n}</b><span>${lead}</span><em>${gapTxt}</em></div>`;
      return `<div class="threat"><header class="ih"><span class="who" style="background:${SEATS.Nikos.c}">Ν</span><div><h3>Three titles</h3><p>Nikos wins when their turn starts · after you and Damon</p></div><button class="x" type="button" data-act="close-drop" aria-label="Close">×</button></header>
        ${row('victory/polis-builder', 'Polis Builder', 'Nikos 3 cities · next best Damon 2', 'Damon is 1 city short of a tie')}
        ${row('victory/civic-elite', 'Civic Elite', 'Nikos 6 citizens · next best Theron 5', 'Theron is 1 citizen short of a tie')}
        ${row('victory/beloved', 'Beloved of the People', 'Nikos happiness +4 · next best Damon 2', 'Damon is 2 happiness short of a tie')}
        <div class="row" style="background:var(--g-bone)"><img src="${ico('market/handshake')}" alt=""><b>What you can do</b><span>A tie breaks a title. You cannot reach one alone this turn; a trade that lifts Damon or Theron can.</span></div></div>`;
    }
    if (st.drop === 'riotask') {
      return `<div class="drop ask" style="bottom:${bottom}px"><header>Ending your turn starts a Riot<button type="button" data-act="close-drop" aria-label="Close">×</button></header><div class="askb"><p>You hold no Unrest tokens to clear, so you roll on the Riot table.</p><p class="hint"><img src="${ico('unrest/calm-verb')}" alt="">Calm gives +2 and holds the line.</p><div class="ia"><button class="act go" type="button" data-act="calm-end"><span>Calm, then end</span>${costHtml({ gold: 2 })}</button><button class="act" type="button" data-act="face" style="background:var(--g-bone);color:var(--g-ink)"><span>Face the Riot</span></button></div></div></div>`;
    }
    if (st.drop === 'offer') {
      return `<div class="threat" style="width:460px"><header class="ih"><span class="who" style="background:${SEATS.Theron.c}">Θ</span><div><h3>Theron offers Kyros</h3><p>To chosen seats · every seat sees it</p></div><button class="x" type="button" data-act="close-drop" aria-label="Close">×</button></header>
        <div class="ofr"><div><h5>Theron wants</h5>${costHtml({ influence: 2 })}</div><span aria-hidden="true">⇄</span><div><h5>Theron gives</h5>${gain('gold', 3)}</div></div>
        <div class="row"><img src="${ico('market/handshake')}" alt=""><b>The first to accept trades</b><span>Kyros, holds 9 influence. After it: influence 9 → <span class="dn">7</span>, gold 2 → <span class="up">5</span>.</span></div>
        <div class="ia"><button class="act" type="button" data-act="ans" style="background:var(--g-bone);color:var(--g-ink)"><span>Decline</span></button><button class="act" type="button" data-act="ans" style="background:var(--g-bone);color:var(--g-ink)"><span>Counter</span></button><button class="act go" type="button" data-act="ans"><span>Accept</span></button></div></div>`;
    }
    if (st.drop === 'port') {
      const c = { stone: 2 };
      return `<div class="threat" style="width:400px;left:150px"><header class="ih"><img class="k" src="${ico('resources/luxury')}" alt=""><div><h3>A free luxury</h3><p>Tyrian Dye, beside Gortyn</p></div><button class="x" type="button" data-act="close-drop" aria-label="Close">×</button></header>
        <div class="row"><img src="${ico('buildings/port')}" alt=""><b>A Port at Gortyn claims it</b><span>+2 happiness for as long as you hold it</span></div>
        <div class="ia"><button class="act off" type="button" data-goto="-2,-1"><span>Show Gortyn</span>${costHtml(c)}<span class="why">${shortfall(c)}</span></button></div></div>`;
    }
    return '';
  }
  $('#drop').addEventListener('click', e => {
    if (e.target.closest('[data-act="close-drop"]')) { st.drop = null; render(); return; }
    if (e.target.closest('[data-act="face"]')) { st.drop = null; st.moment = 'riot'; render(); return; }
    if (e.target.closest('[data-act="calm-end"]')) { st.drop = null; render(); return; }
    if (e.target.closest('[data-act="ans"]')) { st.drop = null; st.offer = false; render(); return; }
    const g = e.target.closest('[data-goto]'); if (g) { st.drop = null; pick(g.dataset.goto); return; }
    const c = e.target.closest('[data-act="calm"]'); if (c) { tryAsk(ASK.calm(c.dataset.pay)); return; }
    const of = e.target.closest('[data-act="offer"]'); if (of) { st.drop = null; st.to = of.dataset.to; st.moment = 'composer'; render(); return; }
  });
  const gain = (k, v) => `<span class="cost"><span><img src="${ico('resources/' + k)}" alt="${k}">+${v}</span></span>`;
  function assemblyHtml() {
    const pol = [['Demosthenes', 'Agricultural reformer', 'Food, labour and the social ladder.', 'food', 'Laws'], ['Perdiccas', 'Urban planner', 'Capital growth and City Buildings.', 'stone', 'Laws'], ['Kleistophenes', 'Rural expansionist', 'Colonies, their Buildings and their Votes.', 'wood', 'Laws'], ['Stratokles', 'Cunning populist', 'Directives aimed at a rival.', 'gold', 'Directives']];
    const rail = ['Proposal', 'Ballot', 'Vote', 'Rises'].map((n, i) => `<span class="${i === 0 ? 'on' : ''}">${n}</span>`).join('<i>›</i>');
    return `<div class="scrim"><div class="asm" role="dialog" aria-label="The Assembly">
      <header class="asm-h"><div><span class="kick">ΕΚΚΛΗΣΙΑ</span><h3>The Assembly</h3><p>7th sitting of 7 · Year XIV</p></div><nav class="asm-rail" aria-label="Stages">${rail}</nav><button type="button" class="asm-min" data-act="asm-min">▾ Minimise</button></header>
      <div class="asm-b"><h5>Draw from a politician</h5>
        <div class="pols">${pol.map(([n, role, dom, good, kind]) => `<div class="pol"><img src="${ico('assembly/politician')}" alt=""><b>${n}</b><span class="role">${role}</span><p>${dom}</p><span class="prize">Author’s prize ${gain(good, 2)} · ${kind}</span><button type="button" data-act="asm-draw" data-n="${n}">Draw ${costHtml({ influence: 2 })}</button></div>`).join('')}</div>
        <div class="asm-two"><div><h5>Standing laws</h5><div class="alaws">${STANDING}</div></div>
        <div class="asm-act"><button type="button" class="act go" data-act="asm-repeal"><span>Repeal a Law</span>${costHtml({ influence: 3 })}</button><button type="button" class="act peace" data-act="asm-peace"><span>Hold your peace</span></button><p>Your votes this sitting: <b>4</b> (1 + 3 Citizens)</p></div></div></div>
      <footer class="asm-f">${ORDER.map(x => `<span class="chipseat">${seatDot(x)}<span><b>${x === ME ? 'Kyros · you' : x}</b><i>${x === ME ? 'your choice' : 'deciding…'}</i></span></span>`).join('')}<em>Each seat decides in secret, in turn order.</em></footer>
    </div></div>`;
  }
  function riotHtml() {
    const ins = st.ins, n = ['dole', 'conc', 'pat'].filter(k => ins[k]).length;
    const row = (k, name, line, why) => `<label class="ins ${ins[k] ? 'on' : ''} ${why ? 'off' : ''}"><input type="checkbox" data-ins="${k}" ${ins[k] ? 'checked' : ''} ${why ? 'disabled' : ''}><span><b>${name}</b>${line}${why ? `<em>${why}</em>` : ''}</span></label>`;
    const T = [['The mob torches the works', '−1 Pop  −1 Building'], ['Revolt spreads', '−2 Pops'], ['Blood in the streets', '−1 Pop'], ['Granary sacked', '−3 Food'], ['Bribe demanded', '−3 Gold (short: −1 Pop)'], ['The mob disperses', '—']];
    return `<div class="scrim"><div class="rio" role="dialog" aria-label="Riot"><header class="rio-h"><span class="kick">Turn end · Kyros’s realm</span><h3>Riot</h3><p>The agora fills with angry voices. Declare your concessions before the die decides.</p></header>
      <div class="rio-b"><div><h5>Insurance</h5>${row('dole', 'Bread Dole', ` ${costHtml({ food: 4 })} · +1`, shortfall({ food: 4 }))}${row('conc', 'Concession', ' Demote a Citizen in <b>Rhodos</b> · +1')}${row('pat', 'Patronage', ` ${costHtml({ influence: 3 })} · +1`)}<p class="note">Each one declared adds +1 to the roll, paid now. You hold no Unrest tokens to clear.</p></div>
      <div><h5>The table</h5><ol class="rtable">${T.map(([a, b], i) => `<li class="${i < n ? 'gone' : ''}"><i>${i + 1}</i><span>${a}</span><b>${b}</b></li>`).join('')}</ol><p class="note">${n ? `You roll a d6 +${n}: the worst you can roll is a ${1 + n}.` : 'You roll a d6. Each insurance puts the lowest row out of reach.'}</p></div></div>
      <footer class="rio-f"><span>Losses take Slaves first.</span><button type="button" data-act="roll">Roll the die${n ? ' · +' + n : ''}</button></footer></div></div>`;
  }
  function hungerHtml() {
    const rows = MY.filter(({ w }) => w.total).map(({ w }) => {
      const tok = [];
      ['citizens', 'freemen', 'slaves'].forEach(k => { for (let i = 0; i < w.pops[k]; i++) { const id = `${w.name}:${k}:${i}`; tok.push(`<button type="button" class="ptok ${k === 'slaves' ? 'off' : ''} ${st.leave === id ? 'on' : ''}" ${k === 'slaves' ? 'disabled' : `data-leave="${id}"`} title="${{ citizens: 'Citizen', freemen: 'Freeman', slaves: 'Slave' }[k]} of ${nameCase(w.name)}"><img src="${ico('pops/' + k)}" alt=""></button>`); } });
      return `<div class="hrow"><b>${w.name}</b><span>${tok.join('')}</span></div>`;
    }).join('');
    return `<div class="scrim"><div class="card hung" role="dialog" aria-label="Hunger"><div class="kind">Turn end</div><h3>Hunger</h3><blockquote>Food runs short. One pop must leave before the next harvest.</blockquote><div class="fx"><b class="dn"><img src="${ico('unrest/starvation')}" alt="">−1</b>Pop · choose one mouth to send away</div>
      <div class="hrows">${rows}</div><div class="hcap"><span>Slaves eat nothing, so they never leave for Hunger.</span><b class="${st.leave ? 'up' : ''}">${st.leave ? 1 : 0} of 1 chosen</b></div>
      <div class="deck">Next: your turn ends · Food returns to 0 · no debt</div><footer><button type="button" class="q" data-act="close-moment">Go back</button><button type="button" data-act="let-go" ${st.leave ? '' : 'disabled'}>Let them go</button></footer></div></div>`;
  }
  function momentHtml() {
    if (st.moment === 'hand') return handViewHtml();
    if (st.moment === 'assembly') return assemblyHtml();
    if (st.moment === 'riot') return riotHtml();
    if (st.moment === 'hunger') return hungerHtml();
    if (st.moment === 'drawn') {
      const d = DEV[st.drawn], y = d.kind === 'yield';
      return `<div class="scrim"><div class="card" style="width:440px" role="dialog" aria-label="A development card"><div class="kind">Development card · Kyros buys one</div><div style="display:flex;justify-content:center;padding:18px 0 14px">${dcHtml({ id: st.drawn }, true)}</div><div class="fx">${y ? `<b class="up"><img src="${ico('resources/wood')}" alt="">+6</b>+6 Wood: 1 for each of your 6 settlements.` : 'Kept in your hand. You can play it from your next turn.'}</div><div class="deck">2 gold paid · Kyros buys</div><footer><button type="button" data-act="close-moment">${y ? 'Take the wood' : 'Keep it'}</button></footer></div></div>`;
    }
    if (st.moment === 'year') {
      const left = [['Drought', 0], ['Wildfire', 0], ['Silent Mines', 0], ['Piracy', 1], ['Ostracism', 1], ['Blockade', 0], ['Plague', 0], ['Festival', 0]];
      return `<div class="scrim" data-act="close-moment"><div class="card" role="dialog" aria-label="Year card"><div class="kind">Year XII · this year’s card</div><h3>Festival</h3><blockquote>“Garlands on every door, and old quarrels left at the gate.”</blockquote><div class="fx"><b><img src="${ico('unrest/unrest')}" alt="Unrest tokens">→ 0</b>Everyone clears their Unrest tokens.</div><div class="deck">2 of 14 left in the year deck</div><div class="odds">${left.map(([n, v]) => `<span>${n}<b>${v}</b></span>`).join('')}</div><footer><button type="button" data-act="close-moment">Close</button></footer></div></div>`;
    }
    if (st.moment === 'fate') {
      return `<div class="scrim"><div class="card" role="dialog" aria-label="Fate card"><div class="kind">Fate · Kyros draws</div><h3>Patronage</h3><blockquote>“A rich family wants its name cut beside yours.”</blockquote><div class="fx"><b class="up"><img src="${ico('resources/influence')}" alt="">+2</b>Gain 2 influence.</div><div class="deck">38 of 40 fates left</div><footer><button type="button" data-act="close-moment">Take the influence</button></footer></div></div>`;
    }
    if (st.moment === 'composer') {
      const to = st.to || 'table';
      const pill = (who) => `<button type="button" data-to="${who}" aria-pressed="${to === who}">${who === 'table' ? '<i style="background:var(--g-ink)">✦</i>The table' : `<i style="background:${SEATS[who].c}">${SEATS[who].b}</i>${who}`}</button>`;
      const chip = (side, k, icon, label) => { const n = st.deal[side][k] || 0; return `<button class="chip" type="button" data-add="${side}" data-k="${k}" aria-pressed="${n > 0}"><img src="${ico(icon)}" alt="">${n ? `<b>${n}</b> ` : ''}${label}</button>`; };
      const add = (side) => ['wood', 'stone', 'food', 'gold', 'influence'].map(k => chip(side, k, 'resources/' + k, k)).join('') + chip(side, 'pop', 'pops/crowd', 'a pop');
      const said = side => Object.entries(st.deal[side]).map(([k, v]) => `${v} ${k === 'pop' ? (v > 1 ? 'pops' : 'pop') : k}`).join(', ');
      const ready = said('want') && said('give');
      return `<div class="scrim" data-act="close-moment"><div class="composer" role="dialog" aria-label="Offer a trade"><header class="ih"><span class="who" style="background:#a83226">Κ</span><div><h3>Offer a trade</h3><p>They answer on the alarms row</p></div><button class="x" type="button" data-act="close-moment" aria-label="Close">×</button></header>
        <div class="to">To ${['Damon', 'Nikos', 'Theron'].map(pill).join('')}${pill('table')}</div>
        <div class="sides"><div class="side"><h5>I want</h5><div class="add">${add('want')}</div></div><div class="side"><h5>I give</h5><div class="add">${add('give')}</div><p class="note" style="margin-top:10px">You hold 1 wood, 1 stone, 2 gold, 9 influence.</p></div></div>
        <footer><span>${ready ? `You want ${said('want')} for ${said('give')}. <button class="chip" type="button" data-act="deal-clear">Clear</button>` : 'Add something on each side.'}</span><button type="button" data-act="deal-send" ${ready ? '' : 'disabled'}>Offer to ${to === 'table' ? 'the table' : to}</button></footer></div></div>`;
    }
    return '';
  }
  $('#moment').addEventListener('change', e => { const k = e.target.dataset.ins; if (k) { st.ins[k] = e.target.checked; render(); } });
  $('#moment').addEventListener('click', e => {
    if (e.target.closest('[data-act="asm-min"]')) { st.moment = null; st.asmMin = true; render(); return; }
    const ad = e.target.closest('[data-act^="asm-"]');
    if (ad) {
      if (ad.dataset.act === 'asm-draw') tryAsk({ icon: 'assembly/politician', what: `draw a Law from ${ad.dataset.n}`, cost: { influence: 2 }, more: 'Only you see it until the ballot is read.', go: 'Draw' });
      else if (ad.dataset.act === 'asm-repeal') tryAsk({ icon: 'assembly/repeal', what: 'propose a repeal', cost: { influence: 3 }, more: 'You pick the Law at the ballot.', go: 'Propose it' });
      else { st.moment = null; render(); }
      return;
    }
    if (e.target.closest('[data-act="roll"]')) { st.moment = null; render(); return; }
    const lv = e.target.closest('[data-leave]'); if (lv) { st.leave = st.leave === lv.dataset.leave ? null : lv.dataset.leave; render(); return; }
    if (e.target.closest('[data-act="let-go"]')) { st.moment = null; render(); return; }
    const pl = e.target.closest('[data-play]'); if (pl) { st.play = { i: +pl.dataset.play }; render(); return; }
    const se = e.target.closest('[data-sel]'); if (se) { if (!se.classList.contains('off')) { st.play[se.dataset.sel] = se.dataset.v; render(); } return; }
    if (e.target.closest('[data-act="play-back"]')) { st.play = null; render(); return; }
    if (e.target.closest('[data-act="buy"]')) { tryAsk(ASK.buy()); return; }
    if (e.target.closest('[data-act="play-go"]')) { st.play = null; st.moment = null; render(); return; }
    const to = e.target.closest('[data-to]'); if (to) { st.to = to.dataset.to; render(); return; }
    const ad2 = e.target.closest('[data-add]'); if (ad2) { const d = st.deal[ad2.dataset.add], k = ad2.dataset.k; if (ad2.dataset.add === 'give' && k !== 'pop' && (d[k] || 0) >= STOCK[k]) { toast(`Not now: you hold ${STOCK[k]} ${k}.`); return; } d[k] = (d[k] || 0) + 1; render(); return; }
    if (e.target.closest('[data-act="deal-clear"]')) { st.deal = { want: {}, give: {} }; render(); return; }
    if (e.target.closest('[data-act="deal-send"]')) { const to = st.to || 'table'; st.deal = { want: {}, give: {} }; st.moment = null; toast(`Offer sent to ${to === 'table' ? 'the table' : to}. Answers come on the alarms row.`); render(); return; }
    const c = e.target.closest('[data-act="close-moment"]');
    if (c && (c === e.target || c.tagName === 'BUTTON')) { st.moment = null; st.play = null; render(); }
  });

  // ── map modes ──
  const LEGEND = {
    political: ['Political', 'Owned land in its realm’s colour, the realm’s name across it. Badges hidden.'],
    economy: ['Economy', 'Under each tile: what its worked slots make / slots free.'],
    trade: ['Trade', 'Goods and their holders, ship routes, and under each capital its export ↑ and import ↓.'],
  };
  document.querySelectorAll('.mode[data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; render(); }));
  function paintHtml() {
    if (st.mode !== 'political') return '';
    const cells = TILES.map(t => {
      const owner = t.towns[0]?.owner;
      const c = owner ? SEATS[owner].c : '#d8ccb0';
      return `<div class="paint" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;background:${c};opacity:${owner ? .93 : .82}"></div>`;
    }).join('');
    const names = Object.entries(CAPITAL).map(([id, who]) => { const t = byId[id]; return `<div class="realm-name" style="left:${t.x + t.w / 2}px;top:${t.y + t.h * .76}px">${who.toUpperCase()}</div>`; }).join('');
    return cells + names;
  }

  // ── pick, camera clearance ──
  function pick(id) { st.pick = id; st.fan = null; st.menu = false; if (st.drop === 'seat') st.drop = null; render(); }
  function clearance(t, boxes) {
    const m = 18;
    const hits = boxes.filter(b => t.y + t.h > b.y - m && t.y < b.y + b.h + m && t.x + t.w > b.x - m && t.x < b.x + b.w + m);
    if (!hits.length) return 0;
    const right = Math.max(...hits.map(b => b.x + b.w)) + 48 - t.x;
    const left = Math.min(...hits.map(b => b.x)) - 48 - (t.x + t.w);
    const ok = dx => t.x + dx > 70 && t.x + t.w + dx < 1370;
    const cands = [right, left].filter(ok).sort((a, b) => Math.abs(a) - Math.abs(b));
    return cands[0] ?? 0;
  }

  // ── today stills: the live build in the same state ──
  const OLD = 'TODAY · c09175c, this board';
  const NEW = 'TODAY · main c0739d0, a dev scene on another board';
  function today() {
    if (st.drop === 'seat') return ['img/today-rival.jpg', OLD];
    if (st.moment === 'assembly') return ['img/today-asm.jpg', NEW];
    if (st.moment === 'riot') return ['img/today-riot.jpg', NEW];
    if (st.moment === 'hunger') return ['img/today-hunger.jpg', NEW];
    if (st.drop === 'riotask') return ['img/today-riotask.jpg', NEW];
    if (st.drop === 'offer') return ['img/today-offer.jpg', NEW];
    if (st.moment === 'hand') return [st.play && hand()[st.play.i]?.id === 'raiders' ? 'img/today-play-raiders.jpg' : st.play ? 'img/today-play.jpg' : 'img/today-hand.jpg', NEW];
    if (st.moment === 'drawn') return [DEV[st.drawn].kind === 'yield' ? 'img/today-drawn.jpg' : 'img/today-drawn-held.jpg', NEW];
    if (st.moment === 'year') return ['img/today-year.jpg', OLD];
    if (st.moment === 'fate') return ['img/today-fate.jpg', OLD];
    if (st.moment === 'composer') return ['img/today-composer.jpg', OLD];
    if (st.menu) return ['img/today-default.jpg', OLD];
    if (st.drop === 'mood') return ['img/today-fan-civic.jpg', OLD];
    if (st.drop) return [`img/today-${st.drop}.jpg`, OLD];
        if (st.fan) return [`img/today-fan-${st.fan}.jpg`, OLD];
    const f = st.floats[st.floats.length - 1];
    if (f && (st.topF || !st.win)) return [`img/today-${f}.jpg`, OLD];
    if (st.win) return [`img/today-${st.win === 'overview' ? 'default' : st.win}.jpg`, OLD];
    const t = st.pick && byId[st.pick];
    if (!t) return ['img/today-default.jpg', OLD];
    if (!t.towns.length) return ['img/today-land.jpg', OLD];
    return [t.towns.some(x => x.owner === ME) ? 'img/today-city.jpg' : 'img/today-rival.jpg', OLD];
  }

  let lastWin = null;
  function render() {
    $('#map').src = `img/map-${st.mode}.jpg`;
    setHtml($('#paint'), paintHtml());
    document.querySelectorAll('.mode[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)));
    const lg = $('#legend');
    if (LEGEND[st.mode]) { lg.hidden = false; setHtml(lg, `<b>${LEGEND[st.mode][0]}</b><span>${LEGEND[st.mode][1]}</span>`); } else lg.hidden = true;

    // the corner: the inspector alone, at its own height; with nothing picked the corner is map
    const ih = inspHtml();
    let H = 0, iw = 0;
    if (ih) {
      clearTimeout(inspEl._t); setHtml(inspEl, ih);
      // with a drawer open, the inspector widens to the drawer's right-hand edge, so the two read as one block
      const sec = inspEl.querySelector('.insp');
      const own = sec.classList.contains('s') ? 360 : 540;
      iw = !st.win ? own : st.b ? Math.max(own, 64 + DOCK_W) : 64 + DRAWER_W;
      sec.style.width = iw + 'px';
      H = sec.offsetHeight;
    } else if (inspEl._h) { clearTimeout(inspEl._t); inspEl._t = setTimeout(() => { if (!st.pick) setHtml(inspEl, ''); }, 280); }
    inspEl.style.width = iw + 'px';
    stage.classList.toggle('insp-open', !!ih);
    stage.classList.toggle('joined', !!(ih && st.win));
    const cornerW = iw, dockX = 1440 - DOCK_W;

    // the dock: the chronicle grows up out of its last line; the outliner above ends where the dock begins
    const logOpen = st.drop === 'chron';
    dock.classList.toggle('log-open', logOpen);
    if (logOpen && !render.logWas) logw.querySelector('.log').scrollTop = 1e6;
    render.logWas = logOpen;
    const dk = dock.querySelector('.dk');
    const dockTop = 900 - (dk.offsetHeight - logw.offsetHeight + (logOpen ? LOGH : 0)) - (lg.hidden ? 0 : lg.offsetHeight + 8);
    $('#chron').setAttribute('aria-expanded', String(logOpen));

    // the drawer runs from the rail's top to the inspector, or to the foot of the screen
    setHtml($('#win'), winHtml(st.win));
    const winEl = $('#win .win'), winH = 900 - TOP - (ih ? H : 0);
    if (winEl) { winEl.style.height = winH + 'px'; if (!lastWin) winEl.classList.add('enter'); }
    lastWin = st.win;
    if (st.b) {
      const floor = 900 - (ih ? H : 0), y = Math.max(TOP, Math.min(450 - RAIL_B / 2, floor - RAIL_B - 12));
      railEl.style.top = (st.win ? TOP : y) + 'px'; railEl.style.height = (st.win ? floor - TOP : RAIL_B) + 'px';
      railEl.style.paddingTop = (st.win ? y - TOP + 5 : 5) + 'px';
    } else { railEl.style.top = TOP + 'px'; railEl.style.height = (st.win ? 900 - TOP - H : RAIL) + 'px'; railEl.style.paddingTop = ''; }
    railEl.classList.toggle('tall', !!st.win);

    setHtml($('#outl'), outlHtml());
    const ol = $('#outl .outl'); if (ol) ol.style.maxHeight = (dockTop - 8 - OUTL_TOP) + 'px';

    // the hand stays put whatever opens beside it
    setHtml(handEl, handHtml());
    const [HAND_L, HAND_SPACE] = handBox();
    const n = hand().length, step = n > 1 ? Math.min(128, (HAND_SPACE - 120) / (n - 1)) : 0;
    const hw = n ? 120 + (n - 1) * step : 230;
    handEl.querySelectorAll('.hc').forEach((c, i) => { c.style.left = Math.round(i * step) + 'px'; });
    handEl.style.width = hw + 'px'; handEl.style.left = Math.round(HAND_L + (HAND_SPACE - hw) / 2) + 'px';

    renderFloats();
    setHtml($('#menu'), menuHtml());
    $('#menu-btn').setAttribute('aria-expanded', String(st.menu));

    // the inspector's Grow and Raise options pop beside it, level with its foot
    setHtml($('#fan'), st.fan ? fanHtml(st.fan) : '');
    const f = $('#fan .fan');
    if (f) { f.style.left = (cornerW + 8) + 'px'; f.style.top = Math.round(Math.max(58, 892 - f.offsetHeight)) + 'px'; }
    setHtml($('#drop'), dropHtml(dockTop, cornerW));
    setHtml($('#moment'), momentHtml());
    setHtml($('#cfm'), confirmHtml());
    if (st.confirm) $('#cfm [data-cfm="yes"]').focus({ preventScroll: true });
    $('#mood').setAttribute('aria-expanded', String(st.drop === 'mood'));
    $('#seal').setAttribute('aria-pressed', String(REALM_TABS.includes(st.win)));
    railEl.querySelectorAll('[data-win]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.win === st.win)));
    $('#asm-pill').hidden = !st.asmMin || st.moment === 'assembly';
    $('.alarm[data-alarm="offer"]').hidden = !st.offer;
    document.querySelectorAll('.alarm').forEach(a => a.setAttribute('aria-expanded', String(st.drop === a.dataset.alarm || (a.dataset.alarm === 'year' && st.moment === 'year'))));

    // the pick's ring, and the camera easing it clear of whatever would cover it
    const ring = $('#ring'); let dx = 0;
    const t = st.pick && byId[st.pick];
    if (t) {
      const p = 6;
      ring.setAttribute('width', t.w + 2 * p); ring.setAttribute('height', t.h + 2 * p);
      ring.style.left = (t.x - p) + 'px'; ring.style.top = (t.y - p) + 'px';
      const W = t.w, Hh = t.h;
      ring.querySelector('polygon').setAttribute('points', [[W / 2, 0], [W, Hh * .25], [W, Hh * .75], [W / 2, Hh], [0, Hh * .75], [0, Hh * .25]].map(([x, y]) => `${x + p},${y + p}`).join(' '));
      ring.style.display = '';
      const boxes = [{ x: 0, y: 900 - H, w: cornerW, h: H }, { x: 0, y: parseFloat(railEl.style.top), w: 64, h: parseFloat(railEl.style.height) }, { x: dockX, y: dockTop, w: DOCK_W, h: 900 - dockTop }, { x: parseFloat(handEl.style.left), y: 828, w: hw, h: 72 }];
      if (st.win) boxes.push({ x: 64, y: TOP, w: drawerW(), h: winH });
      document.querySelectorAll('#float .fw, #fan .fan, #drop > *, #outl > *').forEach(e => { if (e.offsetWidth) boxes.push(rel(e)); });
      dx = clearance(t, boxes);
    } else ring.style.display = 'none';
    world.style.transform = `translateX(${dx}px)`;
    stage.classList.toggle('is-today', st.today);
    stage.classList.toggle('b', st.b);
    const [src, tag] = today();
    $('#today-img').src = src;
    $('#stage-tag').textContent = st.today ? tag : st.b ? 'PROPOSAL B' : 'PROPOSAL';
    document.querySelectorAll('[data-shell]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shell === (st.today ? 'today' : st.b ? 'b' : 'prop'))));
  }

  // controls outside the stage
  document.querySelectorAll('[data-shell]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.shell; st.today = k === 'today'; if (k !== 'today') st.b = k === 'b';
    render();
  }));
  document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => {
    const [kind, v] = b.dataset.jump.split(':');
    st.fan = null; st.drop = null; st.moment = null; st.menu = false; st.play = null; st.confirm = null; st.deal = { want: {}, give: {} };
    const clear = () => { st.win = null; st.floats = []; st.asmMin = false; st.offer = false; st.mode = 'terrain'; };
    if (kind === 'pick') { clear(); st.pick = v === 'none' ? null : v; }
    else if (kind === 'win') { clear(); st.pick = null; st.win = v; }
    else if (kind === 'winpick') { clear(); st.win = v; st.pick = '-5,0'; }
    else if (kind === 'menu') { clear(); st.pick = null; st.menu = true; }
    else if (kind === 'float') { clear(); st.pick = null; openFloat(v); }
    else if (kind === 'combo') { clear(); st.pick = null; st.win = 'cities'; st.fpos.costs = { x: 766, y: 70 }; openFloat('costs'); }
    else if (kind === 'seat') { clear(); st.pick = '-5,6'; st.who = v; st.drop = 'seat'; }
    else if (kind === 'confirm') {
      clear(); st.pick = null;
      if (v === 'promote') { st.pick = '-4,-1'; st.confirm = ASK.rung('freemen', 'up', 'Samos'); }
      else if (v === 'idea') { st.win = 'ideas'; st.confirm = ASK.idea('Urban Planning'); }
      else if (v === 'calm') { st.drop = 'mood'; st.confirm = ASK.calm('gold'); }
      else st.confirm = ASK[v]();
    }
    else if (kind === 'fan') { clear(); st.pick = v === 'build' || v === 'grow' ? '-5,0' : null; st.fan = v; }
    else if (kind === 'trade') { clear(); st.pick = v || null; dock.querySelector('[data-dact="trade"]').click(); return; }
    else if (kind === 'hand') { st.hand = v; }
    else if (kind === 'handview') { st.hand = 'sample'; st.moment = 'hand'; }
    else if (kind === 'play') { st.hand = 'sample'; st.moment = 'hand'; st.play = { i: SAMPLE.findIndex(c => c.id === v) }; }
    else if (kind === 'drawn') { st.moment = 'drawn'; st.drawn = v; }
    else if (kind === 'outl') { st.outl.open = v !== 'closed'; st.outl.cfg = v === 'cfg'; st.outl.show.rivals = v === 'rivals'; }
    else if (kind === 'drop') { clear(); st.drop = v; }
    else if (kind === 'mode') { clear(); st.pick = null; st.mode = v; }
    else if (kind === 'asm') { clear(); st.pick = null; st.asmMin = v === 'min'; st.moment = v === 'min' ? null : 'assembly'; }
    else if (kind === 'riot') { clear(); st.pick = null; st.ins = {}; if (v === 'ask') st.drop = 'riotask'; else st.moment = 'riot'; }
    else if (kind === 'hunger') { clear(); st.pick = null; st.leave = 'SAMOS:freemen:0'; st.moment = 'hunger'; }
    else if (kind === 'offer') { clear(); st.pick = null; st.offer = true; st.drop = v === 'open' ? 'offer' : null; if (v !== 'open') toast('Theron offers 3 Gold for 2 Influence to Kyros.'); }
    else if (kind === 'moment') { clear(); st.moment = v; st.to = 'table'; }
    render();
  }));
  document.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    const r = $('#stage-wrap').getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (st.confirm && (e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); answer(e.key === 'Enter'); return; }
    if (e.key === 'Escape') {
      if (st.moment) { if (st.play) st.play = null; else { if (st.moment === 'assembly') st.asmMin = true; st.moment = null; } }
      else if (st.menu) st.menu = false;
      else if (st.fan) st.fan = null;
      else if (st.drop) st.drop = null;
      else if (st.floats.length && (st.topF || !st.win)) st.floats.pop();
      else if (st.win) { st.win = null; st.topF = true; }
      else st.pick = null;
      render();
    }
    if (e.key === 'h' || e.key === 'H') { st.moment = st.moment === 'hand' ? null : 'hand'; st.play = null; st.fan = null; render(); }
    if (['1', '2', '3', '4'].includes(e.key)) { st.mode = ['terrain', 'political', 'economy', 'trade'][+e.key - 1]; render(); }
  });
  render();
})();
</script>
