// ───────────────────────────────────────────────────────────────────────────
// ПЕРЕРАБОТЧИК ЧАТА → ЧЕРНОВИКИ ЗНАНИЙ ДЛЯ КЭПА.
//
//   Берёт экспорт Telegram-чата (result.json) и вытаскивает из него то, что
//   игроки реально говорили: кто кого бьёт, кого банят, кто имба/слаб,
//   плюс цитаты про концепт игры / карту / отличия от ПК / смену страт.
//
//   Файл огромный → НЕ читаем целиком. Идём потоком кусками по 1 МБ и
//   вырезаем из массива messages по одному сообщению.
//
//   НИЧЕГО НЕ ВЫДУМЫВАЕТ: каждая пара/сигнал = сколько раз сказано, кем, когда,
//   с примерами цитат. Это ЧЕРНОВИКИ — их вычитывают в кэпе вручную.
//   champion-notes.json и captain-matchups.txt НЕ трогает.
//
//   Запуск:  node draft-ai/mine-chat.mjs <путь к result.json> [--months 6] [--half-life 180] [--out папка] [--words]
//   Выход:   knowledge/_mined-matchups.json  — кандидаты «A бьёт B на линии L»
//            knowledge/_mined-signals.json   — бан / имба / слаб по чемпам + помесячно
//            knowledge/_mined-authors.json   — доверие к авторам (ответы + реакции)
//            knowledge/_mined-concept.md     — цитаты по темам из свежего среза
// ───────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? (typeof def === 'number' ? Number(args[i + 1]) : args[i + 1]) : def;
};
const OUT_DIR = path.resolve(opt('--out', path.join(DIR, 'knowledge')));
const SRC = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const MONTHS = opt('--months', 6);
const HALF_LIFE_DAYS = opt('--half-life', 180);
const WORDS = args.includes('--words'); // отладка: какие формы слов узнались как какой чемп

if (!SRC || !fs.existsSync(SRC)) {
  console.error('Укажи путь к result.json:  node draft-ai/mine-chat.mjs "D:/.../result.json"');
  process.exit(1);
}

// ── ИМЕНА ЧЕМПИОНОВ ─────────────────────────────────────────────────────────
// Те же алиасы, что у import-captain.mjs (en / ddragon / ru / slug), плюс
// падежи (Олафом → Олаф), двухсловные (Ли Син) и сленг чата.

const TAGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-pipeline', 'champion-tags.json'), 'utf8'));
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');

const SLANG = {
  Yasuo: ['яс', 'яся', 'ясик'], Yone: ['йонэ', 'ёне', 'ёнэ', 'ене'], MasterYi: ['йи', 'yi'],
  'M.Fortune': ['мф', 'mf', 'мисска', 'фортуна'], XinZhao: ['ксин', 'синжао'], 'Tw. Fate': ['тф', 'tf', 'твистед'],
  Kaisa: ['кайса', 'каиса'], Khazix: ['казикс', 'хазикс'], Kogmaw: ['ког', 'когмао', 'когмо'],
  Velkoz: ['велкоз'], Ksante: ['ксанте'], Jarvan: ['джарван', 'жарван', 'ж4', 'j4', 'джей4'],
  Mundo: ['мундо'], Morde: ['морде', 'мордик', 'мордекайзер'], Fiddle: ['фидл', 'фиддл', 'фидлстикс'],
  Heimer: ['хеймер', 'хаймер', 'хеймердингер'], Trynda: ['тринда', 'трында', 'триндамир', 'трын'],
  Seraph: ['серафина', 'сераф'], 'Au. Sol': ['аурелион', 'асол', 'солик'], Chogath: ['чогат', 'чогас'],
  Hwei: ['хвей', 'хуэй'], Nilah: ['нила'], Skarner: ['скарнер'], Yunara: ['юнара'],
  Blitzcrank: ['блиц', 'блитц', 'блиц'], Malphite: ['мальф', 'малф', 'малфит'], Ezreal: ['эз', 'эзрил', 'эзреал'],
  Draven: ['дравен', 'дрейв'], Caitlyn: ['кейт', 'кейтлин', 'кэйт'], Vayne: ['вэйн'],
  Tristana: ['трист', 'триста'], Kassadin: ['касс', 'кас'], Katarina: ['катя', 'катарина'],
  Evelynn: ['эвелин', 'эва'], Nocturne: ['нокт', 'ноктурн'], Hecarim: ['хекарим', 'гека', 'хека'],
  Volibear: ['воли', 'волибер'], Wukong: ['вук', 'вуконга'], Renekton: ['ренек', 'реня'],
  Pantheon: ['пантик', 'панта'], Nautilus: ['наут', 'наутик'], Thresh: ['трэш', 'треша'],
  Alistar: ['алик', 'алистар'], Yuumi: ['юуми'], Janna: ['джанна'], Zyra: ['зира'],
  Brand: ['брэнд', 'бранд'], Annie: ['анни'], Ahri: ['ахри'], Fizz: ['физ'],
  Orianna: ['ори', 'ориана'], Vladimir: ['влад'], Ziggs: ['зигс'], Veigar: ['вегар', 'вейг'],
  Darius: ['дарик'], Camille: ['камила', 'камиль'], Irelia: ['ирела', 'ирэлия'],
  Jax: ['жакс', 'джекс'], Graves: ['грейвс', 'гравес', 'грейв'], Kayn: ['каин'], Lillia: ['лилия'],
  Rammus: ['рамус'], Kennen: ['кенен'], Sett: ['сетт'], Urgot: ['ургот'], Rell: ['рел'],
  Xayah: ['шая', 'ксайя', 'заяна', 'кайя'], Senna: ['сена'], Kayle: ['кейл'], Warwick: ['вв', 'ww'],
  Aatrox: ['атрокс'], Nidalee: ['нида'], Smolder: ['смолд'], LeeSin: ['лисин', 'leesin'],
  Lucian: ['люцик'], Zeri: ['зэри'], Akshan: ['акш'], Viego: ['виэго'], Ambessa: ['амбеса'],
};

