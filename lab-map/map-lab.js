/* ============================================================
   lab-map — раздел «Карта». Данные: data-pipeline/jungle-economy.json
   Под-вкладки [Карта · Страта] — ИНЛАЙН, без модалок.

   ★ НЕ ТАЩИТЬ ДЁРГАНЬЕ — что вычищено в этом порте:
   п.1/п.3 — у вкладок НЕТ анимации появления (постоянные блоки, display:none их бы переигрывал);
   п.4 — убран принудительный перезапуск анимации (void offsetWidth) на КОНТЕЙНЕРЕ вкладки;
   п.5 — ползунок минуты обновляет ТОЛЬКО изменившиеся числа, а не innerHTML всей панели.
   Страта грузится ЛЕНИВО при первом открытии (DESIGN.md: разделы = lazy).
   ============================================================ */
(() => {
  'use strict';

  const DATA_URL = '../data-pipeline/jungle-economy.json';
  let DATA = null;

  /* --- какие объекты и где на карте (позиции % — ДЕМО-раскладка) --- */
  const OBJECTS = [
    { id: 'baron',    ru: 'Барон Нашор',  ico: '🐲', cls: 'o-epic', x: 20, y: 18, get: d => d.epicMonsters.baronNashor,     cat: 'epic' },
    { id: 'dragon',   ru: 'Дракон',       ico: '🔥', cls: 'o-epic', x: 80, y: 82, get: d => d.epicMonsters.elementalDragons, cat: 'dragon' },
    { id: 'scuttleT', ru: 'Скатл (верх)', ico: '🦀', cls: '',       x: 34, y: 34, get: d => d.jungleCamps.scuttleCrab,       cat: 'camp' },
    { id: 'scuttleB', ru: 'Скатл (низ)',  ico: '🦀', cls: '',       x: 66, y: 66, get: d => d.jungleCamps.scuttleCrab,       cat: 'camp' },
    { id: 'blue',     ru: 'Синий бафф',   ico: '🔵', cls: 'o-blue', x: 27, y: 70, get: d => d.jungleCamps.blueSentinel,      cat: 'camp' },
    { id: 'red',      ru: 'Красный бафф', ico: '🔴', cls: 'o-red',  x: 47, y: 83, get: d => d.jungleCamps.redBrambleback,    cat: 'camp' },
    { id: 'gromp',    ru: 'Громп',        ico: '🐸', cls: '',       x: 17, y: 55, get: d => d.jungleCamps.gromp,             cat: 'camp' },
    { id: 'wolves',   ru: 'Волки',        ico: '🐺', cls: '',       x: 38, y: 63, get: d => d.jungleCamps.murkWolves,        cat: 'camp' },
    { id: 'raptors',  ru: 'Raptors',      ico: '🦅', cls: '',       x: 60, y: 90, get: d => d.jungleCamps.raptors,           cat: 'camp' },
    { id: 'laneT',    ru: 'Линия (верх)', ico: '⚑', cls: 'o-lane', x: 50, y: 15, get: d => d.minions,                       cat: 'minions' },
    { id: 'laneM',    ru: 'Линия (центр)',ico: '⚑', cls: 'o-lane', x: 50, y: 50, get: d => d.minions,                       cat: 'minions' },
    { id: 'laneB',    ru: 'Линия (низ)',  ico: '⚑', cls: 'o-lane', x: 85, y: 50, get: d => d.minions,                       cat: 'minions' },
  ];

  let selectedId = null;
  /* живые узлы панели — обновляем ИХ, а не пересобираем панель */
  const live = { goldN: null, goldTag: null };

  const $ = id => document.getElementById(id);

  /* ---------- утилиты ---------- */
  const fmtTime = s => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  const pickPatch = (obj, key) => {
    const bp = obj[key + '_byPatch'];
    if (bp) return { v: bp.p6 ?? bp.older, note: bp.note };
    return { v: obj[key], note: null };
  };

  /* золото на текущей минуте (шаговая scaling у баффов) */
  function goldAt(node, minute) {
    const g = node.gold;
    if (!g) return { text: '—', demo: false, live: false };
    if (Array.isArray(g.scaling)) {
      let val = g.scaling[0].gold;
      for (const p of g.scaling) if (minute >= p.atMinute) val = p.gold;
      return { text: `${val}`, demo: !!g.demo, live: true };
    }
    if (g.individual != null) {
      const t = g.team != null ? `${g.individual} / ${g.team} team` : `${g.individual}`;
      return { text: t, demo: !!g.demo, live: false };
    }
    const v = g.value ?? g.total;
    return { text: v != null ? `${v}` : '—', demo: !!g.demo, live: false };
  }

  /* дез-таймер (ДЕМО-модель): уровень≈по минуте + поздний множитель */
  function deathTimer(minute) {
    const dt = DATA.scaling.deathTimer;
    const lvl = Math.max(1, Math.min(dt.maxLevel, Math.floor(minute * 0.6) + 1));
    let base = dt.approxTableDemo[0].baseRespawn_s;
    for (const row of dt.approxTableDemo) if (lvl >= row.level) base = row.baseRespawn_s;
    const lateMul = minute > 15 ? 1 + (minute - 15) * 0.08 : 1;
    return { sec: Math.round(base * lateMul), lvl };
  }

  const minuteNow = () => +$('minSlider').value;

  /* ---------- объекты на карте (строятся ОДИН раз) ---------- */
  function renderObjects() {
    const layer = $('objLayer');
    const frag = document.createDocumentFragment();
    for (const o of OBJECTS) {
      const b = document.createElement('button');
      b.className = `obj ${o.cls}`;
      b.style.left = o.x + '%';
      b.style.top = o.y + '%';
      b.dataset.id = o.id;
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.textContent = o.ico;
      const lbl = document.createElement('span');
      lbl.className = 'obj-lbl';
      lbl.textContent = o.ru;
      b.append(dot, lbl);
      b.addEventListener('click', () => selectObject(o.id));
      frag.appendChild(b);
    }
    layer.appendChild(frag);
  }

  function selectObject(id) {
    if (selectedId === id) return;
    selectedId = id;
    document.querySelectorAll('.obj').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
    renderDetail();
  }

  function row(l, v) { return `<div class="d-row"><span class="r-l">${l}</span><span class="r-v">${v}</span></div>`; }
  function demoTag(on) { return on ? ' <span class="demo">демо</span>' : ''; }

  /* ПОЛНАЯ сборка панели — только при СМЕНЕ выбранного объекта (не на каждый тик) */
  function renderDetail() {
    const empty = $('detailEmpty');
    const body = $('detailBody');
    live.goldN = live.goldTag = null;
    if (!selectedId || !DATA) { empty.hidden = false; body.hidden = true; return; }

    const o = OBJECTS.find(x => x.id === selectedId);
    const node = o.get(DATA);
    const minute = minuteNow();

    let html = '';
    const title = node.ru || o.ru;

    if (o.cat === 'minions') {
      const t = node.types;
      html = `
        <div class="d-head"><span class="d-ico">${o.ico}</span><h2>Миньоны</h2>${demoTag(true)}</div>
        <div class="d-sub">Волна: ${node.wave.baseComposition.melee}× ближних + ${node.wave.baseComposition.caster}× дальних, осадный по каденции · интервал ~${node.wave.interval_s}с</div>
        <div class="d-rows">
          ${row('Ближний (воин)' + demoTag(t.melee.gold.demo), t.melee.gold.value + ' зол.')}
          ${row('Дальний (маг)' + demoTag(t.caster.gold.demo), t.caster.gold.value + ' зол.')}
          ${row('Осадный (пушка)' + demoTag(t.siege.gold.demo), t.siege.gold.value + ' зол.')}
          ${row('Супер-миньон' + demoTag(t.super.gold.demo), t.super.gold.value + ' зол.')}
        </div>
        <div class="d-buff">Осадный дорожает с минутой игры; точные per-type числа для 7.x не подтверждены (см. json).</div>`;
    } else {
      const g = goldAt(node, minute);
      const respawn = pickPatch(node, 'respawn_s');
      const spawn = pickPatch(node, 'spawn_s');
      const goldTag = g.demo ? '<span class="demo">демо</span>' : (g.live ? `<span class="demo soft" id="dGoldTag">${minute} мин</span>` : '');
      html = `<div class="d-head"><span class="d-ico">${o.ico}</span><h2>${title}</h2></div>`;
      html += `<div class="d-kpis">
          <div class="d-kpi"><div class="k-n ${g.live ? 'live' : ''}" id="dGoldN">${g.text}</div><div class="k-l">золото ${goldTag}</div></div>
          <div class="d-kpi"><div class="k-n">${fmtTime(respawn.v)}</div><div class="k-l">респаун</div></div>
        </div>`;
      let rows = '';
      rows += row('Спаун (первый)', fmtTime(spawn.v));
      if (node.xp) rows += row('Опыт' + demoTag(node.xp.demo), node.xp.value != null ? node.xp.value : '—');
      if (o.cat === 'dragon') {
        rows += row('Слой', 'Dragon Slayer (со 2-го)');
        rows += row('Старший дракон', 'с 19:00 (истин. урон + казнь)');
      }
      html += `<div class="d-rows">${rows}</div>`;
      if (node.buff) {
        const bf = node.buff;
        html += `<div class="d-buff"><b>Бафф:</b> ${bf.name ? bf.name + ' — ' : ''}${bf.effect || ''}${bf.duration_s ? ` (${fmtTime(bf.duration_s)})` : ''}</div>`;
      }
      if (o.cat === 'dragon') {
        const ty = node.types;
        html += `<div class="d-buff"><b>Стихии:</b> Огонь — ${ty.infernal.buff}; Гора — ${ty.mountain.buff}; Океан — ${ty.ocean.buff}; Облако — ${ty.cloud.buff}${demoTag(ty.cloud.demo)}.</div>`;
      }
      if (respawn.note || spawn.note) {
        html += `<div class="d-buff" style="opacity:.75">⌁ ${spawn.note || respawn.note}</div>`;
      }
    }

    body.innerHTML = html;
    empty.hidden = true;
    body.hidden = false;
    /* запоминаем ЖИВЫЕ узлы — дальше трогаем только их */
    live.goldN = $('dGoldN');
    live.goldTag = $('dGoldTag');
  }

  /* ТИК ПОЛЗУНКА: обновляем ТОЛЬКО изменившиеся числа. Никакого re-render. */
  function updateTime() {
    const slider = $('minSlider');
    const minute = +slider.value;
    slider.style.setProperty('--p', (minute - slider.min) / (slider.max - slider.min) * 100);
    $('minLabel').textContent = `${minute}:00`;
    if (DATA) $('deathN').textContent = `${deathTimer(minute).sec}с`;

    if (selectedId && DATA && live.goldN) {
      const o = OBJECTS.find(x => x.id === selectedId);
      if (o && o.cat !== 'minions') {
        const g = goldAt(o.get(DATA), minute);
        if (live.goldN.textContent !== g.text) live.goldN.textContent = g.text;
        if (live.goldTag) live.goldTag.textContent = `${minute} мин`;
      }
    }
  }

  /* ---------- под-вкладки [Карта][Страта]: инлайн, БЕЗ анимации появления ---------- */
  let strataLoaded = false;
  function loadStrata() {
    if (strataLoaded) return;
    strataLoaded = true;
    const s = document.createElement('script');
    s.src = 'map-board.js?v=10';
    document.body.appendChild(s);
  }

  function switchTab(tab) {
    /* ЕДИНАЯ полоса-переключатель: одна на обе вкладки, стоит на месте — кнопки не прыгают */
    document.querySelectorAll('.subtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('pane-map').classList.toggle('active', tab === 'map');
    $('pane-strata').classList.toggle('active', tab === 'strata');
    $('headNote').textContent = tab === 'map'
      ? 'экономика ущелья · данные jungle-economy.json'
      : 'тактическая доска · порт Phase 1';
    /* ленивая загрузка доски — ПОСЛЕ показа вкладки (нужны реальные размеры) */
    if (tab === 'strata') loadStrata();
  }

  function initTabs() {
    document.querySelectorAll('.subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.classList.contains('active')) switchTab(btn.dataset.tab);
      });
    });
  }

  /* ---------- дев-полоса: варианты вида, сворачивание, перетаскивание, счётчик ---------- */
  function initDesignbar() {
    const pane = $('pane-map');
    const bar = $('designbar');

    const choices = () => ({
      'объекты': pane.dataset.obj,
      'панель': pane.dataset.panel,
      'ползунок': pane.dataset.slider,
    });
    const choiceText = () => Object.entries(choices()).map(([k, v]) => `${k}=${v}`).join('\n');
    const updateChoice = () => {
      $('dbChoice').textContent = 'Ваш выбор: ' + choiceText().replace(/\n/g, ' · ');
    };

    /* переключение варианта = смена data-атрибута. Ни одного узла не пересоздаём. */
    bar.querySelectorAll('.db-group').forEach(group => {
      const key = group.dataset.var;
      group.querySelectorAll('.db-seg').forEach(seg => {
        seg.addEventListener('click', () => {
          group.querySelectorAll('.db-seg').forEach(s => s.classList.toggle('active', s === seg));
          pane.dataset[key] = seg.dataset.val;
          updateChoice();
        });
      });
    });

    const min = $('dbMin');
    min.addEventListener('click', () => {
      const on = bar.classList.toggle('min');
      min.textContent = on ? 'Развернуть настройки' : 'Свернуть настройки';
    });

    const copyBtn = $('dbCopy');
    copyBtn.addEventListener('click', async () => {
      const text = choiceText();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Скопировано ✓';
      setTimeout(() => { copyBtn.textContent = orig; }, 1400);
    });

    /* ПРИЁМКА СЧЁТЧИКОМ: пометить узлы → дёрнуть ползунок → сколько выжило */
    $('dbAudit').addEventListener('click', () => {
      const before = Array.from(pane.querySelectorAll('*'));
      before.forEach(n => { n.__keep = true; });
      const slider = $('minSlider');
      const old = +slider.value;
      slider.value = old >= +slider.max ? old - 1 : old + 1;
      slider.dispatchEvent(new Event('input'));
      const after = Array.from(pane.querySelectorAll('*'));
      const survived = after.filter(n => n.__keep).length;
      const msg = `${survived}/${before.length} узлов пережили тик ползунка`;
      $('dbChoice').textContent = '🔬 ' + msg;
      console.log('[lab-map] ПРИЁМКА:', msg, '| было', before.length, '→ стало', after.length);
    });

    /* перетаскивание за ⠿ */
    const grip = $('dbGrip');
    let ox = 0, oy = 0, dragging = false;
    const move = e => {
      if (!dragging) return;
      const w = bar.offsetWidth;
      const x = Math.max(0, Math.min(window.innerWidth - Math.min(w, 60), e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - oy));
      bar.style.left = x + 'px'; bar.style.top = y + 'px'; bar.style.right = 'auto';
    };
    const up = () => { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    grip.addEventListener('mousedown', e => {
      dragging = true;
      const r = bar.getBoundingClientRect();
      bar.style.left = r.left + 'px'; bar.style.top = r.top + 'px'; bar.style.right = 'auto';
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      e.preventDefault();
    });

    updateChoice();
  }

  /* ---------- старт ---------- */
  async function init() {
    initTabs();
    initDesignbar();
    $('minSlider').addEventListener('input', updateTime);
    updateTime();                 // заливка трека сразу, до данных
    try {
      DATA = await (await fetch(DATA_URL)).json();
    } catch (e) {
      $('detailEmpty').textContent =
        'Не удалось загрузить jungle-economy.json. Открой лаб через локальный сервер (Live Server), а не как file://.';
      return;
    }
    renderObjects();
    updateTime();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
