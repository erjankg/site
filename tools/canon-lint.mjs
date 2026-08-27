/* ══════════════════════════════════════════════════════════════════════════
   canon-lint.mjs — ЛИНТЕР КАНОНА (DESIGN.md). Ловит глазами-незаметный дрейф.

   Запуск:  node tools/canon-lint.mjs calc-app            (папка или файлы)
            node tools/canon-lint.mjs lab-patch lab-main
            node tools/canon-lint.mjs --all               (все lab-* + calc-app)

   Что проверяет (каждое правило = закон из DESIGN.md/CLAUDE.md):
     1. БЕЛОЕ НА ГЛАЗ — rgba(255,255,255,X) с X вне шкалы --sel-* (.06/.09/.12/.18/.45).
        Исключение: строка объявления самих токенов и тени материала (box-shadow/inset).
     2. СВОЁ СТЕКЛО — backdrop-filter вне правила .glass.
     3. ГРАДИЕНТ В CHROME — linear/conic-gradient с РАЗНЫМИ цветами вне .glass/.vignette.
     4. ЦВЕТ МИМО ТОКЕНОВ — hex-цвет в свойстве, которого нет в белом/дата-наборе.
     5. ИНЛАЙН-ЦВЕТ В JS — style="color:#..." / style.background = '#...'.
     6. ВЕЧНАЯ АНИМАЦИЯ — `infinite` (можно только спиннеру/«твой ход»).
     7. ПЕРЕРИСОВКА — innerHTML внутри обработчика input/keyup (дёрганье на каждую букву).
     8. СВОЙ АРТ-ФОН — арт на ПОДЛОЖКЕ мимо глобального --splash-img (ОДИН сплэш на сайт).
        «Подложка» определяется СТРУКТУРНО (лежит под всем), а не списком имён —
        см. блок BACKDROP_NAME/isBackdropBlock ниже. Портреты в карточках не трогает.
     9. Z-INDEX РУКАМИ — своё число вместо шкалы --z-* (0/1/-1 разрешены).
    10. TRANSFORM НА СТЕКЛЕ — transform/will-change/filter/contain:paint на САМОМ
        .glass-элементе: браузер гасит его backdrop-filter (ГЛАВНАЯ GOTCHA DESIGN.md).
    11. ЧИСЛА МИМО ТОКЕНОВ — px/ms в отступах/шрифтах/радиусах/тенях/длительностях
        мимо шкал канона (0 · 1px/2px · 100%/100v* · var()/calc(var) разрешены).
    12. МОДАЛКА МИМО openModal — своё .classList.add('active') / .style.display у
        *Mask/*Modal вне механизма матрёшки.
    13. СКРОЛЛ В ТАБЛИЦЕ — overflow-y:auto|scroll у таблиц Статс/WinRate.
   Выход: список находок с файлом:строкой. Код возврата 1, если есть находки.
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const SEL_OK = new Set(['0.06', '0.09', '0.12', '0.18', '0.45', '.06', '.09', '.12', '.18', '.45']);
/* цвета ДАННЫХ — им hex разрешён (смысл, не chrome) */
const DATA_TOKENS = /--(d-phys|d-magic|d-true|d-onhit|d-heal|tier-[sabc]|gain|demo|res-energy|accent|txt|txt-dim|txt-mute|up|dn)\b/;
const findings = [];
const add = (f, i, rule, text) => findings.push({ file: f, line: i + 1, rule, text: text.trim().slice(0, 120) });

function targets() {
  if (!args.length || args.includes('--all')) {
    return readdirSync(ROOT).filter(d => (d.startsWith('lab-') || d === 'calc-app') && statSync(join(ROOT, d)).isDirectory());
  }
  return args;
}
function filesOf(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [p];
  return readdirSync(abs)
    .filter(f => ['.css', '.js', '.html'].includes(extname(f)) && !/wr-data|-data\.js$|champ-base/.test(f))
    .map(f => join(p, f));
}

