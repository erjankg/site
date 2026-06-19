/* Мета-хаб · рендер из window.META (реальные данные) + фильтр рангов + 3 раскладки */
const M = window.META;
const $ = (s, r = document) => r.querySelector(s);

// картинки чемпионов с серверов Tencent
const avatar = (heroId) => `https://game.gtimg.cn/images/lgamem/act/lrlib/img/HeadIcon/H_S_${heroId}.png`;
const poster = (nameEN) => `https://game.gtimg.cn/images/lgamem/act/lrlib/img/Posters/${nameEN}_0.jpg`;
const FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34"><rect width="34" height="34" rx="9" fill="%230d1a27"/></svg>';
const imgErr = `this.onerror=null;this.src='${FALLBACK}'`;

const tier = (t) => `<span class="tier" data-t="${t}">${t}</span>`;
const ROLE_RU = { Baron: 'Барон', Mid: 'Мид', Jungle: 'Лес', Dragon: 'Дракон', Support: 'Саппорт', top: 'Барон', jungle: 'Лес', mid: 'Мид' };
const role = (r) => ROLE_RU[r] || r || '';

const DEFAULTS = {
  layout: 'A',          // ФИНАЛ: A · Витрина (переключатель убран)
  place: 'top',         // ФИНАЛ: шапка/пиллы сверху (переключатель убран)
  hero: 'normal',       // ФИНАЛ: размер героя — Норм (переключатель убран)
  heroFx: 'parallax',   // ФИНАЛ: параллакс+3D героя (god-tier, переключатель убран)
  density: 'normal',    // ГЛОБАЛ (хаб сайта); в лабе = превью
  radius: 'normal',     // ГЛОБАЛ (хаб сайта); в лабе = превью
  glass: 'normal',      // сила стекла — ГЛОБАЛ (хаб сайта); в лабе = превью
  glasstint: 'neutral', // оттенок стекла — ГЛОБАЛ (хаб сайта); в лабе = превью
  glassbd: 'thin',      // граница стекла — ГЛОБАЛ (хаб сайта); в лабе = превью
  grain: 'off',         // зерно/шум — ГЛОБАЛ (хаб сайта); в лабе = превью
  art: 'Amumu',         // сплэш-арт — ГЛОБАЛ (ОДИН на весь сайт); в лабе = превью
  hover: 'on',          // hover плиток — ГЛОБАЛ (хаб сайта); в лабе = превью
  rank: 'diamond_plus', // фильтр рангов — живой пользовательский контрол (пиллы в шапке)
};
let S = Object.assign({}, DEFAULTS);
// живые алиасы для render-функций
let rank = S.rank;
let variant = S.layout;
// доступные сплэш-арты (постеры Tencent) — варианты за стеклом
const ARTS = [['none', 'Градиент'], ['Amumu', 'Амуму'], ['MonkeyKing', 'Вуконг'], ['Sett', 'Сетт'], ['Vayne', 'Вейн'], ['Teemo', 'Тимо'], ['Warwick', 'Варвик'], ['Rammus', 'Раммус']];

function featured(d) {
  return `<div class="tile t-featured">
    <div class="feat-bg" style="background-image:url('${poster(d.nameEN)}')"></div>
    <div class="feat-shade"></div>
    <div class="feat-eyebrow">★ Чемпион патча</div>
    <span class="tier feat-tier" data-t="${d.tier}">${d.tier}</span>
    <div class="feat-body">
      <div class="feat-name">${d.name}</div>
      <div class="feat-role">${role(d.role)} · ${M.rankLabels[rank]}</div>
      <div class="feat-stats">
        <div class="fstat wr"><div class="k">Винрейт</div><div class="v">${d.wr}%</div></div>
        <div class="fstat"><div class="k">Пикрейт</div><div class="v">${d.pr}%</div></div>
        <div class="fstat"><div class="k">Банрейт</div><div class="v">${d.br}%</div></div>
      </div>
    </div></div>`;
}

function topWR(list) {
  const rows = list.map((c) => `<div class="row">
    <img class="av" src="${avatar(c.heroId)}" onerror="${imgErr}" alt="">
    <div><div class="nm">${c.name}</div><div class="rl">${role(c.role)}</div></div>
    <div class="right">${tier(c.tier)}
      <div class="wrbar"><i style="width:${Math.min(100, (c.wr - 45) * 5)}%"></i></div>
      <span class="wrnum">${c.wr}%</span></div></div>`).join('');
  return `<div class="tile t-top"><h3><span class="ic">🏆</span>Топ по винрейту<span class="tag">${M.rankLabels[rank]}</span></h3>${rows}</div>`;
}

