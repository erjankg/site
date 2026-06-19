/* ════════════════════════════════════════════════════════════════
   Песочница «Видео сильных игроков».
   Данные на одно видео: имя игрока + роль + патч + ссылка.
   Превью — авто из ID видео. Имя — руками. Патч — полу-авто (текущий).
   ════════════════════════════════════════════════════════════════ */

/* — демо-данные. На боевом это придёт из Google-таблицы чемпа. —
   Формат строки в таблице, который мы потом распарсим:
     ККМ, 5.2, https://youtu.be/yCm6Jk0Bcww
   role — для бейджа (top/jng/mid/adc/sup). title подтянется с ютуба сам. */
const CHAMPION = { name: 'Ривен', role: 'Баронова линия' };

const VIDEOS = [
  { uid: 'v1', player: 'KKM',       role: 'top', vs: 'Гарен',   patch: '5.2', lang: 'cn', rank: 'Rank 1',     channel: 'WR China Replays', reupload: true, originalUrl: 'https://www.bilibili.com/', id: 'yCm6Jk0Bcww', title: 'Challenger катка — идеальное комбо', dur: '24:10', stamps: [{ t: '2:15', label: 'старт линии' }, { t: '8:40', label: 'тимфайт' }, { t: '14:05', label: '1v2 аутплей' }] },
  { uid: 'v2', player: 'Long',      role: 'top', vs: 'Дариус',  patch: '5.2', lang: 'cn', rank: 'Challenger', channel: 'Rift Highlights',  reupload: true, originalUrl: 'https://www.bilibili.com/', id: 'yCm6Jk0Bcww', title: 'Карри игра, разбор тимфайтов', dur: '31:48', stamps: [{ t: '5:30', label: 'обмен' }, { t: '19:12', label: 'клатч' }] },
  { uid: 'v3', player: 'Shadow',    role: 'top', vs: 'Гарен',   patch: '5.2', lang: 'en', rank: 'Challenger', channel: 'Challenger Plays', id: 'yCm6Jk0Bcww', title: 'Riven vs Garen — доминация на линии', dur: '17:22' },
  { uid: 'v4', player: 'Нагибатор', role: 'top', vs: 'Камилла', patch: '5.2', lang: 'ru', rank: 'PRO',        channel: 'НагибаторWR',      id: 'yCm6Jk0Bcww', title: 'Как карри на Ривен — гайд по комбо', dur: '22:05', stamps: [{ t: '0:45', label: 'руны/билд' }, { t: '6:10', label: 'комбо' }] },
  { uid: 'v5', player: 'Yuuki',     role: 'top', vs: 'Гарен',   patch: '5.1', lang: 'en', channel: 'ProGuides',        id: 'yCm6Jk0Bcww', title: 'Агрессивный старт против Гарена', dur: '19:02' },
  { uid: 'v6', player: 'GerSe',     role: 'top', vs: 'Дариус',  patch: '5.0', lang: 'ru', channel: 'WR Гайды РУ',       id: 'yCm6Jk0Bcww', title: 'Старая катка — для истории', dur: '27:33' },
];

/* «5:20» → секунды (для перехода по таймкоду) */
function mmssToSec(t) {
  const p = String(t).split(':').map(n => parseInt(n, 10) || 0);
  return p.length === 2 ? p[0] * 60 + p[1] : p[0];
}

const ROLE_LABEL = { top: 'Топ', jng: 'Лес', mid: 'Мид', adc: 'АДК', sup: 'Сап' };
const LANG_LABEL = { ru: 'RU', en: 'EN', cn: 'CN' };

/* — сохранённые видео (★) — хранятся локально в браузере — */
const SAVE_KEY = 'lab-youtube-saved';
function loadSaved() { try { return new Set(JSON.parse(localStorage.getItem(SAVE_KEY) || '[]')); } catch { return new Set(); } }
function persistSaved() { try { localStorage.setItem(SAVE_KEY, JSON.stringify([...SAVED])); } catch {} }
let SAVED = loadSaved();