// Формы, которые совпадают с падежом имени, но в чате значат другое
// (найдено прогоном --words): «тима» = команда, «казах», «синий», «воля»…
const STOP_FORMS = new Set(['тима', 'тиме', 'тиму', 'тимы', 'тимой', 'тимах', 'тимам', 'казах', 'казаха', 'казахи', 'казахов', 'синий', 'синей', 'сине', 'синего', 'синем', 'синему', 'синяя', 'синие', 'воля', 'волю', 'воле', 'волей', 'анна', 'анны', 'анне', 'анну', 'анной', 'соня', 'сони', 'соней', 'дарю', 'дари']);

// Слова, которые в русском значат что-то ещё: засчитываем только с большой буквы.
const AMBIG = new Set(['карма', 'твич', 'сона', 'мел', 'бард', 'талия', 'джин', 'талон', 'ари', 'эш', 'ви', 'вук', 'нами', 'кейн', 'катя', 'влад', 'дар', 'кас']);

const ENDINGS = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ой', 'ей', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'у', 'ю', 'а', 'я', 'е', 'и', 'ы', 'ь'];
const alias = new Map(); // точная форма → en
const stems = new Map(); // основа без окончания → en
const addAlias = (v, en) => {
  const n = norm(v);
  if (!n) return;
  if (!alias.has(n)) alias.set(n, en);
  if (n.length >= 4) {
    const st = n.replace(/[аяеиоуыьй]$/, '');
    if (st.length >= 3 && !stems.has(st)) stems.set(st, en);
    if (!stems.has(n)) stems.set(n, en);
  }
};
for (const [en, c] of Object.entries(TAGS.champions)) {
  const slug = String(c.dd).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  for (const v of [en, c.dd, c.ru, slug]) addAlias(v, en);
  for (const v of SLANG[en] || []) addAlias(v, en);
}

function champOf(word) {
  const n = norm(word);
  if (!n || STOP_FORMS.has(n)) return null;
  if (alias.has(n)) return alias.get(n);
  if (n.length < 4) return null;
  if (stems.has(n)) return stems.get(n);
  for (const e of ENDINGS) {
    if (!n.endsWith(e)) continue;
    const s = n.slice(0, -e.length);
    if (s.length < 3) continue;
    if (alias.has(s)) return alias.get(s);
    if (stems.has(s)) return stems.get(s);
  }
  return null;
}

