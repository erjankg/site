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

let rank = 'diamond_plus';
let variant = 'A';

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
}

function buildControls() {
  // ранги
  const rp = $('#rankPills');
  rp.innerHTML = M.ranks.map((rk) => `<button class="pill ${rk === rank ? 'on' : ''}" data-r="${rk}">${M.rankLabels[rk]}</button>`).join('');
  rp.onclick = (e) => { const b = e.target.closest('.pill'); if (!b) return; rank = b.dataset.r; [...rp.children].forEach((c) => c.classList.toggle('on', c.dataset.r === rank)); render(); };
  // раскладки
  const vp = $('#variantPills');
  const V = { A: 'A · Витрина', B: 'B · Мозаика', C: 'C · Дашборд' };
  vp.innerHTML = Object.entries(V).map(([k, t]) => `<button class="pill ${k === variant ? 'on' : ''}" data-v="${k}">${t}</button>`).join('');
  vp.onclick = (e) => { const b = e.target.closest('.pill'); if (!b) return; variant = b.dataset.v; [...vp.children].forEach((c) => c.classList.toggle('on', c.dataset.v === variant)); render(); };
}

$('#patchBadge').innerHTML = `Патч <b>${M.patch}</b> · обновлено <b>${M.updated}</b> · источник <b>lolm.qq.com</b>`;
buildControls();
render();