/* — СТАНДАРТНЫЙ набор настроек лаба (вшито в каждый новый лаб) — */
const DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
const SPLASHES = [
  { key: 'lux',    label: 'Lux' },
  { key: 'thresh', label: 'Thresh' },
  { key: 'ahri',   label: 'Ahri' },
  { key: 'yasuo',  label: 'Yasuo' },
  { key: 'jinx',   label: 'Jinx' },
  { key: 'brand',  label: 'Brand' },
];
const SPLASH_IMG = {
  lux:    `url('${DD}/Lux_0.jpg')`,
  thresh: `url('${DD}/Thresh_0.jpg')`,
  ahri:   `url('${DD}/Ahri_0.jpg')`,
  yasuo:  `url('${DD}/Yasuo_0.jpg')`,
  jinx:   `url('${DD}/Jinx_0.jpg')`,
  brand:  `url('${DD}/Brand_0.jpg')`,   // чемпион Brand (арт), не градиент
};
/* стекло (рецепт main-lab): применяется ко ВСЕМ стеклянным блокам */
const GLASS_POW = [
  { key: 'light',  label: 'Лёгкое' },
  { key: 'mid',    label: 'Среднее' },
  { key: 'strong', label: 'Сильное' },
  { key: 'ultra',  label: 'Экстрим' },
];
const GLASS_TINTS = [
  { key: 'neutral', label: 'Нейтр. (бело-матовое)' },
  { key: 'accent',  label: 'Акцент (циан)' },
  { key: 'warm',    label: 'Тёплое' },
  { key: 'cool',    label: 'Холодное' },
];
const GLASS_SAT = [
  { key: 'norm', label: 'Обычная' },
  { key: 'rich', label: 'Сочная' },
  { key: 'max',  label: 'Максимум' },
];
const GLASS_BORDER = [
  { key: 'thin', label: 'Тонкая' },
  { key: 'glow', label: 'Свечение' },
  { key: 'none', label: 'Без рамки' },
];
const BG_DIMS = [
  { key: 'none',   label: 'Нет',    v: 0.14 },
  { key: 'light',  label: 'Слабо',  v: 0.38 },
  { key: 'mid',    label: 'Средне', v: 0.60 },
  { key: 'strong', label: 'Сильно', v: 0.82 },
];

/* — раскладки — */
const VARIANTS = [
  { id: 'row',  name: 'A · Ряд карточек', desc: 'Превью в строку, имя снизу' },
  { id: 'feat', name: 'B · Главное + мелкие', desc: 'Одно крупно + список сбоку' },
  { id: 'list', name: 'C · Лента «кто играет»', desc: 'Акцент на игрока и роль' },
];

/* — состояние песочницы — */
const DEFAULTS = {
  variant: 'feat',        // ФИНАЛ (зафиксировано): B · Главное + мелкие
  bg: 'lux',              // арт фона (сплэш) — ЛАБ-ПРЕВЬЮ (на боевом глобальный сплэш сайта)
  glasspow: 'mid',        // сила стекла — ГЛОБАЛЬНАЯ (хаб сайта); в лабе = дизайн-полоса превью
  tint: 'accent',         // ФИНАЛ (зафиксировано): Акцент (циан)
  glasssat: 'norm',       // насыщенность — ГЛОБАЛЬНАЯ (хаб сайта); в лабе = превью
  glassborder: 'thin',    // граница — ГЛОБАЛЬНАЯ (хаб сайта); в лабе = превью
  glassnoise: false,      // зерно/шум — ГЛОБАЛЬНОЕ (хаб сайта); в лабе = превью
  bgdim: 'mid',           // фон: затемнение — ЛАБ-ПРЕВЬЮ
  curPatch: '5.2',        // текущий патч сайта (полу-авто простановка + пометка старых)
  showTitle: true,     // показывать название ролика — ⚙ ЮЗЕРСКАЯ (единственная в блоке)
  markOld: true,       // приглушать видео со старого патча
  sortPatch: true,     // свежий патч сверху
  fLang: 'all',        // фильтр по языку
  fVs: 'all',          // фильтр по матчапу (против кого)
  fSaved: false,       // фильтр: только сохранённые ★
  fPatch: false,       // фильтр: только текущий патч
  radius: 14,
  gap: 14,
};
let state = { ...DEFAULTS };
let usersetOpen = false;   // открыт ли попап ⚙ настроек юзера (внутри блока)
let LS = null;             // общий механизм памяти лаба (lab-settings.js)