/* ══════════════════════════════════════════════════════════════════════════
   ПОДЛОЖКА — СТРУКТУРНЫЙ ПРИЗНАК (для правила 8)

   Раньше «подложку» отличали от контент-арта СПИСКОМ разрешённых имён
   (hero-art|cc-art|pc-art|…). Список — плохой детектор: новый портрет с новым
   именем сразу давал ложное срабатывание, а список надо было вечно дописывать.

   Теперь спрашиваем не «как называется», а «лежит ли оно ПОД ВСЕМ»:
     · СТРУКТУРА — position:FIXED и растянут на весь экран
       (inset:0 / top+left+right+bottom:0 / 100%|100v* по обеим сторонам);
     · ИМЯ — в классе/id есть splash|bg|backdrop|vignette.
   Любого из двух достаточно. Портрет в карточке не проходит ни по одному —
   сколько бы новых имён для портретов ни завели.

   ★ ПОЧЕМУ ИМЕННО fixed, А НЕ «fixed ИЛИ absolute» (проверено по коду, не на глаз):
     все настоящие подложки проекта — `position:fixed; inset:0` (.splash, .vignette
     во ВСЕХ лабах). А `position:absolute; inset:0` — это ровно то, как пишут
     полноразмерный арт ВНУТРИ карточки (.hr-art, .pc-art, .cc-art::after): он
     заполняет КАРТОЧКУ, а не экран. Считать absolute подложкой = ловить портреты.
     Если экранный фон всё же сделают через absolute — его поймает признак ИМЕНИ.
   ══════════════════════════════════════════════════════════════════════════ */
const BACKDROP_NAME_RX = /(^|[^a-z])(splash|backdrop|vignette|bg)([^a-z]|$)/i;
/* camelCase — тоже граница слова: `dlSplash`, `mainBg`. Без этого id вида
   #dlSplash не опознаётся, потому что перед «Splash» стоит буква. */