// ── ЛИНИИ ───────────────────────────────────────────────────────────────────
const LANE_WORDS = {
  Top: ['топ', 'топе', 'топа', 'топер', 'top', 'соло', 'сололайн'],
  Jungle: ['лес', 'лесу', 'леса', 'лесом', 'лесник', 'лесника', 'лесников', 'джангл', 'jungle', 'jg', 'jungler'],
  Mid: ['мид', 'миде', 'мида', 'мидер', 'мидлейн', 'mid', 'центр'],
  Adc: ['адк', 'adc', 'дуо', 'бот', 'боте', 'стрелок', 'стрелка', 'стрелком', 'дракон-лайн'],
  Support: ['сап', 'сапа', 'сапе', 'сапом', 'саппорт', 'саппорта', 'support', 'supp', 'суп'],
};
const laneOfWord = new Map();
for (const [lane, ws] of Object.entries(LANE_WORDS)) for (const w of ws) laneOfWord.set(norm(w), lane);

// ── ПАТТЕРНЫ УТВЕРЖДЕНИЙ ────────────────────────────────────────────────────
// Текст предложения превращается в «скелет»: чемпионы → #0, #1…
// Дальше регулярки ищут связки между ними. F = до двух слов-вставок.
const F = '(?:[^ #]+ ){0,2}';
const C = '#(\\d+)';
const BEATS = '(?:контрит|контрет|законтрит|хардконтрит|контрю|ебет|выебет|ебашит|разносит|разнесет|разваливает|уничтожает|жрет|сожрет|давит|передавит|задавит|бьет|перебивает|переигрывает|перетрейдит|аутрейдит|перестаивает|гасит|душит|ломает|рвет|убивает|выигрывает|сильнее|сильней)';
const LOSES = '(?:проигрывает|сосет|сливает|слабее|слабей|сливается)';
const PICK = '(?:бери|брать|берите|пикай|пикать|пикни|возьми|взять|играй|ставь)';
const GOOD = '(?:силен|сильный|норм|нормально|хорош|хороший|имба|изи|изи лайн|ок|рулит|тащит|выигрывает)';
const BAD = '(?:слаб|слабый|сосет|проигрывает|тяжело|не стоит|страдает|умирает|не вывозит)';
const STRONG = '(?:имба|имбовый|имбалансный|мастхев|оп|op|сломан|сломанный|апнули|бафнули|баффнули|мета|метовый|сильный|силен|тащит)';
const WEAK = '(?:слаб|слабый|мусор|говно|днище|кал|нерфнули|понерфили|отстой|бесполезный|мертв|мертвый|неиграбельный|сосет)';

const RX_COUNTER = [
  // [регулярка, кто бьёт: 'a' = первый #, 'b' = второй #, вес фразы]
  [new RegExp(` ${C} ${F}${BEATS} ${F}${C} `, 'g'), 'a', 1],
  [new RegExp(` ${C} ?> ?${C} `, 'g'), 'a', 1],
  [new RegExp(` ${C} ?< ?${C} `, 'g'), 'b', 1],
  [new RegExp(` ${C} ${F}${LOSES} ${F}${C} `, 'g'), 'b', 1],
  [new RegExp(` ${C} (?:это |— |- |: )?(?:хард)?контр(?:а|пик|ит)? (?:на |против |для |к )?${C} `, 'g'), 'a', 1],
  [new RegExp(` (?:хард)?контр(?:а|пик|у)? (?:на |против |для |к )?${C} (?:это |— |- |: |, )?${F}${C} `, 'g'), 'b', 1],
  [new RegExp(` (?:против|на|vs) ${C} ${F}${PICK} ${C} `, 'g'), 'b', 0.8],
  [new RegExp(` ${PICK} ${C} (?:против|на|vs) ${C} `, 'g'), 'a', 0.8],
  [new RegExp(` ${C} (?:против|vs) ${C} ${F}${GOOD} `, 'g'), 'a', 0.7],
  [new RegExp(` ${C} (?:против|vs) ${C} ${F}${BAD} `, 'g'), 'b', 0.7],
];
const RX_BAN = [
  new RegExp(` (?:бан|банить|баним|банят|баню|банил|банили|забанить|забанил|баньте|ban) ((?:#\\d+ (?:, |и )?)+)`, 'g'),
  new RegExp(` ${C} (?:в )?(?:бан|банить|ban|пермабан) `, 'g'),
];
const RX_STRONG = [new RegExp(` ${C} ${F}${STRONG} (?!#)`, 'g'), new RegExp(` (?:имба|мастхев) ${C} `, 'g')];
const RX_WEAK = [new RegExp(` ${C} ${F}${WEAK} (?!#)`, 'g')];