/* — сравнение патчей «5.2» vs «5.0» → число — */
function patchNum(p) {
  const parts = String(p).split('.').map(n => parseInt(n, 10) || 0);
  return parts[0] * 100 + (parts[1] || 0);
}
function isOld(p) { return patchNum(p) < patchNum(state.curPatch); }

/* — превью из ID (без API, всегда работает) — */
function thumb(id) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }

/* — инициал для аватарки игрока — */
function initial(name) { return (name || '?').trim().charAt(0).toUpperCase(); }

/* ── одна карточка видео ── */
function cardHTML(v, opts = {}) {
  const old = state.markOld && isOld(v.patch);
  const saved = SAVED.has(v.uid);
  const roleBadge = `<span class="badge badge-role r-${v.role}">${ROLE_LABEL[v.role] || v.role}</span>`;
  const langBadge = v.lang ? `<span class="badge badge-lang">${LANG_LABEL[v.lang] || v.lang}</span>` : '';
  const vsBadge = v.vs ? `<span class="badge badge-vs">vs ${v.vs}</span>` : '';
  const patchBadge = `<span class="badge badge-patch">патч ${v.patch}</span>`;
  const oldBadge = old ? `<span class="badge badge-old">старый патч</span>` : '';
  const rankBadge = v.rank ? `<span class="vrank ${v.rank === 'PRO' ? 'is-pro' : ''}">${v.rank}</span>` : '';
  const titleHTML = (state.showTitle && v.title && !opts.noTitle)
    ? `<div class="vtitle">${v.title}</div>` : '';
  const subRole = opts.bigName ? `<small>${ROLE_LABEL[v.role] || ''} · ${CHAMPION.name}</small>` : '';

  // атрибуция: играет ИГРОК (имя), залил КАНАЛ; реупа-бейдж + ссылка «оригинал»
  const reup = v.reupload ? ` <span class="vreup">реупа</span>` : '';
  const orig = v.originalUrl ? ` · <a class="vorig" href="${v.originalUrl}" target="_blank" rel="noopener">оригинал ↗</a>` : '';
  const channel = v.channel ? `<span class="vchan">залил: ${v.channel}${reup}${orig}</span>` : '';

  // таймкоды (клик → видео с нужной секунды)
  const stamps = (v.stamps && v.stamps.length)
    ? `<div class="vstamps">${v.stamps.map(s => `<button class="vstamp" data-vid="${v.id}" data-sec="${mmssToSec(s.t)}">▸ ${s.t} ${s.label}</button>`).join('')}</div>`
    : '';

  return `
    <article class="vcard glassy ${old ? 'is-old' : ''}" data-id="${v.id}" data-uid="${v.uid}">
      <div class="vthumb">
        <img src="${thumb(v.id)}" alt="${v.player}" loading="lazy"
             onerror="this.src='https://i.ytimg.com/vi/${v.id}/0.jpg'">
        <button class="vsave ${saved ? 'on' : ''}" data-save="${v.uid}" title="Сохранить в избранное">★</button>
        <span class="vdur">${v.dur || ''}</span>
        <div class="vplay"><div class="pbtn"></div></div>
        <div class="vhover">
          <div class="vhover-title">${v.title || v.player}</div>
          <span class="vhover-cta">▶ Смотреть</span>
        </div>
      </div>
      <div class="vmeta">
        <div class="vplayer">
          <span class="vavatar">${initial(v.player)}</span>
          <span class="vname">${v.player}${rankBadge}${subRole}${channel}</span>
        </div>
        ${titleHTML}
        <div class="vbadges">${roleBadge}${langBadge}${vsBadge}${patchBadge}${oldBadge}</div>
        ${stamps}
      </div>
    </article>`;
}

