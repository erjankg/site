/* ════════════════════════════════════════════════════════════════
   lab-chat — ЧАТ = ПОСТОЯННАЯ ПРАВАЯ ПАНЕЛЬ-ОВЕРЛЕЙ (Discord/Twitch).
   По канону (DESIGN.md), собран поверх каркаса lab-design-system.
   Паритет с боевым renderGlobalChat (app.js:4818): сообщения · реакции ·
   ответы(reply) · упоминания(mention) · онлайн-статус · аватар→профиль ·
   ник→тег. Шаринг-карточки контента (📎) + варианты вида пузыря/карточки.

   ┌───────────────────────────────────────────────────────────────┐
   │ 🚫 НЕ ТАЩИТЬ ДЁРГАНЬЕ (PORT-BACKLOG / боевой уже вылечен):      │
   │ 1. НЕ пересобирать всю ленту на каждое действие. Правка реакции/│
   │    ответа/полла = ТОЧЕЧНАЯ замена ОДНОГО пузыря (patchFeed +    │
   │    diff по сигнатуре dataset.sig), остальные узлы не трогаем.   │
   │ 2. Правка существующего пузыря → класс `no-anim`: анимация      │
   │    появления НЕ играет повторно (иначе мигает на каждой реакции).│
   │ 3. Появление (fadeIn) — только у РЕАЛЬНО нового сообщения.       │
   │ 4. Стекло анимируем только opacity; панель слайдит через `right`,│
   │    не transform (иначе гаснет backdrop). Блюр не снижаем.        │
   │ 5. Приёмка — СЧЁТЧИКОМ выживших узлов (виден в дев-полосе),      │
   │    не «на глаз». Здоровое действие меняет ЕДИНИЦЫ узлов.         │
   └───────────────────────────────────────────────────────────────┘
   ════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ---------- ассеты ---------- */
var DDV = '14.24.1';
var ME = 'me';
function champIcon(k) { return 'https://ddragon.leagueoflegends.com/cdn/' + DDV + '/img/champion/' + k + '.png'; }
function splashUrl(k) { return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + k + '_0.jpg'; }
function itemImg(s) { return 'https://www.wildriftfire.com/images/items/' + s + '.png'; }
var WR_EMO = { camille: 'Camille', ahri: 'Ahri', garen: 'Garen', jinx: 'Jinx', lux: 'Lux', yasuo: 'Yasuo' };

/* ---------- пользователи ---------- */
var USERS = [
  { name: 'ErjanKG',    sub: 'админ',    av: '#ffffff', st: 'online', admin: true, rank: 'Challenger', link: 'Telegram' },
  { name: 'Tahm_Top',   sub: 'топ-лейн', av: '#e7642d', st: 'draft',  rank: 'Алмаз',   link: 'Discord' },
  { name: 'mid_diff',   sub: 'мид',      av: '#5c7cff', st: 'game',   rank: 'Мастер',  link: 'Telegram' },
  { name: 'jungle_gap', sub: 'лес',      av: '#a06bff', st: 'offline',rank: 'Платина', link: 'Discord' },
  { name: 'support_btw',sub: 'саппорт',  av: '#37e07a', st: 'online', rank: 'Золото',  link: 'Telegram' },
  { name: 'adc_main',   sub: 'дракон',   av: '#ffb02e', st: 'offline',rank: 'Изумруд', link: 'Discord' }
];
var ST_LABEL = { online: 'в сети', draft: 'в драфте', game: 'в игре', offline: 'не в сети' };
function uIndex(n) { for (var i = 0; i < USERS.length; i++) if (USERS[i].name === n) return i; return -1; }

/* ---------- сообщения по каналам ---------- */
var CHAN_MSGS = {
  general: [
    { id: 'g1', sys: true, text: 'Добро пожаловать в общий чат WildRift Hub 💬' },
    { id: 'g2', uid: 'u1', name: 'Tahm_Top', text: 'патч 5.1 завезли, Камилла снова сильна на топе :camille:', t: '14:02', av: '#e7642d',
      reactions: [{ e: '🔥', n: 3, mine: false }, { e: '👍', n: 1, mine: true }] },
    { id: 'g3', uid: 'u3', name: 'jungle_gap', text: 'кто-нибудь, скиньте кнопку-ссылку на матчапы Камиллы 🙏', t: '14:03', av: '#a06bff' },
    { id: 'g4', uid: 'adm', name: 'ErjanKG', admin: true, text: 'держи 👇', t: '14:04', av: '#ffffff',
      replyTo: { id: 'g3', name: 'jungle_gap', text: 'скиньте матчапы Камиллы' },
      card: { type: 'matchup', name: 'Камилла', key: 'Camille', vs: [['Дариус', true], ['Гарен', true], ['Сетт', false]] } },
    { id: 'g5', uid: 'u3', name: 'jungle_gap', text: 'о, спс! то что надо 🔥', t: '14:05', av: '#a06bff', reactions: [{ e: '❤️', n: 2, mine: false }] },
    { id: 'g6', uid: ME, name: 'Я', text: 'а тир-лист патча можете скинуть?', t: '14:06', unread: true },
    { id: 'g7', uid: 'u1', name: 'Tahm_Top', text: 'лови', t: '14:07', av: '#e7642d', unread: true,
      replyTo: { id: 'g6', name: 'Я', text: 'тир-лист патча' },
      card: { type: 'tier', patch: '5.1', items: [['Ясуо', 'S'], ['Камилла', 'A'], ['Гарен', 'B']] } },
    { id: 'g8', uid: 'adm', name: 'ErjanKG', admin: true, text: '@Я го серию сгоняем вечером?', t: '14:08', av: '#ffffff', unread: true, mentionsMe: true }
  ],
  draft: [],
  lfg: []
};

var DRAFT_LOBBY = {
  caps: [{ name: 'ErjanKG', side: 'blue', av: '#ffffff' }, { name: 'Tahm_Top', side: 'red', av: '#e7642d' }],
  specs: [{ name: 'mid_diff', av: '#5c7cff' }, { name: 'support_btw', av: '#37e07a' }, { name: 'adc_main', av: '#ffb02e' }]
};
var LFG_POSTS = [
  { role: 'Ищу Джангл', need: 'Мастер+, вечер, Bo3', by: 'ErjanKG' },
  { role: 'Ищу дуо на топ', need: 'Платина+, спокойный', by: 'support_btw' }
];
var PINNED = { general: '📌 Правила: без токсика. Мем-канал в Discord.', draft: null, lfg: null };
var REACT_SET = ['👍', '🔥', '😂', '❤️', '😮', '😢'];

