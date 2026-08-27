// ═══════════════════════════════════════════
// Wild Rift Stats — Main Application Logic
// ═══════════════════════════════════════════

(() => {

    // Performance: lazy-load всех картинок (чемпы, предметы, руны, ранги).
    // Сначала пробегаемся по существующим <img> без атрибута loading и ставим lazy.
    // Затем — MutationObserver на новые <img>, которые добавляются динамически
    // через innerHTML в draft.js / app.js / cms.js / cybersport.js — им тоже
    // проставится lazy+async, что снимает нагрузку при первом рендере галерей.
    function _applyLazyImg(img) {
        if (!img || img.tagName !== 'IMG') return;
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    }
    function _lazyifyAllImages(root) {
        (root || document).querySelectorAll('img:not([loading])').forEach(_applyLazyImg);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ _lazyifyAllImages(); });
    } else {
        _lazyifyAllImages();
    }
    try {
        var _imgObserver = new MutationObserver(function(muts){
            for (var i = 0; i < muts.length; i++) {
                var added = muts[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (!n || n.nodeType !== 1) continue;
                    if (n.tagName === 'IMG') _applyLazyImg(n);
                    else if (n.querySelectorAll) _lazyifyAllImages(n);
                }
            }
        });
        _imgObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* observer недоступен — non-fatal */ }


    // =========================================
    // MODAL SYSTEM — unified stack + history
    // Инвариант: одна main-модалка в _modalStack = ОДНА запись в browser history.
    // Overlay-модалки сверху каждая добавляет свою запись.
    // Любое открытие/закрытие — ТОЛЬКО через openModal/closeModal.
    // =========================================
    const MODAL_IDS = ['mMask','calcMask','itemsMask','runesMask',
        'tierlistMask','sideChampsMask','itemSubModal','itemDetailModal','runeDetailModal','itemCalcMenuMask','draftMask','draftCoopMask','champPickerModal','influencerMask','chatSystemMask','tierlistMenuMask','profileSetupMask','userCardMask',
        'socialPickerMask','socialLinkConfirmMask','changesMask','cybersportMask','drafterHubMask'];

    // Модалки которые открываются ПОВЕРХ родителя (стек, родитель видим)
    var OVERLAY_MODALS = ['itemDetailModal','runeDetailModal','itemSubModal','champPickerModal','influencerMask','tierlistMask','profileSetupMask','userCardMask',
        'socialPickerMask','socialLinkConfirmMask'];

    var _modalStack = [];          // верх = последний элемент
    var _baseZIndex = 8100;  // выше сайдбара (#sidePanel z-index:8001) → модалка не уходит за сайдбар
    var _pendingBack = 0;          // счётчик programmatic history.back() — popstate их игнорит

    function _hideTooltips() {
        ['itemTooltip','runeTooltip','uiTip'].forEach(function(tid){
            var t=document.getElementById(tid); if(t) t.style.display='none';
        });
    }

    function _smoothCloseEl(el) {
        if(!el) return;
        if (!el.classList.contains('active')) {
            el.style.display = ''; el.style.zIndex = '';
            return;
        }
        if (el._closeTimer) { clearTimeout(el._closeTimer); el._closeTimer = null; }
        el.classList.remove('closing');
        el.style.zIndex = String(_baseZIndex - 1);
        el.classList.add('closing');
        var oldEl = el;
        el._closeTimer = setTimeout(function() {
            oldEl.classList.remove('active');
            oldEl.classList.remove('closing');
            oldEl.style.display = '';
            oldEl.style.zIndex = '';
            oldEl._closeTimer = null;
            if (window._resetModalVV) window._resetModalVV(oldEl);
        }, 180);
    }

    // Мгновенное скрытие (в этом же тике, до перерисовки) — без .closing-фейда.
    function _instantHideEl(el) {
        if (!el) return;
        if (el._closeTimer) { clearTimeout(el._closeTimer); el._closeTimer = null; }
        el.classList.remove('closing');
        el.classList.remove('active');
        el.style.display = '';
        el.style.zIndex = '';
        if (window._resetModalVV) window._resetModalVV(el);
    }

    function _applyStackVisuals() {
        // КОРЕНЬ вспышки при A→B: _smoothCloseEl держит dim-слой уходящей модалки 180мс
        // поверх входящей → ДВА затемнения (~0.92), потом одно спадает (0.72) = фон
        // «вспыхивает». Если что-то показываем (switching) — гасим уходящие МГНОВЕННО в
        // этом же тике (их окно и так за новым backdrop, не видно). Закрытие В ПУСТОТУ
        // (стек пуст) — оставляем плавный fade.
        var switching = _modalStack.length > 0;
        MODAL_IDS.forEach(function(id) {
            if (_modalStack.indexOf(id) !== -1) return;
            var el = document.getElementById(id);
            if (!el) return;
            if (switching) _instantHideEl(el); else _smoothCloseEl(el);
        });
        // Показываем то что в стеке (z-index по порядку)
        _modalStack.forEach(function(id, idx) {
            var el = document.getElementById(id);
            if (!el) return;
            if (el._closeTimer) { clearTimeout(el._closeTimer); el._closeTimer = null; }
            el.classList.remove('closing');
            el.classList.add('active');
            el.style.zIndex = String(_baseZIndex + (idx * 100));
            el.style.visibility = '';
        });
        if (_modalStack.length > 0) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }

    function _handleSidebarOnClose(id) {
        if (!(_sidebarModalId && id === _sidebarModalId)) return;
        document.body.classList.remove('pc-chat-mode');
        _sidebarModalId = null;
        _sidebarClearActive();
        // Инструмент закрыт → рельс снова тонкий, контент назад
        _setToolOpen(false);
        if (_pcSideMode) {
            _pcSideMode = false;
        } else {
            setTimeout(function() {
                if (_modalStack.length > 0) return;
                var stillActive = MODAL_IDS.some(function(mid) {
                    var mel = document.getElementById(mid);
                    return mel && mel.classList.contains('active');
                });
                if (!stillActive) toggleSidebar();
            }, 150);
        }
    }

    // Совместимость: closeAllModals(except) — закрывает всё кроме except (визуально).
    function closeAllModals(except) {
        _modalStack = except ? [except] : [];
        _applyStackVisuals();
    }

    // =========================================
    // LAZY-LOAD тяжёлых фич (cybersport, кооп-драфт)
    // Снимаем их парсинг/выполнение с критического старта (domReady).
    // Грузим по требованию (открытие) + draft фоном для залогиненных.
    // =========================================
    var _lazyScripts = {};
    function _lazyScript(src) {
        if (_lazyScripts[src]) return _lazyScripts[src];
        _lazyScripts[src] = new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = resolve;
            s.onerror = function() { _lazyScripts[src] = null; reject(new Error('lazy load fail: ' + src)); };
            document.head.appendChild(s);
        });
        return _lazyScripts[src];
    }
    window._lazyScript = _lazyScript;

    // Заглушка: пока реальный скрипт не загружен — подгружаем его и вызываем
    // настоящую функцию (которая перезапишет заглушку). Аргументы пробрасываются.
    function _lazyStub(src, name) {
        var stub = function() {
            var args = arguments;
            _lazyScript(src).then(function() {
                var fn = window[name];
                if (typeof fn === 'function' && !fn.__lazyStub) fn.apply(null, args);
            }).catch(function(e) { console.warn('[lazy]', e); });
        };
        stub.__lazyStub = true;
        window[name] = stub;
    }
    _lazyStub('cybersport.js', 'openCybersport');
    _lazyStub('cybersport.js', 'openCybersportTournament');
    _lazyStub('draft.js', 'openDraftCoop');

    // Редактор позиций (админ): грузим лениво по клику в меню.
    window._openLayoutEditor = function() {
        _lazyScript('layout-editor.js').then(function() {
            if (window.LayoutEditor) window.LayoutEditor.activate();
        }).catch(function(e) { console.warn('[lazy] layout-editor', e); });
    };

    // Фоновая догрузка кооп-драфта для залогиненных (чтобы авто-редирект
    // капитанов работал), но ПОСЛЕ интерактива — вне критического старта.
    function _bgLoadDraft() {
        try {
            if (firebase && firebase.auth && firebase.auth().currentUser) _lazyScript('draft.js');
        } catch (e) {}
    }
    function _scheduleBgDraft() {
        if ('requestIdleCallback' in window) requestIdleCallback(_bgLoadDraft, { timeout: 4000 });
        else setTimeout(_bgLoadDraft, 2500);
        try { firebase.auth().onAuthStateChanged(function(u) { if (u) _bgLoadDraft(); }); } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _scheduleBgDraft);
    else _scheduleBgDraft();

    function openModal(id) {
        _hideTooltips();
        var el = document.getElementById(id);
        if (!el) return;

        var top = _modalStack.length > 0 ? _modalStack[_modalStack.length - 1] : null;
        // Защита от двойных кликов
        if (top === id) return;

        var isOverlay = OVERLAY_MODALS.indexOf(id) !== -1;

        if (isOverlay) {
            // Стекаем поверх
            _modalStack = _modalStack.filter(function(m){ return m !== id; });
            _modalStack.push(id);
            _applyStackVisuals();
            if (history && history.pushState) history.pushState({ modal: id }, '');
        } else {
            // Main-модалка: заменяет ВЕСЬ стек
            var hadAny = _modalStack.length > 0;
            _modalStack = [id];
            _applyStackVisuals();
            if (history) {
                // Уже была модалка → REPLACE текущую history-запись (без race).
                // Иначе → PUSH (вход с main-экрана).
                if (hadAny && history.replaceState) {
                    history.replaceState({ modal: id }, '');
                } else if (history.pushState) {
                    history.pushState({ modal: id }, '');
                }
            }
        }
    }
    window.openModal = openModal;

    // skipSidebar=true — для внутренних переключений sidebar-кода
    function closeModal(id, skipSidebar) {
        var idx = _modalStack.indexOf(id);
        if (idx === -1) {
            // Не в стеке — визуальный сброс на всякий случай и выход
            var el0 = document.getElementById(id);
            if (el0) _smoothCloseEl(el0);
            return;
        }

        // Сколько шагов back() надо сделать (если закрыли НЕ верхний — детей тоже)
        var stepsBack = _modalStack.length - idx;

        // Обрезаем стек до закрываемого (НЕвключительно)
        _modalStack = _modalStack.slice(0, idx);
        _applyStackVisuals();

        if (!skipSidebar) _handleSidebarOnClose(id);

        // Программный back: помечаем popstate-handler чтобы он не закрывал ещё одну модалку.
        // skipSidebar=true: переключение sidebar-модалок, history менять не нужно.
        if (!skipSidebar && history && history.back && stepsBack > 0) {
            _pendingBack += stepsBack;
            for (var k = 0; k < stepsBack; k++) history.back();
        }
    }
    window.closeModal = closeModal;

    // Back-button / Android back / системный свайп
    window.addEventListener('popstate', function() {
        if (_pendingBack > 0) {
            // Свой собственный back() из closeModal — игнорим
            _pendingBack--;
            return;
        }
        // Юзер реально нажал «Назад»
        if (_modalStack.length > 0) {
            var topId = _modalStack[_modalStack.length - 1];
            // Закрываем визуально БЕЗ history.back() (его уже сделал юзер)
            _modalStack.pop();
            _applyStackVisuals();
            _handleSidebarOnClose(topId);
        }
    });

    // ПК: Esc закрывает ТОЛЬКО верхнюю модалку стопки (закон матрёшки).
    // Не трогаем поля ввода и события, уже обработанные своим хендлером.
    // data-no-esc на модалке = «клетка» (выхода нет, напр. активный кооп-драфт).
    window.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        if (_modalStack.length === 0) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        var topId = _modalStack[_modalStack.length - 1];
        var topEl = document.getElementById(topId);
        if (topEl && topEl.hasAttribute('data-no-esc')) return;
        closeModal(topId);
    });

    // ── Global fullscreen spinner ──
    function showGlobalSpinner() {
        var el = document.getElementById('globalLoadingOverlay');
        if (el) el.classList.add('active');
    }
    function hideGlobalSpinner() {
        var el = document.getElementById('globalLoadingOverlay');
        if (el) el.classList.remove('active');
    }

    // WR level scaling helpers (15 levels)
    function wrScaleByLevel(minVal, maxVal, lvl) {
        return Math.round(minVal + (maxVal - minVal) * (lvl - 1) / 14);
    }
    // ═══════════════════════════════════════════════════════════════
    // 📊 ЛИСТ 1: Основные данные чемпионов (статы, роли, рост)
    // Чтобы поменять: File → Share → Publish to web → выбери Лист 1 → TSV
    // ═══════════════════════════════════════════════════════════════
    const G_URL = window.G_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnqVwUluQiuho1Wj6A3tZRvDJsLlyAZYmg0soWy4EJ_Un00P8e3Y2EAo3Iv6KvMm5HPwce_0AnzPfb/pub?gid=0&single=true&output=tsv';

    // ═══════════════════════════════════════════════════════════════
    // 🔄 Патч-ноты теперь управляются через Firestore (коллекция patchnotes)
    // Админ добавляет/редактирует/удаляет через кнопку 📝 Патч-нот на карточке чемпиона
    // ═══════════════════════════════════════════════════════════════
    const PATCH_URL = null;


    // Map champion names to Data Dragon keys
    // Map champion names to Data Dragon keys (WR shortened names supported)
    function champKey(n) {
        const m = {
            'Aurelion Sol':'AurelionSol','Dr. Mundo':'DrMundo','Jarvan IV':'JarvanIV',
            'Lee Sin':'LeeSin','Master Yi':'MasterYi','Miss Fortune':'MissFortune',
            'Twisted Fate':'TwistedFate','Xin Zhao':'XinZhao','Nunu & Willump':'Nunu',
            "Cho'Gath":'Chogath',"Vel'Koz":'Velkoz',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Kog'Maw":'KogMaw',
            "K'Sante":'KSante',"Rek'Sai":'RekSai','Tahm Kench':'TahmKench','Wukong':'MonkeyKing',
            // Shortened WR names
            'M.Fortune':'MissFortune','Tw. Fate':'TwistedFate','Au. Sol':'AurelionSol',
            'Jarvan':'JarvanIV','XinZhao':'XinZhao','KhaZix':'Khazix','KogMaw':'KogMaw','Kogmaw':'KogMaw','Ksante':'KSante',
            'KaiSa':'Kaisa','Morde':'Mordekaiser','Seraph':'Seraphine',
            'Fiddle':'Fiddlesticks','Fiddles':'Fiddlesticks','FiddleSticks':'Fiddlesticks','Fiddlesticks':'Fiddlesticks','Trynda':'Tryndamere','Trynd':'Tryndamere','Trinda':'Tryndamere','Heimer':'Heimerdinger',
            'Mundo':'DrMundo','Nunu':'Nunu',
        };
        return m[n] || n.replace(/[\s\'\.\#&]/g,'');
    }
    const DD_URL = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
    var _sp={'Norra':'image/norra.png','Mel':'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Mel_0.jpg'};
    function champIcon(name){ return _sp[name] || (DD_URL + champKey(name) + '.png'); }
    // Fallback URLs for WR-exclusive champs
    var _spFallback = {
        'Norra':['https://www.wildriftfire.com/images/champions/norra.png','https://cdn.communitydragon.org/latest/champion/norra/square','https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Norra.png'],
        'Mel':['https://www.wildriftfire.com/images/champions/mel.png']
    };
    /* Э1.3: экспонирован — строка таблицы теперь HTML, и onerror в атрибуте
       ищет обработчик в window, локальную функцию коробки он не видит. */
    window._champImgError = function(img, name) { champImgError(img, name); };
    function champImgError(img, name) {
        if(!img._fallbackIdx) img._fallbackIdx = 0;
        var fb = _spFallback[name];
        if(fb && img._fallbackIdx < fb.length) {
            img.src = fb[img._fallbackIdx++];
        } else {
            img.style.cssText = 'width:100%;aspect-ratio:1;background:linear-gradient(135deg,var(--sel-fill),var(--sel-glow-sub));border-radius:8px;display:block;';
            img.alt = name;
        }
    }

    let raw = [];
    let patchMap = window.patchMap = {};

    // ═══ Column settings для таблицы STATS ═══
    const STATS_COL_DEFS = [
        { key:'ad',    label:'AD',   icon:'🗡', iconClass:'stat-icon-ad' },
        { key:'hp',    label:'HP',   icon:'✚', iconClass:'stat-icon-hp' },
        { key:'mana',  label:'Mana', labelShort:'MN', icon:'💧', iconClass:'stat-icon-mana' },
        { key:'armor', label:'AR',   icon:'🛡', iconClass:'stat-icon-armor' },
        { key:'mrez',  label:'MR',   icon:'✦', iconClass:'stat-icon-mr' },
        { key:'range', label:'RNG',  icon:'🏹', iconClass:'stat-icon-range' },
        { key:'as',    label:'AS',   icon:'⚡', iconClass:'stat-icon-as',    defHidden:true },
        { key:'ms',    label:'MS',   icon:'👟', iconClass:'stat-icon-ms',    defHidden:true },
        { key:'hpreg', label:'HP5',  icon:'💗', iconClass:'stat-icon-hpreg', defHidden:true },
        { key:'mpreg', label:'MP5',  icon:'🔷', iconClass:'stat-icon-mpreg', defHidden:true },
    ];
    function getStatsCols(){
        var cfg = window._colSettings ? window._colSettings.load('stats', STATS_COL_DEFS) : { order: STATS_COL_DEFS.map(function(d){return d.key;}), hidden: [] };
        var hiddenSet = new Set(cfg.hidden);
        return cfg.order
            .map(function(k){ return STATS_COL_DEFS.find(function(d){ return d.key === k; }); })
            .filter(function(d){ return d && !hiddenSet.has(d.key); });
    }
    /* ★ Э1.3 · ШАПКА СТАТС — РАЗМЕТКА ЭТАЛОНА lab-main (viewStats).
       Было: инлайн `onclick="doSort('key')"` в каждом <th> и отдельный <span id="ar-KEY">,
       который потом искали по id и красили инлайн-стилем (см. renderFull).
       Стало, как в эталоне: <th data-sort="key" class="sorted"> + <span class="arr">.
       Стрелка живёт в разметке шапки, отдельные id-шки на неё больше не нужны;
       клик — один делегированный слушатель (см. wireStatsSort), инлайн-обработчиков нет. */
    function buildStatsHeader(){
        var thead = document.getElementById('statThead');
        if(!thead) return;
        var cols = getStatsCols();
        var html = '<tr><th><span class="th-champ-label">Champions</span></th>';
        cols.forEach(function(c){
            var label = c.key === 'mana'
                ? '<span class="mana-label-full">Mana</span><span class="mana-label-short">MN</span>'
                : c.label;
            var cls = (c.desktopOnly ? 'col-range' : '') + (c.key === sK ? ' sorted' : '');
            html += '<th data-sort="' + c.key + '" data-short="' + c.label + '" class="' + cls.trim() + '">' +
                '<span class="stat-icon ' + c.iconClass + '">' + c.icon + '</span>' +
                label +
                '<span class="arr">' + (c.key === sK ? (sD === 'desc' ? '▼' : '▲') : '⇅') + '</span>' +
                '</th>';
        });
        html += '</tr>';
        labMorph(thead, html);      /* точечно: меняется класс и стрелка, не вся шапка */
        wireStatsSort();
        // Много столбцов (юзер включил доп-статы) → таблица растёт, правая карточка убирается чтоб не мешать
        try { document.body.setAttribute('data-widestats', cols.length > 6 ? 'on' : 'off'); } catch(e){}
    }
    /* Клик по шапке — ОДИН делегированный слушатель на весь <thead>.
       Так шапку можно свободно пересобирать: слушатель живёт выше и не теряется
       (ГОЧА lab-morph — узлы переживают ре-рендер, вешаем под флагом). */
    function wireStatsSort(){
        var thead = document.getElementById('statThead');
        if (!thead || thead.__wired) return;
        thead.__wired = 1;
        thead.addEventListener('click', function(e){
            var th = e.target.closest('th[data-sort]');
            if (th) doSort(th.getAttribute('data-sort'));
        });
    }
    window.openStatsColSettings = function(){
        window._colSettings.open('stats', STATS_COL_DEFS, 'Настройка столбцов STATS', function(){
            buildStatsHeader();
            renderFull();
        });
    };

    // ═══ MATCHUP DATA (localStorage) ═══
    // strongVs = против кого силён, weakVs = против кого слаб, combos = комбо
    function getMatchups() {
        try { return JSON.parse(localStorage.getItem('matchups') || '{}'); } catch(e) { return {}; }
    }
    function saveMatchups(data) {
        try { localStorage.setItem('matchups', JSON.stringify(data)); } catch(e) {}
    }
    function _ensureChamp(m, name) { if(!m[name]) m[name] = {strongVs:[], weakVs:[], combos:[]}; return m; }
    function getStrongVs(name) { var m = getMatchups(); return (m[name] && m[name].strongVs) || (m[name] && m[name].counters) || []; }
    function getWeakVs(name) { var m = getMatchups(); return (m[name] && m[name].weakVs) || []; }
    function getCombos(name) { var m = getMatchups(); return (m[name] && m[name].combos) || []; }
    function addTo(name, key, val) {
        var m = getMatchups();
        m = _ensureChamp(m, name);
        m = _ensureChamp(m, val);
        if((m[name][key]||[]).indexOf(val) === -1) { if(!m[name][key]) m[name][key]=[]; m[name][key].push(val); }
        // Bidirectional: strongVs↔weakVs, combos↔combos
        var rk = key==='strongVs' ? 'weakVs' : key==='weakVs' ? 'strongVs' : 'combos';
        if((m[val][rk]||[]).indexOf(name) === -1) { if(!m[val][rk]) m[val][rk]=[]; m[val][rk].push(name); }
        saveMatchups(m);
    }
    function removeFrom(name, key, val) {
        var m = getMatchups();
        if(m[name] && m[name][key]) m[name][key] = m[name][key].filter(function(c){ return c !== val; });
        // Bidirectional remove
        var rk = key==='strongVs' ? 'weakVs' : key==='weakVs' ? 'strongVs' : 'combos';
        if(m[val] && m[val][rk]) m[val][rk] = m[val][rk].filter(function(c){ return c !== name; });
        saveMatchups(m);
    }
    // Исключения для авто-чемпов из категорий
    function getMatchupExclusions() {
        try { return JSON.parse(localStorage.getItem('matchup_exclusions') || '{}'); } catch(e) { return {}; }
    }
    function saveMatchupExclusions(d) {
        try { localStorage.setItem('matchup_exclusions', JSON.stringify(d)); } catch(e) {}
    }
    function addExclusion(champName, key, val) {
        var d = getMatchupExclusions();
        if (!d[champName]) d[champName] = {};
        if (!d[champName][key]) d[champName][key] = [];
        if (d[champName][key].indexOf(val) === -1) d[champName][key].push(val);
        saveMatchupExclusions(d);
    }
    function isExcluded(champName, key, val) {
        var d = getMatchupExclusions();
        return d[champName] && d[champName][key] && d[champName][key].indexOf(val) !== -1;
    } // {champName: {patch, change, type}}
    let selected = new Set();
    let pinned = new Set();
    let lvl = 10;
    let sK = 'ad';

    
    let sD = 'desc';
    let colFocus = false;


    const roleIcons = {
        Top: 'image/role_top.webp',
        Jungle: 'image/role_jungle.webp',
        Mid: 'image/role_mid.webp',
        ADC: 'image/role_adc.webp',
        Support: 'image/role_support.webp'
    };

    async function start() {
        if(!G_URL){
            alert('G_URL is empty. Set the published Google Sheet URL in the code (const G_URL = ...).');
            return;
        }

        try {
            const _saved = localStorage.getItem('p');
            if(_saved) pinned = new Set(JSON.parse(_saved));
        } catch(e) { /* incognito or storage disabled */ }
        // Show skeleton loader overlay (don't touch the real table)
        const skEl = document.getElementById('skeletonOverlay');
        if(skEl) skEl.style.display = 'block';
        document.getElementById('statTable').style.visibility = 'hidden';

        // Источник базовых статов: сначала файл робота (data-pipeline/base-stats.json,
        // обновляется автоматически каждый день), при сбое — запасная Google-таблица (G_URL).
        let rows;
        try {
            const res = await fetch('data-pipeline/base-stats.json', { cache: 'no-cache' });
            if(!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            rows = json.champions;
            if(!Array.isArray(rows) || rows.length < 100) throw new Error('base-stats.json пуст или повреждён');
            console.log('Champions from base-stats.json:', rows.length, '(DDragon', json.ddragonVersion + ')');
        } catch(jsonErr) {
            console.warn('base-stats.json недоступен, беру Google-таблицу:', jsonErr.message);
            try {
                const tsv = await fetch(G_URL).then(function(r){ return r.text(); });
                if(tsv.trim().startsWith('<!') || tsv.trim().startsWith('<html')) {
                    throw new Error('Google Sheet вернул HTML вместо TSV — лист не опубликован!');
                }
                const lines = tsv.trim().split('\n');
                const heads = lines[0].split('\t').map(h => h.trim());
                rows = lines.slice(1).map(l => {
                    const c = l.split('\t'); const o = {};
                    heads.forEach((h, i) => o[h] = c[i]?.trim());
                    return o;
                });
            } catch(fetchErr) {
                console.error('Fetch failed:', fetchErr);
                const skEl = document.getElementById('skeletonOverlay');
                if(skEl) skEl.style.display = 'none';
                document.getElementById('statTable').style.visibility = 'visible';
                document.getElementById('statBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">'+t('Ошибка: ') + (fetchErr.message || t('Не удалось загрузить данные')) + '</td></tr>';
                return;
            }
        }

        raw = rows.map(o => {
            return {
                name: o["Champion"],
                ad_b: +o["AD_Base"], ad_g: +o["AD_Growth"],
                hp_b: +o["HP_Base"], hp_g: +o["HP_Growth"],
                mn_b: +o["Mana_Base"], mn_g: +o["Mana_Growth"],
                ar_b: +o["Armor_Base"], ar_g: +o["Armor_Growth"],
                mr_b: +o["MR_Base"], mr_g: +o["MR_Growth"],
                rng_b: +o["Range_Base"] || 0, rng_g: +o["Range_Growth"] || 0,
                as_b: +o["AS_Base"] || 0, as_g: +o["AS_Growth"] || 0,
                ms_b: +o["MS_Base"] || 0,
                hpreg_b: +o["HPRegen_Base"] || 0, hpreg_g: +o["HPRegen_Growth"] || 0,
                mpreg_b: +o["MPRegen_Base"] || 0, mpreg_g: +o["MPRegen_Growth"] || 0,
                res: o["Resource"],
                is: {
                    Top: +o["Is_Top"]==1, 
                    Jungle: +o["Is_Jungle"]==1, 
                    Mid: +o["Is_Mid"]==1, 
                    ADC: +o["Is_Adc"]==1, 
                    Support: +o["Is_Support"]==1 
                }
            };
        }).filter(x => x.name);
        console.log('Champions loaded:', raw.length);
        // Expose for draft.js and other external modules
        try { window._champsRaw = raw; window._champIcon = champIcon; window._champKey = champKey; document.dispatchEvent(new CustomEvent('champsLoaded')); } catch(e){}
        
        // Default: ADC only on first load (unless saved state exists)
        const _hasSaved = (() => { try { return !!localStorage.getItem('sel'); } catch(e){ return false; } })();
        if(_hasSaved) {
            try { const s = localStorage.getItem('sel'); if(s) selected = new Set(JSON.parse(s)); else selected = new Set(raw.filter(x=>x.is.ADC).map(x=>x.name)); } catch(e) { selected = new Set(raw.filter(x=>x.is.ADC).map(x=>x.name)); }
        } else {
            selected = new Set(raw.filter(x => x.is.ADC).map(x => x.name));
        }
        initApp();
        createRuler();
        render();
        try { drawM(); } catch(e){}
        // Hide skeleton, show real table
        const skEl2 = document.getElementById('skeletonOverlay');
        if(skEl2) skEl2.style.display = 'none';
        document.getElementById('statTable').style.visibility = 'visible';
    }

    function createRuler() {
        const ruler = document.getElementById('ruler');
        if(!ruler) return;
        ruler.innerHTML = '';
        for(let i = 1; i <= 15; i++) {
            const span = document.createElement('span');
            span.innerText = i;
            span.id = 'lvl-' + i;
            span.classList.add('lvl-pill');
            span.setAttribute('role','button');
            span.tabIndex = 0;
            span.dataset.lvl = i;
            span.onclick = () => setLevel(i);
            span.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); span.click(); } };
            ruler.appendChild(span);
        }
        const hint = document.createElement('span');
        hint.className = 'lvl-chiphint';
        hint.textContent = 'зажми и тяни →';
        ruler.appendChild(hint);
        wireChipdrag(ruler);
        updateRuler();
    }
    // ЕДИНЫЙ ИСТОЧНИК уровня — чипы рулят напрямую (слайдер убран, без крюка)
    window.setLevel = function(n) {
        lvl = Math.max(1, Math.min(15, n | 0));
        window._curLvl = lvl;
        const lbl = document.getElementById('lvlLabel'); if(lbl) lbl.textContent = lvl;
        updateRuler();
        renderUpdate();
        try { if(window.ChampSidePanel && window.ChampSidePanel.current && window.ChampSidePanel.current()) window.ChampSidePanel.render(window.ChampSidePanel.current()); } catch(e){}
    };
    // chipdrag: зажал и тянешь по чипам (мышь + тач)
    function wireChipdrag(ruler) {
        let dragging = false;
        function pick(e) {
            const cx = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const cy = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const el = document.elementFromPoint(cx, cy);
            const pill = el && el.closest ? el.closest('.lvl-pill') : null;
            if(pill && pill.dataset.lvl) setLevel(+pill.dataset.lvl);
        }
        ruler.addEventListener('pointerdown', (e) => { dragging = true; try{ruler.setPointerCapture(e.pointerId);}catch(_){} pick(e); });
        ruler.addEventListener('pointermove', (e) => { if(dragging) pick(e); });
        window.addEventListener('pointerup', () => { dragging = false; });
    }

    function updateRuler() {
        // как в лабе: подсвечен ТОЛЬКО текущий чип (не прогресс-бар)
        for(let i = 1; i <= 15; i++) {
            const el = document.getElementById('lvl-' + i);
            if(el) el.classList.toggle('on', i === lvl);
        }
    }

    // Compute data array for current level + sort
    function computeData() {
        const f = (b, g) => b + (lvl - 1) * g;
        const fAS = (b, gp) => b * (1 + (gp / 100) * (lvl - 1));   // AS растёт в процентах за уровень
        const data = raw.filter(x => selected.has(x.name)).map(x => ({
            name: x.name, res: x.res,
            ad:   f(x.ad_b, x.ad_g),
            hp:   f(x.hp_b, x.hp_g),
            mana: f(x.mn_b, x.mn_g),
            armor:f(x.ar_b, x.ar_g),
            mrez: f(x.mr_b, x.mr_g),
            range:f(x.rng_b, x.rng_g),
            as:   fAS(x.as_b, x.as_g),
            ms:   x.ms_b,
            hpreg:f(x.hpreg_b, x.hpreg_g),
            mpreg:f(x.mpreg_b, x.mpreg_g),
            g: {ad:x.ad_g, hp:x.hp_g, mana:x.mn_g, armor:x.ar_g, mrez:x.mr_g, range:x.rng_g, as:x.as_g, ms:0, hpreg:x.hpreg_g, mpreg:x.mpreg_g}
        })).sort((a,b) => {
            return sD === 'desc' ? b[sK] - a[sK] : a[sK] - b[sK];
        });
        const getT = (k) => {
            const s = data.map(i => i[k]).sort((a,b) => a-b);
            return { s: s[Math.floor(s.length*0.95)], a: s[Math.floor(s.length*0.8)], c: s[Math.floor(s.length*0.2)] };
        };
        const thres = { ad:getT('ad'), hp:getT('hp'), mana:getT('mana'), armor:getT('armor'), mrez:getT('mrez') };
        return { data, thres };
    }

    // Форматирование значения ячейки по столбцу (десятичные для AS/реген, NRG для энергии)
    function fmtStatVal(k, v, item){
        if(k === 'mana'){ if(item.res === 'Energy') return 'NRG'; if(v === 0) return '0'; return Math.round(v); }
        if(k === 'as') return (Math.round(v * 1000) / 1000).toFixed(3);     // 0.651
        if(k === 'hpreg' || k === 'mpreg') return Math.round(v * 10) / 10;  // 6 / 6.5
        return Math.round(v);                                               // ad/hp/armor/mrez/range/ms
    }

    // Global patch tooltip function
    window.showGlobalPatchTip = function(e, pInfo, el) {
        e.stopPropagation();
        var old = document.getElementById('patchTip');
        if(old) old.remove();
        var tip = document.createElement('div');
        tip.id = 'patchTip';
        tip.className = 'patch-tooltip glass';
        var typeLabel = pInfo.type === 'buff' ? t('🟢 БАФФ') : pInfo.type === 'adjust' ? t('🟡 КОРРЕКТИРОВКА') : t('🔴 НЕРФ');
        tip.innerHTML = '<div style="font-weight:900;margin-bottom:4px;">' + typeLabel + ' <span style="color:rgba(255,255,255,0.4);font-weight:600;">Patch ' + pInfo.patch + '</span></div><div style="font-size:11px;line-height:1.4;color:rgba(255,255,255,0.8);">' + pInfo.change + '</div>';
        var rect = el.getBoundingClientRect();
        tip.style.visibility = 'hidden';
        document.body.appendChild(tip);
        var tipRect = tip.getBoundingClientRect();
        var tipW = tipRect.width || 260;
        var tipH = tipRect.height || 80;
        var left = Math.max(8, Math.min(rect.left, window.innerWidth - tipW - 8));
        var top = rect.bottom + 6;
        if (top + tipH > window.innerHeight - 8) top = Math.max(8, rect.top - tipH - 6);
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
        tip.style.visibility = '';
        setTimeout(function() {
            document.addEventListener('click', function rm() { var t=document.getElementById('patchTip'); if(t) t.remove(); document.removeEventListener('click', rm); }, {once:true});
        }, 50);
    };

    // FAST UPDATE — only rewrites numbers + tier classes, no DOM rebuild
    // Called on level slider change
    function renderUpdate() {
        const table = document.getElementById('statTable');
        table.classList.toggle('focus-mode', colFocus);
        const cols = getStatsCols();
        buildStatsHeader();   /* Э1.3: стрелки/активная колонка — в разметке шапки, не по id */
        const { data } = computeData();
        const rows = document.querySelectorAll('#statBody tr');
        // If row count changed (e.g. champion removed) — fall back to full render
        if(rows.length !== data.length) { renderFull(); return; }
        data.forEach((item, idx) => {
            const tr = rows[idx];
            const numEl = tr.querySelector('.f-num');
            if(numEl) numEl.textContent = idx + 1;
            const tds = tr.querySelectorAll('td:not(:first-child)');
            cols.forEach((c, ki) => {
                const td = tds[ki];
                if(!td) return;
                const k = c.key;
                const v = item[k];
                td.className = (k===sK ? 'active-col ' : '') + 's-' + k;   // цвет по СТОЛБЦУ
                td.textContent = fmtStatVal(k, v, item);
            });
        });
    }

    // FULL RENDER — rebuilds DOM from scratch
    // Called on champion add/remove, sort change, pin change
    function renderFull() {
        const body = document.getElementById('statBody');
        const table = document.getElementById('statTable');
        table.classList.toggle('focus-mode', colFocus);
        const colsH = getStatsCols();
        /* ★ Э1.3: покраска стрелок по id (#ar-KEY + инлайн color:#e74c3c) УБРАНА.
           Стрелка и активная колонка живут прямо в разметке шапки эталона
           (<th class="sorted"><span class="arr">), цвет — из канона в CSS.
           Пересобираем шапку — labMorph тронет только стрелку и класс. */
        buildStatsHeader();
        const { data } = computeData();
        /* ★★ Э1.3 шаг 2 · ТОЧЕЧНЫЙ РЕ-РЕНДЕР (механика эталона lab-main).
           БЫЛО: body.innerHTML = '' и пересборка КАЖДОЙ строки через createElement
           с пятью addEventListener на строку. Счётчик ловил это как 0/308 —
           сортировка и смена уровня пересоздавали таблицу целиком.
           СТАЛО: строки собираются в HTML и отдаются labMorph — он трогает только
           изменившееся. data-key на <tr> = имя чемпа (якорь: при смене порядка узлы
           переиспользуются, а не рубятся сдвигом соседей). */
        labMorph(body, data.map((item, idx) => statRowHtml(item, idx, colsH)).join(''));
        wireStatsRows();
    }

    /* Слушатели строк — ОДИН делегированный набор на #statBody, вешается один раз.
       ГОЧА lab-morph: узлы теперь переживают ре-рендер, поэтому addEventListener
       на каждую строку копился бы при каждом рендере. mouseover/mouseout, а не
       mouseenter/mouseleave — последние не всплывают и делегировать их нельзя. */
    function wireStatsRows() {
        const body = document.getElementById('statBody');
        if (!body || body.__wired) return;
        body.__wired = 1;

        body.addEventListener('click', (e) => {
            const x = e.target.closest('.f-x');
            if (x) {                                   /* ✕ — убрать чемпа из таблицы */
                e.stopPropagation();
                const row = x.closest('tr[data-name]');
                if (row) removeC(row.getAttribute('data-name'));
                return;
            }
            const dot = e.target.closest('.patch-dot');
            if (dot) {
                e.stopPropagation();
                const row = dot.closest('tr[data-name]');
                const pi = row && patchMap[row.getAttribute('data-name')];
                if (pi) showGlobalPatchTip(e, pi, dot);
                return;
            }
            const tr = e.target.closest('tr[data-name]');
            if (!tr) return;
            tr.classList.add('row-flash');
            setTimeout(() => tr.classList.remove('row-flash'), 400);
        });

        body.addEventListener('mouseover', (e) => {
            const dot = e.target.closest('.patch-dot');
            if (dot) {
                const row = dot.closest('tr[data-name]');
                const pi = row && patchMap[row.getAttribute('data-name')];
                if (pi) showGlobalPatchTip(e, pi, dot);
                return;
            }
            /* тултип роста «+N за уровень»: значение лежит на самой ячейке (data-g) */
            const td = e.target.closest('td[data-g]');
            if (td && td.getAttribute('data-g') !== '') showT(e, +td.getAttribute('data-g'));
        });
        body.addEventListener('mousemove', (e) => {
            if (e.target.closest('td[data-g]')) moveT(e);
        });
        body.addEventListener('mouseout', (e) => {
            if (e.target.closest('.patch-dot')) {
                const tip = document.getElementById('patchTip'); if (tip) tip.remove();
            }
            if (e.target.closest('td[data-g]')) hideT();
        });
    }

    // Сборка ОДНОЙ строки таблицы. Вынесена из renderFull, чтобы добавление/удаление
    // чемпа могло вставить/убрать одну <tr> вместо пересборки всего tbody.
    /* ★ Э1.3 шаг 2 · СТРОКА ТАБЛИЦЫ — СОБРАНА КАК В ЭТАЛОНЕ lab-main (statRowHtml).
       Было: 60 строк document.createElement + 5 addEventListener НА КАЖДУЮ строку
       (клик по строке, ✕, ховер патч-точки, клик патч-точки, тултип роста ×N ячеек).
       При 137 чемпах это сотни живых слушателей, и все они умирали и создавались
       заново на каждый рендер.
       Стало: функция возвращает СТРОКУ HTML (как в эталоне), слушатели — одни
       делегированные на #statBody (см. wireStatsRows).
       Данные для тултипа роста едут на самой ячейке в data-g — иначе
       делегированный обработчик не знал бы, чей рост показывать. */
    /* Свой esc в ЭТОЙ коробке: app.js = несколько изолированных IIFE, esc из соседней
       тут не виден (корень cross-scope ReferenceError, память project_appjs_iife_scopes). */
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function statRowHtml(item, idx, colsH) {
        const pInfo = patchMap[item.name];
        const cells = colsH.map(c => {
            const k = c.key;
            const g = (item.g && item.g[k] != null) ? item.g[k] : '';
            return '<td class="' + (k === sK ? 'active-col ' : '') + 's-' + k + '"' +
                ' data-g="' + esc(String(g)) + '">' + esc(fmtStatVal(k, item[k], item)) + '</td>';
        }).join('');

        return '<tr data-key="' + esc(item.name) + '" data-name="' + esc(item.name) + '">' +
            '<td><div class="f-name-cell">' +
                '<span class="f-num">' + (idx + 1) + '</span>' +
                '<button class="f-x" type="button" title="' + esc(t('Убрать из таблицы')) + '">✕</button>' +
                '<div class="f-portwrap">' +
                    '<img class="f-port" alt="" loading="lazy" decoding="async" src="' + esc(champIcon(item.name)) + '"' +
                    ' onerror="window._champImgError && window._champImgError(this, this.dataset.ch)" data-ch="' + esc(item.name) + '">' +
                    (pInfo
                        ? '<div class="patch-dot ' + esc(pInfo.type) + '" data-patch="' + esc(pInfo.patch) +
                          '" data-change="' + esc(pInfo.change) + '" data-type="' + esc(pInfo.type) + '"></div>'
                        : '') +
                '</div>' +
                '<span class="f-cname">' + esc(item.name) + '</span>' +
            '</div></td>' + cells + '</tr>';
    }

    // Перенумеровать колонку «#» после вставки/удаления строки.
    function renumberStatRows() {
        var rows = document.querySelectorAll('#statBody tr');
        for (var i = 0; i < rows.length; i++) {
            var n = rows[i].querySelector('.f-num');
            if (n) n.textContent = i + 1;
        }
    }

    // ТОЧЕЧНО: чемп добавлен/убран → вставляем или убираем ОДНУ <tr>,
    // вместо renderFull(), который пересобирал весь tbody со всеми слушателями.
    /* ★ Э1.3 шаг 2: своя вставка/удаление одной <tr> больше НЕ НУЖНА.
       Раньше тут вручную искали строку, создавали её через buildStatRow и вставляли
       по индексу — потому что renderFull пересобирал весь tbody и был слишком дорог.
       Теперь renderFull идёт через labMorph: он сам увидит, что изменилась одна
       строка, и тронет только её. Отдельный путь = второй источник правды. */
    function applyChampRow(name) { renderFull(); }

    // render() = full rebuild (used everywhere except level slider)
    function render() { renderFull(); }

    
    // Реальный WR чемпиона из WR_DATA (ранг 'чалик'), лучший среди его ролей. null если нет данных.
    function wrLookup(name){
        try {
            var rd = ((window.WR_DATA || WR_DATA) || {})['чалик'] || {};
            var norm = function(s){ return (s||'').toString().toLowerCase().replace(/[^a-zа-яё0-9]/gi,''); };
            var key = norm(name), best = null;
            ['top','jungle','mid','adc','support'].forEach(function(r){
                (rd[r] || []).forEach(function(o){
                    if(o && norm(o.name) === key){ var v = +o.wr; if(!isNaN(v) && (best === null || v > best)) best = v; }
                });
            });
            return best;
        } catch(e){ return null; }
    }

    // Фильтр по роли для inline-панели выборки (null = все роли)
    let _statsRoleFilter = null;

    // Remove champion from table (only from selection, NOT from data)
    // Рендерит грид выборки в указанный контейнер. Одна логика для модалки (#mGrid)
    // и для inline-панели Статов (#statsChampGrid) — без дублирования.
    function drawMInto(grid, q, roleFilter) {
        if (!grid) return;
        grid.innerHTML = "";

        const roles = ["Top","Jungle","Mid","ADC","Support"]
            .filter(r => !roleFilter || r === roleFilter);

        roles.forEach(role => {
            const allChampsInRole = raw.filter(x => x.is[role]);
            const champs = (q
                ? allChampsInRole.filter(x => x.name.toLowerCase().includes(q))
                : allChampsInRole
            ).slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

            if (q && champs.length === 0) return;

            const container = document.createElement('div');
            container.className = 'm-role-container';
            container.dataset.role = role;   // якорь для фильтрации без пересборки

            const _onCnt = allChampsInRole.filter(x => selected.has(x.name)).length;
            const isAll = allChampsInRole.length > 0 && _onCnt === allChampsInRole.length;
            const roleDiv = document.createElement('div');
            roleDiv.className = 'm-role ' + (isAll ? 'on' : '');
            roleDiv.innerHTML = '<img loading="lazy" decoding="async" src="' + roleIcons[role] + '" alt="' + role + '"><span class="m-role-count">' + _onCnt + '/' + allChampsInRole.length + '</span>';
            roleDiv.onclick = () => roleT(role, isAll);
            container.appendChild(roleDiv);

            // 2-column inner grid
            const champGrid = document.createElement('div');
            champGrid.className = 'm-role-champs';

            champs.forEach(c => {
                const btn = document.createElement('div');
                const isOn = selected.has(c.name);
                btn.className = 'm-item ' + (isOn ? 'on' : '');
                btn.dataset.name = c.name;   // якорь для точечного обновления (без пересборки сетки)

                const wrap = document.createElement('div');
                wrap.className = 'cp-iconwrap';

                const mImg = document.createElement('img');
                mImg.src = champIcon(c.name);
                mImg.alt = c.name;
                mImg.title = c.name;
                mImg.onerror = function(){ this.style.background='var(--sel-placeholder)'; this.src=''; };
                wrap.appendChild(mImg);

                // WR-шторка: выезжает по ховеру, только % винрейта (цвет по порогам)
                var _wr = wrLookup(c.name);
                if(_wr != null){
                    var sh = document.createElement('div');
                    sh.className = 'cp-wr ' + (_wr < 50 ? 'wr-low' : (_wr <= 52 ? 'wr-mid' : 'wr-high'));
                    sh.textContent = _wr.toFixed(1) + '%';
                    wrap.appendChild(sh);
                }

                // Patch dot in modal + tooltip
                var pI2 = patchMap[c.name];
                if(pI2) {
                    btn.style.position = 'relative';
                    var dt2 = document.createElement('div');
                    dt2.className = 'patch-dot ' + pI2.type;
                    btn.appendChild(dt2);
                    (function(pi, el){
                        el.addEventListener('mouseenter', function(e){ showGlobalPatchTip(e, pi, el); });
                        el.addEventListener('mouseleave', function(){ var t=document.getElementById('patchTip'); if(t) t.remove(); });
                        el.addEventListener('click', function(e){ showGlobalPatchTip(e, pi, el); });
                    })(pI2, btn);
                }
                btn.appendChild(wrap);

                btn.onclick = () => {
                    if(selected.has(c.name)) selected.delete(c.name);
                    else selected.add(c.name);
                    try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
                    // ТОЧЕЧНО: раньше тут был drawM() — пересборка ВСЕЙ сетки (~130 чемпов,
                    // с картинками, в двух гридах) ради одной галочки. Теперь красим одну ячейку.
                    syncChampCell(c.name);
                    applyChampRow(c.name);   // одна <tr>, а не пересборка tbody
                };
                champGrid.appendChild(btn);
            });

            container.appendChild(champGrid);
            grid.appendChild(container);

            // Spacer between role groups (not after last)
            if(roles.indexOf(role) < roles.length - 1) {
                const spacer = document.createElement('div');
                spacer.className = 'm-role-spacer';
                grid.appendChild(spacer);
            }
        });

        if (q && grid.children.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'grid-column:1/-1;opacity:0.8;font-size:14px;text-align:center;padding:20px;color:rgba(255,255,255,0.4);';
            empty.innerText = t('Ничего не найдено');
            grid.appendChild(empty);
        }
    }

    // ФИЛЬТР БЕЗ ПЕРЕСБОРКИ: поиск и роли только показывают/прячут уже построенные узлы.
    // Раньше каждая буква в поиске и каждый клик по роли звали drawM() —
    // полную пересборку сетки со всеми картинками.
    function applyPickerFilter(grid, q, roleFilter) {
        if (!grid) return;
        q = (q || '').trim().toLowerCase();
        var conts = grid.querySelectorAll('.m-role-container');
        var anyVisible = false;
        Array.prototype.forEach.call(conts, function(cont) {
            var roleOk = !roleFilter || cont.dataset.role === roleFilter;
            var shown = 0;
            var items = cont.querySelectorAll('.m-item[data-name]');
            Array.prototype.forEach.call(items, function(el) {
                var hit = roleOk && (!q || el.dataset.name.toLowerCase().indexOf(q) !== -1);
                el.style.display = hit ? '' : 'none';
                if (hit) shown++;
            });
            cont.style.display = (roleOk && shown > 0) ? '' : 'none';
            if (roleOk && shown > 0) anyVisible = true;
        });
        var empty = grid.querySelector('.m-empty-note');
        if (!anyVisible) {
            if (!empty) {
                empty = document.createElement('div');
                empty.className = 'm-empty-note';
                empty.style.cssText = 'grid-column:1/-1;opacity:0.8;font-size:14px;text-align:center;padding:20px;color:rgba(255,255,255,0.4);';
                empty.innerText = t('Ничего не найдено');
                grid.appendChild(empty);
            }
            empty.style.display = '';
        } else if (empty) { empty.style.display = 'none'; }
    }
    // Фильтрация обеих сеток по текущему поиску/роли — без пересборки.
    function refilterPickers() {
        var mg = document.getElementById('mGrid');
        if (mg) applyPickerFilter(mg, ((document.getElementById('mSearch') || {}).value || ''), null);
        var ig = document.getElementById('statsChampGrid');
        if (ig) applyPickerFilter(ig, ((document.getElementById('statsChampSearch') || {}).value || ''), _statsRoleFilter);
        updateStatsPanelChrome();
    }
    window.refilterPickers = refilterPickers;

    // Полный перерисов выборки: и модалка (#mGrid), и inline-панель Статов (#statsChampGrid).
    // Строим ВСЕ роли без фильтра, затем фильтруем показом/скрытием.
    function drawM() {
        var modalGrid = document.getElementById('mGrid');
        if (modalGrid) {
            drawMInto(modalGrid, '', null);
        }
        var inGrid = document.getElementById('statsChampGrid');
        if (inGrid) {
            drawMInto(inGrid, '', null);
        }
        refilterPickers();
    }

    // ТОЧЕЧНОЕ обновление выбора чемпа — вместо пересборки всей сетки (drawM).
    // Один чемп может стоять в НЕСКОЛЬКИХ ролях, поэтому красим все его ячейки
    // в обоих гридах (модалка + инлайн-панель) и пересчитываем счётчики ролей по DOM.
    function syncChampCell(name) {
        var on = selected.has(name);
        var cells = document.querySelectorAll('.m-item[data-name="' + (window.CSS && CSS.escape ? CSS.escape(name) : name) + '"]');
        Array.prototype.forEach.call(cells, function(el) { el.classList.toggle('on', on); });

        // счётчики «N/M» и подсветка роли — считаем из DOM, это дёшево
        var conts = document.querySelectorAll('.m-role-container');
        Array.prototype.forEach.call(conts, function(cont) {
            var items = cont.querySelectorAll('.m-item');
            var onCnt = cont.querySelectorAll('.m-item.on').length;
            var lbl = cont.querySelector('.m-role-count');
            if (lbl) lbl.textContent = onCnt + '/' + items.length;
            var roleDiv = cont.querySelector('.m-role');
            if (roleDiv) roleDiv.classList.toggle('on', items.length > 0 && onCnt === items.length);
        });

        updateStatsPanelChrome();
    }

    // Счётчик «N чемпов» + подсветка активного фильтра ролей в inline-панели.
    function updateStatsPanelChrome() {
        var cnt = document.getElementById('statsChampCount');
        if (cnt) cnt.textContent = selected.size;
        var fr = document.getElementById('statsChampRoleFilter');
        if (fr) {
            var btns = fr.querySelectorAll('[data-role]');
            for (var i = 0; i < btns.length; i++) {
                var r = btns[i].getAttribute('data-role');
                btns[i].classList.toggle('on', (r === '' ? _statsRoleFilter === null : r === _statsRoleFilter));
            }
        }
    }
    window.statsSetRoleFilter = function(role) {
        _statsRoleFilter = role || null;
        refilterPickers();   // без пересборки сетки
    };
    // Клик по иконке роли = 3 состояния: 1) фильтр на роль → 2) выбрать ВСЕХ чемпов роли
    // в таблицу → 3) убрать ВСЕХ чемпов роли (и снять фильтр). Дальше цикл повторяется.
    window.statsRoleCycle = function(role) {
        if (_statsRoleFilter !== role) {
            _statsRoleFilter = role;
            drawM();
            return;
        }
        var champsOfRole = raw.filter(function(x){ return x.is && x.is[role]; });
        var allSel = champsOfRole.length > 0 && champsOfRole.every(function(x){ return selected.has(x.name); });
        if (!allSel) {
            champsOfRole.forEach(function(x){ selected.add(x.name); });
        } else {
            champsOfRole.forEach(function(x){ selected.delete(x.name); });
            _statsRoleFilter = null;
        }
        try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
        drawM();
        render();
    };
    // v26: expose drawM for inline handlers & mobile IME
    window.drawM = drawM;


    function roleT(r, isAll) {
        raw.filter(x => x.is[r]).forEach(x => isAll ? selected.delete(x.name) : selected.add(x.name));
        drawM();
        render();
    }

    function initApp() {
        buildStatsHeader();
        // Уровень рулится чипами (createRuler/setLevel) — слайдер убран.
    }


    // =========================================
    document.addEventListener('click', (e) => {
        const fab = document.getElementById('fabMenu');
        if(fab && !fab.contains(e.target)) {
            const fabActions = document.getElementById('fabActions');
            const fabMain = document.getElementById('fabMain');
            if(fabActions) fabActions.style.display = 'none';
            if(fabMain) fabMain.style.transform = '';
        }
    });
    // =========================================








    /* ════════════════════════════════════════════════════════════════
       КАРТОЧКА ПРЕДМЕТА/РУНЫ — порт из lab-item-card (3 вкладки).
       Стекло даёт хост .m-win (#itemDetailModal). Каталог = демо-данные
       лаба; реальные сборки/чемпионы/золото добавятся позже.
       ════════════════════════════════════════════════════════════════ */
    function ICD_compImg(id){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/'+id+'.png'; }
    function ICD_champIcon(key){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/'+key+'.png'; }
    var ICD_STAT={ ad:['⚔','AD'], ap:['🔮','Сила умений'], hp:['❤','Здоровье'], armor:['🛡','Броня'], mr:['✦','Сопр. магии'],
      crit:['💥','Крит'], as:['⚡','Скор. атаки'], ah:['⏩','Ускор. умений'], ms:['👟','Скор. бега'],
      ls:['🩸','Вампиризм'], arPenFlat:['🗡↯','Проб. брони'], arPenPct:['🗡↯','Проб. брони'],
      mrPenFlat:['🔮↯','Проб. сопр.'], mrPenPct:['🔮↯','Проб. сопр.'] };
    var ICD_PCT={crit:1,as:1,ls:1,arPenPct:1,mrPenPct:1};
    function ICD_statStr(k,v){ return '+'+v+(ICD_PCT[k]?'%':''); }
    var ICD_GOLD={ ad:41.7, ap:20, hp:3.33, armor:25, mr:25, crit:33.3, as:33.3, ah:30, ms:12, ls:70,
      mrPenFlat:0, arPenFlat:0, arPenPct:0, mrPenPct:0 };
    function ICD_goldValue(it){ var g=0; (it.stats||[]).forEach(function(s){ g+=(ICD_GOLD[s[0]]||0)*s[1]; }); return Math.round(g); }
    function ICD_efficiency(it){ if(!it.cost) return 0; return Math.round(ICD_goldValue(it)/it.cost*100); }
    var ICD_CAT_COLOR={ 'AD':'#e8820a', 'AP':'#8b5cf6', 'Защита':'#2ecc71', 'Ботинки':'#5dade2' };
    function ICD_wf(slug){ return 'https://www.wildriftfire.com/images/items/'+slug+'.png'; }
    function C(id,name){ return {id:id,name:name}; }
    var ICD_ITEMS={
      ie:{name:'Грань Бесконечности',slug:'infinity-edge',cat:'AD',cost:3400,stats:[['ad',65],['crit',20]],
        passive:'При крит. шансе ≥60% критические удары наносят на 35% больше урона.',
        comp:[C(1038,'B.F. Меч'),C(1037,'Кирка'),C(1018,'Плащ ловкости')],
        champs:['Jhin','Caitlyn','Tristana'],spike:'3-й предмет (крит-спайк)',tip:'Нужен крит-шанс рядом, иначе пассив спит.',pg:600},
      collector:{name:'Коллекционер',slug:'the-collector',cat:'AD',cost:3000,stats:[['ad',50],['crit',20],['arPenFlat',12]],
        passive:'Добивает врагов с HP <5%, за убийство даёт бонусное золото.',
        comp:[C(3133,'Молот Колфилда'),C(1018,'Плащ ловкости'),C(1037,'Кирка')],
        champs:['Zed','Talon','Jhin'],spike:'1-2 предмет (бурст)',tip:'Для убийц на пробивание и добивание.',pg:500},
      bt:{name:'Жажда крови',slug:'bloodthirster',cat:'AD',cost:3400,stats:[['ad',55],['ls',18]],
        passive:'Избыток вампиризма копится в щит (до 50–350 HP).',
        comp:[C(1038,'B.F. Меч'),C(1053,'Скипетр вампира'),C(1036,'Длинный меч')],
        champs:['Yasuo','Yone','Vayne'],spike:'2-3 предмет (устойчивость)',tip:'Топ против поке — щит держит хп.',pg:550},
      youmuu:{name:'Призрачный клинок Йоумуу',slug:'youmuus-ghostblade',cat:'AD',cost:2900,stats:[['ad',55],['arPenFlat',18],['ms',20]],
        passive:'Актив: всплеск скорости бега. Стаки скорости вне боя.',
        comp:[C(3133,'Молот Колфилда'),C(1036,'Длинный меч'),C(1018,'Плащ ловкости')],
        champs:['Zed','Talon','Qiyana'],spike:'1-й предмет (роуминг)',tip:'Мобильность + пробивание для убийц.',pg:450},
      bc:{name:'Чёрный разделитель',slug:'black-cleaver',cat:'AD',cost:3100,stats:[['ad',40],['hp',300],['arPenPct',24]],
        passive:'Удары срезают броню цели стаками. Даёт скорость бега при попадании.',
        comp:[C(3133,'Молот Колфилда'),C(1011,'Пояс великана'),C(1029,'Тканевая броня')],
        champs:['Garen','Darius','Renekton'],spike:'2 предмет (бруизер)',tip:'Хорош в команду с физ-уроном (срез брони общий).',pg:700},
      serylda:{name:'Обида Серильды',slug:'seryldas-grudge',cat:'AD',cost:3200,stats:[['ad',45],['arPenPct',30],['ah',15]],
        passive:'Замедляет целей с HP ниже 50%.',
        comp:[C(3133,'Молот Колфилда'),C(1037,'Кирка'),C(1036,'Длинный меч')],
        champs:['Jhin','Kaisa','Lucian'],spike:'3-4 предмет (против танков)',tip:'Берётся против бронированной команды.',pg:500},
      luden:{name:'Эхо Людена',slug:'ludens-echo',cat:'AP',cost:3200,stats:[['ap',100],['ah',20]],
        passive:'Умения наносят доп. урон по области и дают всплеск скорости.',
        comp:[C(1058,'Большой жезл'),C(1026,'Жезл усиления'),C(3067,'Камень очага')],
        champs:['Lux','Veigar','Brand'],spike:'1-й предмет (волна+бурст)',tip:'Топ первый предмет на бурст-магов.',pg:650},
      nashor:{name:'Зуб Нашора',slug:'nashors-tooth',cat:'AP',cost:3000,stats:[['ap',85],['as',50],['ah',15]],
        passive:'Автоатаки наносят доп. магический урон (15 + 20% от силы умений).',
        comp:[C(1043,'Перевёрнутый лук'),C(1026,'Жезл усиления'),C(1052,'Том усиления')],
        champs:['Teemo','Kennen','Diana'],spike:'2 предмет (он-хит)',tip:'Для магов на автоатаках.',pg:700},
      liandryItem:{name:'Мучения Лиандри',slug:'liandrys-torment',cat:'AP',cost:3200,stats:[['ap',95],['hp',300]],
        passive:'Урон умениями поджигает: жжёт % макс. HP во времени.',
        comp:[C(1058,'Большой жезл'),C(1028,'Рубиновый кристалл'),C(1052,'Том усиления')],
        champs:['Brand','Cassiopeia','Teemo'],spike:'2-3 предмет (против танков)',tip:'Топ против HP-команд (жжёт %HP).',pg:800},
      iorb:{name:'Сфера бесконечности',slug:'infinity-orb',cat:'AP',cost:3200,stats:[['ap',110],['hp',200]],
        passive:'Доп. магический урон по целям с HP <35%, гарант. крит умений.',
        comp:[C(1058,'Большой жезл'),C(1026,'Жезл усиления'),C(1028,'Рубиновый кристалл')],
        champs:['Lux','Syndra','Veigar'],spike:'2 предмет (добивание)',tip:'Усиливает добивание умениями.',pg:650},
      rylai:{name:'Скипетр Рилай',slug:'rylais-crystal-scepter',cat:'AP',cost:2600,stats:[['ap',75],['hp',400]],
        passive:'Урон умениями замедляет цель на 30%.',
        comp:[C(1026,'Жезл усиления'),C(1028,'Рубиновый кристалл'),C(1052,'Том усиления')],
        champs:['Brand','Morgana','Vladimir'],spike:'3 предмет (контроль)',tip:'Кайт и склейка комбо замедлением.',pg:600},
      lich:{name:'Лезвие лича',slug:'lich-bane',cat:'AP',cost:3000,stats:[['ap',80],['ah',15],['ms',8]],
        passive:'После умения следующая автоатака бьёт всплеском магического урона.',
        comp:[C(1026,'Жезл усиления'),C(3057,'Камень очага'),C(1052,'Том усиления')],
        champs:['Diana','Ekko','Akali'],spike:'2 предмет (спелл-блейд)',tip:'Для магов с быстрым каст→автоатака.',pg:750},
      thornmail:{name:'Шипованный доспех',slug:'thornmail',cat:'Защита',cost:2700,stats:[['armor',55],['hp',300]],
        passive:'Получив автоатаку — магический урон + анти-хил по атакующему.',
        comp:[C(1031,'Кольчуга'),C(1029,'Тканевая броня'),C(1028,'Рубиновый кристалл')],
        champs:['Malphite','Leona','Rammus'],spike:'2 предмет (против АД-кэрри)',tip:'Берётся против вампиризма и автоатак.',pg:650},
      sunfire:{name:'Эгида Солнечного огня',slug:'sunfire-aegis',cat:'Защита',cost:2800,stats:[['armor',50],['hp',400]],
        passive:'Поджигает врагов вокруг, урон растёт в бою.',
        comp:[C(1031,'Кольчуга'),C(3067,'Камень очага'),C(1028,'Рубиновый кристалл')],
        champs:['Malphite','Sett','Ornn'],spike:'1-2 предмет (вейвклир)',tip:'Танк-фронтлайн с аурой урона.',pg:700},
      force:{name:'Сила природы',slug:'force-of-nature',cat:'Защита',cost:2900,stats:[['mr',60],['ms',25]],
        passive:'Стаки от магического урона дают сопр. магии и скорость бега.',
        comp:[C(1057,'Плащ негатрона'),C(1033,'Мантия нуля'),C(1006,'Свиток реген.')],
        champs:['Malphite','Ornn','Sion'],spike:'3 предмет (против магов)',tip:'Топ против тяжёлой АП-команды.',pg:650},
      hollow:{name:'Пустотное сияние',slug:'hollow-radiance',cat:'Защита',cost:2700,stats:[['mr',45],['hp',350]],
        passive:'Аура жжёт врагов вокруг магическим уроном.',
        comp:[C(1057,'Плащ негатрона'),C(1028,'Рубиновый кристалл'),C(3067,'Камень очага')],
        champs:['Amumu','Sion','Malphite'],spike:'2 предмет (МС+аура)',tip:'Сопр. магии + вейвклир танкам.',pg:600},
      frozen:{name:'Ледяное сердце',slug:'frozen-heart',cat:'Защита',cost:2700,stats:[['armor',70],['ah',20]],
        passive:'Аура замедляет скор. атаки врагов вокруг.',
        comp:[C(1031,'Кольчуга'),C(1029,'Тканевая броня'),C(3067,'Камень очага')],
        champs:['Malphite','Nautilus','Sion'],spike:'3 предмет (против автоатак)',tip:'Душит АД-кэрри замедлением атаки.',pg:600},
      steraks:{name:'Мощь Стерака',slug:'steraks-gage',cat:'Защита',cost:2900,stats:[['ad',45],['hp',400]],
        passive:'При большом уроне даёт щит от макс. HP.',
        comp:[C(1011,'Пояс великана'),C(3052,'Топор'),C(1028,'Рубиновый кристалл')],
        champs:['Sett','Renekton','Camille'],spike:'3 предмет (выживание)',tip:'Бруизерам — щит спасает в замесе.',pg:750}
    };
    var ICD_BY_NAME={};
    Object.keys(ICD_ITEMS).forEach(function(k){ ICD_BY_NAME[ICD_ITEMS[k].name]=k; });

    function ICD_compMap(comp){ return comp.map(function(c){ return {icon:ICD_compImg(c.id),name:c.name}; }); }
    function ICD_entOfItem(it){
      return { kind:'item', name:it.name, icon:ICD_wf(it.slug), catLabel:it.cat, catColor:ICD_CAT_COLOR[it.cat]||'#5dade2',
        cost:it.cost, stats:it.stats, passive:it.passive, comps:ICD_compMap(it.comp||[]), champs:it.champs||[],
        spike:it.spike, tip:it.tip, eff:ICD_efficiency(it), gold:ICD_goldValue(it), pg:it.pg||0, rich:true };
    }
    // запасная сущность из боевых данных (имя/цена/строка статов/описание/иконка)
    function ICD_entOfRaw(name, cost, statsStr, desc, imgSrc){
      var rt = window.parseRichText || function(s){ return s; };
      var rows=(statsStr||'').split('  |  ').map(function(s){return s.trim();}).filter(Boolean);
      return { kind:'item', name:name||'', icon:imgSrc||'', catLabel:'', catColor:'#5dade2',
        costRaw:cost, rawStats:rows.map(rt), passiveRaw:desc||'', comps:[], champs:[], rich:false };
    }

    var ICD_BY_SLUG={};
    Object.keys(ICD_ITEMS).forEach(function(k){ ICD_BY_SLUG[ICD_ITEMS[k].slug]=k; });
    function ICD_slugOf(url){ return (url||'').split('?')[0].split('/').pop().replace(/\.(png|jpe?g|webp)$/i,''); }

    /* ── РУНЫ (кейстоуны) — порт каталога лаба, ключи = боевые slug иконок ── */
    var ICD_PERK='https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/';
    function ICD_R(url,name){ return {icon:ICD_PERK+url,name:name}; }
    var ICD_RUNES={
      electro:{name:'Электрокьют',cat:'Доминирование',color:'#d44242',
        desc:'3 отдельные атаки или умения по чемпиону за 3 сек наносят всплеск адаптивного урона.',
        slots:[ICD_R('Domination/CheapShot/CheapShot.png','Дешёвый выстрел'),ICD_R('Domination/EyeballCollection/EyeballCollection.png','Коллекция глаз'),ICD_R('Domination/UltimateHunter/UltimateHunter.png','Охотник за ультой')],
        champs:['Zed','Lux','Ahri'],spike:'С 1 уровня (бурст-комбо)',tip:'Для бурст-чемпов с 3 быстрыми тычками.'},
      conqueror:{name:'Завоеватель',cat:'Точность',color:'#c8aa6e',
        desc:'Атаки и умения по чемпионам копят адаптивную силу; на макс. стаках лечит от нанесённого урона.',
        slots:[ICD_R('Precision/Triumph/Triumph.png','Триумф'),ICD_R('Precision/LegendAlacrity/LegendAlacrity.png','Проворность'),ICD_R('Precision/LastStand/LastStand.png','Последний рубеж')],
        champs:['Garen','Yasuo','Jax'],spike:'Затяжной бой (бруизеры)',tip:'Топ для долгих разменов и бруизеров.'},
      aery:{name:'Стремительная Аэри',cat:'Колдовство',color:'#9faafc',
        desc:'Атаки и умения шлют Аэри: по врагу — урон, по союзнику — щит.',
        slots:[ICD_R('Sorcery/ManaflowBand/ManaflowBand.png','Лента маны'),ICD_R('Sorcery/Transcendence/Transcendence.png','Превосходство'),ICD_R('Sorcery/Scorch/Scorch.png','Опаление')],
        champs:['Lux','Morgana','Sona'],spike:'Лейн-поке/щиты',tip:'Для поке-магов и энчантеров.'},
      comet:{name:'Чародейская комета',cat:'Колдовство',color:'#9faafc',
        desc:'Урон умением призывает комету в цель; кулдаун снижается уроном умений.',
        slots:[ICD_R('Sorcery/ManaflowBand/ManaflowBand.png','Лента маны'),ICD_R('Sorcery/Transcendence/Transcendence.png','Превосходство'),ICD_R('Sorcery/GatheringStorm/GatheringStorm.png','Шторм')],
        champs:['Veigar','Xerath','Syndra'],spike:'Поке на дистанции',tip:'Для дальнобойных магов на скилл-шотах.'},
      grasp:{name:'Хватка бессмертных',cat:'Доблесть',color:'#a1d586',
        desc:'Раз в ~4 сек в бою следующая атака бьёт по % макс. HP, лечит и даёт перм. HP.',
        slots:[ICD_R('Resolve/Demolish/Demolish.png','Снос'),ICD_R('Resolve/SecondWind/SecondWind.png','Второе дыхание'),ICD_R('Resolve/Overgrowth/Overgrowth.png','Разрастание')],
        champs:['Malphite','Sett','Ornn'],spike:'Топлейн-танки',tip:'Для танков-топов с автоатаками в лейне.'},
      darkharvest:{name:'Жатва тьмы',cat:'Доминирование',color:'#d44242',
        desc:'Поражение чемпиона с HP <50% наносит доп. урон и копит стаки навсегда.',
        slots:[ICD_R('Domination/SuddenImpact/SuddenImpact.png','Внезапный удар'),ICD_R('Domination/ZombieWard/ZombieWard.png','Вард-зомби'),ICD_R('Domination/UltimateHunter/UltimateHunter.png','Охотник за ультой')],
        champs:['Veigar','Thresh','Senna'],spike:'Скейл (стаки в лейте)',tip:'Для скейл-чемпов: чем дольше игра, тем больнее.'}
    };
    var ICD_RUNE_BY_SLUG={ electrocute:'electro', conqueror:'conqueror', aery:'aery',
      'arcane-comet':'comet', 'grasp-of-the-undying':'grasp', 'dark-harvest':'darkharvest' };

    function ICD_entOfRune(r, iconOverride){
      return { kind:'rune', name:r.name, icon:iconOverride||'', catLabel:r.cat, catColor:r.color||'#9faafc',
        passive:r.desc, comps:r.slots.map(function(s){ return {icon:s.icon,name:s.name}; }), champs:r.champs||[],
        spike:r.spike, tip:r.tip, rich:true, round:true };
    }
    function ICD_entOfRuneRaw(name, type, desc, imgSrc){
      return { kind:'rune', name:name||'', icon:imgSrc||'', catLabel:type||'', catColor:'#9faafc',
        passiveRaw:desc||'', comps:[], champs:[], rich:false, round:true };
    }

    var ICD_cur=null, ICD_tab='stats', ICD_box='itemDetailContent';

    function ICD_catTag(e){ return e.catLabel?'<span class="icd-cat">'+e.catLabel+'</span>':''; }
    function ICD_costTag(e){ var c=e.cost||e.costRaw; return c?'<span class="icd-cost">🪙 '+c+'</span>':''; }
    function ICD_statsHTML(e){
      if(e.kind==='rune') return '';
      if(e.rich){
        if(!e.stats) return '';
        return '<div class="icd-stats">'+e.stats.map(function(s){
          return '<div class="icd-stat"><span class="sl">'+ICD_STAT[s[0]][0]+' '+ICD_STAT[s[0]][1]+'</span><span class="sv">'+ICD_statStr(s[0],s[1])+'</span></div>';
        }).join('')+'</div>';
      }
      if(!e.rawStats||!e.rawStats.length) return '';
      return '<div class="icd-stats">'+e.rawStats.map(function(s){
        return '<div class="icd-stat"><span class="sl">'+s+'</span></div>';
      }).join('')+'</div>';
    }
    function ICD_passiveHTML(e){
      var rt = window.parseRichText || function(s){ return s; };
      var tag = e.kind==='rune' ? 'Эффект' : 'Пассив';
      if(e.rich){
        if(!e.passive) return '';
        return '<div class="icd-passive"><span class="icd-ptag">'+tag+'</span>'+e.passive+'</div>';
      }
      if(!e.passiveRaw) return '';
      if(e.kind==='rune') return '<div class="icd-passive"><span class="icd-ptag">'+tag+'</span>'+rt(e.passiveRaw)+'</div>';
      var html=e.passiveRaw.split('\n').filter(Boolean).map(function(line){
        var m=line.match(/^([^:]+?):\s*(.+)/s);
        if(m) return '<div style="margin-bottom:8px;"><span class="icd-ptag">'+m[1]+'</span>'+rt(m[2])+'</div>';
        return '<div style="margin-bottom:6px;color:rgba(230,243,251,.75);">'+rt(line)+'</div>';
      }).join('');
      return '<div class="icd-passive">'+html+'</div>';
    }
    function ICD_buildPane(e){
      if(e.kind==='rune'){
        if(!e.rich) return '<div class="icd-soon">🌳 Дерево руны добавим позже — слот-руны этой ветки.</div>';
        if(!e.comps||!e.comps.length) return '<div class="icd-empty">нет данных</div>';
        return '<div class="icd-runetree"><div class="icd-rt-h" style="color:'+e.catColor+'">'+e.catLabel+'</div>'+
          e.comps.map(function(c){return '<div class="icd-rt-row"><img src="'+c.icon+'" onerror="this.style.visibility=\'hidden\'"><span>'+c.name+'</span></div>';}).join('')+'</div>';
      }
      if(!e.rich) return '<div class="icd-soon">🔧 Дерево сборки добавим позже — соберём <b>из чего</b> состоит предмет.</div>';
      if(!e.comps||!e.comps.length) return '<div class="icd-empty">нет данных о сборке</div>';
      var parts=e.comps.map(function(c,i){
        return (i?'<div class="icd-bt-plus">+</div>':'')+
          '<div class="icd-bt-comp"><img src="'+c.icon+'" onerror="this.style.visibility=\'hidden\'"><span>'+c.name+'</span></div>';
      }).join('');
      return '<div class="icd-buildtree">'+parts+'<div class="icd-bt-eq">=</div>'+
        '<div class="icd-bt-comp result"><img src="'+e.icon+'" onerror="this.style.opacity=.2"><span>'+e.name+'</span></div></div>'+
        '<div class="icd-bt-cost">💰 Полная стоимость: <b>'+(e.cost||0)+'</b> зол.</div>';
    }
    function ICD_champsPane(e){
      if(!e.rich) return e.kind==='rune'
        ? '<div class="icd-soon">👤 Кому брать добавим позже — чемпионы под эту руну.</div>'
        : '<div class="icd-soon">👤 Кому брать и <b>золотоэффективность</b> добавим позже — нужны данные по чемпионам и цене статов.</div>';
      var champs = (e.champs&&e.champs.length)
        ? '<div class="icd-rblock"><span class="icd-rlbl">👤 Кому брать</span><div class="icd-champs">'+
            e.champs.map(function(k){return '<img src="'+ICD_champIcon(k)+'" alt="'+k+'" title="'+k+'" onerror="this.style.opacity=.2">';}).join('')+'</div></div>'
        : '';
      var spike = e.spike?'<div class="icd-rblock"><span class="icd-rlbl">🔥 Спайк</span><span class="icd-rtext">'+e.spike+'</span></div>':'';
      var tip   = e.tip?'<div class="icd-rblock"><span class="icd-rlbl">💡 Когда брать</span><span class="icd-rtext">'+e.tip+'</span></div>':'';
      var eff='';
      if(e.cost){
        var rows=e.stats.map(function(s){ var g=Math.round((ICD_GOLD[s[0]]||0)*s[1]);
          return '<div class="icd-effrow"><span>'+ICD_STAT[s[0]][0]+' '+ICD_statStr(s[0],s[1])+' '+ICD_STAT[s[0]][1]+'</span><b>'+(g?g+' зол':'—')+'</b></div>';
        }).join('');
        if(e.pg) rows+='<div class="icd-effrow passive"><span>✨ Пассив / эффект <i>(оценка)</i></span><b>'+e.pg+' зол</b></div>';
        var totalGold=e.gold+(e.pg||0), effTot=Math.round(totalGold/e.cost*100);
        var pct=Math.min(140,effTot), col=effTot>=100?'#2ecc71':effTot>=85?'#f1c40f':'#e8820a';
        eff='<div class="icd-rblock"><span class="icd-rlbl">💰 Золотоэффективность</span>'+
          '<div class="icd-effchips"><span class="icd-effchip">по статам <b>'+e.eff+'%</b></span>'+
            '<span class="icd-effchip total" style="border-color:'+col+'">с пассивом <b style="color:'+col+'">'+effTot+'%</b></span></div>'+
          '<div class="icd-effrows">'+rows+'</div>'+
          '<div class="icd-effbar"><i style="width:'+(pct/140*100)+'%;background:'+col+'"></i></div>'+
          '<div class="icd-effsub">статы '+e.gold+' + пассив '+(e.pg||0)+' = '+totalGold+' зол · предмет '+e.cost+' зол'+
            '<br>золото по базовым предметам Wild Rift (500 зол) · цена пассива = экспертная оценка</div></div>';
      }
      var body=champs+eff+spike+tip;
      return '<div class="icd-rich">'+(body||'<div class="icd-empty">нет данных</div>')+'</div>';
    }
    function ICD_tabPane(e){
      if(ICD_tab==='build')  return ICD_buildPane(e);
      if(ICD_tab==='champs') return ICD_champsPane(e);
      return ICD_statsHTML(e)+ICD_passiveHTML(e);
    }
    function ICD_render(){
      var box=document.getElementById(ICD_box||'itemDetailContent');
      if(!box||!ICD_cur) return;
      var e=ICD_cur;
      var tabs = e.kind==='rune'
        ? [['stats','Эффект'],['build','Дерево руны'],['champs','Кому брать']]
        : [['stats','Характеристики'],['build','Из чего'],['champs','Кому брать + золото']];
      if(!tabs.some(function(t){return t[0]===ICD_tab;})) ICD_tab='stats';
      var bar=tabs.map(function(t){ return '<button class="icd-tab'+(ICD_tab===t[0]?' on':'')+'" data-icdtab="'+t[0]+'">'+t[1]+'</button>'; }).join('');
      box.innerHTML='<div class="icd-card kind-'+e.kind+'" style="--cc:'+e.catColor+'">'+
        '<div class="icd-head">'+
          (e.icon?'<img class="icd-icon'+(e.round?' round':'')+'" src="'+e.icon+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">':'')+
          '<div class="icd-headmeta"><div class="icd-namerow">'+ICD_catTag(e)+ICD_costTag(e)+'</div>'+
          '<div class="icd-name">'+e.name+'</div></div></div>'+
        '<div class="icd-tabs">'+bar+'</div>'+
        '<div class="icd-pane">'+ICD_tabPane(e)+'</div>'+
      '</div>';
      box.querySelectorAll('[data-icdtab]').forEach(function(b){
        b.onclick=function(){ ICD_tab=b.dataset.icdtab; ICD_render(); };
      });
    }

    window.openItemDetail = function(name, cost, stats, desc, imgSrc) {
        var modal = document.getElementById('itemDetailModal');
        var box   = document.getElementById('itemDetailContent');
        if(!modal || !box) return;
        var key = ICD_BY_SLUG[ICD_slugOf(imgSrc)] || ICD_BY_NAME[name];
        ICD_box = 'itemDetailContent';
        ICD_cur = key ? ICD_entOfItem(ICD_ITEMS[key]) : ICD_entOfRaw(name, cost, stats, desc, imgSrc);
        ICD_tab = 'stats';
        ICD_render();
        openModal('itemDetailModal');
    };

    window.openItemDetailKey = function(key) {
        if(!ICD_ITEMS[key]) return;
        var box = document.getElementById('itemDetailContent');
        if(!box) return;
        ICD_box = 'itemDetailContent';
        ICD_cur = ICD_entOfItem(ICD_ITEMS[key]);
        ICD_tab = 'stats';
        ICD_render();
        openModal('itemDetailModal');
    };

    window.closeItemDetail = function() {
        closeModal('itemDetailModal');
    };

    /* ── ПИКЕР: дизайн лаб-пикера на боевых сетках (имена, точки категорий, ⚙ размер) ── */
    function ICD_pickSize(){ return localStorage.getItem('wr_pickSize') || 'md'; }
    function ICD_catColorFromSection(label){
      label = label || '';
      if(label.indexOf('⚔')>=0 || /физ/i.test(label)) return '#e8820a';
      if(label.indexOf('🔮')>=0 || /маг/i.test(label)) return '#8b5cf6';
      if(label.indexOf('🛡')>=0 || /защит/i.test(label)) return '#2ecc71';
      if(label.indexOf('👟')>=0 || /ботин/i.test(label)) return '#ffffff';
      if(label.indexOf('🔴')>=0) return '#e74c3c';
      if(label.indexOf('🟡')>=0) return '#f1c40f';
      if(label.indexOf('🟢')>=0) return '#2ecc71';
      if(label.indexOf('🔵')>=0) return '#5b9bd5';
      if(label.indexOf('⭐')>=0) return '#c8aa6e';
      return '#ffffff';
    }
    function ICD_enhancePicker(maskId, isRune){
      var mask = document.getElementById(maskId);
      if(!mask) return;
      mask.setAttribute('data-pick', 'lab');
      mask.setAttribute('data-isize', ICD_pickSize());
      mask.querySelectorAll(isRune ? '.rune-card' : '.item-card').forEach(function(card){
        if(card._pickInit) return;
        card._pickInit = true;
        var grid = card.parentElement;
        var sec = grid ? grid.previousElementSibling : null;
        var dot = document.createElement('i');
        dot.className = 'pc-pcat';
        dot.style.color = ICD_catColorFromSection(sec ? sec.textContent : '');
        card.appendChild(dot);
        if(!isRune){
          var parts = (card.getAttribute('data-tip') || '').split('¦');
          var img = card.querySelector('img');
          var nm = parts[0] || (img ? img.alt : '');
          if(nm){ var s = document.createElement('div'); s.className = 'pc-pname'; s.textContent = nm; card.appendChild(s); }
        }
      });
    }
    window.togglePickSize = function(maskId, btn){
      var mask = document.getElementById(maskId);
      if(!mask) return;
      var existing = mask.querySelector('.pick-sizepop');
      if(existing){ existing.remove(); return; }
      var cur = ICD_pickSize();
      var sizes = [['sm','Маленькие'],['md','Средние'],['lg','Крупные']];
      var pop = document.createElement('div');
      pop.className = 'glass pick-sizepop';
      pop.innerHTML = '<div class="ps-h">⚙ Размер иконок</div><div class="ps-seg">' +
        sizes.map(function(o){ return '<button data-sz="'+o[0]+'" class="'+(cur===o[0]?'on':'')+'">'+o[1]+'</button>'; }).join('') +
        '</div>';
      (btn && btn.parentElement ? btn.parentElement : mask).appendChild(pop);
      pop.querySelectorAll('[data-sz]').forEach(function(b){
        b.onclick = function(){
          localStorage.setItem('wr_pickSize', b.dataset.sz);
          mask.setAttribute('data-isize', b.dataset.sz);
          pop.querySelectorAll('[data-sz]').forEach(function(x){ x.classList.toggle('on', x===b); });
        };
      });
    };

    // window.openItems — открыть модалку предметов
    window.openItems = function() {
        openModal('itemsMask');
        setTimeout(function() {
            document.querySelectorAll('#itemsMask .item-card[data-tip]').forEach(function(card) {
                if(card._initDone) return;
                card._initDone = true;
                card.style.cursor = 'pointer';
                card.addEventListener('click', function() {
                    var parts = (card.getAttribute('data-tip') || '').split('\u00A6');
                    var lang = window._lang || localStorage.getItem('wr_lang') || 'ru';
                    var descEn = card.getAttribute('data-desc-en') || '';
                    var descRu = card.getAttribute('data-desc-ru') || parts[3] || '';
                    var desc = (lang === 'en' && descEn) ? descEn : descRu;
                    var imgSrc = card.querySelector('img') ? card.querySelector('img').src : '';
                    openItemDetail(parts[0]||'', parts[1]||'', parts[2]||'', desc, imgSrc);
                });
            });
            ICD_enhancePicker('itemsMask', false);
        }, 80);
    };

    // SIDEBAR
    // Вспомогательная: PC или нет
    function _isSidebarPc() { return window.matchMedia('(min-width: 769px)').matches; }

    // Убрать active state со всех кнопок сайдбара
    function _sidebarClearActive() {
        document.querySelectorAll('#sidePanel .rail-btn').forEach(function(b) {
            b.classList.remove('side-active');
        });
    }
    // Установить active state по ключу 'what'. Э1.1: рельс пересобран из lab-main →
    // у кнопок есть честный data-section. Разбор onclick-строки оставлен фоллбэком
    // для кнопок без data-section (админские вызовы cms*).
    function _sidebarSetActive(what) {
        _sidebarClearActive();
        if (!what) return;
        document.querySelectorAll('#sidePanel .rail-btn').forEach(function(btn) {
            if (btn.getAttribute('data-section') === what) { btn.classList.add('side-active'); return; }
            var oc = btn.getAttribute('onclick') || '';
            if (oc.indexOf("'" + what + "'") !== -1 || oc.indexOf('"' + what + '"') !== -1) {
                btn.classList.add('side-active');
            }
        });
    }
    window._sidebarSetActive = _sidebarSetActive;
    window._sidebarClearActive = _sidebarClearActive;

    // ★ Флаг «инструмент сайдбара открыт» (порт data-railopen из lab-sidebar-views).
    // Ставим html[data-toolopen="1"] ТОЛЬКО для инлайн-инструментов (.sidebar-modal):
    // рельс держится раскрытым (240px) + контент сдвигается вправо (CSS по флагу).
    // Фуллскрин-драфтер (.m-fullscreen) флаг НЕ ставит — он занимает весь экран.
    function _setToolOpen(on) {
        if (!_isSidebarPc()) { document.documentElement.removeAttribute('data-toolopen'); return; }
        if (on) document.documentElement.setAttribute('data-toolopen', '1');
        else document.documentElement.removeAttribute('data-toolopen');
    }
    function _syncToolOpenFlag() {
        var el = _sidebarModalId ? document.getElementById(_sidebarModalId) : null;
        var isInline = !!(el && el.classList.contains('sidebar-modal'));
        _setToolOpen(_pcSideMode && isInline);
    }
    window._syncToolOpenFlag = _syncToolOpenFlag;

    // Закрыть открытый инлайн-инструмент сайдбара, если он открыт. Экспонируется,
    // потому что _sidebarModalId и closeModal живут в ЭТОЙ IIFE, а switchMainView —
    // в другой (читать их там напрямую = ReferenceError).
    window._closeSidebarToolIfOpen = function() {
        if (!_sidebarModalId) return;
        var el = document.getElementById(_sidebarModalId);
        if (el && el.classList.contains('sidebar-modal')) closeModal(_sidebarModalId);
    };

    window.toggleSidebar = function() {
        var panel = document.getElementById('sidePanel');
        var overlay = document.getElementById('sideOverlay');
        if(!panel) return;
        var isPc = _isSidebarPc();
        // PC: сайдбар всегда открыт, toggle ничего не делает
        if(isPc) return;
        var isOpen = panel.classList.contains('open');
        if(!isOpen) {
            // Mobile opening: save scroll position
            document.body.dataset.scrollY = window.scrollY;
            document.body.style.top = '-' + window.scrollY + 'px';
        }
        panel.classList.toggle('open', !isOpen);
        if(overlay) overlay.classList.toggle('open', !isOpen);
        document.body.classList.toggle('sidebar-open', !isOpen);
        if(isOpen) {
            // Mobile closing: restore scroll position
            var scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
            document.body.style.top = '';
            window.scrollTo(0, scrollY);
        }
    };
    window.closeSidebar = function() {
        var isPc = _isSidebarPc();
        var panel = document.getElementById('sidePanel');
        var overlay = document.getElementById('sideOverlay');
        document.body.classList.remove('pc-chat-mode');
        _sidebarClearActive();

        if (isPc) {
            // PC: не закрываем сайдбар, только чистим состояние модалок
            if (_sidebarModalId && _pcSideMode) {
                _sidebarModalId = null;
                _pcSideMode = false;
            }
            _setToolOpen(false);
            return;
        }

        // Mobile: закрываем полностью
        if(panel) panel.classList.remove('open');
        if(overlay) overlay.classList.remove('open');
        var wasOpen = document.body.classList.contains('sidebar-open');
        document.body.classList.remove('sidebar-open');
        if(wasOpen) {
            var scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
            document.body.style.top = '';
            window.scrollTo(0, scrollY);
        }
        // Close any modal that was opened in PC side-panel mode
        if (_sidebarModalId && _pcSideMode) {
            var _id = _sidebarModalId;
            _sidebarModalId = null;
            _pcSideMode = false;
            closeModal(_id);
        } else {
            var _chatEl = document.getElementById('chatSystemMask');
            if (_chatEl && _chatEl.classList.contains('active')) {
                closeModal('chatSystemMask', true); // skipSidebar: не реопенить sidebar при его же закрытии
            }
        }
    };

    // ═══ NEW CALCULATOR ═══
    var _calcMyChamp = null, _calcMyLvl = 1;
    var _calcTgtChamp = null, _calcTgtLvl = 1;
    var _calcRange = 'melee';

    window.openCalc = function() {
        var fr = document.getElementById('calcFrame');
        // ленивая загрузка модуля калькулятора (?embed=1 = чистый режим без лаб-полосы).
        // На localhost iframe грузим свежим каждый раз (&t=) — иначе браузер кэширует
        // старую копию calc-app и правки не видно.
        var dev = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '');
        if (fr && (!fr.getAttribute('src') || dev)) {
            fr.setAttribute('src', 'calc-app/index.html?embed=1' + (dev ? '&t=' + Date.now() : ''));
        }
        openModal('calcMask');
    };
    window.closeCalc = function() { closeModal('calcMask'); };

    window.openChanges = function() {
        openModal('changesMask');
        if (window.changesRender) window.changesRender();
    };
    window.closeChanges = function() { closeModal('changesMask'); };

    // Pick my champ
    window._calcPickMy = function(c) {
        _calcMyChamp = raw.find(function(x){ return x.name===c.name; });
        if(!_calcMyChamp) return;
        _calcMyLvl = +document.getElementById('calcMyLvlSlider').value || 1;
        document.getElementById('calcMyBadge').style.display = 'flex';
        document.getElementById('calcMyIcon').src = champIcon(c.name);
        document.getElementById('calcMyName').textContent = c.name;
        document.getElementById('calcMyLvlWrap').style.display = 'block';
        calcMyLvlChange();
    };
    window.calcClearMy = function() {
        _calcMyChamp = null;
        document.getElementById('calcMyBadge').style.display = 'flex';
        document.getElementById('calcMyIcon').src = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Sion.png';
        document.getElementById('calcMyName').innerHTML = t('🪆 Манекен');
        document.getElementById('calcMyLvlWrap').style.display = 'none';
        document.getElementById('cMyAD').value = '100';
        document.getElementById('cMyAD').readOnly = false;
        calcRun();
    };
    window.calcMyLvlChange = function() {
        _calcMyLvl = +document.getElementById('calcMyLvlSlider').value;
        document.getElementById('calcMyLvlNum').textContent = _calcMyLvl;
        if(_calcMyChamp) {
            var f = function(b,g){ return Math.round(b+(_calcMyLvl-1)*g); };
            document.getElementById('cMyAD').value = f(_calcMyChamp.ad_b, _calcMyChamp.ad_g);
            document.getElementById('cMyAD').readOnly = true;
        }
        calcRun();
    };

    // Pick target champ
    window._calcPickTgt = function(c) {
        _calcTgtChamp = raw.find(function(x){ return x.name===c.name; });
        if(!_calcTgtChamp) return;
        _calcTgtLvl = +document.getElementById('calcTgtLvlSlider').value || 1;
        document.getElementById('calcTgtBadge').style.display = 'flex';
        document.getElementById('calcTgtIcon').src = champIcon(c.name);
        document.getElementById('calcTgtName').textContent = c.name;
        document.getElementById('calcTgtLvlWrap').style.display = 'block';
        calcTgtLvlChange();
    };
    window.calcClearTgt = function() {
        _calcTgtChamp = null;
        document.getElementById('calcTgtBadge').style.display = 'flex';
        document.getElementById('calcTgtIcon').src = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Sion.png';
        document.getElementById('calcTgtName').innerHTML = t('🪆 Манекен');
        document.getElementById('calcTgtLvlWrap').style.display = 'none';
        document.getElementById('cTgtArmor').value = '100';
        document.getElementById('cTgtHpMax').value = '2000';
        document.getElementById('cTgtHpCur').value = '2000';
        calcRun();
    };
    window.calcTgtLvlChange = function() {
        _calcTgtLvl = +document.getElementById('calcTgtLvlSlider').value;
        document.getElementById('calcTgtLvlNum').textContent = _calcTgtLvl;
        if(_calcTgtChamp) {
            var f = function(b,g){ return Math.round(b+(_calcTgtLvl-1)*g); };
            document.getElementById('cTgtArmor').value = f(_calcTgtChamp.ar_b, _calcTgtChamp.ar_g);
            var hp = f(_calcTgtChamp.hp_b, _calcTgtChamp.hp_g);
            document.getElementById('cTgtHpMax').value = hp;
            document.getElementById('cTgtHpCur').value = hp;
        }
        calcRun();
    };

    // Counter animation for damage number
    var _dmgAnimPrev = 0, _dmgAnimRaf = null;
    function animateDmgVal(target) {
        var el = document.getElementById('rDmg');
        if (!el) return;
        var start = _dmgAnimPrev;
        var end = Math.round(target);
        if (_dmgAnimRaf) cancelAnimationFrame(_dmgAnimRaf);
        if (Math.abs(end - start) < 2) { el.textContent = end; _dmgAnimPrev = end; return; }
        var startTs = null, dur = 280;
        function step(ts) {
            if (!startTs) startTs = ts;
            var p = Math.min((ts - startTs) / dur, 1);
            var e = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(start + (end - start) * e);
            if (p < 1) { _dmgAnimRaf = requestAnimationFrame(step); }
            else {
                el.textContent = end;
                el.classList.remove('pop');
                void el.offsetWidth; // reflow to restart
                el.classList.add('pop');
                _dmgAnimPrev = end;
            }
        }
        _dmgAnimRaf = requestAnimationFrame(step);
    }

    // Main calc
    window.calcRun = function() {
        var ad = (+document.getElementById('cMyAD').value||0) + (+document.getElementById('cMyADBonus').value||0);
        var pen = +document.getElementById('cMyPen').value || 0;
        var armor = (+document.getElementById('cTgtArmor').value||0) + (+document.getElementById('cTgtArmorBonus').value||0);
        var hpMax = (+document.getElementById('cTgtHpMax').value||0) + (+document.getElementById('cTgtHpBonus').value||0);
        var res = document.getElementById('calcRes');
        if(!ad) { res.style.display='none'; return; }
        var effArmor = armor > 0 ? armor*(1-pen/100) : armor;
        var finalDmg = ad * 100/(100+effArmor);
        var mit = ad > 0 ? ((ad-finalDmg)/ad*100) : 0;
        document.getElementById('rEff').textContent = Math.round(effArmor*10)/10;
        document.getElementById('rMit').textContent = mit.toFixed(1)+'%';
        animateDmgVal(finalDmg);
        document.getElementById('rFormula').textContent = ad+' × 100/(100+'+Math.round(effArmor*10)/10+') = '+Math.round(finalDmg);
        if(hpMax > 0) {
            var pct = Math.min(100, finalDmg/hpMax*100);
            document.getElementById('rHpBar').style.display = 'block';
            document.getElementById('rHpFill').style.width = pct.toFixed(1)+'%';
            document.getElementById('rHpPct').textContent = pct.toFixed(1)+'% HP';
        } else { document.getElementById('rHpBar').style.display = 'none'; }
        res.style.display = 'flex';
    };

    // ═══ ITEM CALC MENU ═══



    // ═══ ITEM CALC MODALS ═══
    // Clamp input to min/max
    window.clampInput = function(el) {
        var v = +el.value;
        if(el.min !== '' && v < +el.min) el.value = el.min;
        if(el.max !== '' && v > +el.max) el.value = el.max;
    };

    window.openItemCalc = function(key) {
        var ITEMS = {
            thornmail: {
                name:t('\ud83d\udee1 Шипованный доспех'), desc:t('Отражает маг. урон атакующему + Тяжкие раны'),
                needsRange: false,
                fields: [
                    {id:'ic_myArmor',label:t('Моя броня'),ph:'100',side:'my'},
                    {id:'ic_myBonusHp',label:t('Мой бонусный HP'),ph:'500',side:'my'},
                    {id:'ic_eMR',label:t('МС врага'),ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var a=+v('ic_myArmor')||100, h=+v('ic_myBonusHp')||500, mr=+v('ic_eMR')||40;
                    var raw=20+a*0.06+h*0.02;
                    var real=raw*100/(100+mr);
                    return {label:t('Отражённый маг. урон (после МС)'),val:Math.round(real),
                        formula:t('Сырой: ')+Math.round(raw)+' \u2192 '+t('после ')+mr+t(' МС: ')+Math.round(real)+t('. Тяжкие раны 60% 3с')};
                }
            },
            botrk: {
                name:t('\u2694 Клинок Погибшего Короля'), desc:t('% текущего HP врага (физ.)'),
                needsRange: true,
                hasHitBtn: true,
                fields: [
                    {id:'ic_eHpCur',label:t('Текущий HP цели'),ph:'2500',side:'enemy'},
                    {id:'ic_eArmor',label:t('Броня врага'),ph:'100',side:'enemy'},
                    {id:'ic_ePen',label:t('% пробив. брони'),ph:'0',side:'enemy',min:0,max:100}
                ],
                calc: function(v){
                    var hp=+v('ic_eHpCur')||2500, ar=+v('ic_eArmor')||100, pen=+v('ic_ePen')||0;
                    var rng=_calcRange==='ranged';
                    var pct=rng?0.07:0.10;
                    var raw=Math.max(15, hp*pct);
                    var effAr=ar>0?ar*(1-pen/100):ar;
                    var real=raw*100/(100+effAr);
                    return {label:t(rng?'Дальний 7%':'Ближний 10%'),val:Math.round(real),
                        formula:t('Сырой: ')+Math.round(raw)+t(' → эфф. броня ')+Math.round(effAr)+t(' → урон: ')+Math.round(real),
                        rawDmg:Math.round(real), hpField:'ic_eHpCur'};
                }
            },
            sunfire: {
                name:t('\ud83d\udd25 Эгида Солнечного огня'), desc:t('Маг. урон/с рядом с врагами'),
                needsRange: false,
                fields: [
                    {id:'ic_myBHp2',label:t('Мой бонусный HP'),ph:'1000',side:'my'},
                    {id:'ic_stacks',label:t('Стаки (0-4)'),ph:'4',side:'my',min:0,max:4},
                    {id:'ic_eLvl',label:t('Уровень врага'),ph:'10',side:'enemy',min:1,max:15},
                    {id:'ic_eMR2',label:t('МС врага'),ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var bHp=+v('ic_myBHp2')||1000, st=Math.min(4,+v('ic_stacks')||4), lv=+v('ic_eLvl')||10, mr=+v('ic_eMR2')||40;
                    var base=Math.round(16+(30-16)*(lv-1)/14);
                    var raw=(base+bHp*0.01)*(1+st*0.11);
                    var real=raw*100/(100+mr);
                    return {label:t('Маг. урон/сек (после МС)'),val:Math.round(real),
                        formula:t('Сырой: ')+Math.round(raw)+' \u2192 '+t('после ')+mr+' МС: '+Math.round(real)};
                }
            },
            liandry: {
                name:t('\ud83d\udd2e Мучения Лиандри'), desc:t('% макс. HP/с маг. ожог (скейлится до 3%)'),
                needsRange: false,
                hasLiandryPct: true,
                fields: [
                    {id:'ic_eHpMaxL',label:t('Макс HP цели'),ph:'3000',side:'enemy'},
                    {id:'ic_eMR3',label:t('МС врага'),ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var hp=+v('ic_eHpMaxL')||3000, mr=+v('ic_eMR3')||40;
                    var pct=window._liandryPct||0.5;
                    var raw=hp*(pct/100)*3;
                    var real=raw*100/(100+mr);
                    return {label:'Burn '+pct+'%/s 3s (after MR)',val:Math.round(real),
                        formula:hp+'\u00d7'+pct+'%\u00d73с = '+Math.round(raw)+' \u2192 '+t('после ')+mr+' МС: '+Math.round(real)};
                }
            },
            sunderer: {
                name:t('\u26a1 Божественный Разрушитель'), desc:t('Физ. удар + хил'),
                needsRange: true,
                fields: [
                    {id:'ic_myAD2',label:t('Мой базовый AD'),ph:'120',side:'my'},
                    {id:'ic_eHpMaxS',label:t('Макс HP цели'),ph:'3000',side:'enemy'},
                    {id:'ic_eArmorS',label:t('Броня врага'),ph:'100',side:'enemy'},
                    {id:'ic_ePenS',label:t('% пробив. брони'),ph:'0',side:'enemy',min:0,max:100}
                ],
                calc: function(v){
                    var ad=+v('ic_myAD2')||120, rng=_calcRange==='ranged', hp=+v('ic_eHpMaxS')||3000, ar=+v('ic_eArmorS')||100, pen=+v('ic_ePenS')||0;
                    var pctDmg=hp*(rng?0.07:0.10);
                    var minDmg=ad*1.25;
                    var raw=Math.max(pctDmg,minDmg);
                    var effAr=ar>0?ar*(1-pen/100):ar;
                    var real=raw*100/(100+effAr);
                    var heal=Math.max(hp*(rng?0.025:0.06), ad*(rng?0.5:0.9));
                    return {label:t(rng?'Дальн.':'Ближн.')+t(' (после брони)'),val:Math.round(real),
                        formula:t('Сырой: ')+Math.round(raw)+t(' → эфф. броня ')+Math.round(effAr)+t(' → урон: ')+Math.round(real),
                        healVal:Math.round(heal)};
                }
            }
        };
        var item = ITEMS[key]; if(!item) return;
        function v(id){ var el=document.getElementById(id); return el?el.value:'0'; }

        var box = document.getElementById('itemSubTitle');
        box.innerHTML = item.name+'<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">'+item.desc+'</div>';

        // Range toggle
        var rangeEl = document.getElementById('icRangeBlock');
        if(rangeEl) rangeEl.style.display = item.needsRange ? 'flex' : 'none';

        // Build fields
        var myDiv=document.getElementById('itemSubMyFields');
        var enDiv=document.getElementById('itemSubEnemyFields');
        myDiv.innerHTML=''; enDiv.innerHTML='';
        var hasMy=false, hasEn=false;
        item.fields.forEach(function(f){
            var target = f.side==='my' ? myDiv : enDiv;
            if(f.side==='my') hasMy=true; else hasEn=true;
            var minAttr = f.min !== undefined ? ' min="'+f.min+'"' : ' min="0"';
            var maxAttr = f.max !== undefined ? ' max="'+f.max+'"' : '';
            target.innerHTML += '<div class="calc-field" style="margin-bottom:8px;"><label class="calc-label">'+f.label+'</label>'
                +'<input type="number" id="'+f.id+'" placeholder="'+f.ph+'" class="calc-input" style="padding:8px 10px;"'+minAttr+maxAttr+' oninput="clampInput(this);runItemCalc(\''+key+'\')"></div>';
        });
        document.getElementById('icMySection').style.display = hasMy ? 'block' : 'none';
        document.getElementById('icEnSection').style.display = hasEn ? 'block' : 'none';

        // Show/hide Liandry % selector
        var lpBlock = document.getElementById('icLiandryPct');
        if(lpBlock) lpBlock.style.display = item.hasLiandryPct ? 'block' : 'none';
        if(item.hasLiandryPct) { window._liandryPct = 0.5; }

        // Show/hide BotRK hit button + reset combat state
        var hitBlock = document.getElementById('icHitBtn');
        if(hitBlock) hitBlock.style.display = item.hasHitBtn ? 'block' : 'none';
        var combatBlock = document.getElementById('icCombatBlock');
        if(combatBlock) combatBlock.style.display = 'none';
        var combatLog = document.getElementById('icCombatLog');
        if(combatLog) combatLog.innerHTML = '';
        _hitCount = 0;

        // Hide heal block initially
        var healBlock = document.getElementById('icHealResult');
        if(healBlock) healBlock.style.display = 'none';

        var resDiv = document.getElementById('itemSubResult');
        if(resDiv) resDiv.style.display = 'none';
        document.getElementById('itemSubModal')._calcKey = key;
        document.getElementById('itemSubModal')._calcFn = item.calc;
        openModal('itemSubModal');
        setTimeout(function(){ runItemCalc(key); }, 100);
    };

    window.closeItemCalc = function() { closeModal('itemSubModal'); };
    window.openItemCalcMenu = function() { openModal('itemCalcMenuMask'); };
    window.closeItemCalcMenu = function() { closeModal('itemCalcMenuMask'); };

    window.runItemCalc = function(key) {
        var modal = document.getElementById('itemSubModal');
        var calcFn = modal ? modal._calcFn : null;
        if(!calcFn) return;
        function gv(id){ var el=document.getElementById(id); return el?el.value:'0'; }
        var res = calcFn(gv);
        document.getElementById('itemSubResult').style.display = 'block';
        document.getElementById('itemSubResultLabel').textContent = res.label;
        document.getElementById('itemSubResultVal').textContent = res.val;
        document.getElementById('itemSubFormula').textContent = res.formula||'';
        // Heal display (sunderer)
        var healBlock = document.getElementById('icHealResult');
        if(healBlock) {
            if(res.healVal) { healBlock.style.display='block'; healBlock.querySelector('span').textContent='+'+res.healVal+' HP'; }
            else healBlock.style.display='none';
        }
    };

    // BotRK combat simulation
    var _hitCount = 0;
    var _hitStartHp = 0;

    window.icHit = function() {
        var modal = document.getElementById('itemSubModal');
        if(!modal || !modal._calcFn) return;
        function gv(id){ var el=document.getElementById(id); return el?el.value:'0'; }
        var hpEl = document.getElementById('ic_eHpCur');
        if(!hpEl) return;
        var curHp = +hpEl.value || 0;
        if(curHp <= 0) return;
        // Save start HP on first hit
        if(_hitCount === 0) _hitStartHp = curHp;
        var res = modal._calcFn(gv);
        if(!res.rawDmg) return;
        var dmg = res.rawDmg;
        var newHp = Math.max(0, curHp - dmg);
        _hitCount++;
        hpEl.value = Math.round(newHp);
        runItemCalc(modal._calcKey);
        // Update combat log
        var log = document.getElementById('icCombatLog');
        var hpBar = document.getElementById('icHpBarFill');
        var hpText = document.getElementById('icHpText');
        var hitNum = document.getElementById('icHitNum');
        if(log) {
            var entry = document.createElement('div');
            entry.style.cssText='display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;';
            entry.innerHTML='<span style="color:rgba(255,255,255,0.4);">'+t('Удар #')+_hitCount+'</span><span style="color:#ff6b6b;font-weight:700;">-'+dmg+' HP</span><span style="color:rgba(255,255,255,0.5);">'+Math.round(newHp)+' HP</span>';
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        if(hpBar && _hitStartHp > 0) {
            var pct = Math.max(0, newHp / _hitStartHp * 100);
            hpBar.style.width = pct + '%';
            hpBar.style.background = pct > 60 ? '#2ecc71' : pct > 30 ? '#f1c40f' : '#e74c3c';
        }
        if(hpText) hpText.textContent = Math.round(newHp) + ' / ' + _hitStartHp + ' HP';
        if(hitNum) hitNum.textContent = _hitCount + t(' ударов');
        // Show combat block
        var cb = document.getElementById('icCombatBlock');
        if(cb) cb.style.display = 'block';
        // Dead?
        if(newHp <= 0) {
            var entry2 = document.createElement('div');
            entry2.style.cssText='text-align:center;padding:6px 0;font-size:13px;font-weight:900;color:#e74c3c;';
            entry2.textContent=t('☠ УБИТ за ')+_hitCount+t(' ударов');
            if(log) log.appendChild(entry2);
        }
    };

    window.icResetHp = function() {
        var hpEl = document.getElementById('ic_eHpCur');
        if(hpEl && _hitStartHp > 0) hpEl.value = _hitStartHp;
        _hitCount = 0;
        var log = document.getElementById('icCombatLog');
        if(log) log.innerHTML = '';
        var cb = document.getElementById('icCombatBlock');
        if(cb) cb.style.display = 'none';
        runItemCalc(document.getElementById('itemSubModal')._calcKey);
    };

    // Liandry % selector
    window.setLiandryPct = function(pct) {
        window._liandryPct = pct;
        document.querySelectorAll('.lp-btn').forEach(function(b){
            var active = +b.dataset.pct === pct;
            b.classList.toggle('lp-btn-v2--active', active);
            // legacy inline style cleanup
            b.style.background = ''; b.style.borderColor = ''; b.style.color = '';
        });
        var modal = document.getElementById('itemSubModal');
        if(modal && modal._calcKey) runItemCalc(modal._calcKey);
    };

    window.setCalcRange = function(type) {
        _calcRange = type;
        var m=document.getElementById('icBtnMelee'), r=document.getElementById('icBtnRanged');
        if(m){ m.classList.toggle('ic-range-btn-v2--active', type==='melee'); m.style.background=''; m.style.borderColor=''; m.style.color=''; }
        if(r){ r.classList.toggle('ic-range-btn-v2--active', type==='ranged'); r.style.background=''; r.style.borderColor=''; r.style.color=''; }
        var modal = document.getElementById('itemSubModal');
        if(modal && modal._calcKey) runItemCalc(modal._calcKey);
    };

        // ITEMS
    window.closeItems = function() {
        closeModal('itemsMask');
        var tip=document.getElementById('itemTooltip');
        if(tip) tip.style.display='none';
    };

    // RUNES
    window.openRunes = function() {
        openModal('runesMask');
        setTimeout(function() {
            document.querySelectorAll('#runesMask .rune-card[data-tip]').forEach(function(card) {
                if(card._clickInit) return;
                card._clickInit = true;
                card.style.cursor = 'pointer';
                card.addEventListener('click', function() {
                    var parts = (card.getAttribute('data-tip')||'').split('\xA6');
                    var lang = window._lang || localStorage.getItem('wr_lang') || 'ru';
                    var descEn = card.getAttribute('data-desc-en') || '';
                    var descRu = card.getAttribute('data-desc-ru') || parts[3] || parts[2] || '';
                    var desc = (lang === 'en' && descEn) ? descEn : descRu;
                    var imgSrc = card.querySelector('img') ? card.querySelector('img').src : '';
                    openRuneDetail(parts[0]||'', parts[1]||'', desc, imgSrc);
                });
            });
            ICD_enhancePicker('runesMask', true);
        }, 80);
    };
    window.closeRunes = function() {
        closeModal('runesMask');
    };

    window.openRuneDetail = function(name, type, desc, imgSrc) {
        var modal = document.getElementById('runeDetailModal');
        var box = document.getElementById('runeDetailContent');
        if(!modal || !box) return;
        var key = ICD_RUNE_BY_SLUG[ICD_slugOf(imgSrc)];
        ICD_box = 'runeDetailContent';
        ICD_cur = key ? ICD_entOfRune(ICD_RUNES[key], imgSrc) : ICD_entOfRuneRaw(name, type, desc, imgSrc);
        ICD_tab = 'stats';
        ICD_render();
        openModal('runeDetailModal');
    };
    window.closeRuneDetail = function() { closeModal('runeDetailModal'); };

    // TIER LIST
    var _tierType = 'champs';
    var _tierRole = 'all';
    var _TIER_KEYS = ['S+','S','A','B','C','D'];
    var _TIER_COLORS = {'S+':'#FF3A3A','S':'#C43A3A','A':'#C46A1C','B':'#BC9800','C':'#1E8848','D':'#555566'};
    var _TIER_ROLES_LIST = ['all','adc','mid','top','jungle','sup'];
    function _emptyTierRole(){var o={};_TIER_KEYS.forEach(function(k){o[k]=[];});return o;}
    var TIER_DATA = {};
    _TIER_ROLES_LIST.forEach(function(r){TIER_DATA[r]=_emptyTierRole();});
    function loadTierData(){
        try{
            var saved=JSON.parse(localStorage.getItem('tierData')||'{}');
            _TIER_ROLES_LIST.forEach(function(r){
                if(saved[r]) _TIER_KEYS.forEach(function(k){if(Array.isArray(saved[r][k])) TIER_DATA[r][k]=saved[r][k];});
            });
        }catch(e){}
    }
    function saveTierData(){ try{localStorage.setItem('tierData',JSON.stringify(TIER_DATA));}catch(e){} }
    loadTierData();

    // ITEM & RUNE TIER DATA
    var _ITEM_CATS = [
        {k:'all',l:'Все',icon:'🌐'},{k:'physical',l:'Физические',icon:'⚔'},
        {k:'magic',l:'Магические',icon:'🔮'},{k:'defensive',l:'Защитные',icon:'🛡'},
        {k:'support',l:'Поддержка',icon:'💛'},{k:'boots',l:'Ботинки',icon:'👟'},
        {k:'enchants',l:'Зачарования',icon:'✨'}
    ];
    var _tierItemCat = 'all'; // current tab in item tierlist
    var _RUNE_CATS = [{k:'keystone',l:'Основные',icon:'⭐'},{k:'secondary',l:'Второстепенные',icon:'🔴'}];
    var _tierRuneCat = 'keystone';
    var ITEM_TIER_DATA = {};  // {catKey: {S:[],A:[],...}}
    var RUNE_TIER_DATA = {};  // {runeCatKey: {S:[],A:[],...}}
    _ITEM_CATS.forEach(function(c){ ITEM_TIER_DATA[c.k]=_emptyTierRole(); });
    _RUNE_CATS.forEach(function(c){ RUNE_TIER_DATA[c.k]=_emptyTierRole(); });
    function loadItemTierData(){
        try{
            var s=JSON.parse(localStorage.getItem('itemTierData')||'{}');
            _ITEM_CATS.forEach(function(c){
                if(s[c.k]) _TIER_KEYS.forEach(function(k){ if(Array.isArray(s[c.k][k])) ITEM_TIER_DATA[c.k][k]=s[c.k][k]; });
            });
        }catch(e){}
    }
    function loadRuneTierData(){
        try{
            var s=JSON.parse(localStorage.getItem('runeTierData')||'{}');
            _RUNE_CATS.forEach(function(c){
                if(s[c.k]) _TIER_KEYS.forEach(function(k){ if(Array.isArray(s[c.k][k])) RUNE_TIER_DATA[c.k][k]=s[c.k][k]; });
            });
        }catch(e){}
    }
    function saveItemTierData(){ try{localStorage.setItem('itemTierData',JSON.stringify(ITEM_TIER_DATA));}catch(e){} }
    function saveRuneTierData(){ try{localStorage.setItem('runeTierData',JSON.stringify(RUNE_TIER_DATA));}catch(e){} }
    loadItemTierData(); loadRuneTierData();

    /* ── Источники предметов/рун нужны и тир-мейкеру (вид «Тир-лист»).
       Владелец один — эта коробка; наружу отдаём только читалки и списки
       категорий, чтобы вид не заводил свой дубль реестра. ── */
    window.TierSources = {
        items: function(){ return getItemsByCat(); },
        runes: function(){ return getRunesByCat(); },
        itemCats: _ITEM_CATS,
        runeCats: _RUNE_CATS
    };

    // Map each category to items in DOM (lazy, built once per session)
    var _itemsByCat = null;
    function getItemsByCat(){
        // CMS override: если данные загружены из Firestore
        if (window.cmsGetItemsByCat) {
            var cmsResult = window.cmsGetItemsByCat();
            if (cmsResult) { _itemsByCat = cmsResult; return _itemsByCat; }
        }
        if(_itemsByCat) return _itemsByCat;
        _itemsByCat = {all:[],physical:[],magic:[],defensive:[],support:[],boots:[],enchants:[]};
        // Category headers contain keywords we match against
        var catKeywords = [
            {k:'physical', words:['Физическ']},
            {k:'magic',    words:['Магическ']},
            {k:'defensive',words:['Защитн']},
            {k:'support',  words:['Поддержк']},
            {k:'boots',    words:['Ботинк']},
            {k:'enchants', words:['Зачарован']}
        ];
        var curCat = 'physical';
        var itemsMask = document.getElementById('itemsMask');
        if(!itemsMask) return _itemsByCat;
        // Walk all children: look for section headers and item-cards
        itemsMask.querySelectorAll('.items-section-label, .item-card').forEach(function(el){
            if(el.classList.contains('item-card')){
                var tip=el.getAttribute('data-tip')||'';
                var name=tip.split('\xa6')[0].trim();
                var img=el.querySelector('img');
                if(!name||!img) return;
                var entry={name:name, img:img.getAttribute('src')||img.src||''};
                _itemsByCat.all.push(entry);
                if(!_itemsByCat[curCat]) _itemsByCat[curCat]=[];
                _itemsByCat[curCat].push(entry);
            } else {
                var txt=el.textContent.trim();
                catKeywords.forEach(function(ck){
                    ck.words.forEach(function(w){ if(txt.indexOf(w)!==-1) curCat=ck.k; });
                });
            }
        });
        return _itemsByCat;
    }

    // Extract rune data from DOM split by category (lazy)
    var _runesData = null;
    var _runesByCat = null;
    function getRunesByCat(){
        // CMS override
        if (window.cmsGetRunesByCat) {
            var cmsResult = window.cmsGetRunesByCat();
            if (cmsResult) { _runesByCat = cmsResult; return _runesByCat; }
        }
        if(_runesByCat) return _runesByCat;
        _runesByCat = {keystone:[], secondary:[]};
        // runeGridKeystone = основные; all other rune-grids = второстепенные
        var keystoneGrid = document.getElementById('runeGridKeystone');
        if(keystoneGrid){
            keystoneGrid.querySelectorAll('.rune-card').forEach(function(card){
                var tip=card.getAttribute('data-tip')||'';
                var name=tip.split('\u00a6')[0].trim();
                var img=card.querySelector('img');
                if(name&&img) _runesByCat.keystone.push({name:name,img:img.getAttribute('src')||img.src||''});
            });
        }
        document.querySelectorAll('#runesMask .rune-grid').forEach(function(grid){
            if(grid.id==='runeGridKeystone') return;
            grid.querySelectorAll('.rune-card').forEach(function(card){
                var tip=card.getAttribute('data-tip')||'';
                var name=tip.split('\u00a6')[0].trim();
                var img=card.querySelector('img');
                if(name&&img) _runesByCat.secondary.push({name:name,img:img.getAttribute('src')||img.src||''});
            });
        });
        return _runesByCat;
    }
    function getRunesData(){
        // CMS override
        if (window.cmsGetRunesData) {
            var cmsResult = window.cmsGetRunesData();
            if (cmsResult) { _runesData = cmsResult; return _runesData; }
        }
        if(_runesData) return _runesData;
        _runesData=[];
        document.querySelectorAll('#runesMask .rune-card').forEach(function(card){
            var tip=card.getAttribute('data-tip')||'';
            var name=tip.split('\u00a6')[0].trim();
            var img=card.querySelector('img');
            if(name&&img) _runesData.push({name:name,img:img.getAttribute('src')||img.src||''});
        });
        return _runesData;
    }

    var _tierEditMode = false;
    var _tierPCMode = (function(){try{return localStorage.getItem('tierlistLayoutMode')==='columns';}catch(e){return false;}})();
    window.toggleTierlistEdit = function(){
        _tierEditMode = !_tierEditMode;
        var btn=document.getElementById('tierlistEditBtn');
        if(btn){
            btn.textContent=_tierEditMode?t('✓ Готово'):t('✏ Изменить');
            btn.style.background=_tierEditMode?'var(--sel-hover)':'rgba(255,215,0,0.08)';
            btn.style.borderColor=_tierEditMode?'var(--sel-strong)':'rgba(255,215,0,0.4)';
            btn.style.color=_tierEditMode?'var(--sel-text)':'#FFD700';
        }
        renderTierlist();
    };

    window.toggleTierlistPCMode = function(){
        _tierPCMode = !_tierPCMode;
        try{localStorage.setItem('tierlistLayoutMode',_tierPCMode?'columns':'rows');}catch(e){}
        var btn=document.getElementById('tierlistPCBtn');
        if(btn){
            btn.textContent=_tierPCMode?'☰ Строки':'⊞ Колонки';
            btn.style.background=_tierPCMode?'rgba(100,180,255,0.22)':'rgba(100,180,255,0.08)';
            btn.style.borderColor=_tierPCMode?'rgba(100,180,255,0.8)':'rgba(100,180,255,0.4)';
        }
        renderTierlist();
    };

    var ROLES = [
        {key:'all',label:'\u0412\u0441\u0435',icon:'\uD83C\uDF0D'},
        {key:'adc',label:'ADC',icon:'\uD83C\uDFF9'},
        {key:'mid',label:'Mid',icon:'\u26A1'},
        {key:'top',label:'Top',icon:'\uD83D\uDEE1'},
        {key:'jungle',label:'Jungle',icon:'\uD83C\uDF3F'},
        {key:'sup',label:'Support',icon:'\uD83D\uDC9B'}
    ];
    window.openTierlist = function(type) {
        type = type||'champs';
        // Чемпионский тир → инлайн-вид (порт lab-main), а НЕ старая фуллскрин-модалка.
        if (type === 'champs' && window.switchMainView) {
            if (window.closeTierlistMenu) window.closeTierlistMenu();
            window.switchMainView('tier');
            return;
        }
        _tierType = type;
        _tierEditMode = false;
        _tierRole = 'all';
        _tierItemCat = 'all';
        _tierRuneCat = 'keystone';
        var titles={champs:t('🏆 Тир-лист чемпионов'), items:t('⚙ Тир-лист предметов'), runes:t('✨ Тир-лист рун')};
        var tEl=document.getElementById('tierlistTitle');
        if(tEl) tEl.textContent=titles[_tierType]||t('Тир-лист');
        var editBtn=document.getElementById('tierlistEditBtn');
        if(editBtn){ editBtn.style.display=''; editBtn.textContent=t('✏ Изменить'); editBtn.style.background='rgba(255,215,0,0.08)'; editBtn.style.borderColor='rgba(255,215,0,0.4)'; editBtn.style.color='#FFD700'; }
        var pcBtn=document.getElementById('tierlistPCBtn');
        if(pcBtn){
            pcBtn.style.display='';
            pcBtn.textContent=_tierPCMode?'☰ Строки':'⊞ Колонки';
            pcBtn.style.background=_tierPCMode?'rgba(100,180,255,0.22)':'rgba(100,180,255,0.08)';
            pcBtn.style.borderColor=_tierPCMode?'rgba(100,180,255,0.8)':'rgba(100,180,255,0.4)';
        }
        openModal('tierlistMask');
        buildTierlistTabs();
        renderTierlist();
    };
    window.closeTierlist = function() { closeModal('tierlistMask'); };

    // Поделиться текущим тир-листом как PNG-карточкой (share.js).
    window.shareTierlist = function() {
        if (!window.exportShareCard) { showToast(t('Модуль шеринга не загружен')); return; }
        var tData, imgFn, title, subtitle;
        if (_tierType === 'items') {
            tData = ITEM_TIER_DATA[_tierItemCat] || ITEM_TIER_DATA.all;
            var allItems = getItemsByCat().all;
            imgFn = function(n) { var f = allItems.find(function(x){ return x.name === n; }); return f ? f.img : ''; };
            title = t('Тир-лист предметов');
            var ic = _ITEM_CATS.find(function(c){ return c.k === _tierItemCat; });
            subtitle = ic ? t(ic.l) : '';
        } else if (_tierType === 'runes') {
            tData = RUNE_TIER_DATA[_tierRuneCat] || RUNE_TIER_DATA.keystone;
            var runesD = getRunesData();
            imgFn = function(n) { var f = runesD.find(function(x){ return x.name === n; }); return f ? f.img : ''; };
            title = t('Тир-лист рун');
            var rc = _RUNE_CATS.find(function(c){ return c.k === _tierRuneCat; });
            subtitle = rc ? t(rc.l) : '';
        } else {
            tData = TIER_DATA[_tierRole] || TIER_DATA.all;
            imgFn = function(n) { return champIcon(n); };
            title = t('Тир-лист чемпионов');
            var rl = ROLES.find(function(r){ return r.key === _tierRole; });
            subtitle = (rl && rl.key !== 'all') ? rl.label : t('Все роли');
        }
        // Проверяем что хоть что-то есть
        var total = 0;
        _TIER_KEYS.forEach(function(tk){ total += (tData[tk] || []).length; });
        if (!total) { showToast(t('Тир-лист пуст — нечего шарить')); return; }

        var tiers = _TIER_KEYS.map(function(tk) {
            return {
                label: tk,
                color: _TIER_COLORS[tk],
                items: (tData[tk] || []).map(function(n) {
                    return { img: imgFn(n), name: n };
                })
            };
        });
        window.exportShareCard({
            title: title,
            subtitle: subtitle,
            mode: 'tier',
            tiers: tiers,
            fileName: 'wr-tierlist-' + (_tierType === 'champs' ? _tierRole
                       : _tierType === 'items' ? _tierItemCat : _tierRuneCat)
        });
    };

    window.openTierlistMenu = function() { openModal('tierlistMenuMask'); };
    window.closeTierlistMenu = function() { closeModal('tierlistMenuMask'); };
    window.openTierlistFromMenu = function(type) {
        var map = {champs:'tierChamps', items:'tierItems', runes:'tierRunes'};
        var isPc = window.matchMedia('(min-width: 769px)').matches;
        var panel = document.getElementById('sidePanel');
        var sidebarIsOpen = panel && panel.classList.contains('open');
        if (isPc && sidebarIsOpen) {
            sidebarOpen(map[type] || type);
        } else {
            openTierlist(type);
        }
    };
    function buildTierlistTabs() {
        var el=document.getElementById('tierlistTabs'); if(!el) return;
        el.innerHTML='';
        if(_tierType==='champs'){
            ROLES.forEach(function(r){
                var b=document.createElement('button');
                var active=r.key===_tierRole;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid '+(active?'var(--sel-border-act)':'var(--sel-border)')+';background:'+(active?'var(--sel-act)':'var(--sel-bg-faint)')+';color:'+(active?'#fff':'rgba(255,255,255,0.55)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=r.icon+' '+r.label;
                b.onclick=function(){_tierRole=r.key;buildTierlistTabs();renderTierlist();};
                el.appendChild(b);
            });
        } else if(_tierType==='items'){
            _ITEM_CATS.forEach(function(c){
                var b=document.createElement('button');
                var active=c.k===_tierItemCat;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid rgba(255,215,0,'+(active?'0.7':'0.2')+');background:rgba(255,215,0,'+(active?'0.18':'0.05')+');color:'+(active?'#FFD700':'rgba(255,255,255,0.5)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=c.icon+' '+t(c.l);
                b.onclick=function(){_tierItemCat=c.k;buildTierlistTabs();renderTierlist();};
                el.appendChild(b);
            });
        } else if(_tierType==='runes'){
            _RUNE_CATS.forEach(function(c){
                var b=document.createElement('button');
                var active=c.k===_tierRuneCat;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid '+(active?'var(--sel-border-act)':'var(--sel-border)')+';background:'+(active?'var(--sel-act)':'var(--sel-bg-faint)')+';color:'+(active?'#fff':'rgba(255,255,255,0.5)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=c.icon+' '+t(c.l);
                b.onclick=function(){_tierRuneCat=c.k;buildTierlistTabs();renderTierlist();};
                el.appendChild(b);
            });
        }
    }
    function renderTierlist() {
        var el=document.getElementById('tierlistContent'); if(!el) return;
        var tData, pickerType, imgFn, addFn, removeFn;
        if(_tierType==='items'){
            tData=ITEM_TIER_DATA[_tierItemCat]||ITEM_TIER_DATA.all;
            pickerType='items';
            imgFn=function(n){var all=getItemsByCat().all,f=all.find(function(x){return x.name===n;});return f?f.img:'';};
            addFn=addToItemTier; removeFn=removeFromItemTier;
        } else if(_tierType==='runes'){
            tData=RUNE_TIER_DATA[_tierRuneCat]||RUNE_TIER_DATA.keystone;
            pickerType='runes';
            imgFn=function(n){var d=getRunesData(),f=d.find(function(x){return x.name===n;});return f?f.img:'';};
            addFn=addToRuneTier; removeFn=removeFromRuneTier;
        } else {
            tData=TIER_DATA[_tierRole]||TIER_DATA.all;
            pickerType='champs';
            imgFn=function(n){return champIcon(n);};
            addFn=function(tier,name){addToTier(_tierRole,tier,name);}; removeFn=function(tier,name){removeFromTier(_tierRole,tier,name);};
        }
        // Scale down icons on mobile
        var isMobile = window.innerWidth <= 768;
        var scale = isMobile ? 0.7 : 1;
        var lblSize = Math.round(54 * scale);
        var iconSize = Math.round(50 * scale);
        var lblFontSize = Math.round(17 * scale);
        var lblRadius = Math.round(10 * scale);
        var iconRadius = Math.round(8 * scale);
        var cdMinHeight = Math.round(60 * scale);
        el.innerHTML='';
        var isPCColumns = _tierPCMode && !isMobile;
        el.style.cssText = isPCColumns ? 'display:flex;flex-direction:row;gap:8px;align-items:flex-start;overflow-x:auto;padding-bottom:8px;' : '';
        _TIER_KEYS.forEach(function(tk){
            var color=_TIER_COLORS[tk];
            var row=document.createElement('div');
            if(isPCColumns){
                row.style.cssText='display:flex;flex-direction:column;align-items:stretch;flex:1;min-width:'+(iconSize*3+30)+'px;';
            } else {
                row.style.cssText='display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;';
            }
            var lbl=document.createElement('div');
            var lblEditExtra = _tierEditMode ? 'box-shadow:0 0 0 2px rgba(255,215,0,0.7),0 0 14px rgba(255,215,0,0.35);cursor:pointer;transition:box-shadow 0.15s;' : '';
            if(isPCColumns){
                lbl.style.cssText='width:100%;height:'+lblSize+'px;display:flex;align-items:center;justify-content:center;border-radius:'+lblRadius+'px;font-size:'+lblFontSize+'px;font-weight:900;background:linear-gradient(135deg,'+color+'cc,'+color+'88);color:#fff;margin-bottom:6px;'+lblEditExtra;
            } else {
                lbl.style.cssText='width:'+lblSize+'px;min-width:'+lblSize+'px;height:'+lblSize+'px;display:flex;align-items:center;justify-content:center;border-radius:'+lblRadius+'px;font-size:'+lblFontSize+'px;font-weight:900;background:linear-gradient(135deg,'+color+'cc,'+color+'88);color:#fff;flex-shrink:0;margin-top:3px;'+lblEditExtra;
            }
            lbl.textContent=tk;
            if(_tierEditMode){
                (function(tierKey,td,af,rf,pt){lbl.onclick=function(){
                    var roleFilter = (pt==='champs' && _tierRole!=='all') ? _tierRole : 'all';
                    openChampPicker(['🏆','⚙','✨'][['champs','items','runes'].indexOf(pt)]+' '+t('Тир')+' '+tierKey,
                    function(c){
                        af(tierKey,c.name);
                        champPickerBuildGrid();
                    },{
                        multi:true, type:pt,
                        defaultRole: roleFilter,
                        itemCat: pt==='items' ? _tierItemCat : pt==='runes' ? _tierRuneCat : 'all',
                        getSelected:function(){return td[tierKey]||[];},
                        getExcluded:function(){var e2=[];_TIER_KEYS.forEach(function(ot){if(ot!==tierKey)(td[ot]||[]).forEach(function(n){e2.push(n);});});return e2;},
                        onRemove:function(c){rf(tierKey,c.name);champPickerBuildGrid();}
                    });
                };}(tk,tData,addFn,removeFn,pickerType));
            }
            var cd=document.createElement('div');
            cd.className='tier-drop-zone';
            cd.dataset.tier=tk;
            if(isPCColumns){
                cd.style.cssText='display:flex;flex-wrap:wrap;gap:5px;align-items:flex-start;align-content:flex-start;justify-content:flex-start;padding:5px;background:rgba(255,255,255,0.02);border-radius:8px;min-height:'+cdMinHeight+'px;flex:1;';
            } else {
                cd.style.cssText='display:flex;flex-wrap:wrap;gap:5px;flex:1;align-items:center;padding:5px;background:rgba(255,255,255,0.02);border-radius:8px;min-height:'+cdMinHeight+'px;';
            }
            (tData[tk]||[]).forEach(function(cname){
                var chip=document.createElement('div');
                chip.className='tier-chip';
                chip.dataset.name=cname;
                chip.style.cssText='position:relative;display:inline-block;cursor:'+(_tierEditMode?'grab':'default')+';';
                var img=document.createElement('img');
                img.style.cssText='width:'+iconSize+'px;height:'+iconSize+'px;border-radius:'+iconRadius+'px;object-fit:cover;display:block;pointer-events:none;';
                img.src=imgFn(cname); img.alt=img.title=cname;
                img.onerror=function(){this.style.display='none';};
                chip.appendChild(img);
                if(_tierEditMode){
                    var xBtn=document.createElement('div');
                    xBtn.style.cssText='position:absolute;top:-5px;right:-5px;width:16px;height:16px;background:#e74c3c;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;z-index:1;font-weight:900;line-height:1;';
                    xBtn.textContent='×';
                    (function(t,n,rf){xBtn.onclick=function(e){e.stopPropagation();rf(t,n);};}(tk,cname,removeFn));
                    chip.appendChild(xBtn);
                }
                cd.appendChild(chip);
            });
            if(!(tData[tk]||[]).length){var ph=document.createElement('span');ph.style.cssText='font-size:11px;color:rgba(255,255,255,0.15);padding:4px;';ph.textContent='—';cd.appendChild(ph);}
            row.appendChild(lbl); row.appendChild(cd);
            el.appendChild(row);
        });

        // Sortable.js: enable drag&drop between tiers (only in edit mode)
        if (window.Sortable && _tierEditMode) {
            el.querySelectorAll('.tier-drop-zone').forEach(function(zone){
                if (zone._sortable) zone._sortable.destroy();
                zone._sortable = new window.Sortable(zone, {
                    group: 'tier-' + _tierType,
                    animation: 90,
                    ghostClass: 'tier-chip-ghost',
                    chosenClass: 'tier-chip-chosen',
                    dragClass:   'tier-chip-drag',
                    forceFallback: true,
                    fallbackOnBody: true,
                    delay: 80,
                    delayOnTouchOnly: true,
                    onEnd: function(evt){
                        var fromTier = evt.from.dataset.tier;
                        var toTier   = evt.to.dataset.tier;
                        var name     = evt.item.dataset.name;
                        if (!fromTier || !toTier || !name) return;
                        if (fromTier === toTier) return;
                        if (_tierType === 'items') {
                            removeFromItemTier(fromTier, name);
                            addToItemTier(toTier, name);
                        } else if (_tierType === 'runes') {
                            removeFromRuneTier(fromTier, name);
                            addToRuneTier(toTier, name);
                        } else {
                            removeFromTier(_tierRole, fromTier, name);
                            addToTier(_tierRole, toTier, name);
                        }
                    }
                });
            });
        }
    }
    function addToTier(role,tier,name){
        _TIER_KEYS.forEach(function(tk){ if(tk!==tier) TIER_DATA[role][tk]=(TIER_DATA[role][tk]||[]).filter(function(n){return n!==name;}); });
        if((TIER_DATA[role][tier]||[]).indexOf(name)===-1){ if(!TIER_DATA[role][tier]) TIER_DATA[role][tier]=[]; TIER_DATA[role][tier].push(name); }
        saveTierData(); renderTierlist();
    }
    function removeFromTier(role,tier,name){
        if(TIER_DATA[role]&&TIER_DATA[role][tier]) TIER_DATA[role][tier]=TIER_DATA[role][tier].filter(function(n){return n!==name;});
        saveTierData(); renderTierlist();
    }
    function addToItemTier(tier,name){
        var cat=_tierItemCat;
        if(!ITEM_TIER_DATA[cat]) ITEM_TIER_DATA[cat]=_emptyTierRole();
        // Remove from all tiers in this category
        _TIER_KEYS.forEach(function(tk){if(tk!==tier)ITEM_TIER_DATA[cat][tk]=(ITEM_TIER_DATA[cat][tk]||[]).filter(function(n){return n!==name;});});
        if((ITEM_TIER_DATA[cat][tier]||[]).indexOf(name)===-1){if(!ITEM_TIER_DATA[cat][tier])ITEM_TIER_DATA[cat][tier]=[];ITEM_TIER_DATA[cat][tier].push(name);}
        // Also sync to 'all' category
        if(cat!=='all'){
            if(!ITEM_TIER_DATA.all) ITEM_TIER_DATA.all=_emptyTierRole();
            _TIER_KEYS.forEach(function(tk){if(tk!==tier)ITEM_TIER_DATA.all[tk]=(ITEM_TIER_DATA.all[tk]||[]).filter(function(n){return n!==name;});});
            if((ITEM_TIER_DATA.all[tier]||[]).indexOf(name)===-1){if(!ITEM_TIER_DATA.all[tier])ITEM_TIER_DATA.all[tier]=[];ITEM_TIER_DATA.all[tier].push(name);}
        }
        saveItemTierData(); renderTierlist();
    }
    function removeFromItemTier(tier,name){
        var cat=_tierItemCat;
        if(ITEM_TIER_DATA[cat]&&ITEM_TIER_DATA[cat][tier]) ITEM_TIER_DATA[cat][tier]=ITEM_TIER_DATA[cat][tier].filter(function(n){return n!==name;});
        if(cat!=='all'&&ITEM_TIER_DATA.all&&ITEM_TIER_DATA.all[tier]) ITEM_TIER_DATA.all[tier]=ITEM_TIER_DATA.all[tier].filter(function(n){return n!==name;});
        saveItemTierData(); renderTierlist();
    }
    function addToRuneTier(tier,name){
        var cat=_tierRuneCat;
        if(!RUNE_TIER_DATA[cat]) RUNE_TIER_DATA[cat]=_emptyTierRole();
        _TIER_KEYS.forEach(function(tk){if(tk!==tier)RUNE_TIER_DATA[cat][tk]=(RUNE_TIER_DATA[cat][tk]||[]).filter(function(n){return n!==name;});});
        if((RUNE_TIER_DATA[cat][tier]||[]).indexOf(name)===-1){if(!RUNE_TIER_DATA[cat][tier])RUNE_TIER_DATA[cat][tier]=[];RUNE_TIER_DATA[cat][tier].push(name);}
        saveRuneTierData(); renderTierlist();
    }
    function removeFromRuneTier(tier,name){
        var cat=_tierRuneCat;
        if(RUNE_TIER_DATA[cat]&&RUNE_TIER_DATA[cat][tier]) RUNE_TIER_DATA[cat][tier]=RUNE_TIER_DATA[cat][tier].filter(function(n){return n!==name;});
        saveRuneTierData(); renderTierlist();
    }

    // SIDE CHAMPIONS
    var SC_ROLES=[{key:'all',label:'\u0412\u0441\u0435'},{key:'ADC',label:'ADC'},{key:'Mid',label:'Mid'},{key:'Top',label:'Top'},{key:'Jungle',label:'Jungle'},{key:'Support',label:'Support'}];
    var _scRole='all';
    window.openSideChamps = function() {
        openModal('sideChampsMask');
        var rf=document.getElementById('scRoleFilter');
        if(rf&&!rf.children.length){
            // "Все" button on its own row
            var allBtn=document.createElement('button');
            allBtn.style.cssText='padding:7px 16px;border-radius:18px;border:1.5px solid var(--sel-border-med);background:var(--sel-bg-faint);color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;cursor:pointer;width:100%;';
            allBtn.textContent=SC_ROLES[0].label; allBtn.dataset.key=SC_ROLES[0].key;
            allBtn.onclick=function(){_scRole='all';scHighlightRole();scBuildGrid();};
            rf.appendChild(allBtn);
            // 5 roles in a row
            var rolesRow=document.createElement('div');
            rolesRow.style.cssText='display:flex;gap:5px;';
            SC_ROLES.slice(1).forEach(function(r){
                var b=document.createElement('button');
                b.style.cssText='flex:1;padding:7px 4px;border-radius:18px;border:1.5px solid var(--sel-border-med);background:var(--sel-bg-faint);color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;cursor:pointer;text-align:center;';
                b.textContent=r.label; b.dataset.key=r.key;
                b.onclick=function(){_scRole=r.key;scHighlightRole();scBuildGrid();};
                rolesRow.appendChild(b);
            });
            rf.appendChild(rolesRow);
        }
        scHighlightRole(); scBuildGrid();
    };
    function scHighlightRole(){
        var rf=document.getElementById('scRoleFilter'); if(!rf) return;
        // Highlight "Все" button (first child)
        var allB=rf.children[0];
        if(allB&&allB.dataset){
            var aa=allB.dataset.key===_scRole;
            allB.style.borderColor=aa?'var(--sel-text)':'var(--sel-border-med)';
            allB.style.background=aa?'var(--sel-act)':'var(--sel-bg-faint)';
            allB.style.color=aa?'#fff':'rgba(255,255,255,0.6)';
        }
        // Highlight role buttons (inside second child div)
        var row=rf.children[1];
        if(row) Array.from(row.children).forEach(function(b){
            var a=b.dataset.key===_scRole;
            b.style.borderColor=a?'var(--sel-text)':'var(--sel-border-med)';
            b.style.background=a?'var(--sel-act)':'var(--sel-bg-faint)';
            b.style.color=a?'#fff':'rgba(255,255,255,0.6)';
        });
    }
    function scBuildGrid(){
        var grid=document.getElementById('scGrid'); if(!grid||!raw.length) return;
        var q=((document.getElementById('scSearch')||{}).value||'').toLowerCase();
        var filtered=raw.filter(function(c){
            if(q&&!c.name.toLowerCase().includes(q)) return false;
            if(_scRole!=='all'&&!c.is[_scRole]) return false;
            return true;
        });
        grid.innerHTML='';
        var DD='https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
        filtered.forEach(function(ch){
            var div=document.createElement('div');
            div.className='pick-card';
            div.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px;border-radius:10px;border:2px solid transparent;transition:all 0.15s;';
            div.onmouseenter=function(){div.style.borderColor='var(--sel-text)';div.style.background='var(--sel-dim)';};
            div.onmouseleave=function(){div.style.borderColor='transparent';div.style.background='';};
            var thumb=document.createElement('div');
            thumb.className='pick-thumb';
            thumb.style.cssText='width:100%;aspect-ratio:1;border-radius:8px;';
            var img=document.createElement('img');
            img.src=champIcon(ch.name);
            img.style.cssText='width:100%;height:100%;border-radius:8px;object-fit:cover;display:block;';
            img.onerror=function(){this.src='';this.style.background='var(--sel-placeholder)';};
            thumb.appendChild(img);
            var lbl=document.createElement('div');
            lbl.style.cssText='font-size:8px;color:rgba(255,255,255,0.55);text-align:center;line-height:1.15;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;';
            lbl.textContent=ch.name;
            div.appendChild(thumb); div.appendChild(lbl);
            div.onclick=function(){window.openChampPage(ch.name);};
            // Patch dot in champ list + tooltip
            var pI = patchMap[ch.name];
            if(pI) {
                div.style.position = 'relative';
                var dt = document.createElement('div');
                dt.className = 'patch-dot ' + pI.type;
                div.appendChild(dt);
                (function(pi, el){
                    el.addEventListener('mouseenter', function(e){ showGlobalPatchTip(e, pi, el); });
                    el.addEventListener('mouseleave', function(){ var t=document.getElementById('patchTip'); if(t) t.remove(); });
                })(pI, div);
            }
            grid.appendChild(div);
        });
        if(!filtered.length) grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:rgba(255,255,255,0.3);">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>';
    }
    window.scFilter=function(){scBuildGrid();};
    window.closeSideChamps=function(){closeModal('sideChampsMask');};
    // Модалку чемпионов могли открыть до загрузки данных (raw пуст) — тогда грид
    // выходил пустым и оживал только после клика по фильтру. Дорисовываем сразу,
    // как только данные подъехали (событие champsLoaded), если модалка открыта.
    document.addEventListener('champsLoaded', function(){
        var m=document.getElementById('sideChampsMask');
        if(m&&m.classList.contains('active')) scBuildGrid();
    });
    /* ══════════════════════════════════════════════════════════════════════
       СТРАНИЦА ЧЕМПА (Э1.9) — вместо модалки champDetailMask (решение Р2).

       Клик по чемпу ВЕЗДЕ ведёт на СТРАНИЦУ по адресу `champions/<slug>/` —
       ту же самую, что видит поисковик. Разметку печатает champ-page.js, он же
       печатает статические файлы (см. seo/generate.mjs): страница ОДНА, просто
       здесь она рисуется без перезагрузки, а рельс сайта остаётся на месте (Р6).

       ЧТО ЗДЕСЬ СВЕРХ СТАТИКИ (в статике этого нет и быть не может):
         · личные матчапы (localStorage) + авто-матчапы из категорий + исключения;
         · кнопка «Патч-нот» для админа (window._isAdmin);
         · переход по чемпу без перезагрузки.

       АНТИДЁРГАНЬЕ: первый кадр рисуется из уже загруженных данных, догрузка
       (гайд/умения/качества/контры) обновляет страницу через labMorph — трогается
       только изменившееся, узлы живут. Ползунок уровня и вкладки умений вообще
       не пересобирают разметку (см. hydrate в champ-page.js).
       ══════════════════════════════════════════════════════════════════════ */
    var CP_LVL = 10;
    var _cpFetch = {};
    var _cpCur = null;             // какой чемп открыт сейчас
    var _cpPrevView = 'main';      // куда вернуться по «Назад»

    function cpJson(url) {
        if (!_cpFetch[url]) {
            _cpFetch[url] = fetch(url, { cache: 'force-cache' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .catch(function () { return null; });
        }
        return _cpFetch[url];
    }
    function cpNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
    function cpKey(name) { return cpNorm(champKey(name)); }

    var CP_ROLE_LBL = { Top: 'Топ', Jungle: 'Лес', Mid: 'Мид', ADC: 'Бот (стрелок)', Support: 'Поддержка' };
    var CP_RANKS = [['алмаз', 'Алмаз+'], ['мастер', 'Мастер+'], ['чалик', 'Челленджер'], ['суверен', 'Суверен'], ['все', 'Все ранги']];
    var CP_ROLE_RU = { top: 'Топ', jungle: 'Лес', mid: 'Мид', adc: 'Бот', support: 'Поддержка' };

    /* Мета и таблица по рангам — из WR_DATA (снимок wr-stats.json). Тот же
       источник, что у вида WinRate и у статической страницы: один человек не
       должен видеть на двух экранах разные проценты. */
    function cpWr(name) {
        var k = cpKey(name), rows = [], meta = null;
        var W = window.WR_DATA || {};
        CP_RANKS.forEach(function (r) {
            var block = W[r[0]];
            if (!block) return;
            Object.keys(block).forEach(function (role) {
                (block[role] || []).forEach(function (e) {
                    if (cpKey(e.name) !== k) return;
                    rows.push({ rank: r[1], role: CP_ROLE_RU[role] || role, wr: e.wr, pr: e.pr });
                    if (!meta || r[0] === 'все') meta = { tier: e.tier, wr: e.wr, pr: e.pr, br: e.br, trend: e.ch };
                });
            });
        });
        return { rows: rows, meta: meta };
    }

    /* Теги категорий чемпа (Firestore CMS) — со звёздами, как в старой карточке. */
    function cpTags(name) {
        var cats = window._champCategories || [];
        return cats.filter(function (c) {
            if (c.champStars) {
                return [1, 2, 3].some(function (s) { return (c.champStars[String(s)] || []).indexOf(name) !== -1; });
            }
            return (c.champions || []).indexOf(name) !== -1;
        }).map(function (cat) {
            var star = 0;
            if (cat.champStars) [1, 2, 3].forEach(function (s) { if ((cat.champStars[String(s)] || []).indexOf(name) !== -1) star = s; });
            return { name: cat.name + (star ? ' ' + '★'.repeat(star) : '') };
        });
    }

    /* Догрузка того, чего нет в памяти приложения. Файлы кэшируются браузером,
       второй заход на страницу чемпа сети не трогает. */
    function cpParts(name) {
        var k = cpKey(name);
        return Promise.all([
            cpJson('data-pipeline/champion-abilities.json'),
            cpJson('data-pipeline/champion-qualities.json'),
            cpJson('data-pipeline/counters.json'),
            window.ChampGuides ? window.ChampGuides.load(name).catch(function () { return null; }) : Promise.resolve(null)
        ]).then(function (r) {
            var abRoot = r[0], qlRoot = r[1], cnRoot = r[2], guide = r[3] || null;
            var ab = abRoot && (abRoot.champions || []).filter(function (c) { return cpNorm(c.dd || c.en) === k; })[0];
            var ql = qlRoot && (qlRoot.champions || []).filter(function (q) { return cpNorm(q.id || q.name) === k; })[0];
            var cnEntry = null;
            if (cnRoot && cnRoot.champions) {
                Object.keys(cnRoot.champions).forEach(function (n) { if (cpKey(n) === k) cnEntry = cnRoot.champions[n]; });
            }
            /* Имена соседних чемпов — ПО-РУССКИ (ddragon ru_RU в champion-abilities),
               иначе на одной странице соседствовали «Мисс Фортуна» и «Samira».
               Заодно ищем имя в таблице сайта — по нему строится иконка и ссылка. */
            var ruBySlug = {}, rowBySlug = {};
            (abRoot && abRoot.champions || []).forEach(function (c) {
                if (c && c.dd) ruBySlug[ChampPage.slugify(c.dd)] = c.ru || c.en || c.dd;
            });
            raw.forEach(function (x) { rowBySlug[ChampPage.slugify(x.name)] = x.name; });
            var nameOf = function (m) {
                var en = rowBySlug[m.slug] || '';
                return { name: ruBySlug[m.slug] || en || ChampPage.prettyCaps(m.name), en: en };
            };
            return {
                abil: ab || null, qual: ql || null, guide: guide,
                cnt: ChampPage.mergeCounters(cnEntry, function (s) {
                    return ruBySlug[s] || rowBySlug[s] || ChampPage.unslug(s);
                }),
                mu: ChampPage.pickMatchups(guide, nameOf)
            };
        });
    }

    function cpData(name, parts) {
        parts = parts || {};
        var champ = raw.filter(function (x) { return x.name === name; })[0] || {};
        var wr = cpWr(name);
        var roles = [];
        Object.keys(CP_ROLE_LBL).forEach(function (kk) { if (champ.is && champ.is[kk]) roles.push(CP_ROLE_LBL[kk]); });
        var ab = parts.abil;
        return ChampPage.buildData({
            name: name,
            ru: (ab && ab.ru) || name,
            en: (ab && ab.en) || name,
            slug: ChampPage.slugify(name),
            icon: champIcon(name),
            roles: roles,
            row: champ,
            meta: wr.meta,
            wrRanks: wr.rows,
            qual: parts.qual || null,
            abils: (ab && ab.abilities) || [],
            guide: parts.guide || null,
            mu: parts.mu || null,
            counters: parts.cnt || null,
            patch: (window.patchMap || {})[name] || null,
            tags: cpTags(name)
        });
    }

    /* ── ЛИЧНЫЕ + АВТО МАТЧАПЫ (то, чего нет в статике) ──────────────────────
       Ручной список — localStorage (как было), авто — из категорий чемпа.
       Клик по авто-чемпу открывает ЕГО страницу (ЗАКОН СВЯЗЕЙ), крестик у авто
       добавляет исключение — обе механики перенесены из старой карточки. */
    var CP_MU_SECS = [
        { key: 'strongVs', title: 'Силён против', pick: 'Силён против' },
        { key: 'weakVs', title: 'Слаб против', pick: 'Слаб против' },
        { key: 'combos', title: 'Комбо', pick: 'Комбо с' }
    ];
    function cpDerived(name) {
        var out = { strongVs: [], weakVs: [], combos: [] };
        var allCats = window._champCategories || [];
        if (!allCats.length) return out;
        var mine = allCats.filter(function (c) { return (c.champions || []).indexOf(name) !== -1; });
        if (!mine.length) return out;
        var names = raw.map(function (c) { return c.name; });
        var push = function (list, cn) {
            if (cn === name) return;
            if (names.indexOf(cn) !== -1) { if (list.indexOf(cn) < 0) list.push(cn); return; }
            var tc = allCats.filter(function (x) { return x.name === cn || x._id === cn; })[0];
            if (tc) (tc.champions || []).forEach(function (x) { if (x !== name && list.indexOf(x) < 0) list.push(x); });
        };
        mine.forEach(function (cat) {
            (cat.strongAgainst || []).forEach(function (cn) { push(out.strongVs, cn); });
            (cat.weakAgainst || []).forEach(function (cn) { push(out.weakVs, cn); });
            (cat.combo || []).forEach(function (cn) { push(out.combos, cn); });
        });
        return out;
    }
    function cpChip(cn, isAuto, onX) {
        var chip = document.createElement('span');
        chip.className = 'cp-own-chip' + (isAuto ? ' is-auto' : '');
        var img = document.createElement('img');
        img.src = champIcon(cn);
        img.title = cn + (isAuto ? ' (авто)' : '');
        img.loading = 'lazy';
        img.onerror = function () { window._champImgError(this, cn); };
        img.onclick = function (e) { e.stopPropagation(); window.openChampPage(cn); };
        chip.appendChild(img);
        var x = document.createElement('span');
        x.className = 'cp-own-x';
        x.textContent = '×';
        x.title = isAuto ? 'Убрать из авто-списка' : 'Удалить';
        x.onclick = function (e) { e.stopPropagation(); onX(); };
        chip.appendChild(x);
        return chip;
    }
    function cpRenderOwn(pane, name) {
        var host = pane.querySelector('[data-own]');
        if (!host) return;
        host.hidden = false;
        host.textContent = '';
        var derived = cpDerived(name);
        CP_MU_SECS.forEach(function (s) {
            var wrap = document.createElement('div');
            var head = document.createElement('div');
            head.className = 'cp-sub';
            head.textContent = 'Мой список · ' + s.title;
            wrap.appendChild(head);
            var box = document.createElement('div');
            box.className = 'cp-own-box';
            var manual = s.key === 'strongVs' ? getStrongVs(name) : s.key === 'weakVs' ? getWeakVs(name) : getCombos(name);
            manual.forEach(function (cn) {
                box.appendChild(cpChip(cn, false, function () { removeFrom(name, s.key, cn); cpRenderOwn(pane, name); }));
            });
            derived[s.key].forEach(function (cn) {
                if (manual.indexOf(cn) !== -1 || isExcluded(name, s.key, cn)) return;
                box.appendChild(cpChip(cn, true, function () { addExclusion(name, s.key, cn); cpRenderOwn(pane, name); }));
            });
            var add = document.createElement('button');
            add.type = 'button';
            add.className = 'cp-own-add';
            add.textContent = '+';
            add.title = 'Добавить чемпиона';
            add.onclick = function () {
                openChampPicker(t(s.pick), function (c) {
                    var cur = s.key === 'strongVs' ? getStrongVs(name) : s.key === 'weakVs' ? getWeakVs(name) : getCombos(name);
                    if (cur.length >= 7) return;
                    addTo(name, s.key, c.name);
                    cpRenderOwn(pane, name);
                    champPickerBuildGrid();
                }, {
                    multi: true,
                    getSelected: function () { return s.key === 'strongVs' ? getStrongVs(name) : s.key === 'weakVs' ? getWeakVs(name) : getCombos(name); },
                    getExcluded: function () { return [name]; },
                    onRemove: function (c) { removeFrom(name, s.key, c.name); cpRenderOwn(pane, name); champPickerBuildGrid(); }
                });
            };
            box.appendChild(add);
            wrap.appendChild(box);
            host.appendChild(wrap);
        });
    }

    /* Админ: правка патч-нота прямо со страницы (было в старой карточке). */
    function cpRenderAdmin(pane, name) {
        var host = pane.querySelector('[data-admin]');
        if (!host) return;
        host.textContent = '';
        if (!(window._isAdmin && window.cmsOpenPatchnoteEditor)) { host.hidden = true; return; }
        host.hidden = false;
        var pd = (window.patchMap || {})[name];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cms-patch-btn';
        b.textContent = (pd ? '✏ ' : '➕ ') + t('Патч-нот');
        b.onclick = function () {
            var existing = pd && pd._id ? { _id: pd._id, champion: name, type: pd.type, change: pd.change, patch: pd.patch } : null;
            window.cmsOpenPatchnoteEditor(name, existing);
        };
        host.appendChild(b);
    }

    function cpPaneEl() { return window._viewPane ? window._viewPane('champ') : null; }

    function cpRender(name, parts) {
        var pane = cpPaneEl();
        if (!pane) return;
        var d = cpData(name, parts);
        var html = ChampPage.renderHTML(d, {
            mode: 'spa',
            level: CP_LVL,
            iconOf: function (m) { return champIcon(m.en || m.name); }
        });
        labMorph(pane, html);
        ChampPage.hydrate(pane, d, {
            onChamp: function (n) { window.openChampPage(n); },
            calc: function () { if (window.sidebarOpen) window.sidebarOpen('calc'); },
            tier: function () { window.switchMainView('tier'); },
            cmp: function () { cmpStart(name); },
            share: function () {
                if (window.chatShareChampion) window.chatShareChampion(name);
                else if (window.sidebarOpen) window.sidebarOpen('globalChat');
            }
        });
        cpRenderOwn(pane, name);
        cpRenderAdmin(pane, name);
        /* Морф страницы стирает гнездо сравнения (в свежей разметке оно пустое) —
           если таблица открыта ЗДЕСЬ же, печатаем её обратно. */
        if (_cmpPlace === 'inline' && _cmpList.length) cmpRender();
    }

    /* ══ СРАВНЕНИЕ ЧЕМПОВ ══════════════════════════════════════════════════
       Таблицу печатает champ-page.js (renderCompareHTML) — тот же модуль, что
       печатает всю страницу. Здесь только СБОРКА данных из живого состояния
       приложения и то, чего у статики нет: общий пикер, переходы, выбор места.

       ГДЕ ЖИВЁТ ТАБЛИЦА — на тумблере, Эржан выбирает живьём:
         · 'view'   (A) — свой вид `cmp`: рельс на месте, полная ширина под 6 колонок;
         · 'inline' (Б) — секция во всю ширину под раскладкой страницы чемпа.
       Механика вида — та же, что у самой страницы чемпа (_viewPane + switchMainView),
       новых способов открывать экраны не заводим. Дизайн-полоса на боевом временная:
       выбор сделан → полоса и проигравший вариант удаляются.                    */
    var _cmpList = [];        // имена чемпов В СРАВНЕНИИ (ключи таблицы сайта)
    var _cmpFrom = null;      // с чьей страницы пришли (кнопка «Назад»)
    var _cmpRu = null;        // карта русских имён (подъезжает вместе с умениями)
    var _cmpStripMin = false;
    var _cmpPlace = 'view';
    try { _cmpPlace = localStorage.getItem('cmpPlace') || 'view'; } catch (e) {}

    /* Русские имена соседних чемпов берём из того же champion-abilities.json,
       что и вся страница (файл кэширован — второй заход сети не трогает). */
    function cmpRuMap() {
        if (_cmpRu) return Promise.resolve(_cmpRu);
        return cpJson('data-pipeline/champion-abilities.json').then(function (root) {
            var m = {};
            ((root && root.champions) || []).forEach(function (c) {
                if (c) m[cpNorm(c.dd || c.en)] = c.ru || c.en || c.dd;
            });
            _cmpRu = m;
            return m;
        });
    }
    /* Тот же buildData, что у страницы — своей формы данных у сравнения нет. */
    function cmpData(name) {
        var d = cpData(name, {});
        var ru = _cmpRu && _cmpRu[cpKey(name)];
        if (ru) d.ru = ru;
        return d;
    }

    function cmpSlotEl() {
        var pane = cpPaneEl();
        return pane ? pane.querySelector('[data-cmp-slot]') : null;
    }
    function cmpHostEl() {
        if (_cmpPlace === 'inline') {
            var slot = cmpSlotEl();
            if (slot) slot.hidden = false;
            return slot;
        }
        return window._viewPane ? window._viewPane('cmp') : null;
    }
    /* В области ВСЕГДА одна таблица: место сменилось — прошлое гнездо чистим. */
    function cmpClear(place) {
        var host = place === 'inline' ? cmpSlotEl() : (window._viewPane ? window._viewPane('cmp') : null);
        if (!host) return;
        host.textContent = '';
        if (place === 'inline') host.hidden = true;
    }

    function cmpRender() {
        var host = cmpHostEl();
        if (!host || !_cmpList.length) return;
        var list = _cmpList.map(cmpData);
        var backName = _cmpFrom ? ((_cmpRu && _cmpRu[cpKey(_cmpFrom)]) || _cmpFrom) : '';
        labMorph(host, ChampPage.renderCompareHTML(list, {
            level: CP_LVL,
            strip: true,
            stripPlace: _cmpPlace,
            stripMin: _cmpStripMin,
            /* «Назад» нужен только отдельному виду: в секции чемп и так на экране */
            backLabel: (_cmpPlace === 'view' && backName) ? '← ' + backName : ''
        }));
        ChampPage.hydrateCompare(host, {
            level: function (lv) { CP_LVL = lv; },        /* уровень общий со страницей */
            onChamp: function (n) { window.openChampPage(n); },   /* ЗАКОН СВЯЗЕЙ */
            add: cmpOpenPicker,
            remove: cmpRemove,
            back: function () { if (_cmpFrom) window.openChampPage(_cmpFrom); },
            min: function () { _cmpStripMin = !_cmpStripMin; cmpRender(); },
            place: cmpSetPlace
        });
    }

    function cmpShow() {
        cmpRuMap().then(function () { if (_cmpList.length) cmpRender(); });
        cmpRender();
        if (_cmpPlace === 'view') window.switchMainView('cmp');
    }
    function cmpSetPlace(place) {
        if (place === _cmpPlace) return;
        cmpClear(_cmpPlace);
        _cmpPlace = place;
        try { localStorage.setItem('cmpPlace', place); } catch (e) {}
        /* Вариант Б печатается В страницу чемпа — значит она должна быть на экране. */
        if (place === 'inline' && _cmpFrom && cpVisibleView() !== 'champ') window.openChampPage(_cmpFrom);
        cmpShow();
    }
    function cmpRemove(name) {
        var i = _cmpList.indexOf(name);
        if (i < 0 || _cmpList.length < 2) return;
        _cmpList.splice(i, 1);
        cmpRender();
    }
    /* Добавление — ОБЩИЙ пикер сайта (тот же, что у списков матчапов). */
    function cmpOpenPicker() {
        openChampPicker(t('Добавить в сравнение'), function (c) {
            if (_cmpList.length >= ChampPage.CMP_MAX || _cmpList.indexOf(c.name) !== -1) return;
            _cmpList.push(c.name);
            cmpRender();
            champPickerBuildGrid();
        }, {
            multi: true,
            getSelected: function () { return _cmpList.slice(); },
            onRemove: function (c) { cmpRemove(c.name); champPickerBuildGrid(); }
        });
    }
    /* Кнопка «Сравнить» на странице чемпа. Чемп уже в списке — просто показываем
       таблицу, иначе начинаем с него и сразу спрашиваем, с кем сравнить. */
    function cmpStart(name) {
        _cmpFrom = name;
        var had = _cmpList.indexOf(name) !== -1;
        if (!had) _cmpList = [name];
        cmpShow();
        if (!had) cmpOpenPicker();
    }

    /* Какой вид сейчас на экране (нужно, чтобы вернуть человека туда, откуда пришёл). */
    function cpVisibleView() {
        var p = document.querySelector('.view-pane:not([hidden])');
        return p ? (p.getAttribute('data-view') || 'main') : 'main';
    }

    window.openChampPage = function (name, noPush) {
        if (!name) return;
        var was = cpVisibleView();
        if (was !== 'champ') _cpPrevView = was;
        _cpCur = name;

        // Пришли из модалки (пикер/список чемпов) — она уступает место странице.
        if (typeof closeAllModals === 'function') closeAllModals();

        cpRender(name, {});                       // 1) мгновенный кадр из того, что уже есть
        cpParts(name).then(function (parts) {     // 2) гайд/умения/качества/контры
            if (_cpCur !== name) return;          // человек уже ушёл — экран не трогаем
            cpRender(name, parts);
        });

        window.switchMainView('champ');
        if (!noPush) {
            try { history.pushState({ cp: name }, '', 'champions/' + ChampPage.slugify(name) + '/'); } catch (e) {}
        }
    };
    /* Старое имя держим: на него завязаны cms.js и внешние вызовы. */
    window.openChampDetail = function (name) { window.openChampPage(name); };
    window.closeChampPage = function () {
        _cpCur = null;
        window.switchMainView(_cpPrevView || 'main');
    };
    /* Зовёт switchMainView, когда человек ушёл со страницы вкладкой: адрес
       возвращаем на корень БЕЗ новой записи в истории (replaceState) — иначе
       кнопка «Назад» гоняла бы по пустым шагам. */
    window._cpLeftPage = function () {
        if (!_cpCur) return;
        _cpCur = null;
        try { history.replaceState(null, '', '/'); } catch (e) {}
    };

    /* «Назад» браузера: вернуться на вид, с которого ушли (модалок в этот момент
       нет — их стопка обрабатывается своим слушателем выше и молчит при пустом стеке). */
    window.addEventListener('popstate', function (e) {
        var st = e.state || {};
        if (st.cp) {
            if (st.cp !== _cpCur) window.openChampPage(st.cp, true);
            return;
        }
        if (cpVisibleView() === 'champ') window.closeChampPage();
    });

    /* Данные приехали позже открытия страницы — дорисовываем то, что изменилось. */
    document.addEventListener('champsLoaded', function () { if (_cpCur) cpRender(_cpCur, {}); });
    document.addEventListener('patchnotesLoaded', function () {
        if (!_cpCur) return;
        var pane = cpPaneEl();
        if (pane) { cpRenderAdmin(pane, _cpCur); cpParts(_cpCur).then(function (p) { if (_cpCur) cpRender(_cpCur, p); }); }
    });


    // ── Expose all global functions needed by inline onclick handlers ──
    window.openM = function() { openModal('mMask'); drawM(); };
    window.closeM = function() { closeModal('mMask'); };

    window.doSort = function(k) {
        if(sK === k) {
            sD = sD === 'desc' ? 'asc' : 'desc';
        } else {
            sK = k;
            sD = 'desc';
        }
        colFocus = true;
        render();
    };

    window.selectAll = function() {
        raw.forEach(x => selected.add(x.name));
        try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
        drawM(); render();
    };

    window.clearAll = function() {
        selected.clear();
        // Re-add champions that were moved to top (they survive clear)
        _movedToTop.forEach(function(n){ selected.add(n); });
        try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
        drawM(); render();
    };

    window.removeC = function(name) {
        selected.delete(name);
        _movedToTop.delete(name); // X button removes from moved-to-top too
        try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
        render();
    };

    // Move champion to top of table (sticky - not removed by Clear)
    var _movedToTop = new Set();
    window.moveToTop = function(name) {
        if(_movedToTop.has(name) || pinned.has(name)) {
            _movedToTop.delete(name);
            pinned.delete(name);
        } else {
            _movedToTop.add(name);
            if(!selected.has(name)) selected.add(name);
        }
        try { localStorage.setItem('p', JSON.stringify([...pinned])); } catch(e) {}
        try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
        render();
    };

    // Sidebar → modal → close modal → sidebar reopens
    var _sidebarModalId = null; // which MAIN modal was opened from sidebar
    var _pcSideMode = false;    // true when on PC sidebar stays open + modal to the right
    var _mainSidebarModals = ['sideChampsMask','calcMask','itemCalcMenuMask','itemsMask','runesMask','draftMask','draftCoopMask','tierlistMask','changesMask','cybersportMask'];

    var _sidebarModalMap = {
        'sideChamps':'sideChampsMask', 'calc':'calcMask', 'itemCalcMenu':'itemCalcMenuMask',
        'items':'itemsMask', 'runes':'runesMask', 'draft':'draftMask', 'draftCoop':'draftCoopMask',
        'tierChamps':'tierlistMask', 'tierItems':'tierlistMask', 'tierRunes':'tierlistMask',
        'tierMenu':'tierlistMenuMask', 'globalChat':'chatSystemMask',
        'users':'chatSystemMask', 'changes':'changesMask',
        'cybersport':'cybersportMask',
        /* Э1: 'drafterHub' тут НЕ БЫЛО — из-за этого _sidebarModalId оставался null,
           active-состояние кнопки и флаг data-toolopen не выставлялись. */
        'drafterHub':'drafterHubMask'
    };

    function _sidebarDoOpen(what) {
        switch(what) {
            case 'sideChamps': openSideChamps(); break;
            case 'calc': openCalc(); break;
            case 'itemCalcMenu': openItemCalcMenu(); break;
            case 'items': openItems(); break;
            case 'runes': openRunes(); break;
            case 'draft': openDraft(); break;
            case 'draftCoop': if(window.openDraftCoop)openDraftCoop(); break;
            case 'cybersport': if(window.openCybersport)openCybersport(); break;
            case 'tierChamps': openTierlist('champs'); break;
            case 'tierItems': openTierlist('items'); break;
            case 'tierRunes': openTierlist('runes'); break;
            case 'tierMenu': openTierlistMenu(); break;
            case 'globalChat': openChatSystem(); break;
            case 'users': openChatSystem('users'); break;
            case 'wrpr': window.switchMainView('wrpr'); break;
            case 'changes': if(window.openChanges) openChanges(); break;
            /* ★ ТИХИЙ ОБРЫВ (чинится здесь): ветки 'drafterHub' в switch НЕ БЫЛО.
               Кнопка «Драфтер» в рельсе зовёт sidebarOpen('drafterHub'), switch молча
               проваливался — ни модалки, ни ошибки в консоли. Фича была недоступна из UI
               целиком, хотя openDrafterHub() всё это время работал (проверено вызовом). */
            case 'drafterHub': if(window.openDrafterHub) openDrafterHub(); break;
        }
    }

    window.sidebarOpen = function(what) {
        var _catOverlay = document.getElementById('cmsCatEditorOverlay');
        if (_catOverlay) _catOverlay.remove();
        var isPc = _isSidebarPc();
        var panel = document.getElementById('sidePanel');
        // На ПК CSS всегда показывает сайдбар (transform:translateX(0) !important).
        // Класс 'open' мог быть снят renderDraftUi/renderReplay для fullscreen-режима драфта.
        // Восстанавливаем его здесь, чтобы _sidebarModalId-логика работала корректно.
        if (isPc && panel && !panel.classList.contains('open')) {
            panel.classList.add('open');
        }
        var sidebarIsOpen = panel && panel.classList.contains('open');

        if (isPc && sidebarIsOpen) {
            // PC mode: keep sidebar open, open modal to the RIGHT of sidebar
            if (_sidebarModalId && _pcSideMode) {
                document.body.classList.remove('pc-chat-mode');
                closeModal(_sidebarModalId, true); // skipSidebar: переключаем модалку, не реопеним sidebar
            }
            _pcSideMode = true;
            _sidebarModalId = _sidebarModalMap[what] || null;
            if (what === 'globalChat' || what === 'users') {
                document.body.classList.add('pc-chat-mode');
            }
            _sidebarDoOpen(what);
            // Подсвечиваем активную кнопку сайдбара
            _sidebarSetActive(what);
            // Раскрываем рельс + сдвигаем контент, если открыт инлайн-инструмент
            _syncToolOpenFlag();
            // ОДНА активность across рельс↔вкладки: инструмент-вид открыт → верхние
            // вкладки НЕ подсвечены (рельс владеет активностью). Снимаем .f-tab.active
            // и прячем скользящую пилюлю — но только если это инлайн-инструмент-вид
            // (не фуллскрин-драфтер, который флаг data-toolopen не ставит).
            if (document.documentElement.getAttribute('data-toolopen') === '1') {
                var _vt = document.getElementById('viewTabs');
                if (_vt) {
                    _vt.querySelectorAll('.f-tab.active').forEach(function(tb){ tb.classList.remove('active'); });
                    var _ind = _vt.querySelector('.f-ind');
                    if (_ind) _ind.style.opacity = '0';
                }
            }
            return;
        }

        // Mobile: закрываем сайдбар, открываем модалку обычно
        _pcSideMode = false;
        closeSidebar();
        _sidebarModalId = _sidebarModalMap[what] || null;
        _sidebarDoOpen(what);
    };


    // PC: инициализируем сайдбар как открытый с самого начала
    (function() {
        if (_isSidebarPc()) {
            var panel = document.getElementById('sidePanel');
            if (panel && !panel.classList.contains('open')) {
                panel.classList.add('open');
            }
        }
    })();

    window.toggleP = function(name) {
        if(pinned.has(name)) pinned.delete(name);
        else pinned.add(name);
        try { localStorage.setItem('p', JSON.stringify([...pinned])); } catch(e) {}
        render();
    };



    // Growth tooltip for stat cells
    const _uiTip = document.getElementById('uiTip');
    window.showT = function(ev, growthVal) {
        if(!_uiTip) return;
        _uiTip.textContent = '+' + (Math.round(growthVal * 10) / 10) + t(' за уровень');
        _uiTip.style.display = 'block';
        _uiTip.style.left = ev.clientX + 'px';
        _uiTip.style.top = ev.clientY + 'px';
    };
    window.moveT = function(ev) {
        if(!_uiTip) return;
        _uiTip.style.left = ev.clientX + 'px';
        _uiTip.style.top = (ev.clientY - 10) + 'px';
    };
    window.hideT = function() {
        if(_uiTip) _uiTip.style.display = 'none';
    };

    // ══════════════════════════════════════════
    // DRAFT SYSTEM
    // ══════════════════════════════════════════

    // Counter-pick & synergy data — Wild Rift
    // stars: 3=сильный контр/комбо, 2=хороший, 1=лёгкий перевес
    // ══════════════════════════════════════════
    // DRAFT SYSTEM — new slot-based layout
    // ══════════════════════════════════════════
    // Draft data from localStorage
    function getDraftData(name) {
        return {
            counters: getWeakVs(name).map(function(n){ return {n: n, s: 3}; }),
            synergies: getCombos(name).map(function(n){ return {n: n, s: 3}; })
        };
    }


    // ── Драфтер: единый вход → выбор режима (Соло / Серия) ──
    window.openDrafterHub = function() { openModal('drafterHubMask'); };
    window.closeDrafterHub = function() { closeModal('drafterHubMask'); };
    window.drafterPick = function(mode) {
        // openModal главной модалки заменяет стек → хаб закроется сам.
        // Идём через sidebarOpen чтобы корректно отработал PC side-mode / mobile.
        sidebarOpen(mode === 'solo' ? 'draft' : 'draftCoop');
    };

    // ══════════════════════════════════════════
    // СОЛО-ДРАФТ — тренажёр пиков (раскладка из lab-drafter, на стекле),
    // подсказки на реальном движке контрпиков/синергий (getDraftData).
    // ══════════════════════════════════════════
    var SOLO_ROLE_TABS = [
        {k:'Top',t:'Top'},{k:'Jungle',t:'Jng'},{k:'Mid',t:'Mid'},{k:'ADC',t:'Adc'},{k:'Support',t:'Sup'}
    ];
    var SOLO_SLOT_ROLES = ['Соло','Лес','Мид','АДК','Сап'];
    var _soloFill = 'me';
    var _soloRole = 'Top';
    var _solo = { me:[], opp:[] };

    function soloPort(name, extra) {
        return '<span class="dl-port'+(extra?' '+extra:'')+'"><img loading="lazy" decoding="async" src="'+champIcon(name)+'" alt="'+name+'" onerror="this.style.display=\'none\'"></span>';
    }
    function soloUsedSet() {
        var s = {};
        _solo.me.concat(_solo.opp).forEach(function(n){ s[n] = 1; });
        return s;
    }
    function soloColHtml(who) {
        var arr = _solo[who];
        var label = who==='me' ? t('Ты') : t('Соперник');
        var side = who==='me' ? 'blue' : 'red';
        var rows = '';
        for(var i=0;i<5;i++) {
            var n = arr[i];
            var active = !n && _soloFill===who && i===arr.length;
            rows += '<div class="dl-pick'+(active?' active':'')+'">'
                + (n ? soloPort(n) : '<span class="dl-pick-num">'+(i+1)+'</span>')
                + '<div class="dl-pick-meta"><span class="dl-pick-name">'+(n||'—')+'</span><span class="dl-pick-role">'+SOLO_SLOT_ROLES[i]+'</span></div>'
                + (n ? '<button class="dl-pick-x" data-soloremove="'+who+':'+i+'" title="'+t('Убрать')+'">×</button>' : '')
                + '</div>';
        }
        return '<div class="dl-side dl-side-'+side+' glass"><div class="dl-side-head"><span class="dl-side-dot"></span>'+label+'</div><div class="dl-picks">'+rows+'</div></div>';
    }
    function soloHintsHtml() {
        var used = soloUsedSet();
        var map = {}; // name -> {counter:[], syn:[], s:0}
        _solo.opp.forEach(function(n){
            var d = getDraftData(n); if(!d) return;
            (d.counters||[]).forEach(function(c){
                if(used[c.n]) return;
                if(!map[c.n]) map[c.n] = {counter:[],syn:[],s:0};
                map[c.n].counter.push(n); map[c.n].s = Math.max(map[c.n].s, c.s||1);
            });
        });
        _solo.me.forEach(function(n){
            var d = getDraftData(n); if(!d) return;
            (d.synergies||[]).forEach(function(sy){
                if(used[sy.n]) return;
                if(!map[sy.n]) map[sy.n] = {counter:[],syn:[],s:0};
                map[sy.n].syn.push(n); map[sy.n].s = Math.max(map[sy.n].s, sy.s||1);
            });
        });
        var list = Object.keys(map).map(function(n){ return {n:n, counter:map[n].counter, syn:map[n].syn, s:map[n].s}; });
        list.sort(function(a,b){ return (b.counter.length+b.syn.length+b.s) - (a.counter.length+a.syn.length+a.s); });
        list = list.slice(0,6);
        var body;
        if(!list.length) {
            body = '<div class="dl-hint-empty">'+t('Выбери чемпионов — появятся подсказки контрпиков и синергий')+'</div>';
        } else {
            body = list.map(function(x){
                var reason, tag;
                if(x.counter.length && x.syn.length) { reason = t('контрит')+' '+x.counter[0]+' · '+t('синергия')+' '+x.syn[0]; tag = '⚔'; }
                else if(x.counter.length) { reason = t('контрит')+' '+x.counter.join(', '); tag = '⚔'; }
                else { reason = t('синергия с')+' '+x.syn.join(', '); tag = '🔗'; }
                return '<div class="dl-hint" data-solopick="'+x.n+'">'+soloPort(x.n,'mini')
                    + '<div class="dl-hint-info"><b>'+x.n+'</b><span>'+reason+'</span></div>'
                    + '<span class="dl-hint-tag">'+tag+'</span></div>';
            }).join('');
        }
        return '<div class="dl-hints glass"><div class="dl-hints-h">💡 '+t('Подсказки')+'</div>'+body+'</div>';
    }
    function soloGridHtml() {
        var used = soloUsedSet();
        var list = raw.filter(function(c){ return c.is && c.is[_soloRole]; });
        return list.map(function(c){
            var u = !!used[c.name];
            return '<div class="dl-cell'+(u?' used':'')+'" data-solopick="'+c.name+'" title="'+c.name+'">'+soloPort(c.name)+'<span class="dl-cell-name">'+c.name+'</span></div>';
        }).join('');
    }
    function renderSolo() {
        var frame = document.getElementById('draftSoloFrame');
        if(!frame) return;
        var rolesBtns = SOLO_ROLE_TABS.map(function(rt){ return '<button class="'+(rt.k===_soloRole?'on':'')+'" data-solorole="'+rt.k+'">'+rt.t+'</button>'; }).join('');
        frame.innerHTML =
            '<div class="dl-hdr-solo">'
              + '<div class="dl-solo-title">🎯 '+t('Соло-тренировка')+'<span class="dl-solo-sub">'+t('тренируй пики — тул подсказывает контрпики и синергии')+'</span></div>'
              + '<div class="dl-solo-fill">'+t('Заполняю')+': <button class="dl-fillbtn'+(_soloFill==='me'?' on':'')+'" data-solofill="me">'+t('Ты')+'</button><button class="dl-fillbtn'+(_soloFill==='opp'?' on':'')+'" data-solofill="opp">'+t('Соперник')+'</button></div>'
              + '<button class="dl-cbtn" data-soloreset="1" title="'+t('Сброс')+'">↺</button>'
            + '</div>'
            + '<div class="dl-board dl-board-solo">'
              + soloColHtml('me')
              + '<div class="dl-center"><div class="dl-roles">'+rolesBtns+'</div>'
                + '<div class="dl-pool-wrap"><div class="dl-pool-main glass"><div class="dl-search">🔍 <input type="text" placeholder="'+t('Поиск чемпиона…')+'" id="draftSoloSearch"></div><div class="dl-grid" id="draftSoloGrid">'+soloGridHtml()+'</div></div>'+soloHintsHtml()+'</div>'
              + '</div>'
              + soloColHtml('opp')
            + '</div>';
        wireSolo();
    }
    function wireSolo() {
        var frame = document.getElementById('draftSoloFrame');
        if(!frame) return;
        frame.querySelectorAll('[data-solorole]').forEach(function(b){ b.onclick = function(){ _soloRole = b.getAttribute('data-solorole'); renderSolo(); }; });
        frame.querySelectorAll('[data-solofill]').forEach(function(b){ b.onclick = function(){ _soloFill = b.getAttribute('data-solofill'); renderSolo(); }; });
        frame.querySelectorAll('[data-solopick]').forEach(function(el){
            if(el.classList.contains('used')) return;
            el.onclick = function(){
                var n = el.getAttribute('data-solopick');
                if(_solo[_soloFill].length < 5 && _solo.me.concat(_solo.opp).indexOf(n) === -1) { _solo[_soloFill].push(n); renderSolo(); }
            };
        });
        frame.querySelectorAll('[data-soloremove]').forEach(function(el){
            el.onclick = function(e){ e.stopPropagation(); var p = el.getAttribute('data-soloremove').split(':'); _solo[p[0]].splice(parseInt(p[1],10),1); renderSolo(); };
        });
        var rs = frame.querySelector('[data-soloreset]');
        if(rs) rs.onclick = function(){ _solo = {me:[],opp:[]}; renderSolo(); };
        var search = document.getElementById('draftSoloSearch'), grid = document.getElementById('draftSoloGrid');
        if(search && grid) {
            search.oninput = function(){
                var q = search.value.trim().toLowerCase();
                grid.querySelectorAll('.dl-cell').forEach(function(c){
                    var nm = (c.getAttribute('data-solopick')||'').toLowerCase();
                    c.style.display = nm.indexOf(q) !== -1 ? '' : 'none';
                });
            };
        }
    }

    window.openDraft = function() {
        _solo = { me:[], opp:[] };
        _soloFill = 'me'; _soloRole = 'Top';
        openModal('draftMask');
        renderSolo();
    };
    window.closeDraft = function() { closeModal('draftMask'); };

    // ══ UNIVERSAL CHAMPION PICKER ══
    var _champPickerCallback = null;
    var _champPickerRole = 'all';
    var _champPickerMulti = false;
    var _champPickerGetSelected = null;
    var _champPickerGetExcluded = null;
    var _champPickerOnRemove = null;
    var _champPickerType = 'champs'; // 'champs' | 'items' | 'runes'
    var _champPickerItemCat = 'all'; // for items picker

    window.openChampPicker = function(title, callback, opts) {
        _champPickerCallback = callback;
        _champPickerMulti = !!(opts && opts.multi);
        _champPickerGetSelected = (opts && opts.getSelected) || null;
        _champPickerGetExcluded = (opts && opts.getExcluded) || null;
        _champPickerOnRemove = (opts && opts.onRemove) || null;
        _champPickerType = (opts && opts.type) || 'champs';
        _champPickerItemCat = (opts && opts.itemCat) || 'all';
        // Map tierlist role keys → picker role keys (Top/Jungle/Mid/ADC/Support)
        var roleMap = {top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', sup:'Support', all:'all'};
        var dr = (opts && opts.defaultRole) || 'all';
        _champPickerRole = roleMap[dr] || dr;
        var tEl2 = document.getElementById('champPickerTitle');
        if(tEl2) tEl2.textContent = title || t('⚔ Выбери чемпиона');
        var doneBtn = document.getElementById('champPickerDoneBtn');
        if(doneBtn) doneBtn.style.display = _champPickerMulti ? '' : 'none';
        var rolesEl = document.getElementById('champPickerRoles');
        if(rolesEl) {
            if(_champPickerType === 'champs') {
                var rolesList = [
                    {k:'all', l:'Все'}, {k:'Top', l:'Top'}, {k:'Jungle', l:'Jungle'},
                    {k:'Mid', l:'Mid'}, {k:'ADC', l:'ADC'}, {k:'Support', l:'Support'}
                ];
                rolesEl.innerHTML = '';
                rolesList.forEach(function(r) {
                    var btn = document.createElement('button');
                    btn.textContent = t(r.l);
                    btn.style.cssText = 'padding:4px 10px;border-radius:16px;border:1px solid var(--sel-glow-35);background:' + (_champPickerRole===r.k?'var(--sel-act-str)':'rgba(255,255,255,0.06)') + ';color:' + (_champPickerRole===r.k?'#fff':'rgba(255,255,255,0.6)') + ';font-size:11px;cursor:pointer;transition:all 0.12s;';
                    btn.onclick = function() {
                        _champPickerRole = r.k;
                        Array.from(rolesEl.children).forEach(function(b, i) {
                            var active = rolesList[i].k === _champPickerRole;
                            b.style.background = active ? 'var(--sel-act-str)' : 'rgba(255,255,255,0.06)';
                            b.style.color = active ? '#fff' : 'rgba(255,255,255,0.6)';
                        });
                        champPickerBuildGrid();
                    };
                    rolesEl.appendChild(btn);
                });
                rolesEl.style.display = 'flex';
            } else {
                rolesEl.style.display = 'none';
            }
        }
        openModal('champPickerModal');
        champPickerBuildGrid();
    };
    window.closeChampPicker = function() { closeModal('champPickerModal'); };


    function champPickerBuildGrid() {
        var grid = document.getElementById('champPickerGrid');
        if(!grid) return;
        grid.innerHTML = '';
        var selected = _champPickerGetSelected ? _champPickerGetSelected() : [];
        var excluded = _champPickerGetExcluded ? _champPickerGetExcluded() : [];

        var sourceList;
        if(_champPickerType === 'items') {
            var byCat = getItemsByCat();
            var catItems = (_champPickerItemCat !== 'all' && byCat[_champPickerItemCat]) ? byCat[_champPickerItemCat] : byCat.all;
            sourceList = catItems;
        } else if(_champPickerType === 'runes') {
            var byCatR = getRunesByCat();
            sourceList = (_champPickerItemCat && byCatR[_champPickerItemCat]) ? byCatR[_champPickerItemCat] : getRunesData();
        } else {
            if(!raw.length) return;
            sourceList = raw.map(function(c){ return {name:c.name, img:champIcon(c.name), is:c.is}; });
        }

        var list = sourceList.filter(function(c) {
            if(_champPickerType === 'champs' && _champPickerRole !== 'all' && !(c.is && c.is[_champPickerRole])) return false;
            // Hide items/runes already placed in OTHER tiers, but show currently selected (current tier)
            if(excluded.indexOf(c.name) !== -1 && selected.indexOf(c.name) === -1) return false;
            return true;
        });

        list.forEach(function(c) {
            var isSel = selected.indexOf(c.name) !== -1;
            var wrap = document.createElement('div');
            wrap.className = 'pick-card';
            wrap.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:2px;border-radius:9px;border:2px solid '+(isSel?'var(--sel-text)':'transparent')+';background:'+(isSel?'var(--sel-dim)':'transparent')+';transition:all 0.12s;';
            var thumb = document.createElement('div');
            thumb.className = 'pick-thumb';
            thumb.style.cssText = 'width:100%;aspect-ratio:1;border-radius:7px;';
            var img = document.createElement('img');
            img.src = c.img || '';
            img.title = c.name;
            img.style.cssText = 'width:100%;height:100%;border-radius:7px;object-fit:cover;display:block;';
            img.onerror = function(){ this.style.background='var(--sel-placeholder)'; this.style.minHeight='32px'; };
            thumb.appendChild(img);
            wrap.appendChild(thumb);
            if(isSel) {
                var ck = document.createElement('div');
                ck.style.cssText = 'position:absolute;top:2px;right:2px;background:var(--sel-text);border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:900;pointer-events:none;';
                ck.textContent = '✓';
                wrap.appendChild(ck);
            } else {
                wrap.onmouseenter = function(){ this.style.borderColor='var(--sel-text)'; this.style.background='var(--sel-bg-soft)'; };
                wrap.onmouseleave = function(){ this.style.borderColor='transparent'; this.style.background=''; };
            }
            wrap.onclick = function() {
                if(isSel && _champPickerOnRemove) {
                    _champPickerOnRemove(c);
                } else if(_champPickerCallback) {
                    _champPickerCallback(c);
                }
                if(_champPickerMulti) {
                    champPickerBuildGrid();
                } else {
                    closeChampPicker();
                }
            };
            grid.appendChild(wrap);
        });
        if(!list.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:rgba(255,255,255,0.3);font-size:12px;">'+t('Ничего не найдено')+'</div>';
        }

        // GSAP: staggered entrance для champ picker grid
        if (window.gsap && grid.children.length) {
            window.gsap.from(grid.children, {
                opacity: 0,
                y: 6,
                scale: 0.94,
                duration: 0.28,
                stagger: { each: 0.012, from: 'start' },
                ease: 'power2.out',
                clearProps: 'transform,opacity'
            });
        }
    }

    // Start loading data
    start();


    // ═══ CONSOLIDATED FEATURES (from v33-v41) ═══

    // Nickname link prevention
    document.getElementById('nickname')?.addEventListener('click', e => e.preventDefault());

    // Support text block
    (function(){
        if (document.getElementById('support-panel-text')) return;
        const btn = document.querySelector('.btn-support') || document.querySelector('.support-btn');
        if(!btn) return;
        const block = document.createElement('div');
        block.id = 'support-panel-text';
        block.innerHTML = t('support-text');
        btn.insertAdjacentElement('afterend', block);
    })();

    // Mobile +/- stepper (created once)
    (function(){
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if(!isMobile) return;
        const slider = document.getElementById('lvlRange');
        if(!slider || document.querySelector('.lvl-stepper')) return;
        const stepper = document.createElement('div');
        stepper.className = 'lvl-stepper';
        const minus = document.createElement('button');
        minus.type = 'button'; minus.textContent = '\u2212';
        const plus = document.createElement('button');
        plus.type = 'button'; plus.textContent = '+';
        function step(delta){
            const min = Number(slider.min||1), max = Number(slider.max||15);
            const v = Math.min(max, Math.max(min, Number(slider.value)+delta));
            slider.value = String(v);
            slider.dispatchEvent(new Event('input', {bubbles:true}));
        }
        minus.addEventListener('click', ()=>step(-1));
        plus.addEventListener('click', ()=>step(1));
        stepper.appendChild(minus);
        stepper.appendChild(plus);
        slider.insertAdjacentElement('afterend', stepper);
    })();

    // Ruler positioning handled by CSS flexbox

    // Mobile: hide ruler pills and clean up duplicates
    (function(){
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if(!isMobile) return;
        const ruler = document.getElementById('ruler');
        if(ruler) ruler.innerHTML = '';
    })();

    // Expose roleIcons globally so the second IIFE (profile setup) can access it
    window._roleIcons = roleIcons;

})();


// ═══════════════════════════════════════════
// Firebase, Auth, Chat, Friends System
// ═══════════════════════════════════════════

(function() {
    // ═══════════════════════════════════════
    // TOAST NOTIFICATION UTILITY
    // ═══════════════════════════════════════
    function showToast(msg, duration) {
        duration = duration || 3000;
        var existing = document.getElementById('_appToast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = '_appToast';
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
            + 'background:rgba(20,10,40,0.95);color:#fff;padding:10px 22px;border-radius:12px;'
            + 'font-size:13px;font-weight:700;z-index:999999;pointer-events:none;'
            + 'border:1.5px solid var(--sel-glow-brd);backdrop-filter:blur(8px);'
            + 'animation:fadeIn 0.2s ease;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
        }, duration);
    }
    window.showToast = showToast;

    // ── Styled confirm dialog (replaces native window.confirm) ──
    window._showConfirm = function(opts, onConfirm) {
        if (typeof opts === 'string') opts = { msg: opts };
        var msg = opts.msg || '';
        var title = opts.title || 'Подтверди действие';
        var confirmText = opts.confirmText || 'Подтвердить';
        var isDanger = opts.danger !== false; // default true
        var icon = opts.icon || (isDanger ? '🗑' : '⚠️');
        var btnBg = isDanger
            ? 'linear-gradient(135deg,#e74c3c,#c0392b)'
            : 'linear-gradient(135deg,#f39c12,#e67e22)';

        // Локальный escape — у app.js нет общего escapeHtml в этом скопе.
        function _esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
        }

        var overlay = document.createElement('div');
        overlay.setAttribute('role','dialog');
        overlay.setAttribute('aria-modal','true');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);';

        var box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-secondary,#1a1a2e);border:1px solid rgba(109,63,245,0.3);border-radius:16px;padding:28px 24px 20px;max-width:340px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);';
        // icon — передаётся самой стороной кода (эмодзи/контролируемое значение); msg/title — из юзерского контекста, экранируем.
        box.innerHTML = ''
            + '<div style="font-size:36px;margin-bottom:12px;">'+_esc(icon)+'</div>'
            + '<div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:8px;">'+_esc(title)+'</div>'
            + '<div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:22px;line-height:1.5;">'+_esc(msg)+'</div>'
            + '<div style="display:flex;gap:10px;">'
            +   '<button class="_conf-cancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;cursor:pointer;">Отмена</button>'
            +   '<button class="_conf-ok" style="flex:1;padding:12px;border-radius:10px;border:none;background:'+btnBg+';color:#fff;font-size:13px;font-weight:800;cursor:pointer;">'+_esc(confirmText)+'</button>'
            + '</div>';

        var cancelBtn = box.querySelector('._conf-cancel');
        var okBtn = box.querySelector('._conf-ok');
        function close(){ overlay.remove(); document.removeEventListener('keydown', keyHandler, true); }
        cancelBtn.onclick = close;
        okBtn.onclick = function(){ close(); onConfirm(); };
        overlay.onclick = function(e){ if (e.target === overlay) close(); };
        function keyHandler(e){
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'Enter') { e.preventDefault(); close(); onConfirm(); }
        }
        document.addEventListener('keydown', keyHandler, true);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(function(){ try { okBtn.focus(); } catch(e){} }, 30);
    };

    // ═══════════════════════════════════════
    // FIREBASE CONFIG
    // ═══════════════════════════════════════
    var firebaseConfig = {
        apiKey: "AIzaSyBpJd2cSFeyAxdz8HzexvrHlT8T6v_Bfq0",
        authDomain: "wildrift-stats-600c0.firebaseapp.com",
        projectId: "wildrift-stats-600c0",
        storageBucket: "wildrift-stats-600c0.firebasestorage.app",
        messagingSenderId: "616595917443",
        appId: "1:616595917443:web:fc9feae1309ae42a8ce9b6",
        measurementId: "G-82DL6WBV37"
    };

    // Initialize Firebase
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } else {
        console.warn('Firebase SDK not loaded');
    }

    var auth = (typeof firebase !== 'undefined') ? firebase.auth() : null;
    var db   = (typeof firebase !== 'undefined') ? firebase.firestore() : null;
    var _currentUser = null;

    // CMS: шрифт сайта — грузим сразу, независимо от авторизации
    if (db && typeof window.cmsLoadFonts === 'function') {
        window.cmsLoadFonts();
    }

    // CMS: загрузка данных предметов и рун из Firestore
    if (db && typeof window.cmsLoadData === 'function') {
        window.cmsLoadData(function() {
            // Сбрасываем кеш, чтобы getItemsByCat/getRunesByCat использовали CMS данные
            _itemsByCat = null;
            _runesByCat = null;
            _runesData = null;
            // Рендерим предметы и руны из Firestore
            if (window.cmsRenderItems) window.cmsRenderItems();
            if (window.cmsRenderRunes) window.cmsRenderRunes();
        });
        // Загружаем патч-ноты из Firestore (заменяют Google Sheets данные)
        if (typeof window.cmsLoadPatchnotes === 'function') {
            window.cmsLoadPatchnotes(function() {
                console.log('[CMS] Патч-ноты загружены, patchMap обновлён');
                /* лента приехала — блок «Что нового» в Мета-хабе обязан её показать */
                try { document.dispatchEvent(new CustomEvent('patchnotesLoaded')); } catch(e){}
            });
        }
        // Загружаем конфигурацию лейаута
        if (typeof window.cmsLoadSiteConfig === 'function') {
            window.cmsLoadSiteConfig();
        }
    }
    var _isAdmin = false;

    function purgeAdminUI() {
        _isAdmin = false;
        window._isAdmin = false;
        document.querySelectorAll('.admin-only').forEach(function(el) {
            el.style.display = 'none';
        });
        document.querySelectorAll('.cms-inline-edit-popup').forEach(function(el) { el.remove(); });
        document.querySelectorAll('.cms-edit-btn, .cms-add-btn').forEach(function(el) { el.remove(); });
        try { if (window.cmsTeardownInlineEdit) window.cmsTeardownInlineEdit(); } catch (e) {}
        try { if (window.wrprRender) window.wrprRender(); } catch (e) {}
        try { if (window.cmsRenderItems && window._cmsLoaded) window.cmsRenderItems(); } catch (e) {}
        try { if (window.cmsRenderRunes && window._cmsLoaded) window.cmsRenderRunes(); } catch (e) {}
        try { if (window.cmsRenderPatchnotes) window.cmsRenderPatchnotes(); } catch (e) {}
    }
    window._purgeAdminUI = purgeAdminUI;

    // Применяет видимость админ-UI по текущему _isAdmin. Вызывается из checkAdmin.
    function applyAdminUI() {
        window._isAdmin = _isAdmin;
        renderGlobalChat();
        if (_isAdmin && window._cmsLoaded) {
            window.cmsRenderItems && window.cmsRenderItems();
            window.cmsRenderRunes && window.cmsRenderRunes();
        }
        if (_isAdmin) wrprRender();
        document.querySelectorAll('.admin-only').forEach(function(el) {
            el.style.display = _isAdmin ? '' : 'none';
        });
        if (_isAdmin && window.cmsInitInlineEdit) window.cmsInitInlineEdit();
        // Если у админа есть черновик правок позиций — подгружаем редактор,
        // он сам применит черновик (показывает твою раскладку до вшивания в CSS).
        if (_isAdmin) {
            try {
                var lp = localStorage.getItem('le_layout_pc'), lm = localStorage.getItem('le_layout_mobile');
                if ((lp && lp !== '{}') || (lm && lm !== '{}')) _lazyScript('layout-editor.js');
            } catch (e) {}
        }
    }

    function checkAdmin() {
        if (!db || !_currentUser) { console.warn('[checkAdmin] db or user missing', !!db, !!_currentUser); return; }
        var checkUid = _currentUser.uid;

        // Быстрый НАДЁЖНЫЙ путь для владельца сайта: его UID захардкожен (ADMIN_UID).
        // Показываем админку сразу, не завися от сети/доступности Firestore.
        // Реальную безопасность правок держат серверные firestore.rules — поэтому
        // клиентский флаг ничего не «открывает», только показывает UI владельцу.
        if (checkUid === ADMIN_UID) {
            _isAdmin = true;
            applyAdminUI();
            return;
        }

        // Прочие пользователи: читаем поле isAdmin из базы.
        // Обычный .get() (с откатом на кэш), НЕ { source: 'server' } — иначе при
        // недоступности бэкенда запрос падает и админка пропадала бы.
        db.collection('users').doc(checkUid).get().then(function(doc) {
            if (!_currentUser || _currentUser.uid !== checkUid) return;
            _isAdmin = !!(doc.exists && doc.data().isAdmin === true);
            applyAdminUI();
        }).catch(function(err) {
            // Разовый сбой сети не должен скрывать админку: оставляем статус как есть
            // (при смене аккаунта purgeAdminUI уже отработал и скрыл лишнее).
            console.error('[checkAdmin] ERROR (статус не меняю):', err);
        });
    }

    // ═══════════════════════════════════════
    // REGISTER influencerMask IN MODAL SYSTEM
    // ═══════════════════════════════════════
    (function registerModals() {
        // Wait for MODAL_IDS to be available (defined in main script)
        var checkInterval = setInterval(function() {
            if (typeof MODAL_IDS !== 'undefined') {
                clearInterval(checkInterval);
                if (!MODAL_IDS.includes('influencerMask')) {
                    MODAL_IDS.push('influencerMask');
                }
            }
        }, 100);
        // Fallback: stop checking after 10s
        setTimeout(function() { clearInterval(checkInterval); }, 10000);
    })();

    // ═══════════════════════════════════════
    // AUTH: Google Sign In / Out
    // ═══════════════════════════════════════
    var _provider = auth ? new firebase.auth.GoogleAuthProvider() : null;

    window.toggleUserMenu = function() {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.toggle('active');
    };

    // Close user menu when clicking outside
    document.addEventListener('click', function(e) {
        var menu = document.getElementById('userMenu');
        var btn = document.getElementById('authBtn');
        if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    var _authInProgress = false;
    function authSignIn() {
        if (!auth || !_provider) {
            alert(t('Firebase не загружен. Проверьте подключение к интернету.'));
            return;
        }
        if (_authInProgress) return;
        _authInProgress = true;
        auth.signInWithPopup(_provider).catch(function(err) {
            var ignored = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
            if (ignored.indexOf(err.code) === -1) {
                console.error('Auth error:', err);
                alert(t('Ошибка авторизации: ') + err.message);
            }
        }).finally(function() {
            _authInProgress = false;
        });
    }
    window.authSignIn = authSignIn;
    window.closeUserMenuAndLogin = function() {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        authSignIn();
    };

    window.authSignOut = function() {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        // Show confirmation
        var overlay = document.createElement('div');
        overlay.id = 'logoutConfirm';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';
        var box = document.createElement('div');
        box.style.cssText = 'background:linear-gradient(135deg,#1a0d2e,#0f0520);border:1.5px solid var(--sel-border-med);border-radius:16px;padding:24px;text-align:center;min-width:260px;';
        box.innerHTML = '<div style="font-size:18px;margin-bottom:6px;">🚪</div>'
            + '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">'+t('Выйти из аккаунта?')+'</div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:16px;">'+t('Данные не потеряются')+'</div>';
        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:8px;';
        var cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--sel-border-med);background:none;color:var(--sel-text);font-size:13px;font-weight:800;cursor:pointer;';
        cancelBtn.textContent = t('Назад');
        cancelBtn.onclick = function() { overlay.remove(); };
        var confirmBtn = document.createElement('button');
        confirmBtn.style.cssText = 'flex:1;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;font-size:13px;font-weight:800;cursor:pointer;';
        confirmBtn.textContent = t('Выйти');
        confirmBtn.onclick = function() {
            overlay.remove();
            try { localStorage.removeItem('_wrsAuthed'); localStorage.removeItem('_wrsProfileReady'); } catch(e){}
            if(auth) auth.signOut();
        };
        btns.appendChild(cancelBtn);
        btns.appendChild(confirmBtn);
        box.appendChild(btns);
        overlay.appendChild(box);
        overlay.onclick = function(e) { if(e.target===overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    };

    function updateAuthUI(user) {
        var btn = document.getElementById('authBtn');
        var emailEl = document.getElementById('userMenuEmail');
        if (!btn) return;

        document.querySelectorAll('.guest-only').forEach(function(el) {
            el.style.display = user ? 'none' : '';
        });
        document.querySelectorAll('.auth-only-row').forEach(function(el) {
            el.style.display = user ? '' : 'none';
        });

        if (user) {
            btn.innerHTML = '';
            var aImg = document.createElement('img');
            aImg.src = user.photoURL || '';
            aImg.alt = user.displayName || '';
            aImg.onerror = function(){ this.style.display='none'; };
            btn.appendChild(aImg);
            var aDot = document.createElement('span');
            aDot.id = 'authNotifDot';
            aDot.style.cssText = 'display:none;position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#ffd700;border-radius:50%;border:2px solid #0f0520;';
            btn.appendChild(aDot);
            btn.title = user.displayName || user.email || t('Профиль');
            if (emailEl) emailEl.textContent = user.email || '';
        } else {
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
            btn.title = t('Войти через Google');
            if (emailEl) emailEl.textContent = '';
        }
    }

    // Auth state is handled in the presence/chat section below

    // ═══════════════════════════════════════
    // FIRESTORE: Save & Load matchups + tier-data
    // ═══════════════════════════════════════
    var _syncTimeout = null;

    function getUserDocRef() {
        if (!db || !_currentUser) return null;
        return db.collection('users').doc(_currentUser.uid);
    }

    // UID главного админа — его данные копируются новым пользователям по дефолту
    var ADMIN_UID = 'PaNQ2BWUUOYdvyblvMdcLwJfteB3';

    // Save matchups + tier data to Firestore
    function saveUserDataToFirestore() {
        var docRef = getUserDocRef();
        if (!docRef) return;

        var matchups = {};
        var tierData = {};
        var itemTierData = {};
        var runeTierData = {};
        var objectTierData = {};
        var selectedChamps = [];

        try { matchups = JSON.parse(localStorage.getItem('matchups') || '{}'); } catch(e) {}
        try { tierData = JSON.parse(localStorage.getItem('tierData') || '{}'); } catch(e) {}
        try { itemTierData = JSON.parse(localStorage.getItem('itemTierData') || '{}'); } catch(e) {}
        try { runeTierData = JSON.parse(localStorage.getItem('runeTierData') || '{}'); } catch(e) {}
        try { objectTierData = JSON.parse(localStorage.getItem('objectTierData') || '{}'); } catch(e) {}
        try { selectedChamps = JSON.parse(localStorage.getItem('p') || '[]'); } catch(e) {}

        docRef.set({
            matchups: JSON.stringify(matchups),
            tierData: JSON.stringify(tierData),
            itemTierData: JSON.stringify(itemTierData),
            runeTierData: JSON.stringify(runeTierData),
            objectTierData: JSON.stringify(objectTierData),
            selectedChamps: JSON.stringify(selectedChamps),
            displayName: _currentUser.displayName || '',
            photoURL: _currentUser.photoURL || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            console.log('Data saved to Firestore');
            showSyncStatus(t('Сохранено ✓'));
        }).catch(function(err) {
            console.error('Firestore save error:', err);
        });
    }

    // Load data from Firestore
    function loadUserDataFromFirestore() {
        var docRef = getUserDocRef();
        if (!docRef) return;

        docRef.get().then(function(snap) {
            if (!snap.exists) {
                // First login: load admin's default data, then save as user's own
                console.log('First login — loading default data from admin');
                if (ADMIN_UID && ADMIN_UID !== 'REPLACE_WITH_YOUR_UID' && db) {
                    db.collection('users').doc(ADMIN_UID).get().then(function(adminSnap) {
                        if (adminSnap.exists) {
                            var ad = adminSnap.data();
                            if (ad.matchups)     try { localStorage.setItem('matchups', ad.matchups); } catch(e) {}
                            if (ad.tierData)     try { localStorage.setItem('tierData', ad.tierData); loadTierData(); } catch(e) {}
                            if (ad.itemTierData) try { localStorage.setItem('itemTierData', ad.itemTierData); loadItemTierData(); } catch(e) {}
                            if (ad.runeTierData) try { localStorage.setItem('runeTierData', ad.runeTierData); loadRuneTierData(); } catch(e) {}
                            if (ad.objectTierData) try { localStorage.setItem('objectTierData', ad.objectTierData); } catch(e) {}
                            if (ad.selectedChamps) try { localStorage.setItem('p', ad.selectedChamps); } catch(e) {}
                            console.log('Default data loaded from admin');
                            showSyncStatus(t('Данные по умолчанию загружены ✓'));
                        }
                        // Save a copy as this user's own data in Firestore
                        saveUserDataToFirestore();
                    }).catch(function() {
                        saveUserDataToFirestore();
                    });
                } else {
                    saveUserDataToFirestore();
                }
                return;
            }
            var d = snap.data();
            var localUpdated = parseInt(localStorage.getItem('localUpdatedAt') || '0', 10);
            var serverUpdated = d.updatedAt ? d.updatedAt.toMillis() : 0;

            // If server data is newer, use it
            if (serverUpdated > localUpdated) {
                if (d.matchups) {
                    try { localStorage.setItem('matchups', d.matchups); } catch(e) {}
                }
                if (d.tierData) {
                    try { localStorage.setItem('tierData', d.tierData); } catch(e) {}
                }
                if (d.itemTierData) {
                    try { localStorage.setItem('itemTierData', d.itemTierData); loadItemTierData(); } catch(e) {}
                }
                if (d.runeTierData) {
                    try { localStorage.setItem('runeTierData', d.runeTierData); loadRuneTierData(); } catch(e) {}
                }
                if (d.objectTierData) {
                    try { localStorage.setItem('objectTierData', d.objectTierData); } catch(e) {}
                }
                if (d.selectedChamps) {
                    try { localStorage.setItem('p', d.selectedChamps); } catch(e) {}
                }
                // Sync dataVisible flag
                if (d.dataVisible !== undefined) {
                    localStorage.setItem('dataVisible', String(d.dataVisible));
                }
                console.log('Loaded data from Firestore (server is newer)');
                showSyncStatus(t('Загружено ✓'));
            } else {
                // Local is newer — push to server
                saveUserDataToFirestore();
            }
        }).catch(function(err) {
            console.error('Firestore load error:', err);
        });
    }

    // Debounced auto-save: called when user changes matchups
    function scheduleSyncToFirestore() {
        if (!_currentUser) return;
        localStorage.setItem('localUpdatedAt', String(Date.now()));
        if (_syncTimeout) clearTimeout(_syncTimeout);
        _syncTimeout = setTimeout(function() {
            saveUserDataToFirestore();
        }, 3000); // save 3s after last change
    }

    // Manual sync button
    window.syncNow = function() {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        if (!_currentUser) {
            alert(t('Сначала войдите в аккаунт'));
            return;
        }
        saveUserDataToFirestore();
    };

    // Sync status toast
    function showSyncStatus(text) {
        var existing = document.getElementById('syncToast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = 'syncToast';
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(46,204,113,0.9);color:#fff;padding:8px 18px;border-radius:20px;font-size:12px;font-weight:700;z-index:99999;animation:fadeIn 0.3s ease;pointer-events:none;';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2500);
    }

    // Patch localStorage.setItem to auto-sync matchups changes
    var _origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        _origSetItem(key, value);
        if (key === 'matchups' || key === 'tierData' || key === 'itemTierData' || key === 'runeTierData' || key === 'objectTierData' || key === 'p') {
            scheduleSyncToFirestore();
        }
    };

    // ═══════════════════════════════════════
    // INFLUENCER SYSTEM (100% Firestore)
    // ═══════════════════════════════════════
    // No hardcoded data — everything from Firestore "influencers" collection
    // Doc fields: name, platform, rank, role, url, avatar, achievements,
    //   tierlist: { S: ["Jinx","Kai'Sa"], A: ["Vayne"], B: [], C: [] }
    //   counters: { "Jinx": ["Draven","Lucian"] }
    //   combos:   { "Jinx": ["Lulu","Nami"] }

    var INFLUENCERS = [];
    var _infLoaded = false;
    var _rankLabels = { sovereign:'Суверен', challenger:'Челленджер', grandmaster:'Грандмастер', master:'Мастер', diamond:'Бриллиант' };
    var _platIcons = { youtube:'▶', twitch:'◆', tiktok:'♪' };
    var _platLabels = { youtube:'YouTube', twitch:'Twitch', tiktok:'TikTok' };
    var _DD = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';

    function _champImg(n) { return (typeof champIcon==='function') ? champIcon(n) : _DD+n+'.png'; }

    function loadInfluencersFromFirestore(cb) {
        if (!db) { _infLoaded = true; if(cb) cb(); return; }
        db.collection('influencers').orderBy('name').get().then(function(snap) {
            INFLUENCERS = [];
            snap.forEach(function(doc) {
                var d = doc.data(); d._id = doc.id;
                ['tierlist','counters','combos'].forEach(function(k) {
                    if (typeof d[k]==='string') { try { d[k]=JSON.parse(d[k]); } catch(e){ d[k]=null; } }
                });
                INFLUENCERS.push(d);
            });
            _infLoaded = true; if(cb) cb();
        }).catch(function(err) {
            console.warn('Influencers load error:', err);
            INFLUENCERS = []; _infLoaded = true; if(cb) cb();
        });
    }

    // ── LIST VIEW ──
    function renderInfList() {
        var cards = document.getElementById('infListCards');
        var loading = document.getElementById('infListLoading');
        var empty = document.getElementById('infListEmpty');
        if (!cards) return;
        if (!_infLoaded) { loading.style.display=''; empty.style.display='none'; cards.innerHTML=''; return; }
        loading.style.display = 'none';
        if (!INFLUENCERS.length) { empty.style.display=''; cards.innerHTML=''; return; }
        empty.style.display = 'none'; cards.innerHTML = '';

        INFLUENCERS.forEach(function(inf, idx) {
            var card = document.createElement('div');
            card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--sel-border-15);background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.15s,border-color 0.15s;';
            card.onmouseenter = function(){ card.style.background='var(--sel-bg-faint)'; card.style.borderColor='var(--sel-border-35)'; };
            card.onmouseleave = function(){ card.style.background='rgba(255,255,255,0.02)'; card.style.borderColor='var(--sel-border-15)'; };
            card.onclick = function(){ infShowDetail(idx); };

            var av = document.createElement('div');
            av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden;color:#fff;font-weight:900;';
            if (inf.avatar) {
                var infImg = document.createElement('img');
                infImg.src = inf.avatar;
                infImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                infImg.onerror = function(){ this.style.display='none'; };
                av.appendChild(infImg);
            } else { av.textContent = (inf.name||'?').charAt(0).toUpperCase(); }
            card.appendChild(av);

            var info = document.createElement('div');
            info.style.cssText = 'flex:1;min-width:0;';
            var infNameDiv = document.createElement('div');
            infNameDiv.style.cssText = 'font-size:14px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            infNameDiv.textContent = inf.name || '—';
            info.appendChild(infNameDiv);
            var infMetaDiv = document.createElement('div');
            infMetaDiv.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;';
            infMetaDiv.textContent = (_platIcons[inf.platform]||'●') + ' ' + (_platLabels[inf.platform]||'') + ' · ' + (inf.role||'');
            info.appendChild(infMetaDiv);
            card.appendChild(info);

            if (inf.rank) {
                var badge = document.createElement('span');
                badge.className = 'inf-rank '+inf.rank;
                badge.textContent = t(_rankLabels[inf.rank]||inf.rank);
                badge.style.flexShrink = '0';
                card.appendChild(badge);
            }

            var dots = document.createElement('div');
            dots.style.cssText = 'display:flex;gap:3px;flex-shrink:0;';
            var hasTier = inf.tierlist && (inf.tierlist.S||inf.tierlist.A||inf.tierlist.B||inf.tierlist.C);
            var hasC = inf.counters && Object.keys(inf.counters).length;
            var hasCo = inf.combos && Object.keys(inf.combos).length;
            if(hasTier) dots.innerHTML+='<span title="'+t('Тир-лист')+'" style="font-size:10px;">🏆</span>';
            if(hasC) dots.innerHTML+='<span title="'+t('Контр-пики')+'" style="font-size:10px;">🔴</span>';
            if(hasCo) dots.innerHTML+='<span title="'+t('Комбо')+'" style="font-size:10px;">🟢</span>';
            if(dots.innerHTML) card.appendChild(dots);

            var arrow = document.createElement('div');
            arrow.style.cssText = 'color:rgba(255,255,255,0.15);font-size:16px;flex-shrink:0;';
            arrow.textContent = '›';
            card.appendChild(arrow);
            cards.appendChild(card);
        });
    }

    // ── DETAIL VIEW ──
    function infShowDetail(idx) {
        var inf = INFLUENCERS[idx]; if(!inf) return;
        document.getElementById('infListView').style.display = 'none';
        document.getElementById('infDetailView').style.display = 'flex';

        document.getElementById('infDetailName').textContent = inf.name||'—';
        var rk = document.getElementById('infDetailRank');
        if(inf.rank){ rk.className='inf-rank '+inf.rank; rk.textContent=t(_rankLabels[inf.rank]||inf.rank); rk.style.display=''; }
        else { rk.style.display='none'; }

        var avEl = document.getElementById('infDetailAvatar');
        avEl.innerHTML = '';
        if(inf.avatar){
            var infDImg = document.createElement('img');
            infDImg.src = inf.avatar;
            infDImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            avEl.appendChild(infDImg);
        } else {
            avEl.textContent=(inf.name||'?').charAt(0).toUpperCase();
        }

        var infMetaEl = document.getElementById('infDetailMeta');
        infMetaEl.textContent = (_platIcons[inf.platform]||'●') + ' ' + (_platLabels[inf.platform]||'');
        infMetaEl.appendChild(document.createElement('br'));
        infMetaEl.appendChild(document.createTextNode('🎮 ' + (inf.role||t('Не указана'))));
        var infLink = document.getElementById('infDetailLink');
        infLink.href = '#';
        infLink.onclick = (function(url, name) { return function(e) { e.preventDefault(); if(url && url !== '#') openExternalLink(url, name); }; })(inf.url||'#', inf.name||'');

        // Achievements
        var achS = document.getElementById('infDetailAchSection');
        if(inf.achievements){ achS.style.display=''; document.getElementById('infDetailAch').textContent=inf.achievements; }
        else { achS.style.display='none'; }

        // Tier list
        var tierS = document.getElementById('infDetailTierSection');
        var tierEl = document.getElementById('infDetailTier');
        var hasTier = inf.tierlist && ((inf.tierlist.S&&inf.tierlist.S.length)||(inf.tierlist.A&&inf.tierlist.A.length)||(inf.tierlist.B&&inf.tierlist.B.length)||(inf.tierlist.C&&inf.tierlist.C.length));
        if(hasTier) {
            tierS.style.display=''; tierEl.innerHTML='';
            [{k:'S',c:'#C43A3A'},{k:'A',c:'#C46A1C'},{k:'B',c:'#BC9800'},{k:'C',c:'#1E8848'}].forEach(function(t){
                var ch = inf.tierlist[t.k]||[]; if(!ch.length) return;
                var row=document.createElement('div'); row.className='tierlist-row';
                var lbl=document.createElement('div'); lbl.className='tierlist-label';
                lbl.style.background='linear-gradient(135deg,'+t.c+'cc,'+t.c+'88)'; lbl.textContent=t.k;
                var cd=document.createElement('div'); cd.className='tierlist-champs';
                ch.forEach(function(n){ var img=document.createElement('img'); img.className='tierlist-champ-icon'; img.src=_champImg(n); img.alt=img.title=n; img.onerror=function(){this.style.display='none';}; cd.appendChild(img); });
                row.appendChild(lbl); row.appendChild(cd); tierEl.appendChild(row);
            });
        } else { tierS.style.display='none'; }

        // Counters
        var ctrS = document.getElementById('infDetailCounterSection');
        var ctrEl = document.getElementById('infDetailCounters');
        var hasC = inf.counters && Object.keys(inf.counters).length;
        if(hasC) {
            ctrS.style.display=''; ctrEl.innerHTML='';
            Object.keys(inf.counters).forEach(function(champ){
                var row=document.createElement('div');
                row.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(231,76,60,0.06);border-radius:8px;';
                row.innerHTML='<img loading="lazy" decoding="async" src="'+_champImg(champ)+'" style="width:28px;height:28px;border-radius:6px;" onerror="this.style.display=\'none\'">'
                    +'<span style="font-size:12px;font-weight:700;color:#fff;min-width:70px;">'+champ+'</span>'
                    +'<span style="font-size:11px;color:rgba(255,255,255,0.3);">→</span>'
                    +'<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                    +(inf.counters[champ]||[]).map(function(c){return '<img loading="lazy" decoding="async" src="'+_champImg(c)+'" title="'+c+'" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(231,76,60,0.3);" onerror="this.style.display=\'none\'">';}).join('')
                    +'</div>';
                ctrEl.appendChild(row);
            });
        } else { ctrS.style.display='none'; }

        // Combos
        var coS = document.getElementById('infDetailComboSection');
        var coEl = document.getElementById('infDetailCombos');
        var hasCo = inf.combos && Object.keys(inf.combos).length;
        if(hasCo) {
            coS.style.display=''; coEl.innerHTML='';
            Object.keys(inf.combos).forEach(function(champ){
                var row=document.createElement('div');
                row.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(46,204,113,0.06);border-radius:8px;';
                row.innerHTML='<img loading="lazy" decoding="async" src="'+_champImg(champ)+'" style="width:28px;height:28px;border-radius:6px;" onerror="this.style.display=\'none\'">'
                    +'<span style="font-size:12px;font-weight:700;color:#fff;min-width:70px;">'+champ+'</span>'
                    +'<span style="font-size:11px;color:rgba(255,255,255,0.3);">+</span>'
                    +'<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                    +(inf.combos[champ]||[]).map(function(c){return '<img loading="lazy" decoding="async" src="'+_champImg(c)+'" title="'+c+'" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(46,204,113,0.3);" onerror="this.style.display=\'none\'">';}).join('')
                    +'</div>';
                coEl.appendChild(row);
            });
        } else { coS.style.display='none'; }

        var emD = document.getElementById('infDetailEmpty');
        if(!hasTier&&!hasC&&!hasCo&&!inf.achievements){ emD.style.display=''; } else { emD.style.display='none'; }
    }

    window.infShowList = function() {
        document.getElementById('infDetailView').style.display = 'none';
        document.getElementById('infListView').style.display = 'flex';
    };

    window.openInfluencers = function() {
        if (typeof openModal==='function') { openModal('influencerMask'); }
        else { var el=document.getElementById('influencerMask'); if(el) el.classList.add('active'); document.body.classList.add('modal-open'); }
        infShowList();
        if (!_infLoaded) { renderInfList(); loadInfluencersFromFirestore(function(){ renderInfList(); }); }
        else { renderInfList(); }
    };

    window.closeInfluencers = function() {
        if (typeof closeModal==='function') { closeModal('influencerMask'); }
        else { var el=document.getElementById('influencerMask'); if(el) el.classList.remove('active'); document.body.classList.remove('modal-open'); }
    };

    // Pre-load on page load
    loadInfluencersFromFirestore();

    // ═══════════════════════════════════════
    // PRESENCE SYSTEM (online/offline)
    // ═══════════════════════════════════════
    var _presenceInterval = null;

    function startPresence() {
        if (!db || !_currentUser) return;
        function updatePresence() {
            if (!_currentUser) return;
            db.collection('users').doc(_currentUser.uid).set({
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                displayName: _currentUser.displayName || '',
                nickLower: (_currentUser.displayName || '').toLowerCase(),
                email: firebase.firestore.FieldValue.delete(),
                photoURL: _currentUser.photoURL || ''
            }, { merge: true });
        }
        updatePresence();
        if (_presenceInterval) clearInterval(_presenceInterval);
        _presenceInterval = setInterval(updatePresence, 60000); // update every 60s
        // Mark offline on page close
        window.addEventListener('beforeunload', function() {
            if (db && _currentUser) {
                db.collection('users').doc(_currentUser.uid).update({ online: false });
            }
        });
    }

    function stopPresence() {
        if (_presenceInterval) { clearInterval(_presenceInterval); _presenceInterval = null; }
        if (db && _currentUser) {
            db.collection('users').doc(_currentUser.uid).update({ online: false }).catch(function(){});
        }
    }

    // ═══════════════════════════════════════
    // SITE AUTH GATE (блокировка сайта для гостей + profile-gate для новичков)
    // ═══════════════════════════════════════
    window.siteAuthSignIn = function() {
        if (!auth || !_provider) {
            alert(t('Firebase не загружен. Проверьте подключение к интернету.'));
            return;
        }
        if (_authInProgress) return;
        _authInProgress = true;
        auth.signInWithPopup(_provider).catch(function(err){
            var ignored = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
            if (ignored.indexOf(err.code) === -1) {
                console.error('Auth error:', err);
                alert(t('Ошибка авторизации: ') + (err.message || ''));
            }
        }).finally(function() {
            _authInProgress = false;
        });
    };

    function showSiteAuthGate() {
        var g = document.getElementById('siteAuthGate');
        if (g) g.style.display = 'flex';
        // SEO/UX: НЕ блокируем body classList и НЕ скрываем контент.
        // Гейт теперь как modal — поверх контента, но контент остаётся в DOM
        // (Googlebot видит публичный контент, обычный юзер может закрыть гейт).
    }
    function hideSiteAuthGate() {
        var g = document.getElementById('siteAuthGate');
        if (g) g.style.display = 'none';
        document.body.classList.remove('site-auth-locked');
        document.documentElement.classList.remove('pre-guest');
        // Если юзер был в публичном просмотре турнира и залогинился — выходим из публичного режима
        if (document.documentElement.classList.contains('cs-public-mode')) {
            document.documentElement.classList.remove('cs-public-mode');
            // Триггерим ре-рендер чтобы баннер пропал и edit-кнопки появились (если он создатель)
            setTimeout(function () {
                if (typeof window._csRender === 'function') window._csRender();
            }, 300);
        }
        try { localStorage.setItem('_wrsAuthed', '1'); } catch(e){}
    }
    // Экспортируем для cybersport.js: он зовёт когда юзер закрывает публичный режим
    window.showSiteAuthGate = showSiteAuthGate;
    window.hideSiteAuthGate = hideSiteAuthGate;

    // Захватываем pending-URL параметры до любых навигаций
    var _pendingDeepLink = (function(){
        try {
            var p = new URLSearchParams(window.location.search);
            var draft = p.get('draft');
            var token = p.get('t');
            if (draft) return { type: 'draft', id: draft, token: token || '' };
            var cs = p.get('cs');
            if (cs) return { type: 'cybersport', id: cs };
        } catch(e) {}
        return null;
    })();

    function applyPendingDeepLink() {
        if (!_pendingDeepLink) return;
        var dl = _pendingDeepLink;
        _pendingDeepLink = null;
        // Чистим URL чтобы при перезагрузке не повторялось
        try {
            var url = new URL(window.location.href);
            url.searchParams.delete('draft');
            url.searchParams.delete('t');
            url.searchParams.delete('cs');
            window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        } catch(e) {}
        if (dl.type === 'draft') {
            // draft.js грузится лениво — дожидаемся загрузки, потом открываем лобби
            setTimeout(function(){
                _lazyScript('draft.js').then(function(){
                    if (window.openDraftCoop) window.openDraftCoop();
                    setTimeout(function(){
                        if (window.dcoopOpenLobby) window.dcoopOpenLobby(dl.id, dl.token);
                    }, 300);
                }).catch(function(e){ console.warn('[lazy] draft deeplink', e); });
            }, 200);
        } else if (dl.type === 'cybersport') {
            setTimeout(function(){
                if (window.openCybersportTournament) window.openCybersportTournament(dl.id);
                else if (window.openCybersport) window.openCybersport();
            }, 200);
        }
    }

    function checkProfileGate(user) {
        if (!db || !user) return;
        hideSiteAuthGate();

        function hasProfile(d) {
            return !!(d && typeof d.role === 'string' && d.role
                   && typeof d.rank === 'string' && d.rank);
        }

        function openGate() {
            try { localStorage.removeItem('_wrsProfileReady'); } catch(e){}
            document.body.classList.add('profile-gated');
            document.documentElement.classList.add('pre-profile-gate');
            setTimeout(function(){
                if (window.openProfileSetup) window.openProfileSetup();
            }, 200);
        }

        function passGate() {
            try { localStorage.setItem('_wrsProfileReady', '1'); } catch(e){}
            document.body.classList.remove('profile-gated');
            document.documentElement.classList.remove('pre-profile-gate');
            applyPendingDeepLink();
        }

        // Fast-path: если локальный флаг "профиль готов" выставлен — сразу пропускаем без modal-flash.
        // Валидацию с сервером сделаем в фоне — если вдруг данные сброшены, тихо откроем setup.
        var fastPassed = false;
        try {
            if (localStorage.getItem('_wrsProfileReady') === '1') {
                document.body.classList.remove('profile-gated');
                applyPendingDeepLink();
                fastPassed = true;
            }
        } catch(e){}

        // Пробуем default read (кеш+сервер). Если нашли role+rank — сразу пропускаем.
        var ref = db.collection('users').doc(user.uid);
        ref.get().then(function(snap){
            var d = snap.exists ? (snap.data() || {}) : {};
            if (hasProfile(d)) { passGate(); return; }

            // Возможно данные устарели или ещё не синхронизированы. Пробуем server-read через 800мс
            setTimeout(function(){
                ref.get({ source: 'server' }).then(function(s2){
                    var d2 = s2.exists ? (s2.data() || {}) : {};
                    if (hasProfile(d2)) passGate();
                    else if (!fastPassed) openGate();
                }).catch(function(e){
                    if (!snap.exists && !fastPassed) openGate();
                    else passGate();
                });
            }, 800);
        }).catch(function(e){
            ref.get({ source: 'server' }).then(function(s){
                var d = s.exists ? (s.data() || {}) : {};
                if (hasProfile(d)) passGate();
                else if (!fastPassed) openGate();
            }).catch(function(){
                if (!fastPassed) passGate();
            });
        });
    }

    // Hook into auth state
    if (auth) {
        var _prevUid = null;
        auth.onAuthStateChanged(function(user) {
            var newUid = user ? user.uid : null;
            var userChanged = _prevUid !== newUid;
            if (userChanged) purgeAdminUI();
            _prevUid = newUid;
            _currentUser = user || null;
            updateAuthUI(user);
            if (user) {
                // Firebase шлёт onAuthStateChanged и при token refresh — heavy ops только при смене uid.
                if (userChanged) {
                    loadUserDataFromFirestore();
                    startPresence();
                    updateChatUI(true);
                    checkAdmin();
                    checkFirstLogin();
                    checkProfileGate(user);
                }
                hideSiteAuthGate();
                if (window._postLoginAction) {
                    var _act = window._postLoginAction;
                    window._postLoginAction = null;
                    try { setTimeout(_act, 200); } catch (e) { console.warn('postLoginAction', e); }
                }
            } else {
                stopPresence();
                updateChatUI(false);
                document.body.classList.remove('profile-gated');
                // SEO + UX: НЕ показываем глобальный гейт незалогиненным посетителям.
                // Главная (тир-листы, винрейты, патчноуты, инфлюенсеры, киберспорт)
                // публична — Googlebot и обычные посетители видят контент сразу.
                // Гейт показывается только при попытке войти в auth-only фичу
                // (профиль / чат / драфт-серии / админка) — см. requireAuth().
                document.documentElement.classList.remove('pre-guest');
                document.body.classList.remove('site-auth-locked');
                hideSiteAuthGate();
                // Deep-link для турнира — продолжает работать как раньше
                var hasCsDeepLink = _pendingDeepLink && _pendingDeepLink.type === 'cybersport';
                if (hasCsDeepLink || document.documentElement.classList.contains('cs-public-mode')) {
                    if (hasCsDeepLink && !document.documentElement.classList.contains('cs-public-mode')) {
                        document.documentElement.classList.add('cs-public-mode');
                    }
                    applyPendingDeepLink();
                }
            }
        });
    } else {
        // Firebase недоступен — НЕ блокируем сайт, контент остаётся доступным
        document.documentElement.classList.remove('pre-guest');
        document.body.classList.remove('site-auth-locked');
    }

    // ─── requireAuth: открыть фичу только если юзер залогинен ───
    // Используется для функций, которым реально нужен Firestore-state
    // (профиль, чат, драфт-серии, админка). Если не залогинен — показываем
    // siteAuthGate с пояснением, ЗАЧЕМ нужен вход; гейт закрывается через ✕.
    window.requireAuth = function(featureLabel, onAuthed) {
        if (_currentUser) {
            // onAuthed тут НЕ вызываем: вызывающая фича передаёт саму себя
            // (openProfileSetup/openChatSystem) и продолжит работу сама.
            // Повторный вызов = бесконечная рекурсия до переполнения стека.
            return true;
        }
        // Запоминаем что после логина открыть эту фичу
        try { window._postLoginAction = onAuthed || null; } catch (e) {}
        // Меняем текст гейта под конкретную фичу (если есть подзаголовок)
        var gateSub = document.querySelector('#siteAuthGate [data-auth-sub]');
        if (gateSub && featureLabel) {
            gateSub.textContent = featureLabel;
        }
        showSiteAuthGate();
        return false;
    };


    // ═══════════════════════════════════════
    // CHAT SYSTEM (v2 — simplified)
    // ═══════════════════════════════════════
    var _chatListener = null;
    var _chatMessages = [];
    var _allUsers = [];
    var _chatOpen = false;
    var _chatLastSeenTs = parseInt(localStorage.getItem('chatLastSeenTs') || '0', 10);
    var _chatBadgeInitialized = false;

    function updateChatUI(loggedIn) {
        var inputArea = document.getElementById('chatInputArea');
        var loginPrompt = document.getElementById('chatLoginPrompt');
        if (inputArea) inputArea.style.display = loggedIn ? 'flex' : 'none';
        if (loginPrompt) loginPrompt.style.display = loggedIn ? 'none' : '';
    }

    // ═══ OPEN / CLOSE ═══
    window.openChatSystem = function() {
        // Чат требует логин (отправка/получение сообщений завязаны на uid).
        if (!window.requireAuth || !window.requireAuth('Войди через Google чтобы писать в общий чат и видеть онлайн-юзеров.', window.openChatSystem)) {
            if (!_currentUser) return;
        }
        _chatOpen = true;
        openModal('chatSystemMask');
        updateChatUI(!!_currentUser);
        switchToGlobal();
        loadUsersToSidebar();
        fixMobileKeyboard();
        clearChatBadge();
    };
    window.closeChatSystem = function() {
        _chatOpen = false;
        clearChatBadge();
        closeModal('chatSystemMask');
        if (_chatListener) { _chatListener(); _chatListener = null; }
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.remove('mobile-open');
        var mask = document.getElementById('chatSystemMask');
        if (mask) { mask.style.height = ''; mask.style.maxHeight = ''; mask.style.top = ''; }
        // Clean up PC chat mode
        if (document.body.classList.contains('pc-chat-mode')) {
            document.body.classList.remove('pc-chat-mode');
            var sPanel = document.getElementById('sidePanel');
            if (sPanel) sPanel.classList.remove('open');
        }
    };
    // ═══ SIDEBAR CHAT BADGE ═══
    function getMsgTs(msg) {
        if (!msg.ts) return 0;
        return msg.ts.toMillis ? msg.ts.toMillis() : Number(msg.ts);
    }
    function clearChatBadge() {
        var badge = document.getElementById('sidebarChatBadge');
        if (badge) { badge.style.display = 'none'; badge.textContent = ''; }
        var lastTs = _chatMessages.length ? getMsgTs(_chatMessages[_chatMessages.length - 1]) : Date.now();
        _chatLastSeenTs = lastTs;
        localStorage.setItem('chatLastSeenTs', _chatLastSeenTs);
    }
    function updateSidebarChatBadge() {
        var badge = document.getElementById('sidebarChatBadge');
        if (!badge) return;
        if (_chatOpen) { badge.style.display = 'none'; badge.textContent = ''; return; }
        if (!_chatMessages.length) return;
        var lastTs = getMsgTs(_chatMessages[_chatMessages.length - 1]);
        if (!_chatBadgeInitialized) {
            _chatBadgeInitialized = true;
            if (!_chatLastSeenTs) {
                _chatLastSeenTs = lastTs;
                localStorage.setItem('chatLastSeenTs', _chatLastSeenTs);
            }
            // re-check after init
        }
        if (lastTs > _chatLastSeenTs) {
            var unread = 0, mentioned = false;
            _chatMessages.forEach(function(msg) {
                if (getMsgTs(msg) > _chatLastSeenTs) { unread++; if (msgMentionsMe(msg)) mentioned = true; }
            });
            badge.textContent = unread > 9 ? '9+' : String(unread);
            badge.style.display = 'inline-block';
            badge.classList.toggle('mention', mentioned);
        } else {
            badge.style.display = 'none';
            badge.textContent = '';
            badge.classList.remove('mention');
        }
    }

    // ═══ OPEN GLOBAL CHAT ═══
    function switchToGlobal() {
        startChatListener();
        renderGlobalChat();
    }
    window.switchToGlobal = switchToGlobal;

    // ═══ MOBILE ═══
    window.tgMobileShowSidebar = function() {
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.add('mobile-open');
    };
    window.tgMobileCloseSidebar = function() {
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.remove('mobile-open');
    };

    function fixMobileKeyboard() {
        // Now handled by the unified VV fix below
    }

    // ─── Global visual-viewport fix: prevent modal headers from flying off ───
    // When soft keyboard opens, shrink ALL active modals to fit visible area
    (function() {
        var vv = window.visualViewport;
        if (!vv) return;

        function applyVVFix() {
            var h = vv.height;
            var t = vv.offsetTop;

            document.querySelectorAll('.m-mask.active').forEach(function(mask) {
                // Pin mask to the visible part of the viewport
                mask.style.position = 'fixed';
                mask.style.top = t + 'px';
                mask.style.bottom = 'auto';
                mask.style.height = h + 'px';
                mask.style.maxHeight = h + 'px';

                // Chat mask — also scroll messages to bottom
                if (mask.id === 'chatSystemMask') {
                    var chatWin = mask.querySelector('.m-win');
                    if (chatWin) {
                        chatWin.style.height = h + 'px';
                        chatWin.style.maxHeight = h + 'px';
                    }
                    var chatMsgs = document.getElementById('chatMessages');
                    if (chatMsgs) setTimeout(function() { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 50);
                    return;
                }

                // calcMask uses .calc-body (direct child div), not .m-win
                if (mask.id === 'calcMask') {
                    var calcInner = mask.querySelector('.calc-body') || mask.querySelector('div');
                    if (calcInner) {
                        calcInner.style.height = h + 'px';
                        calcInner.style.maxHeight = h + 'px';
                    }
                } else {
                    var win = mask.querySelector('.m-win');
                    if (win) {
                        win.style.height = h + 'px';
                        win.style.maxHeight = h + 'px';
                    }
                }
            });
        }

        function resetVVFix(mask) {
            if (!mask) return;
            mask.style.top = '';
            mask.style.bottom = '';
            mask.style.height = '';
            mask.style.maxHeight = '';
            var win = mask.querySelector('.m-win') || mask.querySelector('.calc-body') || mask.querySelector('div');
            if (win) { win.style.height = ''; win.style.maxHeight = ''; }
        }

        // rAF-throttle: max 1 call per frame, не дёргает forced reflow на каждое событие
        var _vvRaf = false;
        function applyVVFixThrottled() {
            if (_vvRaf) return;
            _vvRaf = true;
            requestAnimationFrame(function() {
                _vvRaf = false;
                applyVVFix();
            });
        }
        vv.addEventListener('resize', applyVVFixThrottled, { passive: true });
        vv.addEventListener('scroll', applyVVFixThrottled, { passive: true });
        // Expose reset so closeModal can clean up
        window._resetModalVV = resetVVFix;
    })();

    // ═══ USERS SIDEBAR (always shows all users) ═══
    function loadUsersToSidebar() {
        var container = document.getElementById('tgSidebarContent');
        if (!container) return;
        // Skeleton: 6 строк-плейсхолдеров вместо текста «Загрузка...» —
        // юзер сразу видит «форму» списка, перцептивно быстрее.
        var skRows = '';
        for (var i = 0; i < 6; i++) {
          skRows += '<div class="sk-row">'
            +   '<span class="sk sk-circle"></span>'
            +   '<div class="sk-stack">'
            +     '<span class="sk sk-line sk-w-65 sk-h-sm"></span>'
            +     '<span class="sk sk-line sk-w-40 sk-h-sm"></span>'
            +   '</div>'
            + '</div>';
        }
        container.innerHTML = skRows;
        loadAllUsers(function() {
                renderUsersSidebar();
        });
    }

    function loadAllUsers(cb) {
        if (!db) { if (cb) cb(); return; }
        db.collection('users').orderBy('displayName').get().then(function(snap) {
            _allUsers = [];
            snap.forEach(function(doc) {
                var d = doc.data(); d._uid = doc.id;
                if (d.lastSeen && d.lastSeen.toDate) {
                    var diff = Date.now() - d.lastSeen.toDate().getTime();
                    d._online = d.online && diff < 120000;
                } else { d._online = false; }
                _allUsers.push(d);
            });
            _allUsers.sort(function(a, b) {
                if (a._online && !b._online) return -1;
                if (!a._online && b._online) return 1;
                return (a.displayName || '').localeCompare(b.displayName || '');
            });
            // Update online count
            var countEl = document.getElementById('chatOnlineCount');
            if (countEl) {
                var onl = _allUsers.filter(function(u) { return u._online; }).length;
                countEl.textContent = onl + t(' онлайн');
            }
            if (cb) cb();
        }).catch(function(e) { console.warn('Users load err:', e); if (cb) cb(); });
    }

    function _safeAvatarUrl(raw) {
        if (typeof raw !== 'string' || !raw) return '';
        try {
            var u = new URL(raw, window.location.href);
            if (u.protocol !== 'https:') return '';
            var h = u.hostname;
            if (h === 'googleusercontent.com' || h.endsWith('.googleusercontent.com')
                || h === 'firebasestorage.googleapis.com' || h.endsWith('.firebasestorage.app')) return u.href;
            return '';
        } catch (e) { return ''; }
    }

    function renderUsersSidebar() {
        var container = document.getElementById('tgSidebarContent');
        if (!container) return;
        container.innerHTML = '';
        if (!_allUsers.length) { container.innerHTML = '<div class="chat-login-msg">'+t('Нет пользователей')+'</div>'; return; }

        _allUsers.forEach(function(u) {
            if (_currentUser && u._uid === _currentUser.uid) return;
            var card = document.createElement('div');
            card.className = 'user-card';
            card.onclick = (function(usr, cardEl) {
                return function(e) {
                    e.stopPropagation();
                    showUserTooltip(usr, cardEl);
                };
            })(u, card);

            var avWrap = document.createElement('div');
            avWrap.className = 'user-av-wrap';
            var av = document.createElement('div');
            av.className = 'user-av';
            var uPhoto = _safeAvatarUrl(u.photoURL);
            if (uPhoto) {
                var avImg = document.createElement('img');
                avImg.src = uPhoto;
                avImg.onerror = function(){ this.style.display='none'; };
                av.appendChild(avImg);
            } else av.textContent = (u.displayName||'?').charAt(0).toUpperCase();
            avWrap.appendChild(av);
            var dot = document.createElement('div');
            dot.className = 'user-status-dot ' + (u._online ? 'online' : 'offline');
            avWrap.appendChild(dot);
            card.appendChild(avWrap);

            var info = document.createElement('div');
            info.className = 'user-info';
            var nameDiv = document.createElement('div');
            nameDiv.className = 'user-name';
            nameDiv.textContent = u.displayName || u.email || '???';
            info.appendChild(nameDiv);
            var statusDiv = document.createElement('div');
            statusDiv.className = 'user-email';
            var statusTxt = (u._online ? t('🟢 Онлайн') : t('Оффлайн'));
            if (u.role) statusTxt += ' · ' + u.role;
            statusDiv.textContent = statusTxt;
            if (u.rank) {
                var rk = RANKS.find(function(r) { return r.id === u.rank; });
                if (rk) {
                    statusDiv.appendChild(document.createTextNode(' · '));
                    var rkSpan = document.createElement('span');
                    rkSpan.style.color = rk.color;
                    rkSpan.textContent = rk.name;
                    statusDiv.appendChild(rkSpan);
                }
            }
            info.appendChild(statusDiv);
            card.appendChild(info);

            container.appendChild(card);
        });
    }


    // ═══ GLOBAL CHAT ═══
    function startChatListener() {
        if (_chatListener || !db) return;
        _chatListener = db.collection('globalChat')
            .orderBy('ts', 'desc')
            .limit(100)
            .onSnapshot(function(snap) {
                _chatMessages = [];
                snap.forEach(function(doc) { var d = doc.data(); d._id = doc.id; _chatMessages.push(d); });
                _chatMessages.reverse(); // oldest first for display
                renderGlobalChat();
                updateSidebarChatBadge();
            }, function(err) {
                console.error('Chat listener error:', err);
                // Reset so startChatListener() can retry next time
                _chatListener = null;
                if (err.code === 'permission-denied') {
                    showToast(t('Нет доступа к чату. Проверьте Firestore Rules.'));
                } else if (err.code === 'failed-precondition') {
                    showToast(t('Чат: требуется индекс Firestore. Проверь консоль.'));
                } else {
                    showToast(t('Ошибка чата: ') + (err.code || err.message));
                }
            });
    }

    function renderGlobalChat() {
        var container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = '';
        // Show/hide input and always reset disabled state on re-render
        var inputArea = document.getElementById('chatInputArea');
        var loginPrompt = document.getElementById('chatLoginPrompt');
        if (inputArea) {
            inputArea.style.display = _currentUser ? 'flex' : 'none';
            var inp = document.getElementById('chatInput');
            var sBtn = document.querySelector('#tgChatPanel .chat-send');
            if (inp) inp.disabled = false;
            if (sBtn) { sBtn.disabled = false; sBtn.textContent = '➤'; }
        }
        if (loginPrompt) loginPrompt.style.display = _currentUser ? 'none' : 'block';

        if (!_chatMessages.length) {
            container.innerHTML = '<div class="chat-login-msg">'+t('Напиши первым! 💬')+'</div>';
            return;
        }

        // ТОЧЕЧНОЕ ОБНОВЛЕНИЕ: не пересобираем ленту целиком.
        // Раньше container.innerHTML='' на КАЖДОЕ сообщение и КАЖДУЮ реакцию
        // пересоздавал все пузыри → у всех заново играл fadeIn → мигала вся лента.
        // Теперь трогаем только то, что реально изменилось.
        var placeholder = container.querySelector('.chat-login-msg');
        if (placeholder) container.innerHTML = '';

        // «стоим ли внизу» — считаем ДО правок, иначе автоскролл вырвет ленту из рук
        var nearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 80;

        var existing = {};
        Array.prototype.forEach.call(container.querySelectorAll('.chat-bubble-row'), function(r) {
            if (r.dataset.id) existing[r.dataset.id] = r;
        });

        var seen = {}, prev = null, added = false;
        _chatMessages.forEach(function(msg) {
            var id = msg._id;
            if (!id) return;
            seen[id] = true;
            var sig = JSON.stringify(msg);          // подпись: текст, реакции, ответ, правки
            var row = existing[id];
            if (!row || row.dataset.sig !== sig) {
                var frag = document.createDocumentFragment();
                renderBubble(frag, msg, _currentUser && msg.uid === _currentUser.uid, true);
                var fresh = frag.firstChild;
                if (!fresh) return;
                fresh.dataset.sig = sig;
                if (row) {
                    // Пузырь БЫЛ — это правка (реакция/ответ/редактирование), а не появление.
                    // Гасим анимацию появления, иначе при каждой реакции сообщение «мигает».
                    fresh.classList.add('no-anim');
                    container.replaceChild(fresh, row);
                }
                else {
                    if (prev && prev.nextSibling) container.insertBefore(fresh, prev.nextSibling);
                    else container.appendChild(fresh);
                    added = true;
                }
                row = fresh;
            }
            prev = row;
        });

        // удалённые сообщения
        Array.prototype.forEach.call(container.querySelectorAll('.chat-bubble-row'), function(r) {
            if (!seen[r.dataset.id]) r.remove();
        });

        // скроллим вниз только если пришло новое И пользователь и так был внизу
        if (added && nearBottom) container.scrollTop = container.scrollHeight;
    }

    // ═══════════════════════════════════════════
    // ЧАТ: реакции / ответы / карточки / упоминания
    // ═══════════════════════════════════════════
    var REACT_EMOJIS = ['👍','🔥','😂','❤️','😮','😢'];
    var _chatReply = null; // {id,name,text}

    function _myUid() { return _currentUser ? _currentUser.uid : null; }
    function _findChatMsg(id) {
        for (var i = 0; i < _chatMessages.length; i++) { if (_chatMessages[i]._id === id) return _chatMessages[i]; }
        return null;
    }

    // reactions хранятся как map эмодзи → массив uid
    function reactionEntries(msg) {
        var r = msg.reactions || {}, out = [];
        Object.keys(r).forEach(function(e) {
            var uids = Array.isArray(r[e]) ? r[e] : [];
            if (!uids.length) return;
            out.push({ e: e, n: uids.length, mine: !!(_myUid() && uids.indexOf(_myUid()) >= 0) });
        });
        return out;
    }
    function toggleReaction(msgId, emoji) {
        if (!db || !_currentUser) { showToast(t('Войди чтобы реагировать')); return; }
        var ref = db.collection('globalChat').doc(msgId);
        db.runTransaction(function(tx) {
            return tx.get(ref).then(function(doc) {
                if (!doc.exists) return;
                var reactions = doc.data().reactions || {};
                var uids = Array.isArray(reactions[emoji]) ? reactions[emoji].slice() : [];
                var idx = uids.indexOf(_currentUser.uid);
                if (idx >= 0) uids.splice(idx, 1); else uids.push(_currentUser.uid);
                if (uids.length) reactions[emoji] = uids; else delete reactions[emoji];
                tx.update(ref, { reactions: reactions });
            });
        }).catch(function(e) { console.warn('react err', e); });
    }
    window.tgToggleReaction = toggleReaction;

    // ─── эмодзи-пикер реакции ───
    function openReactPicker(btn, msgId) {
        var old = document.querySelector('.chat-react-pop'); if (old) old.remove();
        var pop = document.createElement('div'); pop.className = 'chat-react-pop';
        REACT_EMOJIS.forEach(function(e) {
            var b = document.createElement('button'); b.textContent = e;
            b.onclick = function(ev) { ev.stopPropagation(); pop.remove(); toggleReaction(msgId, e); };
            pop.appendChild(b);
        });
        document.body.appendChild(pop);
        var br = btn.getBoundingClientRect();
        pop.style.left = Math.max(6, Math.min(br.left, window.innerWidth - pop.offsetWidth - 6)) + 'px';
        var top = br.top - pop.offsetHeight - 6; if (top < 6) top = br.bottom + 6;
        pop.style.top = top + 'px';
        setTimeout(function() { document.addEventListener('click', function h() { if (pop.parentNode) pop.remove(); document.removeEventListener('click', h); }); }, 0);
    }

    // ─── ответы ───
    window.setChatReply = function(msgId) {
        var msg = _findChatMsg(msgId); if (!msg) return;
        _chatReply = { id: msgId, name: (msg.uid === _myUid() ? t('Вы') : (msg.name || t('Аноним'))), text: (msg.text || (msg.card ? t('вложение') : '')) };
        renderChatReplyBar();
        var inp = document.getElementById('chatInput'); if (inp) inp.focus();
    };
    window.cancelChatReply = function() { _chatReply = null; renderChatReplyBar(); };
    function renderChatReplyBar() {
        var bar = document.getElementById('chatReplyBar'); if (!bar) return;
        bar.innerHTML = '';
        if (!_chatReply) { bar.style.display = 'none'; return; }
        bar.style.display = 'flex';
        var ic = document.createElement('span'); ic.className = 'crb-ic'; ic.textContent = '↩';
        var tx = document.createElement('span'); tx.className = 'crb-tx';
        var b = document.createElement('b'); b.textContent = _chatReply.name;
        tx.appendChild(document.createTextNode(t('Ответ') + ' ')); tx.appendChild(b);
        tx.appendChild(document.createTextNode(': ' + _chatReply.text));
        var x = document.createElement('button'); x.className = 'crb-x'; x.textContent = '✕'; x.onclick = window.cancelChatReply;
        bar.appendChild(ic); bar.appendChild(tx); bar.appendChild(x);
    }

    // ─── упоминания ───
    function parseMentions(text) {
        var out = [], re = /@([^\s@]{1,40})/g, m;
        while ((m = re.exec(text))) { if (out.indexOf(m[1]) < 0) out.push(m[1]); }
        return out;
    }
    function msgMentionsMe(msg) {
        if (!msg.mentions || !_currentUser) return false;
        var me = (_currentUser.displayName || '').split(/\s+/)[0].toLowerCase();
        if (!me) return false;
        return msg.mentions.some(function(n) { return String(n).toLowerCase() === me; });
    }
    // текст с подсветкой @упоминаний — безопасно, через DOM-узлы
    function appendTextWithMentions(parent, text) {
        text = text || '';
        var re = /@([^\s@]{1,40})/g, last = 0, m;
        while ((m = re.exec(text))) {
            if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
            var sp = document.createElement('span'); sp.className = 'chat-mention'; sp.textContent = '@' + m[1];
            parent.appendChild(sp);
            last = m.index + m[0].length;
        }
        if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    }

    // ─── карточки-ссылки (deep-link контента сайта) ───
    function renderChatCard(card) {
        var el = document.createElement('div'); el.className = 'chat-card';
        var head = document.createElement('div'); head.className = 'chat-card-h';
        var ic = document.createElement('div'); ic.className = 'chat-card-ic';
        var title = card.name || '', sub = '', label = t('Открыть');
        function champPic(name) {
            try { var src = window._champIcon ? window._champIcon(name) : ''; if (src) { var im = document.createElement('img'); im.src = src; im.onerror = function(){ this.style.display='none'; }; ic.classList.add('round'); ic.appendChild(im); return; } } catch (e) {}
            ic.textContent = (name || '?').charAt(0).toUpperCase();
        }
        if (card.type === 'champion') { champPic(card.name); sub = t('Чемпион'); label = t('Открыть чемпиона'); }
        else if (card.type === 'matchup') { champPic(card.name); title = t('Матчапы') + ' · ' + card.name; sub = t('контры и фавориты'); label = t('Открыть матчапы'); }
        else if (card.type === 'build') { champPic(card.name); title = t('Сборка') + ' · ' + card.name; sub = t('ядро и руны'); label = t('Открыть сборку'); }
        else if (card.type === 'tier') { ic.textContent = '🏆'; title = t('Тир-лист') + (card.patch ? ' · ' + card.patch : ''); sub = t('актуальная мета'); label = t('Открыть тир-лист'); }
        else if (card.type === 'item') { ic.textContent = '📦'; title = card.name || t('Предмет'); sub = t('Предмет'); label = t('Открыть предмет'); }
        else { ic.textContent = '🔗'; }
        head.appendChild(ic);
        var tt = document.createElement('div'); tt.className = 'chat-card-tt';
        var t1 = document.createElement('div'); t1.className = 't'; t1.textContent = title;
        var t2 = document.createElement('div'); t2.className = 's'; t2.textContent = sub;
        tt.appendChild(t1); tt.appendChild(t2); head.appendChild(tt); el.appendChild(head);
        var btn = document.createElement('button'); btn.className = 'chat-card-btn'; btn.textContent = label + ' →';
        btn.onclick = function(e) { e.stopPropagation(); openCardTarget(card); };
        el.appendChild(btn);
        return el;
    }
    function openCardTarget(card) {
        try {
            if (card.type === 'tier') { if (window.sidebarOpen) sidebarOpen('tierMenu'); return; }
            if (card.type === 'item') { if (window.sidebarOpen) sidebarOpen('items'); return; }
            if (window.openChampPage) { window.openChampPage(card.name); return; }
            if (window.sidebarOpen) sidebarOpen('sideChamps');
        } catch (e) { console.warn('openCardTarget', e); }
    }

    function renderBubble(container, msg, isMe, showAdmin) {
        var row = document.createElement('div');
        row.className = 'chat-bubble-row' + (isMe ? ' me' : '');
        if (msg._id) row.dataset.id = msg._id;

        var av = document.createElement('div');
        av.className = 'chat-bubble-av';
        var msgPhoto = _safeAvatarUrl(msg.photoURL);
        if (msgPhoto) {
            var avImg = document.createElement('img');
            avImg.src = msgPhoto;
            avImg.onerror = function(){ this.style.display='none'; };
            av.appendChild(avImg);
        } else av.textContent = (msg.name || '?').charAt(0).toUpperCase();
        row.appendChild(av);

        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        if (msg.isSystem) bubble.style.cssText = 'background:rgba(255,215,0,0.1) !important;border:1px solid rgba(255,215,0,0.2);';

        if (!isMe) {
            var nameEl = document.createElement('div');
            nameEl.className = 'chat-bubble-name' + (showAdmin && msg.isAdmin ? ' admin' : '');
            nameEl.textContent = (showAdmin && msg.isAdmin ? '👑 ' : '') + (msg.name || t('Аноним'));
            bubble.appendChild(nameEl);
        }

        // цитата-ответ
        if (msg.replyTo) {
            var q = document.createElement('div'); q.className = 'chat-reply-quote';
            var qn = document.createElement('span'); qn.className = 'qn'; qn.textContent = msg.replyTo.name || '';
            var qt = document.createElement('span'); qt.className = 'qt'; qt.textContent = msg.replyTo.text || t('вложение');
            q.appendChild(qn); q.appendChild(qt);
            bubble.appendChild(q);
        }

        if (msg.text) {
            var textEl = document.createElement('div');
            textEl.className = 'chat-bubble-text';
            textEl.style.fontWeight = '400';
            appendTextWithMentions(textEl, msg.text);
            bubble.appendChild(textEl);
        }

        // карточка-вложение
        if (msg.card) bubble.appendChild(renderChatCard(msg.card));

        var meta = document.createElement('div');
        meta.className = 'chat-bubble-meta';
        if (msg.ts) {
            var d = msg.ts.toDate ? msg.ts.toDate() : new Date(msg.ts);
            var timeEl = document.createElement('span');
            timeEl.className = 'chat-bubble-time';
            timeEl.textContent = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            meta.appendChild(timeEl);
        }
        if (_currentUser && _isAdmin && msg._id && !msg.isSystem) {
            var delBtn = document.createElement('span');
            delBtn.className = 'chat-bubble-del';
            delBtn.textContent = '🗑';
            delBtn.onclick = function() { deleteChatMsg(msg._id); };
            meta.appendChild(delBtn);
        }
        bubble.appendChild(meta);

        // чипы-реакции
        var reacts = reactionEntries(msg);
        if (reacts.length) {
            var rWrap = document.createElement('div'); rWrap.className = 'chat-reacts';
            reacts.forEach(function(r) {
                var chip = document.createElement('button');
                chip.className = 'chat-rchip' + (r.mine ? ' mine' : '');
                chip.textContent = r.e + ' ' + r.n;
                chip.onclick = function(e) { e.stopPropagation(); toggleReaction(msg._id, r.e); };
                rWrap.appendChild(chip);
            });
            bubble.appendChild(rWrap);
        }

        row.appendChild(bubble);

        // инструменты при наведении: реакция / ответить (только залогиненным, не на системных)
        if (_currentUser && msg._id && !msg.isSystem) {
            var tools = document.createElement('div'); tools.className = 'chat-row-tools';
            var rb = document.createElement('button'); rb.title = t('Реакция'); rb.textContent = '😊';
            rb.onclick = function(e) { e.stopPropagation(); openReactPicker(rb, msg._id); };
            var qb = document.createElement('button'); qb.title = t('Ответить'); qb.textContent = '↩';
            qb.onclick = function(e) { e.stopPropagation(); window.setChatReply(msg._id); };
            tools.appendChild(rb); tools.appendChild(qb);
            row.appendChild(tools);
        }

        container.appendChild(row);
    }

    // ═══ SEND MESSAGE ═══
    window.tgSendMsg = function() { sendGlobalMsg(); };

    function sendGlobalMsg() {
        if (!db) { showToast(t('Firebase не подключён')); return; }
        if (!_currentUser) { showToast(t('Войди в аккаунт чтобы писать')); return; }
        var input = document.getElementById('chatInput');
        if (!input) return;
        var text = (input.value || '').trim();
        if (!text) return;

        var replySnapshot = _chatReply;
        var mentions = parseMentions(text);

        // Ensure chat listener is running (restart if died)
        if (!_chatListener) { startChatListener(); }

        var sendBtn = document.querySelector('#tgChatPanel .chat-send');
        if (!sendBtn) sendBtn = document.querySelector('.chat-send');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }
        input.value = '';
        input.disabled = true;

        // Fallback: если Firestore завис и ни .then() ни .catch() не сработали за 5с
        var _sendFallback = setTimeout(function() {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
            if (input) input.disabled = false;
        }, 5000);

        var payload = {
            text: text,
            name: _currentUser.displayName || _currentUser.email || t('Аноним'),
            uid: _currentUser.uid,
            photoURL: _currentUser.photoURL || '',
            isAdmin: _isAdmin || false,
            ts: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (replySnapshot) payload.replyTo = { id: replySnapshot.id || '', name: replySnapshot.name || '', text: (replySnapshot.text || '').slice(0, 140) };
        if (mentions.length) payload.mentions = mentions.slice(0, 10);

        db.collection('globalChat').add(payload).then(function() {
            clearTimeout(_sendFallback);
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
            if (input) input.disabled = false;
            window.cancelChatReply();
            cleanupOldChat();
        }).catch(function(err) {
            clearTimeout(_sendFallback);
            console.error('Send error:', err);
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
            if (input) { input.disabled = false; input.value = text; }
            showToast(t('Ошибка отправки: ') + (err.code || err.message || t('Неизвестная')));
        });
    }
    window.sendChatMsg = sendGlobalMsg;

    function cleanupOldChat() {
        db.collection('globalChat').orderBy('ts', 'asc').get().then(function(snap) {
            if (snap.size > 100) {
                var toDelete = snap.size - 100;
                var batch = db.batch();
                var i = 0;
                snap.forEach(function(doc) { if (i < toDelete) { batch.delete(doc.ref); i++; } });
                batch.commit();
            }
        }).catch(function() {});
    }

    // ─── поделиться карточкой-ссылкой (📎) ───
    function sendCardMessage(card, text) {
        if (!db || !_currentUser) { showToast(t('Войди чтобы делиться')); return; }
        var payload = {
            text: (text || '').slice(0, 1000),
            name: _currentUser.displayName || _currentUser.email || t('Аноним'),
            uid: _currentUser.uid,
            photoURL: _currentUser.photoURL || '',
            isAdmin: _isAdmin || false,
            card: card,
            ts: firebase.firestore.FieldValue.serverTimestamp()
        };
        db.collection('globalChat').add(payload).then(function() { cleanupOldChat(); })
            .catch(function(err) { showToast(t('Ошибка отправки: ') + (err.code || err.message || '')); });
    }
    window.sendChatCard = sendCardMessage;

    // ─── меню «прикрепить кнопку-ссылку» ───
    window.openChatAttach = function(ev) {
        if (ev) ev.stopPropagation();
        if (!_currentUser) { showToast(t('Войди чтобы делиться')); return; }
        var old = document.querySelector('.chat-attach-menu'); if (old) { old.remove(); return; }
        var menu = document.createElement('div'); menu.className = 'chat-attach-menu';
        var items = [
            ['champion', '🧙', t('Карточка чемпиона')],
            ['matchup', '⚔️', t('Матчапы чемпа')],
            ['build', '🛠️', t('Сборка чемпа')],
            ['tier', '🏆', t('Тир-лист')]
        ];
        var h = document.createElement('div'); h.className = 'cam-h'; h.textContent = t('Скинуть кнопку-ссылку'); menu.appendChild(h);
        items.forEach(function(it) {
            var b = document.createElement('button');
            var ic = document.createElement('span'); ic.className = 'ai'; ic.textContent = it[1];
            b.appendChild(ic); b.appendChild(document.createTextNode(it[2]));
            b.onclick = function(e) {
                e.stopPropagation(); menu.remove();
                if (it[0] === 'tier') { sendCardMessage({ type: 'tier' }); showToast(t('Карточка отправлена')); }
                else openChatChampPicker(it[0]);
            };
            menu.appendChild(b);
        });
        document.body.appendChild(menu);
        var btn = ev && ev.currentTarget ? ev.currentTarget : document.querySelector('.chat-attach');
        if (btn) {
            var br = btn.getBoundingClientRect();
            menu.style.left = Math.max(6, br.left) + 'px';
            menu.style.top = (br.top - menu.offsetHeight - 8) + 'px';
        }
        setTimeout(function() { document.addEventListener('click', function hh() { if (menu.parentNode) menu.remove(); document.removeEventListener('click', hh); }); }, 0);
    };

    // ─── выбор чемпиона для карточки ───
    function openChatChampPicker(type) {
        var old = document.querySelector('.chat-champ-pick'); if (old) old.remove();
        var ov = document.createElement('div'); ov.className = 'chat-champ-pick';
        var box = document.createElement('div'); box.className = 'ccp-box';
        var head = document.createElement('div'); head.className = 'ccp-head';
        var title = document.createElement('div'); title.className = 'ccp-title';
        title.textContent = (type === 'matchup' ? t('Матчапы') : type === 'build' ? t('Сборка') : t('Чемпион')) + ' — ' + t('выбери чемпиона');
        var xb = document.createElement('button'); xb.className = 'ccp-x'; xb.textContent = '✕'; xb.onclick = function() { ov.remove(); };
        head.appendChild(title); head.appendChild(xb); box.appendChild(head);
        var search = document.createElement('input'); search.className = 'ccp-search'; search.type = 'text'; search.placeholder = t('Поиск чемпиона...');
        box.appendChild(search);
        var grid = document.createElement('div'); grid.className = 'ccp-grid'; box.appendChild(grid);
        ov.appendChild(box); document.body.appendChild(ov);
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

        var champs = (window._champsRaw || []).map(function(c) { return c.name; }).filter(Boolean);
        if (!champs.length) champs = ['Камилла', 'Дариус', 'Гарен', 'Ясуо', 'Зед', 'Ари', 'Люкс', 'Джинкс'];
        function draw(q) {
            grid.innerHTML = '';
            var ql = (q || '').toLowerCase();
            champs.filter(function(n) { return !ql || n.toLowerCase().indexOf(ql) >= 0; }).slice(0, 120).forEach(function(n) {
                var cell = document.createElement('button'); cell.className = 'ccp-cell';
                var im = document.createElement('img');
                try { im.src = window._champIcon ? window._champIcon(n) : ''; } catch (e) {}
                im.onerror = function() { this.style.display = 'none'; };
                var nm = document.createElement('span'); nm.textContent = n;
                cell.appendChild(im); cell.appendChild(nm);
                cell.onclick = function() { ov.remove(); sendCardMessage({ type: type, name: n }); showToast(t('Карточка отправлена')); };
                grid.appendChild(cell);
            });
        }
        draw('');
        search.oninput = function() { draw(search.value); };
        setTimeout(function() { search.focus(); }, 30);
    }

    function deleteChatMsg(docId) {
        if (!db) return;
        db.collection('globalChat').doc(docId).delete().catch(function(e) { console.warn('Del err:', e); });
    }

    // ═══ COMPAT ═══
    window.closeUserMenuAndOpen = function(what) {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        if (what === 'profile') { openProfileSetup(); }
    };
    window.openUsersList = function() { openChatSystem(); };

    // ═══════════════════════════════════════
    // PROFILE SETUP
    // ═══════════════════════════════════════
    var _profileRole = '';
    var _profileRank = '';
    var _profileSocialLinks = [];

    // Локальный кэш профиля (localStorage) — чтобы окно профиля открывалось
    // мгновенно, не дожидаясь ответа Firestore (~5с на медленном соединении).
    function _profileCacheKey(uid) { return '_wrsProfileCache_' + uid; }
    function _readProfileCache(uid) {
        if (!uid) return null;
        try {
            var raw = localStorage.getItem(_profileCacheKey(uid));
            if (!raw) return null;
            var d = JSON.parse(raw);
            return {
                role: d.role || '',
                rank: d.rank || '',
                socialLinks: Array.isArray(d.socialLinks) ? d.socialLinks : []
            };
        } catch (e) { return null; }
    }
    function _writeProfileCache(uid, d) {
        if (!uid) return;
        try {
            localStorage.setItem(_profileCacheKey(uid), JSON.stringify({
                role: d.role || '',
                rank: d.rank || '',
                socialLinks: Array.isArray(d.socialLinks) ? d.socialLinks : []
            }));
        } catch (e) {}
    }

    var RANKS = [
        { id:'diamond',     name:'Diamond',   color:'#B9F2FF', img:'web.p/Diamond.webp' },
        { id:'master',      name:'Master',    color:'#9B59B6', img:'web.p/Master.webp' },
        { id:'grandmaster', name:'GM',        color:'#E74C3C', img:'web.p/Grandmaster.webp' },
        { id:'challenger',  name:'Chall',     color:'#F39C12', img:'web.p/Challenger.webp' },
        { id:'sovereign',   name:'Sovereign', color:'#D4AF37', img:'web.p/Sovereign.webp' }
    ];
    var ROLES_LIST = ['Top','Jungle','Mid','ADC','Support'];

    var SOCIAL_PLATFORMS = [
        { id:'youtube',  name:'YouTube',  color:'#FF0000', bg:'rgba(255,0,0,0.15)',      border:'rgba(255,0,0,0.5)',      svg:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>' },
        { id:'twitch',   name:'Twitch',   color:'#9146FF', bg:'rgba(145,70,255,0.15)',   border:'rgba(145,70,255,0.5)',   svg:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#9146FF" d="M11.6 5.5H13v4.5h-1.4V5.5zm3.8 0H17v4.5h-1.6V5.5zM2.6 0L0 2.6v18.8h6.3V24l3.8-2.6H14l8.8-8.8V0H2.6zm18.7 12.1l-3.8 3.8H13l-3.4 2.5v-2.5H3.8V1.3h17.5v10.8z"/></svg>' },
        { id:'telegram', name:'Telegram', color:'#2AABEE', bg:'rgba(42,171,238,0.15)',  border:'rgba(42,171,238,0.5)',  svg:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#2AABEE" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 8.2-2 9.4c-.1.6-.5.8-1 .5l-2.8-2-1.3 1.3c-.2.2-.4.3-.7.3l.2-2.9 5-4.5c.2-.2 0-.3-.3-.1L6.5 14.6l-2.7-.9c-.6-.2-.6-.6.1-.9l10.5-4c.6-.1 1.1.2.9.8z"/></svg>' },
        { id:'discord',  name:'Discord',  color:'#5865F2', bg:'rgba(88,101,242,0.15)',  border:'rgba(88,101,242,0.5)',  svg:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3c-.2.4-.5.9-.7 1.3a18.2 18.2 0 0 0-5.4 0C9.1 3.9 8.8 3.4 8.6 3A19.5 19.5 0 0 0 3.7 4.4C.5 9.2-.3 13.9.1 18.5a19.8 19.8 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2 12.8 12.8 0 0 1-2-.9l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.8 12.8 0 0 1-2 1 14.7 14.7 0 0 0 1.3 2 19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.8-3.7-14.1zM8.1 15.7c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3zm7.8 0c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3z"/></svg>' }
    ];

    function _resetSaveBtn() {
        var btn = document.getElementById('profileSaveBtn');
        if (!btn) return;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.background = 'linear-gradient(135deg,var(--sel-base),var(--sel-stat))';
        btn.textContent = t('✓ Сохранить');
    }

    window.openProfileSetup = function() {
        // Профиль читает/пишет в Firestore users/{uid} — без логина бессмысленно.
        if (!window.requireAuth || !window.requireAuth('Войди через Google чтобы настроить профиль (ник, ранг, любимые чемпы).', window.openProfileSetup)) {
            if (!_currentUser) return;
        }
        _profileRole = '';
        _profileRank = '';
        _profileSocialLinks = [];
        // Мгновенно подставляем последнюю известную копию профиля из кэша,
        // чтобы окно сразу открылось с заполненными ник/ранг/роль.
        var cached = _currentUser ? _readProfileCache(_currentUser.uid) : null;
        if (cached) {
            _profileRole = cached.role;
            _profileRank = cached.rank;
            _profileSocialLinks = cached.socialLinks;
        }
        _resetSaveBtn();
        openModal('profileSetupMask');
        var panelProfile = document.getElementById('profPanelProfile');
        var panelData = document.getElementById('profPanelData');
        if (panelProfile) { panelProfile.style.display = 'block'; panelProfile.style.flex = '1'; }
        if (panelData) panelData.style.display = 'none';
        renderProfileNick();
        drawRoles();
        drawRanks();
        renderProfileSocialLinks();
        if (db && _currentUser) {
            var _uid = _currentUser.uid;
            db.collection('users').doc(_uid).get().then(function(doc) {
                if (!doc.exists) return;
                var d = doc.data();
                var fresh = {
                    role: d.role || '',
                    rank: d.rank || '',
                    socialLinks: Array.isArray(d.socialLinks) ? d.socialLinks : []
                };
                _writeProfileCache(_uid, fresh);
                // Перерисовываем только если сервер вернул что-то отличное от
                // показанного — иначе ничего не мигает.
                var shown = { role: _profileRole, rank: _profileRank, socialLinks: _profileSocialLinks };
                if (JSON.stringify(fresh) !== JSON.stringify(shown)) {
                    _profileRole = fresh.role;
                    _profileRank = fresh.rank;
                    _profileSocialLinks = fresh.socialLinks;
                    drawRoles();
                    drawRanks();
                    renderProfileSocialLinks();
                }
            }).catch(function(e) { console.warn('Profile load:', e); });
        }
    };
    window.closeProfileSetup = function() {
        if (document.body.classList.contains('profile-gated')) {
            showToast(t('Заполни ник, роль и ранг — это одноразовая настройка.'));
            return;
        }
        closeModal('profileSetupMask');
        _pendingDataVisible = null;
        _pendingDataset = null;
    };

    window.switchProfileTab = function(tab) {
        if (tab !== 'data') {
            _pendingDataVisible = null;
            _pendingDataset = null;
        }
        var panelProfile = document.getElementById('profPanelProfile');
        var panelData = document.getElementById('profPanelData');
        var tabProfile = document.getElementById('profTabProfile');
        var tabData = document.getElementById('profTabData');
        if (tab === 'data') {
            if (panelProfile) panelProfile.style.display = 'none';
            if (panelData) { panelData.style.display = 'block'; panelData.style.flex = '1'; }
            if (tabProfile) { tabProfile.style.background = 'transparent'; tabProfile.style.color = 'rgba(255,255,255,0.4)'; tabProfile.style.borderBottom = '2px solid transparent'; }
            if (tabData) { tabData.style.background = 'var(--sel-bg-soft)'; tabData.style.color = 'var(--sel-text)'; tabData.style.borderBottom = '2px solid var(--sel-text)'; }
            renderDataPanel();
        } else {
            if (panelProfile) { panelProfile.style.display = 'block'; panelProfile.style.flex = '1'; }
            if (panelData) panelData.style.display = 'none';
            if (tabProfile) { tabProfile.style.background = 'var(--sel-bg-soft)'; tabProfile.style.color = 'var(--sel-text)'; tabProfile.style.borderBottom = '2px solid var(--sel-text)'; }
            if (tabData) { tabData.style.background = 'transparent'; tabData.style.color = 'rgba(255,255,255,0.4)'; tabData.style.borderBottom = '2px solid transparent'; }
            renderProfileNick(); drawRoles(); drawRanks(); renderProfileSocialLinks();
        }
    };

    // ═══ DATA PANEL ═══
    var _pendingDataVisible = null; // null = no pending change
    var _pendingDataset = null;     // null = no pending change

    function applyDefaultData(panelEl) {
        if (!db) { showToast(t('Firebase не подключён')); return; }
        showGlobalSpinner();

        db.collection('users').doc(ADMIN_UID).get().then(function(doc) {
            hideGlobalSpinner();
            if (!doc.exists) { showToast(t('Данные дефолта не найдены')); renderDataPanel(); return; }
            var ad = doc.data();
            if (ad.matchups)     try { localStorage.setItem('matchups',     ad.matchups);     } catch(e) {}
            if (ad.tierData)     try { localStorage.setItem('tierData',     ad.tierData);     loadTierData();     } catch(e) {}
            if (ad.itemTierData) try { localStorage.setItem('itemTierData', ad.itemTierData); loadItemTierData(); } catch(e) {}
            if (ad.runeTierData) try { localStorage.setItem('runeTierData', ad.runeTierData); loadRuneTierData(); } catch(e) {}
            // Switch to own data
            localStorage.setItem('activeDataset', 'own');
            _pendingDataset = null;
            showToast(t('✓ Дефолт применён — данные ERjanKG скопированы в свои'));
            renderDataPanel();
        }).catch(function(err) {
            hideGlobalSpinner();
            showToast(t('Ошибка загрузки дефолта: ') + (err.code || err.message));
            renderDataPanel();
        });
    }

    function renderDataPanel() {
        var el = document.getElementById('profileDataContent');
        if (!el) return;
        el.innerHTML = '';

        var savedVisible = localStorage.getItem('dataVisible') !== 'false';
        var savedDataset = localStorage.getItem('activeDataset') || 'own';
        if (savedDataset === 'copied') { savedDataset = 'copied_0'; localStorage.setItem('activeDataset', 'copied_0'); }

        var dataVisible = (_pendingDataVisible !== null) ? _pendingDataVisible : savedVisible;
        var activeDataset = (_pendingDataset !== null) ? _pendingDataset : savedDataset;
        if (activeDataset === 'copied') { activeDataset = 'copied_0'; _pendingDataset = 'copied_0'; }

        // Load copied slots + backward compat
        var copiedSlots = [0,1,2].map(function(i) {
            try { return JSON.parse(localStorage.getItem('copiedUserData_'+i) || 'null'); } catch(e) { return null; }
        });
        if (!copiedSlots[0]) {
            var _oldCopied = null;
            try { _oldCopied = JSON.parse(localStorage.getItem('copiedUserData') || 'null'); } catch(e) {}
            if (_oldCopied) {
                copiedSlots[0] = _oldCopied;
                localStorage.setItem('copiedUserData_0', JSON.stringify(_oldCopied));
                localStorage.removeItem('copiedUserData');
            }
        }

        var hasChanges = (_pendingDataVisible !== null && _pendingDataVisible !== savedVisible)
                      || (_pendingDataset !== null && _pendingDataset !== savedDataset);

        function makeRow(labelText, isSelected, color, onclick) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;padding:11px 14px;border-radius:11px;margin-bottom:7px;cursor:pointer;border:1.5px solid '
                + (isSelected ? color + '88' : 'rgba(255,255,255,0.07)')
                + ';background:' + (isSelected ? color + '14' : 'transparent')
                + ';transition:all 0.15s;user-select:none;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'flex:1;font-size:13px;font-weight:700;color:' + (isSelected ? color : 'rgba(255,255,255,0.75)') + ';';
            lbl.textContent = labelText;
            var chk = document.createElement('span');
            chk.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;border:2px solid '
                + (isSelected ? color : 'rgba(255,255,255,0.18)')
                + ';color:' + color + ';background:' + (isSelected ? color + '22' : 'transparent') + ';transition:all 0.15s;';
            chk.textContent = isSelected ? '✓' : '';
            row.appendChild(lbl);
            row.appendChild(chk);
            row.onclick = onclick;
            return row;
        }

        // ─── ВИДИМОСТЬ ───
        var secVis = document.createElement('div');
        secVis.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);font-weight:800;letter-spacing:1px;margin-bottom:8px;';
        secVis.textContent = t('ВИДИМОСТЬ ДАННЫХ');
        el.appendChild(secVis);

        el.appendChild(makeRow(t('👁  Видно всем'), dataVisible === true, '#2ecc71', function() {
            if (dataVisible === true) return;
            _pendingDataVisible = true; renderDataPanel();
        }));
        el.appendChild(makeRow(t('🙈  Скрыто'), dataVisible === false, '#e74c3c', function() {
            if (dataVisible === false) return;
            _pendingDataVisible = false; renderDataPanel();
        }));

        // ─── DIVIDER ───
        var divider = document.createElement('div');
        divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.06);margin:10px 0 14px;';
        el.appendChild(divider);

        // ─── ИСТОЧНИК ДАННЫХ ───
        var secSrc = document.createElement('div');
        secSrc.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);font-weight:800;letter-spacing:1px;margin-bottom:8px;';
        secSrc.textContent = t('ИСТОЧНИК ДАННЫХ');
        el.appendChild(secSrc);

        // ─── ДЕФОЛТ (ERjanKG) — не удаляется, живёт всегда наверху ───
        var defRow = document.createElement('div');
        defRow.className = 'default-data-row';
        var defLbl = document.createElement('div');
        defLbl.className = 'default-data-label';
        defLbl.innerHTML = '⭐ '+t('Дефолт')+' <span style="font-size:10px;color:rgba(212,175,55,0.7);">(ERjanKG)</span>'
            + '<span class="default-data-sublabel">'+t('Нажми «Применить» — данные перепишутся в свои')+'</span>';
        var defBtn = document.createElement('button');
        defBtn.className = 'default-data-btn';
        defBtn.textContent = t('Применить');
        (function(btn) {
            var _conf = false, _confTimer;
            btn.onclick = function() {
                if (!_conf) {
                    _conf = true;
                    btn.textContent = t('Точно?');
                    btn.style.background = 'rgba(231,76,60,0.25)';
                    btn.style.borderColor = 'rgba(231,76,60,0.6)';
                    btn.style.color = '#e74c3c';
                    _confTimer = setTimeout(function() {
                        _conf = false;
                        btn.textContent = t('Применить');
                        btn.style.background = '';
                        btn.style.borderColor = '';
                        btn.style.color = '';
                    }, 3000);
                } else {
                    clearTimeout(_confTimer);
                    applyDefaultData(el);
                }
            };
        })(defBtn);
        defRow.appendChild(defLbl);
        defRow.appendChild(defBtn);
        el.appendChild(defRow);

        el.appendChild(makeRow(t('Свои данные'), activeDataset === 'own', 'var(--sel-text)', function() {
            if (activeDataset === 'own') return;
            _pendingDataset = 'own'; renderDataPanel();
        }));

        var _slotColors = ['#FFD700', '#2ecc71', '#3498db'];
        [0,1,2].forEach(function(i) {
            var slot = copiedSlots[i];
            if (!slot || !slot.fromName) return;
            var slotKey = 'copied_' + i;

            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:7px;';

            var row = makeRow(slot.fromName, activeDataset === slotKey, _slotColors[i], function() {
                if (activeDataset === slotKey) return;
                _pendingDataset = slotKey; renderDataPanel();
            });
            row.style.marginBottom = '0';
            wrap.appendChild(row);

            // Delete link
            var delBtn = document.createElement('button');
            delBtn.style.cssText = 'width:100%;padding:3px;border:none;background:transparent;color:rgba(231,76,60,0.35);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.3px;';
            delBtn.textContent = t('× Удалить');
            (function(sk, sd, idx) {
                var _conf = false, _confTimer;
                delBtn.onclick = function(e) {
                    e.stopPropagation();
                    if (!_conf) {
                        _conf = true;
                        delBtn.textContent = t('✓ Подтвердить удаление');
                        delBtn.style.color = '#e74c3c';
                        _confTimer = setTimeout(function() {
                            _conf = false;
                            delBtn.textContent = t('× Удалить');
                            delBtn.style.color = 'rgba(231,76,60,0.35)';
                        }, 3000);
                    } else {
                        clearTimeout(_confTimer);
                        localStorage.removeItem('copiedUserData_' + idx);
                        if (_pendingDataset === sk) _pendingDataset = null;
                        if (sd === sk) activateOwnData();
                        else renderDataPanel();
                    }
                };
            })(slotKey, savedDataset, i);
            wrap.appendChild(delBtn);
            el.appendChild(wrap);
        });

        // ─── КНОПКА СОХРАНИТЬ (только если есть изменения) ───
        if (hasChanges) {
            var saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));color:#fff;font-size:14px;font-weight:900;cursor:pointer;margin-top:14px;';
            saveBtn.textContent = t('✓ Сохранить');
            saveBtn.onclick = function() {
                _applyDataPanelSave(dataVisible, savedVisible, activeDataset, savedDataset);
            };
            el.appendChild(saveBtn);
        }

        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.15);line-height:1.5;margin-top:14px;';
        hint.textContent = t('Нажми на пользователя в списке → Скопировать данные, чтобы добавить набор.');
        el.appendChild(hint);
    }

    function _applyDataPanelSave(newVisible, savedVisible, newDataset, savedDataset) {
        showGlobalSpinner();

        // Apply visibility change
        var visChanged = newVisible !== savedVisible;
        if (visChanged) {
            localStorage.setItem('dataVisible', String(newVisible));
            if (db && _currentUser) {
                db.collection('users').doc(_currentUser.uid).set({ dataVisible: newVisible }, { merge: true });
            }
        }

        // Apply dataset switch
        var datasetChanged = newDataset !== savedDataset;

        _pendingDataVisible = null;
        _pendingDataset = null;

        setTimeout(function() {
            hideGlobalSpinner();
            if (datasetChanged) {
                if (newDataset === 'own') {
                    activateOwnData();
                } else if (newDataset && newDataset.startsWith('copied_')) {
                    var _slotIdx = parseInt(newDataset.split('_')[1]);
                    var _copiedSlot = null;
                    try { _copiedSlot = JSON.parse(localStorage.getItem('copiedUserData_' + _slotIdx) || 'null'); } catch(e) {}
                    if (_copiedSlot) activateCopiedData(_copiedSlot, _slotIdx);
                    else renderDataPanel();
                }
            } else {
                if (visChanged) showToast(t('✓ Настройки видимости сохранены'));
                else showToast(t('✓ Сохранено'));
                renderDataPanel();
            }
        }, 600);
    }

    function activateOwnData() {
        // Restore own saved data from firestore or localStorage backup
        localStorage.setItem('activeDataset', 'own');
        var ownBackup = localStorage.getItem('ownDataBackup');
        if (ownBackup) {
            try {
                var b = JSON.parse(ownBackup);
                if (b.matchups) localStorage.setItem('matchups', b.matchups);
                if (b.tierData) localStorage.setItem('tierData', b.tierData);
                if (b.itemTierData) { localStorage.setItem('itemTierData', b.itemTierData); loadItemTierData(); }
                if (b.runeTierData) { localStorage.setItem('runeTierData', b.runeTierData); loadRuneTierData(); }
            } catch(e) {}
        }
        loadTierData();
        showToast(t('✓ Активированы свои данные'));
        renderDataPanel();
    }

    function activateCopiedData(copied, slotIdx) {
        // Backup own data first
        var ownBackup = {
            matchups: localStorage.getItem('matchups') || '{}',
            tierData: localStorage.getItem('tierData') || '{}',
            itemTierData: localStorage.getItem('itemTierData') || '{}',
            runeTierData: localStorage.getItem('runeTierData') || '{}'
        };
        // Only save backup if currently using own data (avoid overwriting backup with copied)
        if (localStorage.getItem('activeDataset') !== 'copied') {
            localStorage.setItem('ownDataBackup', JSON.stringify(ownBackup));
        }
        localStorage.setItem('activeDataset', 'copied_' + (slotIdx !== undefined ? slotIdx : 0));
        if (copied.matchups) localStorage.setItem('matchups', copied.matchups);
        if (copied.tierData) { localStorage.setItem('tierData', copied.tierData); loadTierData(); }
        if (copied.itemTierData) { localStorage.setItem('itemTierData', copied.itemTierData); loadItemTierData(); }
        if (copied.runeTierData) { localStorage.setItem('runeTierData', copied.runeTierData); loadRuneTierData(); }
        showToast(t('✓ Активированы данные ') + copied.fromName);
        renderDataPanel();
    }

    function renderProfileSetup() {
        var rolesEl = document.getElementById('profileRoles');
        var ranksEl = document.getElementById('profileRanks');
        if (!rolesEl || !ranksEl) return;
        drawRoles();
        drawRanks();
    }

    function drawRoles() {
        var rolesEl = document.getElementById('profileRoles');
        if (!rolesEl) return;
        var html = '';
        ROLES_LIST.forEach(function(r) {
            var sel = _profileRole === r;
            var border = sel ? 'var(--sel-text)' : 'var(--sel-border-35)';
            var bg = sel ? 'var(--sel-placeholder)' : 'var(--sel-bg-faint)';
            var roleImg = (window._roleIcons && window._roleIcons[r]) || '';
            html += '<button id="prole-' + r + '" onclick="window._profileSelectRole(\'' + r + '\')" style="flex:1;padding:8px 4px;border-radius:10px;border:2px solid ' + border + ';background:' + bg + ';cursor:pointer;color:#fff;font-size:11px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:4px;">'
                  + (roleImg ? '<img loading="lazy" decoding="async" src="' + roleImg + '" alt="' + r + '" style="width:26px;height:26px;object-fit:contain;" onerror="this.style.display=\'none\'">' : '')
                  + '<span style="font-size:9px;color:#fff;font-weight:700;">' + r + '</span>'
                  + '</button>';
        });
        rolesEl.style.cssText = 'display:flex;flex-wrap:nowrap;gap:6px;margin-bottom:18px;';
        rolesEl.innerHTML = html;
    }

    function drawRanks() {
        var ranksEl = document.getElementById('profileRanks');
        if (!ranksEl) return;
        var html = '';
        RANKS.forEach(function(rk) {
            var sel = _profileRank === rk.id;
            var border = sel ? rk.color : 'var(--sel-border-35)';
            var bg = sel ? 'var(--sel-dim)' : 'var(--sel-bg-faint)';
            var shadow = sel ? 'box-shadow:0 0 8px ' + rk.color + '55;' : '';
            var icon = '<img loading="lazy" decoding="async" src="' + rk.img + '" style="width:32px;height:32px;object-fit:contain;">';
            html += '<button id="prank-' + rk.id + '" onclick="window._profileSelectRank(\'' + rk.id + '\')" style="padding:6px 4px;border-radius:10px;border:2px solid ' + border + ';background:' + bg + ';color:' + rk.color + ';font-size:10px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;' + shadow + '">'
                  + icon
                  + '<span>' + rk.name + '</span>'
                  + '</button>';
        });
        ranksEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;margin-bottom:18px;';
        ranksEl.innerHTML = html;
    }

    window._profileSelectRole = function(r) {
        _profileRole = r;
        ROLES_LIST.forEach(function(role) {
            var btn = document.getElementById('prole-' + role);
            if (!btn) return;
            var sel = role === r;
            btn.style.border = '2px solid ' + (sel ? 'var(--sel-text)' : 'var(--sel-border-35)');
            btn.style.background = sel ? 'var(--sel-placeholder)' : 'var(--sel-bg-faint)';
        });
    };
    window._profileSelectRank = function(id) {
        _profileRank = id;
        var rankColors = {diamond:'#B9F2FF',master:'#9B59B6',grandmaster:'#E74C3C',challenger:'#F39C12',sovereign:'#D4AF37'};
        Object.keys(rankColors).forEach(function(rid) {
            var btn = document.getElementById('prank-' + rid);
            if (!btn) return;
            var sel = rid === id;
            btn.style.border = '2px solid ' + (sel ? rankColors[rid] : 'var(--sel-border-35)');
            btn.style.background = sel ? 'var(--sel-dim)' : 'var(--sel-bg-faint)';
            btn.style.boxShadow = sel ? '0 0 8px ' + rankColors[rid] + '55' : '';
        });
    };

    // ═══ PROFILE NICK ═══

    function renderProfileNick() {
        var el = document.getElementById('profileNickRow');
        if (!el) return;
        el.innerHTML = '';
        var nick = (_currentUser && _currentUser.displayName) || '';

        // Display row: nick + pencil
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;background:var(--sel-bg-faint);border:1.5px solid var(--sel-border);border-radius:12px;padding:10px 14px;';

        var nameEl = document.createElement('div');
        nameEl.id = 'profileNickText';
        nameEl.style.cssText = 'flex:1;font-size:15px;font-weight:900;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nameEl.textContent = nick || '—';

        var editBtn = document.createElement('button');
        editBtn.style.cssText = 'flex-shrink:0;width:30px;height:30px;border-radius:8px;border:1.5px solid var(--sel-border-35);background:var(--sel-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:var(--sel-text);';
        editBtn.title = t('Изменить ник');
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sel-text)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.onclick = function() { showNickEditor(el, nick); };

        row.appendChild(nameEl);
        row.appendChild(editBtn);
        el.appendChild(row);
    }

    function showNickEditor(container, currentNick) {
        container.innerHTML = '';

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:var(--sel-bg-faint);border:1.5px solid var(--sel-glow-brd);border-radius:12px;padding:10px 14px;';

        var labelRow = document.createElement('div');
        labelRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.25);margin-left:auto;';
        hint.textContent = t('буквы, цифры, пробел, 3–20 символов');
        labelRow.appendChild(hint);

        var inp = document.createElement('input');
        inp.type = 'text';
        inp.value = currentNick || '';
        inp.maxLength = 20;
        inp.placeholder = t('Введи ник...');
        inp.style.cssText = 'width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--sel-border-35);background:var(--sel-bg-input);color:#fff;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;';

        var counter = document.createElement('div');
        counter.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);text-align:right;';
        counter.textContent = (inp.value.length) + '/20';

        inp.addEventListener('input', function() {
            // Strip invalid chars in real-time (allow letters, digits, single spaces)
            var clean = inp.value.replace(/[^a-zA-Zа-яА-ЯёЁ0-9 ]/g, '').replace(/  +/g, ' ');
            if (inp.value !== clean) inp.value = clean;
            counter.textContent = inp.value.length + '/20';
            inp.style.borderColor = 'var(--sel-border-35)';
            errEl.textContent = '';
        });

        var errEl = document.createElement('div');
        errEl.style.cssText = 'font-size:11px;color:#e74c3c;min-height:14px;';

        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:8px;';

        var cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-size:12px;font-weight:700;cursor:pointer;';
        cancelBtn.textContent = t('Отмена');
        cancelBtn.onclick = function() { renderProfileNick(); };

        var saveBtn = document.createElement('button');
        saveBtn.style.cssText = 'flex:2;padding:8px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));color:#fff;font-size:12px;font-weight:700;cursor:pointer;';
        saveBtn.textContent = t('✓ Сохранить ник');
        saveBtn.onclick = function() {
            var val = inp.value.trim();
            if (val.length < 3) { errEl.textContent = t('Минимум 3 символа'); inp.style.borderColor='#e74c3c'; return; }
            if (val.length > 20) { errEl.textContent = t('Максимум 20 символов'); inp.style.borderColor='#e74c3c'; return; }
            if (!/^[a-zA-Zа-яА-ЯёЁ0-9 ]+$/.test(val)) { errEl.textContent = t('Только буквы, цифры и пробел'); inp.style.borderColor='#e74c3c'; return; }
            saveBtn.disabled = true;
            saveBtn.textContent = '...';
            var auth = firebase.auth();
            auth.currentUser.updateProfile({ displayName: val }).then(function() {
                if (db && _currentUser) {
                    return db.collection('users').doc(_currentUser.uid).set({ displayName: val, nickLower: val.toLowerCase() }, { merge: true });
                }
            }).then(function() {
                showToast(t('✓ Ник обновлён!'));
                renderProfileNick();
                // Update header button tooltip if visible
                var headerBtn = document.querySelector('.user-menu-btn');
                if (headerBtn) headerBtn.title = val;
            }).catch(function(err) {
                saveBtn.disabled = false;
                saveBtn.textContent = t('✓ Сохранить ник');
                errEl.textContent = t('Ошибка: ') + (err.message || err.code);
            });
        };

        inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveBtn.click(); if (e.key === 'Escape') renderProfileNick(); });

        btns.appendChild(cancelBtn);
        btns.appendChild(saveBtn);
        row.appendChild(labelRow);
        row.appendChild(inp);
        row.appendChild(counter);
        row.appendChild(errEl);
        row.appendChild(btns);
        container.appendChild(row);
        setTimeout(function() { inp.focus(); inp.select(); }, 60);
    }

    // ═══ SOCIAL LINKS ═══

    function renderProfileSocialLinks() {
        var el = document.getElementById('profileSocialLinks');
        if (!el) return;
        el.innerHTML = '';
        _profileSocialLinks.forEach(function(link) {
            var p = SOCIAL_PLATFORMS.find(function(pl) { return pl.id === link.platform; });
            if (!p) return;
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;';
            var btn = document.createElement('button');
            btn.style.cssText = 'width:40px;height:40px;border-radius:10px;border:2px solid '+p.border+';background:'+p.bg+';cursor:default;display:flex;align-items:center;justify-content:center;padding:0;';
            btn.innerHTML = '<div style="width:22px;height:22px;pointer-events:none;">'+p.svg+'</div>';
            var removeBtn = document.createElement('button');
            removeBtn.style.cssText = 'position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;border:none;background:#e74c3c;color:#fff;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;z-index:1;';
            removeBtn.textContent = '×';
            removeBtn.title = t('Удалить ') + p.name;
            removeBtn.onclick = (function(pid) { return function(e) { e.stopPropagation(); removeSocialLink(pid); }; })(link.platform);
            wrap.appendChild(btn);
            wrap.appendChild(removeBtn);
            el.appendChild(wrap);
        });
        if (_profileSocialLinks.length < SOCIAL_PLATFORMS.length) {
            var addBtn = document.createElement('button');
            addBtn.style.cssText = 'width:40px;height:40px;border-radius:10px;border:2px dashed var(--sel-border-str);background:var(--sel-bg-faint);cursor:pointer;color:var(--sel-text);font-size:24px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;flex-shrink:0;';
            addBtn.textContent = '+';
            addBtn.title = t('Добавить соцсеть');
            addBtn.onclick = function() { openSocialPicker(); };
            el.appendChild(addBtn);
        }
    }

    var _socialPickerPlatform = null;
    var _socialPickerStep = 'pick';

    window.openSocialPicker = function() {
        _socialPickerStep = 'pick';
        _socialPickerPlatform = null;
        renderSocialPickerContent();
        openModal('socialPickerMask');
    };
    window.closeSocialPicker = function() { closeModal('socialPickerMask'); };

    window.renderSocialPickerContent = function renderSocialPickerContent() {
        var content = document.getElementById('socialPickerContent');
        var titleEl = document.getElementById('socialPickerTitle');
        if (!content) return;
        var alreadyAdded = _profileSocialLinks.map(function(l) { return l.platform; });
        if (_socialPickerStep === 'pick') {
            if (titleEl) titleEl.textContent = t('Выбери соцсеть');
            var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
            SOCIAL_PLATFORMS.forEach(function(p) {
                var disabled = alreadyAdded.indexOf(p.id) !== -1;
                html += '<button '+(disabled ? '' : 'onclick="window._socialPickerSelectPlatform(\''+p.id+'\')"')+' '
                      + 'style="padding:14px 10px;border-radius:12px;border:2px solid '+(disabled ? 'rgba(255,255,255,0.1)' : p.border)+';background:'+(disabled ? 'rgba(255,255,255,0.03)' : p.bg)+';cursor:'+(disabled ? 'default' : 'pointer')+';display:flex;flex-direction:column;align-items:center;gap:8px;opacity:'+(disabled ? '0.4' : '1')+';">'
                      + '<div style="width:32px;height:32px;">'+p.svg+'</div>'
                      + '<span style="font-size:12px;font-weight:800;color:#fff;">'+p.name+'</span>'
                      + (disabled ? '<span style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:600;">'+t('уже добавлен')+'</span>' : '')
                      + '</button>';
            });
            html += '</div>';
            content.innerHTML = html;
        } else {
            var p2 = SOCIAL_PLATFORMS.find(function(pl) { return pl.id === _socialPickerPlatform; });
            if (!p2) return;
            if (titleEl) titleEl.textContent = p2.name;
            var placeholders = { youtube:'https://youtube.com/@channel', twitch:'https://twitch.tv/channel', telegram:'https://t.me/username', discord:'https://discord.gg/invite' };
            var ph = placeholders[p2.id] || 'https://...';
            content.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
                + '<div style="width:36px;height:36px;flex-shrink:0;">'+p2.svg+'</div>'
                + '<span style="font-size:13px;color:rgba(255,255,255,0.6);">'+t('Вставь ссылку на свой ')+p2.name+'</span>'
                + '</div>'
                + '<input id="socialLinkInput" type="url" placeholder="'+ph+'" style="width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid var(--sel-border-35);background:var(--sel-bg-faint);color:#fff;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;margin-bottom:12px;" />'
                + '<div style="display:flex;gap:8px;">'
                + '<button onclick="window._socialPickerBack()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;cursor:pointer;">'+t('← Назад')+'</button>'
                + '<button onclick="window.confirmAddSocialLink()" style="flex:1;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));color:#fff;font-size:13px;font-weight:700;cursor:pointer;">'+t('Добавить')+'</button>'
                + '</div>';
            setTimeout(function() {
                var inp = document.getElementById('socialLinkInput');
                if (inp) { inp.focus(); inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.confirmAddSocialLink(); }); }
            }, 80);
        }
    };

    window._socialPickerSelectPlatform = function(id) {
        _socialPickerStep = 'url';
        _socialPickerPlatform = id;
        window.renderSocialPickerContent();
    };
    window._socialPickerBack = function() {
        _socialPickerStep = 'pick';
        _socialPickerPlatform = null;
        window.renderSocialPickerContent();
    };

    window.confirmAddSocialLink = function() {
        var inp = document.getElementById('socialLinkInput');
        if (!inp) return;
        var url = inp.value.trim();
        if (!url) { inp.style.borderColor = '#e74c3c'; return; }
        if (!/^https?:\/\//i.test(url)) { inp.style.borderColor = '#e74c3c'; showToast(t('Ссылка должна начинаться с https://')); return; }
        _profileSocialLinks = _profileSocialLinks.filter(function(l) { return l.platform !== _socialPickerPlatform; });
        _profileSocialLinks.push({ platform: _socialPickerPlatform, url: url });
        window.closeSocialPicker();
        renderProfileSocialLinks();
    };

    window.removeSocialLink = function(platformId) {
        _profileSocialLinks = _profileSocialLinks.filter(function(l) { return l.platform !== platformId; });
        renderProfileSocialLinks();
    };

    function _safeExternalUrl(raw) {
        if (typeof raw !== 'string') return '';
        var s = raw.trim();
        if (!s) return '';
        // Защита от javascript:/data:/vbscript:/file: и пр. опасных схем
        try {
            var u = new URL(s, window.location.href);
            if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') return u.href;
            return '';
        } catch(e) { return ''; }
    }
    window.openExternalLink = function(url, label) {
        var safe = _safeExternalUrl(url);
        var content = document.getElementById('socialLinkConfirmContent');
        if (!content) return;
        content.innerHTML = '';
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:14px;color:#fff;font-weight:800;margin-bottom:8px;';
        titleEl.textContent = label ? (t('Перейти: ') + label + '?') : t('Покинуть сайт?');
        content.appendChild(titleEl);
        var urlEl = document.createElement('div');
        urlEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.45);word-break:break-all;padding:0 4px;';
        urlEl.textContent = safe || t('(некорректная ссылка)');
        content.appendChild(urlEl);
        var goBtn = document.getElementById('socialLinkGoBtn');
        if (goBtn) {
            goBtn.disabled = !safe;
            goBtn.onclick = function() { if (safe) window.open(safe, '_blank', 'noopener,noreferrer'); closeSocialLinkConfirm(); };
        }
        openModal('socialLinkConfirmMask');
    };
    window.openSocialLinkConfirm = function(url, platformId) {
        var safe = _safeExternalUrl(url);
        var p = SOCIAL_PLATFORMS.find(function(pl) { return pl.id === platformId; });
        var content = document.getElementById('socialLinkConfirmContent');
        if (!content) return;
        content.innerHTML = '';
        if (p) {
            var iconWrap = document.createElement('div');
            iconWrap.style.cssText = 'width:48px;height:48px;margin:0 auto 10px;';
            iconWrap.innerHTML = p.svg;
            content.appendChild(iconWrap);
        }
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:14px;color:#fff;font-weight:800;margin-bottom:6px;';
        titleEl.textContent = p ? (t('Перейти на ') + p.name + '?') : t('Покинуть сайт?');
        content.appendChild(titleEl);
        var urlEl = document.createElement('div');
        urlEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.45);word-break:break-all;padding:0 4px;';
        urlEl.textContent = safe || t('(некорректная ссылка)');
        content.appendChild(urlEl);
        var goBtn = document.getElementById('socialLinkGoBtn');
        if (goBtn) {
            goBtn.disabled = !safe;
            goBtn.onclick = function() { if (safe) window.open(safe, '_blank', 'noopener,noreferrer'); closeSocialLinkConfirm(); };
        }
        openModal('socialLinkConfirmMask');
    };
    window.closeSocialLinkConfirm = function() { closeModal('socialLinkConfirmMask'); };

    window.saveProfile = function() {
        if (!db || !_currentUser) { showToast(t('Войди в аккаунт')); return; }
        if (!_profileRole || !_profileRank) {
            var _msg = (!_profileRole && !_profileRank) ? t('Выбери роль и ранг')
                     : !_profileRole ? t('Выбери роль') : t('Выбери ранг');
            showToast(_msg); return;
        }

        var btn = document.getElementById('profileSaveBtn');
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            btn.textContent = t('⏳ Сохраняем...');
        }

        db.collection('users').doc(_currentUser.uid).set({
            role: _profileRole,
            rank: _profileRank,
            socialLinks: _profileSocialLinks
        }, { merge: true }).then(function() {
            _writeProfileCache(_currentUser.uid, {
                role: _profileRole,
                rank: _profileRank,
                socialLinks: _profileSocialLinks
            });
            if (btn) {
                btn.textContent = t('✓ Сохранено!');
                btn.style.background = 'linear-gradient(135deg,#27ae60,#2ecc71)';
                btn.style.opacity = '1';
            }
            showToast(t('✓ Профиль сохранён!'));
            try { localStorage.setItem('_wrsProfileReady', '1'); } catch(e){}
            document.documentElement.classList.remove('pre-profile-gate');
            setTimeout(function() {
                document.body.classList.remove('profile-gated');
                closeProfileSetup();
                loadUsersToSidebar();
                if (typeof applyPendingDeepLink === 'function') applyPendingDeepLink();
            }, 600);
        }).catch(function(err) {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.textContent = t('✓ Сохранить');
                btn.style.background = 'linear-gradient(135deg,var(--sel-base),var(--sel-stat))';
            }
            console.error('Save profile error:', err);
            showToast(t('Ошибка сохранения: ') + (err.code || err.message));
        });
    };

    // Check if first login — no auto-open, profile opens only on user action
    function checkFirstLogin() {
        // intentionally empty — profile opens only when user clicks
    }

    // ═══════════════════════════════════════
    // USER TOOLTIP (click on user in sidebar)
    // ═══════════════════════════════════════
    function showUserTooltip(user, cardEl) {
        var existing = document.getElementById('userTooltipPopup');
        if (existing) {
            // Toggle off if clicking same card
            if (existing.dataset.uid === user._uid) { existing.remove(); return; }
            existing.remove();
        }

        var tip = document.createElement('div');
        tip.id = 'userTooltipPopup';
        tip.dataset.uid = user._uid;
        tip.style.cssText = 'position:fixed;z-index:9999;background:var(--sel-bg-tooltip);border:1px solid var(--sel-border-35);border-radius:14px;padding:14px;min-width:210px;max-width:250px;box-shadow:0 8px 32px rgba(0,0,0,0.6);backdrop-filter:blur(16px);';

        // Position near the card
        var rect = cardEl.getBoundingClientRect();
        var left = rect.right + 10;
        if (left + 260 > window.innerWidth) left = Math.max(4, rect.left - 260);
        var top = rect.top;
        if (top + 220 > window.innerHeight) top = Math.max(4, window.innerHeight - 230);
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';

        // Avatar + name row
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
        var avEl = document.createElement('div');
        avEl.style.cssText = 'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:900;overflow:hidden;flex-shrink:0;border:2px solid var(--sel-glow-30);';
        if (user.photoURL) {
            var ttImg = document.createElement('img');
            ttImg.src = user.photoURL;
            ttImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            ttImg.onerror = function(){ this.style.display='none'; };
            avEl.appendChild(ttImg);
        } else avEl.textContent = (user.displayName||'?').charAt(0).toUpperCase();
        var infoDiv = document.createElement('div');
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:13px;font-weight:900;color:#fff;line-height:1.2;';
        nameEl.textContent = user.displayName || user.email || '???';
        var statusEl = document.createElement('div');
        statusEl.style.cssText = 'font-size:10px;font-weight:600;margin-top:3px;color:'+(user._online?'#2ecc71':'rgba(255,255,255,0.35)')+';';
        statusEl.textContent = user._online ? t('🟢 Онлайн') : t('⚫ Оффлайн');
        infoDiv.appendChild(nameEl); infoDiv.appendChild(statusEl);
        row.appendChild(avEl); row.appendChild(infoDiv);
        tip.appendChild(row);

        // Role & rank badges
        if (user.role || user.rank) {
            var badges = document.createElement('div');
            badges.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;';
            if (user.role) {
                var rb = document.createElement('span');
                rb.style.cssText = 'padding:2px 8px;border-radius:6px;background:var(--sel-dim);border:1px solid var(--sel-border-med);color:var(--sel-text);font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px;';
                var roleIconSrc = window._roleIcons && window._roleIcons[user.role];
                if (roleIconSrc) {
                    var roleIconEl = document.createElement('img');
                    roleIconEl.src = roleIconSrc;
                    roleIconEl.style.cssText = 'width:12px;height:12px;object-fit:contain;';
                    roleIconEl.onerror = function() { this.style.display = 'none'; };
                    rb.appendChild(roleIconEl);
                }
                rb.appendChild(document.createTextNode(user.role));
                badges.appendChild(rb);
            }
            if (user.rank) {
                var rk = RANKS.find(function(r) { return r.id === user.rank; });
                if (rk) {
                    var rkb = document.createElement('span');
                    rkb.style.cssText = 'padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid '+rk.color+'44;color:'+rk.color+';font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px;';
                    if (rk.img) {
                        var rkImg = document.createElement('img');
                        rkImg.src = rk.img;
                        rkImg.style.cssText = 'width:13px;height:13px;object-fit:contain;';
                        rkb.appendChild(rkImg);
                    }
                    rkb.appendChild(document.createTextNode(' ' + rk.name));
                    badges.appendChild(rkb);
                }
            }
            tip.appendChild(badges);
        }

        // Social links
        if (user.socialLinks && user.socialLinks.length) {
            var socialRow = document.createElement('div');
            socialRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
            user.socialLinks.forEach(function(link) {
                var pl = SOCIAL_PLATFORMS.find(function(p) { return p.id === link.platform; });
                if (!pl) return;
                var sb = document.createElement('button');
                sb.style.cssText = 'width:34px;height:34px;border-radius:9px;border:1.5px solid '+pl.border+';background:'+pl.bg+';cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.1s;';
                sb.title = pl.name;
                sb.innerHTML = '<div style="width:18px;height:18px;pointer-events:none;">'+pl.svg+'</div>';
                sb.onmouseover = function() { this.style.transform = 'scale(1.12)'; };
                sb.onmouseout = function() { this.style.transform = ''; };
                sb.onclick = (function(url, pid) {
                    return function(e) { e.stopPropagation(); tip.remove(); openSocialLinkConfirm(url, pid); };
                })(link.url, link.platform);
                socialRow.appendChild(sb);
            });
            tip.appendChild(socialRow);
        }

        // Copy data button
        var isDataHidden = user.dataVisible === false;
        if (!isDataHidden || _isAdmin) {
            var copyBtn = document.createElement('button');
            copyBtn.style.cssText = 'display:none;width:100%;padding:8px;border-radius:8px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.08);color:#2ecc71;font-size:11px;font-weight:700;cursor:pointer;';
            copyBtn.textContent = t('📋 Скопировать данные');
            copyBtn.onclick = function(e) {
                e.stopPropagation();
                copyUserData(user);
                tip.remove();
            };
            tip.appendChild(copyBtn);
        }

        document.body.appendChild(tip);

        // Close on outside click
        function _closeTooltip(e) {
            if (!tip.contains(e.target) && e.target !== cardEl && !cardEl.contains(e.target)) {
                tip.remove();
                document.removeEventListener('click', _closeTooltip, true);
            }
        }
        setTimeout(function() { document.addEventListener('click', _closeTooltip, true); }, 0);
    }

    // ═══════════════════════════════════════
    // USER CARD (click on user in sidebar)
    // ═══════════════════════════════════════
    window.closeUserCard = function() { closeModal('userCardMask'); };

    function showUserCard(user) {
        var container = document.getElementById('userCardContent');
        if (!container) return;
        container.innerHTML = '';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'padding:20px 20px 14px;text-align:center;border-bottom:1px solid var(--sel-border-15);';

        var av = document.createElement('div');
        av.style.cssText = 'width:64px;height:64px;border-radius:50%;margin:0 auto 10px;background:linear-gradient(135deg,var(--sel-base),var(--sel-stat));display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:900;overflow:hidden;border:3px solid var(--sel-glow-30);';
        if (user.photoURL) {
            var ucImg = document.createElement('img');
            ucImg.src = user.photoURL;
            ucImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            ucImg.onerror = function(){ this.style.display='none'; };
            av.appendChild(ucImg);
        } else av.textContent = (user.displayName||'?').charAt(0).toUpperCase();
        header.appendChild(av);

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:16px;font-weight:900;color:#fff;';
        nameEl.textContent = user.displayName || user.email || '???';
        header.appendChild(nameEl);

        var statusEl = document.createElement('div');
        statusEl.style.cssText = 'font-size:11px;color:' + (user._online ? '#2ecc71' : 'rgba(255,255,255,0.35)') + ';margin-top:3px;font-weight:600;';
        statusEl.textContent = user._online ? t('🟢 Онлайн') : t('⚫ Оффлайн');
        header.appendChild(statusEl);

        // Role & Rank badges
        if (user.role || user.rank) {
            var badges = document.createElement('div');
            badges.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap;';
            if (user.role) {
                var roleBadge = document.createElement('span');
                roleBadge.style.cssText = 'padding:3px 10px;border-radius:8px;background:var(--sel-dim);border:1px solid var(--sel-border-med);color:var(--sel-text);font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;';
                var roleIconSrc2 = window._roleIcons && window._roleIcons[user.role];
                if (roleIconSrc2) {
                    var roleIconEl2 = document.createElement('img');
                    roleIconEl2.src = roleIconSrc2;
                    roleIconEl2.style.cssText = 'width:14px;height:14px;object-fit:contain;';
                    roleIconEl2.onerror = function() { this.style.display = 'none'; };
                    roleBadge.appendChild(roleIconEl2);
                }
                roleBadge.appendChild(document.createTextNode(user.role));
                badges.appendChild(roleBadge);
            }
            if (user.rank) {
                var rk = RANKS.find(function(r) { return r.id === user.rank; });
                if (rk) {
                    var rankBadge = document.createElement('span');
                    rankBadge.style.cssText = 'padding:3px 10px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid '+rk.color+'44;color:'+rk.color+';font-size:11px;font-weight:700;display:flex;align-items:center;gap:3px;';
                    if (rk.img) {
                        var rkImg = document.createElement('img');
                        rkImg.src = rk.img;
                        rkImg.style.cssText = 'width:16px;height:16px;object-fit:contain;';
                        rankBadge.appendChild(rkImg);
                    }
                    rankBadge.appendChild(document.createTextNode(rk.name));
                    badges.appendChild(rankBadge);
                }
            }
            header.appendChild(badges);
        }

        // Social links
        if (user.socialLinks && user.socialLinks.length) {
            var socialRow = document.createElement('div');
            socialRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;';
            user.socialLinks.forEach(function(link) {
                var pl = SOCIAL_PLATFORMS.find(function(p) { return p.id === link.platform; });
                if (!pl) return;
                var btn = document.createElement('button');
                btn.style.cssText = 'width:38px;height:38px;border-radius:10px;border:2px solid '+pl.border+';background:'+pl.bg+';cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.1s;';
                btn.title = pl.name;
                btn.innerHTML = '<div style="width:20px;height:20px;pointer-events:none;">'+pl.svg+'</div>';
                btn.onmouseover = function() { this.style.transform = 'scale(1.1)'; };
                btn.onmouseout = function() { this.style.transform = ''; };
                btn.onclick = (function(url, pid) {
                    return function() { openSocialLinkConfirm(url, pid); };
                })(link.url, link.platform);
                socialRow.appendChild(btn);
            });
            header.appendChild(socialRow);
        }

        container.appendChild(header);

        // Actions
        var actions = document.createElement('div');
        actions.style.cssText = 'padding:12px 16px;display:flex;flex-direction:column;gap:6px;';

        // Copy buttons — show based on dataVisible flag
        var isDataHidden = user.dataVisible === false;
        if (!isDataHidden || _isAdmin) {
            var copyTypes = [
                { key: 'matchups',    label: '⚔ Контрматчапы & комбо', color: '#e67e22' },
                { key: 'tierData',    label: '🏆 Тир-лист чемпионов',   color: '#f1c40f' },
                { key: 'itemTierData',label: '⚙ Тир-лист предметов',    color: '#5dade2' },
                { key: 'runeTierData',label: '✨ Тир-лист рун',          color: '#c39bd3' }
            ];
            copyTypes.forEach(function(ct) {
                addCardBtn(actions, t(ct.label), ct.color, function() {
                    copyUserDataPartial(user, ct.key);
                    closeUserCard();
                });
            });
        }

        addCardBtn(actions, t('✕ Закрыть'), 'rgba(255,255,255,0.4)', function() { closeUserCard(); });
        container.appendChild(actions);

        openModal('userCardMask');
    }

    // Copy a single data type from another user
    function copyUserDataPartial(user, key) {
        if (!db) { showToast(t('Firebase не подключён')); return; }
        db.collection('users').doc(user._uid).get().then(function(doc) {
            if (!doc.exists) { showToast(t('Данные не найдены')); return; }
            var d = doc.data();
            if (d.dataVisible === false && !_isAdmin) { showToast(t('🙈 Игрок скрыл свои данные')); return; }
            if (!d[key] || d[key] === '{}') { showToast(t('У игрока нет этих данных')); return; }
            var labels = { matchups: t('Контрматчапы'), tierData: t('Тир-лист чемпионов'), itemTierData: t('Тир-лист предметов'), runeTierData: t('Тир-лист рун') };
            // Apply directly — partial copy merges into active data, doesn't create a slot
            if (key === 'matchups') {
                localStorage.setItem('matchups', d[key]);
            } else if (key === 'tierData') {
                localStorage.setItem('tierData', d[key]); loadTierData();
            } else if (key === 'itemTierData') {
                localStorage.setItem('itemTierData', d[key]); loadItemTierData();
            } else if (key === 'runeTierData') {
                localStorage.setItem('runeTierData', d[key]); loadRuneTierData();
            }
            var nick = user.displayName || user.email || '???';
            showToast(t('✓ Скопировано: ') + labels[key] + ' · ' + nick);
        }).catch(function(err) { showToast(t('Ошибка: ') + (err.code || err.message)); });
    }

    // Copy another user's data and store it as "copied dataset"
    function copyUserData(user) {
        if (!db) { showToast(t('Firebase не подключён')); return; }
        db.collection('users').doc(user._uid).get().then(function(doc) {
            if (!doc.exists) { showToast(t('Данные не найдены')); return; }
            var d = doc.data();
            // Check fresh visibility — blocks copy even if cached card showed the button
            if (d.dataVisible === false && !_isAdmin) {
                showToast(t('🙈 Игрок скрыл свои данные'));
                return;
            }
            var copied = {
                fromUid: user._uid,
                fromName: user.displayName || user.email || '???',
                matchups: d.matchups || '{}',
                tierData: d.tierData || '{}',
                itemTierData: d.itemTierData || '{}',
                runeTierData: d.runeTierData || '{}'
            };
            var _slots = [0,1,2].map(function(si) {
                try { return JSON.parse(localStorage.getItem('copiedUserData_'+si) || 'null'); } catch(e) { return null; }
            });
            var _targetSlot = _slots.findIndex(function(s) { return !s; });
            if (_targetSlot === -1) _targetSlot = 0; // overwrite slot 0 if all full
            try { localStorage.setItem('copiedUserData_' + _targetSlot, JSON.stringify(copied)); } catch(e) {}
            showToast(t('✓ Скопировано в слот ') + (_targetSlot + 1) + ': ' + copied.fromName);
        }).catch(function(err) {
            showToast(t('Ошибка: ') + (err.code || err.message));
        });
    }
    window.copyUserData = copyUserData;

    function addCardBtn(parent, text, color, onclick) {
        var btn = document.createElement('button');
        btn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid '
            + color + '33;background:none;color:' + color
            + ';font-size:13px;font-weight:700;cursor:pointer;text-align:center;transition:background 0.15s;';
        btn.textContent = text;
        if (onclick) {
            btn.onclick = onclick;
            btn.onmouseover = function() { this.style.background = 'var(--sel-bg)'; };
            btn.onmouseout = function() { this.style.background = 'none'; };
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
        }
        parent.appendChild(btn);
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 WIN RATE & PICK RATE
    // ═══════════════════════════════════════════════════════════════

    var _wrprRank = 'чалик';
    var _wrprRole = 'top';
    var _wrprSortCol = 'manual'; // 'manual' = показываем сохранённый порядок; клик по колонке временно сортирует
    var _wrprSelName = null;     // Э1.2: выбранная строка (эталонный класс .sel + карточка справа)
    var _wrprSortDir = -1; // -1 = desc (высокий сверху), 1 = asc

    // Russian name → English DDragon key
    var WR_CHAMP_KEYS = {
        'Кеннен':'Kennen','Олаф':'Olaf','Обжаренный':'Smolder','Укунг':'MonkeyKing',
        'Вейн':'Vayne','Маки':'Maokai','Райз':'Ryze','Ясуо':'Yasuo','Сион':'Sion',
        'Ирелия':'Irelia','Амбесса':'Ambessa','Триндамер':'Tryndamere','Фиора':'Fiora',
        'Кейл':'Kayle','Ренектон':'Renekton','Шен':'Shen','Грохот':'Rumble','Орнн':'Ornn',
        'Наутилус':'Nautilus','Тимо':'Teemo','Гарен':'Garen','Аатрокс':'Aatrox',
        'Камилла':'Camille','Джейс':'Jayce','Насус':'Nasus','Ривен':'Riven',
        'Дариус':'Darius','Гвен':'Gwen','Сетт':'Sett','Гнар':'Gnar',
        'Джарван IV':'JarvanIV','Мальфит':'Malphite','Йон':'Yone','Джакс':'Jax',
        'Свейн':'Swain','Волибер':'Volibear','Мордекайзер':'Mordekaiser','Ургот':'Urgot',
        'Д-р Мундо':'DrMundo',
        // Jungle
        'Уорвик':'Warwick','Амуму':'Amumu','Нуну и Уилламп':'Nunu','Раммус':'Rammus',
        'Нидали':'Nidalee','Ноктюрн':'Nocturne','Скрипачки':'Fiddlesticks',
        'Синь Чжао':'XinZhao','Эвелинн':'Evelynn','Нила':'Nilah','Шивана':'Shyvana',
        'Лиллия':'Lillia','Пантеон':'Pantheon','Хекарим':'Hecarim','Виего':'Viego',
        'Родственные':'Kindred','Диана':'Diana','Зед':'Zed','Грагас':'Gragas',
        'Ренгар':'Rengar',"Ха'Зикс":'Khazix','Когть':'Briar','VI':'Vi','Экко':'Ekko',
        'Мастер Йи':'MasterYi','Ли Син':'LeeSin','Физз':'Fizz','Могилы':'Graves',
        'Кайн':'Kayn',
        // Mid
        'Энни':'Annie','Хаймердингер':'Heimerdinger','Катарина':'Katarina','Мел':'Mel',
        'Синдра':'Syndra','Искаженная судьба':'TwistedFate','Акшан':'Akshan',
        'Лиссандра':'Lissandra','Зира':'Zyra','Ахри':'Ahri','Кассадин':'Kassadin',
        'Аурелион Сол':'AurelionSol','Бренд':'Brand','Велкоз':'Velkoz','Аврора':'Aurora',
        'Векс':'Vex','Владимир':'Vladimir','Виктор':'Viktor','Люкс':'Lux',
        'Орианна':'Orianna','Моргана':'Morgana','Зиггс':'Ziggs','Вейгар':'Veigar',
        'Галио':'Galio','Акали':'Akali','Норра':'Norra',
        // Support
        'Браум':'Braum','Зилеан':'Zilean','Сона':'Sona','Маокай':'Maokai','Нами':'Nami',
        'Пайк':'Pyke','Леона':'Leona','Серафин':'Seraphine','Бард':'Bard','Сенна':'Senna',
        'Блицкранк':'Blitzcrank','Ракан':'Rakan','Релл':'Rell','Сорака':'Soraka',
        'Янна':'Janna','Лулу':'Lulu','Карма':'Karma','Милио':'Milio','Поршень':'Thresh',
        'Алистар':'Alistar','Юми':'Yuumi',
        // ADC
        'Тлеть':'Smolder',"Ког'Мау":'KogMaw','Мисс Фортун':'MissFortune','Джин':'Jhin',
        'Ксайя':'Xayah','Джинкс':'Jinx','Эш':'Ashe','Самира':'Samira','Калистка':'Kalista',
        'Лучиан':'Lucian','Кэйтлин':'Caitlyn','Сивир':'Sivir','Дравена':'Draven',
        'Эзреал':'Ezreal','Кайса':'Kaisa','Корки':'Corki','Варус':'Varus','Твитч':'Twitch',
        'Тристана':'Tristana','Зери':'Zeri',
    };

    var _wrprSpecialIcons = {
        'Nilah': 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Nilah.png',
        'Norra': 'image/norra.png',
        'Mel': 'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Mel_0.jpg',
    };

    // English name → pretty display string
    var _wrprDisplayName = {
        'JarvanIV':'Jarvan IV','DrMundo':'Dr. Mundo','MissFortune':'Miss Fortune',
        'TwistedFate':'Twisted Fate','AurelionSol':'Aurelion Sol','MasterYi':'Master Yi',
        'XinZhao':'Xin Zhao','LeeSin':'Lee Sin',"KogMaw":"Kog'Maw","Khazix":"Kha'Zix",
        'Velkoz':"Vel'Koz",'Kaisa':"Kai'Sa",'Wukong':'Wukong',
        'Leblanc':'LeBlanc','Nunu':'Nunu & Willump',
    };

    function wrprIcon(name) {
        if (_wrprSpecialIcons[name]) return _wrprSpecialIcons[name];
        var key = WR_CHAMP_KEYS[name]; // fallback for any remaining Russian names
        if (!key) {
            var _engFix = {'Wukong':'MonkeyKing'};
            key = _engFix[name] || name.replace(/[\s'\.\#&]/g,'');
        }
        return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/' + key + '.png';
    }

    // Data: WR_DATA[rank][role] = [{name, wr, change, pr, br}, ...]
    // change = number or null (Н/Д)
    var WR_DATA = {
        'чалик': {
            'top': [
                {name:'Singed',wr:53.60,ch:null,pr:1.92,br:0.26},
                {name:'Vayne',wr:52.88,ch:null,pr:2.53,br:20.77},
                {name:'Sion',wr:52.71,ch:null,pr:5.09,br:0.43},
                {name:'Teemo',wr:52.32,ch:null,pr:4.93,br:19.33},
                {name:'Olaf',wr:52.30,ch:null,pr:1.56,br:0.33},
                {name:'Renekton',wr:52.06,ch:null,pr:7.78,br:2.12},
                {name:'Wukong',wr:52.00,ch:null,pr:2.88,br:0.57},
                {name:'Nautilus',wr:51.91,ch:null,pr:2.78,br:3.95},
                {name:'Ambessa',wr:51.75,ch:null,pr:3.30,br:0.96},
                {name:'Ryze',wr:51.55,ch:null,pr:1.72,br:3.03},
                {name:'Ornn',wr:51.34,ch:null,pr:2.75,br:0.12},
                {name:'Kayle',wr:51.21,ch:null,pr:3.05,br:0.51},
                {name:'Garen',wr:50.87,ch:null,pr:22.06,br:7.96},
                {name:'Jayce',wr:50.82,ch:null,pr:2.78,br:0.58},
                {name:'Gnar',wr:50.74,ch:null,pr:2.68,br:0.20},
                {name:'Irelia',wr:50.70,ch:null,pr:2.64,br:1.88},
                {name:'Malphite',wr:50.55,ch:null,pr:6.91,br:16.74},
                {name:'JarvanIV',wr:50.51,ch:null,pr:1.17,br:1.45},
                {name:'Shen',wr:50.46,ch:null,pr:1.59,br:0.07},
                {name:'Kennen',wr:50.39,ch:null,pr:2.52,br:0.30},
                {name:'Rumble',wr:50.29,ch:null,pr:3.30,br:0.99},
                {name:'Nasus',wr:50.25,ch:null,pr:8.34,br:6.36},
                {name:'Fiora',wr:50.02,ch:null,pr:4.97,br:3.28},
                {name:'Smolder',wr:49.77,ch:null,pr:1.08,br:53.53},
                {name:'Tryndamere',wr:49.57,ch:null,pr:3.11,br:21.25},
                {name:'Sett',wr:49.46,ch:null,pr:12.47,br:1.42},
                {name:'Yone',wr:49.44,ch:null,pr:6.66,br:8.17},
                {name:'Riven',wr:49.20,ch:null,pr:2.06,br:0.94},
                {name:'Aatrox',wr:49.18,ch:null,pr:5.91,br:5.34},
                {name:'Mordekaiser',wr:48.92,ch:null,pr:8.37,br:27.45},
                {name:'Camille',wr:48.90,ch:null,pr:2.83,br:0.12},
                {name:'Darius',wr:48.51,ch:null,pr:15.94,br:6.52},
                {name:'Yasuo',wr:48.39,ch:null,pr:3.19,br:23.50},
                {name:'Volibear',wr:48.29,ch:null,pr:4.42,br:2.00},
                {name:'Urgot',wr:48.17,ch:null,pr:4.27,br:2.11},
                {name:'Swain',wr:48.09,ch:null,pr:1.26,br:4.45},
                {name:'Gwen',wr:48.07,ch:null,pr:1.85,br:0.41},
                {name:'DrMundo',wr:47.94,ch:null,pr:3.87,br:0.31},
                {name:'Jax',wr:47.46,ch:null,pr:3.22,br:0.15},
            ],
            'jungle': [
                {name:'Amumu',wr:55.58,ch:null,pr:4.62,br:0.15},
                {name:'Rammus',wr:55.23,ch:null,pr:7.23,br:9.04},
                {name:'Yasuo',wr:53.39,ch:null,pr:1.84,br:23.50},
                {name:'Warwick',wr:52.98,ch:null,pr:4.23,br:2.33},
                {name:'Fiddlesticks',wr:52.98,ch:null,pr:3.91,br:2.56},
                {name:'Nilah',wr:52.59,ch:null,pr:1.40,br:1.05},
                {name:'Nunu',wr:52.51,ch:null,pr:1.74,br:0.44},
                {name:'Nautilus',wr:51.64,ch:null,pr:3.38,br:3.95},
                {name:'Lillia',wr:51.60,ch:null,pr:3.35,br:1.38},
                {name:'Kindred',wr:51.56,ch:null,pr:2.28,br:0.29},
                {name:'Evelynn',wr:51.28,ch:null,pr:3.71,br:2.30},
                {name:'Pantheon',wr:51.27,ch:null,pr:7.02,br:2.96},
                {name:'XinZhao',wr:51.08,ch:null,pr:10.01,br:1.88},
                {name:'Shyvana',wr:50.97,ch:null,pr:10.37,br:12.25},
                {name:'Vi',wr:50.91,ch:null,pr:6.60,br:0.59},
                {name:'Nocturne',wr:50.81,ch:null,pr:4.51,br:14.47},
                {name:'Viego',wr:50.58,ch:null,pr:9.34,br:17.27},
                {name:'Ekko',wr:50.36,ch:null,pr:1.66,br:0.05},
                {name:'Khazix',wr:50.25,ch:null,pr:5.17,br:0.26},
                {name:'Nidalee',wr:50.23,ch:null,pr:2.16,br:3.75},
                {name:'Ambessa',wr:50.14,ch:null,pr:1.31,br:0.96},
                {name:'JarvanIV',wr:50.12,ch:null,pr:6.38,br:0.39},
                {name:'Gragas',wr:50.05,ch:null,pr:2.00,br:0.16},
                {name:'Rengar',wr:49.85,ch:null,pr:1.59,br:1.34},
                {name:'Hecarim',wr:49.76,ch:null,pr:3.22,br:14.08},
                {name:'Graves',wr:49.65,ch:null,pr:9.97,br:0.99},
                {name:'Tryndamere',wr:49.18,ch:null,pr:6.18,br:21.25},
                {name:'Fizz',wr:48.99,ch:null,pr:3.96,br:2.21},
                {name:'Talon',wr:48.95,ch:null,pr:2.74,br:0.54},
                {name:'Diana',wr:48.85,ch:null,pr:1.03,br:0.05},
                {name:'Yone',wr:48.74,ch:null,pr:3.41,br:8.17},
                {name:'Wukong',wr:48.70,ch:null,pr:3.85,br:0.57},
                {name:'Riven',wr:48.56,ch:null,pr:2.11,br:0.94},
                {name:'Olaf',wr:48.53,ch:null,pr:1.21,br:0.88},
                {name:'Kayn',wr:48.11,ch:null,pr:3.12,br:0.12},
                {name:'LeeSin',wr:48.09,ch:null,pr:17.04,br:14.97},
                {name:'MasterYi',wr:47.91,ch:null,pr:8.47,br:70.15},
                {name:'Zed',wr:47.48,ch:null,pr:3.52,br:2.11},
                {name:'Volibear',wr:46.79,ch:null,pr:1.97,br:2.00},
                {name:'Darius',wr:46.47,ch:null,pr:3.05,br:6.52},
                {name:'Jax',wr:46.10,ch:null,pr:1.85,br:0.15},
                {name:'Aatrox',wr:46.07,ch:null,pr:1.50,br:5.34},
            ],
            'mid': [
                {name:'Kennen',wr:53.53,ch:null,pr:2.24,br:0.33},
                {name:'Teemo',wr:53.11,ch:null,pr:2.48,br:19.33},
                {name:'Morgana',wr:51.62,ch:null,pr:6.64,br:29.92},
                {name:'Swain',wr:51.58,ch:null,pr:4.80,br:4.45},
                {name:'Ahri',wr:51.42,ch:null,pr:4.28,br:0.07},
                {name:'Mel',wr:51.36,ch:null,pr:6.56,br:86.39},
                {name:'Zyra',wr:51.33,ch:null,pr:2.42,br:20.80},
                {name:'Nasus',wr:51.07,ch:null,pr:1.63,br:6.36},
                {name:'Annie',wr:50.98,ch:null,pr:2.13,br:0.06},
                {name:'Zed',wr:50.89,ch:null,pr:4.27,br:2.11},
                {name:'Brand',wr:50.83,ch:null,pr:8.39,br:3.59},
                {name:'TwistedFate',wr:50.70,ch:null,pr:6.25,br:0.36},
                {name:'Norra',wr:50.69,ch:null,pr:2.88,br:78.12},
                {name:'Smolder',wr:50.60,ch:null,pr:2.06,br:53.53},
                {name:'Ryze',wr:50.52,ch:null,pr:5.66,br:3.03},
                {name:'Kassadin',wr:50.49,ch:null,pr:3.08,br:0.51},
                {name:'Karma',wr:50.42,ch:null,pr:2.92,br:0.54},
                {name:'Yasuo',wr:50.39,ch:null,pr:13.13,br:23.50},
                {name:'Diana',wr:50.37,ch:null,pr:1.25,br:0.05},
                {name:'Viktor',wr:50.22,ch:null,pr:4.35,br:0.62},
                {name:'Fizz',wr:50.19,ch:null,pr:3.61,br:2.21},
                {name:'Orianna',wr:50.19,ch:null,pr:4.34,br:0.20},
                {name:'Syndra',wr:50.00,ch:null,pr:6.90,br:5.51},
                {name:'Veigar',wr:49.99,ch:null,pr:9.18,br:9.74},
                {name:'Aurora',wr:49.78,ch:null,pr:4.87,br:10.13},
                {name:'AurelionSol',wr:49.65,ch:null,pr:8.39,br:6.13},
                {name:'Lux',wr:49.48,ch:null,pr:6.77,br:11.99},
                {name:'Lissandra',wr:49.36,ch:null,pr:5.21,br:8.44},
                {name:'Ziggs',wr:49.31,ch:null,pr:6.13,br:1.66},
                {name:'Galio',wr:49.29,ch:null,pr:9.84,br:1.36},
                {name:'Velkoz',wr:49.08,ch:null,pr:3.60,br:0.83},
                {name:'Heimerdinger',wr:49.00,ch:null,pr:1.51,br:0.83},
                {name:'Vladimir',wr:48.88,ch:null,pr:4.08,br:1.16},
                {name:'Yone',wr:48.82,ch:null,pr:5.08,br:8.17},
                {name:'Jayce',wr:48.36,ch:null,pr:1.50,br:0.58},
                {name:'Tristana',wr:48.04,ch:null,pr:1.00,br:0.12},
                {name:'Malphite',wr:48.03,ch:null,pr:1.11,br:16.74},
                {name:'Akshan',wr:47.35,ch:null,pr:3.74,br:0.45},
                {name:'Katarina',wr:47.29,ch:null,pr:1.82,br:0.34},
                {name:'Ekko',wr:46.56,ch:null,pr:1.48,br:0.05},
            ],
            'adc': [
                {name:'Smolder',wr:54.66,ch:null,pr:16.83,br:53.53},
                {name:'MissFortune',wr:51.78,ch:null,pr:13.65,br:1.26},
                {name:'KogMaw',wr:51.17,ch:null,pr:6.32,br:0.58},
                {name:'Ashe',wr:51.07,ch:null,pr:10.30,br:0.19},
                {name:'Jhin',wr:50.57,ch:null,pr:13.56,br:0.21},
                {name:'Lucian',wr:50.47,ch:null,pr:8.40,br:0.60},
                {name:'Vayne',wr:50.29,ch:null,pr:13.37,br:20.77},
                {name:'Caitlyn',wr:49.83,ch:null,pr:24.45,br:3.23},
                {name:'Kalista',wr:49.76,ch:null,pr:4.75,br:1.45},
                {name:'Xayah',wr:49.61,ch:null,pr:5.66,br:0.20},
                {name:'Jinx',wr:49.51,ch:null,pr:13.96,br:0.35},
                {name:'Samira',wr:49.13,ch:null,pr:7.59,br:4.37},
                {name:'Draven',wr:49.10,ch:null,pr:5.39,br:0.79},
                {name:'Ezreal',wr:48.89,ch:null,pr:10.22,br:0.20},
                {name:'Sivir',wr:48.61,ch:null,pr:3.61,br:0.03},
                {name:'Twitch',wr:48.28,ch:null,pr:4.18,br:0.15},
                {name:'Tristana',wr:47.63,ch:null,pr:7.63,br:0.12},
                {name:'Corki',wr:47.36,ch:null,pr:1.06,br:0.01},
                {name:'Zeri',wr:47.20,ch:null,pr:1.25,br:0.01},
                {name:'Kaisa',wr:47.17,ch:null,pr:13.63,br:0.47},
                {name:'Varus',wr:47.04,ch:null,pr:4.13,br:0.24},
            ],
            'support': [
                {name:'Braum',wr:53.28,ch:null,pr:6.72,br:1.35},
                {name:'Zilean',wr:53.03,ch:null,pr:2.18,br:2.99},
                {name:'Galio',wr:52.99,ch:null,pr:2.22,br:1.36},
                {name:'Ornn',wr:52.65,ch:null,pr:1.52,br:0.12},
                {name:'Nami',wr:52.49,ch:null,pr:8.66,br:0.13},
                {name:'Maokai',wr:52.39,ch:null,pr:5.26,br:0.38},
                {name:'Blitzcrank',wr:51.85,ch:null,pr:7.89,br:1.45},
                {name:'Velkoz',wr:51.78,ch:null,pr:1.65,br:0.83},
                {name:'Pyke',wr:51.77,ch:null,pr:3.19,br:1.47},
                {name:'Janna',wr:51.41,ch:null,pr:2.86,br:0.15},
                {name:'Sona',wr:51.36,ch:null,pr:2.22,br:0.01},
                {name:'Bard',wr:51.30,ch:null,pr:7.33,br:0.44},
                {name:'Soraka',wr:51.18,ch:null,pr:5.34,br:1.28},
                {name:'Senna',wr:51.00,ch:null,pr:4.54,br:0.65},
                {name:'Norra',wr:50.89,ch:null,pr:1.30,br:78.12},
                {name:'Zyra',wr:50.50,ch:null,pr:4.20,br:20.80},
                {name:'Brand',wr:50.48,ch:null,pr:2.18,br:3.59},
                {name:'Malphite',wr:50.44,ch:null,pr:8.58,br:16.74},
                {name:'Veigar',wr:50.40,ch:null,pr:2.85,br:9.74},
                {name:'Milio',wr:50.08,ch:null,pr:7.32,br:8.57},
                {name:'Nautilus',wr:49.90,ch:null,pr:12.92,br:3.95},
                {name:'Rakan',wr:49.71,ch:null,pr:3.27,br:0.32},
                {name:'Leona',wr:49.68,ch:null,pr:7.77,br:3.29},
                {name:'Thresh',wr:49.20,ch:null,pr:11.90,br:3.12},
                {name:'Lulu',wr:49.15,ch:null,pr:13.74,br:12.28},
                {name:'Morgana',wr:49.08,ch:null,pr:6.77,br:29.92},
                {name:'Seraphine',wr:48.98,ch:null,pr:5.89,br:0.26},
                {name:'Lux',wr:48.94,ch:null,pr:9.32,br:11.99},
                {name:'Sett',wr:48.93,ch:null,pr:1.23,br:1.42},
                {name:'Alistar',wr:48.75,ch:null,pr:5.06,br:0.40},
                {name:'Swain',wr:47.62,ch:null,pr:4.14,br:4.45},
                {name:'Rell',wr:46.82,ch:null,pr:2.86,br:1.25},
                {name:'Yuumi',wr:46.33,ch:null,pr:10.76,br:31.97},
            ],
        },
        'алмаз': { top:[], jungle:[], mid:[], adc:[], support:[] },
        'мастер': { top:[], jungle:[], mid:[], adc:[], support:[] },
        'суверен': { top:[], jungle:[], mid:[], adc:[], support:[] },
        'все': { top:[], jungle:[], mid:[], adc:[], support:[] },
    };
    // Экспортируем для CMS
    window.WR_DATA = WR_DATA;

    // Реальные винрейты по ВСЕМ рангам из data-pipeline/wr-stats.json (Tencent WR, робот обновляет).
    // Заполняет WR_DATA[ru-ранг][роль]. Роли в данных = WR-линии: Baron=Топ, Dragon=АДК.
    // При сбое fetch — остаётся хардкод-фолбэк (чалик).
    (function loadWrStats(){
        var RANK_MAP = { diamond_plus:'алмаз', master_plus:'мастер', challenger:'чалик', apex:'суверен', all:'все' };
        var ROLE_MAP = { baron:'top', jungle:'jungle', mid:'mid', dragon:'adc', support:'support' };
        fetch('data-pipeline/wr-stats.json', { cache:'no-cache' })
            .then(function(r){ return r.ok ? r.json() : null; })
            .then(function(j){
                if(!j || !Array.isArray(j.champions) || !j.champions.length) return;
                var fresh = {};
                Object.keys(RANK_MAP).forEach(function(slug){ fresh[RANK_MAP[slug]] = { top:[], jungle:[], mid:[], adc:[], support:[] }; });
                j.champions.forEach(function(c){
                    var ru = RANK_MAP[c.rank], role = ROLE_MAP[(c.role||'').toLowerCase()];
                    if(!ru || !role || !fresh[ru][role]) return;
                    fresh[ru][role].push({ name: c.nameEN || c.name, wr:+c.wr, ch:(c.wrTrend==null?null:+c.wrTrend), pr:+c.pr||0, br:+c.br||0, tier:c.tier||null });
                });
                Object.keys(fresh).forEach(function(ru){
                    WR_DATA[ru] = WR_DATA[ru] || { top:[], jungle:[], mid:[], adc:[], support:[] };
                    Object.keys(fresh[ru]).forEach(function(role){
                        fresh[ru][role].sort(function(a,b){ return b.wr - a.wr; });
                        if(fresh[ru][role].length) WR_DATA[ru][role] = fresh[ru][role];
                    });
                });
                /* дата снимка — общая: её показывает Мета-хаб («Снимок 26.07.2026 · lolm.qq.com») */
                window.WR_SNAPSHOT = j.snapshotDate || '';
                console.log('[WR] wr-stats.json загружен, ранги:', Object.keys(fresh).join(','), 'снимок', j.snapshotDate || '');
                try { if(typeof wrprUpdateButtons === 'function') wrprUpdateButtons(); if(typeof wrprRender === 'function') wrprRender(); } catch(e){}
                /* Э1.1: у каждого вида своя панель (#viewPlaceholder умер). Пере-рендерим
                   ТОЛЬКО уже построенные — данные приехали, содержимое обязано обновиться. */
                try { var ph = document.querySelector('.view-pane[data-view="hub"]'); if(window.renderMetaHub && ph && ph.querySelector('.f-hub')) window.renderMetaHub(ph); } catch(e){}
                try { var pt = document.querySelector('.view-pane[data-view="tier"]'); if(window.renderTierBoard && pt && pt.querySelector('.f-tier')) window.renderTierBoard(pt); } catch(e){}
            })
            .catch(function(e){ console.warn('[WR] wr-stats.json недоступен:', e.message); });
    })();

    var _WRPR_RANKS = [
        {id:'алмаз', label:t('Алмаз+')},
        {id:'мастер', label:t('Мастер+')},
        {id:'чалик', label:t('Чалик')},
        {id:'суверен', label:t('Суверен')},
        {id:'все', label:t('Все')},
    ];
    /* ОДИН список рангов на сайт: им пользуются и WinRate, и ранг-пилюли Мета-хаба.
       Свой дубль в другой коробке = два владельца одной вещи. */
    window.WR_RANKS = _WRPR_RANKS;
    var _WRPR_ROLES = [
        {id:'top', label:t('Топ')},
        {id:'jungle', label:t('Лес')},
        {id:'mid', label:t('Мид')},
        {id:'adc', label:t('АДК')},
        {id:'support', label:t('Сап')},
    ];

    /* ══════════════════════════════════════════════════════════════════════
       ★ Э1.1 · ПЕРЕКЛЮЧЕНИЕ ВИДОВ = ЛЕНИВО + КЭШ (механика showView из lab-main).

       БЫЛО (корень дёрганья): все виды hub/tier/patch делили ОДИН #viewPlaceholder,
       и каждое переключение звало renderMetaHub/renderTierBoard, которые пишут
       innerHTML целиком. То есть возврат на уже открытый вид ПЕРЕСОЗДАВАЛ ВСЕ его
       узлы — сотни штук ради того, чтобы показать то же самое.

       СТАЛО: у каждого вида своя панель .view-pane[data-view]. Панель строится
       ОДИН раз при ПЕРВОМ заходе, дальше только показывается/прячется [hidden].
       Возврат на вид = 0 пересозданных узлов; скролл, выделение и состояние живы.
       ══════════════════════════════════════════════════════════════════════ */
    var _viewPaneBuilt = {};      // какие виды уже построены (кэш)
    var _wrprBuilt = false;       // WinRate живёт в разметке — флаг «фильтры+таблица собраны»

    // Панель вида: берём существующую, иначе создаём пустую в .stage.
    function _viewPane(view) {
        var stage = document.getElementById('stage');
        if (!stage) return null;
        var p = stage.querySelector('.view-pane[data-view="' + view + '"]');
        if (!p) {
            p = document.createElement('section');
            p.className = 'view-pane';
            p.setAttribute('data-view', view);
            p.hidden = true;
            stage.appendChild(p);
        }
        return p;
    }
    /* Э1.9: панель вида нужна и странице чемпа, а она живёт в ДРУГОЙ коробке
       (IIFE) этого файла — приватная функция оттуда не видна. Один владелец
       остаётся здесь, наружу отдаём ссылку. */
    window._viewPane = _viewPane;

    window.switchMainView = function(view) {
        var stage = document.getElementById('stage');
        if (!stage) return;

        // Переключение вкладки-вида закрывает открытый инструмент сайдбара (в области ВСЕГДА одно)
        if (window._closeSidebarToolIfOpen) window._closeSidebarToolIfOpen();

        /* Э1.8: «Тактич» больше не уводит со страницы — доска стала под-вкладкой
           вида «Карта» (Home → Карта → [Карта][Страта]). Старые ссылки/закладки
           на страницу tactics-board/ живут, но из вкладок сюда никто не попадает. */
        if (view === 'tactics') view = 'map';

        var pane = _viewPane(view);
        if (!pane) return;

        /* СТРОИМ ТОЛЬКО ПРИ ПЕРВОМ ЗАХОДЕ. Второй заход сюда не попадает вообще —
           поэтому innerHTML на каждое переключение больше не происходит. */
        if (!_viewPaneBuilt[view]) {
            if (view === 'hub' && window.renderMetaHub) window.renderMetaHub(pane);
            else if (view === 'tier' && window.renderTierBoard) window.renderTierBoard(pane);
            else if (view === 'map' && window.renderMapView) window.renderMapView(pane);
            else if (view === 'patch') pane.innerHTML = '<div class="view-stub">Патч — появится в Фазе M3</div>';
            _viewPaneBuilt[view] = true;
        }

        /* Показ = переключение [hidden] у ГОТОВЫХ панелей. Ни одна не удаляется. */
        stage.querySelectorAll('.view-pane').forEach(function(p) { p.hidden = (p !== pane); });

        // правая колонка — на видах Статы/WinRate (резервирует место справа)
        document.body.setAttribute('data-sidecard', (view === 'main' || view === 'wrpr') ? 'on' : 'off');
        // СВАП правой колонки по виду: Статы → панель-выборка, WinRate → карточка чемпа
        document.body.setAttribute('data-rightcol', view === 'main' ? 'select' : (view === 'wrpr' ? 'card' : 'off'));
        if (view === 'main' && window.drawM) window.drawM();
        /* ★ WinRate строим ТОЛЬКО в первый заход — как hub/tier.
           Раньше здесь на КАЖДОЕ переключение звались wrprBuildFilters()+wrprRender(),
           а обе пишут innerHTML → возврат на вкладку пересоздавал 358 из 381 узла
           (счётчик показал 23/381). Дальше вид обновляют те, кому положено:
           клик по фильтру, сортировка, приход данных из wr-stats.json. */
        if (view === 'wrpr' && !_wrprBuilt) { wrprBuildFilters(); wrprRender(); _wrprBuilt = true; }

        /* Ушли со страницы чемпа вкладкой — адрес обязан вернуться на корень,
           иначе F5 увёл бы человека на страницу чемпа, а не туда, где он стоит. */
        if (view !== 'champ' && window._cpLeftPage) window._cpLeftPage();

        // активная вкладка + скользящая пилюля
        var tabs = document.querySelectorAll('#viewTabs .f-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-view') === view);
        }
        if (window.positionViewInd) window.positionViewInd();
    };

    // Скользящая пилюля-индикатор под активной вкладкой (порт .f-ind из lab-main)
    window.positionViewInd = function() {
        var nav = document.getElementById('viewTabs'); if (!nav) return;
        var ind = nav.querySelector('.f-ind'); var act = nav.querySelector('.f-tab.active');
        if (!ind || !act) return;
        ind.style.width = act.offsetWidth + 'px';
        ind.style.transform = 'translateX(' + act.offsetLeft + 'px)';
        ind.style.opacity = '1';
    };
    window.addEventListener('load', function(){ window.positionViewInd(); });
    window.addEventListener('resize', function(){ window.positionViewInd(); });

    // Keep openWRPR as alias for sidebar nav compatibility
    window.openWRPR = function() { window.switchMainView('wrpr'); };

    // Экспортируем wrprRender для отладки
    window.wrprRender = wrprRender;

    window.wrprSort = function(col) {
        if (_wrprSortCol === col) {
            _wrprSortDir *= -1;
        } else {
            _wrprSortCol = col;
            _wrprSortDir = -1;
        }
        wrprRender();
    };

    // Поделиться текущей таблицей винрейтов как PNG-карточкой (топ-10 по WR).
    window.shareWinrates = function() {
        if (!window.exportShareCard) { showToast(t('Модуль шеринга не загружен')); return; }
        var rankData = WR_DATA[_wrprRank];
        var list = rankData ? (rankData[_wrprRole] || []) : [];
        if (!list.length) { showToast(t('Нет данных для шеринга')); return; }
        var sorted = list.slice().sort(function(a, b) { return b.wr - a.wr; }).slice(0, 10);
        var rows = sorted.map(function(d) {
            var col = d.wr >= 52 ? '#2ecc71' : d.wr >= 50 ? '#f1c40f' : '#e74c3c';
            return {
                img: wrprIcon(d.name),
                name: _wrprDisplayName[d.name] || d.name,
                value: d.wr.toFixed(2) + '%',
                valueColor: col
            };
        });
        var rk = _WRPR_RANKS.find(function(r){ return r.id === _wrprRank; });
        var rl = _WRPR_ROLES.find(function(r){ return r.id === _wrprRole; });
        window.exportShareCard({
            title: t('Винрейты Wild Rift'),
            subtitle: (rk ? rk.label : _wrprRank) + ' · ' + (rl ? rl.label : _wrprRole) + ' · Top 10',
            mode: 'table',
            rows: rows,
            fileName: 'wr-winrate-' + _wrprRank + '-' + _wrprRole
        });
    };

    function wrprBuildFilters() {
        var rr = document.getElementById('wrprRankRow');
        var ro = document.getElementById('wrprRoleRow');
        if (!rr || !ro) return;
        rr.innerHTML = '';
        ro.innerHTML = '';
        // Э1.2 канон: вид кнопок живёт в CSS (.wrpr-fbtn / .on), не в инлайн-стилях.
        _WRPR_RANKS.forEach(function(r) {
            var b = document.createElement('button');
            b.className = 'wrpr-fbtn';
            b.textContent = r.label;
            b.dataset.rank = r.id;
            b.onclick = function() { _wrprRank = r.id; wrprUpdateButtons(); wrprRender(); };
            rr.appendChild(b);
        });
        _WRPR_ROLES.forEach(function(r) {
            var b = document.createElement('button');
            b.className = 'wrpr-fbtn role';
            b.dataset.role = r.id;
            b.title = r.label;
            b.onclick = function() { _wrprRole = r.id; wrprUpdateButtons(); wrprRender(); };
            var iconKey = r.id === 'adc' ? 'ADC' : (r.id.charAt(0).toUpperCase() + r.id.slice(1));
            var iconSrc = window._roleIcons && window._roleIcons[iconKey];
            if (iconSrc) {
                var img = document.createElement('img');
                img.src = iconSrc;
                img.alt = r.label;
                b.appendChild(img);
            } else {
                b.textContent = r.label;
            }
            ro.appendChild(b);
        });
        wrprUpdateButtons();
    }

    function wrprUpdateButtons() {
        var rr = document.getElementById('wrprRankRow');
        var ro = document.getElementById('wrprRoleRow');
        if (!rr || !ro) return;
        Array.from(rr.querySelectorAll('button')).forEach(function(b) {
            b.classList.toggle('on', b.dataset.rank === _wrprRank);
        });
        Array.from(ro.querySelectorAll('button')).forEach(function(b) {
            b.classList.toggle('on', b.dataset.role === _wrprRole);
        });
    }

    /* ★ Э1.2: +Тир и +Тренд — колонки ЭТАЛОНА lab-main. Данные для них УЖЕ приходят
       из wr-stats.json (поля tier и wrTrend), боевой их просто не показывал.
       Заводим их обычными столбцами → юзер управляет ими в том же ⚙, что и WR/PR/BR. */
    var WRPR_COL_DEFS = [
        { key:'tier', label:'Тир' },
        { key:'wr', label:'WR%' },
        { key:'pr', label:'PR%' },
        { key:'br', label:'BR%' },
        { key:'trend', label:'Тренд' },
    ];
    function getWrprCols() {
        var cfg = window._colSettings ? window._colSettings.load('wrpr', WRPR_COL_DEFS) : { order: WRPR_COL_DEFS.map(function(d){return d.key;}), hidden: [] };
        var hidden = new Set(cfg.hidden);
        return cfg.order
            .map(function(k){ return WRPR_COL_DEFS.find(function(d){ return d.key === k; }); })
            .filter(function(d){ return d && !hidden.has(d.key); });
    }
    /* ★ Э1.2 · ШАПКА — РАЗМЕТКА ЭТАЛОНА lab-main (viewWinrate).
       Было: div-строка с инлайн-стилями (flex/ширины/цвета прямо в HTML) и id-шками
       вида wrprThWR/wrprArWR, по которым потом искали стрелки сортировки.
       Стало: обычные <th data-sort="…"> + <span class="arr">, вид целиком в CSS.
       Клик вешаем делегированно (см. wireWrprSort) — inline onclick в разметке не пишем. */
    function wrprBuildHeader() {
        var thead = document.getElementById('wrprThead');
        if(!thead) return;
        var html = '<tr><th data-sort="manual" data-i18n="Чемпион">Чемпион</th>';
        getWrprCols().forEach(function(c){
            var on = _wrprSortCol === c.key;
            html += '<th data-sort="' + c.key + '" class="' + (on ? 'sorted' : '') + '">' + c.label +
                '<span class="arr">' + (on ? (_wrprSortDir < 0 ? '▼' : '▲') : '▼') + '</span></th>';
        });
        html += '</tr>';
        labMorph(thead, html);          /* точечно: меняется класс/стрелка, не вся шапка */
    }

    /* Клик по шапке — ОДИН делегированный слушатель на всю таблицу.
       Так узлы шапки можно свободно пересобирать: слушатель живёт выше и не теряется. */
    function wireWrprSort() {
        var thead = document.getElementById('wrprThead');
        if (!thead || thead.__wired) return;
        thead.__wired = 1;
        thead.addEventListener('click', function(e){
            var th = e.target.closest('th[data-sort]');
            if (th) window.wrprSort(th.getAttribute('data-sort'));
        });
    }
    window.openWrprColSettings = function(){
        window._colSettings.open('wrpr', WRPR_COL_DEFS, 'Настройка столбцов WinRate', function(){
            wrprBuildHeader();
            wrprRender();
        });
    };

    /* ★★ Э1.2 · РЕНДЕР WINRATE — СОБРАН ИЗ ЭТАЛОНА lab-main (viewWinrate).
       СНЕСЕНО старое целиком: `tbody.innerHTML = ''` + ручная сборка div-строк
       (span-ячейки с инлайн-стилями, свои id на стрелки сортировки, keyed-кеш строк).
       Разметка теперь эталонная: <tr> · .ch-cell · .tier-badge · .wr-cell/.wr-track/
       .wr-fill · .trend + <svg class="spark">. Весь вид живёт в CSS, инлайн-стилей нет.
       Дёрганье лечит labMorph: собираем HTML и отдаём ему — он трогает ТОЛЬКО
       изменившееся. data-key на <tr> = якорь: при смене порядка и набора чемпионов
       узлы переиспользуются, а не рубятся сдвигом соседей. */

    /* мини-график тренда: 5 точек от (wr - trend) к wr — на РЕАЛЬНЫХ полях wr/wrTrend */
    function wrprSparkPts(wr, tr) {
        var from = wr - (tr || 0), vals = [], i;
        for (i = 0; i < 5; i++) vals.push(from + (wr - from) * (i / 4));
        var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
        var rg = (mx - mn) || 1;
        return vals.map(function (v, k) {
            return (k * 15) + ',' + (17 - ((v - mn) / rg) * 14).toFixed(1);
        }).join(' ');
    }
    /* класс цвета WR — ДАННЫЕ (лучше/около/хуже среднего), цвет тут каноном разрешён */
    function wrprWrCls(v) { return v >= 52 ? 'wr-g' : (v >= 50 ? 'wr-m' : 'wr-b'); }

    function wrprEsc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function wrprRender() {
        var tbody = document.getElementById('wrprTbody');
        var noData = document.getElementById('wrprNoData');
        if (!tbody) return;

        wrprBuildHeader();          /* шапка сама точечная (labMorph) — зовём всегда */
        wireWrprSort();

        var cols = getWrprCols();
        var rankData = WR_DATA[_wrprRank];
        var list = rankData ? (rankData[_wrprRole] || []) : [];

        if (list.length === 0) {
            labMorph(tbody, '');
            noData.style.display = 'block';
            return;
        }
        noData.style.display = 'none';

        /* 'manual' = порядок как пришёл из данных (ручной), иначе сортировка кликом */
        var sorted = (_wrprSortCol === 'manual')
            ? list.slice()
            : list.slice().sort(function (a, b) {
                var field = { wr: 'wr', pr: 'pr', br: 'br', trend: 'ch', tier: 'tier' }[_wrprSortCol] || 'wr';
                if (field === 'tier') {
                    var ord = { 'S+': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
                    return _wrprSortDir * ((ord[a.tier] || 0) - (ord[b.tier] || 0));
                }
                return _wrprSortDir * ((a[field] || 0) - (b[field] || 0));
            });

        var html = sorted.map(function (d, i) {
            var engName = _wrprDisplayName[d.name] || d.name;
            var pWR = (window.patchMap || {})[d.name];
            var tier = d.tier || '';
            var tr = (d.ch == null) ? null : +d.ch;

            var cells = cols.map(function (c) {
                if (c.key === 'tier') {
                    return '<td>' + (tier
                        ? '<span class="tier-badge t-' + wrprEsc(tier.toLowerCase()) + '">' + wrprEsc(tier) + '</span>'
                        : '—') + '</td>';
                }
                if (c.key === 'wr') {
                    return '<td><span class="wr-cell"><span class="wr-track"><span class="wr-fill" style="width:' +
                        Math.max(0, Math.min(100, (d.wr - 40) * 5)) + '%"></span></span>' +
                        '<b class="' + wrprWrCls(d.wr) + '">' + d.wr.toFixed(2) + '%</b></span></td>';
                }
                if (c.key === 'pr') return '<td>' + d.pr + '%</td>';
                if (c.key === 'br') return '<td>' + d.br + '%</td>';
                if (c.key === 'trend') {
                    if (tr == null) return '<td>—</td>';
                    return '<td><span class="wr-cell"><span class="trend ' + (tr >= 0 ? 'up' : 'dn') + '">' +
                        (tr >= 0 ? '▲' : '▼') + Math.abs(tr).toFixed(1) + '</span>' +
                        '<svg class="spark" viewBox="0 0 60 18" preserveAspectRatio="none">' +
                        '<polyline points="' + wrprSparkPts(d.wr, tr) + '"/></svg></span></td>';
                }
                return '<td></td>';
            }).join('');

            return '<tr data-key="' + wrprEsc(d.name) + '" data-ch="' + wrprEsc(d.name) + '"' +
                (d.name === _wrprSelName ? ' class="sel"' : '') + '>' +
                '<td><div class="ch-cell"><span class="ch-num">' + (i + 1) + '</span>' +
                '<img class="ch-ava" loading="lazy" decoding="async" src="' + wrprEsc(wrprIcon(d.name)) + '" alt="' + wrprEsc(engName) + '">' +
                '<span class="ch-name">' + wrprEsc(engName) + '</span>' +
                (pWR ? '<span class="patch-dot ' + wrprEsc(pWR.type) + '"></span>' : '') +
                '</div></td>' + cells + '</tr>';
        }).join('');

        labMorph(tbody, html);
        wireWrprRows();
    }

    /* Клик/ховер по строкам — ОДИН делегированный слушатель на tbody.
       Узлы переживают ре-рендер, поэтому вешаем под флагом (ГОЧА lab-morph):
       иначе на каждый рендер копился бы новый слушатель. */
    function wireWrprRows() {
        var tbody = document.getElementById('wrprTbody');
        if (!tbody || tbody.__wired) return;
        tbody.__wired = 1;
        tbody.addEventListener('click', function (e) {
            var tr = e.target.closest('tr[data-ch]');
            if (!tr) return;
            _wrprSelName = tr.getAttribute('data-ch');
            /* выделение — точечно: снимаем класс с прежней строки, ставим на новую */
            var prev = tbody.querySelector('tr.sel');
            if (prev && prev !== tr) prev.classList.remove('sel');
            tr.classList.add('sel');
            /* ЗАКОН СВЯЗЕЙ: клик по чемпу ведёт в карточку справа (свап data-rightcol) */
            if (window.ChampSidePanel) window.ChampSidePanel.render(_wrprSelName);
        });
        tbody.addEventListener('mouseover', function (e) {
            var dot = e.target.closest('.patch-dot');
            if (!dot) return;
            var tr = dot.closest('tr[data-ch]');
            var pi = tr && (window.patchMap || {})[tr.getAttribute('data-ch')];
            if (pi) showGlobalPatchTip(e, pi, dot);
        });
        tbody.addEventListener('mouseout', function (e) {
            if (!e.target.closest || !e.target.closest('.patch-dot')) return;
            var t = document.getElementById('patchTip'); if (t) t.remove();
        });
    }

})();

// ═══════════════════════════════════════════════════════════════════
// Table column settings — универсальная система порядка/видимости столбцов
// Хранит конфиг в localStorage per-table, рисует модалку настроек.
// ═══════════════════════════════════════════════════════════════════
(function(){
    function storageKey(id){ return 'colCfg_' + id; }
    function loadConfig(tableId, defs){
        try {
            var raw = localStorage.getItem(storageKey(tableId));
            if(!raw) return defaultConfig(defs);
            var c = JSON.parse(raw);
            // Валидация: все ключи из defs должны быть учтены
            var defKeys = defs.map(function(d){ return d.key; });
            var order = (c.order || []).filter(function(k){ return defKeys.indexOf(k) !== -1; });
            // Добавить недостающие (новые столбцы после обновления)
            defKeys.forEach(function(k){ if(order.indexOf(k) === -1) order.push(k); });
            var hidden = Array.isArray(c.hidden) ? c.hidden.filter(function(k){ return defKeys.indexOf(k) !== -1; }) : [];
            // Новые столбцы с defHidden (появились после обновления, не были в сейве юзера) → скрыты по умолчанию
            defs.forEach(function(d){ if(d.defHidden && (c.order || []).indexOf(d.key) === -1 && hidden.indexOf(d.key) === -1) hidden.push(d.key); });
            return { order: order, hidden: hidden };
        } catch(e){ return defaultConfig(defs); }
    }
    function defaultConfig(defs){
        return { order: defs.map(function(d){ return d.key; }), hidden: defs.filter(function(d){ return d.defHidden; }).map(function(d){ return d.key; }) };
    }
    function saveConfig(tableId, cfg){
        try { localStorage.setItem(storageKey(tableId), JSON.stringify(cfg)); } catch(e){}
    }
    function resetConfig(tableId){
        try { localStorage.removeItem(storageKey(tableId)); } catch(e){}
    }

    function openColTableModal(tableId, defs, title, onApply){
        var cfg = loadConfig(tableId, defs);
        var overlay = document.createElement('div');
        overlay.className = 'cms-modal-overlay';
        overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });

        var win = document.createElement('div');
        win.className = 'cms-modal-win glass';
        win.style.maxWidth = '420px';
        win.innerHTML = '<h3 style="margin:0 0 16px;color:#fff;font-size:16px;">⚙ ' + title + '</h3>' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:12px;">Галочка — показывать. Стрелки — менять порядок.</div>' +
            '<div id="colListBox" style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;"></div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button id="colResetBtn" class="cms-btn-delete" type="button">Сброс</button>' +
              '<button id="colApplyBtn" class="cms-btn-save" type="button">Применить</button>' +
              '<button id="colCloseBtn" class="cms-btn-cancel" type="button">Отмена</button>' +
            '</div>';
        overlay.appendChild(win);
        document.body.appendChild(overlay);

        var order = cfg.order.slice();
        var hidden = new Set(cfg.hidden);

        function render(){
            var box = win.querySelector('#colListBox');
            box.innerHTML = '';
            order.forEach(function(key, idx){
                var def = defs.find(function(d){ return d.key === key; });
                if(!def) return;
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;';
                var locked = def.locked;
                row.innerHTML =
                    '<input type="checkbox" ' + (!hidden.has(key) ? 'checked' : '') + (locked ? ' disabled' : '') + ' data-key="'+key+'" style="width:16px;height:16px;cursor:'+(locked?'not-allowed':'pointer')+';">' +
                    '<span style="flex:1;color:#fff;font-size:13px;font-weight:600;">' + (def.icon ? def.icon + ' ' : '') + def.label + (locked ? ' <span style="color:rgba(255,255,255,0.4);font-size:10px;">(нельзя скрыть)</span>' : '') + '</span>' +
                    '<button data-dir="up" data-idx="'+idx+'" '+(idx===0?'disabled':'')+' style="width:28px;height:28px;background:rgba(255, 255, 255,0.1);border:1px solid rgba(255, 255, 255,0.3);color:#ffffff;border-radius:6px;cursor:pointer;'+(idx===0?'opacity:0.3;':'')+'">↑</button>' +
                    '<button data-dir="down" data-idx="'+idx+'" '+(idx===order.length-1?'disabled':'')+' style="width:28px;height:28px;background:rgba(255, 255, 255,0.1);border:1px solid rgba(255, 255, 255,0.3);color:#ffffff;border-radius:6px;cursor:pointer;'+(idx===order.length-1?'opacity:0.3;':'')+'">↓</button>';
                box.appendChild(row);
            });
            box.querySelectorAll('input[type=checkbox]').forEach(function(cb){
                cb.addEventListener('change', function(){
                    var k = cb.dataset.key;
                    if(cb.checked) hidden.delete(k); else hidden.add(k);
                });
            });
            box.querySelectorAll('button[data-dir]').forEach(function(btn){
                btn.addEventListener('click', function(){
                    var idx = +btn.dataset.idx;
                    var dir = btn.dataset.dir;
                    var ni = dir === 'up' ? idx - 1 : idx + 1;
                    if(ni < 0 || ni >= order.length) return;
                    var tmp = order[idx]; order[idx] = order[ni]; order[ni] = tmp;
                    render();
                });
            });
        }
        render();

        win.querySelector('#colApplyBtn').onclick = function(){
            saveConfig(tableId, { order: order, hidden: Array.from(hidden) });
            overlay.remove();
            if(onApply) onApply();
        };
        win.querySelector('#colCloseBtn').onclick = function(){ overlay.remove(); };
        win.querySelector('#colResetBtn').onclick = function(){
            window._showConfirm({ msg: 'Сбросить порядок и видимость столбцов к дефолту?', title: 'Сброс настроек', confirmText: 'Сбросить', icon: '🔄', danger: false }, function(){
                resetConfig(tableId);
                overlay.remove();
                if(onApply) onApply();
            });
        };
    }

    window._colSettings = {
        load: loadConfig,
        save: saveConfig,
        reset: resetConfig,
        open: openColTableModal
    };
})();

/* ════════════════════════════════════════════════════════════════
   M1.3a · Настройки отображения сайта (⚙ Мой профиль → Настройки).
   Перенос пользовательских настроек из lab-main. Хранится в localStorage,
   применяется data-атрибутами на <html> (осознанное глобальное оформление).
   Управляет: фон-сплэш за стеклом (6 чемпов + свой цвет), оттенок стекла,
   сила стекла, плотность таблиц, шрифт таблиц.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  /* ★ Э1.1 · ⚙ ПЕРЕЕХАЛИ НА wr-prefs.js (ЕДИНЫЙ ХАБ). Реестр артов больше НЕ здесь —
     он живёт в WRPrefs.ARTS, вместе с состоянием, хранением и применением.
     Смена настройки = меняются глобальные переменные на :root, узлы не трогаются вообще.
     Здесь остаётся ТОЛЬКО UI-попап и настройки, которых в хабе нет (dim/tblfont/railmode). */
  var P = window.WRPrefs;
  var ARTS = P ? P.ARTS : [];
  var KIND_LBL = {
    dark:  'Тёмные — текст читается легко',
    light: 'СВЕТЛЫЕ — худший случай, тут и проверяй читабельность',
    busy:  'Пёстрые — много контраста'
  };
  /* ★ BRAND_BG (градиент режима «Бренд») отсюда УБРАН — он переехал в
     canon-tokens.css как --splash-brand. Картинка фона не должна жить строкой в JS:
     оттуда её неизбежно кто-нибудь присвоит элементу напрямую. */

  /* ★ ЧЕГО ЗДЕСЬ БОЛЬШЕ НЕТ и почему (канон, DESIGN.md + выбор владельца):
       · glasspow / glassdark / glasstint / glasssat / glassborder — сила, тёмность,
         блюр, оттенок и граница стекла ЗАФИКСИРОВАНЫ каноном. Один материал = одна
         правда на весь сайт; ползунок тут означал, что у каждого юзера своё стекло.
       · accent — АКЦЕНТ БЕЛЫЙ, ОДИН, выбора нет. Цвет несут только ДАННЫЕ.
     Осталось то, что канон юзеру оставляет: арт за стеклом, затемнение фона,
     плотность, шрифт таблиц, режим рельса. */
  /* splashcolor отсюда убран: цвет подложки — часть подложки, а у неё ОДИН
     владелец (WRPrefs.splashColor). Тут остаётся только то, что подложки не касается. */
  var DEF = { dim:'light', railmode:'overlay', tblfont:'medium' };
  var KEY = 'site-settings';
  function load(){ try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY)||'{}')); } catch(e){ return Object.assign({}, DEF); } }
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
  var S = load();

  /* splash и density живут в WRPrefs — читаем оттуда, а не из своей копии */
  function prefSplash(){ return P ? P.get().splash : 'thresh'; }
  function prefDensity(){ return P ? P.get().density : 'normal'; }

  // splash вынесен в свой пикер-миниатюры (см. splashGroup) — тут только сегменты.
  var OPTS = [
    { k:'railmode',  label:'Рельс (боковое меню) при наведении', items:[{v:'overlay',t:'Оверлей'},{v:'shift',t:'Раздвигание'}] },
    { k:'dim',       label:'Затемнение фона (виден сплэш)', items:[{v:'none',t:'Нет'},{v:'light',t:'Слабо'},{v:'mid',t:'Средне'},{v:'strong',t:'Сильно'}] },
    { k:'tblfont',   label:'Шрифт таблиц',    items:[{v:'small',t:'Мелкий'},{v:'medium',t:'Средний'},{v:'large',t:'Крупный'}] }
  ];
  /* Плотность — сегмент как у прочих, но владелец значения WRPrefs (токен --dens) */
  var DENS_OPT = { k:'density', label:'Плотность', items:(P ? P.DENSITY.map(function(d){ return { v:d.v, t:d.t }; }) : []) };

  /* Подложка — ОДИН элемент на весь сайт. Здесь его только СОЗДАЮТ; чем он
     закрашен, решает исключительно --splash-img (владелец — wr-prefs.js). */
  function ensureSplash(){
    var el = document.getElementById('siteSplash');
    if (!el){ el = document.createElement('div'); el.id = 'siteSplash'; document.body.appendChild(el); }
    return el;
  }
  function apply(){
    var h = document.documentElement;
    h.setAttribute('data-glass', 'on');
    h.setAttribute('data-dim', S.dim);
    h.setAttribute('data-tblfont', S.tblfont);
    h.setAttribute('data-railmode', S.railmode || 'overlay');
    /* ★ ФОН ЗДЕСЬ НЕ КРАСИТСЯ. Раньше было три ветки el.style.backgroundImage =
       ('none' / BRAND_BG / 'var(--splash)') — инлайн-стиль сильнее CSS, поэтому
       фактическим владельцем подложки был ЭТОТ код, а переменная — фикцией.
       Отсюда и рождался класс багов «вид ставит свой фон-арт».
       Теперь: элемент создаём, картинку не трогаем — её даёт --splash-img.
       АКЦЕНТ и ПЛОТНОСТЬ тоже не трогаем (владелец WRPrefs), СИЛА СТЕКЛА — канон-фикс. */
    h.setAttribute('data-splashmode', prefSplash() === 'color' ? 'color' : 'art');
    ensureSplash();
  }

  // Пикер сплэш-арта: миниатюры, сгруппированные по яркости.
  // ★ Плитка = THUMB (308×560, ~40 КБ), а НЕ полный сплэш (~500 КБ):
  //   ассет подбирается под размер показа, иначе 11 плиток = мегабайты впустую.
  function splashGroup(){
    var cur = prefSplash();
    function row(kind){
      return '<div class="ss-kind">'+KIND_LBL[kind]+'</div><div class="ss-splash">'+
        ARTS.filter(function(a){ return a.kind===kind; }).map(function(a){
          return '<button class="ss-thumb'+(cur===a.v?' on':'')+'" data-v="'+a.v+'" title="'+a.t+'" '+
            'style="background-image:url(\''+P.thumbURL(a.v)+'\')"><span>'+a.t+'</span></button>';
        }).join('')+'</div>';
    }
    return '<div class="ss-grp">'+
      '<div class="ss-label">Арт фона за стеклом — ОДИН на весь сайт</div>'+
      row('dark') + row('light') + row('busy') +
      '<div class="ss-kind">Без арта</div><div class="ss-splash">'+
        '<button class="ss-thumb ss-thumb-grad'+(cur==='brand'?' on':'')+'" data-v="brand"><span>Бренд</span></button>'+
        '<button class="ss-thumb ss-thumb-solid'+(cur==='color'?' on':'')+'" data-v="color"><span>Свой цвет</span></button>'+
      '</div>'+
      '<div class="ss-color" style="'+(cur==='color'?'':'display:none')+'"><input type="color" value="'+(P ? P.get().splashColor : '#04121f')+'"><span>свой цвет фона</span></div>'+
    '</div>';
  }
  /* Плотность: сегмент рисуем тут, значение пишет WRPrefs (один токен --dens). */
  function densGroup(){
    var cur = prefDensity();
    return '<div class="ss-grp"><div class="ss-label">'+DENS_OPT.label+'</div>'+
      '<div class="ss-seg" data-k="density">'+
        DENS_OPT.items.map(function(it){ return '<button data-v="'+it.v+'" class="'+(cur===it.v?'on':'')+'">'+it.t+'</button>'; }).join('')+
      '</div></div>';
  }

  function build(){
    var ov = document.createElement('div'); ov.className = 'ss-ov';
    var grps = OPTS.map(function(o){
      return '<div class="ss-grp"><div class="ss-label">'+o.label+'</div>'+
        '<div class="ss-seg" data-k="'+o.k+'">'+
          o.items.map(function(it){ return '<button data-v="'+it.v+'" class="'+(S[o.k]===it.v?'on':'')+'">'+it.t+'</button>'; }).join('')+
        '</div>'+
      '</div>';
    }).join('');
    ov.innerHTML = '<div class="ss-modal glass">'+
      '<div class="ss-h"><div class="ss-title">⚙ Настройки отображения</div><button class="ss-x" title="Закрыть">✕</button></div>'+
      splashGroup() + densGroup() + grps + '</div>';
    document.body.appendChild(ov);

    function close(){ ov.remove(); }
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    ov.querySelector('.ss-x').onclick = close;
    var colorWrap = ov.querySelector('.ss-color');
    ov.querySelectorAll('.ss-seg').forEach(function(seg){
      var k = seg.getAttribute('data-k');
      seg.querySelectorAll('button').forEach(function(b){
        b.onclick = function(){
          var v = b.getAttribute('data-v');
          seg.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
          /* плотность принадлежит хабу — пишем туда; остальное локальное */
          if (k === 'density') { if (P) P.set('density', v); return; }
          S[k] = v; persist(); apply();
        };
      });
    });
    // Пикер артов — состояние в WRPrefs (там же localStorage и применение переменной)
    ov.querySelectorAll('.ss-thumb').forEach(function(b){
      b.onclick = function(){
        var v = b.getAttribute('data-v');
        ov.querySelectorAll('.ss-thumb').forEach(function(x){ x.classList.toggle('on', x===b); });
        if (colorWrap) colorWrap.style.display = (v==='color') ? '' : 'none';
        if (P) P.set('splash', v);
        apply();
      };
    });
    var ci = ov.querySelector('.ss-color input[type="color"]');
    /* цвет подложки пишем в WRPrefs — он один владеет фоном (и --splash-color) */
    if (ci) ci.oninput = function(){ if (P) P.set('splashColor', ci.value); };
  }

  window.openDisplaySettings = function(){
    var um = document.getElementById('userMenu'); if (um) um.classList.remove('active');
    if (!document.querySelector('.ss-ov')) build();
  };

  /* ★ Э1.1 КАРКАС — рельс = ЧИСТО HOVER.
     Раскрытие рисует CSS (clip-path), состояние держит html[data-railopen] — оно нужно
     режиму «Раздвигание», чтобы контент (--shell-left) знал, что рельс раскрыт.
     Никаких transform/width — 0 reflow.

     ★ ДЕБАУНС ЗАКРЫТИЯ (120мс). Открытие — СРАЗУ (реакция должна быть мгновенной).
     Закрытие — с задержкой, таймер отменяется при возврате мыши.
     ПОЧЕМУ: по пути к нижнему пункту курсор на миг выскакивает за край рельса →
     mouseleave снимал флаг мгновенно → рельс и контент дёргались туда-обратно
     («мигание»). Задержка гасит случайный проскок, не задерживая осознанный уход. */
  var RAIL_CLOSE_DELAY = 120;
  function wireRail(){
    var rail = document.getElementById('sidePanel');
    if (!rail) return;
    var h = document.documentElement;
    var closeTimer = null;

    function openRail(){
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      h.setAttribute('data-railopen','1');
    }
    function scheduleClose(){
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function(){
        closeTimer = null;
        /* мышь могла вернуться до срабатывания — не закрываем то, что под курсором */
        if (rail.matches(':hover')) return;
        h.removeAttribute('data-railopen');
      }, RAIL_CLOSE_DELAY);
    }

    rail.addEventListener('mouseenter', openRail);
    rail.addEventListener('mouseleave', scheduleClose);
    /* уход курсора со страницы целиком → закрыть без ожидания «возврата» */
    rail.addEventListener('focusin', openRail);
    rail.addEventListener('focusout', scheduleClose);
  }

  apply();
  wireRail();
})();

/* ════════════════════════════════════════════════════════════════
   M1.4 · Правая панель карточки чемпа (виды Статы/WinRate).
   Клик по строке таблицы → карточка выбранного чемпа справа
   (портрет, роли, статы на текущем уровне, «Подробнее» → модалка).
   Данные из глобального window._champsRaw / _champIcon.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var sel = null;
  function panel(){ var p=document.getElementById('champSidePanel'); if(!p){ p=document.createElement('div'); p.id='champSidePanel'; document.body.appendChild(p);} return p; }
  function lvl(){ return window._curLvl || 10; }
  function champs(){ return window._champsRaw || []; }
  function icon(n){ return window._champIcon ? window._champIcon(n) : ''; }
  function roles(c){ var r=[]; if(c.is){ if(c.is.Top)r.push('Соло'); if(c.is.Jungle)r.push('Лес'); if(c.is.Mid)r.push('Мид'); if(c.is.ADC)r.push('АДК'); if(c.is.Support)r.push('Сап'); } return r.join(' · '); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function statAt(b,g,L){ return Math.round((b||0) + ((L-1)*(g||0))); }

  function splash(n){ var k = window._champKey ? window._champKey(n) : n; return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + k + '_0.jpg'; }

  function render(name){
    var p = panel();
    var c = champs().find(function(x){ return x.name === name; });
    if(!c){ p.innerHTML = '<div class="csc-hint">Кликни чемпиона в таблице — здесь будет его карточка</div>'; return; }
    sel = name;
    var L = lvl();
    var energy = c.res === 'Energy';
    // 6 реальных статов на текущем уровне → пилюли-теги (лабовый .tag формат)
    var tags = [
      '⚔ ' + statAt(c.ad_b,c.ad_g,L) + ' AD',
      '✚ ' + statAt(c.hp_b,c.hp_g,L) + ' HP',
      '🛡 ' + statAt(c.ar_b,c.ar_g,L) + ' Броня',
      '✦ ' + statAt(c.mr_b,c.mr_g,L) + ' Mрез',
      (energy ? '⚡ Энергия' : '💧 ' + statAt(c.mn_b,c.mn_g,L) + ' Мана'),
      '🏹 ' + statAt(c.rng_b,c.rng_g,L) + ' Дальн.'
    ];
    p.innerHTML =
      '<div class="big"><img alt="" src="' + splash(name) + '"></div>' +
      '<h3>' + esc(name) + '</h3>' +
      '<div class="csc-role">' + (roles(c) || '—') + ' · ур.' + L + '</div>' +
      '<div class="meta">' + tags.map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<button class="csc-btn" type="button">Подробнее →</button>';
    // сплэш не нашёлся (WR-эксклюзив) → падаем на квадратную иконку, потом прячем
    var bigImg = p.querySelector('.big img');
    if(bigImg){
      var triedIcon = false;
      bigImg.onerror = function(){ if(!triedIcon){ triedIcon = true; this.src = icon(name); } else { this.style.display = 'none'; } };
    }
    var b = p.querySelector('.csc-btn'); if(b) b.onclick = function(){ if(window.openChampPage) window.openChampPage(name); };
  }

  /* Делегированный клик по строкам таблицы статов.
     ЗАКОН СВЯЗЕЙ (Э1.9): клик по САМОМУ чемпу — имени или иконке — открывает его
     СТРАНИЦУ. Клик по остальной строке остаётся выбором чемпа в правую карточку:
     это разные намерения (сравнить числа vs изучить чемпа), и терять второе нельзя. */
  document.addEventListener('click', function(e){
    var body = document.getElementById('statBody'); if(!body) return;
    var tr = e.target.closest('tr'); if(!tr || !body.contains(tr)) return;
    var nm = tr.querySelector('.f-cname'); if(!nm) return;
    var name = nm.textContent.trim();
    var onChamp = e.target.closest('.f-cname, .f-portwrap');
    if (onChamp && window.openChampPage) { e.stopPropagation(); window.openChampPage(name); return; }
    render(name);
  });
  // карточка пересчитывается при смене уровня
  document.addEventListener('input', function(e){ if(e.target && e.target.id === 'lvlRange' && sel) render(sel); });
  // авто-первый чемп когда данные загрузились
  document.addEventListener('champsLoaded', function(){ if(!sel){ var c = champs()[0]; if(c) render(c.name); else render(null); } });

  // панель видна на главном экране по умолчанию (вид Статы); switchMainView переключает
  // Старт = вид Статы → справа панель-выборка (не карточка). Первый кадр сразу правильный.
  try { document.body.setAttribute('data-sidecard','on'); document.body.setAttribute('data-rightcol','select'); } catch(e){}
  if(!champs().length) render(null);
  else if(!sel){ render(champs()[0].name); }

  window.ChampSidePanel = { render: render, current: function(){ return sel; } };
})();

/* ════════════════════════════════════════════════════════════════
   Э1.5 · МЕТА-ХАБ — ПЕРЕСБОРКА ИЗ lab-metahub (канон DESIGN.md).
   Старый hubHTML снесён ЦЕЛИКОМ (не рескин): каркас, шапка, лидер, KPI и
   ВЕЕР собраны из лаба, данные — РЕАЛЬНЫЕ из WR_DATA (data-pipeline/wr-stats.json):
   винрейт, пикрейт, банрейт, ТИР и ТРЕНД приходят из снимка, ничего не выдумано.

   ЧЕГО ИЗ ЛАБА НЕ ВЗЯЛИ (осознанно):
   · applySplash (metahub.js:318) — свой фон-арт. Подложка на сайте ОДНА
     (--splash-img, ⚙ рельса); вид, красящий фон под себя, = второй владелец фона.
   · ⚙-попап лаба — на боевом настройки живут в одном месте (.rail-gear → WRPrefs).
   · дизайн-полоса и meta-data.js (демо-снимок) — это дев-инструменты песочницы.
   · демо-кривая «WR за 5 патчей» — заменена реальной: снимок даёт wr и trend,
     линия строится ровно как в виде WinRate (wrprSparkPts): было wr−trend → стало wr.

   АНТИДЁРГАНЬЕ: шапка и бенто строятся ОДИН раз; смена ранга и приход данных
   идут через labMorph — трогается только изменившееся, узлы живут.
   ВЕЕР (.mh-*) — god-tier, геометрия и анимация перенесены 1-в-1.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function gnorm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
  function ckey(n){ return window._champKey ? window._champKey(n) : n; }
  function icon(n){ return window._champIcon ? window._champIcon(canon(n)) : ''; }
  function splash(n){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + ckey(canon(n)) + '_0.jpg'; }
  function roleRu(r){ return { top:'Топ', jungle:'Лес', mid:'Мид', adc:'АДК', support:'Сап' }[r] || r; }
  function wrCls(v){ return v>=52 ? 'wr-g' : (v<49 ? 'wr-b' : 'wr-n'); }
  function tierOf(wr){ return wr>=53?'S':wr>=51?'A':wr>=49?'B':'C'; }
  function port(n){ return '<img class="f-port" src="'+icon(n)+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'; }

  /* ── ИМЯ ИЗ СНИМКА → ИМЯ ТАБЛИЦЫ. В wr-stats имена свои («Kogmaw», «LeeSin»,
     «MonkeyKing»), в таблице чемпионов — свои («KogMaw», «Lee Sin», «Wukong»).
     Сводим их одним ключом (тем же champKey, что сводит иконки) и дальше по САЙТУ
     ходим ИМЕНЕМ ТАБЛИЦЫ: иначе ddragon отдаёт 404 на Kogmaw.png, а страницы чемпа
     не находится. Индекс перестраивается, когда таблица догрузилась. ── */
  var _idx = null, _idxLen = -1;
  function slugify(s){ return String(s).toLowerCase().replace(/['’.]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
  function index(){
    var raw = window._champsRaw || [];
    if(_idx && _idxLen === raw.length) return _idx;
    var m = {};
    raw.forEach(function(c){ if(c && c.name) m[gnorm(ckey(c.name))] = { name:c.name, slug:slugify(c.name) }; });
    _idx = m; _idxLen = raw.length;
    return m;
  }
  function canon(name){ var e = index()[gnorm(ckey(name))]; return e ? e.name : name; }
  /* ЗАКОН СВЯЗЕЙ: клик по чемпу → ЕГО СТРАНИЦА (та же, что в поиске и в выдаче).
     Чемпа нет в таблице (совсем новый) — ведём в каталог, а не в 404. */
  function champHref(name){ var e = index()[gnorm(ckey(name))]; return e ? ('champions/'+e.slug+'/') : 'champions/'; }
  /* адрес страницы чемпа нужен и тир-мейкеру — владелец один, дубля нет */
  window.champPageHref = champHref;

  /* ── 🔥 ВЕЕР-витрина: радар «качеств» чемпа. Оси — игровые качества
     (Урон/Сложн./Выжив./Польза, шкала 1-3) из data-pipeline/champion-qualities.json.
     Грузим один раз, радары дозаполняются по готовности (пустой бокс держит размер
     — без мигания). Обновляется: node data-pipeline/fetch-champion-qualities.mjs ── */
  var QSRC = 'data-pipeline/champion-qualities.json';
  var RAXES = [
    { f:'damage',    lbl:'Урон' },
    { f:'difficult', lbl:'Сложн.' },
    { f:'survive',   lbl:'Выжив.' },
    { f:'utility',   lbl:'Польза' }
  ];
  var _qmap = null, _qPromise = null;
  function loadQualities(){
    if(_qPromise) return _qPromise;
    _qPromise = fetch(QSRC, { cache:'force-cache' })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(j){
        var arr = Array.isArray(j) ? j : ((j && j.champions) || []);
        var m = {}; arr.forEach(function(c){ if(!c) return; if(c.name) m[gnorm(c.name)]=c; if(c.id) m[gnorm(c.id)]=c; }); _qmap = m; return m;
      })
      .catch(function(){ _qmap = {}; return {}; });
    return _qPromise;
  }
  function radarInner(name){
    var q = _qmap && _qmap[gnorm(name)];
    if(!q) return '';
    var n=RAXES.length, cx=120, cy=110, R=66;
    function frac(v){ return Math.max(0.14, Math.min(1, (+v||0)/3)); }
    function pt(i,f){ var a=(-90+i*(360/n))*Math.PI/180; return [cx+Math.cos(a)*R*f, cy+Math.sin(a)*R*f]; }
    var grid=[0.33,0.66,1].map(function(g){ return '<polygon points="'+RAXES.map(function(_,i){return pt(i,g).join(',');}).join(' ')+'" fill="none" stroke="var(--sel-12)" stroke-width="1"/>'; }).join('');
    var axes=RAXES.map(function(_,i){ var e=pt(i,1); return '<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="var(--sel-12)" stroke-width="1"/>'; }).join('');
    var labels=RAXES.map(function(a,i){ var l=pt(i,1.28); return '<text x="'+l[0]+'" y="'+l[1]+'" fill="var(--txt-mute)" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">'+a.lbl+'</text>'; }).join('');
    var data=RAXES.map(function(a,i){ return pt(i, frac(q[a.f])).join(','); }).join(' ');
    var dots=RAXES.map(function(a,i){ var p=pt(i, frac(q[a.f])); return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="var(--accent)"/>'; }).join('');
    return '<svg viewBox="0 0 240 220">'+grid+axes+'<polygon points="'+data+'" fill="var(--sel-18)" stroke="var(--accent)" stroke-width="2"/>'+dots+labels+'</svg>';
  }

  /* ── Спарклайн тренда. РЕАЛЬНЫЙ: снимок даёт текущий wr и trend (дельта за патч),
     значит известны обе точки — было (wr−trend) и стало (wr). Между ними интерполяция,
     ровно как в виде WinRate (wrprSparkPts) — одна механика на весь сайт. ── */
  function trendVals(wr, tr){
    var from = wr - tr, vals = [], i;
    for(i=0;i<5;i++) vals.push(from + (wr-from)*(i/4));
    return vals;
  }
  function spark(vals, cls, w, h){
    var min=Math.min.apply(null,vals), max=Math.max.apply(null,vals), span=(max-min)||1;
    var pts = vals.map(function(v,i){ var x=(i/(vals.length-1))*(w-2)+1; var y=h-2-((v-min)/span)*(h-4); return x.toFixed(1)+','+y.toFixed(1); });
    var last = pts[pts.length-1].split(',');
    return '<svg class="spark '+cls+'" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><polyline class="ln" points="'+pts.join(' ')+'"/><circle class="dot" cx="'+last[0]+'" cy="'+last[1]+'" r="1.9"/></svg>';
  }

  /* ── Гайды чемпов (data-pipeline/guides): матчапы/контры/сборки/руны/прокачка ── */
  var GUIDE_BASE = 'data-pipeline/guides/';
  var _gIndex = null, _gCache = {}, _gAlias = { monkeyking:'wukong' };
  function guideIndex(){
    if(_gIndex) return _gIndex;
    _gIndex = fetch(GUIDE_BASE + '_index.json', { cache:'no-cache' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ var map = {}; if(j && j.champions) j.champions.forEach(function(c){ map[gnorm(c.name)] = c.slug; }); return map; })
      .catch(function(){ return {}; });
    return _gIndex;
  }
  function loadGuide(name){
    return guideIndex().then(function(map){
      var n = gnorm(name), slug = map[n] || _gAlias[n] || n;
      if(_gCache[slug]) return _gCache[slug];
      _gCache[slug] = fetch(GUIDE_BASE + slug + '.json', { cache:'no-cache' })
        .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
      return _gCache[slug];
    });
  }
  window.ChampGuides = { load: loadGuide, index: guideIndex };

  /* ════════════════════════════════════════════════════════════════
     ДАННЫЕ РАНГА — из WR_DATA[rank] (заполняет loadWrStats из wr-stats.json)
     ════════════════════════════════════════════════════════════════ */
  var ROLES = ['top','jungle','mid','adc','support'];
  var _rank = 'чалик';

  function ranks(){ return window.WR_RANKS || [{ id:'чалик', label:'Чалик' }]; }
  function rankLabel(id){
    var r = ranks().filter(function(x){ return x.id === (id || _rank); })[0];
    return r ? r.label : (id || _rank);
  }
  function poolOf(rank){
    var rd = (window.WR_DATA || {})[rank] || {};
    var out = [];
    ROLES.forEach(function(role){
      (rd[role] || []).forEach(function(o){
        if(o && o.name && !isNaN(+o.wr))
          out.push({ name:o.name, wr:+o.wr, pr:+o.pr||0, br:+o.br||0, role:role,
                     tier:o.tier || null, trend:(o.ch==null ? null : +o.ch) });
      });
    });
    return out;
  }
  function hasData(rank){ return poolOf(rank).length > 0; }
  /* лучший вход на чемпа (по WR), дедуп между ролями */
  function bestPerChamp(pool){
    var m = {};
    pool.forEach(function(o){ if(!m[o.name] || o.wr > m[o.name].wr) m[o.name] = o; });
    return Object.keys(m).map(function(k){ return m[k]; });
  }
  function ctx(){
    var pool = poolOf(_rank);
    if(!pool.length) return null;
    var champs = bestPerChamp(pool);
    var byWr = champs.slice().sort(function(a,b){ return b.wr-a.wr; });
    return {
      pool: pool, champs: champs, hero: byWr[0], top5: byWr.slice(0,5),
      sTier: byWr.filter(function(c){ return c.wr>=52; }).slice(0,10),
      topPr: champs.slice().sort(function(a,b){ return b.pr-a.pr; }).slice(0,5),
      topBr: champs.slice().sort(function(a,b){ return b.br-a.br; }).slice(0,5)
    };
  }

  /* ── ГАЙД ЛИДЕРА (реальный, data-pipeline/guides) кормит ДВА блока: «Сборка дня»
     и «Контрят». Держим разобранный результат в кэше по чемпу: без кэша смена ранга
     туда-обратно каждый раз показывала бы «загружаю…» и мигала. ── */
  var _guide = {};
  function ensureGuide(name, done){
    if(Object.prototype.hasOwnProperty.call(_guide, name)) return;   /* уже есть или уже грузится */
    _guide[name] = null;
    loadGuide(canon(name)).then(function(g){
      var b = g && g.builds && g.builds[0] && g.builds[0].items;
      _guide[name] = {
        build: b ? (b.core || []).concat((b.boots && b.boots[0]) ? [b.boots[0]] : []) : [],
        counters: (g && g.counters) || []
      };
      done();
    });
  }

  /* ════════════════════════════════════════════════════════════════
     БЛОКИ (порт из lab-metahub)
     ════════════════════════════════════════════════════════════════ */

  /* 1 — Лидер меты */
  function heroBlock(c){
    var href = champHref(c.name);
    var t = c.tier || tierOf(c.wr);
    var line = '';
    /* строку тренда показываем, только если он ЕСТЬ: «55.8% → 55.8%» с плоской
       линией — это не данные, а шум (у лидера чалика trend обычно 0) */
    if(c.trend){
      var v = trendVals(c.wr, c.trend);
      line = '<div class="spark-row">' + spark(v, c.trend>=0 ? 'up' : 'dn', 84, 20) +
        '<span>WR за патч: <b>' + v[0].toFixed(1) + '%</b> → <b>' + c.wr.toFixed(1) + '%</b></span></div>';
    }
    return '<div class="hub-hero glass">' +
      '<div class="hero-art" style="background-image:url(\'' + splash(c.name) + '\')"></div>' +
      '<img class="big" src="' + icon(c.name) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="info">' +
        '<span class="lbl">★ Лидер меты · ' + esc(rankLabel()) + '</span>' +
        '<h2><a href="' + href + '">' + esc(c.name) + '</a></h2>' +
        '<div class="hrow">' +
          '<span class="tag">Тир <span class="tier" data-t="' + esc(t) + '">' + esc(t) + '</span></span>' +
          '<span class="tag">WR <b>' + c.wr.toFixed(1) + '%</b></span>' +
          '<span class="tag">' + roleRu(c.role) + '</span>' +
        '</div>' + line +
        '<a class="cta" href="' + href + '">Открыть гайды →</a>' +
      '</div></div>';
  }

  /* 2 — KPI */
  function kpiBlock(c){
    var topWr = c.hero;
    var mostBan = c.champs.slice().sort(function(a,b){ return b.br-a.br; })[0];
    var roleSum = {}; c.pool.forEach(function(o){ roleSum[o.role] = (roleSum[o.role]||0) + o.pr; });
    var metaRole = Object.keys(roleSum).sort(function(a,b){ return roleSum[b]-roleSum[a]; })[0];
    function kpi(lbl, val, sub){ return '<div class="f-kpi glass"><div class="k-lbl">'+lbl+'</div><div class="k-val">'+val+'</div><div class="k-sub">'+sub+'</div></div>'; }
    return '<div class="f-kpis">' +
      kpi('Топ винрейт', '<a href="'+champHref(topWr.name)+'">'+esc(topWr.name)+'</a>', '<b>'+topWr.wr.toFixed(1)+'%</b> WR') +
      kpi('Мета-роль', roleRu(metaRole), 'по пикрейту') +
      kpi('Самый банимый', '<a href="'+champHref(mostBan.name)+'">'+esc(mostBan.name)+'</a>', '<b>'+mostBan.br.toFixed(1)+'%</b> банов') +
      kpi('Чемпионов', c.champs.length, esc(rankLabel())) +
    '</div>';
  }

  /* 3 — 🔥 ВЕЕР-витрина (god-tier, 1-в-1: геометрия и анимация не тронуты).
     `fresh` (появление карт) — ТОЛЬКО при первой сборке: смена ранга это не
     «появление», блок постоянный. Иначе веер мигает на каждый клик. */
  var _fanShown = false;
  function fanBlock(list){
    var fresh = _fanShown ? '' : ' fresh'; _fanShown = true;
    return '<div class="mh-fan-wrap' + fresh + '"><h4>Витрина меты <span class="pill-lbl">Топ-' + list.length + ' ' + esc(rankLabel()) + '</span></h4>' +
      '<div class="mh-fan-stage v-fan">' + list.map(function(c){
        return '<a class="mh-card glow" href="' + champHref(c.name) + '" data-key="' + esc(c.name) + '">' +
          '<div class="mh-art"><img src="' + splash(c.name) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + icon(c.name) + '\'"></div>' +
          '<div class="mh-shade"></div>' +
          '<div class="mh-body">' +
            '<div class="mh-name">' + esc(c.name) + '</div>' +
            '<div class="mh-role">' + roleRu(c.role) + '</div>' +
          '</div>' +
          '<div class="mh-reveal">' +
            '<div class="mh-radar" data-radar="' + esc(canon(c.name)) + '">' + radarInner(canon(c.name)) + '</div>' +
            '<div class="mh-wrs">' +
              '<div class="mh-wr ' + (c.wr>=50?'wr-g':'wr-b') + '"><b>' + c.wr.toFixed(1) + '%</b><span>WR</span></div>' +
              '<div class="mh-wr mh-wr-pr"><b>' + c.pr.toFixed(1) + '%</b><span>PR</span></div>' +
              '<div class="mh-wr mh-wr-br"><b>' + c.br.toFixed(1) + '%</b><span>BR</span></div>' +
            '</div>' +
            '<div class="click-tip">клик → страница чемпа</div>' +
          '</div>' +
        '</a>';
      }).join('') + '</div></div>';
  }

  /* ════════════════════════════════════════════════════════════════
     БЛОКИ 4-11 — карточки данных. Общие кирпичики: строка чемпа и чип чемпа.
     Оба — ССЫЛКИ на страницу чемпа (ЗАКОН СВЯЗЕЙ), не «мёртвые» div.
     ════════════════════════════════════════════════════════════════ */
  function champRow(c, i, val, cls, withSpark){
    var sp = (withSpark && c.trend) ? spark(trendVals(c.wr, c.trend), c.trend>=0 ? 'up' : 'dn', 44, 16) : '';
    return '<a class="hc-row" href="' + champHref(c.name) + '"><span class="rank-i">' + (i+1) + '</span>' + port(c.name) +
      '<span class="hc-n">' + esc(c.name) + '</span>' + sp + '<span class="hc-v ' + cls + '">' + val + '</span></a>';
  }
  function champChip(name){ return '<a class="hc-champ" href="' + champHref(name) + '">' + port(name) + '<span>' + esc(name) + '</span></a>'; }

  /* 4 — Топ-5 по винрейту (со спарклайном реального тренда) */
  function topWrBlock(list){
    return '<div class="hub-card glass"><h4>Топ-5 по винрейту <span class="pill-lbl">' + esc(rankLabel()) + '</span></h4>' +
      list.map(function(c,i){ return champRow(c, i, c.wr.toFixed(1)+'%', wrCls(c.wr), true); }).join('') + '</div>';
  }
  /* 5 — S-тир сейчас */
  function sTierBlock(list){
    if(!list.length) return '<div class="hub-card glass"><h4>S-тир сейчас</h4>' +
      '<div class="empty"><b>На этом ранге нет чемпов с WR ≥ 52%.</b><br>Это не пропажа данных — мета ровная.</div></div>';
    return '<div class="hub-card glass"><h4>S-тир сейчас <span class="pill-lbl">WR ≥ 52%</span></h4>' +
      '<div class="hc-pool">' + list.map(function(c){ return champChip(c.name); }).join('') + '</div></div>';
  }
  /* 6 — Топ по пикрейту · 7 — Топ по банрейту */
  function topRateBlock(list, kind){
    var isBan = kind === 'ban';
    return '<div class="hub-card glass"><h4>' + (isBan ? 'Топ по банрейту' : 'Топ по пикрейту') + '</h4>' +
      list.map(function(c,i){ return champRow(c, i, (isBan ? c.br : c.pr).toFixed(1)+'%', isBan ? 'wr-b' : 'wr-n', false); }).join('') + '</div>';
  }
  /* 8 — Сборка дня (реальная: первый билд из гайда лидера) */
  function buildBlock(hero){
    var g = _guide[hero.name];
    var head = '<h4>Сборка дня <span class="pill-lbl">' + esc(hero.name) + '</span>' +
      '<a class="go-all" href="' + champHref(hero.name) + '">Весь гайд →</a></h4>';
    if(!g) return '<div class="hub-card glass" id="mhBuild">' + head + '<div class="empty">Читаю сборку из гайда…</div></div>';
    if(!g.build.length) return '<div class="hub-card glass" id="mhBuild">' + head +
      '<div class="empty"><b>Сборки для этого чемпа в гайдах нет.</b><br>Появится в гайде — встанет сюда сама.</div></div>';
    return '<div class="hub-card glass" id="mhBuild">' + head + g.build.map(function(it,i){
      return '<button type="button" class="hc-row" data-tool="items"><span class="rank-i">' + (i+1) + '</span>' +
        '<span class="hc-n">' + esc(it) + '</span></button>';
    }).join('') + '</div>';
  }
  /* 9 — Контрят лидера (реальные контры из гайда) */
  function counterBlock(hero){
    var g = _guide[hero.name];
    var head = '<h4>Контрят: ' + esc(hero.name) + '</h4>';
    if(!g) return '<div class="hub-card glass" id="mhCounter">' + head + '<div class="empty">Читаю контры из гайда…</div></div>';
    if(!g.counters.length) return '<div class="hub-card glass" id="mhCounter">' + head +
      '<div class="empty"><b>Контры для этого чемпа в гайдах не указаны.</b></div></div>';
    return '<div class="hub-card glass" id="mhCounter">' + head +
      '<div class="hc-pool">' + g.counters.map(champChip).join('') + '</div></div>';
  }
  /* 10 — Ближайшие турниры. ★ ДЕМО: живая турнирная база (Firestore /tournaments)
     принадлежит разделу «Турниры» (cybersport.js) и наружу список не отдаёт.
     Лезть в неё вторым владельцем нельзя — поэтому превью честно помечено ДЕМО. */
  var TOURS_DEMO = [
    { name: 'WR Masters · Финал',   when: 'сегодня 18:00', live: true },
    { name: 'Asia Cup · Полуфинал', when: 'завтра 14:00' },
    { name: 'EU Open · Групповой',  when: '12.06' }
  ];
  function toursBlock(){
    return '<div class="hub-card glass"><h4>Ближайшие турниры <span class="demo">демо</span>' +
      '<button type="button" class="go-all" data-tool="cybersport">В Турниры →</button></h4>' +
      TOURS_DEMO.map(function(x){
        return '<button type="button" class="hc-tour" data-tool="cybersport">' +
          (x.live ? '<span class="es-live">LIVE</span>' : '<span class="hc-dot"></span>') +
          '<b>' + esc(x.name) + '</b><span class="hc-when">' + esc(x.when) + '</span></button>';
      }).join('') +
      '<div class="empty">Цифры выдуманы. Станут живыми, когда раздел «Турниры» начнёт отдавать свою базу.</div></div>';
  }
  /* 11 — Что нового. РЕАЛЬНОЕ: патч-ноты из Firestore (коллекция patchnotes,
     та же лента, что в «Изменениях»). Не приехали — честный пустой стейт. */
  var KIND_LBL = { buff: 'БАФФ', adjust: 'ПРАВКА', nerf: 'НЕРФ' };
  function newsBlock(){
    var list = (window._cmsPatchnotes || []).filter(function(n){ return n && n.champion && n.change; }).slice(0, 4);
    var patch = list[0] && list[0].patch;
    var head = '<h4>Что нового' + (patch ? ' <span class="pill-lbl">Патч ' + esc(patch) + '</span>' : '') +
      '<button type="button" class="go-all" data-act="changes">Все изменения →</button></h4>';
    if(!list.length) return '<div class="hub-card glass">' + head +
      '<div class="empty"><b>Патч-ноты ещё не приехали.</b><br>Лента изменений тянется из базы — как приедет, топ буфов и нерфов встанет сюда.</div></div>';
    return '<div class="hub-card glass">' + head + '<ul class="hc-news">' + list.map(function(n){
      var k = KIND_LBL[n.type] ? n.type : 'nerf';
      return '<li><a href="' + champHref(n.champion) + '"><b>' + esc(n.champion) + '</b> <span>' + esc(n.change) + '</span></a>' +
        '<span class="n-kind ' + k + '">' + KIND_LBL[k] + '</span></li>';
    }).join('') + '</ul></div>';
  }

  /* ════════════════════════════════════════════════════════════════
     ЛАУНЧЕР ИНСТРУМЕНТОВ. ★ Глифы ЛИНЕЙНЫЕ, не эмодзи (DESIGN.md: эмодзи
     рисуются шрифтом ОС — чужеродно). Стиль набора 1-в-1 из lab-ui-kit:
     24×24, stroke currentColor 1.9, круглые концы.
     ════════════════════════════════════════════════════════════════ */
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">', ESVG = '</svg>';
  var GLYPH = {
    champs: SVG + '<circle cx="9.2" cy="8" r="3.3"/><path d="M3.4 19.2 C3.4 15.5 6 13.7 9.2 13.7 C12.4 13.7 15 15.5 15 19.2"/><path d="M16.2 5.2 A3.3 3.3 0 0 1 16.2 10.8"/><path d="M17.6 14 C19.7 14.7 21 16.4 21 19.2"/>' + ESVG,
    calc:   SVG + '<rect x="4.5" y="2.8" width="15" height="18.4" rx="2.6"/><path d="M8 7.4 H16"/><path d="M8.6 12 H9.4 M11.6 12 H12.4 M14.6 12 H15.4 M8.6 16.4 H9.4 M11.6 16.4 H12.4 M14.6 16.4 H15.4"/>' + ESVG,
    items:  SVG + '<path d="M12 2.8 L20.6 7.4 V16.6 L12 21.2 L3.4 16.6 V7.4 Z"/><path d="M3.4 7.4 L12 12 L20.6 7.4"/><path d="M12 12 V21.2"/>' + ESVG,
    runes:  SVG + '<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6 V20.4"/><path d="M4.7 7.8 L19.3 16.2"/><path d="M4.7 16.2 L19.3 7.8"/>' + ESVG,
    draft:  SVG + '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.4"/><path d="M12 1.6 V5 M12 19 V22.4 M1.6 12 H5 M19 12 H22.4"/>' + ESVG,
    cup:    SVG + '<path d="M7 3.6 H17 V9.4 A5 5 0 0 1 7 9.4 Z"/><path d="M7 5.4 H4.3 A2.7 2.7 0 0 0 7 10.6"/><path d="M17 5.4 H19.7 A2.7 2.7 0 0 1 17 10.6"/><path d="M12 14.4 V17.8"/><path d="M8.4 20.4 H15.6"/>' + ESVG
  };
  var TOOLS = [
    ['champs', 'Чемпионы',    'sideChamps'],
    ['calc',   'Калькулятор', 'calc'],
    ['items',  'Предметы',    'items'],
    ['runes',  'Руны',        'runes'],
    ['draft',  'Драфтер',     'drafterHub'],
    ['cup',    'Турниры',     'cybersport']
  ];
  function toolsBlock(){
    return '<div class="hub-tools">' + TOOLS.map(function(t){
      return '<button type="button" class="hub-tool glass" data-tool="' + t[2] + '">' +
        '<span class="ti">' + GLYPH[t[0]] + '</span><span class="tn">' + t[1] + '</span></button>';
    }).join('') + '</div>';
  }

  /* ════════════════════════════════════════════════════════════════
     СБОРКА ВИДА. Каркас (шапка + бенто) — ОДИН раз; дальше только labMorph.
     ════════════════════════════════════════════════════════════════ */
  function snapText(){
    var d = String(window.WR_SNAPSHOT || '');
    var pretty = /^\d{8}$/.test(d) ? (d.slice(6,8)+'.'+d.slice(4,6)+'.'+d.slice(0,4)) : d;
    return pretty ? ('Снимок <b>' + esc(pretty) + '</b> · lolm.qq.com') : 'Данные Wild Rift · lolm.qq.com';
  }
  function pillsHTML(){
    return ranks().filter(function(r){ return hasData(r.id); })
      .map(function(r){ return '<button type="button" class="pill'+(r.id===_rank?' on':'')+'" data-r="'+esc(r.id)+'">'+esc(r.label)+'</button>'; }).join('');
  }
  function bentoHTML(){
    var c = ctx();
    if(!c) return '<div class="hub-card glass"><h4>Мета-хаб</h4>' +
      '<div class="empty"><b>Винрейты ещё загружаются.</b><br>Снимок приходит из data-pipeline/wr-stats.json — как приедет, хаб заполнится сам.</div></div>' +
      toolsBlock();
    return heroBlock(c.hero) + kpiBlock(c) + fanBlock(c.top5) +
      '<div class="hub-cards">' +
        topWrBlock(c.top5) + sTierBlock(c.sTier) + topRateBlock(c.topPr, 'pick') + topRateBlock(c.topBr, 'ban') +
        buildBlock(c.hero) + counterBlock(c.hero) + toursBlock() + newsBlock() +
      '</div>' +
      toolsBlock();
  }

  function paint(mount){
    var head = mount.querySelector('.hub-head');
    var bento = mount.querySelector('.bento');
    if(!head || !bento) return;
    labMorph(head, '<span class="hub-patch">' + snapText() + '</span><div class="pills">' + pillsHTML() + '</div>');
    labMorph(bento, bentoHTML());
    /* радары веера дозаполняются по готовности качеств (пустой бокс держит размер) */
    loadQualities().then(function(){
      bento.querySelectorAll('.mh-radar[data-radar]').forEach(function(el){
        if(!el.innerHTML.trim()) el.innerHTML = radarInner(el.getAttribute('data-radar'));
      });
    });
    var fan = bento.querySelector('.mh-fan-wrap.fresh');
    if(fan) setTimeout(function(){ fan.classList.remove('fresh'); }, 400);
    /* гайд лидера (сборка + контры) — как прочитается, перекрашиваем: labMorph
       тронет ТОЛЬКО эти две карточки, остальной хаб не шевельнётся */
    var c = ctx();
    if(c) ensureGuide(c.hero.name, function(){ paint(mount); });
  }

  window.renderMetaHub = function(mount){
    if(!mount) return;
    /* Каркас строим ОДИН раз. Повторный вызов (приехали данные) — только перекраска:
       узлы шапки и бенто переживают его, пересоздаётся лишь изменившееся. */
    if(!mount.querySelector('.f-hub')){
      mount.innerHTML = '<div class="f-hub"><header class="hub-head glass"></header><div class="bento"></div></div>';
      mount.addEventListener('click', function(e){
        var p = e.target.closest('.pill[data-r]');
        if(p && mount.contains(p)){
          if(p.dataset.r === _rank) return;
          _rank = p.dataset.r; paint(mount); return;
        }
        /* ЗАКОН СВЯЗЕЙ: инструмент → его раздел, «Все изменения» → лента изменений.
           Модалку открывает ЕЁ владелец (openChanges → openModal), не мы руками. */
        var t = e.target.closest('[data-tool]');
        if(t && mount.contains(t)){ if(window.sidebarOpen) window.sidebarOpen(t.dataset.tool); return; }
        var a = e.target.closest('[data-act="changes"]');
        if(a && mount.contains(a) && window.openChanges) window.openChanges();
      });
      /* имена чемпов таблицы приезжают асинхронно, а из них строится адрес страницы
         чемпа (ЗАКОН СВЯЗЕЙ) — как приедут, перекрашиваем: morph поправит только href */
      document.addEventListener('champsLoaded', function(){ if(mount.querySelector('.f-hub')) paint(mount); });
      /* патч-ноты приезжают из Firestore — «Что нового» обязано их подхватить */
      document.addEventListener('patchnotesLoaded', function(){ if(mount.querySelector('.f-hub')) paint(mount); });
    }
    paint(mount);
  };
})();

/* ════════════════════════════════════════════════════════════════
   Э1.4 · ТИР-ЛИСТ — ПЕРЕСБОРКА ИЗ lab-main (тир-мейкер).
   4 источника: Чемпионы · Предметы · Руны · Объекты (стихийные драконы).
   Старый вид (.f-tier/.tl-chip, один общий список без ролей) снесён целиком.

   ★ ЛАБ НЕПОЛНЫЙ — недостающее взято ИЗ БОЕВОГО, не выдумано:
   · под-листы по РОЛЯМ и по КАТЕГОРИЯМ (в лабе фильтр и 6 выдуманных типов
     предметов; в боевом — отдельные списки и 7 реальных категорий CMS) → боевое;
   · руны по категориям (в лабе их нет вовсе) → боевое;
   · авто-раскладка по WR + «Сброс к мете» (в лабе демо-тиры) → боевое;
   · перетаскивание на Sortable, а не нативный HTML5 drag лаба: нативный drag
     не работает на тач-экранах, Sortable уже подключён и умеет оба;
   · ХРАНЕНИЕ. Лаб пишет свои ключи `tm-<вид>|<подвид>`. На боевом это молча
     сломало бы синк: localStorage.setItem пропатчен (app.js ~4030) и сам шлёт
     в Firestore ТОЛЬКО перечисленные ключи. Поэтому пишем в ЕГО ключи
     (tierData / itemTierData / runeTierData / objectTierData) и в его схеме —
     облако работает даром, владелец один, рельсовый тир-лист видит те же данные.

   Из ЛАБА взято 1-в-1: раскладка (сетка + карточка справа + фуллскрин),
   ряды S+…D, палитра-пул, ОБЩИЙ ТАЙЛ (ховер-зум без мыла + WR-шторка).
   АНТИДЁРГАНЬЕ: drop перемещает ОДИН узел (Sortable), ряды и пул не пересобираются;
   смена вкладки/под-вкладки — labMorph, не innerHTML.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var TIERS = [['S+','s-plus'],['S','s'],['A','a'],['B','b'],['C','c'],['D','d']];
  var TIER_KEYS = TIERS.map(function(t){ return t[0]; });
  var TIER_ORD = {'S+':6,'S':5,'A':4,'B':3,'C':2,'D':1};
  /* роли = схема боевого хранилища (tierData): all/adc/mid/top/jungle/sup */
  var ROLES = [
    { k:'all',    t:'Все' },
    { k:'top',    t:'Топ' },
    { k:'jungle', t:'Лес' },
    { k:'mid',    t:'Мид' },
    { k:'adc',    t:'АДК' },
    { k:'sup',    t:'Сап' }
  ];
  var WR_ROLE = { top:'top', jungle:'jungle', mid:'mid', adc:'adc', sup:'support' };

  /* ── 4 ИСТОЧНИКА. Ключ хранения у каждого — ТОТ ЖЕ, что у рельсового
     тир-листа, поэтому облачный синк работает сам (setItem пропатчен). ── */
  var TABS = [
    { k:'champ',  t:'Чемпионы', store:'tierData' },
    { k:'item',   t:'Предметы', store:'itemTierData' },
    { k:'rune',   t:'Руны',     store:'runeTierData' },
    { k:'object', t:'Объекты',  store:'objectTierData' }
  ];

  /* Стихийные драконы — РЕАЛЬНЫЕ, из data-pipeline/jungle-economy.json
     (epicMonsters.elementalDragons.types). Читаем файл, не выдумываем. */
  var DRAGONS = null, _dragP = null;
  function loadDragons(){
    if(_dragP) return _dragP;
    /* ОДИН загрузчик jungle-economy.json на сайт (его же читает вид «Карта») —
       второй fetch того же файла = лишний запрос и второй владелец данных */
    _dragP = (window.loadJungleEconomy ? window.loadJungleEconomy()
              : fetch('data-pipeline/jungle-economy.json', { cache:'force-cache' }).then(function(r){ return r.ok ? r.json() : null; }))
      .then(function(j){
        var t = j && j.epicMonsters && j.epicMonsters.elementalDragons && j.epicMonsters.elementalDragons.types;
        /* имя тайла — короткое («Огненный»): на вкладке «Объекты» слово «дракон»
           у всех одинаковое и только съедает ширину, полное имя — в карточке */
        DRAGONS = t ? Object.keys(t).map(function(k){
          return { id:k, name:t[k].ru || k, buff:t[k].buff || '', rift:t[k].rift || '', sourced:!!t[k].sourced };
        }) : [];
        return DRAGONS;
      })
      .catch(function(){ DRAGONS = []; return DRAGONS; });
    return _dragP;
  }
  /* Линейные глифы стихий (эмодзи каноном запрещены, DESIGN.md).
     Стиль набора 1-в-1 из lab-ui-kit: 24×24, stroke currentColor 1.9. */
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">', ESVG = '</svg>';
  var DRAG_GLYPH = {
    infernal: SVG + '<path d="M12 2.8 C13.6 7 17.4 8.2 17.4 13 A5.4 5.4 0 0 1 6.6 13 C6.6 10.6 8 9.4 9 8.2 C9.6 10 10.6 10.6 11.2 10.6 C12 10.6 11 7 12 2.8 Z"/>' + ESVG,
    mountain: SVG + '<path d="M2.6 19.4 L9 7.6 L13 14.4 L15.4 10.4 L21.4 19.4 Z"/><path d="M7.4 10.4 L10.6 10.4"/>' + ESVG,
    ocean:    SVG + '<path d="M2.6 9.4 C5 6.6 7.4 6.6 9.8 9.4 C12.2 12.2 14.6 12.2 17 9.4 C18.6 7.6 20 7 21.4 7.8"/><path d="M2.6 15.4 C5 12.6 7.4 12.6 9.8 15.4 C12.2 18.2 14.6 18.2 17 15.4 C18.6 13.6 20 13 21.4 13.8"/>' + ESVG,
    cloud:    SVG + '<path d="M7.4 18 A4.4 4.4 0 0 1 7.8 9.2 A5.6 5.6 0 0 1 18 10.4 A3.8 3.8 0 0 1 17.4 18 Z"/>' + ESVG
  };

  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var icon = function(n){ return window._champIcon ? window._champIcon(n) : ''; };
  var href = function(n){ return window.champPageHref ? window.champPageHref(n) : 'champions/'; };
  function wrCls(v){ return v>=52 ? 'wr-g' : (v<49 ? 'wr-b' : 'wr-n'); }

  /* ── ДАННЫЕ: реальный ростер из WR_DATA (снимок wr-stats.json) ── */
  function champsOf(role){
    var rd = window.WR_DATA || {};
    var rank = (rd['все'] && hasAny(rd['все'])) ? 'все' : (rd['чалик'] ? 'чалик' : Object.keys(rd)[0]);
    var pool = rd[rank] || {};
    var roles = role === 'all' ? ['top','jungle','mid','adc','support'] : [WR_ROLE[role]];
    var best = {};
    roles.forEach(function(ro){
      (pool[ro]||[]).forEach(function(c){
        if(!c || !c.name || isNaN(+c.wr)) return;
        var tier = (c.tier && TIER_ORD[c.tier]) ? c.tier : tierFromWr(+c.wr);
        if(!best[c.name] || TIER_ORD[tier] > TIER_ORD[best[c.name].tier])
          best[c.name] = { kind:'champ', id:c.name, name:c.name, wr:+c.wr, pr:+c.pr||0, br:+c.br||0, tier:tier, role:ro };
      });
    });
    return Object.keys(best).map(function(n){ return best[n]; }).sort(function(a,b){ return a.name.localeCompare(b.name); });
  }
  function hasAny(r){ return ['top','jungle','mid','adc','support'].some(function(ro){ return (r[ro]||[]).length; }); }
  /* фолбэк, когда в снимке нет поля tier — раскидываем по винрейту (поведение боевого) */
  function tierFromWr(wr){ return wr>=53?'S+':wr>=51.5?'S':wr>=50?'A':wr>=48.5?'B':wr>=47?'C':'D'; }

  /* ── ЕДИНЫЙ СПИСОК СУЩНОСТЕЙ вкладки. Предметы и руны берём у их владельца
     (window.TierSources → getItemsByCat/getRunesByCat, реестр CMS/Firestore),
     свой дубль реестра не заводим. ── */
  function subsOf(tab){
    var S = window.TierSources;
    if(tab === 'champ') return ROLES;
    if(tab === 'item')  return (S && S.itemCats || []).map(function(c){ return { k:c.k, t:c.l }; });
    if(tab === 'rune')  return (S && S.runeCats || []).map(function(c){ return { k:c.k, t:c.l }; });
    return [];
  }
  function entriesOf(tab, sub){
    var S = window.TierSources;
    if(tab === 'champ') return champsOf(sub);
    if(tab === 'item')  return ((S && S.items() || {})[sub] || []).map(function(o){ return { kind:'item', id:o.name, name:o.name, img:o.img }; });
    if(tab === 'rune')  return ((S && S.runes() || {})[sub] || []).map(function(o){ return { kind:'rune', id:o.name, name:o.name, img:o.img }; });
    return (DRAGONS || []).map(function(d){ return { kind:'object', id:d.id, name:d.name, buff:d.buff, rift:d.rift, sourced:d.sourced }; });
  }
  function storeKey(tab){ return (TABS.filter(function(x){ return x.k === tab; })[0] || TABS[0]).store; }

  /* ── ХРАНИЛИЩЕ: схема и ключи рельсового тир-листа → синк в Firestore даром ── */
  function readStore(tab){
    try { return JSON.parse(localStorage.getItem(storeKey(tab)) || '{}') || {}; } catch(e){ return {}; }
  }
  function writeStore(tab, all){
    try { localStorage.setItem(storeKey(tab), JSON.stringify(all)); } catch(e){}
  }
  function emptyList(){ var o={}; TIER_KEYS.forEach(function(k){ o[k]=[]; }); return o; }
  /* авто-раскладка по WR — только у чемпов (тиры есть в снимке).
     У предметов/рун/объектов «правильного» тира не существует — начинаем с пула,
     чтобы не выдумывать за игрока. */
  function autoPlace(tab, sub){
    var o = emptyList();
    if(tab !== 'champ') return o;
    entriesOf(tab, sub).forEach(function(e){ o[e.tier].push(e.id); });
    return o;
  }
  function placement(tab, sub, roster){
    var saved = readStore(tab)[sub];
    var alive = {};
    roster.forEach(function(e){ alive[e.id] = 1; });
    var any = saved && TIER_KEYS.some(function(k){ return (saved[k]||[]).length; });
    if(!any) return autoPlace(tab, sub);
    var out = emptyList(), seen = {};
    TIER_KEYS.forEach(function(k){
      (saved[k]||[]).forEach(function(id){ if(alive[id] && !seen[id]){ seen[id]=1; out[k].push(id); } });
    });
    return out;                      /* неразмещённые сами окажутся в пуле */
  }
  function poolOf(roster, place){
    var placed = {};
    TIER_KEYS.forEach(function(k){ (place[k]||[]).forEach(function(id){ placed[id]=1; }); });
    return roster.filter(function(e){ return !placed[e.id]; });
  }

  var _tab = 'champ', _sub = 'all', _full = false, _sel = null;
  var _byId = {};                    /* id → сущность текущего под-листа */

  /* ── ОБЩИЙ ТАЙЛ (порт 1-в-1): крупный источник, покой .88 → ховер 1.0 (зум без
     мыла), у чемпа снизу выезжает WR-шторка. Тайл ПЕРЕТАСКИВАЕТСЯ — не пикер-чип. ── */
  function tileHTML(id){
    var d = _byId[id];
    if(!d) return '';
    var inner, extra = '';
    if(d.kind === 'champ'){
      inner = '<img class="tile-img" src="' + icon(d.name) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
      extra = '<span class="tile-shade"><b class="' + wrCls(d.wr) + '">' + d.wr.toFixed(1) + '%</b></span>';
    } else if(d.kind === 'object'){
      inner = '<span class="tile-glyph">' + (DRAG_GLYPH[d.id] || '') + '</span>';
    } else {
      inner = '<img class="tile-img tile-img-flat" src="' + esc(d.img || '') + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
    }
    return '<div class="tile tile-' + d.kind + (id === _sel ? ' on' : '') + '" data-tid="' + esc(id) + '" title="' + esc(d.name) + '">' +
      '<span class="tile-lift">' + inner + extra + '</span>' +
      '<span class="tile-n">' + esc(d.name) + '</span></div>';
  }

  function boardHTML(){
    var roster = entriesOf(_tab, _sub);
    _byId = {};
    roster.forEach(function(e){ _byId[e.id] = e; });
    var place = placement(_tab, _sub, roster);
    var pool = poolOf(roster, place);

    var rows = TIERS.map(function(t){
      return '<div class="tm-row"><span class="tm-badge" style="background:var(--tier-' + t[1] + ')">' + t[0] + '</span>' +
        '<div class="tm-lane" data-zone="' + t[0] + '">' + (place[t[0]]||[]).map(tileHTML).join('') + '</div></div>';
    }).join('');

    var tabs = '<div class="tm-tabs glass">' + TABS.map(function(x){
      return '<button type="button" class="tm-tab' + (x.k===_tab ? ' on' : '') + '" data-tab="' + x.k + '">' + x.t + '</button>';
    }).join('') + '</div>';

    var subs = subsOf(_tab);
    var subsHTML = subs.length ? '<div class="tm-subs glass">' + subs.map(function(s){
      return '<button type="button" class="tm-sub' + (s.k===_sub ? ' on' : '') + '" data-sub="' + esc(s.k) + '">' + esc(s.t) + '</button>';
    }).join('') + '</div>' : '';

    var bar = '<div class="tm-bar">' + tabs +
      '<div class="tm-actions">' +
        '<button type="button" class="tm-btn" data-act="share">Поделиться</button>' +
        '<button type="button" class="tm-btn" data-act="reset">' + (_tab === 'champ' ? 'Сброс к мете' : 'Сброс') + '</button>' +
        '<button type="button" class="tm-btn" data-act="full">' + (_full ? 'Свернуть' : 'Во весь экран') + '</button>' +
      '</div></div>';

    var body = roster.length
      ? '<div class="tm-grid glass">' + rows + '</div>' + subsHTML +
        '<div class="tm-pool glass"><div class="tm-pool-h">Палитра · тащи в тир · ' + pool.length + ' шт.</div>' +
        '<div class="tm-pool-grid" data-zone="pool">' + pool.map(function(e){ return tileHTML(e.id); }).join('') + '</div></div>'
      : subsHTML + '<div class="tm-pool glass"><div class="empty">' + emptyText() + '</div></div>';

    return '<div class="tm-wrap' + (_full ? ' tm-full' : '') + '">' +
      '<div class="tm-main">' + bar + body + '</div>' +
      '<aside class="tm-side glass">' + sideHTML() + '</aside>' +
    '</div>';
  }
  function emptyText(){
    if(_tab === 'champ')  return '<b>Винрейты ещё загружаются.</b><br>Ростер строится из снимка wr-stats.json — как приедет, доска заполнится сама.';
    if(_tab === 'object') return '<b>Данные объектов ещё читаются.</b><br>Источник — data-pipeline/jungle-economy.json.';
    return '<b>Реестр ещё не загрузился.</b><br>Предметы и руны приходят из базы сайта — открой раздел и вернись, либо подожди загрузку.';
  }

  /* карточка справа: реальные данные + связь (ЗАКОН СВЯЗЕЙ) */
  function sideHTML(){
    var d = _sel && _byId[_sel];
    var collapse = '<button type="button" class="tm-side-collapse" data-act="full" title="Свернуть карточку — тир на весь экран">›</button>';
    if(!d) return collapse + '<div class="tm-side-empty">Клик по любому тайлу — карточка встанет сюда. Свернёшь — тир на весь экран.</div>';
    if(d.kind === 'champ'){
      return collapse + '<div class="tmc">' +
        '<img class="tmc-ava" src="' + icon(d.name) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="tmc-name">' + esc(d.name) + '</div>' +
        '<div class="tmc-sub"><span class="tier" data-t="' + esc(d.tier) + '">' + esc(d.tier) + '</span> · ' + roleRu(d.role) + '</div>' +
        '<div class="tmc-kpi"><b class="' + wrCls(d.wr) + '">' + d.wr.toFixed(1) + '%</b> WR · ' + d.pr.toFixed(1) + '% PR · ' + d.br.toFixed(1) + '% BR</div>' +
        '<a class="tm-btn tmc-open" href="' + href(d.name) + '">Открыть страницу чемпа →</a>' +
      '</div>';
    }
    if(d.kind === 'object'){
      return collapse + '<div class="tmc">' +
        '<span class="tmc-glyph">' + (DRAG_GLYPH[d.id] || '') + '</span>' +
        '<div class="tmc-name">' + esc(d.name) + ' дракон</div>' +
        '<div class="tmc-kpi">' + esc(d.buff) + (d.sourced ? '' : ' <span class="demo">не сверено</span>') + '</div>' +
        (d.rift ? '<div class="tmc-pass">Ущелье: ' + esc(d.rift) + '</div>' : '') +
      '</div>';
    }
    var isItem = d.kind === 'item';
    return collapse + '<div class="tmc">' +
      '<img class="tmc-ava tmc-ava-flat" src="' + esc(d.img || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="tmc-name">' + esc(d.name) + '</div>' +
      '<button type="button" class="tm-btn tmc-open" data-open="' + (isItem ? 'item' : 'rune') + '" data-name="' + esc(d.name) + '">' +
        (isItem ? 'Открыть карточку предмета →' : 'Открыть карточку руны →') + '</button>' +
    '</div>';
  }
  function roleRu(r){ return { top:'Топ', jungle:'Лес', mid:'Мид', adc:'АДК', support:'Сап' }[r] || r; }

  /* снимок размещения ИЗ DOM после drop — узлы живут, ничего не пересобираем */
  function snapshot(host){
    var o = emptyList();
    host.querySelectorAll('.tm-lane[data-zone]').forEach(function(z){
      o[z.getAttribute('data-zone')] = [].map.call(z.querySelectorAll('.tile'), function(t){ return t.getAttribute('data-tid'); });
    });
    var all = readStore(_tab);
    all[_sub] = o;
    writeStore(_tab, all);           /* ← отсюда патченный setItem сам шлёт в Firestore */
    var h = host.querySelector('.tm-pool-h');
    if(h) h.textContent = 'Палитра · тащи в тир · ' + host.querySelectorAll('.tm-pool-grid .tile').length + ' шт.';
  }

  /* ЗАКОН СВЯЗЕЙ для предмета/руны: открываем раздел-владелец и его же карточку
     (через его UI — значит через openModal, матрёшка цела). Своей модалки не заводим. */
  function openEntity(kind, name){
    if(window.sidebarOpen) window.sidebarOpen(kind === 'item' ? 'items' : 'runes');
    setTimeout(function(){
      var sel = kind === 'item' ? '#itemsMask .item-card' : '.rune-card';
      var hit = [].slice.call(document.querySelectorAll(sel)).filter(function(c){
        return String(c.getAttribute('data-tip')||'').split('\xa6')[0].trim() === name;
      })[0];
      if(hit) hit.click();
    }, 260);
  }

  function wire(host){
    /* DnD: Sortable переставляет ОДИН узел между зонами (боевое, работает и на тач) */
    if(window.Sortable){
      host.querySelectorAll('[data-zone]').forEach(function(z){
        if(z._sortable) return;
        z._sortable = new window.Sortable(z, {
          group:'tier', animation:90, ghostClass:'tm-ghost', chosenClass:'tm-chosen', dragClass:'tm-drag',
          forceFallback:true, fallbackOnBody:true,
          onEnd:function(){ snapshot(host); }
        });
      });
    }
    host.querySelectorAll('.tm-tab[data-tab]').forEach(function(b){
      b.onclick = function(){
        if(b.dataset.tab === _tab) return;
        _tab = b.dataset.tab; _sel = null;
        var subs = subsOf(_tab);
        _sub = subs.length ? subs[0].k : 'all';
        if(_tab === 'object' && !DRAGONS){ loadDragons().then(function(){ paint(host); }); }
        paint(host);
      };
    });
    host.querySelectorAll('.tm-sub[data-sub]').forEach(function(b){
      b.onclick = function(){ if(b.dataset.sub === _sub) return; _sub = b.dataset.sub; _sel = null; paint(host); };
    });
    host.querySelectorAll('[data-act="full"]').forEach(function(b){
      b.onclick = function(){ _full = !_full; paint(host); };
    });
    var rs = host.querySelector('[data-act="reset"]');
    if(rs) rs.onclick = function(){ var all = readStore(_tab); delete all[_sub]; writeStore(_tab, all); paint(host); };
    var sh = host.querySelector('[data-act="share"]');
    if(sh) sh.onclick = function(){ share(host, sh); };
    /* клик по тайлу — только карточка справа; перетаскивание тайл не теряет */
    host.querySelectorAll('.tile[data-tid]').forEach(function(t){
      t.onclick = function(){
        _sel = t.getAttribute('data-tid');
        host.querySelectorAll('.tile.on').forEach(function(x){ x.classList.remove('on'); });
        t.classList.add('on');
        var side = host.querySelector('.tm-side');
        if(side){ labMorph(side, sideHTML()); wireSide(host, side); }
      };
    });
    wireSide(host, host.querySelector('.tm-side'));
  }
  function wireSide(host, side){
    if(!side) return;
    side.querySelectorAll('[data-act="full"]').forEach(function(b){ b.onclick = function(){ _full = !_full; paint(host); }; });
    var op = side.querySelector('[data-open]');
    if(op) op.onclick = function(){ openEntity(op.getAttribute('data-open'), op.getAttribute('data-name')); };
  }

  function share(host, btn){
    var tabT = (TABS.filter(function(x){ return x.k===_tab; })[0]||{}).t || '';
    var subT = (subsOf(_tab).filter(function(s){ return s.k===_sub; })[0]||{}).t || '';
    var lines = TIERS.map(function(t){
      var ids = [].map.call(host.querySelectorAll('.tm-lane[data-zone="' + t[0] + '"] .tile'), function(x){
        var d = _byId[x.getAttribute('data-tid')]; return d ? d.name : '';
      }).filter(Boolean);
      return t[0] + ': ' + (ids.length ? ids.join(', ') : '—');
    });
    var text = 'Тир-лист · ' + tabT + (subT ? ' · ' + subT : '') + '\n' + lines.join('\n');
    var done = function(){ var o = btn.textContent; btn.textContent = 'Скопировано'; setTimeout(function(){ btn.textContent = o; }, 1400); };
    if(navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }

  /* host = .f-tier (его же передаёт wire) — не контейнер вида: иначе действия
     полосы молча становились no-op, доска не перерисовывалась. */
  function paint(host){
    if(!host) return;
    labMorph(host, boardHTML());
    /* Sortable висит на самом узле зоны. Пережил morph — флаг _sortable при нём,
       wire() его пропустит; узел создан заново — флага нет, подключим. */
    wire(host);
  }

  window.renderTierBoard = function(mount){
    if(!mount) return;
    if(!mount.querySelector('.f-tier')) mount.innerHTML = '<div class="f-tier"></div>';
    paint(mount.querySelector('.f-tier'));
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   ★ Э1.8 · ВИД «КАРТА» — [Карта (экономика)] · [Страта (тактич-доска)]

   ПОРТ из lab-map/map-lab.js (лаб = источник правды), НЕ рескин старого.
   Что изменилось при переносе (принудительная канонизация):
     · дев-полоса лаба выброшена — варианты зафиксированы в дефолт
       (объекты=точка · панель=справа · ползунок=fill);
     · эмодзи-иконки → линейные глифы 24×24 (стиль lab-ui-kit);
     · ДЕМО-плейсхолдер карты → РЕАЛЬНЫЙ арт ущелья + позиции объектов
       выверены по арту (решение владельца 2026-08-21);
     · добавлены Герольд и Старший дракон (данные лежали, лаб их не показывал);
     · добавлена полоса ЗОЛОТА снизу (MASTERPLAN Э2: «цена/голда снизу,
       меняется ползунком»);
     · ЗАКОН СВЯЗЕЙ: у каждого объекта есть выход в соседнюю фичу.

   НЕ ТАЩИТЬ ДЁРГАНЬЕ:
     п.1/п.3 — у под-вкладок НЕТ анимации появления (постоянные блоки);
     п.4 — никаких принудительных перезапусков анимации на контейнере;
     п.5 — тик ползунка меняет ТОЛЬКО изменившиеся числа (живые узлы держим
           в ссылках), панель целиком не пересобирается.
   Приёмка счётчиком узлов: window.MAP_AUDIT() в консоли.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── ДАННЫЕ: реальные, data-pipeline/jungle-economy.json. ОДИН загрузчик на сайт
     (тир-лист «Объекты» берёт стихии драконов отсюда же — второй fetch не нужен) ── */
  var _ecoP = null;
  window.loadJungleEconomy = function(){
    if(_ecoP) return _ecoP;
    _ecoP = fetch('data-pipeline/jungle-economy.json', { cache:'force-cache' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; });
    return _ecoP;
  };

  var DATA = null;

  /* ── ЛИНЕЙНЫЕ ГЛИФЫ по КАТЕГОРИИ объекта (эмодзи каноном запрещены, DESIGN.md).
     Категория, а не «иконка на каждого монстра»: в кружке 28px узнаётся только
     простая форма, а зоопарк мелких картинок = шум. ── */
  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">', ES = '</svg>';
  var GLYPH = {
    epic:   S + '<path d="M12 3.2 L19.4 6.4 V12 C19.4 16.4 16.2 19.4 12 20.8 C7.8 19.4 4.6 16.4 4.6 12 V6.4 Z"/><path d="M12 9.2 V14"/>' + ES,
    dragon: S + '<path d="M12 2.8 C13.6 7 17.4 8.2 17.4 13 A5.4 5.4 0 0 1 6.6 13 C6.6 10.6 8 9.4 9 8.2 C9.6 10 10.6 10.6 11.2 10.6 C12 10.6 11 7 12 2.8 Z"/>' + ES,
    buff:   S + '<path d="M12 3 L13.8 9.4 L20.2 11.2 L13.8 13 L12 19.4 L10.2 13 L3.8 11.2 L10.2 9.4 Z"/>' + ES,
    camp:   S + '<path d="M12 3.6 L16.8 11.2 H13.8 L17.8 17.4 H6.2 L10.2 11.2 H7.2 Z"/><path d="M12 17.4 V20.6"/>' + ES,
    river:  S + '<path d="M2.6 9.4 C5 6.6 7.4 6.6 9.8 9.4 C12.2 12.2 14.6 12.2 17 9.4 C18.6 7.6 20 7 21.4 7.8"/><path d="M2.6 15.4 C5 12.6 7.4 12.6 9.8 15.4 C12.2 18.2 14.6 18.2 17 15.4 C18.6 13.6 20 13 21.4 13.8"/>' + ES,
    lane:   S + '<path d="M4.6 12 H17.4"/><path d="M13 7.6 L17.4 12 L13 16.4"/>' + ES,
    gold:   S + '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6 V16.4"/><path d="M14.4 9.8 A2.6 2.6 0 0 0 9.6 11 C9.6 13.8 14.4 12.4 14.4 15 A2.6 2.6 0 0 1 9.6 14.2"/>' + ES
  };

  /* ── ОБЪЕКТЫ НА КАРТЕ.
     x/y — проценты, ВЫВЕРЕНЫ ПО АРТУ (tactics-board/assets/map-square.webp:
     синяя база снизу-слева, красная сверху-справа, ров Барона слева-сверху,
     ров Дракона справа-снизу). Это ориентир по картинке, не координаты из игры —
     честно сказано плашкой на карте. Данные объектов — реальные. ── */
  var OBJECTS = [
    { id:'baron',    ru:'Барон Нашор',      g:'epic',   cls:'o-epic', x:33, y:30, cat:'epic',    get:function(d){ return d.epicMonsters.baronNashor; } },
    { id:'herald',   ru:'Предвестник Рифта',g:'epic',   cls:'o-epic', x:25, y:22, cat:'epic',    get:function(d){ return d.epicMonsters.riftHerald; } },
    { id:'dragon',   ru:'Стихийный дракон', g:'dragon', cls:'o-epic', x:66, y:71, cat:'dragon',  get:function(d){ return d.epicMonsters.elementalDragons; } },
    { id:'elder',    ru:'Старший дракон',   g:'dragon', cls:'o-epic', x:74, y:79, cat:'elder',   get:function(d){ return d.epicMonsters.elderDragon; } },
    { id:'blue',     ru:'Синий страж',      g:'buff',   cls:'o-blue', x:24, y:52, cat:'camp',    get:function(d){ return d.jungleCamps.blueSentinel; } },
    { id:'red',      ru:'Красный шипоспин', g:'buff',   cls:'o-red',  x:57, y:86, cat:'camp',    get:function(d){ return d.jungleCamps.redBrambleback; } },
    { id:'gromp',    ru:'Громп',            g:'camp',   cls:'',       x:18, y:66, cat:'camp',    get:function(d){ return d.jungleCamps.gromp; } },
    { id:'wolves',   ru:'Волки',            g:'camp',   cls:'',       x:31, y:67, cat:'camp',    get:function(d){ return d.jungleCamps.murkWolves; } },
    { id:'raptors',  ru:'Крылатые',         g:'camp',   cls:'',       x:46, y:82, cat:'camp',    get:function(d){ return d.jungleCamps.raptors; } },
    { id:'scuttleT', ru:'Скатл (ров Барона)',g:'river', cls:'',       x:42, y:40, cat:'camp',    get:function(d){ return d.jungleCamps.scuttleCrab; } },
    { id:'scuttleB', ru:'Скатл (ров Дракона)',g:'river',cls:'',       x:59, y:60, cat:'camp',    get:function(d){ return d.jungleCamps.scuttleCrab; } },
    { id:'laneT',    ru:'Линия Барона',     g:'lane',   cls:'o-lane', x:9,  y:15, cat:'minions', get:function(d){ return d.minions; } },
    { id:'laneM',    ru:'Центр',            g:'lane',   cls:'o-lane', x:50, y:50, cat:'minions', get:function(d){ return d.minions; } },
    { id:'laneB',    ru:'Линия Дракона',    g:'lane',   cls:'o-lane', x:91, y:87, cat:'minions', get:function(d){ return d.minions; } }
  ];

  /* полоса золота снизу: что показываем и откуда берём */
  var GOLDBAR = [
    { id:'blue',    l:'Синий бафф',  get:function(d){ return d.jungleCamps.blueSentinel; } },
    { id:'red',     l:'Красный бафф',get:function(d){ return d.jungleCamps.redBrambleback; } },
    { id:'gromp',   l:'Громп',       get:function(d){ return d.jungleCamps.gromp; } },
    { id:'wolves',  l:'Волки',       get:function(d){ return d.jungleCamps.murkWolves; } },
    { id:'raptors', l:'Крылатые',    get:function(d){ return d.jungleCamps.raptors; } },
    { id:'scuttle', l:'Скатл',       get:function(d){ return d.jungleCamps.scuttleCrab; } },
    { id:'dragon',  l:'Дракон',      get:function(d){ return d.epicMonsters.elementalDragons; } },
    { id:'herald',  l:'Герольд',     get:function(d){ return d.epicMonsters.riftHerald; } },
    { id:'baron',   l:'Барон',       get:function(d){ return d.epicMonsters.baronNashor; } }
  ];

  var selectedId = null;
  /* ЖИВЫЕ УЗЛЫ: тик ползунка трогает только их (никаких innerHTML на контейнер) */
  var live = { goldN:null, goldTag:null, minLabel:null, deathN:null, slider:null, gold:{} };
  var root = null;

  function fmtTime(s){ return (s == null) ? '—' : (Math.floor(s/60) + ':' + String(s%60).padStart(2,'0')); }
  function pickPatch(obj, key){
    var bp = obj[key + '_byPatch'];
    if(bp) return { v: (bp.p6 != null ? bp.p6 : bp.older), note: bp.note };
    return { v: obj[key], note: null };
  }
  /* золото на текущей минуте (у баффов оно растёт ступенями) */
  function goldAt(node, minute){
    var g = node && node.gold;
    if(!g) return { text:'—', demo:false, live:false };
    if(Array.isArray(g.scaling)){
      var val = g.scaling[0].gold;
      for(var i=0;i<g.scaling.length;i++) if(minute >= g.scaling[i].atMinute) val = g.scaling[i].gold;
      return { text:String(val), demo:!!g.demo, live:true };
    }
    if(g.individual != null){
      return { text: (g.team != null ? (g.individual + ' / ' + g.team + ' команде') : String(g.individual)), demo:!!g.demo, live:false };
    }
    var v = (g.value != null ? g.value : g.total);
    return { text: (v != null ? String(v) : '—'), demo:!!g.demo, live:false };
  }
  /* дез-таймер — ДЕМО-модель (Riot формулу WR не публикует, см. _meta.unresolved) */
  function deathTimer(minute){
    var dt = DATA.scaling.deathTimer;
    var lvl = Math.max(1, Math.min(dt.maxLevel, Math.floor(minute * 0.6) + 1));
    var base = dt.approxTableDemo[0].baseRespawn_s;
    for(var i=0;i<dt.approxTableDemo.length;i++) if(lvl >= dt.approxTableDemo[i].level) base = dt.approxTableDemo[i].baseRespawn_s;
    var lateMul = minute > 15 ? 1 + (minute - 15) * 0.08 : 1;
    return { sec: Math.round(base * lateMul), lvl: lvl };
  }
  function minuteNow(){ return live.slider ? +live.slider.value : 0; }
  function demoTag(on){ return on ? ' <span class="demo">демо</span>' : ''; }
  function row(l, v){ return '<div class="d-row"><span class="r-l">' + l + '</span><span class="r-v">' + v + '</span></div>'; }

  /* ── РАЗМЕТКА вида (строится ОДИН раз при первом заходе) ── */
  function shell(){
    return '' +
    '<div class="mapv">' +
      '<nav class="mapv-tabs glass" role="tablist">' +
        '<button class="subtab active" data-mtab="eco" role="tab">Карта<span class="subtab-note">экономика</span></button>' +
        '<button class="subtab" data-mtab="strata" role="tab">Страта<span class="subtab-note">доска</span></button>' +
      '</nav>' +
      '<div class="mapv-main">' +
        '<section class="tabpane map-layout active" data-mtab="eco">' +
          '<div class="timebar glass">' +
            '<div class="tb-slider">' +
              '<div class="tb-top"><span>Минута игры</span><span class="tb-min" data-role="minLabel">0:00</span></div>' +
              '<input type="range" class="minSlider" data-role="slider" min="0" max="30" step="1" value="0" aria-label="Минута игры">' +
              '<div class="tb-ticks"><span>0</span><span>10</span><span>20</span><span>30</span></div>' +
            '</div>' +
            '<div class="tb-death">' +
              '<div class="tb-death-n" data-role="deathN">6с</div>' +
              '<div class="tb-death-l">Дез-таймер <span class="demo soft">демо</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="map-stage glass">' +
            '<div class="map-frame">' +
              '<img class="map-art" src="tactics-board/assets/map-square.webp" alt="Карта ущелья Wild Rift" draggable="false">' +
              '<span class="demo soft map-note">позиции — ориентир по арту</span>' +
              '<div data-role="objLayer"></div>' +
            '</div>' +
          '</div>' +
          '<aside class="detail glass">' +
            '<div class="d-empty" data-role="empty">Кликни объект на карте — кэмп, дракон, Барон или линию.<br><br>Золото и дез-таймер пересчитываются ползунком минуты.</div>' +
            '<div data-role="body" hidden></div>' +
          '</aside>' +
          '<div class="goldbar glass">' +
            '<span class="gb-title">Золото на минуте</span>' +
            '<div class="gb-items" data-role="goldItems"></div>' +
          '</div>' +
        '</section>' +
        '<section class="tabpane strata-layout" data-mtab="strata" data-strata-host></section>' +
      '</div>' +
    '</div>';
  }

  /* ── объекты на карте: строятся ОДИН раз, дальше только класс .sel ── */
  function buildObjects(layer){
    var frag = document.createDocumentFragment();
    OBJECTS.forEach(function(o){
      var b = document.createElement('button');
      b.className = 'obj ' + o.cls;
      b.style.left = o.x + '%';
      b.style.top = o.y + '%';
      b.dataset.id = o.id;
      b.title = o.ru;
      var dot = document.createElement('span');
      dot.className = 'dot';
      dot.innerHTML = GLYPH[o.g];
      var lbl = document.createElement('span');
      lbl.className = 'obj-lbl';
      lbl.textContent = o.ru;
      b.appendChild(dot); b.appendChild(lbl);
      b.addEventListener('click', function(){ selectObject(o.id); });
      frag.appendChild(b);
    });
    layer.appendChild(frag);
  }

  function selectObject(id){
    if(selectedId === id) return;
    selectedId = id;
    root.querySelectorAll('.obj').forEach(function(el){ el.classList.toggle('sel', el.dataset.id === id); });
    renderDetail();
  }

  /* ── полоса золота снизу: строится один раз, тик меняет ТОЛЬКО числа ── */
  function buildGoldbar(host){
    var frag = document.createDocumentFragment();
    GOLDBAR.forEach(function(it){
      var box = document.createElement('div');
      box.className = 'gb-item';
      var n = document.createElement('div');
      n.className = 'gb-n';
      n.textContent = '—';
      var l = document.createElement('div');
      l.className = 'gb-l';
      l.textContent = it.l;
      box.appendChild(n); box.appendChild(l);
      frag.appendChild(box);
      live.gold[it.id] = n;
    });
    /* волна миньонов — все per-type числа для 7.x не подтверждены → демо */
    var wbox = document.createElement('div');
    wbox.className = 'gb-item';
    var wn = document.createElement('div');
    wn.className = 'gb-n';
    wn.textContent = '—';
    var wl = document.createElement('div');
    wl.className = 'gb-l';
    wl.innerHTML = 'Волна миньонов <span class="demo">демо</span>';
    wbox.appendChild(wn); wbox.appendChild(wl);
    frag.appendChild(wbox);
    live.gold._wave = wn;
    host.appendChild(frag);
  }

  /* ЗАКОН СВЯЗЕЙ: у объекта есть выход в соседнюю фичу, а не тупик */
  function linkFor(o){
    if(o.cat === 'dragon' || o.cat === 'elder')
      return '<button class="d-link" data-go="tier">Стихии драконов в Тир-листе →</button>';
    if(o.cat === 'minions')
      return '<button class="d-link" data-go="strata">Разобрать волну на доске →</button>';
    return '<button class="d-link" data-go="strata">Спланировать заход на доске →</button>';
  }

  /* ПОЛНАЯ сборка панели — только при СМЕНЕ объекта, не на каждый тик ползунка */
  function renderDetail(){
    var empty = root.querySelector('[data-role="empty"]');
    var body = root.querySelector('[data-role="body"]');
    live.goldN = live.goldTag = null;
    if(!selectedId || !DATA){ empty.hidden = false; body.hidden = true; return; }

    var o = null;
    for(var i=0;i<OBJECTS.length;i++) if(OBJECTS[i].id === selectedId) o = OBJECTS[i];
    var node = o.get(DATA);
    var minute = minuteNow();
    var html = '<div class="d-head"><span class="d-ico">' + GLYPH[o.g] + '</span><h2>' + (node.ru || o.ru) + '</h2></div>';

    if(o.cat === 'minions'){
      var t = node.types;
      html += '<div class="d-sub">Волна: ' + node.wave.baseComposition.melee + '× ближних + ' +
              node.wave.baseComposition.caster + '× дальних, осадный по каденции · интервал ~' + node.wave.interval_s + 'с</div>' +
        '<div class="d-rows">' +
          row('Ближний (воин)' + demoTag(t.melee.gold.demo), t.melee.gold.value + ' зол.') +
          row('Дальний (маг)' + demoTag(t.caster.gold.demo), t.caster.gold.value + ' зол.') +
          row('Осадный (пушка)' + demoTag(t.siege.gold.demo), t.siege.gold.value + ' зол.') +
          row('Супер-миньон' + demoTag(t.super.gold.demo), t.super.gold.value + ' зол.') +
        '</div>' +
        '<div class="d-buff">Осадный дорожает с минутой игры; точные per-type числа для 7.x не подтверждены — сверить вручную.</div>';
    } else {
      var g = goldAt(node, minute);
      var respawn = pickPatch(node, 'respawn_s');
      var spawn = pickPatch(node, 'spawn_s');
      var goldTag = g.demo ? '<span class="demo">демо</span>'
                           : (g.live ? '<span class="demo soft" data-role="goldTag">' + minute + ' мин</span>' : '');
      html += '<div class="d-kpis">' +
          '<div class="d-kpi"><div class="k-n ' + (g.live ? 'live' : '') + '" data-role="goldN">' + g.text + '</div><div class="k-l">золото ' + goldTag + '</div></div>' +
          '<div class="d-kpi"><div class="k-n">' + fmtTime(respawn.v) + '</div><div class="k-l">респаун</div></div>' +
        '</div>';
      var rows = row('Спаун (первый)', fmtTime(spawn.v));
      if(node.xp) rows += row('Опыт' + demoTag(node.xp.demo), node.xp.value != null ? node.xp.value : '—');
      if(node.hp) rows += row('Здоровье', node.hp);
      if(node.hp_leader) rows += row('Здоровье (главный)', node.hp_leader);
      if(o.cat === 'dragon'){
        rows += row('Слой', 'Dragon Slayer (со 2-го дракона)');
        rows += row('Старший дракон', 'с 19:00');
      }
      html += '<div class="d-rows">' + rows + '</div>';
      if(node.units && node.units.length){
        html += '<div class="d-buff"><b>Состав:</b> ' + node.units.map(function(u){ return u.name + ' — ' + u.gold; }).join(' · ') + ' зол.</div>';
      }
      if(node.buff){
        var bf = node.buff;
        if(typeof bf === 'string') html += '<div class="d-buff"><b>Бафф:</b> ' + bf + '</div>';
        else html += '<div class="d-buff"><b>Бафф:</b> ' + (bf.name ? bf.name + ' — ' : '') + (bf.effect || '') + (bf.duration_s ? ' (' + fmtTime(bf.duration_s) + ')' : '') + '</div>';
      }
      if(node.effect) html += '<div class="d-buff"><b>Эффект:</b> ' + node.effect + '</div>';
      if(o.cat === 'dragon'){
        var ty = node.types;
        html += '<div class="d-buff"><b>Стихии:</b> ' + Object.keys(ty).map(function(k){
          return ty[k].ru + ' — ' + ty[k].buff + (ty[k].demo ? ' (демо)' : '');
        }).join('; ') + '.</div>';
      }
      if(spawn.note || respawn.note) html += '<div class="d-buff">Патчи: ' + (spawn.note || respawn.note) + '</div>';
    }
    html += linkFor(o);

    body.innerHTML = html;
    empty.hidden = true;
    body.hidden = false;
    live.goldN = body.querySelector('[data-role="goldN"]');
    live.goldTag = body.querySelector('[data-role="goldTag"]');
  }

  /* ── ТИК ПОЛЗУНКА: обновляем ТОЛЬКО изменившиеся числа. Никакого re-render ── */
  function updateTime(){
    var minute = +live.slider.value;
    live.slider.style.setProperty('--p', (minute - live.slider.min) / (live.slider.max - live.slider.min) * 100);
    live.minLabel.textContent = minute + ':00';
    if(!DATA) return;
    live.deathN.textContent = deathTimer(minute).sec + 'с';

    GOLDBAR.forEach(function(it){
      var el = live.gold[it.id]; if(!el) return;
      var txt = goldAt(it.get(DATA), minute).text;
      if(el.textContent !== txt) el.textContent = txt;
    });
    if(live.gold._wave){
      var ty = DATA.minions.types;
      var w = ty.melee.gold.value * DATA.minions.wave.baseComposition.melee +
              ty.caster.gold.value * DATA.minions.wave.baseComposition.caster;
      if(live.gold._wave.textContent !== String(w)) live.gold._wave.textContent = String(w);
    }
    if(selectedId && live.goldN){
      var o = null;
      for(var i=0;i<OBJECTS.length;i++) if(OBJECTS[i].id === selectedId) o = OBJECTS[i];
      if(o && o.cat !== 'minions'){
        var g = goldAt(o.get(DATA), minute);
        if(live.goldN.textContent !== g.text) live.goldN.textContent = g.text;
        if(live.goldTag) live.goldTag.textContent = minute + ' мин';
      }
    }
  }

  /* ── под-вкладки [Карта][Страта]: ИНЛАЙН, ленивые, БЕЗ анимации появления ── */
  var _strataLoading = false;
  function openStrata(host){
    if(host.dataset.mounted) return;
    if(window.mountStrata){ host.dataset.mounted = '1'; window.mountStrata(host); return; }
    if(_strataLoading) return;
    _strataLoading = true;
    host.innerHTML = '<div class="view-stub">Загружаю доску…</div>';
    /* Редактор раскладки нужен только доске → грузим ВМЕСТЕ с ней, а не на старте сайта.
       LE_KEY_PREFIX НЕ трогаем: он читается один раз при загрузке модуля, и свой
       префикс тут отобрал бы черновики у админского «Редактора позиций». */
    if(!document.getElementById('leCss')){
      var css = document.createElement('link');
      css.id = 'leCss'; css.rel = 'stylesheet'; css.href = 'layout-editor.css';
      document.head.appendChild(css);
    }
    window._lazyScript('layout-editor.js')
      .catch(function(){})                       /* без редактора доска всё равно работает */
      .then(function(){ return window._lazyScript('strata-board.js'); })
      .then(function(){
        _strataLoading = false;
        if(window.mountStrata){ host.innerHTML = ''; host.dataset.mounted = '1'; window.mountStrata(host); }
      })
      .catch(function(e){
        _strataLoading = false;
        host.innerHTML = '<div class="view-stub">Не удалось загрузить тактическую доску.</div>';
        console.warn('[Страта]', e);
      });
  }

  function switchTab(tab){
    root.querySelectorAll('.subtab').forEach(function(b){ b.classList.toggle('active', b.dataset.mtab === tab); });
    root.querySelectorAll('.tabpane').forEach(function(p){ p.classList.toggle('active', p.dataset.mtab === tab); });
    if(tab === 'strata') openStrata(root.querySelector('[data-strata-host]'));
  }
  /* открыть Страту снаружи (ссылки ЗАКОНА СВЯЗЕЙ ведут сюда) */
  window.openStrata = function(){ if(root) switchTab('strata'); };

  /* ── ПРИЁМКА СЧЁТЧИКОМ УЗЛОВ: пометить всё → дёрнуть ползунок → сколько выжило ── */
  window.MAP_AUDIT = function(){
    if(!root) return 'вид «Карта» ещё не построен';
    var pane = root.querySelector('.map-layout');
    var before = Array.prototype.slice.call(pane.querySelectorAll('*'));
    before.forEach(function(n){ n.__keep = true; });
    var old = +live.slider.value;
    live.slider.value = old >= +live.slider.max ? old - 1 : old + 1;
    live.slider.dispatchEvent(new Event('input'));
    var after = Array.prototype.slice.call(pane.querySelectorAll('*'));
    var survived = after.filter(function(n){ return n.__keep; }).length;
    var msg = survived + '/' + before.length + ' узлов пережили тик ползунка';
    console.log('[Карта] ПРИЁМКА:', msg, '| было', before.length, '→ стало', after.length);
    return msg;
  };

  /* ── СТАРТ вида ── */
  window.renderMapView = function(mount){
    if(!mount) return;
    mount.innerHTML = shell();
    root = mount.querySelector('.mapv');

    live.slider = root.querySelector('[data-role="slider"]');
    live.minLabel = root.querySelector('[data-role="minLabel"]');
    live.deathN = root.querySelector('[data-role="deathN"]');

    root.querySelectorAll('.subtab').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(!btn.classList.contains('active')) switchTab(btn.dataset.mtab);
      });
    });
    live.slider.addEventListener('input', updateTime);
    root.addEventListener('click', function(e){
      var go = e.target.closest('[data-go]');
      if(!go) return;
      if(go.dataset.go === 'tier' && window.switchMainView) window.switchMainView('tier');
      else if(go.dataset.go === 'strata') switchTab('strata');
    });

    buildGoldbar(root.querySelector('[data-role="goldItems"]'));
    updateTime();                       /* заливка трека сразу, до данных */

    window.loadJungleEconomy().then(function(j){
      if(!j){
        root.querySelector('[data-role="empty"]').textContent =
          'Не удалось загрузить jungle-economy.json — данные карты недоступны.';
        return;
      }
      DATA = j;
      buildObjects(root.querySelector('[data-role="objLayer"]'));
      updateTime();
    });
  };
})();