/* ── ⚙ НАСТРОЙКИ ЮЗЕРА (попап в стекле, для посетителя — не дизайн-полоса лаба).
   Стекло (сила/насыщенность/граница) тут НЕ живёт — оно ГЛОБАЛЬНОЕ (один хаб сайта),
   блок его наследует. Здесь — только контентный тогл этого блока. ── */
function usersetHTML() {
  return `
    <div class="vb-userset glassy ${usersetOpen ? 'open' : ''}" id="vbUserset">
      <div class="us-title">Настройки</div>
      <div class="ctrl ctrl-toggle"><label class="toggle"><input type="checkbox" id="usShowTitle" ${state.showTitle ? 'checked' : ''}> Показывать название ролика</label></div>
    </div>`;
}

/* ── фильтрация списка по чипам ── */
function filteredVideos() {
  let list = VIDEOS.slice();
  if (state.fLang !== 'all') list = list.filter(v => v.lang === state.fLang);
  if (state.fVs !== 'all') list = list.filter(v => v.vs === state.fVs);
  if (state.fSaved) list = list.filter(v => SAVED.has(v.uid));
  if (state.fPatch) list = list.filter(v => patchNum(v.patch) >= patchNum(state.curPatch));
  if (state.sortPatch) list.sort((a, b) => patchNum(b.patch) - patchNum(a.patch));
  return list;
}

/* ── блок целиком (с шапкой), 3 раскладки ── */
function blockHTML() {
  const list = filteredVideos();

  const head = `
    <div class="vb-head">
      <div>
        <div class="vb-title"><span class="yt-mark">▶</span> Видео сильных игроков</div>
        <div class="vb-sub">${CHAMPION.name} · ${CHAMPION.role} · катки топ-игроков</div>
      </div>
      <div class="vb-head-right">
        <span class="vb-cur-patch">текущий патч ${state.curPatch}</span>
        <button class="vb-gear ${usersetOpen ? 'on' : ''}" id="vbGear" title="Настройки">⚙</button>
        ${usersetHTML()}
      </div>
    </div>`;

  const langChips = [{ k: 'all', t: 'Все' }, { k: 'ru', t: 'RU' }, { k: 'en', t: 'EN' }, { k: 'cn', t: 'CN' }];
  const vsList = [...new Set(VIDEOS.map(v => v.vs).filter(Boolean))];
  const filters = `
    <div class="vb-filters">
      ${langChips.map(c => `<button class="fchip ${state.fLang === c.k ? 'on' : ''}" data-flang="${c.k}">${c.t}</button>`).join('')}
      <span class="fchip-sep"></span>
      <select class="fchip fchip-sel" id="fVs">
        <option value="all" ${state.fVs === 'all' ? 'selected' : ''}>vs: все матчапы</option>
        ${vsList.map(x => `<option value="${x}" ${state.fVs === x ? 'selected' : ''}>vs ${x}</option>`).join('')}
      </select>
      <span class="fchip-sep"></span>
      <button class="fchip ${state.fSaved ? 'on' : ''}" data-fsaved>★ Сохранённые</button>
      <button class="fchip ${state.fPatch ? 'on' : ''}" data-fpatch>Только текущий патч</button>
    </div>`;

  let grid = '';
  if (!list.length) {
    grid = `<div class="empty-note">Ничего не найдено по фильтрам.</div>`;
  } else if (state.variant === 'feat') {
    const [first, ...rest] = list;
    grid = `<div class="vb-grid">
        <div class="feat">${cardHTML(first, { bigName: true })}</div>
        <div class="vb-side">${rest.map(v => cardHTML(v, { noTitle: true })).join('')}</div>
      </div>`;
  } else if (state.variant === 'list') {
    grid = `<div class="vb-grid">${list.map(v => cardHTML(v, { bigName: true })).join('')}</div>`;
  } else {
    grid = `<div class="vb-grid">${list.map(v => cardHTML(v)).join('')}</div>`;
  }

  return `<div class="vid-block glassy lay-${state.variant}">${head}${filters}${grid}</div>`;
}