function movers(up, down) {
  const item = (c, dir) => `<div class="mov-item">
    <img class="av" style="width:22px;height:22px;border-radius:6px" src="${avatar(c.heroId)}" onerror="${imgErr}" alt="">
    <span class="nm">${c.name}</span><span class="d ${dir}">${dir === 'up' ? '▲' : '▼'}${Math.abs(c.trend)}</span></div>`;
  return `<div class="tile t-movers"><h3><span class="ic">📈</span>Движение меты</h3>
    <div class="mov-grid">
      <div class="mov-col up"><h4>Растут</h4>${up.map((c) => item(c, 'up')).join('')}</div>
      <div class="mov-col down"><h4>Падают</h4>${down.map((c) => item(c, 'down')).join('')}</div>
    </div></div>`;
}

function duel(d, kind) {
  if (!d) return `<div class="tile t-${kind === 'best' ? 'matchup' : 'counter'}"><h3>${kind === 'best' ? '⚔️ Матчап дня' : '🛡️ Контра дня'}</h3><p style="color:var(--txt-faint)">нет данных</p></div>`;
  const e = kind === 'best' ? d.best : d.worst;
  const good = kind === 'best';
  return `<div class="tile t-${good ? 'matchup' : 'counter'}">
    <h3><span class="ic">${good ? '⚔️' : '🛡️'}</span>${good ? 'Матчап дня' : 'Контра дня'}</h3>
    <div class="duel">
      <div class="who"><span class="nm">${d.champ}</span></div>
      <span class="vs">${good ? 'силён против' : 'слаб против'}</span>
      <div class="who" style="justify-content:flex-end">
        <img class="av" src="${avatar(e.heroId || '')}" onerror="${imgErr}" alt="">
        <span class="nm">${e.name}</span></div>
    </div>
    <div class="duel-sub">Винрейт в матчапе: <b class="pct ${good ? 'good' : 'bad'}" style="font-size:13px">${e.wr}%</b> · роль ${role(d.role)}</div>
  </div>`;
}

function build(b) {
  if (!b) return `<div class="tile t-build"><h3>💎 Билд дня</h3></div>`;
  const core = (b.core || []).map((i) => `<span class="chip">${i}</span>`).join('');
  const runes = (b.runes || []).map((r) => `<span class="chip gold">${r}</span>`).join('');
  return `<div class="tile t-build"><h3><span class="ic">💎</span>Билд дня<span class="tag">${b.champ} · тир ${b.tier || '—'}</span></h3>
    <div class="bd-block"><div class="lbl">Ядро сборки</div><div class="chips">${core}</div></div>
    <div class="bd-block"><div class="lbl">Руны</div><div class="chips">${runes}</div></div>
    ${b.spells ? `<div class="bd-block"><div class="lbl">Заклинания</div><div class="chips"><span class="chip">${b.spells}</span></div></div>` : ''}
  </div>`;
}

function render() {
  const r = M.byRank[rank];
  $('#bento').dataset.v = variant;
  $('#bento').innerHTML = featured(r.featured) + topWR(r.topWR) + movers(r.moversUp, r.moversDown)
    + duel(M.matchupOfDay, 'best') + duel(M.counterOfDay, 'worst') + build(M.buildOfDay);
  attachHeroFx();
}