/* ---------- дефолты ---------- */
var SPLASHES = { lux: splashUrl('Lux'), brand: splashUrl('Brand'), ahri: splashUrl('Ahri') };
var DEFAULTS = {
  scene: 'home', width: 'mid', behav: 'overlay', tab: 'edge', chans: 'pills', ulist: 'inside',
  bubble: 'rounded', cardv: 'rich', splash: 'lux',
  draftLive: true, invite: true, reply: true, pin: true, mod: true,
  bot: true, polls: true, status: true, wremoji: true, notif: true, lfg: false
};
var S = Object.assign({}, DEFAULTS);

/* ---------- состояние ---------- */
var _chan = 'general', _open = true, _reply = null, _udropOpen = false;
var _lastNodeStat = '';

/* ---------- утилиты ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function initial(n) { return (n || '?').charAt(0).toUpperCase(); }
function nowHM() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function genId() { return 'm' + Date.now() + Math.floor(Math.random() * 99); }
function msgById(id) { var a = CHAN_MSGS[_chan]; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

var _tt;
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(function () { el.classList.remove('show'); }, 1800);
}
var _ac;
function beep() {
  if (!S.notif) return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    var o = _ac.createOscillator(), g = _ac.createGain();
    o.connect(g); g.connect(_ac.destination); o.frequency.value = 880; g.gain.value = .05;
    o.start(); o.stop(_ac.currentTime + .12);
  } catch (e) {}
}

function channels() {
  var list = [{ id: 'general', ico: '💬', name: 'Общий' }];
  if (S.draftLive) list.push({ id: 'draft', ico: '🎯', name: 'ДРАФТ' });
  if (S.lfg) list.push({ id: 'lfg', ico: '🔎', name: 'LFG' });
  return list;
}
function unreadCount(chan) { return (CHAN_MSGS[chan] || []).filter(function (m) { return m.unread; }).length; }
function totalUnread() { return channels().reduce(function (a, c) { return a + unreadCount(c.id); }, 0); }

/* ============================================================
   ОБОЛОЧКА (body-классы, сцена, кнопка вызова)
   ============================================================ */
function applyShell() {
  document.body.className = 'w-' + S.width + ' behav-' + S.behav + ' tab-' + S.tab +
    ' chans-' + S.chans + ' ulist-' + S.ulist + ' scene-' + S.scene +
    ' bub-' + S.bubble + ' cardv-' + S.cardv + (_open ? ' chat-open' : '');
  document.querySelector('.splash').style.backgroundImage = 'url(' + SPLASHES[S.splash] + ')';
  renderScene(); renderTab();
}
function slots(n) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="mock-slot"></div>'; return s; }
function renderScene() {
  var stage = document.getElementById('stage');
  if (S.scene === 'drafter') {
    stage.innerHTML = '<div class="mock"><div class="mock-head">Драфтер · Bo3 (фуллскрин)</div>' +
      '<div class="mock-draft"><div class="mock-side glass"><h3>🔵 Синие</h3>' + slots(5) + '</div>' +
      '<div class="mock-side glass"><h3>🔴 Красные</h3>' + slots(5) + '</div></div>' +
      '<div class="mock-card glass" style="flex:0 0 auto"><div class="d">Кнопка чата видна поверх фуллскрин-драфтера — панель оверлеем, драфт под ней не ломается.</div></div></div>';
  } else {
    stage.innerHTML = '<div class="mock"><div class="mock-head">Home <span style="font-size:12px;opacity:.7">(фон — чтобы видеть панель оверлеем)</span></div>' +
      '<div class="mock-grid"><div class="mock-card glass"><div class="t">Статс</div><div class="d">Демо-панель контента.</div></div>' +
      '<div class="mock-card glass"><div class="t">WinRate</div><div class="d">Демо-панель контента.</div></div>' +
      '<div class="mock-card glass"><div class="t">Тир-лист</div><div class="d">Демо-панель контента.</div></div></div></div>';
  }
}
function renderTab() {
  var tab = document.getElementById('chatTab'), u = totalUnread();
  tab.classList.toggle('has-unread', u > 0 && !_open);
  tab.querySelector('.tbadge').textContent = u;
  tab.querySelector('.tlabel').textContent = _open ? 'Закрыть чат' : 'Чат';
}

/* ============================================================
   ФРАГМЕНТЫ ПУЗЫРЯ / КАРТОЧКИ
   ============================================================ */