/* ── внешний вид: стекло (на ВСЕ блоки через body) + фон-сплэш + затемнение ── */
function applyLook() {
  const b = document.body;
  b.dataset.glass = 'on';
  b.dataset.glasspow = state.glasspow;
  b.dataset.glasstint = state.tint;
  b.dataset.glasssat = state.glasssat;
  b.dataset.glassborder = state.glassborder;
  b.dataset.glassnoise = state.glassnoise ? 'on' : 'off';

  document.getElementById('labBg').style.backgroundImage = SPLASH_IMG[state.bg] || SPLASH_IMG.lux;
  const dim = BG_DIMS.find(d => d.key === state.bgdim) || BG_DIMS[2];
  document.documentElement.style.setProperty('--dim', dim.v);
}

/* ── рендер сцены ── */
function renderStage() {
  const inner = document.getElementById('stageInner');
  document.documentElement.style.setProperty('--radius', state.radius + 'px');
  document.documentElement.style.setProperty('--gap', state.gap + 'px');

  inner.innerHTML = `
    <div class="guide-mock glassy"><span class="gm-tag">Гайд</span> ↑ тут гайд и предметы чемпа (заглушка)</div>
    <div class="guide-mock glassy"><span class="gm-tag">Предметы</span> ↑ сборка предметов (заглушка)</div>
    ${blockHTML()}`;

  // подгрузить плеер (тяжёлый iframe только по требованию), опц. с нужной секунды
  function play(card, id, sec) {
    const t = card.querySelector('.vthumb');
    const start = sec ? `&start=${sec}` : '';
    t.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0${start}"
      allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    card.classList.add('playing');
  }

  // клик по карточке → запуск видео (кроме клика по звезде/таймкоду/ссылке)
  inner.querySelectorAll('.vcard').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.vsave') || e.target.closest('.vstamp') || e.target.closest('.vorig')) return;
      if (card.classList.contains('playing')) return;
      play(card, card.dataset.id);
    });
  });

  // таймкоды → запуск с нужной секунды
  inner.querySelectorAll('.vstamp').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      play(b.closest('.vcard'), b.dataset.vid, b.dataset.sec);
    });
  });

  // ★ сохранить / убрать (локально)
  inner.querySelectorAll('.vsave').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const uid = btn.dataset.save;
      if (SAVED.has(uid)) SAVED.delete(uid); else SAVED.add(uid);
      persistSaved();
      btn.classList.toggle('on');
      if (state.fSaved) renderStage();   // если включён фильтр «сохранённые» — пересобрать
    });
  });

  // фильтр-чипы
  inner.querySelectorAll('[data-flang]').forEach(c =>
    c.addEventListener('click', () => { state.fLang = c.dataset.flang; renderStage(); }));
  const fvs = inner.querySelector('#fVs');
  if (fvs) fvs.addEventListener('change', e => { state.fVs = e.target.value; renderStage(); });
  const fs = inner.querySelector('[data-fsaved]');
  if (fs) fs.addEventListener('click', () => { state.fSaved = !state.fSaved; renderStage(); });
  const fp = inner.querySelector('[data-fpatch]');
  if (fp) fp.addEventListener('click', () => { state.fPatch = !state.fPatch; renderStage(); });

  // ⚙ настройки юзера (попап)
  const gear = inner.querySelector('#vbGear');
  const pop = inner.querySelector('#vbUserset');
  if (gear && pop) {
    gear.addEventListener('click', e => {
      e.stopPropagation();
      usersetOpen = !usersetOpen;
      pop.classList.toggle('open', usersetOpen);
      gear.classList.toggle('on', usersetOpen);
    });
    pop.addEventListener('click', e => e.stopPropagation());
    pop.querySelector('#usShowTitle').onchange = e => { state.showTitle = e.target.checked; renderStage(); };
  }
}

// клик вне попапа ⚙ — закрыть (вешаем один раз)
document.addEventListener('click', () => {
  if (!usersetOpen) return;
  usersetOpen = false;
  const pop = document.getElementById('vbUserset');
  const gear = document.getElementById('vbGear');
  if (pop) pop.classList.remove('open');
  if (gear) gear.classList.remove('on');
});