// ── ТЕМЫ ДЛЯ КОНЦЕПТ-ВЫЖИМКИ ────────────────────────────────────────────────
// Сообщение попадает в тему, если в нём есть слово, начинающееся с ключа.
const TOPICS = {
  concept: { title: 'Концепт игры (макро, темп, ротации)', keys: ['макро', 'ротац', 'сплит', 'вижн', 'вард', 'темп', 'волн', 'пуш', 'тимфайт', 'приоритет', 'объект', 'драфт', 'концепт', 'винкондиш', 'скейл', 'лейт', 'ранн'] },
  map: { title: 'Устройство карты (объекты, лес, линии)', keys: ['карт', 'дракон', 'барон', 'герольд', 'старейш', 'башн', 'вышк', 'ингиб', 'нексус', 'кэмп', 'кемп', 'краб', 'буф', 'бафф', 'река', 'реки', 'куст'] },
  pc: { title: 'Отличия от ПК-LoL', keys: ['пк', 'pc', 'компьютер'], must: true },
  meta: { title: 'Как менялись страты и мета', keys: ['мета', 'страт', 'патч', 'нерф', 'понерф', 'апнул', 'баф', 'раньше', 'сейчас', 'тренд'] },
};

// ── ПОТОКОВОЕ ЧТЕНИЕ ────────────────────────────────────────────────────────
// Мини-парсер: следит за глубиной скобок и строками, находит ключ "messages"
// у корня и отдаёт каждое сообщение отдельно (JSON.parse по одному).
async function* streamMessages(file) {
  const rs = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 1 << 20 });
  let depth = 0, inStr = false, esc = false, key = null, lastKey = null, inMsgs = false;
  let capturing = false, parts = [];
  for await (const chunk of rs) {
    let start = capturing ? 0 : -1;
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk.charCodeAt(i);
      if (inStr) {
        if (esc) esc = false;
        else if (ch === 92) esc = true;
        else if (ch === 34) { inStr = false; if (key !== null) { lastKey = key; key = null; } }
        else if (key !== null) key += chunk[i];
        continue;
      }
      if (ch === 34) { inStr = true; if (depth === 1) key = ''; }
      else if (ch === 123 || ch === 91) {
        depth++;
        if (ch === 91 && depth === 2 && lastKey === 'messages') inMsgs = true;
        else if (ch === 123 && inMsgs && depth === 3) { capturing = true; start = i; parts = []; }
      } else if (ch === 125 || ch === 93) {
        if (ch === 125 && capturing && depth === 3) {
          parts.push(chunk.slice(start, i + 1));
          capturing = false;
          let m = null;
          try { m = JSON.parse(parts.join('')); } catch { stats.broken++; }
          parts = [];
          if (m) yield m;
        }
        depth--;
        if (inMsgs && depth === 1) inMsgs = false;
      }
    }
    if (capturing) parts.push(chunk.slice(start));
  }
}

// ── СБОР ────────────────────────────────────────────────────────────────────
const stats = { messages: 0, withText: 0, broken: 0, claims: 0, firstDate: null, lastDate: null };
const NEG_EMOJI = new Set(['👎', '🤡', '💩', '🤮', '😡']);
const authors = [];                 // [{id, name, msgs, replies, reacts}]
const authorIdx = new Map();        // from_id → индекс
const msgAuthor = new Map();        // message id → индекс автора
const tracked = new Map();          // message id → {replies} (сообщения с утверждениями/цитатами)
const claims = [];                  // сырые утверждения
const topicPool = [];               // кандидаты-цитаты для .md
const monthly = new Map();          // en → {YYYY-MM: упоминаний}
const forms = new Map();            // en → {форма: сколько} (только при --words)
const countForm = (en, f) => { if (!WORDS) return; const o = forms.get(en) || {}; o[f] = (o[f] || 0) + 1; forms.set(en, o); };