function avHTML(color, u, extra) {
  var st = (S.status && u) ? ' st-' + u.st : '';
  return '<div class="av' + st + (extra || '') + '" style="background:' + (color || 'var(--accent)') + '"' +
    (u ? ' data-av="' + uIndex(u.name) + '"' : '') + '>' + initial(u ? u.name : '?') + '<span class="udot"></span></div>';
}
function renderText(t) {
  var out = esc(t).replace(/@([A-Za-zА-Яа-я_0-9]+)/g, '<span class="chat-mention">@$1</span>');
  if (S.wremoji) out = out.replace(/:([a-z]+):/g, function (m, k) { return WR_EMO[k] ? '<img class="wre" src="' + champIcon(WR_EMO[k]) + '" alt=":' + k + ':">' : m; });
  return out;
}
function cardHTML(c) {
  var head = function (ic, round, t, s) {
    return '<div class="card-h"><div class="card-ic' + (round ? ' round' : '') + '">' + ic + '</div>' +
      '<div class="card-tt"><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></div>';
  };
  var btn = function (l, tgt) { return '<button class="card-btn" data-open="' + esc(l) + '" data-tgt="' + esc(tgt) + '">' + esc(l) + ' →</button>'; };
  var pic = function (k) { return '<img src="' + champIcon(k) + '" alt="" onerror="this.style.display=\'none\'">'; };

  if (c.type === 'champion') return '<div class="card" data-card="champion">' + head(pic(c.key), true, c.name, c.sub || 'Чемпион') + btn('Открыть чемпиона', 'champ') + '</div>';
  if (c.type === 'matchup') {
    var rows = c.vs.map(function (v) { return '<div class="card-row"><span class="' + (v[1] ? 'ok' : 'no') + '">' + (v[1] ? '✓' : '✗') + '</span>' + esc(v[0]) + '</div>'; }).join('');
    return '<div class="card" data-card="matchup">' + head(pic(c.key), true, 'Матчапы · ' + c.name, 'кого бьёт / кто бьёт') + '<div class="card-body">' + rows + '</div>' + btn('Открыть матчапы', 'matchup') + '</div>';
  }
  if (c.type === 'tier') {
    var ti = c.items.map(function (it) { return '<div class="card-row"><span class="tierchip ' + it[1] + '">' + it[1] + '</span>' + esc(it[0]) + '</div>'; }).join('');
    return '<div class="card" data-card="tier">' + head('🏆', false, 'Тир-лист · патч ' + c.patch, 'актуальная мета') + '<div class="card-body">' + ti + '</div>' + btn('Открыть тир-лист', 'tier') + '</div>';
  }
  if (c.type === 'build') {
    var its = c.items.map(function (sl) { return '<img src="' + itemImg(sl) + '" alt="" onerror="this.style.visibility=\'hidden\'">'; }).join('');
    return '<div class="card" data-card="build">' + head(pic(c.key), true, 'Сборка · ' + c.name, 'ядро + ботинки') + '<div class="card-items">' + its + '</div>' + btn('Открыть сборку', 'build') + '</div>';
  }
  if (c.type === 'item') return '<div class="card" data-card="item">' + head('<img src="' + itemImg(c.slug) + '" alt="" onerror="this.style.display=\'none\'">', false, c.name, 'Предмет') + btn('Открыть предмет', 'item') + '</div>';
  if (c.type === 'photo') return '<div class="card" data-card="photo"><img class="card-photo" src="' + c.src + '" alt="" onerror="this.style.display=\'none\'">' + head('📷', false, c.cap || 'Скриншот', 'изображение') + '</div>';
  return '';
}
function pollHTML(p, id) {
  var total = p.opts.reduce(function (a, o) { return a + o.n; }, 0) || 1;
  var opts = p.opts.map(function (o, i) {
    var pct = Math.round(o.n / total * 100);
    return '<button class="poll-opt' + (p.voted ? ' voted' : '') + (p.mine === i ? ' mine' : '') + '" data-poll="' + id + '" data-opt="' + i + '" style="--pct:' + pct + '%">' +
      '<span class="fill"></span><span class="lab">' + esc(o.t) + '</span>' + (p.voted ? '<span class="pct">' + pct + '%</span>' : '') + '</button>';
  }).join('');
  return '<div class="poll"><div class="q">📊 ' + esc(p.q) + '</div>' + opts + '</div>';
}
function rowHTML(m) {
  if (m.sys) return '<div class="row sys" data-id="' + esc(m.id) + '"><div class="bub">' + esc(m.text) + '</div></div>';
  var me = m.uid === ME, bot = m.uid === 'bot';
  var pi = me ? -1 : uIndex(m.name);
  var u = pi >= 0 ? USERS[pi] : null;
  var av = bot ? '<div class="av" style="background:var(--accent)">🤖</div>' : avHTML(m.av || 'var(--accent)', u);
  var stag = (S.status && u && !me) ? '<span class="stag st-' + u.st + '">' + ST_LABEL[u.st] + '</span>' : '';
  var nm = (me || bot) ? (bot ? '<div class="nm">🤖 Бот</div>' : '') :
    '<div class="nm' + (pi >= 0 ? ' clickable' : '') + '"' + (pi >= 0 ? ' data-pi="' + pi + '"' : '') + '>' + (m.admin ? '👑 ' : '') + esc(m.name) + stag + '</div>';
  var txt = m.text ? '<div class="txt">' + renderText(m.text) + '</div>' : '';
  var card = m.card ? cardHTML(m.card) : '';
  var poll = (m.poll && S.polls) ? pollHTML(m.poll, m.id) : '';
  var quote = m.replyTo ? '<div class="reply-quote"><span class="qn">' + esc(m.replyTo.name) + '</span><span class="qt">' + esc(m.replyTo.text || 'вложение') + '</span></div>' : '';
  var meta = '<div class="meta"><span class="tm">' + esc(m.t || '') + '</span></div>';
  var reacts = (m.reactions && m.reactions.length) ? '<div class="reacts">' + m.reactions.map(function (r) {
    var face = r.wr ? '<img src="' + champIcon(r.wr) + '" alt="">' : r.e;
    return '<button class="rchip' + (r.mine ? ' mine' : '') + '" data-react="' + esc(r.e || r.wr) + '">' + face + ' ' + r.n + '</button>';
  }).join('') + '</div>' : '';
  var tools = '<div class="row-tools"><button class="rt-react" title="Реакция">😊</button>';
  if (S.reply) tools += '<button class="rt-reply" title="Ответить">↩</button>';
  if (S.mod && !me) tools += '<button class="rt-del danger" title="Удалить (админ)">🗑</button>';
  tools += '</div>';
  return '<div class="row' + (me ? ' me' : '') + (bot ? ' bot' : '') + (m.grp ? ' grp' : '') + '" data-id="' + esc(m.id) + '">' + av +
    '<div class="bub">' + quote + nm + txt + card + poll + meta + reacts + '</div>' + tools + '</div>';
}

/* ============================================================
   ★ ТОЧЕЧНЫЙ РЕ-РЕНДЕР ЛЕНТЫ (антидёрганье, как боевой app.js:4839)
   ============================================================ */