/* ── helper: <select>-контрол ── */
function selCtrl(id, label, items, cur) {
  return `<div class="ctrl">
    <div class="ctrl-label">${label}</div>
    <select id="${id}">
      ${items.map(x => `<option value="${x.key ?? x.id}" ${(x.key ?? x.id) === cur ? 'selected' : ''}>${x.label ?? x.name}</option>`).join('')}
    </select>
  </div>`;
}

/* ── ВЕРХНЯЯ дизайн-полоса ЛАБА (для нас — подбор вида, сворачивается кнопкой).
   Юзер-настройки (сила стекла/плотность/размер/показ) — НЕ здесь, а в ⚙ внутри блока. ── */
function renderSettings() {
  const s = document.getElementById('settings');
  const patches = ['5.0', '5.1', '5.2', '5.3'].map(x => ({ key: x, label: x }));

  // ФИНАЛ: раскладка (feat) и оттенок стекла (accent) зафиксированы дефолтом — убраны из полосы.
  // Стекло (сила/насыщенность/граница/зерно) = ГЛОБАЛЬНОЕ на боевом (один хаб сайта); здесь
  // эти контролы — лаб-превью «для нас» (увидеть как сядет), на боевой НЕ переносятся.
  s.innerHTML =
    selCtrl('bg', 'Арт фона (лаб-превью)', SPLASHES, state.bg) +
    selCtrl('bgdim', 'Затемнение фона (лаб-превью)', BG_DIMS, state.bgdim) +
    selCtrl('glasspow', 'Сила стекла (глобал · превью)', GLASS_POW, state.glasspow) +
    selCtrl('glasssat', 'Насыщенность стекла (глобал · превью)', GLASS_SAT, state.glasssat) +
    selCtrl('glassborder', 'Граница стекла (глобал · превью)', GLASS_BORDER, state.glassborder) +
    selCtrl('curPatch', 'Текущий патч (симуляция)', patches, state.curPatch) +
    `<div class="ctrl ctrl-toggle"><label class="toggle"><input type="checkbox" id="glassnoise" ${state.glassnoise ? 'checked' : ''}> Зерно / шум (глобал · превью)</label></div>`;

  s.querySelector('#bg').onchange = e => { state.bg = e.target.value; applyLook(); };
  s.querySelector('#bgdim').onchange = e => { state.bgdim = e.target.value; applyLook(); };
  s.querySelector('#glasspow').onchange = e => { state.glasspow = e.target.value; applyLook(); };
  s.querySelector('#glasssat').onchange = e => { state.glasssat = e.target.value; applyLook(); };
  s.querySelector('#glassborder').onchange = e => { state.glassborder = e.target.value; applyLook(); };
  s.querySelector('#glassnoise').onchange = e => { state.glassnoise = e.target.checked; applyLook(); };
  s.querySelector('#curPatch').onchange = e => { state.curPatch = e.target.value; renderStage(); };
}

/* ── кнопка «Свернуть / Показать настройки» ── */
document.getElementById('toggleBtn').addEventListener('click', () => {
  const min = document.body.classList.toggle('yt-min');
  document.getElementById('toggleBtn').textContent = min ? '▼ Показать настройки' : '▲ Свернуть настройки';
});

/* ── сброс ── */
document.getElementById('resetBtn').addEventListener('click', () => {
  state = { ...DEFAULTS };
  if (LS) LS.clearSaved();
  renderSettings(); renderStage(); applyLook();
});

/* ── старт ── */
renderSettings();
renderStage();
applyLook();

/* ── память лаба + код/вставить/пресеты (общий lab-settings.js) ── */
if (window.LabSettings) {
  LS = LabSettings.attach({
    id: 'youtube', defaults: DEFAULTS, mount: '#labTools', schema: 2,
    getState: () => state,
    apply: st => { state = Object.assign({}, DEFAULTS, st); renderSettings(); renderStage(); applyLook(); },
  });
}