const flat = (t) => typeof t === 'string' ? t : Array.isArray(t) ? t.map((x) => typeof x === 'string' ? x : (x && x.text) || '').join('') : '';
const reactScore = (r) => {
  let s = 0;
  if (Array.isArray(r)) for (const x of r) s += (NEG_EMOJI.has(x.emoji) ? -1 : 1) * (x.count || 0);
  return s;
};
const tokenize = (s) => s.match(/[A-Za-zА-Яа-яЁё0-9']+|[>,:<]|[—–-](?=\s)/g) || [];

function analyzeSentence(sentence, ctx) {
  const raw = tokenize(sentence);
  if (raw.length < 2) return;
  const champs = [];
  const sk = [];
  let lane = null, laneConflict = false;
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    // Двухсловные имена: «Ли Син», «Мисс Фортуной», «Мастер Йи».
    const next = raw[i + 1];
    // Первое слово ≥ 2 букв: иначе «с Вейн» склеится в Свейна, «ни дали» в Нидали.
    if (next && w.length >= 2 && !/^(?:ни|за|на|не|по|до|от|из|во|ко|со)$/i.test(w) && /^[A-Za-zА-Яа-яЁё]/.test(w) && /^[A-Za-zА-Яа-яЁё]/.test(next)) {
      const big = norm(w + next);
      const en2 = alias.get(big) || champOf(big);
      const c1 = champOf(w), c2 = champOf(next);
      if (en2 && ((alias.has(big) && big.length >= 5) || (!c1 && c2 === en2) || (!c1 && !c2 && big.length >= 7))) {
        countForm(en2, (w + ' ' + next).toLowerCase());
        champs.push(en2); sk.push('#' + (champs.length - 1)); i++; continue;
      }
    }
    const lw = w.toLowerCase().replace(/ё/g, 'е');
    const en = champOf(w);
    if (en && !(AMBIG.has(lw) && w[0] === lw[0])) { countForm(en, lw); champs.push(en); sk.push('#' + (champs.length - 1)); continue; }
    const ln = laneOfWord.get(norm(w));
    if (ln) { if (lane && lane !== ln) laneConflict = true; lane = ln; }
    sk.push(lw);
  }
  if (!champs.length) return;
  for (const en of new Set(champs)) {
    const mo = monthly.get(en) || {};
    mo[ctx.month] = (mo[ctx.month] || 0) + 1;
    monthly.set(en, mo);
  }
  const skel = ' ' + sk.join(' ') + ' ';
  const ln = laneConflict ? null : (lane || ctx.lane);
  const quote = sentence.trim().slice(0, 220);
  const push = (c) => {
    const k = `${c.kind}|${c.a}|${c.b || ''}`;
    if (ctx.seen.has(k)) return;
    ctx.seen.add(k);
    claims.push({ ...c, lane: c.kind === 'counter' ? ln : null, ts: ctx.ts, date: ctx.date, author: ctx.author, msg: ctx.id, react: ctx.react, quote });
    ctx.hasClaim = true;
  };
  const negated = (idx) => / не $/.test(skel.slice(Math.max(0, idx - 4), idx + 1));

  for (const [rx, who, w] of RX_COUNTER) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(skel))) {
      rx.lastIndex = m.index + m[0].length - 1;
      const x = champs[+m[1]], y = champs[+m[2]];
      if (!x || !y || x === y) continue;
      if (/ не (?:[^ #]+ )?(?:контр|бьет|ебет|разнос|жрет|давит|сильне|проигр|сос|слабе|бери|пикай)/.test(m[0])) continue;
      const [a, b] = who === 'a' ? [x, y] : [y, x];
      push({ kind: 'counter', a, b, phrase: w });
    }
  }
  for (const rx of RX_BAN) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(skel))) {
      rx.lastIndex = m.index + m[0].length - 1;
      if (negated(m.index)) continue;
      for (const d of m[1].match(/\d+/g)) push({ kind: 'ban', a: champs[+d] });
    }
  }
  for (const [list, kind] of [[RX_STRONG, 'strong'], [RX_WEAK, 'weak']]) {
    for (const rx of list) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(skel))) {
        rx.lastIndex = m.index + m[0].length - 1;
        if (/ не /.test(m[0])) continue; // «не имба» ≠ «слаб» — не угадываем
        push({ kind, a: champs[+m[1]] });
      }
    }
  }
}

function topicsOf(text) {
  const words = (text.toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9]+/g) || []);
  const hit = [];
  for (const [t, def] of Object.entries(TOPICS)) {
    let n = 0;
    for (const w of words) for (const k of def.keys) if (w.startsWith(k)) { n++; break; }
    if (n >= (def.must ? 1 : 2)) hit.push(t);
  }
  return hit;
}