function elFromHTML(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

function patchFeed() {
  var box = document.querySelector('.cp-msgs');
  if (!box) { renderPanel(); return; }
  var a = CHAN_MSGS[_chan];
  var nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;

  var existing = {};
  Array.prototype.forEach.call(box.querySelectorAll('.row[data-id]'), function (r) { existing[r.dataset.id] = r; });

  var seen = {}, prev = null, added = false, reused = 0, recreated = 0, total = 0;
  a.forEach(function (m) {
    total++;
    seen[m.id] = true;
    var sig = JSON.stringify(m);
    var row = existing[m.id];
    if (row && row.dataset.sig === sig) { reused++; prev = row; return; }   // не тронут — узел выжил
    var fresh = elFromHTML(rowHTML(m));
    fresh.dataset.sig = sig;
    recreated++;
    if (row) {
      fresh.classList.add('no-anim');            // правка — НЕ переигрываем появление
      box.replaceChild(fresh, row);
    } else if (prev && prev.nextSibling) {
      box.insertBefore(fresh, prev.nextSibling); added = true;
    } else { box.appendChild(fresh); added = true; }
    wireRow(fresh);
    prev = fresh;
  });
  Array.prototype.forEach.call(box.querySelectorAll('.row[data-id]'), function (r) { if (!seen[r.dataset.id]) r.remove(); });

  if (added && nearBottom) box.scrollTop = box.scrollHeight;
  _lastNodeStat = 'выжило ' + reused + '/' + total + ' узлов, пересоздано ' + recreated;
  var ns = document.getElementById('nodeStat'); if (ns) ns.textContent = _lastNodeStat;
}

/* ============================================================
   РЕНДЕР ОБОЛОЧКИ ПАНЕЛИ (структурная смена: канал/тумблер/открытие)
   ============================================================ */
function draftChanHTML() {
  var caps = DRAFT_LOBBY.caps.map(function (c) {
    return '<div class="dch-cap"><span class="side ' + c.side + '">' + (c.side === 'blue' ? 'СИНИЙ' : 'КРАСНЫЙ') + '</span>' +
      avHTML(c.av, USERS[uIndex(c.name)] || { name: c.name, st: 'draft' }) + '<span class="nm">' + esc(c.name) + '</span></div>';
  }).join('');
  var specs = DRAFT_LOBBY.specs.map(function (s) {
    return '<span class="dch-spec">' + avHTML(s.av, USERS[uIndex(s.name)] || { name: s.name, st: 'online' }) + esc(s.name) + '</span>';
  }).join('');
  return '<div class="dch thin" data-key="dch"><h3>Капитаны</h3>' + caps + '<h3>Зрители · ' + DRAFT_LOBBY.specs.length + '</h3><div class="dch-specs">' + specs + '</div></div>';
}
function lfgHTML() {
  var posts = LFG_POSTS.map(function (p) {
    return '<div class="lfg-post"><div class="lh">' + avHTML((USERS[uIndex(p.by)] || {}).av, USERS[uIndex(p.by)] || { name: p.by, st: 'online' }) +
      '<span class="role">' + esc(p.role) + '</span></div><div class="need">' + esc(p.need) + ' · ' + esc(p.by) + '</div>' +
      '<button class="lbtn" data-lfg="' + esc(p.role) + '">Откликнуться</button></div>';
  }).join('');
  return '<div class="lfg thin" data-key="lfg">' + posts + '<button class="lfg-new">＋ Создать объявление «Ищу…»</button></div>';
}
function inputHTML() {
  var hint = S.bot ? '<div class="bot-hint">Бот: /tier Камилла · /build Камилла · /wr Камилла</div>' : '';
  return '<div class="reply-bar" id="replyBar" data-key="replybar" hidden><span>↩</span><span class="rb-tx" id="rbTx"></span><button class="rb-x" title="Отмена">✕</button></div>' + hint +
    '<div class="cp-input">' +
      '<div class="extra"><button class="ex-emoji" title="Эмодзи">😊</button><button class="ex-attach" title="Прикрепить">📎</button></div>' +
      '<input type="text" class="cl-inp" placeholder="Написать в #' + _chan + '…" autocomplete="off">' +
      '<button class="cp-send" title="Отправить">➤</button>' +
      '<div class="mention-pop" id="mentionPop" hidden></div>' +
    '</div>';
}
function userItems() {
  return USERS.map(function (u, i) {
    return '<button class="u-item" data-u="' + i + '">' + avHTML(u.av, u) +
      '<span class="nm">' + esc(u.name) + '<small>' + (S.status ? ST_LABEL[u.st] : u.sub) + '</small></span></button>';
  }).join('');
}
function userInline() { return USERS.filter(function (u) { return u.st !== 'offline'; }).map(function (u) { return avHTML(u.av, u, ' uav'); }).join(''); }

function renderPanel() {
  var panel = document.getElementById('chatPanel');
  var chans = channels();
  var chanTabs = chans.map(function (c) {
    var u = unreadCount(c.id);
    return '<button class="cp-chan' + (c.id === _chan ? ' on' : '') + (c.id === 'draft' ? ' draft' : '') + (u > 0 ? ' has-unread' : '') + '" data-chan="' + c.id + '">' +
      '<span class="cico">' + c.ico + '</span><span class="cname">' + c.name + '</span><span class="cbadge">' + u + '</span></button>';
  }).join('');
  var pin = (S.pin && PINNED[_chan]) ? '<div class="cp-pin" data-key="pin"><span class="pico">📌</span><span class="ptx">' + esc(PINNED[_chan]) + '</span>' + (S.mod ? '<button class="px" title="Открепить">✕</button>' : '') + '</div>' : '';

  /* ВСЕ каналы живут в DOM разом, переключение = показать/скрыть готовые узлы.
     Как в Telegram: ушёл в другой канал и вернулся — лента та же, не собирается заново. */
  var a = CHAN_MSGS.general, firstUnread = -1;
  for (var i = 0; i < a.length; i++) if (a[i].unread) { firstUnread = i; break; }
  var feed = a.map(function (m, i) { return (i === firstUnread ? '<div class="unread-div">Новые сообщения</div>' : '') + rowHTML(m); }).join('');
  var hid = function (id) { return _chan === id ? '' : ' hidden'; };
  var main =
    '<div class="cp-chanwrap" data-key="w-general"' + hid('general') + '>' +
      '<div class="cp-msgs thin" data-key="feed">' + feed + '</div>' + inputHTML() + '</div>' +
    '<div class="cp-chanwrap" data-key="w-draft"' + hid('draft') + '>' + draftChanHTML() + '</div>' +
    (S.lfg ? '<div class="cp-chanwrap" data-key="w-lfg"' + hid('lfg') + '>' + lfgHTML() + '</div>' : '');

  var uinline = '<div class="cp-uinline" data-key="uinline">' + userInline() + '</div>';
  var ucol = '<div class="cp-users" data-key="users"><div class="uh">В сети · ' + USERS.filter(function (u) { return u.st !== 'offline'; }).length + '</div><div class="cp-userlist thin">' + userItems() + '</div></div>';

  // ТОЧЕЧНО: смена канала / открытие панели правит только изменившееся,
  // а не пересобирает всю панель (шапка, каналы, поле ввода живут дальше).
  labMorph(panel,
    '<header class="cp-head"><div><div class="ttl">💬 WildRift Hub</div><div class="sub">' + USERS.filter(function (u) { return u.st !== 'offline'; }).length + ' в сети</div></div>' +
      '<span class="spacer"></span><button class="cp-ibtn cp-ubtn" title="Список">👥</button><button class="cp-ibtn cp-close" title="Свернуть">✕</button></header>' +
    '<nav class="cp-chans">' + chanTabs + '</nav>' +
    uinline.replace('data-key="uinline"', 'data-key="uinline"' + (_chan === 'general' ? '' : ' hidden')) + pin +
    '<div class="cp-body" data-key="body"><div class="cp-main" data-key="main">' + main + '</div>' + ucol + '</div>' +
    '<div class="cp-udrop thin" id="udrop" hidden>' + userItems() + '</div>');

  wirePanel(panel);
  var box = panel.querySelector('.cp-msgs');
  if (box) {
    box.scrollTop = box.scrollHeight;
    // проставить сигнатуры + повесить хендлеры на каждую строку (для будущих patchFeed)
    Array.prototype.forEach.call(box.querySelectorAll('.row[data-id]'), function (r) {
      var m = CHAN_MSGS.general.filter(function (x) { return x.id === r.dataset.id; })[0];
      if (m) r.dataset.sig = JSON.stringify(m);
      wireRow(r);
    });
  }
  updateReplyBar();
  renderTab();
}

/* ============================================================
   ХЕНДЛЕРЫ
   ============================================================ */
function wireRow(row) {
  var b;
  if ((b = row.querySelector('.rt-reply'))) b.onclick = function () { setReply(row.dataset.id); };
  if ((b = row.querySelector('.rt-react'))) b.onclick = function (e) { e.stopPropagation(); openReactPop(b, row.dataset.id); };
  if ((b = row.querySelector('.rt-del'))) b.onclick = function () { delMsg(row.dataset.id); };
  row.querySelectorAll('.rchip').forEach(function (c) { c.onclick = function () { toggleReact(row.dataset.id, c.dataset.react); }; });
  row.querySelectorAll('.poll-opt').forEach(function (o) { o.onclick = function () { votePoll(o.dataset.poll, +o.dataset.opt); }; });
  row.querySelectorAll('.av[data-av]').forEach(function (a) { a.onclick = function (e) { e.stopPropagation(); openProfile(+a.dataset.av); }; });
  row.querySelectorAll('.bub .nm.clickable').forEach(function (n) { n.onclick = function () { tagUser(USERS[+n.dataset.pi].name); }; });
  row.querySelectorAll('.card-btn').forEach(function (cb) { cb.onclick = function () { toast('Открываю: ' + cb.dataset.open + ' → раздел «' + cb.dataset.tgt + '» (на боевом — реальная фича)'); }; });
}
function wirePanel(panel) {
  panel.querySelector('.cp-close').onclick = function () { _open = false; document.body.classList.remove('chat-open'); renderTab(); };
  panel.querySelector('.cp-ubtn').onclick = function (e) { e.stopPropagation(); _udropOpen = !_udropOpen; panel.querySelector('#udrop').hidden = !_udropOpen; };
  panel.querySelectorAll('.cp-chan').forEach(function (b) {
    b.onclick = function () { _chan = b.dataset.chan; (CHAN_MSGS[_chan] || []).forEach(function (m) { m.unread = false; }); _udropOpen = false; renderPanel(); };
  });

  var inp = panel.querySelector('.cl-inp'), send = panel.querySelector('.cp-send');
  if (send) send.onclick = function () { doSend(inp); };
  if (inp) {
    if (!inp.__wired) {          // поле ввода переживает ре-рендер (labMorph) — слушателя вешаем один раз
      inp.__wired = 1;
      inp.addEventListener('keydown', function (e) { if (mentionKey(e, inp)) return; if (e.key === 'Enter') doSend(inp); });
      inp.addEventListener('input', function () { mentionScan(inp); });
    }
    if (_chan === 'general') inp.focus();
  }
  var rbx = panel.querySelector('.rb-x'); if (rbx) rbx.onclick = function () { _reply = null; updateReplyBar(); };
  var px = panel.querySelector('.cp-pin .px'); if (px) px.onclick = function () { PINNED[_chan] = null; renderPanel(); toast('Откреплено'); };

  var EM = ['🔥', '😄', '👍', '😎', '💪', '🎯'], ei = 0;
  var emo = panel.querySelector('.ex-emoji'); if (emo) emo.onclick = function () { inp.value += EM[ei++ % EM.length]; inp.focus(); };
  var att = panel.querySelector('.ex-attach'); if (att) att.onclick = function (e) { e.stopPropagation(); openAttach(att); };

  panel.querySelectorAll('.u-item').forEach(function (u) { u.onclick = function () { openProfile(+u.dataset.u); }; });
  panel.querySelectorAll('.lbtn').forEach(function (b) { b.onclick = function () { toast('Отклик на «' + b.dataset.lfg + '» отправлен (демо)'); }; });
  var lnew = panel.querySelector('.lfg-new'); if (lnew) lnew.onclick = function () { LFG_POSTS.unshift({ role: 'Ищу тиммейта', need: 'твой ранг, твоё время', by: 'Я' }); renderPanel(); toast('Объявление создано (демо)'); };
  // аватары/ники в драфт-канале и списках
  panel.querySelectorAll('.dch .av[data-av], .cp-uinline .av[data-av]').forEach(function (a) { a.onclick = function (e) { e.stopPropagation(); openProfile(+a.dataset.av); }; });
}

function updateReplyBar() {
  var bar = document.getElementById('replyBar'); if (!bar) return;
  if (!_reply) { bar.hidden = true; return; }
  bar.hidden = false;
  document.getElementById('rbTx').innerHTML = 'Ответ <b>' + esc(_reply.name) + '</b>: ' + esc(_reply.text || 'вложение');
}

function doSend(inp) {
  var v = (inp.value || '').trim(); if (!v) return;
  if (S.bot && v.charAt(0) === '/') { inp.value = ''; hideMention(); botReply(v); return; }
  var msg = { id: genId(), uid: ME, name: 'Я', text: v, t: nowHM() };
  if (_reply) msg.replyTo = { id: _reply.id, name: _reply.name, text: _reply.text };
  CHAN_MSGS[_chan].push(msg);
  _reply = null; inp.value = ''; hideMention();
  updateReplyBar(); patchFeed();
}
function botReply(cmd) {
  var parts = cmd.slice(1).split(/\s+/), c = parts[0].toLowerCase(), arg = parts.slice(1).join(' ') || 'Камилла';
  var card;
  if (c === 'tier') card = { type: 'tier', patch: '5.1', items: [['Ясуо', 'S'], ['Камилла', 'A'], ['Гарен', 'B']] };
  else if (c === 'build') card = { type: 'build', name: arg, key: 'Camille', items: ['eclipse', 'sterak-gage', 'death-dance'] };
  else if (c === 'wr') { CHAN_MSGS[_chan].push({ id: genId(), uid: 'bot', name: 'Бот', text: arg + ': WinRate 52.4% · PickRate 14.1% · тир A', t: nowHM() }); patchFeed(); return; }
  else { CHAN_MSGS[_chan].push({ id: genId(), uid: 'bot', name: 'Бот', text: 'Команды: /tier /build /wr <чемп>', t: nowHM() }); patchFeed(); return; }
  CHAN_MSGS[_chan].push({ id: genId(), uid: 'bot', name: 'Бот', text: '', card: card, t: nowHM() });
  patchFeed();
}
function setReply(id) { var m = msgById(id); if (!m) return; _reply = { id: id, name: m.uid === ME ? 'Я' : (m.name || 'Аноним'), text: m.text || (m.card ? 'вложение' : '') }; updateReplyBar(); var inp = document.querySelector('.cl-inp'); if (inp) inp.focus(); }
function delMsg(id) { CHAN_MSGS[_chan] = CHAN_MSGS[_chan].filter(function (m) { return m.id !== id; }); patchFeed(); toast('Сообщение удалено (админ)'); }
function toggleReact(id, key) {
  var m = msgById(id); if (!m) return;
  if (!m.reactions) m.reactions = [];
  var r = null;
  for (var i = 0; i < m.reactions.length; i++) if ((m.reactions[i].e || m.reactions[i].wr) === key) { r = m.reactions[i]; break; }
  if (r) { if (r.mine) { r.n--; r.mine = false; if (r.n <= 0) m.reactions = m.reactions.filter(function (x) { return x !== r; }); } else { r.n++; r.mine = true; } }
  else { var isWr = /^[A-Z]/.test(key); m.reactions.push(isWr ? { wr: key, n: 1, mine: true } : { e: key, n: 1, mine: true }); }
  patchFeed();
}
function votePoll(id, opt) {
  var m = msgById(id); if (!m || !m.poll) return;
  var p = m.poll;
  if (p.voted && p.mine != null) p.opts[p.mine].n--;
  p.opts[opt].n++; p.mine = opt; p.voted = true;
  patchFeed();
}

/* попапы */
function place(pop, anchor, above) {
  var r = anchor.getBoundingClientRect(); pop.hidden = false;
  var w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8) + 'px';
  var top = above ? r.top - h - 8 : r.bottom + 8; if (top < 8) top = r.bottom + 8;
  pop.style.top = top + 'px';
}
function openReactPop(btn, id) {
  var pop = document.getElementById('reactPop');
  var set = REACT_SET.map(function (e) { return '<button data-e="' + e + '">' + e + '</button>'; });
  if (S.wremoji) set = set.concat(['Camille', 'Ahri', 'Garen'].map(function (k) { return '<button data-wr="' + k + '"><img src="' + champIcon(k) + '" alt=""></button>'; }));
  pop.innerHTML = set.join('');
  place(pop, btn, true);
  pop.querySelectorAll('button').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); pop.hidden = true; toggleReact(id, b.dataset.e || b.dataset.wr); }; });
}
function openAttach(btn) { var menu = document.getElementById('attachMenu'); menu.querySelector('.poll-item').hidden = !S.polls; place(menu, btn, true); }

