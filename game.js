/* Тёплый экспресс / Warm Express — уютная новогодняя игра про маленький паровоз.
 * Чистый HTML5 Canvas + JavaScript, без зависимостей. Тексты на 7 языках лежат в i18n.js.
 */
'use strict';
(() => {
  // ------------------------------------------------------------------ constants
  const WORLD_H = 216;                       // world art is drawn for 216 px height; extra screen space becomes sky
  const GROUND_Y = 176, RAIL_Y = 182, PLAT_Y = 160;
  const L = 10000;                           // ring line length (world wraps around)
  const VMAX = 72, VBOOST = 140, VREV = 26, ACC = 22, BRK = 46;
  const DAY_LEN = 300;                       // seconds for a full night→day→night cycle
  const LOCO_W = 96, WAG_W = 76, WAG_STEP = 74;
  const ZONE_BACK = 70, ZONE_FWD = 60;       // how precisely the loco must stop at a platform
  const C = {
    ink: '#1f1a3a', ol: '#141228', gold: '#f2c75c', cream: '#fff6d0', light: '#ffdf8a',
    brown: '#4a2e30', brown2: '#6b4536', mute: '#a9a4d6', green: '#7fd08a', red: '#ee7a6a', sky0: '#161634',
  };

  // ------------------------------------------------------------------ language
  const { LANGS, LANG_NAMES } = window.I18N;
  let lang = 'en';
  try { const s = localStorage.getItem('te_lang'); if (LANGS.includes(s)) lang = s; } catch (e) { /* no storage */ }
  function tr(key, vars) {
    const row = window.I18N.S[key];
    let s = row ? row[LANGS.indexOf(lang)] : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
    return s;
  }
  const isCJK = () => lang === 'zh' || lang === 'ja';
  const fontStack = () => lang === 'zh' ? '"Noto Sans SC", "Pixelify Sans", sans-serif'
    : lang === 'ja' ? '"DotGothic16", "Noto Sans SC", sans-serif' : '"Pixelify Sans", "Trebuchet MS", "Segoe UI", sans-serif';
  const fw = w => (lang === 'ja' ? 400 : w);
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('te_lang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l;
    document.title = tr('title');
    const r = document.getElementById('rotate'); if (r) r.textContent = tr('rotate');
    if (document.fonts && document.fonts.load) {
      const sample = l === 'zh' ? '温暖快车你好' : l === 'ja' ? 'ぬくもり特急です' : 'Warm Тёплый';
      document.fonts.load(`700 16px ${fontStack()}`, sample).catch(() => {});
      document.fonts.load(`400 16px ${fontStack()}`, sample).catch(() => {});
    }
  }

  const IMG_FILES = {
    bg_1_sky: 'backgrounds/bg_1_sky.png', bg_2_mountains: 'backgrounds/bg_2_mountains.png',
    bg_3_forest_far: 'backgrounds/bg_3_forest_far.png', bg_4_forest_near: 'backgrounds/bg_4_forest_near.png',
    loco: 'train/locomotive_4frames.png', w_gifts_full: 'train/wagon_gifts_full_4frames.png',
    w_gifts_empty: 'train/wagon_gifts_empty_4frames.png', w_mail: 'train/wagon_mail_4frames.png',
    w_pass_empty: 'train/wagon_passenger_empty_4frames.png', w_pass_full: 'train/wagon_passenger_full_4frames.png',
    ground: 'tiles/ground_rails.png', platform: 'tiles/platform.png', fence: 'tiles/fence.png', river: 'tiles/frozen_river.png',
    station: 'buildings/station.png', workshop: 'buildings/santa_workshop.png', house_wood: 'buildings/house_wood.png',
    house_lilac: 'buildings/house_lilac.png', clock_tower: 'buildings/clock_tower.png', market: 'buildings/market_stall.png',
    xtree: 'props/christmas_tree_4frames.png', fir_big: 'props/fir_big.png', fir_small: 'props/fir_small.png',
    lamp: 'props/lamp_post.png', mb_empty: 'props/mailbox_empty.png', mb_full: 'props/mailbox_with_letter.png',
    bench: 'props/bench.png', snowman: 'props/snowman.png', garland_off: 'props/garland_off.png', garland_on: 'props/garland_on_4frames.png',
    nameboard: 'props/nameboard.png', stop_marker: 'props/stop_marker.png',
    gift_red: 'items/gift_red.png', gift_green: 'items/gift_green.png', gift_blue: 'items/gift_blue.png', sack: 'items/gift_sack.png',
    letter: 'items/letter.png', star: 'items/final_star_2frames.png',
    smoke: 'effects/smoke_puff_4frames.png', flakes: 'effects/snowflakes_3sizes.png',
    ob_drift: 'obstacles/snowdrift_4stages.png', ob_rocks: 'obstacles/rocks_4stages.png',
    birch_a: 'decor/birch_a.png', birch_b: 'decor/birch_b.png', bush: 'decor/bush.png', signpost: 'decor/signpost.png',
    deer: 'decor/deer_2frames.png', rabbit: 'decor/rabbit_2frames.png', haystack: 'decor/haystack.png', well: 'decor/well.png',
    pond: 'decor/pond.png', boulder: 'decor/boulder.png', pine_tall: 'decor/pine_tall.png', windmill: 'decor/windmill_4frames.png',
    panel: 'ui/panel_9slice.png', button: 'ui/button_9slice.png', i_gift: 'ui/icon_gift.png',
    i_letter: 'ui/icon_letter.png', i_pass: 'ui/icon_passengers.png', i_train: 'ui/icon_train.png', i_heart: 'ui/icon_heart.png',
    i_whistle: 'ui/icon_whistle.png', i_warn: 'ui/icon_warning.png', a_left: 'ui/arrow_left.png', a_right: 'ui/arrow_right.png', paper: 'ui/letter_paper.png',
  };
  for (const n of ['santa', 'elf', 'conductor', 'girl', 'boy', 'grandpa', 'woman']) {
    IMG_FILES['c_' + n] = `characters/${n}_4frames.png`;
    IMG_FILES['p_' + n] = `portraits/portrait_${n}.png`;
  }
  const SND_FILES = {
    music: 'music_cozy_waltz_loop.mp3', wheels: 'sfx_wheels_loop.wav', whistle: 'sfx_whistle.mp3', hiss: 'sfx_steam_hiss.mp3',
    arrive: 'sfx_station_arrive.mp3', chime: 'sfx_letter_chime.mp3', gift: 'sfx_gift_delivered.mp3', board: 'sfx_passenger_board.mp3',
    step: 'sfx_snow_step.mp3', click: 'sfx_ui_click.mp3', crash: 'sfx_crash.mp3', hit: 'sfx_clear_hit.mp3', cleared: 'sfx_clear_done.mp3',
  };

  // ------------------------------------------------------------------ canvas: fills the whole window, pixel-perfect integer scale
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const lo = document.createElement('canvas'); const gLo = lo.getContext('2d'); let g = gLo;
  const wl = document.createElement('canvas'); const wg = wl.getContext('2d');
  const uiC = document.createElement('canvas'); const u = uiC.getContext('2d');
  let W = 400, H = 240, S = 1, yOff = 24;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.max(1, Math.round(innerWidth * dpr)), dh = Math.max(1, Math.round(innerHeight * dpr));
    S = Math.max(1, Math.min(Math.floor(dh / 236), Math.floor(dw / 330)));
    W = Math.ceil(dw / S); H = Math.max(WORLD_H, Math.ceil(dh / S));
    yOff = H - WORLD_H;
    canvas.width = dw; canvas.height = dh;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    for (const c of [lo, uiC, wl]) { c.width = W; c.height = H; }
    gLo.imageSmoothingEnabled = false; wg.imageSmoothingEnabled = false; u.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
    initSnow();
  }

  // text is drawn at full screen resolution above the scaled pixel layers -> always crisp
  const WT = [], UT = [];
  function txt(list, str, x, y, o = {}) {
    list.push({ str, x, y, size: o.size || 8, color: o.color || C.cream, align: o.align || 'left', shadow: o.shadow !== false,
      alpha: o.alpha === undefined ? 1 : o.alpha, weight: o.weight || 600 });
  }
  const T = (...a) => txt(UT, ...a);
  const TW = (...a) => txt(WT, ...a);
  function flushTexts(list) {
    ctx.textBaseline = 'top';
    for (const t of list) {
      if (t.alpha <= 0) continue;
      ctx.globalAlpha = t.alpha;
      ctx.font = `${fw(t.weight)} ${t.size * S}px ${fontStack()}`;
      ctx.textAlign = t.align;
      const X = Math.round(t.x * S), Y = Math.round(t.y * S);
      if (t.shadow) { ctx.fillStyle = C.ol; const o = Math.max(1, Math.round(S * 0.6)); ctx.fillText(t.str, X + o, Y + o); }
      ctx.fillStyle = t.color; ctx.fillText(t.str, X, Y);
    }
    ctx.globalAlpha = 1; list.length = 0;
  }
  function measure(str, size = 8, weight = 600) { ctx.font = `${fw(weight)} ${size * S}px ${fontStack()}`; return ctx.measureText(str).width / S; }
  const NO_START = '、。，．,.!！?？)）」』】…：:；;%';
  function wrap(str, size, maxW) {
    const out = [];
    for (const para of String(str).split('\n')) {
      if (isCJK()) {
        let line = '';
        for (const ch of para) {
          const t = line + ch;
          if (measure(t, size) > maxW && line && !NO_START.includes(ch)) { out.push(line); line = ch; } else line = t;
        }
        out.push(line);
      } else {
        let line = '';
        for (const w of para.split(' ')) {
          const t = line ? line + ' ' + w : w;
          if (measure(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
        }
        out.push(line);
      }
    }
    return out;
  }
  function fitSize(str, maxW, size, weight = 700) { const m = measure(str, size, weight); return m > maxW ? size * maxW / m : size; }

  // ------------------------------------------------------------------ assets
  const IM = {};
  let loaded = 0; const total = Object.keys(IMG_FILES).length;
  function loadImages() {
    return Promise.all(Object.entries(IMG_FILES).map(([k, f]) => new Promise(res => {
      const i = new Image();
      i.onload = () => { loaded++; res(); };
      i.onerror = () => { console.warn('Image failed:', f); loaded++; res(); };
      i.src = 'assets/' + f; IM[k] = i;
    })));
  }

  // ------------------------------------------------------------------ audio
  const AU = {};
  let audioOn = true, audioStarted = false;
  try { audioOn = localStorage.getItem('te_sound') !== 'off'; } catch (e) { /* ignore */ }
  for (const [k, f] of Object.entries(SND_FILES)) { const a = new Audio('assets/audio/' + f); a.preload = 'auto'; AU[k] = a; }
  AU.music.loop = true; AU.wheels.loop = true;
  function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    AU.music.volume = 0.32; AU.wheels.volume = 0; applyMute();
    AU.music.play().catch(() => { audioStarted = false; });
    AU.wheels.play().catch(() => {});
  }
  function applyMute() { AU.music.muted = !audioOn; AU.wheels.muted = !audioOn; }
  function sfx(k, vol = 0.7) { if (!audioOn || !audioStarted || !AU[k]) return; const a = AU[k].cloneNode(); a.volume = Math.min(1, vol); a.play().catch(() => {}); }
  function toggleMute() {
    audioOn = !audioOn; applyMute();
    try { localStorage.setItem('te_sound', audioOn ? 'on' : 'off'); } catch (e) { /* ignore */ }
    toast(tr(audioOn ? 't_sound_on' : 't_sound_off'));
  }
  function toggleFullscreen() {
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen().catch(() => {});
    else (d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen() : Promise.reject()).catch(() => {});
  }

  // ------------------------------------------------------------------ helpers
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function frame(c, img, fwid, i, x, y, alpha = 1) {
    if (!img || !img.width) return;
    if (alpha !== 1) c.globalAlpha = alpha;
    c.drawImage(img, i * fwid, 0, fwid, img.height, Math.round(x), Math.round(y), fwid, img.height);
    if (alpha !== 1) c.globalAlpha = 1;
  }
  function draw(c, img, x, y) { if (img && img.width) c.drawImage(img, Math.round(x), Math.round(y)); }
  function nine(c, img, x, y, w, h, b = 8) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const iw = img.width, ih = img.height;
    const sx = [0, b, iw - b, iw], dx = [x, x + b, x + w - b, x + w];
    const sy = [0, b, ih - b, ih], dy = [y, y + b, y + h - b, y + h];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j], dw = dx[i + 1] - dx[i], dh = dy[j + 1] - dy[j];
      if (dw > 0 && dh > 0) c.drawImage(img, sx[i], sy[j], sw, sh, dx[i], dy[j], dw, dh);
    }
  }

  // ------------------------------------------------------------------ world data
  const ST = [
    { id: 'santa', x: 400 },
    { id: 'berez', x: 2900, gift: true },
    { id: 'dolina', x: 5400, gift: true },
    { id: 'snezh', x: 7900, gift: true },
  ];
  const stName = id => tr('st_' + id);
  const NPCSPR = { santa: 'santa', elf: 'elf', girl: 'girl', grandpa: 'grandpa', boy: 'boy', woman: 'woman', cond_d: 'conductor', cond_s: 'conductor' };

  let objs = [], npcs = {}, mailboxes = {}, garlands = {}, pile = [];
  function add(img, x, yb, layer, extra = {}) {
    const im = IM[img];
    const wid = extra.frames ? im.width / extra.frames : im.width;
    const o = Object.assign({ img, x, y: yb - im.height, w: wid, h: im.height, layer, visible: true }, extra);
    objs.push(o); return o;
  }
  function npc(id, x) { const n = { id, x, visible: true, wave: 0, walkTo: null, phase: Math.random() * 2, spr: NPCSPR[id] }; npcs[id] = n; return n; }

  function buildWorld() {
    objs = []; npcs = {}; mailboxes = {}; garlands = {}; pile = [];
    const [sa, be, do_, sn] = ST.map(s => s.x);
    for (const s of ST) {
      for (let x = s.x - 312; x < s.x + 190; x += 96) add('platform', x, PLAT_Y + 22, 2);
      add('nameboard', s.x - 400, 175, 0, { board: s.id });
      add('stop_marker', s.x + 6, PLAT_Y + 1, 4);
    }
    // --- Santa's workshop
    add('xtree', sa - 262, 162, 3, { frames: 4, ms: 420 });
    add('workshop', sa - 150, 162, 3, { sign: 'st_santa', sx: 39, sy: 46, sw: 46 });
    add('xtree', sa + 46, 162, 3, { frames: 4, ms: 380 });
    add('lamp', sa - 196, 162, 4);
    pile = [add('sack', sa + 86, PLAT_Y, 4), add('gift_red', sa + 100, PLAT_Y, 4), add('gift_blue', sa + 76, PLAT_Y, 4)];
    npc('santa', sa + 8); npc('elf', sa + 60);
    add('snowman', sa - 340, 175, 0);
    // --- Birchwood / Берёзовка
    add('house_wood', be - 290, PLAT_Y, 1);
    add('fir_big', be - 330, PLAT_Y + 2, 1);
    add('station', be - 130, 162, 3, { sign: 'st_berez', sx: 38, sy: 39, sw: 52 });
    garlands.berez = add('house_wood', be + 26, PLAT_Y, 1, { garland: 'berez' });
    add('lamp', be - 190, 162, 4);
    mailboxes.berez = [add('mb_full', be + 50, PLAT_Y + 1, 4)];
    add('fir_small', be + 92, PLAT_Y + 1, 4);
    npc('grandpa', be + 6); npc('girl', be + 68);
    for (let x = be - 760; x < be - 520; x += 48) add('fence', x, 175, 0);
    // --- Quiet Valley / Тихая Долина
    for (let x = do_ - 760; x < do_ - 470; x += 96) add('river', x, 182, 0);
    add('house_lilac', do_ - 290, PLAT_Y, 1);
    add('fir_big', do_ - 220, PLAT_Y + 2, 1);
    add('station', do_ - 130, 162, 3, { sign: 'st_dolina', sx: 38, sy: 39, sw: 52 });
    garlands.dolina = add('house_lilac', do_ + 34, PLAT_Y, 1, { garland: 'dolina' });
    add('lamp', do_ - 190, 162, 4);
    mailboxes.dolina = [add('mb_full', do_ + 26, PLAT_Y + 1, 4), add('mb_full', do_ + 66, PLAT_Y + 1, 4)];
    npc('woman', do_ + 4); npc('boy', do_ + 44); npc('cond_d', do_ + 84);
    // --- Snowtown / Снежноград (city houses stand on the snowy ground, not in the air)
    add('house_wood', sn - 700, 175, 0); add('house_lilac', sn - 636, 175, 0);
    add('market', sn - 560, 175, 0); add('market', sn - 506, 175, 0);
    add('xtree', sn - 340, 162, 3, { frames: 4, ms: 400 });
    add('clock_tower', sn - 214, 162, 3);
    add('station', sn - 130, 162, 3, { sign: 'st_snezh', sx: 38, sy: 39, sw: 52 });
    garlands.snezh = add('house_lilac', sn + 40, PLAT_Y, 1, { garland: 'snezh' });
    add('lamp', sn - 268, 162, 4); add('lamp', sn - 176, 162, 4);
    add('bench', sn + 104, PLAT_Y + 1, 4);
    npc('cond_s', sn + 4);
    // --- countryside: each stretch of line has its own look; everything stands on the snowy ground band (y 170–182)
    const r = rng(2026);
    const zones = [[sa - 460, sa + 230], [be - 800, be + 230], [do_ - 800, do_ + 230], [sn - 760, sn + 230]];
    const free = x => zones.every(([a, b]) => [-L, 0, L].every(k => !(x > a + k - 60 && x < b + k)));
    // [name, weight, extra spacing, options]
    const BIOMES = [
      // Santa → Birchwood: birch grove with deer and hares
      [['fir_big', 3], ['birch_a', 4], ['birch_b', 3], ['fir_small', 2], ['bush', 2], ['deer', 1, 10], ['rabbit', 1], ['snowman', 0.6], ['lamp', 0.5]],
      // Birchwood → Quiet Valley: farmland
      [['haystack', 2.5, 8], ['fence2', 2, 50], ['well', 0.8, 6], ['house', 1, 64], ['windmill', 0.5, 30], ['fir_small', 2], ['bush', 2], ['signpost', 0.6], ['birch_b', 1.2], ['rabbit', 0.8]],
      // Quiet Valley → Snowtown: mountain pass
      [['pine_tall', 4], ['fir_big', 3], ['boulder', 2, 6], ['pond', 0.7, 50], ['deer', 1, 10], ['fir_small', 1.5], ['signpost', 0.4]],
      // Snowtown → Santa: festive forest
      [['fir_big', 4], ['fir_small', 3], ['lamp', 1.4], ['snowman', 1], ['birch_a', 1.2], ['bush', 1.5], ['house', 0.7, 64], ['rabbit', 0.6]],
    ];
    const pick = list => { const tot = list.reduce((t, e) => t + e[1], 0); let v = r() * tot; for (const e of list) { v -= e[1]; if (v <= 0) return e; } return list[0]; };
    const segOf = x => { let seg = ST.length - 1; ST.forEach((st, i) => { if (x >= st.x) seg = i; }); return seg; };
    for (let x = 0; x < L; x += 22 + r() * 46) {
      if (!free(x)) continue;
      const [name, , extra] = pick(BIOMES[segOf(x)]), yb = 175 + Math.floor(r() * 3);
      if (name === 'fence2') { add('fence', x, 176, 0); add('fence', x + 48, 176, 0); }
      else if (name === 'house') add(r() < 0.5 ? 'house_wood' : 'house_lilac', x, 176, 0);
      else if (name === 'deer') add('deer', x, 176, 0, { frames: 2, ms: 1400 + Math.floor(r() * 900) });
      else if (name === 'rabbit') add('rabbit', x, 177, 0, { frames: 2, ms: 500 + Math.floor(r() * 400) });
      else if (name === 'windmill') add('windmill', x, 176, 0, { frames: 4, ms: 260 });
      else if (name === 'pond') add('pond', x, 180, 0);
      else add(name, x, yb, 0);
      x += extra || 0;
    }
    objs.sort((a, b) => a.layer - b.layer);
  }

  // ------------------------------------------------------------------ game state
  let G, LETTERS, PASS;
  function freshState() {
    G = {
      scene: 'loading', mode: 'story', time: 0,
      trainX: 900, v: 0, dist: 0, throttle: 0, camX: 0,
      atSt: -1, visited: new Set(), arriveCue: -1,
      gifts: { atSanta: 3, carried: 0, delivered: 0 }, everLoaded: false, giftDone: {}, lettersGiven: false,
      journal: false, jPage: 0, menu: null, menuSel: 0, finT: 0, fade: 1, whistleCd: 0, shake: 0,
      dayT: DAY_LEN * 0.05, dayPhase: 'night', boostKey: false, boostTouch: false,
    };
    LETTERS = [
      { id: 'l1', st: 'berez', box: 0, text: 'let1', from: () => `${tr('n_girl')}, ${stName('berez')}`, state: 'box' },
      { id: 'l2', st: 'dolina', box: 0, text: 'let2', from: () => `${tr('n_boy')}, ${stName('dolina')}`, state: 'box' },
      { id: 'l3', st: 'dolina', box: 1, text: 'let3', from: () => tr('let3_from'), state: 'box' },
    ];
    PASS = [
      { npc: 'grandpa', from: 'berez', to: 'snezh', onboard: false, done: false, drop: 40, ask: 'd_gp_ask', thanks: 'd_gp_thanks', bye: 'd_gp_bye' },
      { npc: 'woman', from: 'dolina', to: 'snezh', onboard: false, done: false, drop: 66, ask: 'd_w_ask', thanks: 'd_w_thanks', bye: 'd_w_bye' },
    ];
  }
  freshState();
  const lettersGot = () => LETTERS.filter(l => l.state !== 'box');
  const onboard = () => PASS.filter(p => p.onboard);
  const allDone = () => G.gifts.delivered === 3 && LETTERS.every(l => l.state !== 'box') && PASS.every(p => p.done);

  // ------------------------------------------------------------------ script runner (dialogues & sequences)
  let queue = [], cur = null, dlg = null, timers = [];
  const run = (...steps) => queue.push(...steps);
  const say = (who, key, vars) => ({ t: 'say', who, key, vars });
  const wait = s => ({ t: 'wait', s });
  const doo = fn => ({ t: 'do', fn });
  const until = fn => ({ t: 'until', fn });
  const later = (s, fn) => timers.push({ t: s, fn });
  const busy = () => !!(cur || queue.length);
  function dlgLines(d) {
    if (d.lang !== lang || d.W !== W) {
      d.lines = wrap(tr(d.key, d.vars), 8, Math.min(W - 12, 460) - 72); d.len = d.lines.join('').length; d.lang = lang; d.W = W;
      d.shown = Math.min(d.shown, d.len);
    }
    return d.lines;
  }
  function updateScript(dt) {
    for (let guard = 0; guard < 50; guard++) {
      if (!cur) {
        if (!queue.length) return;
        cur = queue.shift(); cur.time = 0;
        if (cur.t === 'say') {
          dlg = { who: cur.who, key: cur.key, vars: cur.vars, shown: 0, lang: null }; dlgLines(dlg);
          const n = npcs[cur.who]; if (n) n.wave = Math.max(n.wave, 0.8);
        }
      }
      if (cur.t === 'do') { const f = cur.fn; cur = null; f(); continue; }
      if (cur.t === 'wait') { cur.time += dt; if (cur.time >= cur.s) { cur = null; continue; } return; }
      if (cur.t === 'until') { if (cur.fn(dt)) { cur = null; continue; } return; }
      if (cur.t === 'say') { dlgLines(dlg); dlg.shown = Math.min(dlg.len, dlg.shown + dt * (isCJK() ? 22 : 42)); return; }
    }
  }
  function advanceDialog() {
    if (!(cur && cur.t === 'say')) return false;
    if (dlg.shown < dlg.len) dlg.shown = dlg.len;
    else { cur = null; dlg = null; sfx('click', 0.25); }
    return true;
  }

  // ------------------------------------------------------------------ effects
  let flies = [], smoke = [], flakes = [], toasts = [], sparkles = [], chunks = [], obstacles = [];
  function fly(img, x0, y0, x1, y1, dur, arc, onDone) { const f = { img, x0, y0, x1, y1, dur, arc, t: 0, onDone }; flies.push(f); return f; }
  function puff(extra = 0) { smoke.push({ x: G.trainX - 34 + (Math.random() * 4 - 2), y: 113, age: 0, vy: -14 - extra * 6 - Math.random() * 4, vx: -4 - Math.random() * 4 }); }
  function initSnow() {
    flakes = []; const r = rng(7);
    const n = Math.round(W * H / 700);
    for (let i = 0; i < n; i++) { const s = r() < 0.2 ? 0 : (r() < 0.5 ? 1 : 2); flakes.push({ x: r() * W, y: r() * H, s, ph: r() * 6, sp: [15, 10, 6][s] + r() * 4 }); }
  }
  const topStars = []; { const r = rng(11); for (let i = 0; i < 160; i++) topStars.push([r() * 2000, r() * 400, r()]); }
  function toast(text) { toasts.push({ text, t: 0, dur: 3.2 }); if (toasts.length > 3) toasts.shift(); }
  function burst(x, y, n, colors, spread = 1) {
    for (let i = 0; i < n; i++) chunks.push({ x, y, vx: (Math.random() - 0.5) * 70 * spread, vy: -20 - Math.random() * 50 * spread, t: 0, d: 0.5 + Math.random() * 0.6, c: colors[i % colors.length], s: Math.random() < 0.3 ? 2 : 1 });
  }

  // ------------------------------------------------------------------ train geometry
  const locoLeft = () => G.trainX - LOCO_W;
  const wagonLeft = i => locoLeft() - WAG_STEP * (i + 1);       // 0 gifts, 1 passenger, 2 mail
  const giftWagonX = () => wagonLeft(0) + 38;
  const mailWagonX = () => wagonLeft(2) + 38;
  const sxW = wx => mod(wx - G.camX + 600, L) - 600;              // world -> screen x (ring wrap)
  const ahead = x => { const d = mod(x - G.trainX, L); return d > L / 2 ? d - L : d; }; // signed distance from loco front
  function stationAt() { for (let i = 0; i < ST.length; i++) { const d = ahead(ST[i].x); if (d <= ZONE_BACK && d >= -ZONE_FWD) return i; } return -1; }
  function nextStation() { let best = 0, bd = 1e9; ST.forEach((s, i) => { const d = mod(s.x - G.trainX, L); if (d > ZONE_BACK && d < bd) { bd = d; best = i; } }); return [best, bd]; }
  const curStation = () => (G.atSt >= 0 ? ST[G.atSt] : null);
  const nearNpcs = () => Object.values(npcs).filter(n => n.visible && Math.abs(sxW(n.x) - W / 2) < W * 0.7);

  function whistle() {
    if (G.whistleCd > 0 || G.scene === 'title' || G.menu) return;
    G.whistleCd = 1.3; sfx('whistle', 0.55);
    for (let i = 0; i < 3; i++) later(i * 0.12, () => puff(2));
    for (const n of nearNpcs()) n.wave = 1.8;
  }

  // ------------------------------------------------------------------ driving (player controls the throttle)
  const canDrive = () => G.scene === 'play' && !G.menu && !G.journal && !busy();
  function throttleUp() {
    if (!canDrive()) return;
    if (G.throttle < 1) { G.throttle++; if (G.throttle === 1 && G.v >= 0) { sfx('whistle', 0.35); for (const n of nearNpcs()) n.wave = 2; } }
  }
  function throttleDown() {
    if (!canDrive()) return;
    if (G.throttle === 1) G.throttle = 0;
    else if (G.throttle === 0 && Math.abs(G.v) < 0.5) G.throttle = -1;
  }
  function stopTrain() { if (canDrive()) G.throttle = 0; }

  function updateTrain(dt) {
    if (G.scene === 'title') { G.v = lerp(G.v, VMAX * 0.8, dt); }
    else if (G.scene === 'finale') { G.v = 0; G.throttle = 0; }
    else {
      if (busy()) G.throttle = 0;
      const boosting = G.throttle === 1 && (G.boostKey || G.boostTouch);
      const target = G.throttle === 1 ? (boosting ? VBOOST : VMAX) : G.throttle === -1 ? -VREV : 0;
      if (G.v < target) G.v = Math.min(target, G.v + (G.v < 0 ? BRK : boosting ? ACC * 1.7 : ACC) * dt);
      else if (G.v > target) G.v = Math.max(target, G.v - (G.v > 0 ? BRK : ACC) * dt);
    }
    // obstacles: crash if the loco front reaches one while moving forward
    if (G.v > 0 && G.scene === 'play') {
      for (const ob of obstacles) {
        const d = ahead(ob.x + 3);
        if (d >= -2 && d <= G.v * dt + 0.5) { crash(ob); break; }
      }
    }
    G.trainX += G.v * dt; G.dist += G.v * dt;
    G.trainX = mod(G.trainX, L);
    G.camX = G.trainX - Math.round(W * 0.6);
    if (G.scene !== 'play') return;
    // stations: the player stops the train at the platform
    const at = stationAt();
    if (G.atSt >= 0 && at !== G.atSt) leaveStation(G.atSt);
    if (at < 0) G.atSt = -1;
    if (at >= 0 && G.atSt < 0 && Math.abs(G.v) < 0.01 && G.throttle === 0) arrive(at);
    // arrival music cue
    const [ni, nd] = nextStation();
    if (G.v > 0 && nd < 300 + G.v * G.v / (2 * BRK) && G.arriveCue !== ni) { G.arriveCue = ni; sfx('arrive', 0.45); }
    // obstacle warnings
    for (const ob of obstacles) {
      const d = ahead(ob.x);
      if (!ob.warned && G.v > 0 && d > 0 && d < 200 + G.v * G.v / (2 * BRK)) { ob.warned = true; toast(tr(ob.type === 'drift' ? 't_drift' : 't_rocks')); }
    }
  }

  function crash(ob) {
    G.v = 0; G.throttle = 0; G.trainX = mod(ob.x + 1, L); G.shake = 0.5;
    sfx('crash', 0.8);
    burst(ob.x + 10, RAIL_Y - 10, 30, ob.type === 'drift' ? ['#ffffff', '#e4eaff', '#bfc8f0'] : ['#7d7b9c', '#525070', '#e4eaff'], 1.3);
    ob.hp = Math.max(1, ob.hp - 1);
    if (G.mode !== 'story') { toast(tr('t_crash_none')); return; }
    if (G.gifts.carried > 0) {
      G.gifts.carried--; G.gifts.atSanta++;
      fly('gift_red', giftWagonX(), 132, giftWagonX() - 90, 40, 1.1, 30);
      pile[1].visible = true;
      toast(tr('t_crash_gift'));
    } else {
      const l = LETTERS.find(x => x.state === 'train');
      if (l) {
        l.state = 'box'; const mb = mailboxes[l.st][l.box]; mb.img = 'mb_full';
        fly('letter', mailWagonX(), 140, mailWagonX() - 60, 20, 1.2, 30);
        toast(tr('t_crash_letter', { st: stName(l.st) }));
      } else toast(tr('t_crash_none'));
    }
  }
  function hitObstacle(ob) {
    if (G.scene !== 'play' || G.menu || G.journal) return;
    ob.hp--; ob.shake = 0.25;
    sfx('hit', 0.6);
    burst(ob.x + 22, RAIL_Y - 12, 10, ob.type === 'drift' ? ['#ffffff', '#e4eaff', '#bfc8f0'] : ['#7d7b9c', '#525070', '#b1b0cc']);
    if (ob.hp <= 0) {
      obstacles = obstacles.filter(o => o !== ob);
      sfx('cleared', 0.6); toast(tr('t_cleared'));
      for (let i = 0; i < 16; i++) sparkles.push({ x: ob.x + Math.random() * 44, y: RAIL_Y - 20 - Math.random() * 30, t: 0, d: 0.5 + Math.random() * 0.7, world: true });
    }
  }
  function spawnObstacle(fromIdx) {
    const a = ST[fromIdx].x, b = ST[(fromIdx + 1) % ST.length].x + (fromIdx === ST.length - 1 ? L : 0);
    const lo_ = a + 650, hi = b - 900;
    if (hi <= lo_) return;
    if (obstacles.some(o => mod(o.x - a, L) < b - a)) return;
    const x = mod(lo_ + Math.random() * (hi - lo_), L);
    obstacles.push({ x, type: Math.random() < 0.55 ? 'drift' : 'rocks', hp: 5, warned: false, shake: 0 });
  }
  function nearObstacle() {
    let best = null, bd = 1e9;
    for (const ob of obstacles) { const d = ahead(ob.x); if (d > -10 && d < 150 && d < bd) { bd = d; best = ob; } }
    return best;
  }

  // ------------------------------------------------------------------ stations
  function arrive(idx) {
    G.atSt = idx;
    sfx('hiss', 0.45);
    const st = ST[idx];
    for (const n of nearNpcs()) n.wave = 2.4;
    const first = !G.visited.has(st.id); G.visited.add(st.id);
    if (G.mode !== 'story') return;
    if (st.id === 'santa') santaReturn();
    else if (first) arrivalScript(st.id);
  }
  function leaveStation(idx) {
    G.atSt = -1;
    if (G.v > 0 && G.mode === 'story' && Math.random() < 0.75) spawnObstacle(idx);
    if (G.v > 0 && G.mode === 'free' && Math.random() < 0.5) spawnObstacle(idx);
  }
  function arrivalScript(id) {
    if (id === 'berez') run(wait(0.5), say('girl', 'd_girl1'), say('grandpa', 'd_gp_ask'));
    if (id === 'dolina') run(wait(0.5), say('cond_d', 'd_cd_hello'), say('boy', 'd_boy1'), say('woman', 'd_w_ask'));
    if (id === 'snezh') run(wait(0.5), say('cond_s', 'd_cs_hello'), ...(onboard().length ? [say('cond_s', 'd_cs_pass')] : []));
  }
  function santaReturn() {
    if (G.lettersGiven) { run(wait(0.4), say('santa', 'd_s_free')); return; }
    if (!G.everLoaded) { run(wait(0.4), say('santa', 'd_s_load')); return; }
    if (G.gifts.atSanta > 0) { run(wait(0.4), say('elf', 'd_reload')); return; }
    if (allDone()) { run(wait(0.5), say('santa', 'd_s_done')); return; }
    const left = [];
    const l = LETTERS.filter(x => x.state === 'box').length, gl = 3 - G.gifts.delivered, p = PASS.filter(x => !x.done).length;
    if (l) left.push(tr('l_letters', { n: l }));
    if (gl) left.push(tr('l_gifts', { n: gl }));
    if (p) left.push(tr('l_pass', { n: p }));
    run(wait(0.5), say('santa', 'd_s_notyet'), say('santa', 'd_s_left', { list: left.join(tr('list_sep')) }));
  }

  function actions() {
    const st = curStation();
    if (!st || G.scene !== 'play' || G.mode !== 'story' || Math.abs(G.v) > 0.01) return [];
    const a = [];
    if (st.id === 'santa') {
      if (G.gifts.atSanta > 0 && !G.lettersGiven) a.push({ key: 'act_load', fn: loadGifts });
      if (allDone() && !G.lettersGiven) a.push({ key: 'act_give', fn: giveLetters });
    } else {
      if (LETTERS.some(l => l.st === st.id && l.state === 'box')) a.push({ key: 'act_letters', fn: () => collectLetters(st) });
      if (st.gift && !G.giftDone[st.id] && G.gifts.carried > 0) a.push({ key: 'act_gift', fn: () => deliverGift(st) });
      for (const p of PASS) if (p.from === st.id && !p.onboard && !p.done) a.push({ key: 'act_pickup', fn: () => pickup(p) });
      if (onboard().some(p => p.to === st.id)) a.push({ key: 'act_drop', fn: () => dropoff(st) });
    }
    return a;
  }
  function doAction(a) { if (!a || busy()) return; sfx('click', 0.3); a.fn(); }

  function loadGifts() {
    const tx = giftWagonX();
    const n = G.gifts.atSanta, first = !G.everLoaded;
    run(doo(() => { npcs.elf.wave = 2; }),
      doo(() => pile.forEach((o, i) => later(i * 0.35, () => {
        o.visible = false; sfx('step', 0.5);
        fly(o.img, o.x + 6, PLAT_Y - 10, tx - 8 + i * 6, 136, 0.9, 34, i === pile.length - 1 ? () => {
          G.gifts.carried += n; G.gifts.atSanta = 0; G.everLoaded = true; sfx('gift', 0.6);
        } : null);
      }))),
      until(() => G.gifts.atSanta === 0), wait(0.3),
      say('elf', first ? 'd_loaded' : 'd_reloaded'),
      doo(() => toast(tr('t_loaded'))));
  }
  function collectLetters(st) {
    const list = LETTERS.filter(l => l.st === st.id && l.state === 'box');
    let got = 0;
    run(doo(() => list.forEach((l, i) => later(i * 0.6, () => {
      const mb = mailboxes[st.id][l.box];
      mb.img = 'mb_empty'; sfx('step', 0.4);
      fly('letter', mb.x + 8, PLAT_Y - 26, mailWagonX() + 10, 146, 1.2, 40, () => { l.state = 'train'; got++; sfx('chime', 0.6); toast(tr('t_letter')); });
    }))),
    until(() => got === list.length), wait(0.3));
    if (st.id === 'berez') run(say('girl', 'd_girl2'));
    if (st.id === 'dolina') run(say('boy', 'd_boy2'), doo(() => toast(tr('t_journal'))));
  }
  function deliverGift(st) {
    const house = garlands[st.id];
    const tx = house.x + 32, src = giftWagonX();
    let arrived = 0;
    run(doo(() => ['gift_red', 'gift_green', 'gift_blue'].forEach((b, i) => later(i * 0.3, () => {
      sfx('step', 0.4); fly(b, src - 6 + i * 4, 132, tx - 10 + i * 7, 148, 1.1, 46, () => { arrived++; });
    }))),
    until(() => arrived === 3),
    doo(() => {
      G.giftDone[st.id] = true; G.gifts.delivered++; G.gifts.carried--;
      sfx('gift', 0.7); toast(tr('t_gift'));
      for (const n of nearNpcs()) n.wave = 2.5;
      for (let i = 0; i < 14; i++) sparkles.push({ x: tx + (Math.random() - 0.5) * 60, y: 110 + Math.random() * 40, t: 0, d: 0.6 + Math.random() * 0.8, world: true });
    }), wait(0.6));
    run(say(st.id === 'berez' ? 'girl' : st.id === 'dolina' ? 'cond_d' : 'cond_s', st.id === 'berez' ? 'd_girl3' : st.id === 'dolina' ? 'd_cd_gift' : 'd_cs_gift'));
  }
  function pickup(p) {
    const n = npcs[p.npc];
    run(say(p.npc, p.thanks),
      doo(() => { n.walkTo = G.trainX - 8; }),
      until(() => n.walkTo === null),
      doo(() => { n.visible = false; p.onboard = true; sfx('board', 0.6); toast(tr('t_board', { name: tr('n_' + p.npc) })); }),
      wait(0.3));
  }
  function dropoff(st) {
    for (const p of onboard().filter(q => q.to === st.id)) {
      const n = npcs[p.npc];
      run(doo(() => { n.x = G.trainX - 4; n.visible = true; n.walkTo = Math.max(G.trainX + 16, st.x + p.drop); sfx('board', 0.6); }),
        until(() => n.walkTo === null),
        doo(() => { p.onboard = false; p.done = true; n.wave = 2; }),
        say(p.npc, p.bye));
    }
  }
  function giveLetters() {
    let n = 0;
    run(doo(() => LETTERS.forEach((l, i) => later(i * 0.45, () => {
      fly('letter', mailWagonX() + 10, 146, npcs.santa.x + 10, PLAT_Y - 18, 1.3, 50, () => { n++; l.state = 'santa'; sfx('chime', 0.5); });
    }))),
    until(() => n === 3),
    doo(() => { G.lettersGiven = true; npcs.santa.wave = 3; }),
    say('santa', 'd_s_read'), say('santa', 'd_s_hope'),
    doo(() => { G.scene = 'finale'; G.finT = 0; }));
  }
  function toFreeMode() {
    G.scene = 'play'; G.mode = 'free'; G.throttle = 0;
    toast(tr('t_free'));
  }

  // ------------------------------------------------------------------ menu
  function menuItems() {
    if (G.menu === 'lang') return [...LANGS.map(l => ({ label: LANG_NAMES[l], cur: l === lang, fn: () => { setLang(l); G.menu = G.menuFrom || 'main'; G.menuSel = 0; } })),
      { label: tr('m_back'), fn: () => { G.menu = G.menuFrom === 'lang' ? null : 'main'; G.menuSel = 0; } }];
    if (G.menu === 'controls') return [{ label: tr('m_back'), fn: () => { G.menu = 'main'; G.menuSel = 0; } }];
    const items = [{ label: tr('m_continue'), fn: closeMenu },
      { label: `${tr('m_language')}: ${LANG_NAMES[lang]}`, fn: () => { G.menu = 'lang'; G.menuFrom = 'main'; G.menuSel = LANGS.indexOf(lang); } },
      { label: `${tr('m_sound')}: ${tr(audioOn ? 'm_on' : 'm_off')}`, fn: toggleMute },
      { label: tr('m_fullscreen'), fn: toggleFullscreen },
      { label: tr('m_controls'), fn: () => { G.menu = 'controls'; G.menuSel = 0; } }];
    if (G.scene !== 'title') items.push({ label: tr('m_restart'), fn: restart });
    return items;
  }
  function openMenu(which = 'main') { G.menu = which; G.menuFrom = which === 'lang' ? 'lang' : 'main'; G.menuSel = which === 'lang' ? LANGS.indexOf(lang) : 0; G.journal = false; }
  function closeMenu() { G.menu = null; }
  function restart() {
    G.menu = null;
    freshState(); queue = []; cur = null; dlg = null; timers = []; flies = []; smoke = []; chunks = []; sparkles = []; toasts = []; obstacles = [];
    buildWorld(); startGame();
  }

  // ------------------------------------------------------------------ input
  let zones = [], hover = null;
  function primary() {
    startAudio();
    if (G.scene === 'loading') return;
    if (G.menu) { const it = menuItems()[G.menuSel]; if (it) { sfx('click', 0.3); it.fn(); } return; }
    if (G.scene === 'title') { startGame(); return; }
    if (G.journal) { G.journal = false; return; }
    if (advanceDialog()) return;
    if (G.scene === 'finale') { if (G.finT > 9) toFreeMode(); return; }
    if (busy()) return;
    const a = actions(); if (a.length) { doAction(a[0]); return; }
    const ob = nearObstacle(); if (ob && Math.abs(G.v) < 0.5) { hitObstacle(ob); return; }
  }
  function action(i = 0) {
    startAudio();
    if (G.menu || G.journal) return;
    if (advanceDialog()) return;
    if (busy() || G.scene !== 'play') return;
    const a = actions(); if (a[i]) { doAction(a[i]); return; }
    const ob = nearObstacle(); if (ob && i === 0 && Math.abs(G.v) < 0.5) hitObstacle(ob);
  }
  addEventListener('keydown', e => {
    const k = e.code;
    if (['Space', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
    if (e.repeat && !['ArrowUp', 'ArrowDown'].includes(k)) return;
    startAudio();
    if (k === 'Escape') {
      if (G.scene === 'loading') return;
      if (G.menu === 'lang' && G.menuFrom === 'main') { G.menu = 'main'; G.menuSel = 1; }
      else if (G.menu === 'controls') { G.menu = 'main'; G.menuSel = 4; }
      else if (G.menu) closeMenu();
      else if (G.journal) G.journal = false;
      else openMenu();
      return;
    }
    if (G.menu) {
      const n = menuItems().length;
      if (k === 'ArrowUp' || k === 'KeyW') G.menuSel = mod(G.menuSel - 1, n);
      else if (k === 'ArrowDown' || k === 'KeyS') G.menuSel = mod(G.menuSel + 1, n);
      else if (k === 'Space' || k === 'Enter' || k === 'KeyE') primary();
      return;
    }
    if (k === 'Space') {
      if (G.scene !== 'play' || dlg || G.journal || busy()) { primary(); return; }
      G.boostKey = true;
      if (G.throttle === -1) G.throttle = 0; else if (G.throttle === 0) throttleUp();
    }
    else if (k === 'Enter') primary();
    else if (k === 'Tab') { if (G.scene === 'play' || G.scene === 'finale') G.journal = !G.journal; }
    else if (G.journal && (k === 'ArrowLeft' || k === 'KeyA')) G.jPage = Math.max(0, G.jPage - 1);
    else if (G.journal && (k === 'ArrowRight' || k === 'KeyD')) G.jPage = Math.min(Math.max(0, lettersGot().length - 1), G.jPage + 1);
    else if (k === 'ArrowRight' || k === 'KeyD') throttleUp();
    else if (k === 'ArrowLeft' || k === 'KeyA') throttleDown();
    else if (k === 'ArrowDown' || k === 'KeyS') stopTrain();
    else if (k === 'ArrowUp' || k === 'KeyW' || k === 'KeyE') action(0);
    else if (/^Digit[1-4]$/.test(k)) action(+k.slice(5) - 1);
    else if (k === 'KeyH') whistle();
    else if (k === 'KeyM') toggleMute();
  });
  addEventListener('keyup', e => { if (e.code === 'Space') G.boostKey = false; });
  addEventListener('blur', () => { G.boostKey = false; G.boostTouch = false; });
  addEventListener('pointerup', () => { G.boostTouch = false; });
  addEventListener('pointercancel', () => { G.boostTouch = false; });
  function toLogical(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * (canvas.width / S), (e.clientY - r.top) / r.height * (canvas.height / S)]; }
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); canvas.focus(); startAudio();
    const [x, y] = toLogical(e);
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) { z.fn(); return; }
    }
    if (G.scene === 'play' && !G.menu && !G.journal) {
      for (const ob of obstacles) {
        const sx = sxW(ob.x), sy = yOff + RAIL_Y + 4 - 26;
        if (x >= sx - 6 && x < sx + 54 && y >= sy - 10 && y < sy + 34) { hitObstacle(ob); return; }
      }
    }
    if (dlg || G.scene !== 'play' || G.menu || G.journal) primary();
  });
  canvas.addEventListener('pointermove', e => {
    const [x, y] = toLogical(e);
    hover = zones.find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) || null;
    let pointer = !!hover;
    if (!pointer && G.scene === 'play') for (const ob of obstacles) { const sx = sxW(ob.x), sy = yOff + RAIL_Y - 22; if (x >= sx - 6 && x < sx + 54 && y >= sy - 10 && y < sy + 34) pointer = true; }
    canvas.style.cursor = pointer ? 'pointer' : 'default';
  });
  const zone = (x, y, w, h, fn, id) => zones.push({ x, y, w, h, fn, id });

  // ------------------------------------------------------------------ start
  function startGame() {
    G.scene = 'play'; G.mode = 'story'; G.fade = 1;
    G.trainX = ST[0].x; G.v = 0; G.throttle = 0; G.atSt = 0; G.camX = G.trainX - Math.round(W * 0.6);
    G.visited.add('santa');
    obstacles = [];
    obstacles.push({ x: ST[0].x + 1000, type: 'drift', hp: 5, warned: false, shake: 0 });   // first one teaches the mechanic
    sfx('whistle', 0.4);
    run(wait(0.9), say('santa', 'd_intro1'), say('santa', 'd_intro2'), say('elf', 'd_intro3'));
  }

  // ------------------------------------------------------------------ update
  function update(dt) {
    G.time += dt;
    G.fade = Math.max(0, G.fade - dt * 1.2);
    if (G.scene === 'loading') return;
    for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t += dt; if (toasts[i].t > toasts[i].dur) toasts.splice(i, 1); }
    if (G.menu) { if (audioStarted) AU.wheels.volume = 0; return; }        // paused
    G.whistleCd = Math.max(0, G.whistleCd - dt);
    G.shake = Math.max(0, G.shake - dt);
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    updateTrain(dt);
    if (G.scene !== 'title') { updateScript(dt); updateDay(dt); }
    if (G.scene === 'finale') {
      G.finT += dt;
      if (Math.random() < dt * 14) sparkles.push({ x: W / 2 + (Math.random() - 0.5) * 140, y: starY() + (Math.random() - 0.5) * 60, t: 0, d: 0.5 + Math.random() * 0.9 });
      for (const n of Object.values(npcs)) if (n.visible) n.wave = Math.max(n.wave, 0.5);
    }
    for (const n of Object.values(npcs)) {
      n.wave = Math.max(0, n.wave - dt);
      if (n.walkTo !== null) { const d = n.walkTo - n.x, s = 34 * dt; if (Math.abs(d) <= s) { n.x = n.walkTo; n.walkTo = null; } else n.x += Math.sign(d) * s; }
    }
    for (const ob of obstacles) ob.shake = Math.max(0, ob.shake - dt);
    for (let i = flies.length - 1; i >= 0; i--) { const f = flies[i]; f.t += dt; if (f.t >= f.dur) { flies.splice(i, 1); if (f.onDone) f.onDone(); } }
    G.smokeT = (G.smokeT || 0) - dt;
    const sp = Math.min(1, Math.abs(G.v) / VMAX);
    if (G.smokeT <= 0) { puff(sp); G.smokeT = Math.abs(G.v) > 1 ? 0.13 + 0.25 * (1 - sp) : 0.75; }
    for (let i = smoke.length - 1; i >= 0; i--) { const p = smoke[i]; p.age += dt; p.y += p.vy * dt; p.x += p.vx * dt; p.vy *= (1 - dt * 0.6); if (p.age > 1.6) smoke.splice(i, 1); }
    for (let i = chunks.length - 1; i >= 0; i--) { const c = chunks[i]; c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 160 * dt; if (c.t > c.d) chunks.splice(i, 1); }
    for (const f of flakes) {
      f.y += f.sp * dt; f.x += Math.sin(G.time * 0.8 + f.ph) * 5 * dt - G.v * dt * [0.9, 0.55, 0.3][f.s];
      if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
      f.x = mod(f.x + 5, W + 10) - 5;
    }
    for (let i = sparkles.length - 1; i >= 0; i--) { sparkles[i].t += dt; if (sparkles[i].t > sparkles[i].d) sparkles.splice(i, 1); }
    if (audioStarted) AU.wheels.volume = clamp(0.55 * Math.abs(G.v) / VMAX, 0, 1);
  }
  // ------------------------------------------------------------------ day & night: we start at night, the day is short
  function dayInfo() {
    if (G.scene === 'title' || G.scene === 'loading') return { f: 0.05, d: 0, w: 0, sun: -1 };
    const f = mod(G.dayT, DAY_LEN) / DAY_LEN;
    const sm = t => t * t * (3 - 2 * t);
    let d = 0, w = 0;
    if (f >= 0.45 && f < 0.55) { const t = (f - 0.45) / 0.1; d = sm(t); w = Math.sin(Math.PI * t); }
    else if (f >= 0.55 && f < 0.75) d = 1;
    else if (f >= 0.75 && f < 0.85) { const t = (f - 0.75) / 0.1; d = sm(1 - t); w = Math.sin(Math.PI * t); }
    const sun = f >= 0.43 && f < 0.87 ? (f - 0.43) / 0.44 : -1;
    return { f, d, w, sun };
  }
  function updateDay(dt) {
    if (G.scene === 'finale') return;          // time stands still during the finale
    G.dayT += dt;
    const f = mod(G.dayT, DAY_LEN) / DAY_LEN;
    const ph = f >= 0.45 && f < 0.55 ? 'dawn' : f >= 0.55 && f < 0.75 ? 'day' : f >= 0.75 && f < 0.85 ? 'dusk' : 'night';
    if (ph !== G.dayPhase) { if (ph === 'dawn') toast(tr('t_dawn')); if (ph === 'dusk') toast(tr('t_dusk')); G.dayPhase = ph; }
  }
  const mixC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function drawDaySky(d, w) {
    const top = mixC([93, 143, 216], [122, 120, 196], w), hor = mixC([217, 232, 248], [247, 178, 138], w);
    const hy = yOff + 165;
    g.globalAlpha = d;
    for (let y = 0; y < H; y += 3) {
      const t = Math.pow(clamp(y / hy, 0, 1), 1.4);
      const c = mixC(top, hor, t);
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(0, y, W, 3);
    }
    g.globalAlpha = 1;
  }
  const starY = () => lerp(H + 20, yOff + 44, ease(clamp(G.finT / 5, 0, 1)));

  // ------------------------------------------------------------------ render: world (drawn in 216-px world coords, shifted down by yOff)
  function tile(img, off, y = 0) { const w = img.width; for (let x = -mod(off, w); x < W; x += w) g.drawImage(img, Math.round(x), y); }
  function drawNpc(n) {
    if (!n.visible) return;
    const x = sxW(n.x); if (x < -24 || x > W + 4) return;
    let f, y = PLAT_Y - 23;
    if (n.walkTo !== null) { f = Math.floor(G.time * 7) % 2; y -= f; }
    else if (n.wave > 0) f = 2 + Math.floor(G.time * 5) % 2;
    else f = Math.floor(G.time * 1.6 + n.phase) % 2;
    frame(g, IM['c_' + n.spr], 20, f, x, y);
  }
  function renderWorld() {
    const day = dayInfo();
    g = gLo;
    g.fillStyle = C.sky0; g.fillRect(0, 0, W, H);
    g.fillStyle = '#bfc8f0';
    for (const [sx, sy, b] of topStars) if (sx < W && sy < yOff) { g.globalAlpha = 0.4 + b * 0.6; g.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
    g.globalAlpha = 1;
    g.save(); g.translate(0, yOff); tile(IM.bg_1_sky, 0); g.restore();
    if (day.d > 0) drawDaySky(day.d, day.w);
    if (day.sun >= 0) {                                   // the sun crosses the sky behind the mountains
      const sx = W * (0.1 + 0.8 * day.sun), sy = yOff + 150 - Math.sin(Math.PI * day.sun) * 115;
      const low = 1 - Math.sin(Math.PI * day.sun);
      glow(g, sx, sy, 22, low > 0.5 ? 'rgba(255,170,110,' : 'rgba(255,240,190,');
      g.fillStyle = low > 0.6 ? '#ffc48a' : '#fff1c4'; g.beginPath(); g.arc(Math.round(sx), Math.round(sy), 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 2, 2);
    }
    if (G.lettersGiven && G.scene !== 'finale') { glow(g, W * 0.7 + 20, yOff + 40, 16, 'rgba(255,223,138,'); frame(g, IM.star, 40, Math.floor(G.time * 2) % 2, W * 0.7, yOff + 20, 0.9); }
    // everything below the sky goes on its own layer so daylight can tint it
    g = wg; g.clearRect(0, 0, W, H);
    const shx = G.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * G.shake * 2) : 0;
    const shy = G.shake > 0 ? Math.round((Math.random() - 0.5) * 3 * G.shake * 2) : 0;
    g.save(); g.translate(shx, yOff + shy);
    tile(IM.bg_2_mountains, G.camX * 0.1);
    tile(IM.bg_3_forest_far, G.camX * 0.3);
    tile(IM.bg_4_forest_near, G.camX * 0.55);
    // snowy ground behind the tracks: everything in the countryside stands on it
    g.fillStyle = '#bfc8f0'; g.fillRect(0, 171, W, 12);
    g.fillStyle = '#e4eaff'; g.fillRect(0, 170, W, 2);
    g.fillStyle = '#919dd6'; for (let x = -mod(G.camX, 6); x < W; x += 6) g.fillRect(Math.round(x), 177, 2, 1);
    const tAnim = G.time * 1000;
    for (const o of objs) {
      if (!o.visible) continue;
      const x = sxW(o.x); if (x > W + 4 || x + o.w < -4) continue;
      if (o.frames) frame(g, IM[o.img], o.w, Math.floor(tAnim / o.ms) % o.frames, x, o.y);
      else draw(g, IM[o.img], x, o.y);
      if (o.garland) {
        if (G.giftDone[o.garland]) frame(g, IM.garland_on, 48, Math.floor(tAnim / 300) % 4, x + 8, o.y + 31);
        else draw(g, IM.garland_off, x + 8, o.y + 31);
      }
      if (o.sign) {
        const name = isCJK() ? tr(o.sign) : tr(o.sign).toLocaleUpperCase(lang);
        TW(name, x + o.sx + o.sw / 2, yOff + o.y + o.sy + 1.2, { size: fitSize(name, o.sw - 2, 6.2), color: C.gold, align: 'center', shadow: false, weight: 700 });
      }
      if (o.board) {
        const name = tr('st_' + o.board);
        TW(name, x + 46, yOff + o.y + 4.5, { size: fitSize(name, 82, 8), color: C.gold, align: 'center', shadow: false, weight: 700 });
      }
    }
    // characters stand on the platform BEHIND the train
    for (const n of Object.values(npcs)) drawNpc(n);
    tile(IM.ground, G.camX, GROUND_Y);
    // obstacles sit on the rails in front of the platform
    for (const ob of obstacles) {
      const x = sxW(ob.x); if (x > W + 10 || x < -60) continue;
      const img = ob.type === 'drift' ? IM.ob_drift : IM.ob_rocks, wid = img.width / 4;
      const stage = Math.min(3, Math.floor((5 - ob.hp) * 4 / 5));
      const jx = ob.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
      frame(g, img, wid, stage, x + jx, RAIL_Y + 4 - img.height);
      const d = ahead(ob.x);
      if (G.scene === 'play' && d > -20 && d < 420 && Math.floor(G.time * 3) % 2 === 0) draw(g, IM.i_warn, x + wid / 2 - 6, RAIL_Y - 46 - Math.round(Math.sin(G.time * 4) * 2));
    }
    // train: mail, passenger, gifts, loco
    const wf = mod(Math.floor(G.dist / 3), 4);
    const ty = RAIL_Y + 1, lx = Math.round(G.trainX - G.camX - LOCO_W);
    frame(g, IM.w_mail, WAG_W, wf, lx - WAG_STEP * 3, ty - 48);
    frame(g, onboard().length ? IM.w_pass_full : IM.w_pass_empty, WAG_W, wf, lx - WAG_STEP * 2, ty - 48);
    frame(g, G.gifts.carried > 0 ? IM.w_gifts_full : IM.w_gifts_empty, WAG_W, wf, lx - WAG_STEP, ty - 48);
    frame(g, IM.loco, LOCO_W, wf, lx, ty - 56);
    for (const f of flies) {
      const p = ease(clamp(f.t / f.dur, 0, 1));
      const x = lerp(f.x0, f.x1, p), y = lerp(f.y0, f.y1, p) - Math.sin(Math.PI * p) * f.arc;
      const im = IM[f.img]; draw(g, im, sxW(x) - im.width / 2, y - im.height / 2);
    }
    for (const p of smoke) frame(g, IM.smoke, 20, Math.min(3, Math.floor(p.age / 0.4)), sxW(p.x) - 10, p.y - 10);
    for (const c of chunks) { g.globalAlpha = 1 - c.t / c.d; g.fillStyle = c.c; g.fillRect(Math.round(sxW(c.x)), Math.round(c.y), c.s, c.s); }
    g.globalAlpha = 1;
    for (const s of sparkles) if (s.world) spark(g, sxW(s.x), s.y, s.t / s.d);
    g.restore();
    if (day.d > 0 || day.w > 0) {
      wg.globalCompositeOperation = 'source-atop';
      if (day.d > 0) { wg.fillStyle = `rgba(226,236,255,${0.3 * day.d})`; wg.fillRect(0, 0, W, H); }
      if (day.w > 0) { wg.fillStyle = `rgba(255,160,110,${0.16 * day.w})`; wg.fillRect(0, 0, W, H); }
      wg.globalCompositeOperation = 'source-over';
    }
    g = gLo;
    g.drawImage(wl, 0, 0);
    for (const f of flakes) frame(g, IM.flakes, 5, f.s, f.x, f.y);
  }
  function glow(c, x, y, r, rgbaPrefix) {
    for (const [k, a] of [[1, 0.10], [0.7, 0.14], [0.45, 0.2]]) { c.fillStyle = rgbaPrefix + a + ')'; c.beginPath(); c.arc(Math.round(x), Math.round(y), r * k, 0, Math.PI * 2); c.fill(); }
  }
  function spark(c, x, y, p) {
    const a = 1 - Math.abs(p * 2 - 1);
    c.fillStyle = `rgba(255,246,208,${a})`; x = Math.round(x); y = Math.round(y);
    c.fillRect(x, y, 1, 1); if (a > 0.5) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); }
  }

  // ------------------------------------------------------------------ render: UI
  function cut() { ctx.drawImage(uiC, 0, 0, W * S, H * S); flushTexts(UT); u.clearRect(0, 0, W, H); }
  function button(x, y, w, h, label, key, fn, id, selected) {
    const hov = (hover && hover.id === id) || selected;
    nine(u, IM.button, x, y, w, h);
    if (hov) { u.fillStyle = 'rgba(255,246,208,0.2)'; u.fillRect(x + 3, y + 3, w - 6, h - 6); }
    let tx = x + 8;
    if (key) { T(key, tx, y + h / 2 - 4, { size: 7, color: C.gold, weight: 700 }); tx += measure(key, 7, 700) + 4; }
    T(label, key ? tx : x + w / 2, y + h / 2 - 4.5, { size: 8, align: key ? 'left' : 'center' });
    zone(x, y, w, h, fn, id);
  }
  function iconButton(x, y, draw_, fn, id) {
    nine(u, IM.panel, x, y, 20, 19); draw_(x, y);
    if (hover && hover.id === id) { u.fillStyle = 'rgba(255,246,208,0.15)'; u.fillRect(x + 3, y + 3, 14, 13); }
    zone(x, y, 20, 19, fn, id);
  }
  function renderUI() {
    u.clearRect(0, 0, W, H); zones = [];
    if (G.scene === 'loading') {
      u.fillStyle = C.sky0; u.fillRect(0, 0, W, H);
      T(tr('title'), W / 2, H / 2 - 20, { size: 16, color: C.gold, align: 'center', weight: 700 });
      T(`${tr('loading')} ${Math.round(loaded / total * 100)}%`, W / 2, H / 2 + 6, { size: 8, align: 'center', color: C.mute });
      cut(); return;
    }
    if (G.scene === 'title') renderTitle();
    else {
      if (G.scene === 'finale') { renderFinaleSky(); cut(); }
      renderHUD();
      if (dlg && !G.journal) renderDialog();
      else if (G.scene === 'play' && !G.journal) renderControls();
      renderToasts();
      cut();
      if (G.scene === 'finale') { renderFinale(); cut(); }
      if (G.journal) { renderJournal(); cut(); }
    }
    if (G.menu) { renderMenu(); cut(); }
    if (G.fade > 0) { u.fillStyle = `rgba(13,11,31,${G.fade})`; u.fillRect(0, 0, W, H); }
    cut();
  }

  function renderHUD() {
    const st = curStation();
    let label;
    if (G.mode === 'free') label = tr('hudFree');
    else if (st) label = stName(st.id);
    else { const [ni, nd] = nextStation(); label = tr('hudNext', { name: stName(ST[ni].id), d: Math.max(0, Math.round(nd / 40) * 10) }); }
    const lw = Math.max(110, measure(label, 8) + 32);
    nine(u, IM.panel, 3, 3, lw, 19); draw(u, IM.i_train, 5, 4); T(label, 23, 8, { size: 8 });
    [['i_gift', `${G.gifts.delivered}/3`], ['i_letter', `${lettersGot().length}/3`], ['i_pass', `${onboard().length}`]].forEach(([ic, t], i) => {
      const x = W - 3 - (3 - i) * 46;
      nine(u, IM.panel, x, 3, 43, 19); draw(u, IM[ic], x + 3, 4); T(t, x + 22, 8, { size: 8, color: C.light });
      zone(x, 3, 43, 19, () => { G.journal = !G.journal; sfx('click', 0.3); }, 'hud' + i);
    });
    iconButton(3, 24, (x, y) => draw(u, IM.i_whistle, x + 2, y + 1), whistle, 'whistle');
    iconButton(25, 24, (x, y) => draw(u, IM.i_letter, x + 2, y + 1), () => { G.journal = !G.journal; }, 'journal');
    iconButton(47, 24, (x, y) => speaker(x, y), toggleMute, 'mute');
    iconButton(69, 24, (x, y) => { u.fillStyle = C.light; for (let i = 0; i < 3; i++) u.fillRect(x + 5, y + 5 + i * 4, 10, 2); }, () => openMenu(), 'menu');
  }
  function speaker(x, y) {
    u.fillStyle = audioOn ? C.light : '#6670b0';
    u.fillRect(x + 5, y + 7, 3, 5); u.fillRect(x + 8, y + 5, 2, 9); u.fillRect(x + 10, y + 4, 1, 11);
    if (audioOn) { u.fillRect(x + 12, y + 7, 1, 5); u.fillRect(x + 14, y + 6, 1, 7); }
    else { u.fillStyle = C.red; for (let i = 0; i < 5; i++) { u.fillRect(x + 12 + i, y + 7 + i, 1, 1); u.fillRect(x + 16 - i, y + 7 + i, 1, 1); } }
  }

  function renderControls() {
    // touch / mouse driving buttons (bottom-right)
    const bx = W - 60, by = H - 26;
    button(bx, by, 27, 22, '', '', throttleDown, 'tl'); draw(u, IM.a_left, bx + 8, by + 5);
    button(bx + 30, by, 27, 22, '', '', throttleUp, 'tr'); draw(u, IM.a_right, bx + 39, by + 5);
    button(bx - 30, by, 27, 22, '', '', () => { if (!canDrive()) return; G.boostTouch = true; if (G.throttle === 0) throttleUp(); }, 'boost');
    draw(u, IM.a_right, bx - 25, by + 5); draw(u, IM.a_right, bx - 18, by + 5);
    if (busy()) return;
    const acts = actions();
    if (acts.length) {
      const gap = 4;
      const specs = acts.map((a, i) => { const key = i === 0 ? 'E' : String(i + 1), label = tr(a.key); return { a, key, label, w: Math.round(measure(label, 8) + measure(key, 7, 700) + 22) }; });
      const totalW = specs.reduce((s, b) => s + b.w, 0) + gap * (specs.length - 1);
      let x = Math.round(Math.max(4, (W - 66) / 2 - totalW / 2));
      specs.forEach((b, i) => { button(x, H - 26, b.w, 22, b.label, b.key, () => doAction(b.a), 'act' + i); x += b.w + gap; });
      return;
    }
    // contextual hint (bottom-left)
    let hint, col = C.mute, a = 0.95;
    const [ni, nd] = nextStation();
    const ob = nearObstacle();
    if (ob && Math.abs(G.v) < 0.5 && ahead(ob.x) < 150) { hint = tr('h_clear'); col = C.light; }
    else if (G.v > 0 && G.mode === 'story' && nd < 150 + G.v * G.v / (2 * BRK) && G.throttle === 1) { hint = tr('h_platform'); col = C.gold; a = Math.floor(G.time * 3) % 2 ? 1 : 0.55; }
    else if (G.v < 0) hint = tr('h_reverse');
    else if (Math.abs(G.v) < 0.5) hint = tr('h_stopped');
    else hint = tr('h_moving');
    const size = fitSize(hint, W - 80, 7.5, 600);
    T(hint, 6, H - 15, { size, color: col, alpha: a });
  }

  function renderToasts() {
    toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 4, (t.dur - t.t) * 3);
      const lines = wrap(t.text, 8, Math.min(300, W - 60));
      const w = Math.max(...lines.map(l => measure(l, 8))) + 20, h = 10 * lines.length + 9;
      const y = (dlg && !G.journal ? (G.dlgBottom || 100) + 4 : 48) + i * (h + 3);
      u.globalAlpha = a; nine(u, IM.panel, W / 2 - w / 2, y, w, h); u.globalAlpha = 1;
      lines.forEach((l, j) => T(l, W / 2, y + 5 + j * 10, { size: 8, align: 'center', color: C.light, alpha: a }));
    });
  }

  function renderDialog() {
    const lines = dlgLines(dlg);
    const w = Math.min(W - 12, 460), h = Math.max(54, 24 + lines.length * 10), x = Math.round((W - w) / 2), y = 46;
    G.dlgBottom = y + h;
    nine(u, IM.panel, x, y, w, h);
    u.drawImage(IM['p_' + NPCSPR[dlg.who]], x + 4, y + 3, 48, 48);
    T(tr('n_' + dlg.who), x + 58, y + 6, { size: 8, color: C.gold, weight: 700 });
    let left = Math.floor(dlg.shown);
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      T([...ln].slice(0, left).join(''), x + 58, y + 18 + i * 10, { size: 8 });
      left -= [...ln].length;
    });
    if (dlg.shown >= dlg.len && Math.floor(G.time * 2.5) % 2 === 0) {
      u.fillStyle = C.gold; const ax = x + w - 14, ay = y + h - 11;
      u.fillRect(ax, ay, 5, 1); u.fillRect(ax + 1, ay + 1, 3, 1); u.fillRect(ax + 2, ay + 2, 1, 1);
    }
  }

  function renderJournal() {
    const w = Math.min(W - 16, 380), h = Math.min(H - 16, 216), x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    u.fillStyle = 'rgba(13,11,31,0.55)'; u.fillRect(0, 0, W, H);
    nine(u, IM.panel, x, y, w, h);
    zone(0, 0, W, H, () => { G.journal = false; }, 'jbg'); zone(x, y, w, h, () => {}, 'jpanel');
    T(tr('j_title'), x + w / 2, y + 8, { size: 10, color: C.gold, align: 'center', weight: 700 });
    const colW = w - 196;
    T(tr('j_route'), x + 12, y + 26, { size: 8, color: C.gold, weight: 700 });
    ST.forEach((s, i) => {
      const yy = y + 39 + i * 15;
      let done, totalN;
      if (s.id === 'santa') { totalN = 2; done = (G.everLoaded && G.gifts.atSanta === 0 ? 1 : 0) + (G.lettersGiven ? 1 : 0); }
      else {
        const ls = LETTERS.filter(l => l.st === s.id), ps = PASS.filter(p => p.from === s.id || p.to === s.id);
        totalN = ls.length + 1 + ps.length;
        done = ls.filter(l => l.state !== 'box').length + (G.giftDone[s.id] ? 1 : 0) + ps.filter(p => (p.from === s.id ? (p.onboard || p.done) : p.done)).length;
      }
      const isHere = G.atSt === i;
      if (isHere) draw(u, IM.i_train, x + 8, yy - 4);
      const nm = stName(s.id);
      T(nm, x + 28, yy, { size: fitSize(nm, colW - 50, 8, 600), color: isHere ? C.light : C.cream });
      if (done === totalN) draw(u, IM.i_heart, x + colW - 14, yy - 2);
      else T(`${done}/${totalN}`, x + colW - 2, yy, { size: 7, color: C.mute, align: 'right' });
    });
    T(tr('j_pass'), x + 12, y + 104, { size: 8, color: C.gold, weight: 700 });
    PASS.forEach((p, i) => {
      const status = tr(p.done ? 's_done' : p.onboard ? 's_on' : 's_wait');
      const line = `${tr('n_' + p.npc)} → ${stName(p.to)}`;
      T(line, x + 12, y + 117 + i * 20, { size: fitSize(line, colW - 14, 7, 600) });
      T(status, x + 20, y + 126 + i * 20, { size: 7, color: p.done ? C.green : p.onboard ? C.light : C.mute });
    });
    const px = x + w - 188, py = y + 24;
    draw(u, IM.paper, px, py);
    const got = lettersGot();
    G.jPage = clamp(G.jPage, 0, Math.max(0, got.length - 1));
    if (!got.length) wrap(tr('j_none'), 8, 130).forEach((l, i) => T(l, px + 88, py + 36 + i * 11, { size: 8, color: C.brown, align: 'center', shadow: false }));
    else {
      const Lt = got[G.jPage];
      wrap(tr(Lt.text), 7.5, 120).slice(0, 8).forEach((l, i) => T(l, px + 16, py + 14 + i * 10, { size: 7.5, color: C.brown, shadow: false, weight: 500 }));
      T('— ' + Lt.from(), px + 16, py + 100, { size: fitSize('— ' + Lt.from(), 100, 7, 500), color: C.brown2, shadow: false, weight: 500 });
      T(`${G.jPage + 1} / ${got.length}`, px + 88, py + 124, { size: 7, color: C.mute, align: 'center' });
      if (G.jPage > 0) { draw(u, IM.a_left, px - 13, py + 54); zone(px - 16, py + 44, 16, 32, () => { G.jPage--; }, 'jl'); }
      if (G.jPage < got.length - 1) { draw(u, IM.a_right, px + 179, py + 54); zone(px + 176, py + 44, 16, 32, () => { G.jPage++; }, 'jr'); }
    }
    T(tr('j_footer'), x + w / 2, y + h - 14, { size: 7, color: C.mute, align: 'center' });
  }

  function controlsRows() {
    return [['→ / D', 'c_go'], ['← / A', 'c_back'], ['↓ / S', 'c_stop'], ['E / W / ↑', 'c_act'], [tr('keySpace'), 'c_next'],
      [tr('keyClick'), 'c_click'], ['H', 'c_whistle'], ['Tab', 'c_journal'], ['Esc', 'c_menu'], ['M', 'c_sound']];
  }
  function renderMenu() {
    u.fillStyle = 'rgba(13,11,31,0.6)'; u.fillRect(0, 0, W, H);
    const items = menuItems();
    if (G.menu === 'controls') {
      const rows = controlsRows();
      const w = Math.min(W - 20, 300), h = 40 + rows.length * 12 + 30, x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
      nine(u, IM.panel, x, y, w, h);
      T(tr('m_controls'), x + w / 2, y + 8, { size: 10, color: C.gold, align: 'center', weight: 700 });
      rows.forEach(([k, l], i) => { T(k, x + 16, y + 28 + i * 12, { size: 7.5, color: C.light, weight: 700 }); T(tr(l), x + 100, y + 28 + i * 12, { size: fitSize(tr(l), w - 112, 7.5) }); });
      button(x + w / 2 - 50, y + h - 28, 100, 20, items[0].label, '', items[0].fn, 'm0', true);
      return;
    }
    const w = Math.min(W - 20, 220), rowH = 20, h = 34 + items.length * (rowH + 3) + 6;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    nine(u, IM.panel, x, y, w, h);
    T(G.menu === 'lang' ? tr('m_language') : (G.scene === 'title' ? tr('title') : tr('m_paused')), x + w / 2, y + 9, { size: 10, color: C.gold, align: 'center', weight: 700 });
    items.forEach((it, i) => {
      const by = y + 30 + i * (rowH + 3);
      const sel = i === G.menuSel;
      nine(u, sel ? IM.button : IM.panel, x + 12, by, w - 24, rowH);
      if (hover && hover.id === 'mi' + i) { u.fillStyle = 'rgba(255,246,208,0.15)'; u.fillRect(x + 15, by + 3, w - 30, rowH - 6); }
      // language names use their own script: draw them with a neutral stack so every name renders
      T(it.label, x + w / 2, by + rowH / 2 - 4.5, { size: 8, align: 'center', color: it.cur ? C.gold : C.cream, weight: it.cur ? 700 : 600 });
      zone(x + 12, by, w - 24, rowH, () => { G.menuSel = i; sfx('click', 0.3); it.fn(); }, 'mi' + i);
    });
  }

  function renderTitle() {
    u.fillStyle = 'rgba(20,18,40,0.42)'; u.fillRect(0, 0, W, H);
    const a = Math.min(1, G.time * 0.8);
    const cy = Math.round(H * 0.18);
    T(tr('title'), W / 2, cy, { size: fitSize(tr('title'), W - 40, 24, 700), color: C.gold, align: 'center', weight: 700, alpha: a });
    T(tr('subtitle'), W / 2, cy + 32, { size: fitSize(tr('subtitle'), W - 40, 9), align: 'center', alpha: a });
    if (!G.menu && Math.floor(G.time * 1.6) % 2 === 0) T(tr('pressStart'), W / 2, cy + 56, { size: 9, color: C.light, align: 'center' });
    // language button (top-right) — English by default on first visit
    const lbl = `${tr('m_language')}: ${LANG_NAMES[lang]}`;
    const bw = Math.round(measure(lbl, 8) + 20);
    if (!G.menu) button(W - bw - 4, 4, bw, 20, lbl, '', () => openMenu('lang'), 'langbtn');
    if (!G.menu) T('Esc — ' + tr('c_menu'), 6, 9, { size: 7, color: C.mute });
  }

  function renderFinaleSky() {
    u.fillStyle = `rgba(20,18,40,${Math.min(0.45, G.finT * 0.12)})`; u.fillRect(0, 0, W, H);
    const sy = starY();
    glow(u, W / 2, sy, 26 + Math.sin(G.time * 3) * 2, 'rgba(255,223,138,');
    frame(u, IM.star, 40, Math.floor(G.time * 2) % 2, W / 2 - 20, sy - 20);
    for (const s of sparkles) if (!s.world) spark(u, s.x, s.y, s.t / s.d);
  }
  function renderFinale() {
    const t = G.finT, a1 = clamp((t - 4.5) / 1.5, 0, 1), cy = yOff + 78;
    T(tr('f1'), W / 2, cy, { size: fitSize(tr('f1'), W - 30, 12, 700), color: C.cream, align: 'center', alpha: a1, weight: 700 });
    T(tr('f2'), W / 2, cy + 16, { size: fitSize(tr('f2'), W - 30, 12, 700), color: C.cream, align: 'center', alpha: a1, weight: 700 });
    T(tr('f3'), W / 2, cy + 38, { size: 9, color: C.gold, align: 'center', alpha: clamp((t - 7) / 1.2, 0, 1) });
    if (t > 9) { const lbl = tr('f_again'); const w = Math.round(measure(lbl, 8) + measure(tr('keySpace'), 7, 700) + 26); button(W / 2 - w / 2, cy + 66, w, 20, lbl, tr('keySpace'), toFreeMode, 'again'); }
  }

  // ------------------------------------------------------------------ main loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * (window.__timeScale || 1);
    last = now;
    update(dt);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (G.scene !== 'loading') { renderWorld(); ctx.drawImage(lo, 0, 0, W * S, H * S); flushTexts(WT); }
    renderUI();
    requestAnimationFrame(loop);
  }
  async function boot() {
    resize(); addEventListener('resize', resize);
    setLang(lang);
    requestAnimationFrame(loop);
    const fontWait = (document.fonts && document.fonts.load) ? Promise.race([
      Promise.all([document.fonts.load(`600 16px "Pixelify Sans"`), document.fonts.load(`700 16px "Pixelify Sans"`)]),
      new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : Promise.resolve();
    await Promise.all([loadImages(), fontWait]);
    buildWorld();
    G.trainX = 900; G.camX = G.trainX - Math.round(W * 0.6); G.v = VMAX * 0.8;
    G.scene = 'title'; G.time = 0; G.fade = 1;
  }
  boot();

  // debug hook for automated playtests (harmless for players)
  window.__game = { get G() { return G; }, ST, get LETTERS() { return LETTERS; }, get PASS() { return PASS; }, get obstacles() { return obstacles; },
    actions: () => actions(), busy: () => busy(), dlg: () => dlg, setLang, tr, hit: () => { const o = nearObstacle(); if (o) hitObstacle(o); return !!o; },
    ahead: x => ahead(x), get npcs() { return npcs; }, dayInfo: () => dayInfo() };
})();