const BACKDROP_NAME = { test: s => BACKDROP_NAME_RX.test(String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2')) };

/* Растянут на весь контейнер? */
function isStretched(css) {
  if (/\binset\s*:\s*0/.test(css)) return true;
  const side = s => new RegExp('\\b' + s + '\\s*:\\s*(0|0px|0%)\\s*[;}]').test(css);
  if (side('top') && side('left') && side('right') && side('bottom')) return true;
  const full = /\b(width|height)\s*:\s*(100%|100v[wh])/g;
  return (css.match(full) || []).length >= 2;
}
/* Экранная подложка по СТРУКТУРЕ: прибита к экрану и растянута на него */
function isScreenBackdrop(body) {
  return /\bposition\s*:\s*fixed/.test(body) && isStretched(body);
}
/* Блок CSS описывает подложку? (структура ИЛИ имя) */
function isBackdropBlock(selector, body) {
  return BACKDROP_NAME.test(selector) || isScreenBackdrop(body);
}
/* ── ПРАВИЛО 10: «этот блок описывает САМ стеклянный элемент?» ──────────────
   GOTCHA канона: transform/will-change/filter/contain:paint на ТОМ ЖЕ элементе,
   где backdrop-filter, гасят стекло. Важно именно «на том же»: на НЕ-стеклянной
   обёртке transform разрешён и является рекомендованным приёмом (слой-сэндвич).
   Поэтому смотрим ПОСЛЕДНИЙ компаунд селектора: `.rail.glass` — стекло,
   `.glass .child` — уже ребёнок, `.glass::after` — псевдоэлемент (свой бокс). */
function lastCompound(sel) {
  const parts = sel.trim().split(/[\s>+~]+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}
/* Имена, которым стекло выдано ОБЩИМ правилом-списком (легаси `:is(.glass,.m-win,…)`).
   Без этого правило 10 слепо к легаси: у `.m-win` в его собственном блоке нет ни
   `.glass` в селекторе, ни backdrop-filter — стекло ему даёт другое правило. */
const GLASS_NAMES = new Set();
function isGlassBlock(selector, body) {
  const selfGlass = selector.split(',').some(s => {
    const last = lastCompound(s);
    if (/::?(before|after)/.test(last)) return false;          /* псевдоэлемент = свой бокс */
    if (/\.glass\b/.test(last)) return true;
    return [...last.matchAll(/[.#]([\w-]+)/g)].some(m => GLASS_NAMES.has(m[1]));
  });
  /* блок сам объявляет backdrop-filter → это стеклянный элемент, как ни зовись */
  const declaresGlass = /backdrop-filter\s*:(?!\s*none)/.test(body);
  return selfGlass || declaresGlass;
}

/* ── ПРАВИЛО 12: в какой функции мы находимся (для JS) ──────────────────────
   Нужно, чтобы НЕ ругать сам механизм матрёшки: openModal/closeModal и их
   служебные помощники ОБЯЗАНЫ дёргать classList/display — это их работа. */
const MODAL_SYSTEM_FN = /(open|close)Modal|_applyStackVisuals|_smoothCloseEl|_instantHideEl|_hideTooltips/i;
function jsFunctionScopes(lines) {
  const map = new Array(lines.length).fill('');
  const stack = [];              /* [{name, depth}] */
  let depth = 0;
  const NAME_RX = /(?:function\s+([\w$]+)|([\w$.]+)\s*[:=]\s*(?:async\s*)?function|([\w$]+)\s*\([^)]*\)\s*\{)/;
  lines.forEach((line, i) => {
    const m = NAME_RX.exec(line);
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (m && opens > 0) stack.push({ name: m[1] || m[2] || m[3] || '', depth });
    depth += opens - closes;
    while (stack.length && depth <= stack[stack.length - 1].depth) stack.pop();
    map[i] = stack.map(s => s.name).join('|');
  });
  return map;
}

/* Для каждой строки CSS — её блок {селектор, тело}. Нужен потому, что
   background-image и position почти никогда не стоят на одной строке. */
function cssBlocks(lines) {
  const map = new Array(lines.length).fill(null);
  let depth = 0, selBuf = '', start = -1, bodyLines = [];
  lines.forEach((line, i) => {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (depth === 0 && opens > 0) { start = i; selBuf = (selBuf + ' ' + line.split('{')[0]).trim(); bodyLines = []; }
    if (depth > 0 || opens > 0) bodyLines.push(line);
    depth += opens - closes;
    if (depth <= 0) {
      if (start >= 0) {
        const blk = { selector: selBuf, body: bodyLines.join('\n') };
        for (let k = start; k <= i; k++) map[k] = blk;
      }
      depth = 0; selBuf = ''; start = -1; bodyLines = [];
    } else if (opens === 0 && closes === 0 && start === -1) {
      selBuf = (selBuf + ' ' + line).trim();          /* многострочный селектор */
    }
  });
  return map;
}

/* ── ПРЕДПРОХОД: собираем ИМЕНА подложек из CSS ─────────────────────────────
   В JS структуры не видно (`el.style.backgroundImage = …` ничего не говорит о
   position/inset), поэтому единственная зацепка — имя. Но полагаться только на
   слова splash|bg|backdrop|vignette мало: подложку могут назвать нейтрально
   (.podlozhka-ekrana). Зато ЛЮБАЯ настоящая подложка обязана быть описана в CSS
   как fixed/absolute + растяжка на весь контейнер — оттуда имена и берём.
   Так структурный признак работает и для JS: имя опознано по его же CSS. */
const CSS_BACKDROP_NAMES = new Set();
for (const t of targets()) {
  for (const rel of filesOf(t)) {
    if (extname(rel) !== '.css') continue;
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
    for (const blk of new Set(cssBlocks(lines).filter(Boolean))) {
      /* правило 10: кому это правило РАЗДАЁТ стекло (в т.ч. через :is(a,b,c)) */
      if (/backdrop-filter\s*:(?!\s*none)/.test(blk.body)) {
        for (const sel of blk.selector.split(',')) {
          const last = lastCompound(sel);
          if (/::?(before|after)/.test(last)) continue;
          for (const m of last.matchAll(/[.#]([\w-]+)/g)) GLASS_NAMES.add(m[1]);
        }
        /* селектор-список внутри :is()/:where() тоже раздаёт стекло поимённо */
        for (const grp of blk.selector.matchAll(/:(?:is|where)\(([^)]*)\)/g))
          for (const m of grp[1].matchAll(/[.#]([\w-]+)/g)) GLASS_NAMES.add(m[1]);
      }
      if (!isScreenBackdrop(blk.body)) continue;
      /* псевдоэлементы отбрасываем: `.cc-art::after{position:absolute;inset:0}` —
         это затемняющая шторка ВНУТРИ карточки, а не сама карточка-подложка. */
      for (const sel of blk.selector.split(',')) {
        if (/::?(before|after|hover|focus|active)/.test(sel)) continue;
        for (const m of sel.matchAll(/[.#]([\w-]+)/g)) CSS_BACKDROP_NAMES.add(m[1]);
      }
    }
  }
}

for (const t of targets()) {
  for (const rel of filesOf(t)) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const isCss = extname(rel) === '.css';
    let inComment = false;
    const lines = src.split('\n');
    const blocks = isCss ? cssBlocks(lines) : [];   /* правила 8/10/13: в каком CSS-блоке строка */
    const fnScope = isCss ? [] : jsFunctionScopes(lines);  /* правило 12: в какой функции строка */
    lines.forEach((line, i) => {
      const l = line.trim();
      const prevLine = i > 0 ? lines[i - 1] : '';
      /* блочные комментарии пропускаем: там ЦИТИРУЮТСЯ сами законы («infinite нет», «backdrop-filter только…»).
         ★ ФИКС: маркеры /* и *​/ ищем ТОЛЬКО вне URL. Без этого CSP-мета в index.html
         (`https://*.googleapis.com` → «/*») открывала фиктивный комментарий на весь файл,
         и линтер молча рапортовал «чисто» по ГЛАВНОМУ файлу сайта. */
      const scan = line.replace(/[a-z][\w+.-]*:\/\/\S+/gi, '');
      const wasComment = inComment;
      if (scan.includes('/*') && !scan.includes('*/')) inComment = true;
      else if (inComment && scan.includes('*/')) inComment = false;
      if (wasComment || inComment || l.startsWith('/*') || l.startsWith('*') || l.startsWith('//')) return;
      /* объявление токена — это и есть источник правды, его не ругаем */
      const isDecl = /^--[\w-]+\s*:/.test(l);

      /* 1 · белое на глаз */
      if (!isDecl && !/--sel-|box-shadow|inset |--glass-tint/.test(line)) {
        for (const m of line.matchAll(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/g)) {
          if (!SEL_OK.has(m[1])) add(rel, i, 'белое-на-глаз', `${m[0]} → возьми --sel-* (${[...SEL_OK].slice(0, 5).join('/')})`);
        }
      }
      /* 2 · своё стекло.
         Не ругаем: (а) blur из канонных переменных (--glass-blur или её алиас --g-blur),
         (б) `backdrop-filter: none` — это СНЯТИЕ стекла (анти-рамка), а не своё стекло. */
      if (/backdrop-filter/.test(line) && !/--glass-blur|--g-blur/.test(line) && !/backdrop-filter\s*:\s*none/.test(line))
        add(rel, i, 'своё-стекло', l);
      /* 3 · градиент в chrome */
      if (/(linear|conic)-gradient/.test(line) && !/\.glass|vignette|--glass-dark|--g-op|--g-rgb|splash/.test(line)) {
        const cols = [...line.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|var\(--[\w-]+\)/g)].map(x => x[0]);
        if (new Set(cols).size > 1) add(rel, i, 'градиент-в-chrome', l);
      }
      /* 4 · hex мимо токенов (в CSS вне блока объявления переменных) */
      if (isCss && !/^--|^\s*--/.test(l)) {
        for (const m of line.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
          const c = m[0].toLowerCase();
          if (c === '#fff' || c === '#ffffff') continue;                 /* чистый белый = канон */
          if (DATA_TOKENS.test(line)) continue;
          add(rel, i, 'hex-мимо-токена', `${m[0]} → в переменную (--sel-*/данные)`);
        }
      }
      /* 5 · инлайн-цвет в JS/HTML */
      if (!isCss && /(style\s*=\s*["'][^"']*(color|background)\s*:\s*#)|style\.(color|background\w*)\s*=\s*['"]#/.test(line))
        add(rel, i, 'инлайн-цвет', l);
      /* 6 · вечная анимация */
      if (/\binfinite\b/.test(line) && !/спиннер|spinner|loading|твой ход|unread/i.test(line))
        add(rel, i, 'вечная-анимация', l);
      /* 7 · перерисовка на каждую букву */
      if (/on(input|keyup)\s*=|addEventListener\(['"](input|keyup)/.test(line) && /innerHTML|replaceChildren/.test(line))
        add(rel, i, 'перерисовка-на-букву', l);
      /* 8 · СВОЙ АРТ-ФОН — ОДИН глобальный сплэш на весь сайт (--splash-img из ⚙).
         Ловим ПОДЛОЖКУ: вид/лаб/раздел красит фон под собой сам — императивно
         (`el.style.backgroundImage = splashOf(champ)`) или своим url() на слой-фон.
         Почему это баг: у фона появляется второй владелец, и «один арт на весь сайт»
         рассыпается — калькулятор перекрашивал экран под выбранного чемпа.

         ★ КОНТЕНТ-АРТ (портреты в карточках) НЕ ловится БЕЗ всякого списка имён:
         он просто не проходит проверку «лежит ли под всем» (см. isBackdropBlock).
         Поэтому портрет с ЛЮБЫМ новым именем безопасен по построению.

         Не ругаем ещё: глобальный канал (--splash-img/-color/-brand), data:-URI
         (шум/текстура — материал, не арт), снятие фона (none) и градиенты (правило 3). */
      const GLOBAL_CH = /--splash-img|--splash-color|--splash-brand/;
      const setsArt = /(background-image\s*:|\.style\.backgroundImage\s*=|backgroundImage\s*[:=])/.test(line)
        && /(url\(|_0\.(jpg|webp|png)|\.(webp|png|jpg)|splash|ddragon)/i.test(line)
        && !GLOBAL_CH.test(line)                      /* глобальный канал — это и есть норма */
        && !/url\(\s*["']?data:/i.test(line)          /* data:-URI = текстура/шум, не арт */
        && !/:\s*none\b|=\s*['"]none|gradient/.test(line);
      if (setsArt) {
        /* ЛЕЖИТ ЛИ ОНО ПОД ВСЕМ? Спрашиваем структуру, а не имя из списка. */
        let backdrop;
        if (isCss) {
          /* CSS: смотрим ВЕСЬ блок правила — position и растяжка почти никогда
             не стоят на той же строке, что background-image. */
          backdrop = blocks[i] ? isBackdropBlock(blocks[i].selector, blocks[i].body) : BACKDROP_NAME.test(line);
        } else {
          /* JS/HTML: проверяем ТОЧЕЧНО — только то, ЧЕМУ назначается фон.
             По всей строке проверять нельзя: в строке кнопки-миниатюры пикера
             попадается ключ состояния S.splash, и превью ловилось как подложка. */
          const probes = [];
          /* (а) цель присваивания: X.style.backgroundImage = … */
          for (const m of line.matchAll(/([\w$]+(?:\.[\w$]+|\[[^\]]*\]|\([^)]*\))*)\s*\.style\s*\.backgroundImage/g)) probes.push(m[1]);
          /* (б) элемент с инлайн-стилем: берём class/id ТОГО ЖЕ тега.
             Ограничиваем разбор одним тегом (от последнего «<» до background-image),
             иначе у кнопки-миниатюры подхватывался класс тега-РОДИТЕЛЯ (.ss-splash)
             и превью пикера ловилось как подложка. */
          const ctx = prevLine + '\n' + line;
          const at = ctx.search(/background-?[iI]mage/);
          if (at > -1) {
            const tag = ctx.slice(Math.max(0, ctx.lastIndexOf('<', at)), at);
            for (const m of tag.matchAll(/\b(?:class|id)\s*=\s*["'`]([^"'`]*)/g)) probes.push(m[1]);
          }
          /* (в) короткая переменная-цель (sp, el) — доопределяем её по месту объявления */
          for (const p of probes.slice()) {
            if (/^[\w$]+$/.test(p)) {
              const decl = new RegExp('\\b' + p + '\\s*=\\s*([^;\\n]*)').exec(ctx);
              if (decl) probes.push(decl[1]);
            }
          }
          backdrop = probes.some(p =>
            BACKDROP_NAME.test(p) || [...p.matchAll(/[\w-]+/g)].some(m => CSS_BACKDROP_NAMES.has(m[0])));
        }
        if (backdrop)
          add(rel, i, 'свой-арт-фон', 'свой арт на ПОДЛОЖКЕ (лежит под всем) → только глобальный --splash-img');
      }

      /* 9 · Z-INDEX РУКАМИ — слои живут в ОДНОЙ шкале --z-* (canon-tokens.css).
         Свои числа = война этажей: кто-то ставит 9999, следующий 10000, и оверлей
         навсегда прячет попап. Не ругаем 0/1/-1 (тривиальный порядок соседей),
         auto/inherit, объявление самих --z-* и любую запись через var(--z-…). */
      if (!isDecl && !/--z-/.test(line)) {
        for (const m of line.matchAll(/z-?[iI]ndex\s*[:=]\s*['"]?(-?\d+)/g)) {
          if (!['0', '1', '-1'].includes(m[1]))
            add(rel, i, 'z-index-руками', `z-index:${m[1]} → в шкалу --z-* (--z-rail/--z-modal/--z-toast…)`);
        }
      }

      /* 10 · TRANSFORM НА СТЕКЛЕ (ГЛАВНАЯ GOTCHA канона).
         backdrop-filter НЕ рендерится, если на ТОМ ЖЕ элементе есть transform /
         will-change:transform|opacity / filter / contain:paint — браузер молча
         выключает стекло. Отсюда «стекло пропадает при анимации».
         Ругаем только если это САМ стеклянный элемент; на не-стеклянной обёртке
         transform разрешён и является рекомендованным приёмом (слой-сэндвич). */
      if (isCss && blocks[i] && isGlassBlock(blocks[i].selector, blocks[i].body)) {
        const killer =
          /(^|[;{\s])transform\s*:(?!\s*none)/.test(line) ? 'transform' :
          /will-change\s*:[^;]*\b(transform|opacity)\b/.test(line) ? 'will-change' :
          /(^|[;{\s])filter\s*:(?!\s*none)/.test(line) && !/backdrop-filter/.test(line) ? 'filter' :
          /contain\s*:[^;]*\b(paint|strict|content)\b/.test(line) ? 'contain:paint' : null;
        if (killer)
          add(rel, i, 'transform-на-стекле', `${killer} на .glass-элементе гасит backdrop-filter → перенеси на НЕ-стеклянную обёртку`);
      }

      /* 11 · ЧИСЛА МИМО ТОКЕНОВ — размеры/времена берём из шкал канона
         (--sp-* · --r-* · --fs-* · --dur-*), иначе «почти одинаковые» 14/15/16px
         расползаются по файлам и правятся поштучно.
         Не ругаем: 0 · 1px/2px (хайрлайны и бордеры) · 100%/100v* · всё, что
         посчитано из var() · объявления самих токенов. */
      if (!isDecl) {
        /* matchAll, а не exec: в этом проекте CSS часто пишут одной строкой —
           при одиночном поиске все свойства кроме первого проходили бы мимо. */
        const PROPS = /(^|[;{\s])(padding|margin|gap|row-gap|column-gap|font-size|border-radius|box-shadow|transition-duration|animation-duration)(-top|-right|-bottom|-left|-inline|-block)?\s*:\s*([^;}]*)/g;
        const hits = [];
        for (const m of line.matchAll(PROPS)) {
          const bare = m[4].replace(/var\([^)]*\)/g, '').replace(/calc\([^)]*\)/g, '');
          const nums = [...bare.matchAll(/(?<![\w-])(\d*\.?\d+)(px|ms|s)\b/g)]
            .filter(x => !(x[2] === 'px' && ['0', '1', '2'].includes(x[1])));
          if (nums.length) hits.push(m[2] + (m[3] || '') + ': ' + nums.map(x => x[1] + x[2]).join(' '));
        }
        if (hits.length)
          add(rel, i, 'число-мимо-токена', `${hits.join(' · ')} → возьми из шкалы (--sp-*/--r-*/--fs-*/--dur-*)`);
      }

      /* 12 · МОДАЛКА МИМО openModal (ЗАКОН МАТРЁШКИ).
         Своё открытие/закрытие проходит МИМО стопки _modalStack → «закрыл верхнюю,
         а закрылось всё» и сломанная кнопка «Назад». Сам механизм (openModal /
         closeModal и их помощники) исключён — дёргать classList это его работа. */
      if (!isCss && !MODAL_SYSTEM_FN.test(fnScope[i] || '')) {
        const acts = /classList\s*\.\s*add\s*\(\s*['"]active['"]\)|\.style\s*\.\s*display\s*=/.test(line);
        if (acts) {
          let target = line.slice(0, line.search(/classList|\.style/));
          /* элемент часто кладут в переменную СТРОКОЙ ВЫШЕ (`var el = …Mask; el.style…`) —
             тогда в самой строке имени модалки нет. Доопределяем по месту объявления. */
          const bare = /(?:^|[^\w$.])([\w$]+)\.$/.exec(target.trim());
          if (bare) {
            const decl = new RegExp('\\b' + bare[1] + '\\s*=\\s*([^;\\n]*)').exec(prevLine + '\n' + line);
            if (decl) target += ' ' + decl[1];
          }
          if (/(Mask|Modal|mask|modal)\b/.test(target))
            add(rel, i, 'модалка-мимо-openModal', 'своё открытие/закрытие модалки → только openModal()/closeModal() (матрёшка)');
        }
      }

      /* 13 · СКРОЛЛ В ТАБЛИЦЕ — таблицы Статс/WinRate существуют ЦЕЛИКОМ,
         скролится СТРАНИЦА (DESIGN.md). Вложенный скролл рвёт чтение: шапка
         уезжает, а колесо мыши застревает внутри таблицы.
         Внутренний скролл разрешён панелям/попапам — их сюда не берём. */
      if (/overflow(-y)?\s*:\s*(auto|scroll)/.test(line)) {
        const where = isCss ? ((blocks[i] && blocks[i].selector) || line) : (prevLine + '\n' + line);
        if (/\btbl\b|statTable|wrpr|таблиц/i.test(where))
          add(rel, i, 'скролл-в-таблице', 'внутренний скролл у таблицы → таблица целиком, скролится СТРАНИЦА');
      }
    });
  }
}

const byRule = findings.reduce((a, f) => ((a[f.rule] = (a[f.rule] || 0) + 1), a), {});
const byFile = findings.reduce((a, f) => ((a[f.file] = (a[f.file] || 0) + 1), a), {});
if (!findings.length) {
  console.log('✅ канон-линтер: чисто (' + targets().join(', ') + ')');
} else {
  console.log('❌ канон-линтер: ' + findings.length + ' находок\n');
  for (const f of findings) console.log(`  ${relative(ROOT, f.file)}:${f.line}  [${f.rule}]  ${f.text}`);
  console.log('\nПо правилам: ' + Object.entries(byRule).map(([k, v]) => `${k}=${v}`).join(' · '));
  console.log('По файлам:   ' + Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '));
}
process.exit(findings.length ? 1 : 0);