function sendCard(type) {
  var inp = document.querySelector('.cl-inp'), pre = inp ? (inp.value || '').trim() : '';
  if (type === 'poll') {
    CHAN_MSGS[_chan].push({ id: genId(), uid: ME, name: 'Я', text: '', t: nowHM(), poll: { q: 'Какой чемп на топ в патче 5.1?', opts: [{ t: 'Камилла', n: 2 }, { t: 'Гарен', n: 1 }, { t: 'Сетт', n: 0 }], voted: false, mine: null } });
    if (inp) inp.value = ''; patchFeed(); toast('Опрос создан 📊'); return;
  }
  var card =
    type === 'champion' ? { type: 'champion', name: 'Камилла', key: 'Camille', sub: 'Чемпион · топ-лейн' } :
    type === 'matchup' ? { type: 'matchup', name: 'Камилла', key: 'Camille', vs: [['Дариус', true], ['Гарен', true], ['Сетт', false]] } :
    type === 'tier' ? { type: 'tier', patch: '5.1', items: [['Ясуо', 'S'], ['Камилла', 'A'], ['Гарен', 'B']] } :
    type === 'build' ? { type: 'build', name: 'Камилла', key: 'Camille', items: ['eclipse', 'sterak-gage', 'death-dance'] } :
    type === 'item' ? { type: 'item', name: 'Кровопийца', slug: 'bloodthirster' } :
    { type: 'photo', src: splashUrl('Camille'), cap: 'момент тимфайта' };
  CHAN_MSGS[_chan].push({ id: genId(), uid: ME, name: 'Я', text: pre, card: card, t: nowHM() });
  if (inp) inp.value = ''; patchFeed(); toast('Карточка отправлена 📨');
}