const t0 = Date.now();
for await (const m of streamMessages(SRC)) {
  stats.messages++;
  if (stats.messages % 50000 === 0) process.stdout.write(`\r  …${stats.messages} сообщений (${((Date.now() - t0) / 1000).toFixed(0)}с)`);
  if (m.type !== 'message') continue;
  const fromId = m.from_id || m.actor_id || 'unknown';
  let ai = authorIdx.get(fromId);
  if (ai === undefined) { ai = authors.length; authorIdx.set(fromId, ai); authors.push({ id: fromId, name: m.from || '', msgs: 0, replies: 0, reacts: 0 }); }
  const au = authors[ai];
  au.msgs++;
  if (m.from && !au.name) au.name = m.from;
  msgAuthor.set(m.id, ai);

  const react = reactScore(m.reactions);
  au.reacts += react;

  const rt = m.reply_to_message_id;
  if (rt !== undefined) {
    const ta = msgAuthor.get(rt);
    if (ta !== undefined && ta !== ai) {
      authors[ta].replies++;
      const tr = tracked.get(rt);
      if (tr) tr.replies++;
    }
  }

  const text = flat(m.text);
  if (!text || text.length < 4) continue;
  stats.withText++;
  const ts = Number(m.date_unixtime) || Date.parse(m.date) / 1000 || 0;
  const date = String(m.date || '').slice(0, 10);
  if (!stats.firstDate || date < stats.firstDate) stats.firstDate = date;
  if (!stats.lastDate || date > stats.lastDate) stats.lastDate = date;

  // Линия на уровне всего сообщения — подсказка, если в предложении её нет.
  let msgLane = null, conflict = false;
  for (const w of tokenize(text)) {
    const l = laneOfWord.get(norm(w));
    if (l) { if (msgLane && msgLane !== l) conflict = true; msgLane = l; }
  }
  const ctx = { id: m.id, ts, date, month: date.slice(0, 7), author: ai, react, lane: conflict ? null : msgLane, seen: new Set(), hasClaim: false };
  for (const s of text.split(/[.!?\n;]+/)) if (s.trim()) analyzeSentence(s, ctx);

  const topics = text.length >= 80 ? topicsOf(text) : [];
  if (topics.length) topicPool.push({ id: m.id, ts, date, author: ai, react, topics, text: text.slice(0, 700) });
  if (ctx.hasClaim || topics.length) tracked.set(m.id, { replies: 0 });
}
process.stdout.write('\r' + ' '.repeat(60) + '\r');
if (WORDS) {
  const list = [...forms.entries()].map(([en, f]) => [en, Object.values(f).reduce((a, b) => a + b, 0), f]).sort((a, b) => b[1] - a[1]);
  for (const [en, n, f] of list) console.log(`${en} ${n}: ` + Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, c]) => `${w} ${c}`).join(' · '));
  process.exit(0);
}

// ── ВЕСА ────────────────────────────────────────────────────────────────────
// Доверие к автору: сколько раз ДРУГИЕ ему отвечали + чистые реакции на его
// сообщения. Логарифм — чтобы болтун-рекордсмен не задавил всех.
for (const a of authors) {
  a.support = a.replies + a.reacts;
  a.trust = +(1 + Math.log2(1 + Math.max(0, a.support))).toFixed(2);
}
const lastTs = claims.reduce((mx, c) => Math.max(mx, c.ts), 0) || Date.now() / 1000;
const recency = (ts) => Math.pow(0.5, (lastTs - ts) / 86400 / HALF_LIFE_DAYS);
const echo = (c) => 1 + Math.log2(1 + Math.max(0, c.react + ((tracked.get(c.msg) || {}).replies || 0)));
const weightOf = (c) => authors[c.author].trust * recency(c.ts) * echo(c) * (c.phrase || 1);
const confidence = (n, au) => (n >= 5 && au >= 3 ? 'high' : n >= 2 && au >= 2 ? 'medium' : 'low');
const r2 = (x) => +x.toFixed(2);