/* ═══════════ 3D-наклон + параллакс «Чемпиона патча» (как в hover-reveal-лабе) ═══════════ */
function attachHeroFx() {
  const el = $('.t-featured'); if (!el) return;
  el.dataset.fx = S.heroFx;
  if (S.heroFx === 'none') { el.onmousemove = el.onmouseleave = null; return; }
  const bg = el.querySelector('.feat-bg');
  el.onmousemove = (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg)`;
    if (S.heroFx === 'parallax' && bg) bg.style.transform = `scale(1.12) translate(${px * -22}px, ${py * -22}px)`;
  };
  el.onmouseleave = () => { el.style.transform = ''; if (bg) bg.style.transform = ''; };
}

/* ═══════════ Фильтр рангов (живёт в шапке или в плавающем попапе) ═══════════ */
function rankPillsHTML() {
  return M.ranks.map((rk) => `<button class="pill ${rk === S.rank ? 'on' : ''}" data-r="${rk}">${M.rankLabels[rk]}</button>`).join('');
}
function wireRankPills(host) {
  if (!host) return;
  host.innerHTML = rankPillsHTML();
  host.onclick = (e) => {
    const b = e.target.closest('.pill'); if (!b) return;
    S.rank = rank = b.dataset.r;
    document.querySelectorAll('#rankPills .pill, #hubGearPop .pill').forEach((c) => c.classList.toggle('on', c.dataset.r === S.rank));
    render();
  };
}

/* ═══════════ Дизайн-полоса лаба ═══════════
   ФИНАЛ (зафиксировано дефолтом, переключатели убраны): раскладка A·Витрина,
   шапка top·Сверху, размер героя normal, эффект героя parallax (god-tier).
   Стекло/визуалка (стекло·оттенок·граница·зерно·сплэш·плотность·углы·hover) =
   ГЛОБАЛЬНОЕ на боевом (один хаб сайта); здесь — лаб-превью «для нас», не переносится. */
const GROUPS = [
  { key: 'art', label: 'Сплэш-арт за стеклом (глобал · превью)', items: ARTS.map(([v, t]) => ({ v, t })) },
  { key: 'glasstint', label: 'Вид стекла · оттенок (глобал · превью)', items: [{ v: 'neutral', t: 'Нейтральное' }, { v: 'cyan', t: 'Циан' }, { v: 'gold', t: 'Золото' }, { v: 'warm', t: 'Тёплое' }, { v: 'cold', t: 'Холодное' }, { v: 'dark', t: 'Тёмное' }] },
  { key: 'glass', label: 'Сила стекла (глобал · превью)', items: [{ v: 'soft', t: 'Слабое' }, { v: 'normal', t: 'Норм' }, { v: 'strong', t: 'Сильное' }] },
  { key: 'glassbd', label: 'Граница стекла (глобал · превью)', items: [{ v: 'thin', t: 'Тонкая' }, { v: 'glow', t: 'Свечение' }, { v: 'none', t: 'Без' }] },
  { key: 'grain', label: 'Зерно/шум (глобал · превью)', items: [{ v: 'off', t: 'Выкл' }, { v: 'on', t: 'Вкл' }] },
  { key: 'density', label: 'Плотность (глобал · превью)', items: [{ v: 'compact', t: 'Компактно' }, { v: 'normal', t: 'Норм' }, { v: 'roomy', t: 'Просторно' }] },
  { key: 'radius', label: 'Углы (глобал · превью)', items: [{ v: 'sharp', t: 'Острые' }, { v: 'normal', t: 'Норм' }, { v: 'round', t: 'Круглые' }] },
  { key: 'hover', label: 'Hover плиток (глобал · превью)', items: [{ v: 'on', t: 'Вкл' }, { v: 'off', t: 'Выкл' }] },
];
function buildStrip() {
  const host = $('#stripBody');
  host.innerHTML = GROUPS.map((g) => `<div class="lg"><span class="lg-lbl">${g.label}</span>
    <div class="lg-seg${g.gold ? ' gold' : ''}" data-key="${g.key}">
      ${g.items.map((it) => `<button data-v="${it.v}" class="${S[g.key] === it.v ? 'on' : ''}">${it.t}</button>`).join('')}
    </div></div>`).join('');
  host.querySelectorAll('.lg-seg').forEach((seg) => {
    const key = seg.dataset.key;
    seg.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      S[key] = b.dataset.v;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      applyState();
    };
  });
}

/* ═══════════ Применить весь набор настроек ═══════════ */
function applyState() {
  rank = S.rank; variant = S.layout;
  const w = $('#wrap');
  w.dataset.place = S.place;
  w.dataset.density = S.density;
  w.dataset.radius = S.radius;
  w.dataset.glass = S.glass;
  w.dataset.glasstint = S.glasstint;
  w.dataset.glassbd = S.glassbd;
  w.dataset.grain = S.grain;
  w.dataset.hero = S.hero;
  w.dataset.hover = S.hover;
  // сплэш-арт за стеклом (один на весь хаб, выбранный из вариантов)
  const art = $('#hubArt');
  if (S.art && S.art !== 'none') { art.style.backgroundImage = `url('${poster(S.art)}')`; art.classList.add('on'); }
  else { art.classList.remove('on'); }
  // размещение фильтра рангов: плавающая ⚙ или в шапке
  const gear = $('#hubGear'), pop = $('#hubGearPop');
  if (S.place === 'float') {
    gear.hidden = false;
    pop.innerHTML = `<div class="pop-ttl">Ранг</div><div class="pills" id="gearRank">${rankPillsHTML()}</div>`;
    wireRankPills($('#gearRank'));
  } else {
    gear.hidden = true; pop.hidden = true;
    wireRankPills($('#rankPills'));
  }
  render();
}

$('#patchBadge').innerHTML = `Патч <b>${M.patch}</b> · обновлено <b>${M.updated}</b> · источник <b>lolm.qq.com</b>`;

// сворачивание дизайн-полосы
$('#labMin').onclick = () => {
  const min = document.body.classList.toggle('lab-min');
  $('#labMin').textContent = min ? '▼ Показать настройки' : '▲ Свернуть настройки';
};
// плавающая шестерёнка
$('#hubGear').onclick = () => { const p = $('#hubGearPop'); p.hidden = !p.hidden; };

buildStrip();
applyState();

/* ═══════════ Память лаба + пресеты + 📋Код/📥Вставить ═══════════ */
let LS = null;
if (window.LabSettings) {
  LS = LabSettings.attach({
    id: 'metahub', defaults: DEFAULTS, mount: '#labTools',
    getState: () => S,
    apply: (st) => { S = Object.assign({}, DEFAULTS, st); buildStrip(); applyState(); },
  });
}