/* профиль (аватар→userCard-паритет) */
function openProfile(i) {
  var u = USERS[i]; if (!u) return;
  var scrim = document.getElementById('pfScrim');
  var invite = S.invite ? '<button class="pf-btn pf-invite">🎯 Позвать в драфт</button>' : '';
  var mute = (S.mod && !u.admin) ? '<button class="pf-btn pf-mute">🔇 Замутить</button>' : '';
  scrim.innerHTML = '<div class="pf-card glass"><div class="pf-cover"></div><button class="pf-x" title="Закрыть">✕</button>' +
    '<div class="av pf-av' + (S.status ? ' st-' + u.st : '') + '" style="background:' + u.av + '">' + initial(u.name) + '<span class="udot"></span></div>' +
    '<div class="pf-name">' + (u.admin ? '👑 ' : '') + esc(u.name) + '</div>' +
    '<div class="pf-sub">' + esc(u.sub) + '<span class="pf-rank">' + esc(u.rank) + '</span>' + (S.status ? ST_LABEL[u.st] : '') + '</div>' +
    '<div class="pf-actions"><button class="pf-btn primary pf-mention">@ Упомянуть в чате</button>' + invite +
    '<button class="pf-btn pf-link">' + esc(u.link) + '</button>' + mute + '</div></div>';
  scrim.hidden = false;
  function close() { scrim.hidden = true; scrim.innerHTML = ''; }
  scrim.querySelector('.pf-x').onclick = close;
  scrim.onclick = function (e) { if (e.target === scrim) close(); };
  scrim.querySelector('.pf-mention').onclick = function () { tagUser(u.name); close(); };
  scrim.querySelector('.pf-link').onclick = function () { toast('Открываю ' + u.link + ' @' + u.name + ' (демо)'); };
  var inv = scrim.querySelector('.pf-invite'); if (inv) inv.onclick = function () { close(); inviteToDraft(u.name); };
  var mt = scrim.querySelector('.pf-mute'); if (mt) mt.onclick = function () { close(); toast('🔇 @' + u.name + ' замучен (админ, демо)'); };
}
function tagUser(name) { var inp = document.querySelector('.cl-inp'); if (inp) { inp.value = (inp.value ? inp.value.trim() + ' ' : '') + '@' + name + ' '; inp.focus(); } toast('@' + name + ' добавлен в поле'); }
function inviteToDraft(name) {
  S.draftLive = true; _chan = 'draft';
  if (DRAFT_LOBBY.specs.every(function (s) { return s.name !== name; }) && DRAFT_LOBBY.caps.every(function (c) { return c.name !== name; })) {
    var u = USERS[uIndex(name)] || {}; DRAFT_LOBBY.specs.push({ name: name, av: u.av || '#5c7cff' });
  }
  buildStrip(); applyShell(); renderPanel(); beep();
  toast('🎯 Кооп-драфт создан — @' + name + ' приглашён (вкладка ДРАФТ)');
}