// ── МАТЧАПЫ ─────────────────────────────────────────────────────────────────
const pairs = new Map();
for (const c of claims) {
  if (c.kind !== 'counter') continue;
  const k = `${c.a}|${c.b}|${c.lane || '*'}`;
  let p = pairs.get(k);
  if (!p) pairs.set(k, p = { a: c.a, b: c.b, lane: c.lane, count: 0, authors: new Set(), score: 0, firstDate: c.date, lastDate: c.date, examples: [] });
  p.count++;
  p.authors.add(c.author);
  const w = weightOf(c);
  p.score += w;
  if (c.date < p.firstDate) p.firstDate = c.date;
  if (c.date > p.lastDate) p.lastDate = c.date;
  p.examples.push({ date: c.date, w, quote: c.quote, author: authors[c.author].name });
}
// «против» = сколько раз в чате говорили наоборот (B бьёт A) — на той же линии или без линии.
const byDuel = new Map();
for (const q of pairs.values()) {
  const k = `${q.a}|${q.b}`;
  if (!byDuel.has(k)) byDuel.set(k, []);
  byDuel.get(k).push(q);
}
const pairList = [...pairs.values()].map((p) => {
  const rev = (byDuel.get(`${p.b}|${p.a}`) || []).filter((q) => q.lane === p.lane || !q.lane || !p.lane);
  const against = rev.reduce((s, q) => s + q.count, 0);
  return {
    a: p.a, b: p.b, lane: p.lane,
    count: p.count, authors: p.authors.size, against,
    confidence: confidence(p.count, p.authors.size),
    score: r2(p.score),
    firstDate: p.firstDate, lastDate: p.lastDate,
    examples: p.examples.sort((x, y) => y.w - x.w).slice(0, 3).map(({ w, ...e }) => e),
  };
}).sort((x, y) => y.score - x.score);

