// ═══════════════════════════════════════════
// Wild Rift Stats — Main Application Logic
// ═══════════════════════════════════════════

(() => {

    // =========================================
    // MODAL SYSTEM - stacking (parent stays visible, child opens on top)
    // =========================================
    const MODAL_IDS = ['mMask','calcMask','itemsMask','runesMask',
        'tierlistMask','sideChampsMask','champDetailMask','itemSubModal','itemDetailModal','runeDetailModal','itemCalcMenuMask','draftMask','champPickerModal','welcomeOverlay','influencerMask','chatSystemMask','tierlistMenuMask','profileSetupMask','userCardMask'];

    // Стек открытых модалок (порядок: первая = нижняя, последняя = верхняя)
    var _modalStack = [];
    var _baseZIndex = 6000;

    // Модалки которые ВСЕГДА открываются поверх (не закрывая родителя)
    var OVERLAY_MODALS = ['champDetailMask','itemDetailModal','runeDetailModal','itemSubModal','champPickerModal','influencerMask','tierlistMask','profileSetupMask','userCardMask'];

    function closeAllModals(except) {
        MODAL_IDS.forEach(function(id) {
            if(id === except) return;
            var el = document.getElementById(id);
            if(!el) return;
            el.classList.remove('active');
            el.style.display = '';
            el.style.zIndex = '';
        });
        _modalStack = [];
        if(!except) document.body.classList.remove('modal-open');
    }

    function openModal(id) {
        // Скрываем тултипы
        ['itemTooltip','runeTooltip','uiTip'].forEach(function(tid){
            var t=document.getElementById(tid); if(t) t.style.display='none';
        });

        // Если это overlay-модалка и уже есть активная — стекаем поверх
        var isOverlay = OVERLAY_MODALS.includes(id);
        var hasParent = _modalStack.length > 0;

        if(isOverlay && hasParent) {
            // Стекаем: родитель остаётся видимым, новая поверх
            // Убираем id из стека если уже есть (перемещаем наверх)
            _modalStack = _modalStack.filter(function(m){ return m !== id; });
            _modalStack.push(id);
        } else {
            // Основная модалка — закрываем все предыдущие
            closeAllModals(id);
            _modalStack = [id];
        }

        // Расставляем z-index по стеку
        _modalStack.forEach(function(mid, idx) {
            var mel = document.getElementById(mid);
            if(mel) {
                mel.classList.add('active');
                mel.style.zIndex = String(_baseZIndex + (idx * 100));
                mel.style.visibility = '';
            }
        });

        document.body.classList.add('modal-open');
    }
    window.openModal = openModal;

    function closeModal(id) {
        var el = document.getElementById(id);
        if(el) {
            el.classList.remove('active');
            el.style.display = '';
            el.style.zIndex = '';
            el.style.visibility = '';
        }

        // Убираем из стека
        _modalStack = _modalStack.filter(function(m){ return m !== id; });

        // Если стек не пуст — убеждаемся что верхняя модалка видна
        if(_modalStack.length > 0) {
            var topId = _modalStack[_modalStack.length - 1];
            var topEl = document.getElementById(topId);
            if(topEl) {
                topEl.classList.add('active');
                topEl.style.visibility = '';
            }
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
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
    // 🔄 ЛИСТ 2: Патч-ноты (бафф/нерф кружочки на иконках)
    // Столбцы: Champion | Patch | Change | Type (buff или nerf)
    // Чтобы поменять: File → Share → Publish to web → выбери Лист 2 → TSV
    // ═══════════════════════════════════════════════════════════════
    const PATCH_URL = window.PATCH_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnqVwUluQiuho1Wj6A3tZRvDJsLlyAZYmg0soWy4EJ_Un00P8e3Y2EAo3Iv6KvMm5HPwce_0AnzPfb/pub?gid=1129379769&single=true&output=tsv';


    // Map champion names to Data Dragon keys
    // Map champion names to Data Dragon keys (WR shortened names supported)
    function champKey(n) {
        const m = {
            'Aurelion Sol':'AurelionSol','Dr. Mundo':'DrMundo','Jarvan IV':'JarvanIV',
            'Lee Sin':'LeeSin','Master Yi':'MasterYi','Miss Fortune':'MissFortune',
            'Twisted Fate':'TwistedFate','Xin Zhao':'XinZhao','Nunu & Willump':'Nunu',
            "Cho'Gath":'Chogath',"Vel'Koz":'Velkoz',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Kog'Maw":'KogMaw',
            "Rek'Sai":'RekSai','Tahm Kench':'TahmKench','Wukong':'MonkeyKing',
            // Shortened WR names
            'M.Fortune':'MissFortune','Tw. Fate':'TwistedFate','Au. Sol':'AurelionSol',
            'Jarvan':'JarvanIV','XinZhao':'XinZhao','KhaZix':'Khazix','KogMaw':'KogMaw',
            'KaiSa':'Kaisa','Morde':'Mordekaiser','Seraph':'Seraphine',
            'Fiddle':'Fiddlesticks','Fiddles':'Fiddlesticks','FiddleSticks':'Fiddlesticks','Fiddlesticks':'Fiddlesticks','Trynda':'Tryndamere','Trynd':'Tryndamere','Trinda':'Tryndamere','Heimer':'Heimerdinger',
            'Mundo':'DrMundo','Nunu':'Nunu',
        };
        return m[n] || n.replace(/[\s\'\.\#&]/g,'');
    }
    const DD_URL = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
    var _sp={'Norra':'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/norra.png','Mel':'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Mel_0.jpg'};
    function champIcon(name){ return _sp[name] || (DD_URL + champKey(name) + '.png'); }
    // Fallback URLs for WR-exclusive champs
    var _spFallback = {
        'Norra':['https://www.wildriftfire.com/images/champions/norra.png','https://cdn.communitydragon.org/latest/champion/norra/square','https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Norra.png'],
        'Mel':['https://www.wildriftfire.com/images/champions/mel.png']
    };
    function champImgError(img, name) {
        if(!img._fallbackIdx) img._fallbackIdx = 0;
        var fb = _spFallback[name];
        if(fb && img._fallbackIdx < fb.length) {
            img.src = fb[img._fallbackIdx++];
        } else {
            img.style.cssText = 'width:100%;aspect-ratio:1;background:linear-gradient(135deg,rgba(109,63,245,0.4),rgba(185,111,255,0.2));border-radius:8px;display:block;';
            img.alt = name;
        }
    }

    let raw = [];
    let patchMap = {};

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
    } // {champName: {patch, change, type}}
    let selected = new Set();
    let pinned = new Set();
    let lvl = 10;
    let sK = 'ad';

    
    let sD = 'desc';
    let colFocus = true; // always show column focus


    const roleIcons = {
        Top: 'data:image/jpeg;base64,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',
        Jungle: 'data:image/jpeg;base64,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',
        Mid: 'data:image/jpeg;base64,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HueUtdOjEE4xTftx9a09U00QOcqeayvso9P0rgur6HoW1Y86gSOKltXknYEDJJwBUMdnucADg8V0+g6IZpEAQ7sjHFDa6g9VY6HwT4fk1C7XeNqJyzHoK+e/27/2iDo+lQeD9DuXiuJlOyS3lUNBGGG5275OCqnjkMQQVGffPil8QLL4T+A79/me4jtpLiUQ4LhUUsQoJAJwD1Ir8j/E/iK98XeIdQ1nUZPMvL6ZppOWIXJ4VdxJCgYAGeAAK9bLMIq1X281ojyMdX5I+zj1MyiiivsT58KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvur9h39oRLrTv+EG1u4LXEK/6KZT/rIh0GfVehH93GM84+Fau6HrV74c1e01PTp2tr21kEsUqHBDD+nYjuDXNiKEcRTdORtSqujNSR+v3iLRFZiycqRkVxk9iytjFP8AgL8XbP4w+AbC/ZlF6FEdxGGBKMMB1Pcc889iPWutv9DfzCQuVbpXwc6UqE3GZ9ZRqqoro5rTNM8yQEqSQeK7m3mtvC+kyX9yVUopKg927VDpmlLaje/GBkZ6H1r5Y/bM/aCbR9M/4RvRrmSK+ugQk9vMqvCgK7nYcsCeVUgD+IhgVwdcPh5YqaitjLEVo0ot9Txj9rP44XPjjxJeeHoGP2a3nVrqZZciR1HEYAOMKT8wbncoGBt5+d6KK+7pUo0YKEeh8rObqS5mFFFFakBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAek/An4yX3wd8Yw30ckj6VcEJe2yH7y9mA9V6+/I46j9WPAHiTTPG2iWt7bXMc1tcRCaGVWBV1IB6++RX4vV9Jfss/tHR/DW0vtA12bGkiOS4tnY48tgCzIPUnGVHckgZJArycfg/rEeaO534XEOi7PY+sv2mfjvZfC3wtI0RaW7mPlwQRkgszA45xgD5WJJ/u9D0P5l+IPEF/4o1efVNUuPtV9Pt8ybYqbtqhRwoA6Adq6L4sfEu/8Ain4wutYu3lFuW221vIwIiT6AYyTyfwGSAK42t8HhlhqaXUxr1XVm2FFFFd5zBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//2Q==',
        ADC: 'data:image/jpeg;base64,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',
        Support: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAEkASIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD80qKKK7TnCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiu18A/Bzxb8TbW6ufD2kzX8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p57a2EsrYZSDXa+H/CPmp9pu3W1tlG5pZDhVFT+Jb7w78MbE32uXsKSA4MO7kdue1fLnxc/afvvFzSWWmk2+nqSEji+Ufie/4VvSpyruyWnciVRQ6nsvxW/aY0n4fae+m+HAJbtjta6AyxPsD0r488XeO9T8ZXslzfSu7ycne5Y1hXl5LqF1JcTtvlc5J/Soa9mjh4UVpucU5ub1CiiiuozCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACul8G/EDV/BN2s+n3UsZXlVVyBXNUVMoqStJDN3xh401bx1qrX+r3clzL0RWYkIPb+prCooppKKshBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z'
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

        let t;
        try {
            console.log('Fetching champions from:', G_URL);
            // Fetch both in parallel
            var promises = [fetch(G_URL).then(function(r){ return r.text(); })];
            if(PATCH_URL) promises.push(fetch(PATCH_URL).then(function(r){ return r.text(); }));
            var results = await Promise.all(promises);
            t = results[0];
            console.log('Data received, length:', t.length);
            if(t.trim().startsWith('<!') || t.trim().startsWith('<html')) {
                throw new Error('Google Sheet вернул HTML вместо TSV — лист не опубликован!');
            }
            // Parse patch data if available
            if(results[1]) {
                try {
                    var pt = results[1];
                    if(!pt.trim().startsWith('<!')) {
                        var pLines = pt.trim().split('\n');
                        var pHeads = pLines[0].split('\t').map(function(h){ return h.trim(); });
                        pLines.slice(1).forEach(function(line) {
                            var cols = line.split('\t');
                            var obj = {};
                            pHeads.forEach(function(h, i) { obj[h] = (cols[i]||'').trim(); });
                            if(obj['Champion'] && obj['Type']) {
                                var pType = (obj['Type']||'').toLowerCase().trim();
                                if(pType === 'buff' || pType === 'nerf') {
                                    patchMap[obj['Champion']] = {
                                        patch: obj['Patch'] || '',
                                        change: obj['Change'] || '',
                                        type: pType
                                    };
                                }
                            }
                        });
                        console.log('Patch data loaded:', Object.keys(patchMap).length, 'champions');
                    }
                } catch(pe) { console.warn('Patch parse error:', pe); }
            }
        } catch(fetchErr) {
            console.error('Fetch failed:', fetchErr);
            const skEl = document.getElementById('skeletonOverlay');
            if(skEl) skEl.style.display = 'none';
            document.getElementById('statTable').style.visibility = 'visible';
            document.getElementById('statBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Ошибка: ' + (fetchErr.message || 'Не удалось загрузить данные') + '</td></tr>';
            return;
        }

        const lines = t.trim().split('\n');
        const heads = lines[0].split('\t').map(h => h.trim());
        
        raw = lines.slice(1).map(l => {
            const c = l.split('\t');
            const o = {};
            heads.forEach((h, i) => o[h] = c[i]?.trim());
            return {
                name: o["Champion"],
                ad_b: +o["AD_Base"], ad_g: +o["AD_Growth"],
                hp_b: +o["HP_Base"], hp_g: +o["HP_Growth"],
                mn_b: +o["Mana_Base"], mn_g: +o["Mana_Growth"],
                ar_b: +o["Armor_Base"], ar_g: +o["Armor_Growth"],
                mr_b: +o["MR_Base"], mr_g: +o["MR_Growth"],
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
        // Hide skeleton, show real table
        const skEl2 = document.getElementById('skeletonOverlay');
        if(skEl2) skEl2.style.display = 'none';
        document.getElementById('statTable').style.visibility = 'visible';
    }

    function createRuler() {
        const ruler = document.getElementById('ruler');
        for(let i = 1; i <= 15; i++) {
            const span = document.createElement('span');
            span.innerText = i;
            span.id = 'lvl-' + i;
            span.classList.add('lvl-pill');
            span.setAttribute('role','button');
            span.tabIndex = 0;
            span.onclick = () => {
                lvl = i;
                const rng = document.getElementById('lvlRange');
                if(rng) rng.value = String(i);
                document.getElementById('lvlLabel').innerText = i;
                updateRuler();
                renderUpdate();
            };
            span.onkeydown = (e) => {
                if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); span.click(); }
            };
            if(i === lvl) span.classList.add('active');
            ruler.appendChild(span);
        }
    }

    function updateRuler() {
        for(let i = 1; i <= 15; i++) {
            const el = document.getElementById('lvl-' + i);
            if(el) el.classList.toggle('active', i === lvl);
        }
    }

    // Compute data array for current level + sort
    function computeData() {
        const f = (b, g) => b + (lvl - 1) * g;
        const data = raw.filter(x => selected.has(x.name)).map(x => ({
            name: x.name, res: x.res,
            ad:   f(x.ad_b, x.ad_g),
            hp:   f(x.hp_b, x.hp_g),
            mana: f(x.mn_b, x.mn_g),
            armor:f(x.ar_b, x.ar_g),
            mrez: f(x.mr_b, x.mr_g),
            g: {ad:x.ad_g, hp:x.hp_g, mana:x.mn_g, armor:x.ar_g, mrez:x.mr_g}
        })).sort((a,b) => {
            var aTop = _movedToTop.has(a.name) || pinned.has(a.name) ? 1 : 0;
            var bTop = _movedToTop.has(b.name) || pinned.has(b.name) ? 1 : 0;
            if(aTop !== bTop) return bTop - aTop;
            return sD === 'desc' ? b[sK] - a[sK] : a[sK] - b[sK];
        });
        const getT = (k) => {
            const s = data.map(i => i[k]).sort((a,b) => a-b);
            return { s: s[Math.floor(s.length*0.95)], a: s[Math.floor(s.length*0.8)], c: s[Math.floor(s.length*0.2)] };
        };
        const thres = { ad:getT('ad'), hp:getT('hp'), mana:getT('mana'), armor:getT('armor'), mrez:getT('mrez') };
        return { data, thres };
    }

    // Global patch tooltip function
    window.showGlobalPatchTip = function(e, pInfo, el) {
        e.stopPropagation();
        var old = document.getElementById('patchTip');
        if(old) old.remove();
        var tip = document.createElement('div');
        tip.id = 'patchTip';
        tip.className = 'patch-tooltip';
        var typeLabel = pInfo.type === 'buff' ? '🟢 БАФФ' : '🔴 НЕРФ';
        tip.innerHTML = '<div style="font-weight:900;margin-bottom:4px;">' + typeLabel + ' <span style="color:rgba(255,255,255,0.4);font-weight:600;">Патч ' + pInfo.patch + '</span></div><div style="font-size:11px;line-height:1.4;color:rgba(255,255,255,0.8);">' + pInfo.change + '</div>';
        var rect = el.getBoundingClientRect();
        tip.style.top = (rect.bottom + 6) + 'px';
        tip.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 260)) + 'px';
        document.body.appendChild(tip);
        setTimeout(function() {
            document.addEventListener('click', function rm() { var t=document.getElementById('patchTip'); if(t) t.remove(); document.removeEventListener('click', rm); }, {once:true});
        }, 50);
    };

    // FAST UPDATE — only rewrites numbers + tier classes, no DOM rebuild
    // Called on level slider change
    function renderUpdate() {
        const table = document.getElementById('statTable');
        table.classList.toggle('focus-mode', colFocus);
        ['ad','hp','mana','armor','mrez'].forEach(k => {
            var el = document.getElementById('ar-'+k);
            el.innerText = (k===sK) ? (sD==='desc'?'▼':'▲') : '';
            el.style.color = (k===sK) ? '#e74c3c' : '';
        });
        const { data, thres } = computeData();
        const rows = document.querySelectorAll('#statBody tr');
        // If row count changed (e.g. champion removed) — fall back to full render
        if(rows.length !== data.length) { renderFull(); return; }
        data.forEach((item, idx) => {
            const tr = rows[idx];
            // update row-num
            const numEl = tr.querySelector('.row-num');
            if(numEl) numEl.textContent = idx + 1;
            // update stat tds (skip first td = champ cell)
            const tds = tr.querySelectorAll('td:not(:first-child)');
            ['ad','hp','mana','armor','mrez'].forEach((k, ki) => {
                const td = tds[ki];
                if(!td) return;
                const v = item[k];
                let cls = (k===sK) ? 'active-col ' : '';
                if(v >= thres[k].s) cls += 's';
                else if(v >= thres[k].a) cls += 'a';
                else if(v <= thres[k].c) cls += 'c';
                else cls += 'b';
                td.className = cls;
                let txt = Math.round(v);
                if(k==='mana' && item.res==='Energy') txt = 'NRG';
                else if(k==='mana' && v===0) txt = '0';
                td.textContent = txt;
            });
        });

    }

    // FULL RENDER — rebuilds DOM from scratch
    // Called on champion add/remove, sort change, pin change
    function renderFull() {
        const body = document.getElementById('statBody');
        const table = document.getElementById('statTable');
        table.classList.toggle('focus-mode', colFocus);
        ['ad','hp','mana','armor','mrez'].forEach(k => {
            var el = document.getElementById('ar-'+k);
            el.innerText = (k===sK) ? (sD==='desc'?'▼':'▲') : '';
            el.style.color = (k===sK) ? '#e74c3c' : '';
        });
        const { data, thres } = computeData();
        body.innerHTML = '';
        data.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const isP = pinned.has(item.name) || _movedToTop.has(item.name);
            tr.addEventListener('click', () => {
                tr.classList.add('row-flash');
                setTimeout(() => tr.classList.remove('row-flash'), 400);
            });
            const tdChamp = document.createElement('td');
            tdChamp.className = 'champ-cell';
            const numSpan = document.createElement('span');
            numSpan.className = 'row-num';
            numSpan.textContent = idx + 1;
            tdChamp.appendChild(numSpan);
            const btnX = document.createElement('button');
            btnX.className = 'x-btn'; btnX.type = 'button'; btnX.textContent = '×';
            btnX.title = 'Remove from table';
            btnX.addEventListener('click', (ev) => { ev.stopPropagation(); removeC(item.name); });
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name-tag ' + (isP ? 'pinned' : '');
            nameSpan.textContent = item.name;
            nameSpan.addEventListener('click', (ev) => { ev.stopPropagation(); moveToTop(item.name); });
            // Double-click → open growth chart

            const champImg = document.createElement('img');
            champImg.alt = ''; champImg.className = 'champ-icon';
            champImg.src = champIcon(item.name);
            champImg.onerror = function(){ champImgError(this, item.name); };
            champImg.style.cursor = 'pointer';
            champImg.title = isP ? 'Закреплён (нажми чтобы снять)' : 'Нажми чтобы закрепить';
            if(isP) champImg.classList.add('icon-pinned');
            champImg.addEventListener('click', (ev) => { ev.stopPropagation(); moveToTop(item.name); });

            // Patch indicator
            const pInfo = patchMap[item.name];
            const champWrap = document.createElement('div');
            champWrap.style.cssText = 'position:relative;display:inline-block;flex-shrink:0;';
            champWrap.appendChild(champImg);
            if(pInfo) {
                const dot = document.createElement('div');
                dot.className = 'patch-dot ' + pInfo.type;
                dot.dataset.patch = pInfo.patch;
                dot.dataset.change = pInfo.change;
                dot.dataset.type = pInfo.type;
                champWrap.appendChild(dot);
                (function(pi, el){
                    el.addEventListener('mouseenter', function(e){ showGlobalPatchTip(e, pi, el); });
                    el.addEventListener('mouseleave', function(){ var t=document.getElementById('patchTip'); if(t) t.remove(); });
                    el.addEventListener('click', function(e){ showGlobalPatchTip(e, pi, el); });
                })(pInfo, champWrap);
            }
            tdChamp.appendChild(btnX); tdChamp.appendChild(champWrap); tdChamp.appendChild(nameSpan);
            tr.appendChild(tdChamp);
            ['ad','hp','mana','armor','mrez'].forEach(k => {
                const v = item[k];
                let cls = (k===sK) ? 'active-col ' : '';
                if(v >= thres[k].s) cls += 's';
                else if(v >= thres[k].a) cls += 'a';
                else if(v <= thres[k].c) cls += 'c';
                else cls += 'b';
                let txt = Math.round(v);
                if(k==='mana' && item.res==='Energy') txt = 'NRG';
                else if(k==='mana' && v===0) txt = '0';
                const td = document.createElement('td');
                td.className = cls; td.textContent = txt;
                td.addEventListener('mouseenter', (ev) => showT(ev, item.g[k]));
                td.addEventListener('mousemove', moveT);
                td.addEventListener('mouseleave', hideT);
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    // render() = full rebuild (used everywhere except level slider)
    function render() { renderFull(); }

    
    // Remove champion from table (only from selection, NOT from data)
    function drawM() {
        const grid = document.getElementById('mGrid');
        const qRaw = (document.getElementById('mSearch').value || '');
        const q = qRaw.trim().toLowerCase();
        grid.innerHTML = "";

        const roles = ["Top","Jungle","Mid","ADC","Support"];

        roles.forEach(role => {
            const allChampsInRole = raw.filter(x => x.is[role]);
            const champs = (q
                ? allChampsInRole.filter(x => x.name.toLowerCase().includes(q))
                : allChampsInRole
            ).slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

            if (q && champs.length === 0) return;

            const container = document.createElement('div');
            container.className = 'm-role-container';

            const isAll = allChampsInRole.length > 0 && allChampsInRole.every(x => selected.has(x.name));
            const roleDiv = document.createElement('div');
            roleDiv.className = 'm-role ' + (isAll ? 'on' : '');
            roleDiv.innerHTML = '<img src="' + roleIcons[role] + '" alt="' + role + '">';
            roleDiv.onclick = () => roleT(role, isAll);
            container.appendChild(roleDiv);

            // 2-column inner grid
            const champGrid = document.createElement('div');
            champGrid.className = 'm-role-champs';

            champs.forEach(c => {
                const btn = document.createElement('div');
                const isOn = selected.has(c.name);
                btn.className = 'm-item ' + (isOn ? 'on' : '');

                const mImg = document.createElement('img');
                mImg.src = champIcon(c.name);
                mImg.alt = c.name;
                mImg.title = c.name;
                mImg.onerror = function(){ this.style.background='rgba(109,63,245,0.3)'; this.src=''; };

                const nm = document.createElement('div');
                nm.style.cssText = 'font-size:7px;color:'+(isOn?'#fff':'rgba(255,255,255,0.45)')+';text-align:center;line-height:1.1;width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
                nm.textContent = c.name;

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
                btn.appendChild(mImg);
                btn.appendChild(nm);

                btn.onclick = () => {
                    if(selected.has(c.name)) selected.delete(c.name);
                    else selected.add(c.name);
                    try { localStorage.setItem('sel', JSON.stringify([...selected])); } catch(e) {}
                    drawM();
                    render();
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
            empty.innerText = 'Ничего не найдено';
            grid.appendChild(empty);
        }
    }
    // v26: expose drawM for inline handlers & mobile IME
    window.drawM = drawM;


    function roleT(r, isAll) {
        raw.filter(x => x.is[r]).forEach(x => isAll ? selected.delete(x.name) : selected.add(x.name));
        drawM(); 
        render();
    }

    function initApp() {
        document.getElementById('lvlRange').oninput = (e) => {
            lvl = +e.target.value;
            const lbl = document.getElementById('lvlLabel');
            lbl.textContent = lvl;
            /* animation removed */
            updateRuler();
            renderUpdate();
        };
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








    window.openItemDetail = function(name, cost, stats, desc, imgSrc) {
        var modal = document.getElementById('itemDetailModal');
        var box   = document.getElementById('itemDetailContent');
        if(!modal || !box) return;
        box.innerHTML = '';

        // Header: icon + name + cost
        var hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:16px;';
        if(imgSrc) {
            var img = document.createElement('img');
            img.src = imgSrc; img.style.cssText = 'width:64px;height:64px;border-radius:10px;flex-shrink:0;';
            img.onerror = function(){ this.style.display='none'; };
            hdr.appendChild(img);
        }
        var nameCol = document.createElement('div');
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:20px;font-weight:900;color:#fff;margin-bottom:6px;';
        nameEl.textContent = name;
        var costEl = document.createElement('span');
        costEl.style.cssText = 'background:rgba(201,168,0,0.18);border:1px solid rgba(201,168,0,0.5);color:#FFD700;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;';
        costEl.textContent = cost;
        nameCol.appendChild(nameEl); nameCol.appendChild(costEl);
        hdr.appendChild(nameCol); box.appendChild(hdr);

        // Stats block
        if(stats) {
            var statsBox = document.createElement('div');
            statsBox.style.cssText = 'margin-bottom:14px;background:rgba(255,255,255,0.03);border-radius:10px;padding:4px 10px;';
            stats.split('  |  ').filter(Boolean).forEach(function(s) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);';
                row.innerHTML = '<span style="color:#7ec8e3;font-weight:700;font-size:14px;">' + s.trim() + '</span>';
                statsBox.appendChild(row);
            });
            box.appendChild(statsBox);
        }

        // Description block
        if(desc) {
            var descBox = document.createElement('div');
            desc.split('\n').filter(Boolean).forEach(function(line) {
                var m = line.match(/^([^:]+?):\s*(.+)/);
                var el = document.createElement('div');
                el.style.marginBottom = '10px';
                if(m) {
                    el.innerHTML = '<div style="color:#b96fff;font-weight:800;font-size:13px;margin-bottom:3px;">' + m[1] + '</div>'
                                 + '<div style="color:rgba(255,255,255,0.82);font-size:13px;line-height:1.65;">' + m[2] + '</div>';
                } else {
                    el.style.cssText = 'color:rgba(255,255,255,0.7);font-size:13px;line-height:1.65;margin-bottom:8px;';
                    el.textContent = line;
                }
                descBox.appendChild(el);
            });
            box.appendChild(descBox);
        }

        openModal('itemDetailModal');
    };

    
    window.closeItemDetail = function() {
        closeModal('itemDetailModal');
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
                    var imgSrc = card.querySelector('img') ? card.querySelector('img').src : '';
                    openItemDetail(parts[0]||'', parts[1]||'', parts[2]||'', parts[3]||'', imgSrc);
                });
            });
        }, 80);
    };

    // WELCOME
    window.closeWelcome = function() {
        closeModal('welcomeOverlay');
    };
    // Показываем приветствие каждый раз при открытии сайта
    (function() {
        setTimeout(function() { openModal('welcomeOverlay'); }, 400);
    })();

    // SIDEBAR
    window.toggleSidebar = function() {
        var panel = document.getElementById('sidePanel');
        var overlay = document.getElementById('sideOverlay');
        if(!panel) return;
        var isOpen = panel.classList.contains('open');
        if(!isOpen) {
            // Opening: save scroll position
            document.body.dataset.scrollY = window.scrollY;
            document.body.style.top = '-' + window.scrollY + 'px';
        }
        panel.classList.toggle('open', !isOpen);
        if(overlay) overlay.classList.toggle('open', !isOpen);
        document.body.classList.toggle('sidebar-open', !isOpen);
        if(isOpen) {
            // Closing: restore scroll position
            var scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
            document.body.style.top = '';
            window.scrollTo(0, scrollY);
        }
    };
    window.closeSidebar = function() {
        var panel = document.getElementById('sidePanel');
        var overlay = document.getElementById('sideOverlay');
        if(panel) panel.classList.remove('open');
        if(overlay) overlay.classList.remove('open');
        var wasOpen = document.body.classList.contains('sidebar-open');
        document.body.classList.remove('sidebar-open');
        if(wasOpen) {
            var scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
            document.body.style.top = '';
            window.scrollTo(0, scrollY);
        }
    };

    // ═══ NEW CALCULATOR ═══
    var _calcMyChamp = null, _calcMyLvl = 1;
    var _calcTgtChamp = null, _calcTgtLvl = 1;
    var _calcRange = 'melee';

    window.openCalc = function() { openModal('calcMask'); setTimeout(calcRun, 50); };
    window.closeCalc = function() { closeModal('calcMask'); };

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
        document.getElementById('calcMyName').innerHTML = '🪆 Манекен';
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
        document.getElementById('calcTgtName').innerHTML = '🪆 Манекен';
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
        document.getElementById('rDmg').textContent = Math.round(finalDmg);
        document.getElementById('rFormula').textContent = ad+' × 100/(100+'+Math.round(effArmor*10)/10+') = '+Math.round(finalDmg);
        if(hpMax > 0) {
            var pct = Math.min(100, finalDmg/hpMax*100);
            document.getElementById('rHpBar').style.display = 'block';
            document.getElementById('rHpFill').style.width = pct.toFixed(1)+'%';
            document.getElementById('rHpPct').textContent = pct.toFixed(1)+'% HP';
        } else { document.getElementById('rHpBar').style.display = 'none'; }
        res.style.display = 'block';
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
                name:'\ud83d\udee1 Шипованный доспех', desc:'Отражает маг. урон атакующему + Тяжкие раны',
                needsRange: false,
                fields: [
                    {id:'ic_myArmor',label:'Моя броня',ph:'100',side:'my'},
                    {id:'ic_myBonusHp',label:'Мой бонусный HP',ph:'500',side:'my'},
                    {id:'ic_eMR',label:'МС врага',ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var a=+v('ic_myArmor')||100, h=+v('ic_myBonusHp')||500, mr=+v('ic_eMR')||40;
                    var raw=20+a*0.06+h*0.02;
                    var real=raw*100/(100+mr);
                    return {label:'Отражённый маг. урон (после МС)',val:Math.round(real),
                        formula:'Сырой: '+Math.round(raw)+' \u2192 после '+mr+' МС: '+Math.round(real)+'. Тяжкие раны 60% 3с'};
                }
            },
            botrk: {
                name:'\u2694 Клинок Погибшего Короля', desc:'% текущего HP врага (физ.)',
                needsRange: true,
                hasHitBtn: true,
                fields: [
                    {id:'ic_eHpCur',label:'Текущий HP цели',ph:'2500',side:'enemy'},
                    {id:'ic_eArmor',label:'Броня врага',ph:'100',side:'enemy'},
                    {id:'ic_ePen',label:'% пробив. брони',ph:'0',side:'enemy',min:0,max:100}
                ],
                calc: function(v){
                    var hp=+v('ic_eHpCur')||2500, ar=+v('ic_eArmor')||100, pen=+v('ic_ePen')||0;
                    var rng=_calcRange==='ranged';
                    var pct=rng?0.07:0.10;
                    var raw=Math.max(15, hp*pct);
                    var effAr=ar>0?ar*(1-pen/100):ar;
                    var real=raw*100/(100+effAr);
                    return {label:(rng?'Дальний 7%':'Ближний 10%'),val:Math.round(real),
                        formula:'Сырой: '+Math.round(raw)+' \u2192 эфф. броня '+Math.round(effAr)+' \u2192 урон: '+Math.round(real),
                        rawDmg:Math.round(real), hpField:'ic_eHpCur'};
                }
            },
            sunfire: {
                name:'\ud83d\udd25 Эгида Солнечного огня', desc:'Маг. урон/с рядом с врагами',
                needsRange: false,
                fields: [
                    {id:'ic_myBHp2',label:'Мой бонусный HP',ph:'1000',side:'my'},
                    {id:'ic_stacks',label:'Стаки (0-4)',ph:'4',side:'my',min:0,max:4},
                    {id:'ic_eLvl',label:'Уровень врага',ph:'10',side:'enemy',min:1,max:15},
                    {id:'ic_eMR2',label:'МС врага',ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var bHp=+v('ic_myBHp2')||1000, st=Math.min(4,+v('ic_stacks')||4), lv=+v('ic_eLvl')||10, mr=+v('ic_eMR2')||40;
                    var base=Math.round(16+(30-16)*(lv-1)/14);
                    var raw=(base+bHp*0.01)*(1+st*0.11);
                    var real=raw*100/(100+mr);
                    return {label:'Маг. урон/сек (после МС)',val:Math.round(real),
                        formula:'Сырой: '+Math.round(raw)+' \u2192 после '+mr+' МС: '+Math.round(real)};
                }
            },
            liandry: {
                name:'\ud83d\udd2e Мучения Лиандри', desc:'% макс. HP/с маг. ожог (скейлится до 3%)',
                needsRange: false,
                hasLiandryPct: true,
                fields: [
                    {id:'ic_eHpMaxL',label:'Макс HP цели',ph:'3000',side:'enemy'},
                    {id:'ic_eMR3',label:'МС врага',ph:'40',side:'enemy'}
                ],
                calc: function(v){
                    var hp=+v('ic_eHpMaxL')||3000, mr=+v('ic_eMR3')||40;
                    var pct=window._liandryPct||0.5;
                    var raw=hp*(pct/100)*3;
                    var real=raw*100/(100+mr);
                    return {label:'Ожог '+pct+'%/с за 3с (после МС)',val:Math.round(real),
                        formula:hp+'\u00d7'+pct+'%\u00d73с = '+Math.round(raw)+' \u2192 после '+mr+' МС: '+Math.round(real)};
                }
            },
            sunderer: {
                name:'\u26a1 Божественный Разрушитель', desc:'Физ. удар после способности + хил',
                needsRange: true,
                fields: [
                    {id:'ic_myAD2',label:'Мой базовый AD',ph:'120',side:'my'},
                    {id:'ic_eHpMaxS',label:'Макс HP цели',ph:'3000',side:'enemy'},
                    {id:'ic_eArmorS',label:'Броня врага',ph:'100',side:'enemy'},
                    {id:'ic_ePenS',label:'% пробив. брони',ph:'0',side:'enemy',min:0,max:100}
                ],
                calc: function(v){
                    var ad=+v('ic_myAD2')||120, rng=_calcRange==='ranged', hp=+v('ic_eHpMaxS')||3000, ar=+v('ic_eArmorS')||100, pen=+v('ic_ePenS')||0;
                    var pctDmg=hp*(rng?0.07:0.10);
                    var minDmg=ad*1.25;
                    var raw=Math.max(pctDmg,minDmg);
                    var effAr=ar>0?ar*(1-pen/100):ar;
                    var real=raw*100/(100+effAr);
                    var heal=Math.max(hp*(rng?0.025:0.06), ad*(rng?0.5:0.9));
                    return {label:(rng?'Дальн.':'Ближн.')+' (после брони)',val:Math.round(real),
                        formula:'Сырой: '+Math.round(raw)+' \u2192 эфф. броня '+Math.round(effAr)+' \u2192 урон: '+Math.round(real),
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
            entry.innerHTML='<span style="color:rgba(255,255,255,0.4);">Удар #'+_hitCount+'</span><span style="color:#ff6b6b;font-weight:700;">-'+dmg+' HP</span><span style="color:rgba(255,255,255,0.5);">'+Math.round(newHp)+' HP</span>';
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        if(hpBar && _hitStartHp > 0) {
            var pct = Math.max(0, newHp / _hitStartHp * 100);
            hpBar.style.width = pct + '%';
            hpBar.style.background = pct > 60 ? '#2ecc71' : pct > 30 ? '#f1c40f' : '#e74c3c';
        }
        if(hpText) hpText.textContent = Math.round(newHp) + ' / ' + _hitStartHp + ' HP';
        if(hitNum) hitNum.textContent = _hitCount + ' ударов';
        // Show combat block
        var cb = document.getElementById('icCombatBlock');
        if(cb) cb.style.display = 'block';
        // Dead?
        if(newHp <= 0) {
            var entry2 = document.createElement('div');
            entry2.style.cssText='text-align:center;padding:6px 0;font-size:13px;font-weight:900;color:#e74c3c;';
            entry2.textContent='\u2620 УБИТ за '+_hitCount+' ударов';
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
            b.style.background = active ? 'rgba(109,63,245,0.3)' : 'transparent';
            b.style.borderColor = active ? '#b96fff' : 'rgba(155,89,182,0.25)';
            b.style.color = active ? '#fff' : 'rgba(255,255,255,0.5)';
        });
        var modal = document.getElementById('itemSubModal');
        if(modal && modal._calcKey) runItemCalc(modal._calcKey);
    };

    window.setCalcRange = function(type) {
        _calcRange = type;
        var m=document.getElementById('icBtnMelee'), r=document.getElementById('icBtnRanged');
        if(m){ m.style.background=type==='melee'?'rgba(109,63,245,0.25)':'transparent'; m.style.borderColor=type==='melee'?'rgba(155,89,182,0.4)':'rgba(155,89,182,0.25)'; m.style.color=type==='melee'?'#fff':'rgba(255,255,255,0.5)'; }
        if(r){ r.style.background=type==='ranged'?'rgba(109,63,245,0.25)':'transparent'; r.style.borderColor=type==='ranged'?'rgba(155,89,182,0.4)':'rgba(155,89,182,0.25)'; r.style.color=type==='ranged'?'#fff':'rgba(255,255,255,0.5)'; }
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
                    var imgSrc = card.querySelector('img') ? card.querySelector('img').src : '';
                    openRuneDetail(parts[0]||'', parts[1]||'', parts[3]||parts[2]||'', imgSrc);
                });
            });
        }, 80);
    };
    window.closeRunes = function() {
        closeModal('runesMask');
    };

    window.openRuneDetail = function(name, type, desc, imgSrc) {
        var modal = document.getElementById('runeDetailModal');
        var box = document.getElementById('runeDetailContent');
        if(!modal || !box) return;
        box.innerHTML = '';

        // Иконка
        if(imgSrc) {
            var img = document.createElement('img');
            img.src = imgSrc;
            img.style.cssText = 'width:72px;height:72px;border-radius:50%;display:block;margin:0 auto 14px;border:2px solid rgba(185,111,255,0.5);box-shadow:0 0 20px rgba(109,63,245,0.4);';
            img.onerror = function(){ this.style.display='none'; };
            box.appendChild(img);
        }

        // Имя
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:20px;font-weight:900;color:#b96fff;text-align:center;margin-bottom:6px;';
        nameEl.textContent = name;
        box.appendChild(nameEl);

        // Тип
        if(type) {
            var typeEl = document.createElement('div');
            typeEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);text-align:center;font-weight:700;letter-spacing:1px;margin-bottom:18px;text-transform:uppercase;';
            typeEl.textContent = type;
            box.appendChild(typeEl);
        }

        // Описание
        if(desc) {
            var descBox = document.createElement('div');
            descBox.style.cssText = 'background:rgba(109,63,245,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:12px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.75;';
            descBox.textContent = desc;
            box.appendChild(descBox);
        }

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

    // Map each category to items in DOM (lazy, built once per session)
    var _itemsByCat = null;
    function getItemsByCat(){
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
        itemsMask.querySelectorAll('[style*="letter-spacing:1px"], .item-card').forEach(function(el){
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
    window.toggleTierlistEdit = function(){
        _tierEditMode = !_tierEditMode;
        var btn=document.getElementById('tierlistEditBtn');
        if(btn){
            btn.textContent=_tierEditMode?'✓ Готово':'✏ Изменить';
            btn.style.background=_tierEditMode?'rgba(109,63,245,0.25)':'rgba(255,215,0,0.08)';
            btn.style.borderColor=_tierEditMode?'rgba(109,63,245,0.6)':'rgba(255,215,0,0.4)';
            btn.style.color=_tierEditMode?'#b96fff':'#FFD700';
        }
        renderTierlist();
    };

    var ROLES = [
        {key:'all',label:'\u0412\u0441\u0435',icon:'\uD83C\uDF0D'},
        {key:'adc',label:'ADC',icon:'\uD83C\uDFF9'},
        {key:'mid',label:'\u041c\u0438\u0434',icon:'\u26A1'},
        {key:'top',label:'\u0422\u043e\u043f',icon:'\uD83D\uDEE1'},
        {key:'jungle',label:'\u041b\u0435\u0441',icon:'\uD83C\uDF3F'},
        {key:'sup',label:'\u0421\u0430\u043f',icon:'\uD83D\uDC9B'}
    ];
    window.openTierlist = function(type) {
        _tierType = type||'champs';
        _tierEditMode = false;
        _tierRole = 'all';
        _tierItemCat = 'all';
        _tierRuneCat = 'keystone';
        var titles={champs:'🏆 Тир-лист чемпионов', items:'⚙ Тир-лист предметов', runes:'✨ Тир-лист рун'};
        var t=document.getElementById('tierlistTitle');
        if(t) t.textContent=titles[_tierType]||'Тир-лист';
        var editBtn=document.getElementById('tierlistEditBtn');
        if(editBtn){ editBtn.textContent='✏ Изменить'; editBtn.style.background='rgba(255,215,0,0.08)'; editBtn.style.borderColor='rgba(255,215,0,0.4)'; editBtn.style.color='#FFD700'; }
        openModal('tierlistMask');
        buildTierlistTabs();
        renderTierlist();
    };
    window.closeTierlist = function() { closeModal('tierlistMask'); };

    window.openTierlistMenu = function() { openModal('tierlistMenuMask'); };
    window.closeTierlistMenu = function() { closeModal('tierlistMenuMask'); };
    function buildTierlistTabs() {
        var el=document.getElementById('tierlistTabs'); if(!el) return;
        el.innerHTML='';
        if(_tierType==='champs'){
            ROLES.forEach(function(r){
                var b=document.createElement('button');
                var active=r.key===_tierRole;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid rgba(155,89,182,'+(active?'0.8':'0.25')+');background:rgba(109,63,245,'+(active?'0.35':'0.08')+');color:'+(active?'#fff':'rgba(255,255,255,0.55)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=r.icon+' '+r.label;
                b.onclick=function(){_tierRole=r.key;buildTierlistTabs();renderTierlist();};
                el.appendChild(b);
            });
        } else if(_tierType==='items'){
            _ITEM_CATS.forEach(function(c){
                var b=document.createElement('button');
                var active=c.k===_tierItemCat;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid rgba(255,215,0,'+(active?'0.7':'0.2')+');background:rgba(255,215,0,'+(active?'0.18':'0.05')+');color:'+(active?'#FFD700':'rgba(255,255,255,0.5)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=c.icon+' '+c.l;
                b.onclick=function(){_tierItemCat=c.k;buildTierlistTabs();renderTierlist();};
                el.appendChild(b);
            });
        } else if(_tierType==='runes'){
            _RUNE_CATS.forEach(function(c){
                var b=document.createElement('button');
                var active=c.k===_tierRuneCat;
                b.style.cssText='padding:7px 13px;border-radius:20px;border:1.5px solid rgba(109,63,245,'+(active?'0.8':'0.25')+');background:rgba(109,63,245,'+(active?'0.35':'0.08')+');color:'+(active?'#fff':'rgba(255,255,255,0.5)')+';font-size:12px;font-weight:700;cursor:pointer;';
                b.textContent=c.icon+' '+c.l;
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
        el.innerHTML='';
        _TIER_KEYS.forEach(function(tk){
            var color=_TIER_COLORS[tk];
            var row=document.createElement('div');
            row.style.cssText='display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;';
            var lbl=document.createElement('div');
            lbl.style.cssText='width:54px;min-width:54px;height:54px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:17px;font-weight:900;background:linear-gradient(135deg,'+color+'cc,'+color+'88);color:#fff;flex-shrink:0;margin-top:3px;';
            lbl.textContent=tk;
            var cd=document.createElement('div');
            cd.style.cssText='display:flex;flex-wrap:wrap;gap:5px;flex:1;align-items:center;padding:5px;background:rgba(255,255,255,0.02);border-radius:8px;min-height:60px;';
            (tData[tk]||[]).forEach(function(cname){
                var chip=document.createElement('div');
                chip.style.cssText='position:relative;display:inline-block;';
                var img=document.createElement('img');
                img.style.cssText='width:50px;height:50px;border-radius:8px;object-fit:cover;display:block;';
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
            if(_tierEditMode){
                var addBtn=document.createElement('button');
                addBtn.style.cssText='padding:5px 10px;border-radius:8px;border:1px dashed rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.35);font-size:10px;cursor:pointer;white-space:nowrap;flex-shrink:0;align-self:center;';
                addBtn.textContent='+ Выбрать';
                (function(t,td,af,rf,pt){addBtn.onclick=function(){
                    var roleFilter = (pt==='champs' && _tierRole!=='all') ? _tierRole : 'all';
                    openChampPicker(['🏆','⚙','✨'][['champs','items','runes'].indexOf(pt)]+' Тир '+t,
                    function(c){
                        af(t,c.name);
                        champPickerBuildGrid();
                    },{
                        multi:true, type:pt,
                        defaultRole: roleFilter,
                        itemCat: pt==='items' ? _tierItemCat : pt==='runes' ? _tierRuneCat : 'all',
                        getSelected:function(){return td[t]||[];},
                        getExcluded:function(){var e2=[];_TIER_KEYS.forEach(function(ot){if(ot!==t)(td[ot]||[]).forEach(function(n){e2.push(n);});});return e2;},
                        onRemove:function(c){rf(t,c.name);champPickerBuildGrid();}
                    });
                };}(tk,tData,addFn,removeFn,pickerType));
                row.appendChild(addBtn);
            }
            el.appendChild(row);
        });
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
    var SC_ROLES=[{key:'all',label:'\u0412\u0441\u0435'},{key:'ADC',label:'ADC'},{key:'Mid',label:'\u041c\u0438\u0434'},{key:'Top',label:'\u0422\u043e\u043f'},{key:'Jungle',label:'\u041b\u0435\u0441'},{key:'Support',label:'\u0421\u0430\u043f'}];
    var _scRole='all';
    window.openSideChamps = function() {
        openModal('sideChampsMask');
        var rf=document.getElementById('scRoleFilter');
        if(rf&&!rf.children.length){
            // "Все" button on its own row
            var allBtn=document.createElement('button');
            allBtn.style.cssText='padding:7px 16px;border-radius:18px;border:1.5px solid rgba(155,89,182,0.3);background:rgba(109,63,245,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;cursor:pointer;width:100%;';
            allBtn.textContent=SC_ROLES[0].label; allBtn.dataset.key=SC_ROLES[0].key;
            allBtn.onclick=function(){_scRole='all';scHighlightRole();scBuildGrid();};
            rf.appendChild(allBtn);
            // 5 roles in a row
            var rolesRow=document.createElement('div');
            rolesRow.style.cssText='display:flex;gap:5px;';
            SC_ROLES.slice(1).forEach(function(r){
                var b=document.createElement('button');
                b.style.cssText='flex:1;padding:7px 4px;border-radius:18px;border:1.5px solid rgba(155,89,182,0.3);background:rgba(109,63,245,0.08);color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;cursor:pointer;text-align:center;';
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
            allB.style.borderColor=aa?'#b96fff':'rgba(155,89,182,0.3)';
            allB.style.background=aa?'rgba(109,63,245,0.35)':'rgba(109,63,245,0.08)';
            allB.style.color=aa?'#fff':'rgba(255,255,255,0.6)';
        }
        // Highlight role buttons (inside second child div)
        var row=rf.children[1];
        if(row) Array.from(row.children).forEach(function(b){
            var a=b.dataset.key===_scRole;
            b.style.borderColor=a?'#b96fff':'rgba(155,89,182,0.3)';
            b.style.background=a?'rgba(109,63,245,0.35)':'rgba(109,63,245,0.08)';
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
            div.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px;border-radius:10px;border:2px solid transparent;transition:all 0.15s;';
            div.onmouseenter=function(){div.style.borderColor='#b96fff';div.style.background='rgba(109,63,245,0.2)';};
            div.onmouseleave=function(){div.style.borderColor='transparent';div.style.background='';};
            var img=document.createElement('img');
            img.src=champIcon(ch.name);
            img.style.cssText='width:100%;aspect-ratio:1;border-radius:8px;object-fit:cover;';
            img.onerror=function(){this.src='';this.style.background='rgba(109,63,245,0.3)';};
            var lbl=document.createElement('div');
            lbl.style.cssText='font-size:8px;color:rgba(255,255,255,0.55);text-align:center;line-height:1.15;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;';
            lbl.textContent=ch.name;
            div.appendChild(img); div.appendChild(lbl);
            div.onclick=function(){openChampDetail(ch.name);};
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
    window.openChampDetail=function(name){
        var champ=raw.find(function(x){return x.name===name;});
        var el=document.getElementById('champDetailContent');
        el.innerHTML='';
        el.style.cssText='text-align:left;padding:0;';

        // ══ MAIN 2-COLUMN LAYOUT ══
        var mainGrid=document.createElement('div');
        mainGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:20px;';
        // Mobile: stack
        if(window.innerWidth<=768) mainGrid.style.gridTemplateColumns='1fr';

        // ── LEFT COLUMN: Profile + Stats ──
        var leftCol=document.createElement('div');

        // Icon + Name header
        var header=document.createElement('div');
        header.style.cssText='display:flex;align-items:center;gap:14px;margin-bottom:14px;';
        var ci=document.createElement('img');
        ci.src=champIcon(name);
        ci.style.cssText='width:72px;height:72px;border-radius:14px;border:2px solid rgba(185,111,255,0.45);box-shadow:0 0 18px rgba(109,63,245,0.4);object-fit:cover;flex-shrink:0;';
        ci.onerror=function(){this.style.display='none';};
        header.appendChild(ci);
        var nameBlock=document.createElement('div');
        var cn=document.createElement('div');
        cn.style.cssText='font-size:22px;font-weight:900;color:#b96fff;';
        cn.textContent=name;
        nameBlock.appendChild(cn);
        if(champ){
            var roles=[]; if(champ.is.Top)roles.push('Top'); if(champ.is.Jungle)roles.push('Jungle'); if(champ.is.Mid)roles.push('Mid'); if(champ.is.ADC)roles.push('ADC'); if(champ.is.Support)roles.push('Support');
            var rd=document.createElement('div');
            rd.style.cssText='font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px;';
            rd.textContent=roles.join(' \u00b7 ')||'\u2014';
            nameBlock.appendChild(rd);
        }
        header.appendChild(nameBlock);
        leftCol.appendChild(header);

        if(champ){
            // Patch info
            var pDetail = patchMap[name];
            if(pDetail) {
                var pBadge = document.createElement('div');
                var pColor = pDetail.type === 'buff' ? '#2ecc71' : '#e74c3c';
                var pLabel = pDetail.type === 'buff' ? '🟢 БАФФ' : '🔴 НЕРФ';
                pBadge.style.cssText = 'background:rgba('+(pDetail.type==='buff'?'46,204,113':'231,76,60')+',0.12);border:1px solid '+pColor+';border-radius:10px;padding:8px 12px;margin-bottom:12px;';
                pBadge.innerHTML = '<div style="font-size:11px;font-weight:900;color:'+pColor+';margin-bottom:3px;">'+pLabel+' <span style="color:rgba(255,255,255,0.4);font-weight:600;">Патч '+pDetail.patch+'</span></div><div style="font-size:10px;color:rgba(255,255,255,0.7);line-height:1.4;">'+pDetail.change+'</div>';
                leftCol.appendChild(pBadge);
            }
            // Level slider
            var _cardLvl = lvl;
            var lvlWrap=document.createElement('div');
            lvlWrap.style.cssText='margin-bottom:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(155,89,182,0.2);border-radius:12px;padding:10px 14px;';
            var lvlRow=document.createElement('div');
            lvlRow.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
            lvlRow.innerHTML='<span style="font-size:12px;color:rgba(255,255,255,0.5);font-weight:700;">УРОВЕНЬ</span><span id="cdLvlNum" style="font-size:28px;font-weight:900;color:var(--accent);">'+_cardLvl+'</span>';
            lvlWrap.appendChild(lvlRow);
            var slider=document.createElement('input');
            slider.type='range'; slider.min='1'; slider.max='15'; slider.value=String(_cardLvl);
            slider.style.cssText='width:100%;height:4px;appearance:none;background:linear-gradient(90deg,#2d1b4e,var(--accent));border-radius:10px;outline:none;';
            slider.oninput=function(){
                _cardLvl=+this.value;
                document.getElementById('cdLvlNum').textContent=_cardLvl;
                updateCardStats(champ, _cardLvl);
            };
            lvlWrap.appendChild(slider);
            leftCol.appendChild(lvlWrap);
            // Stats grid
            var sg=document.createElement('div');
            sg.id='cdStatsGrid';
            sg.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';
            leftCol.appendChild(sg);
            function updateCardStats(c, l){
                var f=function(b,g){return Math.round(b+(l-1)*g);};
                var stats=[
                    {id:'cd_ad',label:'\u2694 AD',val:f(c.ad_b,c.ad_g),color:'#e8820a'},
                    {id:'cd_hp',label:'\u271a HP',val:f(c.hp_b,c.hp_g),color:'#2ecc71'},
                    {id:'cd_mn',label:'\ud83d\udca7 '+(c.res==='Energy'?'Energy':'Mana'),val:c.res==='Energy'?'150':String(f(c.mn_b,c.mn_g)),color:'#5dade2'},
                    {id:'cd_ar',label:'\ud83d\udee1 \u0411\u0440\u043e\u043d\u044f',val:f(c.ar_b,c.ar_g),color:'#f1c40f'},
                    {id:'cd_mr',label:'\u2726 \u041c\u0421',val:f(c.mr_b,c.mr_g),color:'#9b59b6'}
                ];
                var grid=document.getElementById('cdStatsGrid')||sg;
                if(!grid.children.length){
                    stats.forEach(function(s){
                        var box=document.createElement('div');
                        box.style.cssText='background:rgba(255,255,255,0.04);border:1px solid rgba(155,89,182,0.2);border-radius:10px;padding:8px 12px;';
                        box.innerHTML='<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;">'+s.label+'</div><div id="'+s.id+'" style="font-size:20px;font-weight:900;color:'+s.color+';">'+s.val+'</div>';
                        grid.appendChild(box);
                    });
                } else {
                    stats.forEach(function(s){
                        var v=document.getElementById(s.id)||sg.querySelector('#'+s.id);
                        if(v) v.textContent=s.val;
                    });
                }
            }
            updateCardStats(champ, _cardLvl);
        }
        mainGrid.appendChild(leftCol);

        // ── RIGHT COLUMN: Matchups ──
        if(champ){
            var rightCol=document.createElement('div');
            rightCol.style.cssText='display:flex;flex-direction:column;gap:8px;';

            function makeSection(id, title, color, bgRgb, key, pickerTitle) {
                var box = document.createElement('div');
                box.style.cssText = 'background:rgba('+bgRgb+',0.06);border:1px solid rgba('+bgRgb+',0.25);border-radius:10px;padding:10px;flex:1;';
                box.innerHTML = '<div style="font-size:10px;color:'+color+';font-weight:800;letter-spacing:0.5px;margin-bottom:8px;">'+title+'</div>';
                var list = document.createElement('div');
                list.id = id;
                list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;';
                box.appendChild(list);
                var addBtn = document.createElement('button');
                addBtn.style.cssText = 'width:28px;height:28px;border-radius:8px;border:1px solid rgba('+bgRgb+',0.4);background:transparent;color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;flex-shrink:0;';
                addBtn.textContent = '+';
                (function(k, pt){
                    addBtn.onclick = function() {
                        openChampPicker(pt, function(c) {
                            var cur = k==='strongVs' ? getStrongVs(name) : k==='weakVs' ? getWeakVs(name) : getCombos(name);
                            if(cur.length >= 7) return;
                            addTo(name, k, c.name);
                            renderMatchups(name);
                            champPickerBuildGrid();
                        },{multi:true,getSelected:function(){
                            if(k==='strongVs') return getStrongVs(name);
                            if(k==='weakVs') return getWeakVs(name);
                            return getCombos(name);
                        },getExcluded:function(){ return [name]; },onRemove:function(c){
                            removeFrom(name, k, c.name);
                            renderMatchups(name);
                            champPickerBuildGrid();
                        }});
                    };
                }(key, pickerTitle));
                box.appendChild(addBtn);
                return box;
            }

            rightCol.appendChild(makeSection('cdStrongVs', '⚔ СИЛЁН ПРОТИВ', '#2ecc71', '39,174,96', 'strongVs', '⚔ Силён против'));
            rightCol.appendChild(makeSection('cdWeakVs', '💀 СЛАБ ПРОТИВ', '#e74c3c', '231,76,60', 'weakVs', '💀 Слаб против'));
            rightCol.appendChild(makeSection('cdCombos', '🤝 КОМБО', '#5dade2', '93,173,226', 'combos', '🤝 Комбо с'));

            function renderMatchups(n) {
                var sections = [
                    {id:'cdStrongVs', key:'strongVs', bgRgb:'39,174,96'},
                    {id:'cdWeakVs', key:'weakVs', bgRgb:'231,76,60'},
                    {id:'cdCombos', key:'combos', bgRgb:'93,173,226'}
                ];
                sections.forEach(function(sec) {
                    var el2 = document.getElementById(sec.id);
                    if(!el2) return;
                    el2.innerHTML = '';
                    var data = [];
                    if(sec.key === 'strongVs') data = getStrongVs(n);
                    else if(sec.key === 'weakVs') data = getWeakVs(n);
                    else data = getCombos(n);
                    data.forEach(function(cn) {
                        var chip = document.createElement('div');
                        chip.style.cssText = 'display:flex;align-items:center;gap:2px;background:rgba('+sec.bgRgb+',0.12);border:1px solid rgba('+sec.bgRgb+',0.25);border-radius:6px;padding:2px;cursor:default;';
                        chip.innerHTML = '<img src="'+champIcon(cn)+'" title="'+cn+'" style="width:29px;height:29px;border-radius:4px;object-fit:cover;" onerror="this.style.display=\'none\'">';
                        var xBtn = document.createElement('span');
                        xBtn.style.cssText = 'color:rgba(255,255,255,0.3);cursor:pointer;font-size:12px;line-height:1;';
                        xBtn.textContent = '\u00d7';
                        xBtn.onclick = function(e) { e.stopPropagation(); removeFrom(n, sec.key, cn); renderMatchups(n); };
                        chip.appendChild(xBtn);
                        el2.appendChild(chip);
                    });
                });
            }
            mainGrid.appendChild(rightCol);
        }
        el.appendChild(mainGrid);
        renderMatchups(name);
        openModal('champDetailMask');
    };
    window.closeChampDetail=function(){closeModal('champDetailMask');};

    // Sidebar support tooltip
    (function(){
        var btn=document.getElementById('sideSupport'); if(!btn) return;
        var tip=null;
        btn.addEventListener('mouseenter',function(){
            tip=document.createElement('div');
            tip.style.cssText='position:fixed;z-index:99999;background:rgba(10,3,20,0.97);border:1px solid rgba(185,111,255,0.6);color:rgba(255,255,255,0.9);font-size:12px;line-height:1.6;padding:12px 14px;border-radius:10px;max-width:260px;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,0.6);';
            tip.textContent=btn.getAttribute('title')||'';
            document.body.appendChild(tip);
            var r=btn.getBoundingClientRect();
            tip.style.left=(r.right+10)+'px';
            tip.style.top=Math.max(10,r.top)+'px';
        });
        btn.addEventListener('mouseleave',function(){if(tip){tip.remove();tip=null;}});
    })();

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
    var _mainSidebarModals = ['sideChampsMask','calcMask','itemCalcMenuMask','itemsMask','runesMask','draftMask','tierlistMask'];

    window.sidebarOpen = function(what) {
        closeSidebar();
        var modalMap = {
            'sideChamps':'sideChampsMask', 'calc':'calcMask', 'itemCalcMenu':'itemCalcMenuMask',
            'items':'itemsMask', 'runes':'runesMask', 'draft':'draftMask',
            'tierChamps':'tierlistMask', 'tierItems':'tierlistMask', 'tierRunes':'tierlistMask',
            'tierMenu':'tierlistMenuMask', 'globalChat':'chatSystemMask',
            'users':'chatSystemMask', 'influencers':'influencerMask'
        };
        _sidebarModalId = modalMap[what] || null;
        switch(what) {
            case 'sideChamps': openSideChamps(); break;
            case 'calc': openCalc(); break;
            case 'itemCalcMenu': openItemCalcMenu(); break;
            case 'items': openItems(); break;
            case 'runes': openRunes(); break;
            case 'draft': openDraft(); break;
            case 'tierChamps': openTierlist('champs'); break;
            case 'tierItems': openTierlist('items'); break;
            case 'tierRunes': openTierlist('runes'); break;
            case 'tierMenu': openTierlistMenu(); break;
            case 'globalChat': openChatSystem(); break;
            case 'users': openChatSystem('users'); break;
            case 'influencers': openInfluencers(); break;
        }
    };

    // Hook into closeModal to reopen sidebar ONLY for main modals
    var _origCloseModal = closeModal;
    closeModal = function(id) {
        _origCloseModal(id);
        // Only reopen sidebar if closing the MAIN modal that was opened from sidebar
        if(_sidebarModalId && id === _sidebarModalId) {
            var savedId = _sidebarModalId;
            _sidebarModalId = null;
            // Delay: check if ANY modal is still open (stack or active class)
            setTimeout(function() {
                var anyOpen = _modalStack && _modalStack.length > 0;
                if(!anyOpen) {
                    // Double-check: is any modal still visually active?
                    var stillActive = MODAL_IDS.some(function(mid) {
                        var mel = document.getElementById(mid);
                        return mel && mel.classList.contains('active');
                    });
                    if(!stillActive) {
                        toggleSidebar();
                    }
                }
            }, 150);
        }
    };
    window.closeModal = closeModal;

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
        _uiTip.textContent = '+' + (Math.round(growthVal * 10) / 10) + ' за уровень';
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

    var _draftSlotsL = [null,null,null,null,null];
    var _draftSlotsR = [null,null,null,null,null];
    var _draftActiveSlot = null;

    window.openDraft = function() {
        _draftSlotsL = [null,null,null,null,null];
        _draftSlotsR = [null,null,null,null,null];
        _draftActiveSlot = null;
        openModal('draftMask');
        draftBuildSlots();
        draftRenderPanels();
    };
    window.closeDraft = function() { closeModal('draftMask'); };

    function draftBuildSlots() {
        function buildSide(slotsArr, side) {
            var elId = side==='left' ? 'draftSlotsLeft' : 'draftSlotsRight';
            var el = document.getElementById(elId);
            if(!el) return;
            el.innerHTML = '';
            var teamColor = side==='left' ? 'rgba(93,173,226,0.6)' : 'rgba(231,76,60,0.6)';
            for(var i=0;i<5;i++) {
                (function(idx){
                    var champ = slotsArr[idx];
                    var slot = document.createElement('div');
                    slot.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:9px;cursor:pointer;border:2px solid '+(champ?teamColor:'rgba(155,89,182,0.12)')+';background:'+(champ?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.02)')+';transition:all 0.12s;min-height:36px;position:relative;';
                    slot.onmouseenter = function(){ if(!champ) this.style.borderColor='rgba(155,89,182,0.4)'; };
                    slot.onmouseleave = function(){ if(!champ) this.style.borderColor='rgba(155,89,182,0.12)'; };
                    if(champ) {
                        var img = document.createElement('img');
                        img.src = champIcon(champ);
                        img.style.cssText = 'width:26px;height:26px;border-radius:5px;object-fit:cover;flex-shrink:0;';
                        img.onerror = function(){ this.style.background='rgba(109,63,245,0.3)'; };
                        var nm = document.createElement('div');
                        nm.style.cssText = 'font-size:10px;font-weight:700;color:#fff;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
                        nm.textContent = champ;
                        var x = document.createElement('button');
                        x.textContent = '×';
                        x.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.3);font-size:14px;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1;';
                        x.onclick = function(e){ e.stopPropagation(); draftClearSlot(side, idx); };
                        slot.appendChild(img); slot.appendChild(nm); slot.appendChild(x);
                    } else {
                        var numBadge = document.createElement('div');
                        numBadge.style.cssText = 'width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:rgba(255,255,255,0.25);flex-shrink:0;';
                        numBadge.textContent = idx+1;
                        var ph = document.createElement('div');
                        ph.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.2);font-style:italic;';
                        ph.textContent = 'нажми для выбора';
                        slot.appendChild(numBadge); slot.appendChild(ph);
                    }
                    slot.onclick = function() { draftSetActiveSlot(side, idx); };
                    el.appendChild(slot);
                })(i);
            }
        }
        buildSide(_draftSlotsL, 'left');
        buildSide(_draftSlotsR, 'right');
    }

    function draftSetActiveSlot(side, idx) {
        _draftActiveSlot = {side:side, idx:idx};
        draftBuildSlots();
        var allPicked = _draftSlotsL.concat(_draftSlotsR).filter(Boolean);
        openChampPicker('⚔ Выбери чемпиона', function(c) {
            draftPickChamp(c.name);
        }, {
            getExcluded: function() { return allPicked; }
        });
    }

    function draftPickChamp(name) {
        if(!_draftActiveSlot) return;
        var side = _draftActiveSlot.side, idx = _draftActiveSlot.idx;
        if(side==='left') _draftSlotsL[idx]=name;
        else _draftSlotsR[idx]=name;
        _draftActiveSlot = null;
        draftBuildSlots();
        draftRenderPanels();
    }

    window.draftClearAll = function() {
        _draftSlotsL=[null,null,null,null,null]; _draftSlotsR=[null,null,null,null,null]; _draftActiveSlot=null;
        draftBuildSlots(); draftRenderPanels();
    };

    function draftClearSlot(side, idx) {
        if(side==='left') _draftSlotsL[idx]=null;
        else _draftSlotsR[idx]=null;
        _draftActiveSlot=null;
        draftBuildSlots(); draftRenderPanels();
    }

    function getChampTierStar(name) {
        var isSplus = false, isS = false;
        _TIER_ROLES_LIST.forEach(function(r) {
            if(TIER_DATA[r] && TIER_DATA[r]['S+'] && TIER_DATA[r]['S+'].indexOf(name) !== -1) isSplus = true;
            if(TIER_DATA[r] && TIER_DATA[r]['S'] && TIER_DATA[r]['S'].indexOf(name) !== -1) isS = true;
        });
        if(isSplus) return 'red';
        if(isS) return 'green';
        return null;
    }

    function draftRenderPanels() {
        function compute(slots) {
            var picked = slots.filter(Boolean);
            var cm={}, sm={};
            picked.forEach(function(n){
                var d=getDraftData(n); if(!d) return;
                (d.counters||[]).forEach(function(c){ if(picked.indexOf(c.n)!==-1) return; if(!cm[c.n]) cm[c.n]={stars:0,from:[]}; cm[c.n].stars=Math.max(cm[c.n].stars,c.s); cm[c.n].from.push(n); });
                (d.synergies||[]).forEach(function(s){ if(picked.indexOf(s.n)!==-1) return; if(!sm[s.n]) sm[s.n]={stars:0,from:[]}; sm[s.n].stars=Math.max(sm[s.n].stars,s.s); sm[s.n].from.push(n); });
            });
            return {cm:cm,sm:sm,picked:picked};
        }
        function renderMap(map) {
            var e = Object.keys(map).map(function(n) {
                return {name:n, counterFrom:map[n].counterFrom, synergyFrom:map[n].synergyFrom};
            });
            e.sort(function(a,b) {
                return (b.counterFrom.length+b.synergyFrom.length) - (a.counterFrom.length+a.synergyFrom.length);
            });
            if(!e.length) return '<div style="color:rgba(255,255,255,0.18);font-size:11px;text-align:center;padding:8px;">—</div>';
            var wrap = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px;">';
            wrap += e.slice(0,20).map(function(x) {
                var stars = [];
                if(x.counterFrom.length === 1) stars.push('#2ecc71');
                else if(x.counterFrom.length > 1) stars.push('#e74c3c');
                if(x.synergyFrom.length === 1) stars.push('#2ecc71');
                else if(x.synergyFrom.length > 1) stars.push('#e74c3c');
                var ts = getChampTierStar(x.name);
                if(ts) stars.push(ts === 'red' ? '#e74c3c' : '#2ecc71');
                var starsHtml = stars.length
                    ? '<div style="position:absolute;bottom:2px;left:0;right:0;display:flex;justify-content:center;gap:1px;pointer-events:none;">'
                      + stars.map(function(c){ return '<span style="font-size:8px;color:'+c+';line-height:1;text-shadow:0 1px 3px #000;">★</span>'; }).join('')
                      + '</div>'
                    : '';
                return '<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;overflow:hidden;">'
                    + '<img src="'+champIcon(x.name)+'" style="width:44px;height:44px;border-radius:7px;object-fit:cover;display:block;" onerror="this.style.background=\'rgba(109,63,245,0.3)\'">'
                    + starsHtml
                    + '</div>';
            }).join('');
            wrap += '</div>';
            return wrap;
        }

        var allPicked = _draftSlotsL.concat(_draftSlotsR).filter(Boolean);
        var L = compute(_draftSlotsL);
        var R = compute(_draftSlotsR);
        var hasAny = L.picked.length || R.picked.length;
        var empty = '<div style="color:rgba(255,255,255,0.18);font-size:11px;text-align:center;padding:8px;">Выбери чемпиона</div>';

        // GOOD PICK = counters to enemy picks (R.cm) + synergies with our picks (L.sm)
        var goodMap = {};
        Object.keys(R.cm).forEach(function(n) {
            if(allPicked.indexOf(n)!==-1) return;
            if(!goodMap[n]) goodMap[n]={counterFrom:[],synergyFrom:[]};
            goodMap[n].counterFrom = goodMap[n].counterFrom.concat(R.cm[n].from);
        });
        Object.keys(L.sm).forEach(function(n) {
            if(allPicked.indexOf(n)!==-1) return;
            if(!goodMap[n]) goodMap[n]={counterFrom:[],synergyFrom:[]};
            goodMap[n].synergyFrom = goodMap[n].synergyFrom.concat(L.sm[n].from);
        });

        // DANGER = counters to our picks (L.cm) + synergies with enemy picks (R.sm)
        var dangerMap = {};
        Object.keys(L.cm).forEach(function(n) {
            if(allPicked.indexOf(n)!==-1) return;
            if(!dangerMap[n]) dangerMap[n]={counterFrom:[],synergyFrom:[]};
            dangerMap[n].counterFrom = dangerMap[n].counterFrom.concat(L.cm[n].from);
        });
        Object.keys(R.sm).forEach(function(n) {
            if(allPicked.indexOf(n)!==-1) return;
            if(!dangerMap[n]) dangerMap[n]={counterFrom:[],synergyFrom:[]};
            dangerMap[n].synergyFrom = dangerMap[n].synergyFrom.concat(R.sm[n].from);
        });

        var gpEl = document.getElementById('draftGoodPick');
        var dgEl = document.getElementById('draftDanger');
        if(gpEl) gpEl.innerHTML = hasAny ? renderMap(goodMap) : empty;
        if(dgEl) dgEl.innerHTML = hasAny ? renderMap(dangerMap) : empty;
    }

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
        var t = document.getElementById('champPickerTitle');
        if(t) t.textContent = title || '⚔ Выбери чемпиона';
        var doneBtn = document.getElementById('champPickerDoneBtn');
        if(doneBtn) doneBtn.style.display = _champPickerMulti ? '' : 'none';
        var rolesEl = document.getElementById('champPickerRoles');
        if(rolesEl) {
            if(_champPickerType === 'champs') {
                var rolesList = [
                    {k:'all', l:'Все'}, {k:'Top', l:'Топ'}, {k:'Jungle', l:'Джунгли'},
                    {k:'Mid', l:'Мид'}, {k:'ADC', l:'ADC'}, {k:'Support', l:'Суп'}
                ];
                rolesEl.innerHTML = '';
                rolesList.forEach(function(r) {
                    var btn = document.createElement('button');
                    btn.textContent = r.l;
                    btn.style.cssText = 'padding:4px 10px;border-radius:16px;border:1px solid rgba(185,111,255,0.35);background:' + (_champPickerRole===r.k?'rgba(109,63,245,0.5)':'rgba(255,255,255,0.06)') + ';color:' + (_champPickerRole===r.k?'#fff':'rgba(255,255,255,0.6)') + ';font-size:11px;cursor:pointer;transition:all 0.12s;';
                    btn.onclick = function() {
                        _champPickerRole = r.k;
                        Array.from(rolesEl.children).forEach(function(b, i) {
                            var active = rolesList[i].k === _champPickerRole;
                            b.style.background = active ? 'rgba(109,63,245,0.5)' : 'rgba(255,255,255,0.06)';
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
            wrap.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:4px;border-radius:9px;border:2px solid '+(isSel?'#b96fff':'transparent')+';background:'+(isSel?'rgba(109,63,245,0.2)':'transparent')+';transition:all 0.12s;';
            var img = document.createElement('img');
            img.src = c.img || '';
            img.style.cssText = 'width:100%;aspect-ratio:1;border-radius:7px;object-fit:cover;';
            img.onerror = function(){ this.style.background='rgba(109,63,245,0.3)'; this.style.minHeight='32px'; };
            var nm = document.createElement('div');
            nm.style.cssText = 'font-size:7px;color:rgba(255,255,255,0.5);text-align:center;line-height:1.1;width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
            nm.textContent = c.name;
            wrap.appendChild(img); wrap.appendChild(nm);
            if(isSel) {
                var ck = document.createElement('div');
                ck.style.cssText = 'position:absolute;top:2px;right:2px;background:#b96fff;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:900;pointer-events:none;';
                ck.textContent = '✓';
                wrap.appendChild(ck);
            } else {
                wrap.onmouseenter = function(){ this.style.borderColor='#b96fff'; this.style.background='rgba(109,63,245,0.15)'; };
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
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:rgba(255,255,255,0.3);font-size:12px;">Ничего не найдено</div>';
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
        block.innerHTML = `
Ребята, сайт абсолютно бесплатен для всех.<br><br>
Буду очень благодарен за поддержку, для меня это мощная мотивация развивать проект.<br><br>
В планах: добавить характеристики HP реген, winrate/pickrate, мана реген, особый столбец для лесников: фулл клир таймер, ганг потенциал, сложность реализации и импакт чемпа, изображения чемпов и регулярно обновлять сайт до актуальности)
        `.trim();
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
            + 'border:1.5px solid rgba(185,111,255,0.4);backdrop-filter:blur(8px);'
            + 'animation:fadeIn 0.2s ease;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
        }, duration);
    }
    window.showToast = showToast;

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
        if (!_currentUser) {
            // Not logged in → sign in
            authSignIn();
            return;
        }
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

    function authSignIn() {
        if (!auth || !_provider) {
            alert('Firebase не загружен. Проверьте подключение к интернету.');
            return;
        }
        auth.signInWithPopup(_provider).catch(function(err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error('Auth error:', err);
                alert('Ошибка авторизации: ' + err.message);
            }
        });
    }

    window.authSignOut = function() {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        // Show confirmation
        var overlay = document.createElement('div');
        overlay.id = 'logoutConfirm';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';
        var box = document.createElement('div');
        box.style.cssText = 'background:linear-gradient(135deg,#1a0d2e,#0f0520);border:1.5px solid rgba(155,89,182,0.3);border-radius:16px;padding:24px;text-align:center;min-width:260px;';
        box.innerHTML = '<div style="font-size:18px;margin-bottom:6px;">🚪</div>'
            + '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">Выйти из аккаунта?</div>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:16px;">Данные не потеряются</div>';
        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:8px;';
        var cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'flex:1;padding:10px;border-radius:10px;border:1.5px solid rgba(155,89,182,0.3);background:none;color:#b96fff;font-size:13px;font-weight:800;cursor:pointer;';
        cancelBtn.textContent = 'Назад';
        cancelBtn.onclick = function() { overlay.remove(); };
        var confirmBtn = document.createElement('button');
        confirmBtn.style.cssText = 'flex:1;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;font-size:13px;font-weight:800;cursor:pointer;';
        confirmBtn.textContent = 'Выйти';
        confirmBtn.onclick = function() { overlay.remove(); if(auth) auth.signOut(); };
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

        if (user) {
            btn.innerHTML = '<img src="' + (user.photoURL || '') + '" alt="' + (user.displayName || '') + '" onerror="this.style.display=\'none\'">'
                + '<span id="authNotifDot" style="display:none;position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#ffd700;border-radius:50%;border:2px solid #0f0520;"></span>';
            btn.title = user.displayName || user.email || 'Профиль';
            if (emailEl) emailEl.textContent = user.email || '';
        } else {
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
            btn.title = 'Войти через Google';
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

    // Save matchups + tier data to Firestore
    function saveUserDataToFirestore() {
        var docRef = getUserDocRef();
        if (!docRef) return;

        var matchups = {};
        var tierData = {};
        var itemTierData = {};
        var runeTierData = {};
        var selectedChamps = [];

        try { matchups = JSON.parse(localStorage.getItem('matchups') || '{}'); } catch(e) {}
        try { tierData = JSON.parse(localStorage.getItem('tierData') || '{}'); } catch(e) {}
        try { itemTierData = JSON.parse(localStorage.getItem('itemTierData') || '{}'); } catch(e) {}
        try { runeTierData = JSON.parse(localStorage.getItem('runeTierData') || '{}'); } catch(e) {}
        try { selectedChamps = JSON.parse(localStorage.getItem('p') || '[]'); } catch(e) {}

        docRef.set({
            matchups: JSON.stringify(matchups),
            tierData: JSON.stringify(tierData),
            itemTierData: JSON.stringify(itemTierData),
            runeTierData: JSON.stringify(runeTierData),
            selectedChamps: JSON.stringify(selectedChamps),
            email: _currentUser.email || '',
            displayName: _currentUser.displayName || '',
            photoURL: _currentUser.photoURL || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            console.log('Data saved to Firestore');
            showSyncStatus('Сохранено ✓');
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
                // First login: upload local data
                console.log('First login — uploading local data to Firestore');
                saveUserDataToFirestore();
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
                if (d.selectedChamps) {
                    try { localStorage.setItem('p', d.selectedChamps); } catch(e) {}
                }
                console.log('Loaded data from Firestore (server is newer)');
                showSyncStatus('Загружено ✓');
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
            alert('Сначала войдите в аккаунт');
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
        if (key === 'matchups' || key === 'tierData' || key === 'itemTierData' || key === 'runeTierData' || key === 'p') {
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
            card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(155,89,182,0.15);background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.15s,border-color 0.15s;';
            card.onmouseenter = function(){ card.style.background='rgba(109,63,245,0.08)'; card.style.borderColor='rgba(155,89,182,0.35)'; };
            card.onmouseleave = function(){ card.style.background='rgba(255,255,255,0.02)'; card.style.borderColor='rgba(155,89,182,0.15)'; };
            card.onclick = function(){ infShowDetail(idx); };

            var av = document.createElement('div');
            av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6d3ff5,#9b59b6);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden;color:#fff;font-weight:900;';
            if (inf.avatar) { av.innerHTML='<img src="'+inf.avatar+'" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">'; }
            else { av.textContent = (inf.name||'?').charAt(0).toUpperCase(); }
            card.appendChild(av);

            var info = document.createElement('div');
            info.style.cssText = 'flex:1;min-width:0;';
            info.innerHTML = '<div style="font-size:14px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(inf.name||'—')+'</div>'
                +'<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">'
                +(_platIcons[inf.platform]||'●')+' '+(_platLabels[inf.platform]||'')+' · '+(inf.role||'')+'</div>';
            card.appendChild(info);

            if (inf.rank) {
                var badge = document.createElement('span');
                badge.className = 'inf-rank '+inf.rank;
                badge.textContent = _rankLabels[inf.rank]||inf.rank;
                badge.style.flexShrink = '0';
                card.appendChild(badge);
            }

            var dots = document.createElement('div');
            dots.style.cssText = 'display:flex;gap:3px;flex-shrink:0;';
            var hasTier = inf.tierlist && (inf.tierlist.S||inf.tierlist.A||inf.tierlist.B||inf.tierlist.C);
            var hasC = inf.counters && Object.keys(inf.counters).length;
            var hasCo = inf.combos && Object.keys(inf.combos).length;
            if(hasTier) dots.innerHTML+='<span title="Тир-лист" style="font-size:10px;">🏆</span>';
            if(hasC) dots.innerHTML+='<span title="Контр-пики" style="font-size:10px;">🔴</span>';
            if(hasCo) dots.innerHTML+='<span title="Комбо" style="font-size:10px;">🟢</span>';
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
        if(inf.rank){ rk.className='inf-rank '+inf.rank; rk.textContent=_rankLabels[inf.rank]||inf.rank; rk.style.display=''; }
        else { rk.style.display='none'; }

        var avEl = document.getElementById('infDetailAvatar');
        if(inf.avatar){ avEl.innerHTML='<img src="'+inf.avatar+'" style="width:100%;height:100%;object-fit:cover;">'; }
        else { avEl.innerHTML=''; avEl.textContent=(inf.name||'?').charAt(0).toUpperCase(); }

        document.getElementById('infDetailMeta').innerHTML = (_platIcons[inf.platform]||'●')+' '+(_platLabels[inf.platform]||'')+'<br>🎮 '+(inf.role||'Не указана');
        document.getElementById('infDetailLink').href = inf.url||'#';

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
                row.innerHTML='<img src="'+_champImg(champ)+'" style="width:28px;height:28px;border-radius:6px;" onerror="this.style.display=\'none\'">'
                    +'<span style="font-size:12px;font-weight:700;color:#fff;min-width:70px;">'+champ+'</span>'
                    +'<span style="font-size:11px;color:rgba(255,255,255,0.3);">→</span>'
                    +'<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                    +(inf.counters[champ]||[]).map(function(c){return '<img src="'+_champImg(c)+'" title="'+c+'" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(231,76,60,0.3);" onerror="this.style.display=\'none\'">';}).join('')
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
                row.innerHTML='<img src="'+_champImg(champ)+'" style="width:28px;height:28px;border-radius:6px;" onerror="this.style.display=\'none\'">'
                    +'<span style="font-size:12px;font-weight:700;color:#fff;min-width:70px;">'+champ+'</span>'
                    +'<span style="font-size:11px;color:rgba(255,255,255,0.3);">+</span>'
                    +'<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                    +(inf.combos[champ]||[]).map(function(c){return '<img src="'+_champImg(c)+'" title="'+c+'" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(46,204,113,0.3);" onerror="this.style.display=\'none\'">';}).join('')
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
                email: _currentUser.email || '',
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

    // Hook into auth state
    if (auth) {
        auth.onAuthStateChanged(function(user) {
            _currentUser = user || null;
            updateAuthUI(user);
            if (user) {
                loadUserDataFromFirestore();
                startPresence();
                updateChatUI(true);
                checkAdmin();
                startDmNotifListener();
                checkFirstLogin();
            } else {
                stopPresence();
                updateChatUI(false);
                _isAdmin = false;
            }
        });
    }


    // ═══════════════════════════════════════
    // CHAT SYSTEM (v2 — simplified)
    // ═══════════════════════════════════════
    var _chatListener = null;
    var _chatMessages = [];
    var _chatView = 'global'; // 'global' | 'dmList' | 'dm'
    var _dmListener = null;
    var _dmPartnerUid = null;
    var _dmPartnerName = '';
    var _allUsers = [];
    var _myFriends = [];
    var _myFriendReqs = [];
    var _mySentReqs = [];
    var _unreadDmCount = 0;

    function updateChatUI(loggedIn) {
        var inputArea = document.getElementById('chatInputArea');
        var loginPrompt = document.getElementById('chatLoginPrompt');
        if (inputArea) inputArea.style.display = loggedIn ? 'flex' : 'none';
        if (loginPrompt) loginPrompt.style.display = loggedIn ? 'none' : '';
    }

    // ═══ OPEN / CLOSE ═══
    window.openChatSystem = function(tab) {
        openModal('chatSystemMask');
        if (tab === 'users' || tab === 'dmList') {
            switchToDmList();
        } else {
            switchToGlobal();
        }
        loadUsersToSidebar();
        fixMobileKeyboard();
    };
    window.openGlobalChat = window.openChatSystem;

    window.closeChatSystem = function() {
        closeModal('chatSystemMask');
        if (_chatListener) { _chatListener(); _chatListener = null; }
        if (_dmListener) { _dmListener(); _dmListener = null; }
        _dmPartnerUid = null;
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.remove('mobile-open');
        var mask = document.getElementById('chatSystemMask');
        if (mask) { mask.style.height = ''; mask.style.maxHeight = ''; mask.style.top = ''; }
    };
    window.closeGlobalChat = window.closeChatSystem;

    // ═══ TAB SWITCHING (right panel) ═══
    window.switchToGlobal = function() {
        _chatView = 'global';
        if (_dmListener) { _dmListener(); _dmListener = null; }
        _dmPartnerUid = null;
        updateTabUI();
        startChatListener();
        renderGlobalChat();
        var input = document.getElementById('chatInput');
        if (input) input.placeholder = 'Написать сообщение...';
        // Show back btn on mobile only if needed
        var backBtn = document.getElementById('tgBackBtn');
        if (backBtn) backBtn.style.display = 'none';
    };

    window.switchToDmList = function() {
        _chatView = 'dmList';
        if (_dmListener) { _dmListener(); _dmListener = null; }
        _dmPartnerUid = null;
        updateTabUI();
        renderDmList();
        var backBtn = document.getElementById('tgBackBtn');
        if (backBtn) backBtn.style.display = 'none';
    };

    window.tgBackFromDm = function() {
        if (_chatView === 'dm') {
            switchToDmList();
        }
    };

    function updateTabUI() {
        var gTab = document.getElementById('tgTabGlobal');
        var dTab = document.getElementById('tgTabDm');
        var tabs = document.getElementById('tgChatTabs');
        if (gTab) gTab.classList.toggle('active', _chatView === 'global');
        if (dTab) dTab.classList.toggle('active', _chatView === 'dmList' || _chatView === 'dm');
        // Show tabs or back btn
        if (_chatView === 'dm') {
            if (tabs) tabs.style.display = 'none';
            var backBtn = document.getElementById('tgBackBtn');
            if (backBtn) backBtn.style.display = '';
        } else {
            if (tabs) tabs.style.display = '';
        }
    }

    // ═══ MOBILE ═══
    window.tgMobileShowSidebar = function() {
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.add('mobile-open');
    };
    window.tgMobileCloseSidebar = function() {
        var sb = document.getElementById('tgSidebar');
        if (sb) sb.classList.remove('mobile-open');
    };
    window.tgMobileBack = window.tgBackFromDm;

    function fixMobileKeyboard() {
        var vv = window.visualViewport;
        if (!vv) return;
        var mask = document.getElementById('chatSystemMask');
        if (!mask) return;
        function onVV() {
            if (!mask.classList.contains('active')) return;
            mask.style.height = vv.height + 'px';
            mask.style.top = vv.offsetTop + 'px';
            var chatMsgs = document.getElementById('chatMessages');
            if (chatMsgs) setTimeout(function() { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 50);
        }
        vv.addEventListener('resize', onVV);
        vv.addEventListener('scroll', onVV);
    }

    // ═══ USERS SIDEBAR (always shows all users) ═══
    function loadUsersToSidebar() {
        var container = document.getElementById('tgSidebarContent');
        if (!container) return;
        container.innerHTML = '<div class="chat-login-msg">Загрузка...</div>';
        loadFriends(function() {
            loadAllUsers(function() {
                renderUsersSidebar();
            });
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
                countEl.textContent = onl + ' онлайн';
            }
            if (cb) cb();
        }).catch(function(e) { console.warn('Users load err:', e); if (cb) cb(); });
    }

    function renderUsersSidebar() {
        var container = document.getElementById('tgSidebarContent');
        if (!container) return;
        container.innerHTML = '';
        if (!_allUsers.length) { container.innerHTML = '<div class="chat-login-msg">Нет пользователей</div>'; return; }

        _allUsers.forEach(function(u) {
            if (_currentUser && u._uid === _currentUser.uid) return;
            var card = document.createElement('div');
            card.className = 'user-card';
            card.onclick = function() {
                // Close mobile sidebar before opening card
                tgMobileCloseSidebar();
                showUserCard(u);
            };

            var avWrap = document.createElement('div');
            avWrap.className = 'user-av-wrap';
            var av = document.createElement('div');
            av.className = 'user-av';
            if (u.photoURL) av.innerHTML = '<img src="'+u.photoURL+'" onerror="this.style.display=\'none\'">';
            else av.textContent = (u.displayName||'?').charAt(0).toUpperCase();
            avWrap.appendChild(av);
            var dot = document.createElement('div');
            dot.className = 'user-status-dot ' + (u._online ? 'online' : 'offline');
            avWrap.appendChild(dot);
            card.appendChild(avWrap);

            var info = document.createElement('div');
            info.className = 'user-info';
            var nameHtml = '<div class="user-name">'+(u.displayName||u.email||'???')+'</div>';
            var statusHtml = '<div class="user-email">'+(u._online ? '🟢 Онлайн' : 'Оффлайн');
            // Show role & rank inline
            if (u.role) statusHtml += ' · ' + u.role;
            if (u.rank) {
                var rk = RANKS.find(function(r) { return r.id === u.rank; });
                if (rk) statusHtml += ' · <span style="color:'+rk.color+'">'+rk.emoji+' '+rk.name+'</span>';
            }
            statusHtml += '</div>';
            info.innerHTML = nameHtml + statusHtml;
            card.appendChild(info);

            // Friend status indicator
            var isFriend = _myFriends.includes(u._uid);
            var reqSent = _mySentReqs.includes(u._uid);
            var reqReceived = _myFriendReqs.includes(u._uid);
            if (isFriend) {
                var friendBadge = document.createElement('div');
                friendBadge.style.cssText = 'font-size:10px;color:#2ecc71;flex-shrink:0;font-weight:700;';
                friendBadge.textContent = '✓';
                card.appendChild(friendBadge);
            } else if (reqReceived) {
                var reqBadge = document.createElement('div');
                reqBadge.style.cssText = 'font-size:10px;color:#ffd700;flex-shrink:0;font-weight:700;';
                reqBadge.textContent = '📨';
                card.appendChild(reqBadge);
            } else if (reqSent) {
                var sentBadge = document.createElement('div');
                sentBadge.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.25);flex-shrink:0;font-weight:700;';
                sentBadge.textContent = '⏳';
                card.appendChild(sentBadge);
            }

            container.appendChild(card);
        });
    }


    // ═══ GLOBAL CHAT ═══
    function startChatListener() {
        if (_chatListener || !db) return;
        _chatListener = db.collection('globalChat')
            .orderBy('ts', 'asc')
            .limitToLast(100)
            .onSnapshot(function(snap) {
                _chatMessages = [];
                snap.forEach(function(doc) { var d = doc.data(); d._id = doc.id; _chatMessages.push(d); });
                if (_chatView === 'global') renderGlobalChat();
            }, function(err) {
                console.warn('Chat listener error:', err);
                if (err.code === 'permission-denied') {
                    showToast('Нет доступа к чату. Проверьте Firestore Rules.');
                } else {
                    showToast('Ошибка чата: ' + (err.code || err.message));
                }
            });
    }

    function renderGlobalChat() {
        var container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = '';
        // Show/hide input
        var inputArea = document.getElementById('chatInputArea');
        var loginPrompt = document.getElementById('chatLoginPrompt');
        if (inputArea) inputArea.style.display = _currentUser ? 'flex' : 'none';
        if (loginPrompt) loginPrompt.style.display = _currentUser ? 'none' : 'block';

        if (!_chatMessages.length) {
            container.innerHTML = '<div class="chat-login-msg">Напиши первым! 💬</div>';
            return;
        }
        _chatMessages.forEach(function(msg) {
            var isMe = _currentUser && msg.uid === _currentUser.uid;
            renderBubble(container, msg, isMe, true);
        });
        container.scrollTop = container.scrollHeight;
    }

    function renderBubble(container, msg, isMe, showAdmin) {
        var row = document.createElement('div');
        row.className = 'chat-bubble-row' + (isMe ? ' me' : '');

        var av = document.createElement('div');
        av.className = 'chat-bubble-av';
        if (msg.photoURL) av.innerHTML = '<img src="' + msg.photoURL + '" onerror="this.style.display=\'none\'">';
        else av.textContent = (msg.name || '?').charAt(0).toUpperCase();
        row.appendChild(av);

        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        if (msg.isSystem) bubble.style.cssText = 'background:rgba(255,215,0,0.1) !important;border:1px solid rgba(255,215,0,0.2);';

        if (!isMe) {
            var nameEl = document.createElement('div');
            nameEl.className = 'chat-bubble-name' + (showAdmin && msg.isAdmin ? ' admin' : '');
            nameEl.textContent = (showAdmin && msg.isAdmin ? '👑 ' : '') + (msg.name || 'Аноним');
            bubble.appendChild(nameEl);
        }

        var textEl = document.createElement('div');
        textEl.style.fontWeight = '400';
        textEl.textContent = msg.text || '';
        bubble.appendChild(textEl);

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
        row.appendChild(bubble);
        container.appendChild(row);
    }

    // ═══ SEND MESSAGE ═══
    window.tgSendMsg = function() {
        if (_chatView === 'dm' && _dmPartnerUid) sendDmMsg();
        else sendGlobalMsg();
    };

    function sendGlobalMsg() {
        if (!db) { showToast('Firebase не подключён'); return; }
        if (!_currentUser) { showToast('Войди в аккаунт чтобы писать'); return; }
        var input = document.getElementById('chatInput');
        var text = (input.value || '').trim();
        if (!text) return;
        var sendBtn = document.querySelector('.chat-send');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }
        input.value = '';
        db.collection('globalChat').add({
            text: text,
            name: _currentUser.displayName || _currentUser.email || 'Аноним',
            uid: _currentUser.uid,
            photoURL: _currentUser.photoURL || '',
            isAdmin: _isAdmin || false,
            ts: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
            db.collection('globalChat').orderBy('ts','asc').get().then(function(snap) {
                if (snap.size > 100) {
                    var toDelete = snap.size - 100;
                    var batch = db.batch();
                    var i = 0;
                    snap.forEach(function(doc) { if (i < toDelete) { batch.delete(doc.ref); i++; } });
                    batch.commit();
                }
            });
        }).catch(function(err) {
            console.error('Send error:', err);
            if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
            showToast('Ошибка отправки: ' + (err.code || err.message || 'Неизвестная'));
            input.value = text; // restore text
        });
    }
    window.sendChatMsg = sendGlobalMsg;

    function deleteChatMsg(docId) {
        if (!db) return;
        db.collection('globalChat').doc(docId).delete().catch(function(e) { console.warn('Del err:', e); });
    }

    // ═══ DM LIST ═══
    function renderDmList() {
        var container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = '';
        var inputArea = document.getElementById('chatInputArea');
        if (inputArea) inputArea.style.display = 'none';
        var loginPrompt = document.getElementById('chatLoginPrompt');
        if (loginPrompt) loginPrompt.style.display = 'none';

        if (!_currentUser) { container.innerHTML = '<div class="chat-login-msg">Войди чтобы видеть ЛС</div>'; return; }

        // Show friend requests as cards at top
        if (_myFriendReqs.length > 0) {
            var reqHeader = document.createElement('div');
            reqHeader.style.cssText = 'padding:8px 12px;font-size:11px;font-weight:800;color:#ffd700;letter-spacing:0.5px;';
            reqHeader.textContent = '📨 ЗАПРОСЫ В ДРУЗЬЯ';
            container.appendChild(reqHeader);

            _myFriendReqs.forEach(function(uid) {
                db.collection('users').doc(uid).get().then(function(doc) {
                    if (!doc.exists) return;
                    var u = doc.data(); u._uid = doc.id;
                    var card = document.createElement('div');
                    card.className = 'user-card';
                    card.style.background = 'rgba(255,215,0,0.05)';
                    card.style.borderColor = 'rgba(255,215,0,0.2)';

                    var avWrap = document.createElement('div');
                    avWrap.className = 'user-av-wrap';
                    var av = document.createElement('div');
                    av.className = 'user-av';
                    if (u.photoURL) av.innerHTML = '<img src="'+u.photoURL+'" onerror="this.style.display=\'none\'">';
                    else av.textContent = (u.displayName||'?').charAt(0).toUpperCase();
                    avWrap.appendChild(av);
                    card.appendChild(avWrap);

                    var info = document.createElement('div');
                    info.className = 'user-info';
                    info.innerHTML = '<div class="user-name">'+(u.displayName||'???')+'</div><div class="user-email" style="color:#ffd700;">Хочет добавить в друзья</div>';
                    card.appendChild(info);

                    var actions = document.createElement('div');
                    actions.className = 'user-actions';
                    var accBtn = document.createElement('button');
                    accBtn.className = 'user-act-btn'; accBtn.style.color = '#2ecc71';
                    accBtn.textContent = '✓';
                    accBtn.onclick = function(e) { e.stopPropagation(); acceptFriendRequest(u._uid); card.remove(); };
                    actions.appendChild(accBtn);
                    var decBtn = document.createElement('button');
                    decBtn.className = 'user-act-btn'; decBtn.style.color = '#e74c3c';
                    decBtn.textContent = '✕';
                    decBtn.onclick = function(e) { e.stopPropagation(); declineFriendRequest(u._uid); card.remove(); };
                    actions.appendChild(decBtn);
                    card.appendChild(actions);
                    container.insertBefore(card, container.children[1] || null);
                });
            });
        }

        // Show DM contacts (friends)
        var contactUids = _isAdmin ? _allUsers.map(function(u){return u._uid;}).filter(function(uid){return uid!==_currentUser.uid;}) : _myFriends;
        if (!contactUids.length && !_myFriendReqs.length) {
            container.innerHTML = '<div class="chat-login-msg">Добавь друзей чтобы писать ЛС 👥</div>';
            return;
        }

        if (contactUids.length > 0) {
            var dmHeader = document.createElement('div');
            dmHeader.style.cssText = 'padding:8px 12px;font-size:11px;font-weight:800;color:#b96fff;letter-spacing:0.5px;margin-top:6px;';
            dmHeader.textContent = '✉ ДИАЛОГИ';
            container.appendChild(dmHeader);

            contactUids.forEach(function(uid) {
                db.collection('users').doc(uid).get().then(function(doc) {
                    if (!doc.exists) return;
                    var u = doc.data(); u._uid = doc.id;
                    var card = document.createElement('div');
                    card.className = 'user-card';
                    card.onclick = function() { openDmWithUser(u._uid, u.displayName || u.email); };

                    var avWrap = document.createElement('div');
                    avWrap.className = 'user-av-wrap';
                    var av = document.createElement('div');
                    av.className = 'user-av';
                    if (u.photoURL) av.innerHTML = '<img src="'+u.photoURL+'" onerror="this.style.display=\'none\'">';
                    else av.textContent = (u.displayName||'?').charAt(0).toUpperCase();
                    avWrap.appendChild(av);
                    card.appendChild(avWrap);

                    var info = document.createElement('div');
                    info.className = 'user-info';
                    info.innerHTML = '<div class="user-name">'+(u.displayName||'???')+'</div><div class="user-email">Нажми чтобы написать</div>';
                    card.appendChild(info);

                    var arrow = document.createElement('div');
                    arrow.style.cssText = 'color:rgba(255,255,255,0.15);font-size:18px;flex-shrink:0;';
                    arrow.textContent = '›';
                    card.appendChild(arrow);
                    container.appendChild(card);
                });
            });
        }
    }

    // ═══ DM CHAT ═══
    function getDmRoomId(uid1, uid2) {
        return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
    }

    function openDmWithUser(uid, name) {
        _dmPartnerUid = uid;
        _dmPartnerName = name;
        _chatView = 'dm';
        updateTabUI();
        startDmListener();
        var input = document.getElementById('chatInput');
        if (input) input.placeholder = 'Сообщение для ' + name + '...';
        var inputArea = document.getElementById('chatInputArea');
        if (inputArea && _currentUser) inputArea.style.display = 'flex';
    }
    window.openDmChat = openDmWithUser;

    function startDmListener() {
        if (_dmListener) { _dmListener(); _dmListener = null; }
        if (!db || !_currentUser || !_dmPartnerUid) return;
        var roomId = getDmRoomId(_currentUser.uid, _dmPartnerUid);
        _dmListener = db.collection('dms').doc(roomId).collection('messages')
            .orderBy('ts', 'asc').limitToLast(50)
            .onSnapshot(function(snap) {
                var msgs = [];
                snap.forEach(function(doc) { var d = doc.data(); d._id = doc.id; msgs.push(d); });
                renderDmMessages(msgs);
            }, function(err) {
                console.warn('DM listener error:', err);
                if (err.code === 'permission-denied') {
                    showToast('Нет доступа к ЛС. Проверьте Firestore Rules.');
                }
            });
    }

    function renderDmMessages(msgs) {
        var container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = '';
        if (!msgs.length) { container.innerHTML = '<div class="chat-login-msg">Начни разговор! 👋</div>'; return; }
        msgs.forEach(function(msg) {
            var isMe = _currentUser && msg.uid === _currentUser.uid;
            renderBubble(container, msg, isMe, false);
        });
        container.scrollTop = container.scrollHeight;
    }

    function sendDmMsg() {
        if (!db) { showToast('Firebase не подключён'); return; }
        if (!_currentUser) { showToast('Войди в аккаунт'); return; }
        if (!_dmPartnerUid) return;
        var input = document.getElementById('chatInput');
        var text = (input.value || '').trim();
        if (!text) return;
        var sendBtn = document.querySelector('.chat-send');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }
        input.value = '';
        var roomId = getDmRoomId(_currentUser.uid, _dmPartnerUid);
        db.collection('dms').doc(roomId).collection('messages').add({
            text: text,
            name: _currentUser.displayName || _currentUser.email || 'Аноним',
            uid: _currentUser.uid,
            photoURL: _currentUser.photoURL || '',
            ts: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
        }).catch(function(err) {
            console.error('DM send error:', err);
            if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
            showToast('Ошибка отправки ЛС: ' + (err.code || err.message || 'Неизвестная'));
            input.value = text;
        });
    }
    window.sendDmMsg = sendDmMsg;

    // ═══ FRIEND SYSTEM ═══
    function loadFriends(cb) {
        if (!db || !_currentUser) { _myFriends=[]; _myFriendReqs=[]; _mySentReqs=[]; if(cb) cb(); return; }
        db.collection('users').doc(_currentUser.uid).get().then(function(doc) {
            if (doc.exists) {
                var d = doc.data();
                _myFriends = d.friends || [];
                _myFriendReqs = d.friendRequests || [];
                _mySentReqs = d.sentRequests || [];
            } else { _myFriends=[]; _myFriendReqs=[]; _mySentReqs=[]; }
            updateNotifDots();
            if (cb) cb();
        }).catch(function() { _myFriends=[]; _myFriendReqs=[]; _mySentReqs=[]; if(cb) cb(); });
    }

    function sendFriendRequest(uid) {
        if (!db || !_currentUser || uid === _currentUser.uid) return;
        showToast('Отправляем запрос...');
        var batch = db.batch();
        var targetRef = db.collection('users').doc(uid);
        var myRef = db.collection('users').doc(_currentUser.uid);
        batch.set(targetRef, {
            friendRequests: firebase.firestore.FieldValue.arrayUnion(_currentUser.uid)
        }, { merge: true });
        batch.set(myRef, {
            sentRequests: firebase.firestore.FieldValue.arrayUnion(uid)
        }, { merge: true });
        batch.commit().then(function() {
            if (!_mySentReqs.includes(uid)) _mySentReqs.push(uid);
            showToast('✓ Запрос в друзья отправлен!');
            // Send system DM about friend request
            var roomId = getDmRoomId(_currentUser.uid, uid);
            db.collection('dms').doc(roomId).collection('messages').add({
                text: '📨 ' + (_currentUser.displayName || 'Пользователь') + ' хочет добавить тебя в друзья!',
                name: 'Система',
                uid: 'system',
                isSystem: true,
                ts: firebase.firestore.FieldValue.serverTimestamp()
            });
            loadUsersToSidebar();
        }).catch(function(err) {
            console.error('Friend request error:', err);
            showToast('Ошибка: ' + (err.code || err.message || 'не удалось отправить запрос'));
        });
    }

    function acceptFriendRequest(uid) {
        if (!db || !_currentUser) return;
        showToast('Принимаем запрос...');
        var batch = db.batch();
        var myRef = db.collection('users').doc(_currentUser.uid);
        var theirRef = db.collection('users').doc(uid);
        batch.set(myRef, {
            friends: firebase.firestore.FieldValue.arrayUnion(uid),
            friendRequests: firebase.firestore.FieldValue.arrayRemove(uid)
        }, { merge: true });
        batch.set(theirRef, {
            friends: firebase.firestore.FieldValue.arrayUnion(_currentUser.uid),
            sentRequests: firebase.firestore.FieldValue.arrayRemove(_currentUser.uid)
        }, { merge: true });
        batch.commit().then(function() {
            _myFriendReqs = _myFriendReqs.filter(function(r) { return r !== uid; });
            if (!_myFriends.includes(uid)) _myFriends.push(uid);
            updateNotifDots();
            showToast('✓ Теперь вы друзья!');
            loadUsersToSidebar();
            // Send system DM
            var roomId = getDmRoomId(_currentUser.uid, uid);
            db.collection('dms').doc(roomId).collection('messages').add({
                text: '✅ Теперь вы друзья!',
                name: 'Система',
                uid: 'system',
                isSystem: true,
                ts: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).catch(function(err) {
            console.error('Accept friend error:', err);
            showToast('Ошибка: ' + (err.code || err.message || 'не удалось принять запрос'));
        });
    }

    function declineFriendRequest(uid) {
        if (!db || !_currentUser) return;
        db.collection('users').doc(_currentUser.uid).set({
            friendRequests: firebase.firestore.FieldValue.arrayRemove(uid)
        }, { merge: true }).then(function() {
            _myFriendReqs = _myFriendReqs.filter(function(r) { return r !== uid; });
            db.collection('users').doc(uid).set({
                sentRequests: firebase.firestore.FieldValue.arrayRemove(_currentUser.uid)
            }, { merge: true });
            updateNotifDots();
            showToast('Запрос отклонён');
            loadUsersToSidebar();
        }).catch(function(err) {
            console.error('Decline friend error:', err);
            showToast('Ошибка: ' + (err.code || err.message));
        });
    }

    function removeFriend(uid) {
        if (!db || !_currentUser) return;
        showToast('Удаляем из друзей...');
        var batch = db.batch();
        batch.set(db.collection('users').doc(_currentUser.uid), { friends: firebase.firestore.FieldValue.arrayRemove(uid) }, { merge: true });
        batch.set(db.collection('users').doc(uid), { friends: firebase.firestore.FieldValue.arrayRemove(_currentUser.uid) }, { merge: true });
        batch.commit().then(function() {
            _myFriends = _myFriends.filter(function(f) { return f !== uid; });
            showToast('Удалён из друзей');
            loadUsersToSidebar();
        }).catch(function(err) {
            console.error('Remove friend error:', err);
            showToast('Ошибка: ' + (err.code || err.message));
        });
    }

    // ═══ NOTIFICATIONS ═══
    function updateNotifDots() {
        var hasNotif = _myFriendReqs.length > 0 || _unreadDmCount > 0;
        var dot = document.getElementById('authNotifDot');
        if (dot) dot.style.display = hasNotif ? '' : 'none';
        var frBadge = document.getElementById('frReqBadge');
        if (frBadge) {
            frBadge.style.display = _myFriendReqs.length > 0 ? '' : 'none';
            frBadge.textContent = _myFriendReqs.length;
        }
        var dmBadge = document.getElementById('dmUnreadBadge');
        if (dmBadge) {
            dmBadge.style.display = _unreadDmCount > 0 ? '' : 'none';
            dmBadge.textContent = _unreadDmCount;
        }
        var sideBadge = document.getElementById('sidebarChatBadge');
        if (sideBadge) {
            var total = _myFriendReqs.length + _unreadDmCount;
            sideBadge.style.display = total > 0 ? '' : 'none';
            sideBadge.textContent = total;
        }
        var tgDmBadge = document.getElementById('tgDmBadge');
        if (tgDmBadge) {
            var dmTotal = _myFriendReqs.length + _unreadDmCount;
            tgDmBadge.style.display = dmTotal > 0 ? 'flex' : 'none';
            tgDmBadge.textContent = dmTotal;
        }
        var mobBadge = document.getElementById('tgMobBadge');
        if (mobBadge) {
            mobBadge.style.display = hasNotif ? 'flex' : 'none';
            mobBadge.textContent = (_myFriendReqs.length + _unreadDmCount) || '';
        }
    }

    // ═══ LEGACY COMPAT ═══
    window.closeUserMenuAndOpen = function(what) {
        var menu = document.getElementById('userMenu');
        if (menu) menu.classList.remove('active');
        if (what === 'dmInbox') { openChatSystem(); setTimeout(switchToDmList, 100); }
        else if (what === 'friendRequests') { openChatSystem(); setTimeout(switchToDmList, 100); }
        else if (what === 'profile') { openProfileSetup(); }
    };
    window.openUsersList = function() { openChatSystem(); };
    window.closeUsersList = function() {};
    window.closeDmChat = function() { switchToDmList(); };

    function startDmNotifListener() {
        if (!db || !_currentUser) return;
        db.collection('users').doc(_currentUser.uid).onSnapshot(function(doc) {
            if (!doc.exists) return;
            var d = doc.data();
            _myFriendReqs = d.friendRequests || [];
            _myFriends = d.friends || [];
            _mySentReqs = d.sentRequests || [];
            updateNotifDots();
        });
    }

    // ═══════════════════════════════════════
    // PROFILE SETUP
    // ═══════════════════════════════════════
    var _profileRole = '';
    var _profileRank = '';

    var _wrRankBase = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/';
    var RANKS = [
        { id:'iron', name:'Iron', color:'#8B8B8B', img:_wrRankBase+'iron.png', emoji:'⬛' },
        { id:'bronze', name:'Bronze', color:'#CD7F32', img:_wrRankBase+'bronze.png', emoji:'🟫' },
        { id:'silver', name:'Silver', color:'#C0C0C0', img:_wrRankBase+'silver.png', emoji:'⬜' },
        { id:'gold', name:'Gold', color:'#FFD700', img:_wrRankBase+'gold.png', emoji:'🟡' },
        { id:'platinum', name:'Platinum', color:'#00CED1', img:_wrRankBase+'platinum.png', emoji:'🔵' },
        { id:'emerald', name:'Emerald', color:'#50C878', img:_wrRankBase+'emerald.png', emoji:'🟢' },
        { id:'diamond', name:'Diamond', color:'#B9F2FF', img:_wrRankBase+'diamond.png', emoji:'💎' },
        { id:'master', name:'Master', color:'#9B59B6', img:_wrRankBase+'master.png', emoji:'🟣' },
        { id:'grandmaster', name:'GM', color:'#E74C3C', img:_wrRankBase+'grandmaster.png', emoji:'🔴' },
        { id:'challenger', name:'Challenger', color:'#F39C12', img:_wrRankBase+'challenger.png', emoji:'👑' }
    ];
    var ROLES_LIST = ['Top','Jungle','Mid','ADC','Support'];

    window.openProfileSetup = function() {
        openModal('profileSetupMask');
        renderProfileSetup();
    };
    window.closeProfileSetup = function() { closeModal('profileSetupMask'); };

    function renderProfileSetup() {
        var rolesEl = document.getElementById('profileRoles');
        var ranksEl = document.getElementById('profileRanks');
        if (!rolesEl || !ranksEl) return;

        // Load saved profile
        if (_currentUser && db) {
            db.collection('users').doc(_currentUser.uid).get().then(function(doc) {
                if (doc.exists) {
                    var d = doc.data();
                    _profileRole = d.role || '';
                    _profileRank = d.rank || '';
                    drawRoles(); drawRanks();
                }
            });
        }

        drawRoles(); drawRanks();

        function drawRoles() {
            rolesEl.innerHTML = '';
            ROLES_LIST.forEach(function(r) {
                var btn = document.createElement('button');
                btn.style.cssText = 'padding:8px 16px;border-radius:10px;border:1.5px solid '
                    + (_profileRole === r ? '#b96fff' : 'rgba(155,89,182,0.2)')
                    + ';background:' + (_profileRole === r ? 'rgba(109,63,245,0.3)' : 'transparent')
                    + ';color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;';
                btn.textContent = r;
                btn.onclick = function() { _profileRole = r; drawRoles(); };
                rolesEl.appendChild(btn);
            });
        }
        function drawRanks() {
            ranksEl.innerHTML = '';
            RANKS.forEach(function(rk) {
                var btn = document.createElement('button');
                var sel = _profileRank === rk.id;
                btn.style.cssText = 'padding:6px 8px;border-radius:10px;border:1.5px solid '
                    + (sel ? rk.color : 'rgba(155,89,182,0.2)')
                    + ';background:' + (sel ? 'rgba(109,63,245,0.2)' : 'transparent')
                    + ';color:' + rk.color + ';font-size:10px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;transition:all 0.15s;';
                var imgEl = document.createElement('img');
                imgEl.src = rk.img;
                imgEl.style.cssText = 'width:32px;height:32px;object-fit:contain;';
                imgEl.onerror = function() { this.style.display='none'; var sp=document.createElement('span'); sp.style.fontSize='22px'; sp.textContent=rk.emoji; this.parentNode.insertBefore(sp,this); };
                btn.appendChild(imgEl);
                var label = document.createElement('span');
                label.textContent = rk.name;
                btn.appendChild(label);
                btn.onclick = function() { _profileRank = rk.id; drawRanks(); };
                ranksEl.appendChild(btn);
            });
        }
    }

    window.saveProfile = function() {
        if (!db || !_currentUser) { showToast('Войди в аккаунт'); return; }
        if (!_profileRole && !_profileRank) { showToast('Выбери роль и ранг'); return; }
        db.collection('users').doc(_currentUser.uid).set({
            role: _profileRole,
            rank: _profileRank
        }, { merge: true }).then(function() {
            showToast('✓ Профиль сохранён!');
            closeProfileSetup();
            loadUsersToSidebar();
        }).catch(function(err) {
            console.error('Save profile error:', err);
            showToast('Ошибка сохранения: ' + (err.code || err.message));
        });
    };

    // Check if first login — open profile setup
    function checkFirstLogin() {
        if (!db || !_currentUser) return;
        db.collection('users').doc(_currentUser.uid).get().then(function(doc) {
            if (doc.exists) {
                var d = doc.data();
                if (!d.role && !d.rank) {
                    setTimeout(function() { openProfileSetup(); }, 500);
                }
            } else {
                setTimeout(function() { openProfileSetup(); }, 500);
            }
        });
    }

    // ═══════════════════════════════════════
    // USER CARD (click on user in sidebar)
    // ═══════════════════════════════════════
    window.closeUserCard = function() { closeModal('userCardMask'); };

    function showUserCard(user) {
        var container = document.getElementById('userCardContent');
        if (!container) { console.error('userCardContent not found'); return; }
        container.innerHTML = '';

        // Refresh friend data before showing
        var isFriend = _myFriends.includes(user._uid);
        var reqSent = _mySentReqs.includes(user._uid);
        var reqReceived = _myFriendReqs.includes(user._uid);

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'padding:24px 20px 16px;text-align:center;border-bottom:1px solid rgba(155,89,182,0.15);';

        var av = document.createElement('div');
        av.style.cssText = 'width:72px;height:72px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#6d3ff5,#9b59b6);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;font-weight:900;overflow:hidden;border:3px solid rgba(185,111,255,0.3);';
        if (user.photoURL) av.innerHTML = '<img src="'+user.photoURL+'" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
        else av.textContent = (user.displayName||'?').charAt(0).toUpperCase();
        header.appendChild(av);

        var name = document.createElement('div');
        name.style.cssText = 'font-size:17px;font-weight:900;color:#fff;';
        name.textContent = user.displayName || user.email || '???';
        header.appendChild(name);

        var status = document.createElement('div');
        status.style.cssText = 'font-size:12px;color:' + (user._online ? '#2ecc71' : 'rgba(255,255,255,0.35)') + ';margin-top:4px;font-weight:600;';
        status.textContent = user._online ? '🟢 Онлайн' : '⚫ Оффлайн';
        header.appendChild(status);

        // Role & Rank badges
        if (user.role || user.rank) {
            var badges = document.createElement('div');
            badges.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap;';
            if (user.role) {
                var roleBadge = document.createElement('span');
                roleBadge.style.cssText = 'padding:4px 12px;border-radius:8px;background:rgba(109,63,245,0.2);border:1px solid rgba(155,89,182,0.3);color:#b96fff;font-size:12px;font-weight:700;';
                roleBadge.textContent = user.role;
                badges.appendChild(roleBadge);
            }
            if (user.rank) {
                var rk = RANKS.find(function(r) { return r.id === user.rank; });
                if (rk) {
                    var rankBadge = document.createElement('span');
                    rankBadge.style.cssText = 'padding:4px 12px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid '+rk.color+'44;color:'+rk.color+';font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;';
                    var rkImg = document.createElement('img');
                    rkImg.src = rk.img;
                    rkImg.style.cssText = 'width:20px;height:20px;object-fit:contain;';
                    rkImg.onerror = function() { this.outerHTML = rk.emoji; };
                    rankBadge.appendChild(rkImg);
                    rankBadge.appendChild(document.createTextNode(rk.name));
                    badges.appendChild(rankBadge);
                }
            }
            header.appendChild(badges);
        }

        // Friend status label
        if (isFriend) {
            var friendLabel = document.createElement('div');
            friendLabel.style.cssText = 'margin-top:8px;font-size:11px;color:#2ecc71;font-weight:700;';
            friendLabel.textContent = '✓ В друзьях';
            header.appendChild(friendLabel);
        }

        container.appendChild(header);

        // Actions
        var actions = document.createElement('div');
        actions.style.cssText = 'padding:14px 16px;display:flex;flex-direction:column;gap:6px;';

        if (isFriend || _isAdmin) {
            addCardBtn(actions, '✉ Написать ЛС', '#b96fff', function() {
                closeUserCard();
                // Small delay to let modal close animation finish
                setTimeout(function() {
                    if (typeof switchToDmList === 'function') switchToDmList();
                    openDmWithUser(user._uid, user.displayName||user.email);
                }, 150);
            });
        }
        if (!isFriend && !reqSent && !reqReceived) {
            addCardBtn(actions, '+ Добавить в друзья', '#2ecc71', function() {
                sendFriendRequest(user._uid);
                closeUserCard();
            });
        }
        if (reqSent) {
            addCardBtn(actions, '⏳ Запрос отправлен', 'rgba(255,255,255,0.3)', null);
        }
        if (reqReceived) {
            addCardBtn(actions, '✓ Принять запрос', '#2ecc71', function() {
                acceptFriendRequest(user._uid);
                closeUserCard();
            });
            addCardBtn(actions, '✕ Отклонить запрос', '#e74c3c', function() {
                declineFriendRequest(user._uid);
                closeUserCard();
            });
        }
        if (isFriend) {
            addCardBtn(actions, '× Удалить из друзей', '#e74c3c', function() {
                removeFriend(user._uid);
                closeUserCard();
            });
        }
        addCardBtn(actions, '✕ Закрыть', 'rgba(255,255,255,0.4)', function() { closeUserCard(); });
        container.appendChild(actions);

        // Ensure the modal mask is displayed
        var mask = document.getElementById('userCardMask');
        if (mask) {
            mask.style.display = '';
            mask.style.visibility = '';
        }
        openModal('userCardMask');
    }

    function addCardBtn(parent, text, color, onclick) {
        var btn = document.createElement('button');
        btn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid '
            + color + '33;background:none;color:' + color
            + ';font-size:13px;font-weight:700;cursor:pointer;text-align:center;transition:background 0.15s;';
        btn.textContent = text;
        if (onclick) {
            btn.onclick = onclick;
            btn.onmouseover = function() { this.style.background = 'rgba(109,63,245,0.1)'; };
            btn.onmouseout = function() { this.style.background = 'none'; };
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
        }
        parent.appendChild(btn);
    }

})();