/* @-автодополнение */
var _mentionHL = 0, _mentionMatches = [];
function mentionScan(inp) {
  var before = inp.value.slice(0, inp.selectionStart);
  var m = before.match(/@([A-Za-zА-Яа-я_0-9]*)$/);
  if (!m) { hideMention(); return; }
  var q = m[1].toLowerCase();
  _mentionMatches = USERS.filter(function (u) { return u.name.toLowerCase().indexOf(q) === 0; });
  if (!_mentionMatches.length) { hideMention(); return; }
  _mentionHL = 0;
  var pop = document.getElementById('mentionPop');
  pop.innerHTML = _mentionMatches.map(function (u, i) { return '<button data-n="' + esc(u.name) + '" class="' + (i === 0 ? 'hl' : '') + '">' + avHTML(u.av, u) + '<span>' + esc(u.name) + '</span></button>'; }).join('');
  pop.hidden = false;
  pop.querySelectorAll('button').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); pickMention(inp, b.dataset.n); }; });
}
function mentionKey(e, inp) {
  var pop = document.getElementById('mentionPop'); if (!pop || pop.hidden) return false;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); _mentionHL = (_mentionHL + (e.key === 'ArrowDown' ? 1 : _mentionMatches.length - 1)) % _mentionMatches.length; pop.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('hl', i === _mentionHL); }); return true; }
  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(inp, _mentionMatches[_mentionHL].name); return true; }
  if (e.key === 'Escape') { hideMention(); return true; }
  return false;
}
function pickMention(inp, name) {
  var pos = inp.selectionStart;
  inp.value = inp.value.slice(0, pos).replace(/@([A-Za-zА-Яа-я_0-9]*)$/, '@' + name + ' ') + inp.value.slice(pos);
  inp.focus(); hideMention();
}
function hideMention() { var p = document.getElementById('mentionPop'); if (p) p.hidden = true; }

/* ============================================================
   ДЕВ-ПОЛОСА
   ============================================================ */