// ── СИГНАЛЫ ПО ЧЕМПАМ ───────────────────────────────────────────────────────
const signals = {};
for (const c of claims) {
  if (c.kind === 'counter') continue;
  const s = signals[c.a] || (signals[c.a] = { ban: null, strong: null, weak: null });
  const g = s[c.kind] || (s[c.kind] = { count: 0, authors: new Set(), score: 0, lastDate: c.date, examples: [] });
  g.count++; g.authors.add(c.author); g.score += weightOf(c);
  if (c.date > g.lastDate) g.lastDate = c.date;
  g.examples.push({ date: c.date, w: weightOf(c), quote: c.quote });
}
const recentMonths = (() => {
  const out = [];
  const d = new Date((stats.lastDate || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
  for (let i = 11; i >= 0; i--) out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  return out;
})();
const signalsOut = {};
for (const en of Object.keys(TAGS.champions)) {
  const s = signals[en] || {};
  const mo = monthly.get(en) || {};
  const total = Object.values(mo).reduce((a, b) => a + b, 0);
  if (!total) continue;
  const pack = (g) => g && { count: g.count, authors: g.authors.size, confidence: confidence(g.count, g.authors.size), score: r2(g.score), lastDate: g.lastDate, examples: g.examples.sort((x, y) => y.w - x.w).slice(0, 2).map(({ w, ...e }) => e) };
  signalsOut[en] = { mentions: total, last12m: recentMonths.map((k) => mo[k] || 0), ban: pack(s.ban), strong: pack(s.strong), weak: pack(s.weak) };
}

// ── КОНЦЕПТ .md ─────────────────────────────────────────────────────────────
const cutoff = (() => {
  const d = new Date((stats.lastDate || '2000-01-01') + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - MONTHS);
  return d.toISOString().slice(0, 10);
})();
const echoMsg = (q) => q.react + ((tracked.get(q.id) || {}).replies || 0);
const md = [];
md.push('# ЧЕРНОВИК: выжимка из чата (цитаты, не пересказ)', '');
md.push(`> Собрано mine-chat.mjs ${new Date().toISOString().slice(0, 10)} из ${stats.messages} сообщений (${stats.firstDate} … ${stats.lastDate}).`);
md.push(`> Срез: последние ${MONTHS} мес. (с ${cutoff}). Отбор — по отклику (реакции + ответы) × доверию к автору.`);
md.push('> Здесь только то, что реально сказано в чате. «отклик N» = сколько людей отреагировало/ответило. Вычитать в кэпе перед использованием.', '');
for (const [t, def] of Object.entries(TOPICS)) {
  const pool = topicPool.filter((q) => q.topics.includes(t) && q.date >= cutoff);
  md.push(`## ${def.title}`, '', `_Сообщений по теме в срезе: ${pool.length}_`, '');
  const ranked = pool.map((q) => ({ ...q, w: authors[q.author].trust * (1 + Math.log2(1 + Math.max(0, echoMsg(q)))) }))
    .sort((x, y) => y.w - x.w).slice(0, t === 'meta' ? 30 : 15);
  if (t === 'meta') ranked.sort((x, y) => (x.date < y.date ? -1 : 1));
  if (!ranked.length) md.push('_В срезе ничего не нашлось._', '');
  let month = '';
  for (const q of ranked) {
    if (t === 'meta' && q.date.slice(0, 7) !== month) { month = q.date.slice(0, 7); md.push(`### ${month}`, ''); }
    md.push(`- **${q.date}** · отклик ${echoMsg(q)} — ${q.text.replace(/\s+/g, ' ').trim()}`);
  }
  md.push('');
}

// ── ЗАПИСЬ ──────────────────────────────────────────────────────────────────
const meta = {
  _: 'ЧЕРНОВИК из Telegram-чата (mine-chat.mjs). НЕ доверенные данные — вычитать в кэпе. Не путать с champion-notes.json.',
  built: new Date().toISOString().slice(0, 10),
  source: path.basename(SRC),
  messages: stats.messages, withText: stats.withText, broken: stats.broken,
  chatRange: [stats.firstDate, stats.lastDate],
  halfLifeDays: HALF_LIFE_DAYS,
  confidence: 'high = ≥5 раз от ≥3 авторов · medium = ≥2 раз от ≥2 авторов · low = остальное',
  score: 'Σ доверие_автора × свежесть (полураспад) × отклик_на_сообщение × сила_фразы',
};
const OUT = {
  matchups: path.join(OUT_DIR, '_mined-matchups.json'),
  signals: path.join(OUT_DIR, '_mined-signals.json'),
  authors: path.join(OUT_DIR, '_mined-authors.json'),
  concept: path.join(OUT_DIR, '_mined-concept.md'),
};
const topAuthors = authors.filter((a) => a.msgs > 0).sort((x, y) => y.trust - x.trust || y.msgs - x.msgs);
fs.writeFileSync(OUT.matchups, JSON.stringify({ ...meta, pairs: pairList }, null, 1));
fs.writeFileSync(OUT.signals, JSON.stringify({ ...meta, months: recentMonths, champions: signalsOut }, null, 1));
fs.writeFileSync(OUT.authors, JSON.stringify({ ...meta, _trust: 'trust = 1 + log2(1 + ответы_от_других + реакции(+/−))', authors: topAuthors.slice(0, 300).map(({ id, name, msgs, replies, reacts, trust }) => ({ id, name, msgs, replies, reacts, trust })) }, null, 1));
fs.writeFileSync(OUT.concept, md.join('\n'));

// ── ОТЧЁТ ───────────────────────────────────────────────────────────────────
const byConf = pairList.reduce((o, p) => ((o[p.confidence] = (o[p.confidence] || 0) + 1), o), {});
console.log(`✓ Сообщений: ${stats.messages} (с текстом ${stats.withText}${stats.broken ? `, битых ${stats.broken}` : ''}) · ${stats.firstDate} … ${stats.lastDate} · ${((Date.now() - t0) / 1000).toFixed(1)}с`);
console.log(`✓ Утверждений: ${claims.length} · кандидат-пар матчапов: ${pairList.length} (high ${byConf.high || 0} · medium ${byConf.medium || 0} · low ${byConf.low || 0})`);
console.log(`✓ Чемпов с сигналами: ${Object.keys(signalsOut).length} · цитат-кандидатов для концепта: ${topicPool.length}`);
console.log('\nТоп-авторы по доверию:');
for (const a of topAuthors.slice(0, 10)) console.log(`  ${String(a.trust).padStart(5)}  ${a.name || a.id}  (сообщ. ${a.msgs}, ответов ${a.replies}, реакций ${a.reacts})`);
console.log('\nПримеры матчапов:');
for (const p of pairList.slice(0, 10)) {
  console.log(`  ${p.a} > ${p.b} ${p.lane || 'любая линия'} · ${p.count}× от ${p.authors} авт. · ${p.confidence} · ${p.firstDate}…${p.lastDate}${p.against ? ` · против: ${p.against}×` : ''}`);
  if (p.examples[0]) console.log(`      «${p.examples[0].quote}»`);
}
console.log('\nФайлы (черновики):');
for (const f of Object.values(OUT)) console.log('  ' + path.relative(ROOT, f));