var GROUPS = [
  { key: 'scene', label: 'Демо-сцена', opts: [['home', 'Home'], ['drafter', 'Драфтер (фуллскрин)']] },
  { key: 'width', label: 'Ширина панели', opts: [['narrow', 'Узкая 320'], ['mid', 'Средняя 380'], ['wide', 'Широкая 460']] },
  { key: 'behav', label: 'Поведение', opts: [['overlay', 'Оверлей'], ['push', 'Сдвигает контент']] },
  { key: 'tab', label: 'Кнопка вызова', opts: [['edge', 'Язычок справа'], ['icon', 'Иконка сверху'], ['float', 'Плавающая']] },
  { key: 'chans', label: 'Каналы', opts: [['pills', 'Пилюли сверху'], ['icons', 'Иконки слева']] },
  { key: 'ulist', label: 'Список юзеров', opts: [['inside', 'Внутри (ряд)'], ['column', 'Колонкой'], ['collapse', 'Сворачивается']] },
  { key: 'bubble', label: 'Вид пузыря', opts: [['rounded', 'Скруглённый'], ['card', 'Карточка'], ['pill', 'Пилюля'], ['line', 'Линия']] },
  { key: 'cardv', label: 'Карточка-ссылка', opts: [['rich', 'Богатая'], ['compact', 'Компактная'], ['outline', 'Акцент-обводка']] },
  { key: 'splash', label: 'Сплэш (проверка)', opts: [['lux', 'Lux — светлый'], ['brand', 'Brand — тёмный'], ['ahri', 'Ahri — пёстрый']] }
];
var FEATURES = [
  { key: 'draftLive', label: '🎯 Кооп-драфт идёт (канал ДРАФТ)' }, { key: 'invite', label: 'Позвать в драфт' },
  { key: 'reply', label: 'Реплай' }, { key: 'pin', label: 'Закреп' }, { key: 'mod', label: 'Модерация админа' },
  { key: 'bot', label: 'Слэш-бот /tier /build /wr' }, { key: 'polls', label: 'Поллы' },
  { key: 'status', label: 'Rich-статус ника' }, { key: 'wremoji', label: 'WR-эмодзи' },
  { key: 'notif', label: 'Уведомления (звук)' }, { key: 'lfg', label: 'LFG-канал' }
];
function labelOf(key, val) { var g = GROUPS.filter(function (x) { return x.key === key; })[0]; var o = g && g.opts.filter(function (x) { return x[0] === val; })[0]; return o ? o[1] : val; }
function choiceText() {
  var a = GROUPS.map(function (g) { return g.label.replace(/ \(.*\)/, '') + ': ' + labelOf(g.key, S[g.key]); });
  a.push('Фичи ВКЛ: ' + FEATURES.filter(function (f) { return S[f.key]; }).map(function (f) { return f.label; }).join(', '));
  return a.join(' · ');
}
function buildStrip() {
  var body = document.getElementById('stripBody');
  var html = '<div class="strip-sec">Панель / вид</div>';
  html += GROUPS.map(function (g) {
    var btns = g.opts.map(function (o) { return '<button class="' + (S[g.key] === o[0] ? 'on' : '') + '" data-k="' + g.key + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('');
    return '<div class="strip-group"><label>' + esc(g.label) + '</label><div class="seg">' + btns + '</div></div>';
  }).join('');
  html += '<div class="strip-sec">Фичи (тумблеры)</div><div class="toggles">' +
    FEATURES.map(function (f) { return '<button class="tgl' + (S[f.key] ? ' on' : '') + '" data-f="' + f.key + '"><span class="dot"></span>' + esc(f.label) + '</button>'; }).join('') + '</div>';
  html += '<div class="strip-foot"><div class="strip-choice">Ваш выбор: <b id="choiceText"></b><br><span class="nodestat">🩺 Точечный ре-рендер: <b id="nodeStat">' + esc(_lastNodeStat || '— (сделай реакцию/отправь)') + '</b></span></div>' +
    '<button class="strip-copy" id="stripCopy">📋 Скопировать мой выбор</button>' +
    '<button class="strip-min-btn" id="stripReset">↺ Сброс</button></div>';
  body.innerHTML = html;

  body.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { S[b.dataset.k] = b.dataset.v; buildStrip(); applyShell(); renderPanel(); }; });
  body.querySelectorAll('.tgl').forEach(function (b) {
    b.onclick = function () {
      S[b.dataset.f] = !S[b.dataset.f];
      if (b.dataset.f === 'draftLive' && !S.draftLive && _chan === 'draft') _chan = 'general';
      if (b.dataset.f === 'lfg' && !S.lfg && _chan === 'lfg') _chan = 'general';
      buildStrip(); applyShell(); renderPanel();
    };
  });
  document.getElementById('stripCopy').onclick = function () {
    var txt = 'ВЫБОР ЧАТА (lab-chat):\n' + choiceText().split(' · ').join('\n');
    navigator.clipboard.writeText(txt).then(function () { toast('📋 Выбор скопирован'); }, function () { toast('Не удалось скопировать'); });
  };
  document.getElementById('stripReset').onclick = function () { S = Object.assign({}, DEFAULTS); _chan = 'general'; buildStrip(); applyShell(); renderPanel(); };
  document.getElementById('choiceText').textContent = choiceText();
}
function makeDraggable() {
  var strip = document.getElementById('labStrip'), head = document.getElementById('stripHead'), dx = 0, dy = 0, dragging = false;
  head.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    var r = strip.getBoundingClientRect(); strip.style.transform = 'none'; strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px';
    dx = e.clientX - r.left; dy = e.clientY - r.top; dragging = true; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', function (e) { if (!dragging) return; strip.style.left = Math.min(Math.max(0, e.clientX - dx), window.innerWidth - strip.offsetWidth) + 'px'; strip.style.top = Math.min(Math.max(0, e.clientY - dy), window.innerHeight - 40) + 'px'; });
  head.addEventListener('pointerup', function () { dragging = false; });
  document.getElementById('stripMin').onclick = function () { var min = strip.classList.toggle('min'); this.textContent = min ? '▼ Развернуть' : '▲ Свернуть'; };
}

/* рельс + глобальное */
function wireApp() {
  var app = document.getElementById('app'), rail = document.getElementById('rail');
  rail.addEventListener('mouseenter', function () { app.classList.add('rail-open'); });
  rail.addEventListener('mouseleave', function () { app.classList.remove('rail-open'); });
  document.getElementById('chatTab').onclick = function () {
    _open = !_open;
    if (_open) (CHAN_MSGS[_chan] || []).forEach(function (m) { m.unread = false; });
    document.body.classList.toggle('chat-open', _open);
    renderTab(); if (_open) renderPanel();
  };
  document.getElementById('attachMenu').querySelectorAll('button[data-card]').forEach(function (b) {
    b.onclick = function (e) { e.stopPropagation(); document.getElementById('attachMenu').hidden = true; sendCard(b.dataset.card); };
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ex-attach')) document.getElementById('attachMenu').hidden = true;
    if (!e.target.closest('.rt-react')) document.getElementById('reactPop').hidden = true;
    if (!e.target.closest('.cp-ubtn') && !e.target.closest('#udrop')) { var d = document.getElementById('udrop'); if (d) { d.hidden = true; _udropOpen = false; } }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.getElementById('attachMenu').hidden = true; document.getElementById('reactPop').hidden = true;
    var sc = document.getElementById('pfScrim'); if (!sc.hidden) { sc.hidden = true; sc.innerHTML = ''; }
  });
}

/* ---------- старт ---------- */
buildStrip(); makeDraggable(); wireApp(); applyShell(); renderPanel();
})();
