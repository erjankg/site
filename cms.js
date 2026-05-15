// ═══════════════════════════════════════════
// CMS: Загрузка данных из Firestore + Админ-панель
// ═══════════════════════════════════════════

(function() {
  'use strict';

  // Глобальные хранилища данных CMS
  window._cmsItems = null;  // [{name_ru, name_en, cost, stats, description, image, category, order, _id}, ...]
  window._cmsRunes = null;  // [{name_ru, name_en, category, tree, description, image, order, _id}, ...]
  window._cmsLoaded = false;
  window._cmsChangelog = [];

  var ITEM_CATEGORIES = [
    { id: 'physical', label: '⚔ Физические', labelEn: '⚔ Physical' },
    { id: 'magic',    label: '🔮 Магические', labelEn: '🔮 Magic' },
    { id: 'defensive',label: '🛡 Защитные',   labelEn: '🛡 Defensive' },
    { id: 'support',  label: '💛 Поддержка',  labelEn: '💛 Support' },
    { id: 'boots',    label: '👟 Ботинки',    labelEn: '👟 Boots' },
    { id: 'enchants', label: '✨ Зачарования ботинок', labelEn: '✨ Boot Enchants' }
  ];

  var RUNE_TREES = [
    { id: 'keystone',    label: '⭐ ОСНОВНЫЕ РУНЫ',  labelEn: '⭐ KEYSTONE RUNES', color: '' },
    { id: 'domination',  label: '🔴 ДОМИНАЦИЯ',      labelEn: '🔴 DOMINATION',    color: '#e74c3c' },
    { id: 'precision',   label: '🟡 ТОЧНОСТЬ',       labelEn: '🟡 PRECISION',     color: '#f1c40f' },
    { id: 'resolve',     label: '🟢 СТОЙКОСТЬ',      labelEn: '🟢 RESOLVE',       color: '#2ecc71' },
    { id: 'inspiration', label: '🔵 ВДОХНОВЕНИЕ',    labelEn: '🔵 INSPIRATION',   color: '#5dade2' }
  ];

  // ═══════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ ИЗ FIRESTORE
  // ═══════════════════════════════════

  function _cmsLoadChangelogCache() {
    var db = firebase.firestore();
    db.collection('changelog').orderBy('timestamp', 'desc').limit(20).get()
      .then(function(snap) {
        window._cmsChangelogCache = [];
        snap.forEach(function(doc) { var d = doc.data(); d._id = doc.id; window._cmsChangelogCache.push(d); });
      })
      .catch(function() {});
  }

  window.cmsLoadData = function(callback) {
    var db = firebase.firestore();
    var loaded = { items: false, runes: false, icons: false, sidebar: false, texts: false, customTexts: false };

    function checkDone() {
      if (loaded.items && loaded.runes && loaded.icons && loaded.sidebar && loaded.texts && loaded.customTexts) {
        window._cmsLoaded = true;
        if (window.cmsLoadCategories) {
          window.cmsLoadCategories(function() {
            setTimeout(function() {
              if (window._siteTexts && window.cmsApplyAllSiteTexts) window.cmsApplyAllSiteTexts();
              if (window.cmsApplyCustomTexts) window.cmsApplyCustomTexts();
            }, 200);
            if (callback) callback();
            // Грузим changesFeed и changelog в фоне (не блокируем основную загрузку)
            window.cmsLoadChangesFeed && window.cmsLoadChangesFeed();
            _cmsLoadChangelogCache();
          });
        } else {
          setTimeout(function() {
            if (window._siteTexts && window.cmsApplyAllSiteTexts) window.cmsApplyAllSiteTexts();
            if (window.cmsApplyCustomTexts) window.cmsApplyCustomTexts();
          }, 200);
          if (callback) callback();
          window.cmsLoadChangesFeed && window.cmsLoadChangesFeed();
          _cmsLoadChangelogCache();
        }
      }
    }

    // Загрузка иконок
    db.collection('siteIcons').orderBy('order', 'asc').get()
      .then(function(snap) {
        window._siteIcons = {};
        snap.forEach(function(doc) {
          var d = doc.data();
          window._siteIcons[d.name || doc.id] = d.url || '';
        });
        loaded.icons = true;
        checkDone();
      })
      .catch(function() { loaded.icons = true; checkDone(); });

    // Загрузка лейблов сайдбара
    db.collection('siteConfig').doc('sidebar').get()
      .then(function(doc) {
        if (doc.exists && window.cmsLoadSidebarLabels) {
          // Применяем после рендера DOM
          setTimeout(function() {
            var data = doc.data();
            if (data) {
              document.querySelectorAll('#sidePanel .side-btn').forEach(function(btn) {
                var oc = btn.getAttribute('onclick') || '';
                var keys = ['sideChamps','calc','items','runes','draft','draftCoop','tierMenu','globalChat'];
                var defaults = { sideChamps:'Чемпионы', calc:'Калькулятор урона', items:'Предметы',
                  runes:'Руны', draft:'Драфт-помощник', draftCoop:'Драфт (серии)', tierMenu:'Тир-лист', globalChat:'Чат' };
                keys.forEach(function(k) {
                  if ((oc.indexOf("'"+k+"'") !== -1 || oc.indexOf('"'+k+'"') !== -1) && data[k]) {
                    var nodes = btn.childNodes;
                    for (var i = 0; i < nodes.length; i++) {
                      if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                        nodes[i].textContent = data[k]; break;
                      }
                    }
                  }
                });
              });
            }
          }, 100);
        }
        loaded.sidebar = true;
        checkDone();
      })
      .catch(function() { loaded.sidebar = true; checkDone(); });

    // Загрузка глобальных текстов
    window._cmsChangelogCache = window._cmsChangelogCache || [];
    db.collection('siteConfig').doc('texts').get()
      .then(function(doc) {
        window._siteTexts = doc.exists ? doc.data() : {};
        loaded.texts = true;
        checkDone();
      })
      .catch(function() { window._siteTexts = {}; loaded.texts = true; checkDone(); });

    // Загрузка кастомных текстов (все [data-i18n] переопределения)
    db.collection('siteConfig').doc('customTexts').get()
      .then(function(doc) {
        window._customTexts = doc.exists ? doc.data() : {};
        loaded.customTexts = true;
        checkDone();
      })
      .catch(function() { window._customTexts = {}; loaded.customTexts = true; checkDone(); });

    // Загрузка предметов
    db.collection('items').get()
      .then(function(snap) {
        window._cmsItems = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          d._id = doc.id;
          window._cmsItems.push(d);
        });
        // Сортируем клиентсайд (без необходимости Firestore composite index)
        var catOrder = { physical: 0, magic: 1, defensive: 2, support: 3, boots: 4, enchants: 5 };
        window._cmsItems.sort(function(a, b) {
          var ca = catOrder[a.category] !== undefined ? catOrder[a.category] : 99;
          var cb = catOrder[b.category] !== undefined ? catOrder[b.category] : 99;
          return ca !== cb ? ca - cb : (a.order || 0) - (b.order || 0);
        });
        console.log('[CMS] Загружено предметов: ' + window._cmsItems.length);
        loaded.items = true;
        checkDone();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки предметов, используем HTML:', err);
        window._cmsItems = null;
        loaded.items = true;
        checkDone();
      });

    // Загрузка рун
    db.collection('runes').get()
      .then(function(snap) {
        window._cmsRunes = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          d._id = doc.id;
          window._cmsRunes.push(d);
        });
        // Сортируем клиентсайд
        var treeOrder = { keystone: 0, domination: 1, precision: 2, resolve: 3, inspiration: 4 };
        window._cmsRunes.sort(function(a, b) {
          var ta = treeOrder[a.tree] !== undefined ? treeOrder[a.tree] : 99;
          var tb = treeOrder[b.tree] !== undefined ? treeOrder[b.tree] : 99;
          return ta !== tb ? ta - tb : (a.order || 0) - (b.order || 0);
        });
        console.log('[CMS] Загружено рун: ' + window._cmsRunes.length);
        loaded.runes = true;
        checkDone();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки рун, используем HTML:', err);
        window._cmsRunes = null;
        loaded.runes = true;
        checkDone();
      });
  };

  // ═══════════════════════════════════
  // РЕНДЕРИНГ ПРЕДМЕТОВ ИЗ FIRESTORE
  // ═══════════════════════════════════

  window.cmsRenderItems = function() {
    if (!window._cmsItems || !window._cmsItems.length) return false;

    var container = document.querySelector('#itemsMask .m-win');
    if (!container) return false;

    // Сохраняем header
    var header = container.querySelector('.mhdr');

    // Очищаем контейнер, оставляем header
    container.innerHTML = '';
    if (header) container.appendChild(header);

    // Группируем предметы по категориям
    var grouped = {};
    ITEM_CATEGORIES.forEach(function(cat) { grouped[cat.id] = []; });

    window._cmsItems.forEach(function(item) {
      var cat = item.category || 'physical';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Рендерим секции
    var isAdmin = window._isAdmin;
    ITEM_CATEGORIES.forEach(function(cat) {
      var items = grouped[cat.id];
      if (!items || !items.length) return;

      // Заголовок секции
      var label = document.createElement('div');
      label.className = 'items-section-label';
      label.setAttribute('data-cat-id', cat.id);
      label.setAttribute('data-cms-inline', 'itemCats.' + cat.id);
      if (cat.id === 'enchants') label.style.marginTop = '16px';
      // Применяем сохранённые тексты если есть
      var _savedCatText = window._siteTexts && window._siteTexts.itemCats && window._siteTexts.itemCats[cat.id];
      var _catLang = localStorage.getItem('wr_lang') || 'ru';
      if (_savedCatText) {
        label.textContent = _catLang === 'en' ? (_savedCatText.en || cat.labelEn) : _savedCatText.ru;
        if (_savedCatText.color) label.style.color = _savedCatText.color;
      } else {
        label.textContent = (typeof t === 'function' && _catLang === 'en') ? cat.labelEn : cat.label;
      }
      container.appendChild(label);

      if (cat.id === 'enchants') {
        var sub = document.createElement('div');
        sub.className = 'items-section-sublabel';
        var _encSaved = window._siteTexts && window._siteTexts.misc && window._siteTexts.misc.enchantsSubLabel;
        var _encLang = localStorage.getItem('wr_lang') || 'ru';
        if (_encSaved) {
          sub.textContent = _encLang === 'en' ? (_encSaved.en || _encSaved.ru) : _encSaved.ru;
        } else {
          sub.textContent = (typeof t === 'function') ? t('Можно добавить к любым ботинкам') : 'Можно добавить к любым ботинкам';
        }
        container.appendChild(sub);
      }

      // Grid
      var grid = document.createElement('div');
      grid.className = 'items-grid';

      items.forEach(function(item) {
        var card = _createItemCard(item, isAdmin);
        grid.appendChild(card);
      });

      // Кнопка добавления (только для админа)
      if (isAdmin) {
        var addBtn = _createAddButton(function() {
          cmsOpenItemEditor(null, cat.id);
        });
        grid.appendChild(addBtn);
      }

      container.appendChild(grid);
    });

    // Применяем перевод к новым элементам
    if (window.applyLang) window.applyLang();

    return true;
  };

  function _createItemCard(item, isAdmin) {
    // Описание: description_ru (или legacy description) для data-tip, description_en отдельно
    var descRu = item.description_ru || item.description || '';
    var descEn = item.description_en || '';
    var tip = (item.name_ru || '') + '\u00A6' + (item.cost || '') + '\u00A6' + (item.stats || '') + '\u00A6' + descRu;
    var card = document.createElement('div');
    card.className = 'item-card';
    card.setAttribute('data-tip', tip);
    card.setAttribute('data-desc-ru', descRu);
    card.setAttribute('data-desc-en', descEn);
    card.style.position = 'relative';

    var img = document.createElement('img');
    img.src = item.image || '';
    img.alt = item.name_ru || '';
    img.loading = 'lazy';
    img.onerror = function() {
      this.src = '';
      this.style.cssText = 'width:44px;height:44px;background:var(--accent-border);border-radius:6px;display:block;';
    };
    card.appendChild(img);

    // Кнопка редактирования (только для админа)
    if (isAdmin) {
      var editBtn = document.createElement('button');
      editBtn.className = 'cms-edit-btn';
      editBtn.textContent = '✏';
      editBtn.title = 'Редактировать';
      editBtn.onclick = function(e) {
        e.stopPropagation();
        cmsOpenItemEditor(item);
      };
      card.appendChild(editBtn);
    }

    return card;
  }

  // ═══════════════════════════════════
  // РЕНДЕРИНГ РУН ИЗ FIRESTORE
  // ═══════════════════════════════════

  window.cmsRenderRunes = function() {
    if (!window._cmsRunes || !window._cmsRunes.length) return false;

    var container = document.querySelector('#runesMask .m-win');
    if (!container) return false;

    // Сохраняем header
    var header = container.querySelector('.mhdr');

    container.innerHTML = '';
    if (header) container.appendChild(header);

    // Группируем руны по деревьям
    var grouped = {};
    RUNE_TREES.forEach(function(tree) { grouped[tree.id] = []; });

    window._cmsRunes.forEach(function(rune) {
      var tree = rune.tree || 'keystone';
      if (!grouped[tree]) grouped[tree] = [];
      grouped[tree].push(rune);
    });

    var isAdmin = window._isAdmin;
    RUNE_TREES.forEach(function(tree) {
      var runes = grouped[tree.id];
      if (!runes || !runes.length) return;

      // Заголовок секции
      var section = document.createElement('div');
      section.className = 'side-section';
      section.setAttribute('data-tree-id', tree.id);
      section.setAttribute('data-cms-inline', 'runeTrees.' + tree.id);
      section.style.cssText = 'padding:0;margin:' + (tree.id === 'keystone' ? '0 0 8px' : '16px 0 8px') + ';';
      // Применяем сохранённые тексты если есть
      var _savedTreeText = window._siteTexts && window._siteTexts.runeTrees && window._siteTexts.runeTrees[tree.id];
      var _treeLang = localStorage.getItem('wr_lang') || 'ru';
      if (_savedTreeText) {
        section.textContent = _treeLang === 'en' ? (_savedTreeText.en || tree.labelEn) : _savedTreeText.ru;
        section.style.color = _savedTreeText.color !== undefined ? _savedTreeText.color : (tree.color || '');
      } else {
        if (tree.color) section.style.color = tree.color;
        section.textContent = (typeof t === 'function' && _treeLang === 'en') ? tree.labelEn : tree.label;
      }
      container.appendChild(section);

      // Grid
      var grid = document.createElement('div');
      grid.className = 'rune-grid';
      if (tree.id === 'keystone') grid.id = 'runeGridKeystone';

      runes.forEach(function(rune) {
        var card = _createRuneCard(rune, isAdmin);
        grid.appendChild(card);
      });

      // Кнопка добавления (только для админа)
      if (isAdmin) {
        var addBtn = _createAddButton(function() {
          cmsOpenRuneEditor(null, tree.id);
        });
        addBtn.style.borderRadius = '50%';
        addBtn.style.width = '40px';
        addBtn.style.height = '40px';
        grid.appendChild(addBtn);
      }

      container.appendChild(grid);
    });

    // Применяем перевод к новым элементам
    if (window.applyLang) window.applyLang();

    return true;
  };

  function _createRuneCard(rune, isAdmin) {
    var descRu = rune.description_ru || rune.description || '';
    var descEn = rune.description_en || '';
    var tip = (rune.name_ru || '') + '\u00A6' + (rune.category || '') + '\u00A6\u00A6' + descRu;
    var card = document.createElement('div');
    card.className = 'rune-card';
    card.setAttribute('data-tip', tip);
    card.setAttribute('data-desc-ru', descRu);
    card.setAttribute('data-desc-en', descEn);
    card.style.position = 'relative';

    var img = document.createElement('img');
    img.src = rune.image || '';
    img.alt = rune.name_ru || '';
    img.loading = 'lazy';
    img.onerror = function() {
      this.src = '';
      this.style.cssText = 'width:40px;height:40px;background:var(--accent-border);border-radius:50%;display:block;';
    };
    card.appendChild(img);

    var nameDiv = document.createElement('div');
    nameDiv.className = 'rune-card-name';
    nameDiv.textContent = (typeof t === 'function') ? t(rune.name_ru) : rune.name_ru;
    card.appendChild(nameDiv);

    // Кнопка редактирования (только для админа)
    if (isAdmin) {
      var editBtn = document.createElement('button');
      editBtn.className = 'cms-edit-btn';
      editBtn.textContent = '✏';
      editBtn.title = 'Редактировать';
      editBtn.onclick = function(e) {
        e.stopPropagation();
        cmsOpenRuneEditor(rune);
      };
      card.appendChild(editBtn);
    }

    return card;
  }

  function _createAddButton(onClick) {
    var btn = document.createElement('div');
    btn.className = 'cms-add-btn';
    btn.innerHTML = '<span style="font-size:20px;line-height:1;">+</span>';
    btn.title = 'Добавить';
    btn.onclick = onClick;
    return btn;
  }

  // ═══════════════════════════════════
  // РЕДАКТОР ПРЕДМЕТОВ (АДМИН)
  // ═══════════════════════════════════

  window.cmsOpenItemEditor = function(item, defaultCategory) {
    var isNew = !item;
    var data = item ? Object.assign({}, item) : {
      name_ru: '', name_en: '', cost: '', stats: '',
      description_ru: '', description_en: '',
      image: '', category: defaultCategory || 'physical', order: 999
    };
    // Совместимость: если есть старое поле description — переносим в description_ru
    if (!data.description_ru && data.description) data.description_ru = data.description;

    var modal = _createEditorModal('Предмет', isNew, data, [
      { key: 'name_ru', label: 'Название (RU)', type: 'text' },
      { key: 'name_en', label: 'Название (EN)', type: 'text' },
      { key: 'cost', label: 'Цена', type: 'text', placeholder: '3000 г' },
      { key: 'stats', label: 'Статы RU (разделитель: |) — поддерживает [текст|ad] и [icon:name]', type: 'richtext', placeholder: '+40 [Сила атаки|ad]  |  +20 Ускорение умений' },
      { key: 'image', label: 'URL картинки', type: 'text', placeholder: 'https://...' },
      { key: 'category', label: 'Категория', type: 'select', options: ITEM_CATEGORIES.map(function(c) { return { value: c.id, label: c.label }; }) },
      { key: 'description_ru', label: 'Описание (RU) — поддерживает [текст|ad] и [icon:name]', type: 'richtext' },
      { key: 'description_en', label: 'Описание (EN) — пусто = авто-перевод', type: 'richtext', placeholder: 'Passive: Deals [50 AD|ad] physical damage.' }
    ], function(newData) {
      _saveItem(newData, item ? item._id : null, isNew);
    }, item ? function() {
      _deleteItem(item._id, item.name_ru);
    } : null);

    document.body.appendChild(modal);
  };

  function _saveItem(data, docId, isNew) {
    var db = firebase.firestore();
    var slug = docId || _slugify(data.name_en || data.name_ru);

    // Записываем в changelog
    var changeEntry = {
      type: isNew ? 'add' : 'edit',
      entity: 'item',
      name: data.name_ru,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
    };
    if (!isNew) {
      // Сохраняем старые данные для отката
      var oldItem = window._cmsItems.find(function(i) { return i._id === docId; });
      if (oldItem) changeEntry.oldData = JSON.stringify(oldItem);
    }
    changeEntry.newData = JSON.stringify(data);

    db.collection('items').doc(slug).set(data, { merge: true })
      .then(function() {
        // Записываем changelog
        db.collection('changelog').add(changeEntry);

        // Обновляем локальные данные
        if (isNew) {
          data._id = slug;
          window._cmsItems.push(data);
        } else {
          var idx = window._cmsItems.findIndex(function(i) { return i._id === docId; });
          if (idx !== -1) { data._id = docId; window._cmsItems[idx] = data; }
        }

        // Перерисовываем
        cmsRenderItems();
        _reinitItemClicks();
        _showToast(isNew ? 'Предмет добавлен!' : 'Предмет обновлён!', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  function _deleteItem(docId, name) {
    window._showConfirm({ msg: 'Предмет «' + name + '» будет удалён без возможности восстановления.', title: 'Удалить предмет?', confirmText: 'Удалить' }, function() { _deleteItemConfirmed(docId, name); });
  }
  function _deleteItemConfirmed(docId, name) {

    var db = firebase.firestore();
    var oldItem = window._cmsItems.find(function(i) { return i._id === docId; });

    db.collection('items').doc(docId).delete()
      .then(function() {
        // Changelog
        db.collection('changelog').add({
          type: 'delete',
          entity: 'item',
          name: name,
          oldData: JSON.stringify(oldItem),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        // Удаляем из локальных данных
        window._cmsItems = window._cmsItems.filter(function(i) { return i._id !== docId; });
        cmsRenderItems();
        _reinitItemClicks();
        _showToast('Предмет удалён', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  // ═══════════════════════════════════
  // РЕДАКТОР РУН (АДМИН)
  // ═══════════════════════════════════

  window.cmsOpenRuneEditor = function(rune, defaultTree) {
    var isNew = !rune;
    var data = rune ? Object.assign({}, rune) : {
      name_ru: '', name_en: '', category: '', tree: defaultTree || 'keystone',
      description_ru: '', description_en: '', image: '', order: 999
    };
    if (!data.description_ru && data.description) data.description_ru = data.description;

    var modal = _createEditorModal('Руна', isNew, data, [
      { key: 'name_ru', label: 'Название (RU)', type: 'text' },
      { key: 'name_en', label: 'Название (EN)', type: 'text' },
      { key: 'category', label: 'Тип (Ключевая/Доминация/...)', type: 'text' },
      { key: 'image', label: 'URL картинки', type: 'text', placeholder: 'https://...' },
      { key: 'tree', label: 'Дерево', type: 'select', options: RUNE_TREES.map(function(t) { return { value: t.id, label: t.label }; }) },
      { key: 'description_ru', label: 'Описание (RU) — поддерживает [текст|ad] и [icon:name]', type: 'richtext' },
      { key: 'description_en', label: 'Описание (EN) — пусто = авто-перевод', type: 'richtext' }
    ], function(newData) {
      _saveRune(newData, rune ? rune._id : null, isNew);
    }, rune ? function() {
      _deleteRune(rune._id, rune.name_ru);
    } : null);

    document.body.appendChild(modal);
  };

  function _saveRune(data, docId, isNew) {
    var db = firebase.firestore();
    var slug = docId || _slugify(data.name_en || data.name_ru);

    var changeEntry = {
      type: isNew ? 'add' : 'edit',
      entity: 'rune',
      name: data.name_ru,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
    };
    if (!isNew) {
      var oldRune = window._cmsRunes.find(function(r) { return r._id === docId; });
      if (oldRune) changeEntry.oldData = JSON.stringify(oldRune);
    }
    changeEntry.newData = JSON.stringify(data);

    db.collection('runes').doc(slug).set(data, { merge: true })
      .then(function() {
        db.collection('changelog').add(changeEntry);

        if (isNew) {
          data._id = slug;
          window._cmsRunes.push(data);
        } else {
          var idx = window._cmsRunes.findIndex(function(r) { return r._id === docId; });
          if (idx !== -1) { data._id = docId; window._cmsRunes[idx] = data; }
        }

        cmsRenderRunes();
        _reinitRuneClicks();
        _showToast(isNew ? 'Руна добавлена!' : 'Руна обновлена!', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  function _deleteRune(docId, name) {
    window._showConfirm({ msg: 'Руна «' + name + '» будет удалена.', title: 'Удалить руну?', confirmText: 'Удалить' }, function() { _deleteRuneConfirmed(docId, name); });
  }
  function _deleteRuneConfirmed(docId, name) {
    var db = firebase.firestore();
    var oldRune = window._cmsRunes.find(function(r) { return r._id === docId; });

    db.collection('runes').doc(docId).delete()
      .then(function() {
        db.collection('changelog').add({
          type: 'delete',
          entity: 'rune',
          name: name,
          oldData: JSON.stringify(oldRune),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        window._cmsRunes = window._cmsRunes.filter(function(r) { return r._id !== docId; });
        cmsRenderRunes();
        _reinitRuneClicks();
        _showToast('Руна удалена', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  // ═══════════════════════════════════
  // ИСТОРИЯ ИЗМЕНЕНИЙ (CHANGELOG)
  // ═══════════════════════════════════

  window.cmsOpenChangelog = function() {
    var db = firebase.firestore();
    var modal = document.createElement('div');
    modal.className = 'cms-modal-overlay';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h3 style="margin:0;color:#fff;font-size:18px;">📋 История изменений</h3>' +
      '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>' +
      '<div id="cmsChangelogList" style="max-height:60vh;overflow-y:auto;"><div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Загрузка...</div></div>';

    modal.appendChild(win);
    document.body.appendChild(modal);

    db.collection('changelog').orderBy('timestamp', 'desc').limit(50).get()
      .then(function(snap) {
        var list = document.getElementById('cmsChangelogList');
        if (!list) return;
        list.innerHTML = '';

        if (snap.empty) {
          list.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">Нет записей</div>';
          return;
        }

        snap.forEach(function(doc) {
          var d = doc.data();
          var row = document.createElement('div');
          row.style.cssText = 'padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;';

          var typeIcon = d.type === 'add' ? '➕' : d.type === 'delete' ? '🗑' : '✏';
          var entityIcon = d.entity === 'item' ? '📦' : '💎';
          var ts = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('ru') : '—';

          row.innerHTML = '<span style="font-size:16px;">' + typeIcon + entityIcon + '</span>' +
            '<div style="flex:1;"><div style="color:#fff;font-size:13px;font-weight:600;">' + (d.name || '—') + '</div>' +
            '<div style="color:rgba(255,255,255,0.4);font-size:11px;">' + ts + '</div></div>';

          // Кнопка отката
          if (d.type !== 'add' && d.oldData) {
            var rollbackBtn = document.createElement('button');
            rollbackBtn.style.cssText = 'background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.4);color:#e74c3c;font-size:11px;padding:4px 10px;border-radius:8px;cursor:pointer;font-weight:700;';
            rollbackBtn.textContent = '↩ Откат';
            rollbackBtn.onclick = function() {
              _rollbackChange(d, doc.id);
            };
            row.appendChild(rollbackBtn);
          }

          list.appendChild(row);
        });
      });
  };

  function _rollbackChange(changeData, changeDocId) {
    window._showConfirm({ msg: 'Данные «' + changeData.name + '» откатятся к предыдущей версии.', title: 'Откатить изменение?', confirmText: 'Откатить', icon: '↩️', danger: false }, function() { _rollbackChangeConfirmed(changeData, changeDocId); });
  }
  function _rollbackChangeConfirmed(changeData, changeDocId) {
    var db = firebase.firestore();
    var collection = changeData.entity === 'item' ? 'items' : 'runes';
    var oldData = JSON.parse(changeData.oldData);
    var slug = oldData._id || _slugify(oldData.name_en || oldData.name_ru);

    // Удаляем _id из данных перед записью
    delete oldData._id;

    db.collection(collection).doc(slug).set(oldData)
      .then(function() {
        // Перезагружаем данные
        cmsLoadData(function() {
          cmsRenderItems();
          cmsRenderRunes();
          _reinitItemClicks();
          _reinitRuneClicks();
        });
        _showToast('Откат выполнен!', 'success');
        // Закрываем changelog и открываем заново
        var overlay = document.querySelector('.cms-modal-overlay');
        if (overlay) overlay.remove();
        cmsOpenChangelog();
      })
      .catch(function(err) {
        _showToast('Ошибка отката: ' + err.message, 'error');
      });
  }

  // ═══════════════════════════════════
  // UI: МОДАЛКА РЕДАКТОРА
  // ═══════════════════════════════════

  function _createEditorModal(entityName, isNew, data, fields, onSave, onDelete) {
    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    if (window.innerWidth >= 769) overlay.classList.add('cms-fullscreen-editor');
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';

    // Заголовок
    var title = document.createElement('div');
    title.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
    title.innerHTML = '<h3 style="margin:0;color:#fff;font-size:18px;">' + (isNew ? '➕ Новый ' : '✏ Редактировать ') + entityName + '</h3>' +
      '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>';
    win.appendChild(title);

    // Превью картинки
    if (data.image) {
      var preview = document.createElement('img');
      preview.src = data.image;
      preview.style.cssText = 'width:64px;height:64px;border-radius:10px;display:block;margin:0 auto 16px;border:2px solid var(--accent-border);';
      preview.onerror = function() { this.style.display = 'none'; };
      preview.id = 'cmsPreviewImg';
      win.appendChild(preview);
    }

    // Поля формы
    var inputs = {};
    fields.forEach(function(field) {
      var group = document.createElement('div');
      group.style.marginBottom = '12px';

      var label = document.createElement('label');
      label.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
      label.textContent = field.label;
      group.appendChild(label);

      var input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
      } else if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(function(opt) {
          var o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if (data[field.key] === opt.value) o.selected = true;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
      }

      input.className = 'cms-input';
      input.setAttribute('data-field-key', field.key);
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.type !== 'select') input.value = data[field.key] || '';

      // Обновление превью при изменении URL картинки
      if (field.key === 'image') {
        input.addEventListener('input', function() {
          var p = document.getElementById('cmsPreviewImg');
          if (p) p.src = this.value;
          else {
            var newP = document.createElement('img');
            newP.id = 'cmsPreviewImg';
            newP.src = this.value;
            newP.style.cssText = 'width:64px;height:64px;border-radius:10px;display:block;margin:0 auto 16px;border:2px solid var(--accent-border);';
            newP.onerror = function() { this.style.display = 'none'; };
            win.insertBefore(newP, win.children[1]);
          }
        });
      }

      inputs[field.key] = input;
      group.appendChild(input);

      // Кнопка загрузки файла для поля image (Этап 4)
      if (field.key === 'image' && window.cmsCreateUploadButton) {
        var storagePath = entityName === 'Предмет' ? 'items' : 'runes';
        var uploadWidget = window.cmsCreateUploadButton(input, storagePath);
        group.appendChild(uploadWidget);
      }

      win.appendChild(group);
    });

    // Кнопки
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:18px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = isNew ? '➕ Добавить' : '💾 Сохранить';
    saveBtn.onclick = function() {
      var newData = {};
      fields.forEach(function(f) {
        newData[f.key] = f.type === 'select' ? inputs[f.key].value : inputs[f.key].value.trim();
      });
      // Сохраняем order
      newData.order = data.order || 0;
      onSave(newData);
      overlay.remove();
    };
    btnRow.appendChild(saveBtn);

    if (onDelete) {
      var delBtn = document.createElement('button');
      delBtn.className = 'cms-btn-delete';
      delBtn.textContent = '🗑 Удалить';
      delBtn.onclick = function() {
        onDelete();
        overlay.remove();
      };
      btnRow.appendChild(delBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    win.appendChild(btnRow);
    overlay.appendChild(win);
    return overlay;
  }

  // ═══════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════

  function _reinitItemClicks() {
    // Сбрасываем _initDone чтобы openItems пере-инициализировал клики
    document.querySelectorAll('#itemsMask .item-card').forEach(function(card) {
      card._initDone = false;
    });
    // Если модалка открыта, переинициализируем
    var mask = document.getElementById('itemsMask');
    if (mask && mask.classList.contains('active')) {
      window.openItems && window.openItems();
    }
  }

  function _reinitRuneClicks() {
    document.querySelectorAll('#runesMask .rune-card').forEach(function(card) {
      card._clickInit = false;
    });
    var mask = document.getElementById('runesMask');
    if (mask && mask.classList.contains('active')) {
      window.openRunes && window.openRunes();
    }
  }

  function _showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'cms-toast ' + (type || '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function _slugify(str) {
    return (str || 'unnamed').toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9а-яё]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  // ═══════════════════════════════════
  // ОБНОВЛЕНИЕ getItemsByCat / getRunesByCat
  // (переопределяем после загрузки CMS данных)
  // ═══════════════════════════════════

  window.cmsGetItemsByCat = function() {
    if (!window._cmsItems) return null;
    var result = { all: [] };
    ITEM_CATEGORIES.forEach(function(cat) { result[cat.id] = []; });

    window._cmsItems.forEach(function(item) {
      var entry = { name: item.name_ru, img: item.image || '' };
      result.all.push(entry);
      var cat = item.category || 'physical';
      if (!result[cat]) result[cat] = [];
      result[cat].push(entry);
    });
    return result;
  };

  window.cmsGetRunesByCat = function() {
    if (!window._cmsRunes) return null;
    var result = { keystone: [], secondary: [] };

    window._cmsRunes.forEach(function(rune) {
      var entry = { name: rune.name_ru, img: rune.image || '' };
      if (rune.tree === 'keystone') {
        result.keystone.push(entry);
      } else {
        result.secondary.push(entry);
      }
    });
    return result;
  };

  window.cmsGetRunesData = function() {
    if (!window._cmsRunes) return null;
    return window._cmsRunes.map(function(rune) {
      return { name: rune.name_ru, img: rune.image || '' };
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 📊 WINRATES CMS — загрузка из Firestore + админ-редактирование
  // ═══════════════════════════════════════════════════════════════

  window._cmsWinrates = null; // {rank: {role: [{name,wr,ch,pr,br}, ...]}}

  var WR_RANKS = ['чалик','алмаз','мастер','грандмастер','суверен'];
  var WR_ROLES = ['top','jungle','mid','adc','support'];

  // Загрузка винрейтов из Firestore
  window.cmsLoadWinrates = function(callback) {
    var db = firebase.firestore();
    window._cmsWinrates = {};

    db.collection('winrates').get()
      .then(function(snap) {
        snap.forEach(function(doc) {
          window._cmsWinrates[doc.id] = doc.data();
        });
        console.log('[CMS] Загружено рангов винрейтов: ' + Object.keys(window._cmsWinrates).length);
        if (callback) callback();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки винрейтов:', err);
        window._cmsWinrates = null;
        if (callback) callback();
      });
  };

  // Получить WR_DATA для app.js (заменяет хардкод)
  window.cmsGetWinrateData = function() {
    return window._cmsWinrates;
  };

  // ── Админ: редактирование строки винрейта ──

  window.cmsOpenWinrateEditor = function(entry, rank, role) {
    var isNew = !entry;
    var data = entry ? Object.assign({}, entry) : {
      name: '', wr: 50, ch: null, pr: 1, br: 0
    };

    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';

    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h3 style="margin:0;color:#fff;font-size:18px;">' + (isNew ? '➕ Новый чемпион' : '✏ ' + data.name) + '</h3>' +
      '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>';

    var fields = [
      { key: 'name', label: 'Имя (EN DDragon key)', placeholder: 'Aatrox' },
      { key: 'wr', label: 'Win Rate %', placeholder: '50.00', type: 'number' },
      { key: 'pr', label: 'Pick Rate %', placeholder: '5.00', type: 'number' },
      { key: 'br', label: 'Ban Rate %', placeholder: '2.00', type: 'number' },
    ];

    var inputs = {};
    fields.forEach(function(f) {
      var group = document.createElement('div');
      group.style.marginBottom = '12px';

      var label = document.createElement('label');
      label.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
      label.textContent = f.label;
      group.appendChild(label);

      var input = document.createElement('input');
      input.type = f.type || 'text';
      input.className = 'cms-input';
      if (f.placeholder) input.placeholder = f.placeholder;
      input.value = data[f.key] != null ? data[f.key] : '';
      if (f.type === 'number') input.step = '0.01';
      inputs[f.key] = input;
      group.appendChild(input);
      win.appendChild(group);
    });

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:18px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = isNew ? '➕ Добавить' : '💾 Сохранить';
    saveBtn.onclick = function() {
      var newData = {
        name: inputs.name.value.trim(),
        wr: parseFloat(inputs.wr.value) || 0,
        ch: null,
        pr: parseFloat(inputs.pr.value) || 0,
        br: parseFloat(inputs.br.value) || 0,
      };
      if (!newData.name) { _showToast('Имя не может быть пустым', 'error'); return; }
      _saveWinrateEntry(newData, entry, rank, role);
      overlay.remove();
    };
    btnRow.appendChild(saveBtn);

    if (!isNew) {
      var delBtn = document.createElement('button');
      delBtn.className = 'cms-btn-delete';
      delBtn.textContent = '🗑 Удалить';
      (function(_data, _entry, _rank, _role, _overlay) {
        delBtn.onclick = function() {
          window._showConfirm({ msg: '«' + _data.name + '» будет убран из винрейтов.', title: 'Удалить запись?', confirmText: 'Удалить' }, function() {
            _deleteWinrateEntry(_entry, _rank, _role);
            _overlay.remove();
          });
        };
      }(data, entry, rank, role, overlay));
      btnRow.appendChild(delBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    win.appendChild(btnRow);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  function _saveWinrateEntry(newData, oldEntry, rank, role) {
    var db = firebase.firestore();

    // Обновляем локальные данные
    if (!window._cmsWinrates) window._cmsWinrates = {};
    if (!window._cmsWinrates[rank]) window._cmsWinrates[rank] = {};
    if (!window._cmsWinrates[rank][role]) window._cmsWinrates[rank][role] = [];

    var list = window._cmsWinrates[rank][role];
    if (oldEntry) {
      // Редактирование — находим и заменяем
      var idx = list.findIndex(function(e) { return e.name === oldEntry.name; });
      if (idx !== -1) list[idx] = newData;
      else list.push(newData);
    } else {
      list.push(newData);
    }

    // Сохраняем весь документ ранга
    var docData = {};
    WR_ROLES.forEach(function(r) {
      docData[r] = (window._cmsWinrates[rank] && window._cmsWinrates[rank][r]) || [];
    });

    db.collection('winrates').doc(rank).set(docData)
      .then(function() {
        // Changelog
        db.collection('changelog').add({
          type: oldEntry ? 'edit' : 'add',
          entity: 'winrate',
          name: newData.name + ' (' + rank + '/' + role + ')',
          newData: JSON.stringify(newData),
          oldData: oldEntry ? JSON.stringify(oldEntry) : null,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });
        // Перерисовка
        if (window.wrprRenderFromCMS) window.wrprRenderFromCMS();
        _showToast(oldEntry ? 'Винрейт обновлён!' : 'Чемпион добавлен!', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  function _deleteWinrateEntry(entry, rank, role) {
    var db = firebase.firestore();

    if (!window._cmsWinrates || !window._cmsWinrates[rank] || !window._cmsWinrates[rank][role]) return;

    window._cmsWinrates[rank][role] = window._cmsWinrates[rank][role].filter(function(e) {
      return e.name !== entry.name;
    });

    var docData = {};
    WR_ROLES.forEach(function(r) {
      docData[r] = (window._cmsWinrates[rank] && window._cmsWinrates[rank][r]) || [];
    });

    db.collection('winrates').doc(rank).set(docData)
      .then(function() {
        db.collection('changelog').add({
          type: 'delete',
          entity: 'winrate',
          name: entry.name + ' (' + rank + '/' + role + ')',
          oldData: JSON.stringify(entry),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });
        if (window.wrprRenderFromCMS) window.wrprRenderFromCMS();
        _showToast('Чемпион удалён из винрейтов', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  // ═══════════════════════════════════════════════════════════════
  // 📥 BULK-ИМПОРТ ВИНРЕЙТОВ С lolm.qq.com
  // Вставка таблицы → автопарс → diff-превью → batch-сохранение
  // ═══════════════════════════════════════════════════════════════

  // Словарь: китайское имя → DDragon-ключ (как в Firestore winrates).
  // Используются официальные имена с lolm.qq.com + популярные прозвища.
  var LOLM_CN_TO_DDRAGON = {
    '剑魔':'Aatrox','暗裔剑魔':'Aatrox',
    '阿狸':'Ahri','狐狸':'Ahri',
    '阿卡丽':'Akali',
    '阿克尚':'Akshan',
    '牛头':'Alistar','牛头酋长':'Alistar',
    '安蓓萨':'Ambessa',
    '木乃伊':'Amumu','阿木木':'Amumu',
    '安妮':'Annie',
    '厄斐琉斯':'Aphelios',
    '寒冰':'Ashe','寒冰射手':'Ashe',
    '翱锐龙兽':'AurelionSol','龙王':'AurelionSol',
    '奥罗拉':'Aurora',
    '巴德':'Bard',
    '机器人':'Blitzcrank','蒸汽机器人':'Blitzcrank',
    '火男':'Brand','复仇焰魂':'Brand',
    '布隆':'Braum',
    '女警':'Caitlyn','凯特琳':'Caitlyn',
    '卡蜜尔':'Camille','卡密尔':'Camille',
    '卡西奥佩娅':'Cassiopeia','蛇女':'Cassiopeia',
    '大虫子':'Chogath','虚空恐惧':'Chogath','科加斯':'Chogath',
    '飞机':'Corki','英勇投弹手':'Corki',
    '诺手':'Darius','德莱厄斯':'Darius',
    '皎月':'Diana',
    '德莱文':'Draven',
    '蒙多':'DrMundo','蒙多医生':'DrMundo',
    '艾克':'Ekko',
    '蜘蛛女皇':'Elise','伊莉丝':'Elise',
    '寡妇':'Evelynn','伊芙琳':'Evelynn',
    '伊泽瑞尔':'Ezreal','EZ':'Ezreal','探险家':'Ezreal',
    '稻草人':'Fiddlesticks','费德提克':'Fiddlesticks',
    '剑姬':'Fiora','菲奥娜':'Fiora',
    '小鱼人':'Fizz','菲兹':'Fizz',
    '加里奥':'Galio',
    '船长':'Gangplank','普朗克':'Gangplank',
    '盖伦':'Garen','德玛西亚之力':'Garen',
    '纳尔':'Gnar',
    '酒桶':'Gragas','古拉加斯':'Gragas',
    '男枪':'Graves','格雷福斯':'Graves',
    '格温':'Gwen',
    '半人马':'Hecarim','赫卡里姆':'Hecarim',
    '大头':'Heimerdinger','黑默丁格':'Heimerdinger',
    '俄洛伊':'Illaoi','章鱼姐':'Illaoi',
    '刀妹':'Irelia','伊瑞莉娅':'Irelia',
    '艾翁':'Ivern',
    '风女':'Janna','迦娜':'Janna',
    '皇子':'JarvanIV','嘉文':'JarvanIV','嘉文四世':'JarvanIV',
    '武器':'Jax','贾克斯':'Jax','武器大师':'Jax',
    '杰斯':'Jayce',
    '烬':'Jhin',
    '金克丝':'Jinx',
    '卡莎':'Kaisa',
    '复仇之矛':'Kalista','卡莉丝塔':'Kalista',
    '卡尔玛':'Karma',
    '死歌':'Karthus','卡尔萨斯':'Karthus',
    '卡萨丁':'Kassadin',
    '卡特':'Katarina','卡特琳娜':'Katarina',
    '凯尔':'Kayle',
    '凯隐':'Kayn',
    '凯南':'Kennen',
    '螳螂':'Khazix','卡兹克':'Khazix',
    '千珏':'Kindred',
    '大嘴':'KogMaw','克格莫':'KogMaw',
    '妖姬':'LeBlanc','乐芙兰':'LeBlanc',
    '瞎子':'LeeSin','李青':'LeeSin',
    '日女':'Leona','蕾欧娜':'Leona',
    '莉莉娅':'Lillia',
    '冰女':'Lissandra','丽桑卓':'Lissandra',
    '卢锡安':'Lucian',
    '璐璐':'Lulu',
    '拉克丝':'Lux',
    '石头人':'Malphite','墨菲特':'Malphite',
    '树人':'Maokai','茂凯':'Maokai',
    '易大师':'MasterYi','大师':'MasterYi',
    '梅尔':'Mel','米尔':'Mel',
    '米利欧':'Milio',
    '厄运小姐':'MissFortune','MF':'MissFortune','赏金':'MissFortune',
    '莫德凯撒':'Mordekaiser','MK':'Mordekaiser',
    '莫甘娜':'Morgana',
    '娜美':'Nami',
    '狗头':'Nasus','内瑟斯':'Nasus',
    '泰坦':'Nautilus','诺提勒斯':'Nautilus',
    '妮蔻':'Neeko',
    '豹女':'Nidalee','奈德丽':'Nidalee',
    '尼菈':'Nilah',
    '梦魇':'Nocturne','魔腾':'Nocturne',
    '诺拉':'Norra',
    '努努':'Nunu','雪人骑士':'Nunu',
    '奥拉夫':'Olaf',
    '发条':'Orianna','奥莉安娜':'Orianna',
    '奥恩':'Ornn',
    '潘森':'Pantheon',
    '波比':'Poppy',
    '派克':'Pyke',
    '奇亚娜':'Qiyana',
    '奎因':'Quinn',
    '洛':'Rakan',
    '龟':'Rammus','拉莫斯':'Rammus','披甲龙龟':'Rammus',
    '雷尔':'Rell',
    '鳄鱼':'Renekton','雷克顿':'Renekton',
    '狮子狗':'Rengar','雷恩加尔':'Rengar',
    '锐雯':'Riven',
    '蹦蹦':'Rumble','兰博':'Rumble',
    '瑞兹':'Ryze',
    '莎弥拉':'Samira','萨米拉':'Samira',
    '赛娜':'Senna',
    '萨勒芬妮':'Seraphine','萨弗温妮':'Seraphine',
    '瑟特':'Sett',
    '小丑':'Shaco','萨科':'Shaco',
    '慎':'Shen',
    '龙女':'Shyvana','希瓦娜':'Shyvana',
    '炼金':'Singed','辛吉德':'Singed',
    '塞恩':'Sion',
    '战争女神':'Sivir','希维尔':'Sivir',
    '思蒙德':'Smolder','斯莫德':'Smolder',
    '琴女':'Sona','娑娜':'Sona',
    '索拉卡':'Soraka',
    '斯维因':'Swain','斯韦因':'Swain',
    '辛德拉':'Syndra',
    '男刀':'Talon','泰隆':'Talon',
    '提莫':'Teemo',
    '锤石':'Thresh',
    '小炮':'Tristana','崔丝塔娜':'Tristana',
    '蛮王':'Tryndamere','泰达米尔':'Tryndamere',
    '卡牌':'TwistedFate','崔斯特':'TwistedFate','TF':'TwistedFate',
    '老鼠':'Twitch','图奇':'Twitch',
    '武当':'Udyr','乌迪尔':'Udyr',
    '厄加特':'Urgot',
    '韦鲁斯':'Varus',
    '薇恩':'Vayne','VN':'Vayne',
    '维迦':'Veigar',
    '大眼':'Velkoz','维克兹':'Velkoz',
    '蔚':'Vi',
    '佛耶戈':'Viego','破败王':'Viego',
    '维克托':'Viktor',
    '弗拉基米尔':'Vladimir','吸血鬼':'Vladimir',
    '狗熊':'Volibear','沃利贝尔':'Volibear',
    '狼人':'Warwick','沃里克':'Warwick','WW':'Warwick',
    '猴子':'Wukong','孙悟空':'Wukong',
    '霞':'Xayah',
    '赵信':'XinZhao',
    '亚索':'Yasuo',
    '永恩':'Yone',
    '约里克':'Yorick',
    '悠米':'Yuumi',
    '劫':'Zed',
    '泽丽':'Zeri',
    '吉格斯':'Ziggs',
    '基兰':'Zilean','时光老人':'Zilean',
    '婕拉':'Zyra'
  };

  // Английские/латинские ключи — для случая если в строке вместо китайского имени английское.
  // Берём из объединения уже знакомых ключей словаря.
  var LOLM_KNOWN_DDRAGON = null;
  function _lolmEnSet() {
    if (LOLM_KNOWN_DDRAGON) return LOLM_KNOWN_DDRAGON;
    var s = {};
    Object.keys(LOLM_CN_TO_DDRAGON).forEach(function(k) { s[LOLM_CN_TO_DDRAGON[k].toLowerCase()] = LOLM_CN_TO_DDRAGON[k]; });
    LOLM_KNOWN_DDRAGON = s;
    return s;
  }

  // Распознать имя героя из ячейки таблицы. Возвращает DDragon-ключ или null.
  function _matchChampionName(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    if (!s) return null;
    // Прямое совпадение по китайскому
    if (LOLM_CN_TO_DDRAGON[s]) return LOLM_CN_TO_DDRAGON[s];
    // Английское/латинское (нечувствительно к регистру и пробелам, как "Lee Sin" → "LeeSin")
    var noSpace = s.replace(/\s+/g,'').toLowerCase();
    var en = _lolmEnSet();
    if (en[noSpace]) return en[noSpace];
    // Точка для имён вроде "Dr. Mundo", "Jarvan IV"
    var noDots = noSpace.replace(/[\.\-']/g,'');
    if (en[noDots]) return en[noDots];
    return null;
  }

  // Парсер таблицы из буфера обмена.
  // Принимает строку (TSV / много пробелов / смешанные разделители).
  // Возвращает {rows: [{name, wr, pr, br, _rawName, _matched}], errors: [...]}
  function _parseLolmTable(text, columnOrder) {
    // columnOrder: 'wr-br-pr' (default lolm) | 'wr-pr-br' | 'wr-only'
    var result = { rows: [], errors: [] };
    if (!text) return result;

    var lines = text.split(/\r?\n/);
    lines.forEach(function(line, idx) {
      var trimmed = line.trim();
      if (!trimmed) return;

      // Разбить на ячейки: tab или 2+ пробелов
      var cells = trimmed.split(/\t+|\s{2,}/).map(function(c){ return c.trim(); }).filter(function(c){ return c.length > 0; });
      if (cells.length < 2) return;

      // Найти ячейку-имя: первая, в которой есть китайские иероглифы ИЛИ это распознаваемое латинское имя
      var nameCell = null;
      var nameIdx = -1;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        // Игнор шапки таблицы (排名/英雄/胜率/Ban率/出场率/Pick/Win/Ban)
        if (/^(排名|英雄|胜率|败率|ban率|出场率|登场率|pick|win|ban|rank|name|hero|champion|wr|pr|br|tier|kda)$/i.test(c)) {
          continue;
        }
        // Игнор чистых чисел (с %)
        if (/^-?\d+([\.,]\d+)?%?$/.test(c)) continue;
        // Игнор тиров S/A/B/C/T1
        if (/^(s\+|s|a\+|a|b\+|b|c\+|c|d|t\d)$/i.test(c)) continue;
        // Имя
        if (/[一-鿿]/.test(c) || _matchChampionName(c)) {
          nameCell = c;
          nameIdx = i;
          break;
        }
      }
      if (!nameCell) return; // Не нашли имя — пропускаем (это шапка/мусор)

      var matched = _matchChampionName(nameCell);

      // Собрать все проценты из остальных ячеек (по порядку появления)
      var nums = [];
      cells.forEach(function(c, i) {
        if (i === nameIdx) return;
        var m = c.match(/^-?(\d+([\.,]\d+)?)%?$/);
        if (m) {
          var v = parseFloat(m[1].replace(',', '.'));
          if (!isNaN(v)) nums.push(v);
        }
      });

      // Не нашли ни одного числа — пропускаем (мусор)
      if (nums.length === 0) return;

      var wr = null, pr = null, br = null;
      if (columnOrder === 'wr-pr-br') {
        wr = nums[0]; pr = nums[1] != null ? nums[1] : 0; br = nums[2] != null ? nums[2] : 0;
      } else if (columnOrder === 'wr-only') {
        wr = nums[0]; pr = 0; br = 0;
      } else {
        // default lolm.qq.com: WR, BR, PR
        wr = nums[0]; br = nums[1] != null ? nums[1] : 0; pr = nums[2] != null ? nums[2] : 0;
      }

      // Валидация WR (должен быть в диапазоне 30-70%)
      if (wr == null || wr < 20 || wr > 80) {
        result.errors.push('Строка ' + (idx+1) + ': WR=' + wr + '% (вне 20-80%), пропущена');
        return;
      }

      result.rows.push({
        name: matched || nameCell,
        wr: Math.round(wr * 100) / 100,
        ch: null,
        pr: Math.round((pr || 0) * 100) / 100,
        br: Math.round((br || 0) * 100) / 100,
        _rawName: nameCell,
        _matched: !!matched
      });
    });

    return result;
  }

  // Вычислить diff: что добавится / изменится / удалится по сравнению с текущим состоянием
  function _computeWinrateDiff(currentList, newList) {
    var curByName = {};
    (currentList || []).forEach(function(e) { curByName[e.name] = e; });
    var newByName = {};
    newList.forEach(function(e) { newByName[e.name] = e; });

    var added = [], changed = [], removed = [];
    newList.forEach(function(n) {
      var old = curByName[n.name];
      if (!old) added.push(n);
      else if (old.wr !== n.wr || old.pr !== n.pr || old.br !== n.br) changed.push({ old: old, new: n });
    });
    (currentList || []).forEach(function(o) {
      if (!newByName[o.name]) removed.push(o);
    });
    return { added: added, changed: changed, removed: removed };
  }

  window.cmsOpenWinrateBulkImport = function() {
    if (!window._isAdmin) return;
    if (!firebase || !firebase.firestore) {
      _showToast('Firebase не загружен', 'error');
      return;
    }

    // Запомненный порядок колонок
    var savedOrder = null;
    try { savedOrder = localStorage.getItem('cms_wr_import_order'); } catch(e) {}
    var columnOrder = savedOrder || 'wr-br-pr';

    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.maxWidth = '720px';
    win.style.width = '92vw';
    win.style.maxHeight = '88vh';
    win.style.overflowY = 'auto';

    // Заголовок
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
    hdr.innerHTML = '<h3 style="margin:0;color:#fff;font-size:18px;">📥 Импорт винрейтов с lolm.qq.com</h3>' +
      '<button class="cms-bulk-close" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>';
    hdr.querySelector('.cms-bulk-close').onclick = function() { overlay.remove(); };
    win.appendChild(hdr);

    // Инструкция
    var help = document.createElement('div');
    help.style.cssText = 'background:rgba(11,196,227,0.08);border:1px solid rgba(11,196,227,0.25);border-radius:10px;padding:10px 12px;margin-bottom:14px;color:rgba(255,255,255,0.75);font-size:12px;line-height:1.5;';
    help.innerHTML = '1. Открой <a href="https://lolm.qq.com/act/a20220818raider/index.html" target="_blank" style="color:#0bc4e3;">lolm.qq.com</a> → выбери ранг и роль<br>' +
      '2. Выдели таблицу на странице (имя + WR + BR + PR) и нажми Ctrl+C<br>' +
      '3. Выбери ниже тот же ранг и роль и вставь в поле<br>' +
      '4. Нажми «Распарсить» → проверь diff → «Сохранить»';
    win.appendChild(help);

    // Селекторы ранга и роли
    var sel = document.createElement('div');
    sel.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;';
    var rankOpts = WR_RANKS.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join('');
    var roleOpts = WR_ROLES.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join('');
    sel.innerHTML =
      '<div><label style="display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Ранг</label>' +
        '<select class="cms-input cms-bulk-rank">'+rankOpts+'</select></div>' +
      '<div><label style="display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Роль</label>' +
        '<select class="cms-input cms-bulk-role">'+roleOpts+'</select></div>';
    win.appendChild(sel);

    // Дефолтные значения из текущего состояния UI
    var rankSelect = sel.querySelector('.cms-bulk-rank');
    var roleSelect = sel.querySelector('.cms-bulk-role');
    try {
      // app.js хранит _wrprRank/_wrprRole в замыкании, но через wrprRender знаем активный.
      // Пытаемся вытащить из активных кнопок-фильтров.
      var rr = document.querySelector('#wrprRankRow button[style*="rgba(46, 204, 113"]');
      var ro = document.querySelector('#wrprRoleRow button[style*="border-color: rgb"]');
      if (rr && rr.dataset.rank) rankSelect.value = rr.dataset.rank;
      if (ro && ro.dataset.role) roleSelect.value = ro.dataset.role;
    } catch(e) {}

    // Порядок колонок
    var order = document.createElement('div');
    order.style.cssText = 'margin-bottom:10px;';
    order.innerHTML =
      '<label style="display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Порядок чисел в строке</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<label class="cms-bulk-order-lbl"><input type="radio" name="cmsOrd" value="wr-br-pr"'+(columnOrder==='wr-br-pr'?' checked':'')+'> WR → BR → PR <span style="color:rgba(255,255,255,0.4);">(lolm.qq.com)</span></label>' +
        '<label class="cms-bulk-order-lbl"><input type="radio" name="cmsOrd" value="wr-pr-br"'+(columnOrder==='wr-pr-br'?' checked':'')+'> WR → PR → BR</label>' +
        '<label class="cms-bulk-order-lbl"><input type="radio" name="cmsOrd" value="wr-only"'+(columnOrder==='wr-only'?' checked':'')+'> Только WR</label>' +
      '</div>';
    // Стили radio-лейблов
    Array.prototype.forEach.call(order.querySelectorAll('.cms-bulk-order-lbl'), function(l){
      l.style.cssText = 'color:rgba(255,255,255,0.85);font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;';
    });
    win.appendChild(order);

    // Textarea
    var ta = document.createElement('textarea');
    ta.className = 'cms-input';
    ta.placeholder = 'Вставь сюда таблицу с lolm.qq.com (Ctrl+V)…\n\nПример:\n剑魔\t49.5%\t5.34%\t5.91%\n亚索\t48.4%\t23.5%\t3.19%';
    ta.style.cssText = 'width:100%;min-height:180px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.4;margin-bottom:10px;';
    win.appendChild(ta);

    // Превью diff
    var preview = document.createElement('div');
    preview.style.cssText = 'min-height:60px;max-height:260px;overflow-y:auto;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;font-size:12px;color:rgba(255,255,255,0.65);margin-bottom:12px;';
    preview.textContent = 'Превью diff появится после парсинга…';
    win.appendChild(preview);

    // Кнопки
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var parseBtn = document.createElement('button');
    parseBtn.className = 'cms-btn-save';
    parseBtn.textContent = '🔍 Распарсить';
    parseBtn.style.background = 'rgba(241,196,15,0.18)';
    parseBtn.style.color = '#f1c40f';
    parseBtn.style.borderColor = 'rgba(241,196,15,0.35)';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = '💾 Сохранить';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
    saveBtn.style.cursor = 'not-allowed';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };

    btnRow.appendChild(parseBtn);
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    win.appendChild(btnRow);

    overlay.appendChild(win);
    document.body.appendChild(overlay);

    // Состояние парсинга
    var parsedRows = null;
    var parsedRank = null;
    var parsedRole = null;

    function getColumnOrder() {
      var checked = order.querySelector('input[name="cmsOrd"]:checked');
      return checked ? checked.value : 'wr-br-pr';
    }

    parseBtn.onclick = function() {
      var rank = rankSelect.value;
      var role = roleSelect.value;
      var ord = getColumnOrder();
      try { localStorage.setItem('cms_wr_import_order', ord); } catch(e) {}

      var text = ta.value || '';
      if (!text.trim()) {
        _showToast('Поле пустое — вставь таблицу', 'error');
        return;
      }

      var parsed = _parseLolmTable(text, ord);
      if (parsed.rows.length === 0) {
        preview.innerHTML = '<div style="color:#e74c3c;font-weight:700;">❌ Не удалось распознать ни одной строки.</div>' +
          '<div style="margin-top:6px;color:rgba(255,255,255,0.5);">Проверь что выделил именно таблицу с именами и числами WR/BR/PR.</div>';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        return;
      }

      // Отделяем распознанные от нераспознанных
      var unknown = parsed.rows.filter(function(r){ return !r._matched; });
      var known = parsed.rows.filter(function(r){ return r._matched; });

      // Текущее состояние
      var curList = (window._cmsWinrates && window._cmsWinrates[rank] && window._cmsWinrates[rank][role]) || [];
      var diff = _computeWinrateDiff(curList, known);

      // Рисуем превью
      var html = '';
      html += '<div style="color:#0bc4e3;font-weight:700;margin-bottom:6px;">📊 Распознано строк: ' + parsed.rows.length + ' (' + known.length + ' с известными именами)</div>';

      if (unknown.length) {
        html += '<div style="color:#e74c3c;font-weight:700;margin-top:8px;">⚠ Не распознано (' + unknown.length + ') — будут пропущены:</div>';
        html += '<div style="color:rgba(231,76,60,0.85);font-size:11px;margin-left:10px;">' +
          unknown.map(function(r){ return '• ' + _esc(r._rawName) + ' (WR ' + r.wr + '%)'; }).join('<br>') + '</div>';
      }

      if (diff.added.length) {
        html += '<div style="color:#2ecc71;font-weight:700;margin-top:8px;">➕ Добавится (' + diff.added.length + '):</div>';
        html += '<div style="color:rgba(46,204,113,0.85);font-size:11px;margin-left:10px;">' +
          diff.added.map(function(r){ return '• ' + _esc(r.name) + ' — WR ' + r.wr + '%, PR ' + r.pr + '%, BR ' + r.br + '%'; }).join('<br>') + '</div>';
      }

      if (diff.changed.length) {
        html += '<div style="color:#f1c40f;font-weight:700;margin-top:8px;">📝 Изменится (' + diff.changed.length + '):</div>';
        html += '<div style="color:rgba(241,196,15,0.85);font-size:11px;margin-left:10px;">' +
          diff.changed.map(function(c){
            var parts = [];
            if (c.old.wr !== c.new.wr) parts.push('WR ' + c.old.wr + '→' + c.new.wr + '%');
            if (c.old.pr !== c.new.pr) parts.push('PR ' + c.old.pr + '→' + c.new.pr + '%');
            if (c.old.br !== c.new.br) parts.push('BR ' + c.old.br + '→' + c.new.br + '%');
            return '• ' + _esc(c.new.name) + ' — ' + parts.join(', ');
          }).join('<br>') + '</div>';
      }

      if (diff.removed.length) {
        html += '<div style="color:#e67e22;font-weight:700;margin-top:8px;">❌ Удалится из таблицы (' + diff.removed.length + ') — нет в новых данных:</div>';
        html += '<div style="color:rgba(230,126,34,0.85);font-size:11px;margin-left:10px;">' +
          diff.removed.map(function(r){ return '• ' + _esc(r.name) + ' (был WR ' + r.wr + '%)'; }).join('<br>') + '</div>';
      }

      if (!diff.added.length && !diff.changed.length && !diff.removed.length) {
        html += '<div style="color:rgba(255,255,255,0.5);margin-top:8px;">Данные совпадают с текущими — сохранять нечего.</div>';
      }

      if (parsed.errors.length) {
        html += '<div style="color:rgba(255,255,255,0.4);margin-top:8px;font-size:11px;">Пропущены: ' +
          parsed.errors.map(_esc).join('; ') + '</div>';
      }

      preview.innerHTML = html;

      parsedRows = known;
      parsedRank = rank;
      parsedRole = role;

      var canSave = known.length > 0 && (diff.added.length || diff.changed.length || diff.removed.length);
      saveBtn.disabled = !canSave;
      saveBtn.style.opacity = canSave ? '1' : '0.5';
      saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
    };

    saveBtn.onclick = function() {
      if (saveBtn.disabled || !parsedRows) return;
      var rank = parsedRank, role = parsedRole, rows = parsedRows;
      // Очищаем служебные поля
      var clean = rows.map(function(r) { return { name: r.name, wr: r.wr, ch: null, pr: r.pr, br: r.br }; });

      var db = firebase.firestore();
      if (!window._cmsWinrates) window._cmsWinrates = {};
      if (!window._cmsWinrates[rank]) window._cmsWinrates[rank] = {};
      // Сохраняем предыдущее состояние роли для changelog
      var oldRoleList = (window._cmsWinrates[rank][role] || []).slice();
      window._cmsWinrates[rank][role] = clean;

      var docData = {};
      WR_ROLES.forEach(function(r) {
        docData[r] = (window._cmsWinrates[rank] && window._cmsWinrates[rank][r]) || [];
      });

      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.5';
      saveBtn.textContent = '⏳ Сохраняю…';

      db.collection('winrates').doc(rank).set(docData)
        .then(function() {
          db.collection('changelog').add({
            type: 'bulk-import',
            entity: 'winrate',
            name: 'Импорт ' + rank + '/' + role + ' (' + clean.length + ' чемпионов)',
            newData: JSON.stringify(clean),
            oldData: JSON.stringify(oldRoleList),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
          });
          if (window.wrprRenderFromCMS) window.wrprRenderFromCMS();
          _showToast('Сохранено: ' + clean.length + ' чемпионов в ' + rank + '/' + role, 'success');
          overlay.remove();
        })
        .catch(function(err) {
          // Откат локального состояния при ошибке
          window._cmsWinrates[rank][role] = oldRoleList;
          _showToast('Ошибка: ' + err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.style.opacity = '1';
          saveBtn.textContent = '💾 Сохранить';
        });
    };
  };

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ═══════════════════════════════════════════════════════════════
  // 📝 ЭТАП 3: ПАТЧ-НОТЫ ИЗ FIRESTORE
  // ═══════════════════════════════════════════════════════════════

  var PATCH_TYPES = [
    { id: 'buff', label: '🟢 Бафф', labelEn: '🟢 Buff', color: '#2ecc71' },
    { id: 'nerf', label: '🔴 Нерф', labelEn: '🔴 Nerf', color: '#e74c3c' },
    { id: 'adjust', label: '🟡 Корректировка', labelEn: '🟡 Adjust', color: '#f1c40f' }
  ];

  window._cmsPatchnotes = null;

  // Загрузка патч-нотов из Firestore → заполнение window.patchMap
  window.cmsLoadPatchnotes = function(callback) {
    var db = firebase.firestore();
    window._cmsPatchnotes = [];

    db.collection('patchnotes').get()
      .then(function(snap) {
        snap.forEach(function(doc) {
          var d = doc.data();
          d._id = doc.id;
          window._cmsPatchnotes.push(d);
        });

        // Заполняем patchMap (Firestore данные ПЕРЕЗАПИСЫВАЮТ Google Sheets)
        window._cmsPatchnotes.sort(function(a, b) {
          return (b.timestamp && b.timestamp.seconds || 0) - (a.timestamp && a.timestamp.seconds || 0);
        });
        if (!window.patchMap) window.patchMap = {};
        // Сначала помечаем все существующие записи из Google Sheets
        var firestoreChamps = {};
        window._cmsPatchnotes.forEach(function(note) {
          if (note.champion && note.type && !firestoreChamps[note.champion]) {
            firestoreChamps[note.champion] = true;
            window.patchMap[note.champion] = {
              patch: note.patch || '',
              change: note.change || '',
              type: note.type,
              _id: note._id
            };
          }
        });

        console.log('[CMS] Загружено патч-нотов: ' + window._cmsPatchnotes.length);
        if (callback) callback();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки патч-нотов:', err);
        if (callback) callback();
      });
  };

  // Открыть редактор патч-нота (вызывается из openChampDetail)
  window.cmsOpenPatchnoteEditor = function(champName, existingNote) {
    var isNew = !existingNote;
    var data = existingNote ? Object.assign({}, existingNote) : {
      champion: champName,
      type: 'buff',
      change: '',
      patch: ''
    };

    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';

    var t = window.translateText || function(s) { return s; };

    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h3 style="margin:0;color:#fff;font-size:18px;">📝 ' + t('Патч-нот') + ': ' + champName + '</h3>' +
      '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>';

    // Тип изменения
    var typeGroup = document.createElement('div');
    typeGroup.style.marginBottom = '12px';
    var typeLabel = document.createElement('label');
    typeLabel.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
    typeLabel.textContent = t('Тип изменения');
    typeGroup.appendChild(typeLabel);

    var typeSelect = document.createElement('select');
    typeSelect.className = 'cms-input';
    PATCH_TYPES.forEach(function(pt) {
      var o = document.createElement('option');
      o.value = pt.id;
      o.textContent = pt.label;
      if (data.type === pt.id) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeGroup.appendChild(typeSelect);
    win.appendChild(typeGroup);

    // Версия патча
    var patchGroup = document.createElement('div');
    patchGroup.style.marginBottom = '12px';
    var patchLabel = document.createElement('label');
    patchLabel.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
    patchLabel.textContent = t('Версия патча');
    patchGroup.appendChild(patchLabel);
    var patchInput = document.createElement('input');
    patchInput.type = 'text';
    patchInput.className = 'cms-input';
    patchInput.placeholder = '7.0f';
    patchInput.value = data.patch || '';
    patchGroup.appendChild(patchInput);
    win.appendChild(patchGroup);

    // Описание
    var descGroup = document.createElement('div');
    descGroup.style.marginBottom = '12px';
    var descLabel = document.createElement('label');
    descLabel.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
    descLabel.textContent = t('Описание изменения');
    descGroup.appendChild(descLabel);
    var descInput = document.createElement('textarea');
    descInput.className = 'cms-input';
    descInput.rows = 4;
    descInput.placeholder = 'Базовый AD увеличен с 58 до 62...';
    descInput.value = data.change || '';
    descGroup.appendChild(descInput);
    win.appendChild(descGroup);

    // Кнопки
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:18px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = isNew ? '➕ Добавить' : '💾 Сохранить';
    saveBtn.onclick = function() {
      var newData = {
        champion: champName,
        type: typeSelect.value,
        patch: patchInput.value.trim(),
        change: descInput.value.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
      };
      _savePatchnote(newData, existingNote ? existingNote._id : null, isNew, champName);
      overlay.remove();
    };
    btnRow.appendChild(saveBtn);

    if (!isNew) {
      var delBtn = document.createElement('button');
      delBtn.className = 'cms-btn-delete';
      delBtn.textContent = '🗑 Удалить';
      (function(_champName, _noteId, _overlay) {
        delBtn.onclick = function() {
          window._showConfirm({ msg: 'Патч-нот для «' + _champName + '» будет удалён.', title: 'Удалить патч-нот?', confirmText: 'Удалить' }, function() {
            _deletePatchnote(_noteId, _champName);
            _overlay.remove();
          });
        };
      }(champName, existingNote._id, overlay));
      btnRow.appendChild(delBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    win.appendChild(btnRow);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  function _savePatchnote(data, docId, isNew, champName) {
    var db = firebase.firestore();
    var slug = docId || ('patch-' + _slugify(champName) + '-' + Date.now());

    var ref = db.collection('patchnotes').doc(slug);
    ref.set(data, { merge: true })
      .then(function() {
        // Обновляем локальные данные
        data._id = slug;
        if (isNew) {
          if (!window._cmsPatchnotes) window._cmsPatchnotes = [];
          window._cmsPatchnotes.push(data);
        } else {
          var idx = (window._cmsPatchnotes || []).findIndex(function(n) { return n._id === docId; });
          if (idx !== -1) window._cmsPatchnotes[idx] = data;
        }

        // Обновляем patchMap
        window.patchMap[champName] = {
          patch: data.patch,
          change: data.change,
          type: data.type,
          _id: slug
        };

        // Changelog
        db.collection('changelog').add({
          type: isNew ? 'add' : 'edit',
          entity: 'patchnote',
          name: champName + ' (' + data.type + ')',
          newData: JSON.stringify(data),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        _showToast(isNew ? 'Патч-нот добавлен!' : 'Патч-нот обновлён!', 'success');

        // Перерисовываем детали чемпиона если открыты
        if (window.openChampDetail) window.openChampDetail(champName);
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  function _deletePatchnote(docId, champName) {
    var db = firebase.firestore();
    db.collection('patchnotes').doc(docId).delete()
      .then(function() {
        // Удаляем из локальных данных
        window._cmsPatchnotes = (window._cmsPatchnotes || []).filter(function(n) { return n._id !== docId; });
        delete window.patchMap[champName];

        db.collection('changelog').add({
          type: 'delete',
          entity: 'patchnote',
          name: champName,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        _showToast('Патч-нот удалён', 'success');

        // Перерисовываем
        if (window.openChampDetail) window.openChampDetail(champName);
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }

  // Очистить все патч-ноты (для конца сезона)
  window.cmsClearAllPatchnotes = function() {
    if (!window._isAdmin) return;
    var count = (window._cmsPatchnotes || []).length;
    if (count === 0) {
      _showToast('Нет патч-нотов для удаления', 'error');
      return;
    }
    window._showConfirm({ msg: 'Удалить ВСЕ патч-ноты (' + count + ' шт.)? Откат возможен только через changelog.', title: 'Удалить ВСЕ патч-ноты?', confirmText: 'Да, удалить все', icon: '⚠️' }, function() {
      window._showConfirm({ msg: 'Финальное подтверждение: все бафф/нерф/корректировки исчезнут у всех пользователей.', title: 'Точно удалить?', confirmText: '🗑 Удалить всё', icon: '🔥' }, function() {
        _cmsClearAllPatchnotesConfirmed(count);
      });
    });
  };
  function _cmsClearAllPatchnotesConfirmed(count) {
    var db = firebase.firestore();
    var batch = db.batch();
    var notes = window._cmsPatchnotes.slice();

    notes.forEach(function(note) {
      batch.delete(db.collection('patchnotes').doc(note._id));
    });

    batch.commit()
      .then(function() {
        // Changelog — одна запись для всей операции
        db.collection('changelog').add({
          type: 'bulk-delete',
          entity: 'patchnote',
          name: 'Все патч-ноты (' + count + ' шт.)',
          oldData: JSON.stringify(notes),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        window._cmsPatchnotes = [];
        window.patchMap = {};
        _showToast('Удалено патч-нотов: ' + count, 'success');

        // Перерисовать все представления с чемпионами
        if (window.render) window.render();
        if (window.wrprRender) window.wrprRender();
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  };

  // ═══════════════════════════════════════════════════════════════
  // 📸 ЭТАП 4: ЗАГРУЗКА КАРТИНОК ЧЕРЕЗ FIREBASE STORAGE
  // ═══════════════════════════════════════════════════════════════

  window.cmsUploadImage = function(file, path, onProgress, onComplete, onError) {
    if (!firebase.storage) {
      if (onError) onError(new Error('Firebase Storage SDK не подключён'));
      return;
    }

    var storageRef = firebase.storage().ref();
    var fileRef = storageRef.child(path + '/' + Date.now() + '_' + file.name);
    var uploadTask = fileRef.put(file);

    uploadTask.on('state_changed',
      function(snapshot) {
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      function(error) {
        if (onError) onError(error);
      },
      function() {
        uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
          if (onComplete) onComplete(downloadURL);
        });
      }
    );
  };

  // Создаёт кнопку загрузки для поля URL картинки
  window.cmsCreateUploadButton = function(inputEl, storagePath) {
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:4px;';

    var uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'cms-upload-btn';
    uploadBtn.textContent = '📁 ' + (window.translateText ? window.translateText('Загрузить файл') : 'Загрузить файл');

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    var progressWrap = document.createElement('div');
    progressWrap.className = 'cms-upload-progress';
    progressWrap.style.display = 'none';
    var progressBar = document.createElement('div');
    progressBar.className = 'cms-upload-progress-bar';
    progressWrap.appendChild(progressBar);

    uploadBtn.onclick = function() { fileInput.click(); };

    fileInput.onchange = function() {
      var file = fileInput.files[0];
      if (!file) return;

      // Проверка размера (макс 5MB для Spark)
      if (file.size > 5 * 1024 * 1024) {
        _showToast('Файл слишком большой (макс 5MB)', 'error');
        return;
      }

      uploadBtn.textContent = '⏳ ' + (window.translateText ? window.translateText('Загрузка...') : 'Загрузка...');
      uploadBtn.disabled = true;
      progressWrap.style.display = 'block';

      window.cmsUploadImage(file, storagePath || 'images',
        function(progress) {
          progressBar.style.width = progress + '%';
        },
        function(url) {
          inputEl.value = url;
          inputEl.dispatchEvent(new Event('input'));
          uploadBtn.textContent = '📁 ' + (window.translateText ? window.translateText('Загрузить файл') : 'Загрузить файл');
          uploadBtn.disabled = false;
          progressWrap.style.display = 'none';
          progressBar.style.width = '0';
          _showToast(window.translateText ? window.translateText('Файл загружен!') : 'Файл загружен!', 'success');
        },
        function(err) {
          uploadBtn.textContent = '📁 ' + (window.translateText ? window.translateText('Загрузить файл') : 'Загрузить файл');
          uploadBtn.disabled = false;
          progressWrap.style.display = 'none';
          progressBar.style.width = '0';
          _showToast('Ошибка загрузки: ' + err.message, 'error');
        }
      );
    };

    wrapper.appendChild(uploadBtn);
    wrapper.appendChild(fileInput);
    wrapper.appendChild(progressWrap);
    return wrapper;
  };

  // ═══════════════════════════════════════════════════════════════
  // ⚙ ЭТАП 6: ВИЗУАЛЬНЫЙ РЕДАКТОР ЛЕЙАУТА (siteConfig)
  // ═══════════════════════════════════════════════════════════════

  window._cmsSiteConfig = null;

  var DEFAULT_CONFIG = {
    desktop: {
      sidebarBtnSize: 38,
      sectionSpacing: 20,
      headerFontSize: 14
    },
    mobile: {
      sidebarBtnSize: 32,
      sectionSpacing: 14,
      headerFontSize: 12
    },
    sectionOrder: ['stats', 'winrates', 'items', 'runes', 'tierlist']
  };

  // Загрузка конфигурации
  window.cmsLoadSiteConfig = function(callback) {
    var db = firebase.firestore();
    db.collection('siteConfig').doc('layout').get()
      .then(function(doc) {
        if (doc.exists) {
          window._cmsSiteConfig = doc.data();
          console.log('[CMS] Конфигурация лейаута загружена');
        } else {
          window._cmsSiteConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
        _applySiteConfig();
        if (callback) callback();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки конфигурации:', err);
        window._cmsSiteConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        _applySiteConfig();
        if (callback) callback();
      });
  };

  // Применить конфигурацию
  function _applySiteConfig() {
    if (!window._cmsSiteConfig) return;
    var cfg = window._cmsSiteConfig;
    var isMobile = window.innerWidth <= 768;
    var device = isMobile ? cfg.mobile : cfg.desktop;
    if (!device) return;

    var root = document.documentElement;
    if (device.sidebarBtnSize) root.style.setProperty('--cms-sidebar-btn-size', device.sidebarBtnSize + 'px');
    if (device.sectionSpacing) root.style.setProperty('--cms-section-spacing', device.sectionSpacing + 'px');
    if (device.headerFontSize) root.style.setProperty('--cms-header-font-size', device.headerFontSize + 'px');

    // Применяем к сайдбару
    var sideItems = document.querySelectorAll('.side-item, .side-btn');
    sideItems.forEach(function(el) {
      if (device.sidebarBtnSize) {
        el.style.minHeight = device.sidebarBtnSize + 'px';
        el.style.fontSize = Math.max(10, device.sidebarBtnSize * 0.35) + 'px';
      }
    });

    // Применяем отступы секций
    var sections = document.querySelectorAll('.side-section');
    sections.forEach(function(el) {
      if (device.sectionSpacing) el.style.marginBottom = device.sectionSpacing + 'px';
    });

    // Порядок секций
    if (cfg.sectionOrder && cfg.sectionOrder.length) {
      var sidebar = document.querySelector('.sidebar, #sidebar');
      if (sidebar) {
        var sectionMap = {};
        var children = Array.from(sidebar.children);
        children.forEach(function(child) {
          var id = child.id || child.dataset.section;
          if (id) sectionMap[id] = child;
        });
        cfg.sectionOrder.forEach(function(id) {
          if (sectionMap[id]) sidebar.appendChild(sectionMap[id]);
        });
      }
    }
  }

  // Переприменяем при ресайзе
  window.addEventListener('resize', function() {
    if (window._cmsSiteConfig) _applySiteConfig();
  });

  // Открыть редактор лейаута
  window.cmsOpenLayoutEditor = function() {
    var cfg = window._cmsSiteConfig || JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    var t = window.translateText || function(s) { return s; };

    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';

    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h3 style="margin:0;color:#fff;font-size:18px;">⚙ ' + t('Настройки лейаута') + '</h3>' +
      '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>';

    var inputs = {};

    // Десктоп и мобильный блоки
    ['desktop', 'mobile'].forEach(function(device) {
      var group = document.createElement('div');
      group.className = 'cms-config-group';

      var title = document.createElement('div');
      title.className = 'cms-config-group-title';
      title.textContent = device === 'desktop' ? '🖥 ' + t('Десктоп') : '📱 ' + t('Мобильный');
      group.appendChild(title);

      inputs[device] = {};

      var fields = [
        { key: 'sidebarBtnSize', label: t('Размер кнопок сайдбара'), min: 24, max: 60, unit: 'px' },
        { key: 'sectionSpacing', label: t('Отступ секций'), min: 4, max: 40, unit: 'px' },
        { key: 'headerFontSize', label: t('Размер шрифта заголовков'), min: 8, max: 24, unit: 'px' }
      ];

      fields.forEach(function(f) {
        var row = document.createElement('div');
        row.className = 'cms-config-row';

        var lbl = document.createElement('span');
        lbl.className = 'cms-config-label';
        lbl.textContent = f.label;
        row.appendChild(lbl);

        var rightWrap = document.createElement('div');
        rightWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

        var range = document.createElement('input');
        range.type = 'range';
        range.min = f.min;
        range.max = f.max;
        range.value = (cfg[device] && cfg[device][f.key]) || DEFAULT_CONFIG[device][f.key];
        range.style.cssText = 'width:80px;height:4px;';

        var valSpan = document.createElement('span');
        valSpan.className = 'cms-config-label';
        valSpan.style.width = '40px';
        valSpan.style.textAlign = 'right';
        valSpan.textContent = range.value + f.unit;

        range.oninput = function() {
          valSpan.textContent = this.value + f.unit;
        };

        rightWrap.appendChild(range);
        rightWrap.appendChild(valSpan);
        row.appendChild(rightWrap);
        group.appendChild(row);

        inputs[device][f.key] = range;
      });

      win.appendChild(group);
    });

    // Порядок секций (drag-like: список с кнопками ↑↓)
    var orderGroup = document.createElement('div');
    orderGroup.className = 'cms-config-group';
    var orderTitle = document.createElement('div');
    orderTitle.className = 'cms-config-group-title';
    orderTitle.textContent = '📋 ' + t('Порядок секций');
    orderGroup.appendChild(orderTitle);

    var sectionLabels = {
      stats: '📊 Stats',
      winrates: '🏆 Win Rates',
      items: '⚔ Items',
      runes: '✨ Runes',
      tierlist: '🎖 Tier List'
    };
    var currentOrder = (cfg.sectionOrder && cfg.sectionOrder.length) ? cfg.sectionOrder.slice() : DEFAULT_CONFIG.sectionOrder.slice();

    var orderList = document.createElement('div');
    orderList.id = 'cmsOrderList';

    function renderOrderList() {
      orderList.innerHTML = '';
      currentOrder.forEach(function(id, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;';
        var lbl = document.createElement('span');
        lbl.style.cssText = 'font-size:12px;color:#fff;';
        lbl.textContent = sectionLabels[id] || id;
        row.appendChild(lbl);

        var btnWrap = document.createElement('div');
        btnWrap.style.cssText = 'display:flex;gap:4px;';

        if (idx > 0) {
          var upBtn = document.createElement('button');
          upBtn.style.cssText = 'width:24px;height:24px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#fff;border-radius:4px;cursor:pointer;font-size:10px;';
          upBtn.textContent = '▲';
          upBtn.onclick = function() {
            var tmp = currentOrder[idx - 1];
            currentOrder[idx - 1] = currentOrder[idx];
            currentOrder[idx] = tmp;
            renderOrderList();
          };
          btnWrap.appendChild(upBtn);
        }
        if (idx < currentOrder.length - 1) {
          var dnBtn = document.createElement('button');
          dnBtn.style.cssText = 'width:24px;height:24px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#fff;border-radius:4px;cursor:pointer;font-size:10px;';
          dnBtn.textContent = '▼';
          dnBtn.onclick = function() {
            var tmp = currentOrder[idx + 1];
            currentOrder[idx + 1] = currentOrder[idx];
            currentOrder[idx] = tmp;
            renderOrderList();
          };
          btnWrap.appendChild(dnBtn);
        }
        row.appendChild(btnWrap);
        orderList.appendChild(row);
      });
    }
    renderOrderList();
    orderGroup.appendChild(orderList);
    win.appendChild(orderGroup);

    // Кнопки
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:18px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = '💾 ' + t('Сохранить');
    saveBtn.onclick = function() {
      var newConfig = {
        desktop: {},
        mobile: {},
        sectionOrder: currentOrder
      };
      ['desktop', 'mobile'].forEach(function(device) {
        for (var key in inputs[device]) {
          newConfig[device][key] = parseInt(inputs[device][key].value) || DEFAULT_CONFIG[device][key];
        }
      });
      _saveSiteConfig(newConfig);
      overlay.remove();
    };
    btnRow.appendChild(saveBtn);

    var resetBtn = document.createElement('button');
    resetBtn.className = 'cms-btn-delete';
    resetBtn.textContent = '↩ Сброс';
    resetBtn.onclick = function() {
      _saveSiteConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
      overlay.remove();
    };
    btnRow.appendChild(resetBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    win.appendChild(btnRow);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  function _saveSiteConfig(config) {
    var db = firebase.firestore();
    db.collection('siteConfig').doc('layout').set(config)
      .then(function() {
        window._cmsSiteConfig = config;
        _applySiteConfig();

        db.collection('changelog').add({
          type: 'edit',
          entity: 'siteConfig',
          name: 'layout',
          newData: JSON.stringify(config),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          adminUid: window._currentUser ? window._currentUser.uid : 'unknown'
        });

        _showToast(window.translateText ? window.translateText('Настройки сохранены!') : 'Настройки сохранены!', 'success');
      })
      .catch(function(err) {
        _showToast('Ошибка: ' + err.message, 'error');
      });
  }


  // ═══════════════════════════════════════════════════════════════
  // 🎨 RICH TEXT — parseRichText, цвета, иконки
  // ═══════════════════════════════════════════════════════════════

  var _richColors = {
    'ad':     '#e87f00',
    'mana':   '#3498db',
    'hp':     '#2ecc71',
    'magic':  '#a78bfa',
    'dmg':    '#e74c3c',
    'armor':  '#f1c40f',
    'ms':     '#5dade2',
    'energy': '#e8e840',
    'crit':   '#ff9f43',
    'vamp':   '#e056fd',
    'true':   '#ffffff',
    'heal':   '#55efc4'
  };

  // Иконки загружаются из Firestore siteIcons → {name: url}
  window._siteIcons = {};

  // parseRichText: [text|color] → <span style="color:..."> / [icon:name] → <img>
  window.parseRichText = function(text) {
    if (!text) return '';
    var safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // [icon:name] → <img>
    safe = safe.replace(/\[icon:([^\]]+)\]/g, function(_, name) {
      name = name.trim();
      var url = window._siteIcons[name] || name;
      return '<img loading="lazy" decoding="async" src="' + url.replace(/"/g, '&quot;') + '" '
        + 'style="height:1.1em;vertical-align:middle;display:inline-block;margin:0 1px;" '
        + 'alt="" onerror="this.style.display=\'none\'">';
    });
    // [text|colortoken] → <span>
    safe = safe.replace(/\[([^\]|]+)\|([^\]]+)\]/g, function(_, txt, color) {
      var col = _richColors[color.trim()] || color.trim();
      return '<span style="color:' + col.replace(/"/g, '') + ';font-weight:600;">' + txt + '</span>';
    });
    return safe;
  };

  // ── Загрузка иконок из Firestore ──
  window.cmsLoadIcons = function(callback) {
    var db = firebase.firestore();
    db.collection('siteIcons').orderBy('order', 'asc').get()
      .then(function(snap) {
        window._siteIcons = {};
        snap.forEach(function(doc) {
          var d = doc.data();
          var name = d.name || doc.id;
          window._siteIcons[name] = d.url || '';
        });
        console.log('[CMS] Иконок загружено: ' + Object.keys(window._siteIcons).length);
        if (callback) callback();
      })
      .catch(function(err) {
        console.warn('[CMS] Ошибка загрузки иконок:', err);
        if (callback) callback();
      });
  };

  // ── Rich text editor widget ──
  // Возвращает {group, getValue}
  function _createRichTextEditor(initialValue, placeholder) {
    var group = document.createElement('div');
    var icons = window._siteIcons || {};
    var iconNames = Object.keys(icons);

    // Тулбар
    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;';

    // Цветные кнопки
    var colorBtns = [
      { label: 'AD',    key: 'ad' },
      { label: 'Mana',  key: 'mana' },
      { label: 'HP',    key: 'hp' },
      { label: 'Magic', key: 'magic' },
      { label: 'Dmg',   key: 'dmg' },
      { label: 'Armor', key: 'armor' },
      { label: 'MS',    key: 'ms' },
      { label: 'Crit',  key: 'crit' },
      { label: 'Vamp',  key: 'vamp' }
    ];

    colorBtns.forEach(function(cb) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cb.label;
      var col = _richColors[cb.key] || '#fff';
      btn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid ' + col + ';color:' + col + ';'
        + 'font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer;';
      btn.title = 'Выделить цветом ' + cb.label;
      btn.onclick = function() { _applyColorWrap(textarea, cb.key); updatePreview(); };
      toolbar.appendChild(btn);
    });

    // Кастомный цвет — сохраняем выделение до открытия нативного пикера
    var _savedSel = { start: 0, end: 0 };
    var colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = '#ffffff';
    colorPicker.style.cssText = 'width:28px;height:28px;padding:0;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer;';
    colorPicker.title = 'Кастомный цвет — выдели текст и выбери цвет';
    // Сохраняем выделение ПЕРЕД открытием нативного диалога (mousedown срабатывает до потери фокуса)
    colorPicker.addEventListener('mousedown', function() {
      _savedSel = { start: textarea.selectionStart, end: textarea.selectionEnd };
    });
    // Авто-применяем когда пользователь закрыл нативный пикер
    colorPicker.addEventListener('change', function() {
      textarea.focus();
      textarea.setSelectionRange(_savedSel.start, _savedSel.end);
      _applyColorWrap(textarea, colorPicker.value);
      updatePreview();
    });
    toolbar.appendChild(colorPicker);
    var applyCustomColor = document.createElement('button');
    applyCustomColor.type = 'button';
    applyCustomColor.textContent = '🎨';
    applyCustomColor.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:14px;padding:3px 8px;border-radius:6px;cursor:pointer;';
    applyCustomColor.title = 'Применить текущий цвет к выделенному тексту';
    applyCustomColor.addEventListener('mousedown', function() {
      _savedSel = { start: textarea.selectionStart, end: textarea.selectionEnd };
    });
    applyCustomColor.onclick = function() {
      textarea.focus();
      textarea.setSelectionRange(_savedSel.start, _savedSel.end);
      _applyColorWrap(textarea, colorPicker.value);
      updatePreview();
    };
    toolbar.appendChild(applyCustomColor);

    // Иконки (если есть)
    if (iconNames.length > 0) {
      var sep = document.createElement('div');
      sep.style.cssText = 'width:1px;background:rgba(255,255,255,0.12);margin:2px 4px;';
      toolbar.appendChild(sep);
      iconNames.forEach(function(name) {
        var btn = document.createElement('button');
        btn.type = 'button';
        var img = document.createElement('img');
        img.src = icons[name];
        img.style.cssText = 'height:16px;vertical-align:middle;';
        img.onerror = function() { btn.textContent = name; };
        btn.appendChild(img);
        btn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);'
          + 'padding:3px 6px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;';
        btn.title = 'Вставить иконку: ' + name;
        btn.onclick = function() { _insertAtCursor(textarea, '[icon:' + name + ']'); updatePreview(); };
        toolbar.appendChild(btn);
      });
    }

    group.appendChild(toolbar);

    // Textarea
    var textarea = document.createElement('textarea');
    textarea.rows = 4;
    textarea.className = 'cms-input';
    textarea.value = initialValue || '';
    if (placeholder) textarea.placeholder = placeholder;
    textarea.style.cssText = 'font-family:monospace;font-size:12px;';
    textarea.oninput = updatePreview;
    group.appendChild(textarea);

    // Live preview
    var previewLabel = document.createElement('div');
    previewLabel.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.4);margin-top:6px;margin-bottom:3px;letter-spacing:0.5px;text-transform:uppercase;';
    previewLabel.textContent = 'Превью:';
    group.appendChild(previewLabel);

    var preview = document.createElement('div');
    preview.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);'
      + 'border-radius:8px;padding:8px 12px;font-size:13px;color:rgba(255,255,255,0.8);'
      + 'line-height:1.6;min-height:36px;';
    group.appendChild(preview);

    function updatePreview() {
      var html = window.parseRichText ? window.parseRichText(textarea.value) : textarea.value;
      preview.innerHTML = html || '<span style="color:rgba(255,255,255,0.2);font-style:italic;">пусто</span>';
    }
    updatePreview();

    return {
      group: group,
      toolbar: toolbar,
      getValue: function() { return textarea.value; },
      setValue: function(v) { textarea.value = v; updatePreview(); }
    };
  }

  function _applyColorWrap(textarea, colorKey) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var val = textarea.value;
    if (start === end) { _insertAtCursor(textarea, '[текст|' + colorKey + ']'); return; }
    var selected = val.substring(start, end);
    var wrapped = '[' + selected + '|' + colorKey + ']';
    textarea.value = val.substring(0, start) + wrapped + val.substring(end);
    textarea.selectionStart = start;
    textarea.selectionEnd = start + wrapped.length;
    textarea.focus();
  }

  function _insertAtCursor(textarea, text) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var val = textarea.value;
    textarea.value = val.substring(0, start) + text + val.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  // ── Авто-перевод описания RU → EN через MyMemory (бесплатный API) ──
  function _autoTranslateDesc(ruText, onDone) {
    if (!ruText || !ruText.trim()) { onDone(''); return; }
    // Защищаем [текст|цвет] и [icon:name] от перевода ASCII-безопасными плейсхолдерами
    var placeholders = [];
    var protected_text = ruText.replace(/\[[^\]]+\]/g, function(match) {
      placeholders.push(match);
      return '__PH' + (placeholders.length - 1) + '__';
    });
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(protected_text) + '&langpair=ru|en&de=satyndyeverjanadylbekovich@gmail.com';
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        var translated = (json.responseData && json.responseData.translatedText) || '';
        // Проверяем что это не ошибка лимита MyMemory
        if (!translated || translated.indexOf('[MYMEMORY') === 0 || translated.indexOf('MYMEMORY WARNING') !== -1) {
          _showToast('Лимит перевода исчерпан — заполни EN вручную', 'error');
          onDone('');
          return;
        }
        // Восстанавливаем плейсхолдеры
        translated = translated.replace(/__PH(\d+)__/g, function(_, i) { return placeholders[parseInt(i)] || ''; });
        onDone(translated);
      })
      .catch(function() {
        _showToast('Ошибка перевода — сохранено без EN', 'error');
        onDone('');
      });
  }

  // ── Добавить тип 'richtext' в _createEditorModal ──
  // Патчим уже существующую функцию через wrapper
  var _origCreateEditorModal = _createEditorModal;
  _createEditorModal = function(entityName, isNew, data, fields, onSave, onDelete) {
    // Убираем поля richtext из fields для оригинальной функции,
    // добавим их вручную после
    var normalFields = [];
    var richFields = [];
    fields.forEach(function(f) {
      if (f.type === 'richtext') richFields.push(f);
      else normalFields.push(f);
    });

    // Вызываем оригинальную функцию без richtext полей
    var overlay = _origCreateEditorModal(entityName, isNew, data, normalFields, function() {}, onDelete);
    var win = overlay.querySelector('.cms-modal-win');

    // Собираем editors для richtext полей
    var rtEditors = {};
    richFields.forEach(function(f) {
      var group = document.createElement('div');
      group.style.marginBottom = '12px';

      var lbl = document.createElement('label');
      lbl.style.cssText = 'display:block;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent = f.label;
      group.appendChild(lbl);

      var editor = _createRichTextEditor(data[f.key] || '', f.placeholder || '');
      rtEditors[f.key] = editor;
      group.appendChild(editor.group);

      // Вставляем перед кнопками
      var btnRow = win.querySelector('div[style*="margin-top:18px"]');
      if (btnRow) win.insertBefore(group, btnRow);
      else win.appendChild(group);
    });

    // Кнопка авто-перевода RU→EN в тулбаре EN-поля
    if (rtEditors['description_ru'] && rtEditors['description_en']) {
      var trSep = document.createElement('div');
      trSep.style.cssText = 'width:1px;background:rgba(255,255,255,0.12);margin:2px 4px;';
      rtEditors['description_en'].toolbar.appendChild(trSep);

      var btnTr = document.createElement('button');
      btnTr.type = 'button';
      btnTr.textContent = '🌐 RU→EN';
      btnTr.style.cssText = 'background:rgba(30,120,255,0.12);border:1px solid rgba(30,120,255,0.35);'
        + 'color:#6bb5ff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;cursor:pointer;';
      btnTr.title = 'Автоперевод RU-описания в EN';
      btnTr.onclick = function() {
        var ruText = rtEditors['description_ru'].getValue();
        if (!ruText || !ruText.trim()) { _showToast('Заполни RU-описание сначала', 'error'); return; }
        btnTr.disabled = true;
        btnTr.textContent = '⏳ Перевожу...';
        _autoTranslateDesc(ruText, function(translated) {
          if (translated) {
            rtEditors['description_en'].setValue(translated);
            _showToast('Перевод готов! ✓', 'success');
          }
          btnTr.disabled = false;
          btnTr.textContent = '🌐 RU→EN';
        });
      };
      rtEditors['description_en'].toolbar.appendChild(btnTr);
    }

    // Перепривязываем кнопку сохранения чтобы захватить richtext значения
    var saveBtn = win.querySelector('.cms-btn-save');
    if (saveBtn) {
      saveBtn.onclick = function() {
        // Собираем все обычные поля по data-field-key атрибуту
        var newData = {};
        normalFields.forEach(function(f) {
          var el = win.querySelector('[data-field-key="' + f.key + '"]');
          if (el) {
            newData[f.key] = el.value.trim ? el.value.trim() : el.value;
          } else {
            newData[f.key] = data[f.key] || '';
          }
        });
        // Richtext поля
        richFields.forEach(function(f) {
          newData[f.key] = rtEditors[f.key].getValue();
        });
        // order
        newData.order = data.order || 0;

        // Авто-перевод: если description_en пустое, переводим из description_ru
        var hasDescRu = typeof newData.description_ru === 'string' && newData.description_ru.trim();
        var hasDescEn = typeof newData.description_en === 'string' && newData.description_en.trim();
        if (hasDescRu && !hasDescEn) {
          saveBtn.textContent = '⏳ Перевожу...';
          saveBtn.disabled = true;
          _autoTranslateDesc(newData.description_ru, function(translated) {
            newData.description_en = translated;
            onSave(newData);
            overlay.remove();
          });
        } else {
          onSave(newData);
          overlay.remove();
        }
      };
    }

    return overlay;
  };

  // ═══════════════════════════════════════════════════════════════
  // 🖼 ICON REGISTRY — управление иконками (Firestore siteIcons)
  // ═══════════════════════════════════════════════════════════════

  window.cmsOpenIconsEditor = function() {
    var db = firebase.firestore();
    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.maxWidth = '560px';

    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
      + '<h3 style="margin:0;color:#fff;font-size:18px;">🖼 Иконки</h3>'
      + '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>'
      + '<div id="cmsIconsList" style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;margin-bottom:16px;"></div>'
      + '<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;">'
      + '<div style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;margin-bottom:8px;">ДОБАВИТЬ ИКОНКУ</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;">'
      + '<div><label style="display:block;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;">ИМЯ (без пробелов)</label>'
      + '<input id="cmsIconName" class="cms-input" placeholder="ad" style="margin:0;"></div>'
      + '<div><label style="display:block;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;">URL иконки</label>'
      + '<input id="cmsIconUrl" class="cms-input" placeholder="https://..." style="margin:0;"></div>'
      + '<button onclick="cmsAddIcon()" class="cms-btn-save" style="margin:0;padding:8px 14px;">+ Добавить</button>'
      + '</div>'
      + '<div id="cmsIconUploadRow" style="margin-top:8px;display:flex;align-items:center;gap:8px;"></div>'
      + '<div id="cmsIconPreview" style="margin-top:8px;min-height:28px;"></div>'
      + '</div>';

    overlay.appendChild(win);
    document.body.appendChild(overlay);

    // Кнопка загрузки файла
    var uploadRow = win.querySelector('#cmsIconUploadRow');
    var urlInput = win.querySelector('#cmsIconUrl');
    var previewDiv = win.querySelector('#cmsIconPreview');
    if (window.cmsCreateUploadButton) {
      var uploadWidget = window.cmsCreateUploadButton(urlInput, 'icons');
      var lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);';
      lbl.textContent = 'или загрузить файл:';
      uploadRow.appendChild(lbl);
      uploadRow.appendChild(uploadWidget);
    }

    // Preview URL при вводе
    urlInput.addEventListener('input', function() {
      var url = urlInput.value.trim();
      if (url) previewDiv.innerHTML = '<img loading="lazy" decoding="async" src="' + url + '" style="height:24px;vertical-align:middle;margin-right:6px;" onerror="this.style.display=\'none\'">';
      else previewDiv.innerHTML = '';
    });

    _refreshIconsList(db, win);

    window.cmsAddIcon = function() {
      var name = (win.querySelector('#cmsIconName').value || '').trim().replace(/\s+/g, '_');
      var url = (win.querySelector('#cmsIconUrl').value || '').trim();
      if (!name || !url) { _showToast('Заполни имя и URL', 'error'); return; }

      var existingCount = Object.keys(window._siteIcons || {}).length;
      db.collection('siteIcons').doc(name).set({ name: name, url: url, order: existingCount })
        .then(function() {
          window._siteIcons[name] = url;
          win.querySelector('#cmsIconName').value = '';
          win.querySelector('#cmsIconUrl').value = '';
          previewDiv.innerHTML = '';
          _refreshIconsList(db, win);
          _showToast('Иконка добавлена!', 'success');
        })
        .catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); });
    };
  };

  function _refreshIconsList(db, win) {
    db.collection('siteIcons').orderBy('order', 'asc').get()
      .then(function(snap) {
        var list = win.querySelector('#cmsIconsList');
        if (!list) return;
        if (snap.empty) {
          list.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;padding:16px;">Иконок нет. Добавь первую!</div>';
          return;
        }
        list.innerHTML = '';
        snap.forEach(function(doc) {
          var d = doc.data();
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.08);';
          row.innerHTML = '<img loading="lazy" decoding="async" src="' + (d.url||'') + '" style="height:22px;flex-shrink:0;" onerror="this.style.display=\'none\'">'
            + '<code style="color:var(--accent-light);font-size:12px;flex:1;">[icon:' + (d.name||doc.id) + ']</code>'
            + '<div style="font-size:11px;color:rgba(255,255,255,0.3);flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (d.url||'') + '</div>'
            + '<button style="background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.4);color:#e74c3c;font-size:11px;padding:3px 8px;border-radius:6px;cursor:pointer;" '
            + 'onclick="cmsDeleteIcon(\'' + doc.id + '\',\'' + (d.name||doc.id) + '\')">✕</button>';
          list.appendChild(row);
        });
      });
  }

  window.cmsDeleteIcon = function(docId, name) {
    window._showConfirm({ msg: 'Иконка «' + name + '» будет удалена.', title: 'Удалить иконку?', confirmText: 'Удалить' }, function() {
      var db = firebase.firestore();
      db.collection('siteIcons').doc(docId).delete()
        .then(function() {
          delete window._siteIcons[name];
          _showToast('Иконка удалена', 'success');
          var win = document.querySelector('.cms-modal-overlay .cms-modal-win');
          if (win) _refreshIconsList(db, win);
        })
        .catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); });
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔤 SIDEBAR LABELS — редактирование кнопок сайдбара
  // ═══════════════════════════════════════════════════════════════

  var _SIDEBAR_KEYS = [
    { key: 'sideChamps', default: 'Чемпионы' },
    { key: 'calc',       default: 'Калькулятор урона' },
    { key: 'items',      default: 'Предметы' },
    { key: 'runes',      default: 'Руны' },
    { key: 'draft',      default: 'Драфт-помощник' },
    { key: 'draftCoop', default: 'Драфт (серии)' },
    { key: 'tierMenu',   default: 'Тир-лист' },
    { key: 'globalChat', default: 'Чат' }
  ];

  window.cmsLoadSidebarLabels = function(callback) {
    var db = firebase.firestore();
    db.collection('siteConfig').doc('sidebar').get()
      .then(function(doc) {
        var data = doc.exists ? doc.data() : {};
        _applySidebarLabels(data);
        if (callback) callback();
      })
      .catch(function() { if (callback) callback(); });
  };

  function _applySidebarLabels(data) {
    if (!data) return;
    document.querySelectorAll('#sidePanel .side-btn').forEach(function(btn) {
      var oc = btn.getAttribute('onclick') || '';
      _SIDEBAR_KEYS.forEach(function(sk) {
        if (oc.indexOf("'" + sk.key + "'") !== -1 || oc.indexOf('"' + sk.key + '"') !== -1) {
          var label = data[sk.key];
          if (label) {
            // Меняем текстовый узел (после иконки)
            var nodes = btn.childNodes;
            for (var i = 0; i < nodes.length; i++) {
              if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                nodes[i].textContent = label;
                break;
              }
            }
          }
        }
      });
    });
  }

  window.cmsOpenSidebarEditor = function() {
    var db = firebase.firestore();
    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.maxWidth = '440px';

    var titleHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
      + '<h3 style="margin:0;color:#fff;font-size:18px;">🔤 Кнопки сайдбара</h3>'
      + '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button></div>';
    win.innerHTML = titleHtml;

    // Загружаем текущие значения
    db.collection('siteConfig').doc('sidebar').get()
      .then(function(doc) {
        var saved = doc.exists ? doc.data() : {};
        var inputs = {};

        _SIDEBAR_KEYS.forEach(function(sk) {
          var group = document.createElement('div');
          group.style.marginBottom = '10px';

          var lbl = document.createElement('label');
          lbl.style.cssText = 'display:block;color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:3px;';
          lbl.textContent = sk.key;
          group.appendChild(lbl);

          var inp = document.createElement('input');
          inp.type = 'text';
          inp.className = 'cms-input';
          inp.value = saved[sk.key] || sk.default;
          inp.placeholder = sk.default;
          inp.style.margin = '0';
          inputs[sk.key] = inp;
          group.appendChild(inp);
          win.appendChild(group);
        });

        var saveBtn = document.createElement('button');
        saveBtn.className = 'cms-btn-save';
        saveBtn.style.marginTop = '14px';
        saveBtn.textContent = '💾 Сохранить';
        saveBtn.onclick = function() {
          var newData = {};
          _SIDEBAR_KEYS.forEach(function(sk) {
            newData[sk.key] = inputs[sk.key].value.trim() || sk.default;
          });
          db.collection('siteConfig').doc('sidebar').set(newData)
            .then(function() {
              _applySidebarLabels(newData);
              _showToast('Сайдбар обновлён!', 'success');
              overlay.remove();
            })
            .catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); });
        };
        win.appendChild(saveBtn);
      });

    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🏷 CHAMPION CATEGORIES — Firestore `champCategories`
  // ═══════════════════════════════════════════════════════════════

  window._champCategories = window._champCategories || [];

  window.cmsLoadCategories = function(callback) {
    var db = firebase.firestore();
    db.collection('champCategories').get()
      .then(function(snap) {
        var cats = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          d._id = doc.id;
          cats.push(d);
        });
        cats.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
        window._champCategories = cats;
        if (callback) callback();
      })
      .catch(function() { if (callback) callback(); });
  };

  // ── Admin: открыть редактор категорий ──
  window.cmsOpenCategoriesEditor = function() {
    var existing = document.getElementById('cmsCatEditorOverlay');
    if (existing) { existing.remove(); return; }
    var db = firebase.firestore();

    var overlay = document.createElement('div');
    overlay.id = 'cmsCatEditorOverlay';
    overlay.className = 'cms-modal-overlay';
    if (window.innerWidth >= 769) overlay.classList.add('cms-fullscreen-editor');
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.cssText = 'display:flex;flex-direction:column;padding:0;max-width:none;';
    if (window.innerWidth >= 769) win.style.height = '100vh';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;';
    hdr.innerHTML = '<h3 style="margin:0;color:#fff;font-size:18px;">🏷 Категории чемпионов</h3>'
      + '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>';
    win.appendChild(hdr);

    // Body: two-column
    var body = document.createElement('div');
    body.className = 'cms-cat-editor-body';

    var listPanel = document.createElement('div');
    listPanel.className = 'cms-cat-list-panel';

    var editorPanel = document.createElement('div');
    editorPanel.className = 'cms-cat-editor-panel';
    editorPanel.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:60px 0;font-size:13px;">← Выбери категорию</div>';

    // Working copy of categories
    var cats = (window._champCategories || []).map(function(c) { return Object.assign({}, c, { champions: (c.champions || []).slice(), champStars: Object.assign({}, c.champStars || {}), strongAgainst: (c.strongAgainst || []).slice(), weakAgainst: (c.weakAgainst || []).slice(), combo: (c.combo || []).slice() }); });
    var selectedIdx = -1;

    // ── Render list ──
    function renderList() {
      listPanel.innerHTML = '';
      var addBtn = document.createElement('button');
      addBtn.className = 'cms-btn-save';
      addBtn.style.cssText = 'margin-bottom:8px;font-size:11px;padding:5px 10px;width:auto;align-self:flex-start;';
      addBtn.textContent = '+ Добавить';
      addBtn.onclick = function() {
        cats.push({ name: '', color: '#6D3FF5', champions: [], strongAgainst: [], weakAgainst: [], combo: [], order: cats.length });
        selectedIdx = cats.length - 1;
        renderList();
        openEditor(selectedIdx);
      };
      listPanel.appendChild(addBtn);

      cats.forEach(function(cat, idx) {
        var btn = document.createElement('button');
        btn.className = 'cms-cat-btn' + (idx === selectedIdx ? ' active' : '');
        var dot = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + (cat.color || '#6D3FF5') + ';margin-right:8px;flex-shrink:0;"></span>';
        btn.innerHTML = dot
          + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (cat.name || '<em style="opacity:0.4">Без имени</em>') + '</span>'
          + '<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:6px;">' + [1,2,3].filter(function(s){return cat.champStars&&cat.champStars[String(s)];}).length + '★</span>';
        btn.onclick = function() { selectedIdx = idx; renderList(); openEditor(idx); };
        listPanel.appendChild(btn);
      });
    }

    // ── Category editor ──
    function openEditor(idx) {
      var cat = cats[idx];
      editorPanel.innerHTML = '';

      // Row 1: Name + Color + Delete
      var row1 = document.createElement('div');
      row1.style.cssText = 'display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;';

      var nameG = document.createElement('div');
      nameG.style.flex = '1';
      nameG.innerHTML = '<label style="display:block;color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:4px;">НАЗВАНИЕ</label>';
      var nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.className = 'cms-input';
      nameInp.value = cat.name || '';
      nameInp.style.margin = '0';
      nameG.appendChild(nameInp);

      var colorG = document.createElement('div');
      colorG.innerHTML = '<label style="display:block;color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:4px;">ЦВЕТ</label>';
      var colorInp = document.createElement('input');
      colorInp.type = 'color';
      colorInp.value = cat.color || '#6D3FF5';
      colorInp.style.cssText = 'width:44px;height:38px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;padding:2px;';
      // Live preview: обновляем цвет точки в списке сразу при выборе
      colorInp.addEventListener('input', function() {
        var dot = listPanel.querySelector('.cms-cat-btn.active span:first-child');
        if (dot) dot.style.background = this.value;
      });
      colorG.appendChild(colorInp);

      var delBtn = document.createElement('button');
      delBtn.className = 'cms-btn-delete';
      delBtn.style.margin = '0';
      delBtn.textContent = '🗑 Удалить';
      (function(_cat, _idx) {
        delBtn.onclick = function() {
          window._showConfirm({ msg: 'Категория «' + (_cat.name || 'без имени') + '» будет удалена.', title: 'Удалить категорию?', confirmText: 'Удалить' }, function() {
            if (_cat._id) {
              db.collection('champCategories').doc(_cat._id).delete()
                .then(function() {
                  cats.splice(_idx, 1);
                  window._champCategories = cats.map(function(c) { return Object.assign({}, c); });
                  selectedIdx = -1;
                  editorPanel.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:60px 0;font-size:13px;">← Выбери категорию</div>';
                  renderList();
                  _showToast('Категория удалена', 'success');
                })
                .catch(function(e) { _showToast('Ошибка: ' + e.message, 'error'); });
            } else {
              cats.splice(_idx, 1);
              window._champCategories = cats.map(function(c) { return Object.assign({}, c); });
              selectedIdx = -1;
              editorPanel.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:60px 0;font-size:13px;">← Выбери категорию</div>';
              renderList();
            }
          });
        };
      }(cat, idx));

      row1.appendChild(nameG);
      row1.appendChild(colorG);
      row1.appendChild(delBtn);
      editorPanel.appendChild(row1);

      // ── Star slots ──
      var STAR_LEVELS = [3, 2, 1];
      var STAR_LABELS = { 3: '⭐⭐⭐', 2: '⭐⭐', 1: '⭐' };
      // Миграция: старый формат { "1": "ChampName" } → новый { "1": ["ChampName"] }
      var champStars = {};
      [1,2,3].forEach(function(s) {
        var v = (cat.champStars || {})[String(s)];
        if (!v) champStars[String(s)] = [];
        else if (Array.isArray(v)) champStars[String(s)] = v.slice();
        else champStars[String(s)] = [v];
      });
      var activePicker = null;

      var slotsWrap = document.createElement('div');
      slotsWrap.style.cssText = 'margin-bottom:6px;';

      var slotsLbl = document.createElement('div');
      slotsLbl.style.cssText = 'color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:8px;';
      slotsLbl.textContent = 'ЧЕМПИОНЫ ПО ЗВЁЗДАМ';
      slotsWrap.appendChild(slotsLbl);

      function renderStarSlots() {
        while (slotsWrap.children.length > 1) slotsWrap.removeChild(slotsWrap.lastChild);
        STAR_LEVELS.forEach(function(stars) {
          var row = document.createElement('div');
          row.style.cssText = 'padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);margin-bottom:6px;';

          // Первая строка: звезда + кнопка добавить
          var topLine = document.createElement('div');
          topLine.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

          var starLbl = document.createElement('div');
          starLbl.style.cssText = 'font-size:13px;min-width:54px;flex-shrink:0;';
          starLbl.textContent = STAR_LABELS[stars];
          topLine.appendChild(starLbl);

          var addBtn = document.createElement('button');
          addBtn.textContent = '+ Добавить';
          addBtn.style.cssText = 'padding:3px 10px;border-radius:6px;border:1px solid rgba(109,63,245,0.5);background:rgba(109,63,245,0.15);color:#c4a7ff;font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0;';
          (function(s) {
            addBtn.onclick = function(e) { e.stopPropagation(); openStarPicker(s); };
          }(stars));
          topLine.appendChild(addBtn);
          row.appendChild(topLine);

          // Чипы чемпов
          var chipsLine = document.createElement('div');
          chipsLine.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:2px 0;';
          var arr = champStars[String(stars)] || [];
          if (arr.length === 0) {
            var ph = document.createElement('span');
            ph.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.2);font-style:italic;';
            ph.textContent = 'Нет чемпов';
            chipsLine.appendChild(ph);
          } else {
            arr.forEach(function(cn) {
              var chip = document.createElement('div');
              chip.style.cssText = 'position:relative;display:inline-block;border-radius:6px;border:1.5px solid rgba(109,63,245,0.5);overflow:visible;';
              chip.title = cn;
              var chipImg = document.createElement('img');
              chipImg.src = window._champIcon ? window._champIcon(cn) : '';
              chipImg.style.cssText = 'width:34px;height:34px;border-radius:5px;object-fit:cover;display:block;';
              chipImg.onerror = function() { this.style.background = 'rgba(109,63,245,0.3)'; };
              var chipX = document.createElement('button');
              chipX.textContent = '×';
              chipX.style.cssText = 'position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:50%;border:none;background:rgba(231,76,60,0.9);color:#fff;font-size:10px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:1;';
              (function(s, name) {
                chipX.onclick = function(e) {
                  e.stopPropagation();
                  champStars[String(s)] = champStars[String(s)].filter(function(n) { return n !== name; });
                  if (activePicker) { activePicker.remove(); activePicker = null; }
                  renderStarSlots();
                };
              }(stars, cn));
              chip.appendChild(chipImg);
              chip.appendChild(chipX);
              chipsLine.appendChild(chip);
            });
          }
          row.appendChild(chipsLine);
          slotsWrap.appendChild(row);
        });
      }

      function openStarPicker(stars) {
        if (activePicker) { activePicker.remove(); activePicker = null; }
        var picker = document.createElement('div');
        activePicker = picker;
        picker.style.cssText = 'border:1px solid rgba(109,63,245,0.4);border-radius:10px;padding:10px;margin-bottom:12px;background:rgba(0,0,0,0.4);';

        var ptitle = document.createElement('div');
        ptitle.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:8px;';
        ptitle.textContent = 'Выбери чемпионов для ' + STAR_LABELS[stars] + ' (можно несколько)';
        picker.appendChild(ptitle);

        var roleFilter = 'all';
        var roles = [{k:'all',l:'Все'},{k:'Top',l:'Топ'},{k:'Jungle',l:'Лес'},{k:'Mid',l:'Мид'},{k:'ADC',l:'АДК'},{k:'Support',l:'Сап'}];
        var roleRow = document.createElement('div');
        roleRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;';

        var pickerGrid = document.createElement('div');
        pickerGrid.className = 'cms-cat-champ-grid';

        function buildRoleBtns() {
          roleRow.innerHTML = '';
          roles.forEach(function(r) {
            var rb = document.createElement('button');
            rb.textContent = r.l;
            var on = r.k === roleFilter;
            rb.style.cssText = 'padding:3px 9px;border-radius:6px;border:1px solid '+(on?'var(--accent)':'rgba(255,255,255,0.15)')+';background:'+(on?'rgba(109,63,245,0.3)':'transparent')+';color:'+(on?'#c4a7ff':'rgba(255,255,255,0.45)')+';font-size:10px;font-weight:700;cursor:pointer;';
            rb.onclick = function() { roleFilter = r.k; buildRoleBtns(); renderPickerGrid(srch.value); };
            roleRow.appendChild(rb);
          });
        }

        var srch = document.createElement('input');
        srch.type = 'text';
        srch.className = 'cms-input';
        srch.placeholder = '🔍 Поиск...';
        srch.style.cssText = 'margin-bottom:8px;font-size:12px;';

        function isInThisStar(cn) {
          return (champStars[String(stars)] || []).indexOf(cn) !== -1;
        }
        function isInOtherStar(cn) {
          return [1,2,3].some(function(s) {
            return s !== stars && (champStars[String(s)] || []).indexOf(cn) !== -1;
          });
        }

        function renderPickerGrid(q) {
          pickerGrid.innerHTML = '';
          var all = window._champsRaw || [];
          var filtered = all.filter(function(c) {
            var okRole = roleFilter === 'all' || (c.is && c.is[roleFilter]);
            var okQ    = !q || c.name.toLowerCase().indexOf(q.toLowerCase()) !== -1;
            return okRole && okQ;
          });
          filtered.forEach(function(c) {
            var cell = document.createElement('div');
            cell.className = 'cms-cat-champ-cell';
            var selected = isInThisStar(c.name);
            var otherStar = isInOtherStar(c.name);
            if (selected) cell.style.cssText = 'outline:2px solid #6D3FF5;background:rgba(109,63,245,0.25);border-radius:7px;';
            else if (otherStar) cell.style.opacity = '0.4';
            var img2 = document.createElement('img');
            img2.src = window._champIcon ? window._champIcon(c.name) : '';
            img2.style.cssText = 'width:38px;height:38px;border-radius:5px;object-fit:cover;';
            img2.onerror = function() { this.style.background = 'rgba(109,63,245,0.2)'; this.src = ''; };
            var lbl2 = document.createElement('div');
            lbl2.style.cssText = 'font-size:7px;color:rgba(255,255,255,0.55);text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;';
            lbl2.textContent = c.name;
            cell.appendChild(img2);
            cell.appendChild(lbl2);
            (function(cn) {
              cell.onclick = function() {
                var arr = champStars[String(stars)] || [];
                var idx2 = arr.indexOf(cn);
                if (idx2 !== -1) {
                  // Уже выбран — убираем
                  champStars[String(stars)] = arr.filter(function(n) { return n !== cn; });
                } else {
                  // Убираем из других звёзд (чемп может быть только в одной звезде)
                  [1,2,3].forEach(function(s) {
                    if (s !== stars) {
                      champStars[String(s)] = (champStars[String(s)] || []).filter(function(n) { return n !== cn; });
                    }
                  });
                  champStars[String(stars)] = arr.concat([cn]);
                }
                renderStarSlots();
                renderPickerGrid(srch.value);
              };
            }(c.name));
            pickerGrid.appendChild(cell);
          });
        }

        buildRoleBtns();
        picker.appendChild(roleRow);
        picker.appendChild(srch);
        picker.appendChild(pickerGrid);
        renderPickerGrid('');
        srch.oninput = function() { renderPickerGrid(this.value); };

        var closeP = document.createElement('button');
        closeP.textContent = '✕ Готово';
        closeP.style.cssText = 'margin-top:8px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.35);font-size:11px;cursor:pointer;';
        closeP.onclick = function() { picker.remove(); activePicker = null; };
        picker.appendChild(closeP);

        slotsWrap.insertAdjacentElement('afterend', picker);
      }

      renderStarSlots();
      editorPanel.appendChild(slotsWrap);
      editorPanel.appendChild(document.createElement('br'));

      // ── Matchup pickers (by category) ──
      function makeMatchupPicker(labelText, icon, key) {
        var sect = document.createElement('div');
        sect.style.marginBottom = '14px';
        var lbl = document.createElement('div');
        lbl.style.cssText = 'color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:6px;';
        lbl.textContent = icon + ' ' + labelText;
        sect.appendChild(lbl);

        var currentSet = new Set(cat[key] || []);

        var chipsRow = document.createElement('div');
        chipsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;min-height:18px;margin-bottom:6px;';

        function renderChips() {
          chipsRow.innerHTML = '';
          if (!currentSet.size) {
            chipsRow.innerHTML = '<span style="font-size:11px;color:rgba(255,255,255,0.2);">Не выбрано</span>';
            return;
          }
          currentSet.forEach(function(catName) {
            var catObj = cats.find(function(c) { return c.name === catName; });
            var col = (catObj && catObj.color) || '#6D3FF5';
            var chip = document.createElement('div');
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:' + col + '22;border:1.5px solid ' + col + '66;';
            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'font-size:11px;color:' + col + ';font-weight:700;';
            nameSpan.textContent = catName;
            var xBtn = document.createElement('button');
            xBtn.style.cssText = 'background:none;border:none;color:' + col + ';font-size:13px;cursor:pointer;padding:0;line-height:1;';
            xBtn.textContent = '×';
            (function(cn) {
              xBtn.onclick = function() { currentSet.delete(cn); renderChips(); };
            }(catName));
            chip.appendChild(nameSpan);
            chip.appendChild(xBtn);
            chipsRow.appendChild(chip);
          });
        }
        renderChips();
        sect.appendChild(chipsRow);

        var addBtn = document.createElement('button');
        addBtn.style.cssText = 'font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(109,63,245,0.35);background:rgba(109,63,245,0.1);color:rgba(255,255,255,0.6);cursor:pointer;';
        addBtn.textContent = '+ Категорию';
        addBtn.onclick = function() {
          editorPanel.querySelectorAll('.cat-mp-dropdown').forEach(function(d) { d.remove(); });
          var dropdown = document.createElement('div');
          dropdown.className = 'cat-mp-dropdown';
          dropdown.style.cssText = 'border:1px solid rgba(109,63,245,0.4);border-radius:8px;padding:8px;margin-top:6px;background:rgba(10,10,20,0.97);max-height:160px;overflow-y:auto;';
          var others = cats.filter(function(c) { return c.name && c.name !== cat.name; });
          if (!others.length) {
            dropdown.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.3);padding:4px;">Нет других категорий</div>';
          } else {
            others.forEach(function(c) {
              var col = c.color || '#6D3FF5';
              var sel = currentSet.has(c.name);
              var row = document.createElement('div');
              row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;background:' + (sel ? col + '22' : 'transparent') + ';';
              row.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:' + col + ';flex-shrink:0;"></div>'
                + '<span style="font-size:12px;color:' + (sel ? col : 'rgba(255,255,255,0.7)') + ';font-weight:' + (sel ? '700' : '400') + ';flex:1;">' + (c.name || '—') + '</span>'
                + (sel ? '<span style="font-size:10px;color:' + col + ';">✓</span>' : '');
              (function(cn) {
                row.onclick = function() {
                  if (currentSet.has(cn)) currentSet.delete(cn);
                  else currentSet.add(cn);
                  renderChips();
                  dropdown.remove();
                };
              }(c.name));
              dropdown.appendChild(row);
            });
          }
          sect.appendChild(dropdown);
        };
        sect.appendChild(addBtn);

        return { el: sect, get: function() { return Array.from(currentSet); } };
      }

      var strongPicker = makeMatchupPicker('Сильнее против', '⚔', 'strongAgainst');
      var weakPicker   = makeMatchupPicker('Слабее против',  '💀', 'weakAgainst');
      var comboPicker  = makeMatchupPicker('Комбо с',        '🤝', 'combo');
      editorPanel.appendChild(strongPicker.el);
      editorPanel.appendChild(weakPicker.el);
      editorPanel.appendChild(comboPicker.el);

      // Save button
      var saveBtn = document.createElement('button');
      saveBtn.className = 'cms-btn-save';
      saveBtn.style.marginTop = '16px';
      saveBtn.textContent = '💾 Сохранить категорию';
      saveBtn.onclick = function() {
        var newName = nameInp.value.trim();
        if (!newName) { _showToast('Введи название категории', 'error'); return; }

        cat.name = newName;
        cat.color = colorInp.value;
        cat.champStars = champStars;
        // Flat список всех чемпов из всех звёзд
        cat.champions = [1,2,3].reduce(function(acc, s) {
          return acc.concat(champStars[String(s)] || []);
        }, []);
        cat.strongAgainst = strongPicker.get();
        cat.weakAgainst   = weakPicker.get();
        cat.combo         = comboPicker.get();
        if (cat.order === undefined) cat.order = cats.length - 1;

        var docData = { name: cat.name, color: cat.color, champStars: cat.champStars, champions: cat.champions, strongAgainst: cat.strongAgainst, weakAgainst: cat.weakAgainst, combo: cat.combo, order: cat.order };

        var saveP;
        if (cat._id) {
          saveP = db.collection('champCategories').doc(cat._id).set(docData, { merge: true });
        } else {
          saveP = db.collection('champCategories').add(docData).then(function(ref) { cat._id = ref.id; });
        }
        saveP.then(function() {
          window._champCategories = cats.map(function(c) { return Object.assign({}, c); });
          renderList();
          _showToast('Категория "' + cat.name + '" сохранена!', 'success');
        }).catch(function(e) { _showToast('Ошибка: ' + e.message, 'error'); });
      };
      editorPanel.appendChild(saveBtn);
    }

    renderList();
    body.appendChild(listPanel);
    body.appendChild(editorPanel);
    win.appendChild(body);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  // ═══════════════════════════════════════════════════════════════
  // 📝 GLOBAL TEXTS EDITOR — редактирование любых текстов сайта
  // Хранение: siteConfig/texts в Firestore
  // Структура: { itemCats: {physical:{label,labelEn,color},...}, runeTrees: {...}, misc: {...} }
  // ═══════════════════════════════════════════════════════════════

  // Схема всех редактируемых текстов
  var _TEXTS_SCHEMA = [
    {
      section: 'Категории предметов',
      key: 'itemCats',
      icon: '⚔',
      entries: [
        { id: 'physical',  label: 'Физические',    defaultRu: '⚔ Физические',    defaultEn: '⚔ Physical' },
        { id: 'magic',     label: 'Магические',     defaultRu: '🔮 Магические',   defaultEn: '🔮 Magic' },
        { id: 'defensive', label: 'Защитные',       defaultRu: '🛡 Защитные',     defaultEn: '🛡 Defensive' },
        { id: 'support',   label: 'Поддержка',      defaultRu: '💛 Поддержка',    defaultEn: '💛 Support' },
        { id: 'boots',     label: 'Ботинки',        defaultRu: '👟 Ботинки',      defaultEn: '👟 Boots' },
        { id: 'enchants',  label: 'Зачарования',    defaultRu: '✨ Зачарования ботинок', defaultEn: '✨ Boot Enchants' }
      ]
    },
    {
      section: 'Деревья рун',
      key: 'runeTrees',
      icon: '🔮',
      entries: [
        { id: 'keystone',    label: 'Основные',    defaultRu: '⭐ ОСНОВНЫЕ РУНЫ', defaultEn: '⭐ KEYSTONE RUNES', defaultColor: '' },
        { id: 'domination',  label: 'Доминация',   defaultRu: '🔴 ДОМИНАЦИЯ',    defaultEn: '🔴 DOMINATION',    defaultColor: '#e74c3c' },
        { id: 'precision',   label: 'Точность',    defaultRu: '🟡 ТОЧНОСТЬ',     defaultEn: '🟡 PRECISION',     defaultColor: '#f1c40f' },
        { id: 'resolve',     label: 'Стойкость',   defaultRu: '🟢 СТОЙКОСТЬ',    defaultEn: '🟢 RESOLVE',       defaultColor: '#2ecc71' },
        { id: 'inspiration', label: 'Вдохновение', defaultRu: '🔵 ВДОХНОВЕНИЕ',  defaultEn: '🔵 INSPIRATION',   defaultColor: '#5dade2' }
      ]
    },
    {
      section: 'Разное',
      key: 'misc',
      icon: '🔤',
      entries: [
        { id: 'enchantsSubLabel', label: 'Подпись зачарований', defaultRu: 'Можно добавить к любым ботинкам', defaultEn: 'Can be added to any boots' },
        { id: 'headerTitle',      label: 'Название сайта (логотип)', defaultRu: 'PRO-WILDRIFT', defaultEn: 'PRO-WILDRIFT' },
        { id: 'viewBtnMain',      label: 'Кнопка хедера: Stats',     defaultRu: 'Stats', defaultEn: 'Stats' },
        { id: 'viewBtnWrpr',      label: 'Кнопка хедера: WinRate',   defaultRu: 'WinRate', defaultEn: 'WinRate' },
        { id: 'patchBadge',       label: 'Патч-бейдж',               defaultRu: 'Patch 7.0f', defaultEn: 'Patch 7.0f' }
      ]
    }
  ];

  window.cmsOpenTextsEditor = function() {
    var db = firebase.firestore();
    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.cssText = 'max-width:680px;max-height:90vh;display:flex;flex-direction:column;padding:0;';

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;';
    hdr.innerHTML = '<h3 style="margin:0;color:#fff;font-size:18px;">📝 Тексты сайта</h3>'
      + '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>';
    win.appendChild(hdr);

    // Scrollable body
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';

    var saved = window._siteTexts || {};
    var inputs = {}; // inputs[sectionKey][entryId] = {ru, en, color}

    _TEXTS_SCHEMA.forEach(function(sec) {
      var secDiv = document.createElement('div');
      secDiv.style.marginBottom = '24px';

      var secLabel = document.createElement('div');
      secLabel.style.cssText = 'font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);';
      secLabel.textContent = sec.icon + ' ' + sec.section;
      secDiv.appendChild(secLabel);

      var savedSec = saved[sec.key] || {};
      inputs[sec.key] = {};

      sec.entries.forEach(function(entry) {
        var savedEntry = savedSec[entry.id] || {};
        var row = document.createElement('div');
        row.style.cssText = 'display:grid;gap:6px;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);';

        // Entry name
        var entryLbl = document.createElement('div');
        entryLbl.style.cssText = 'font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:2px;';
        entryLbl.textContent = entry.label;
        row.appendChild(entryLbl);

        // RU input
        var ruWrap = _makeTextInputWithIconPicker('RU', savedEntry.ru || entry.defaultRu || '');
        row.appendChild(ruWrap.wrap);

        // EN input
        var enWrap = _makeTextInputWithIconPicker('EN', savedEntry.en || entry.defaultEn || '');
        row.appendChild(enWrap.wrap);

        // Color picker row (если есть defaultColor или для runeTrees)
        var colorPicker = null;
        var colorWrap = document.createElement('div');
        colorWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
        var colorLbl = document.createElement('span');
        colorLbl.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.4);min-width:40px;';
        colorLbl.textContent = 'Цвет:';
        colorWrap.appendChild(colorLbl);
        colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = savedEntry.color || entry.defaultColor || '#ffffff';
        colorPicker.style.cssText = 'width:32px;height:28px;padding:0;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer;background:transparent;';
        colorPicker.title = 'Цвет текста';
        colorWrap.appendChild(colorPicker);
        var colorPreview = document.createElement('span');
        colorPreview.style.cssText = 'font-size:12px;font-weight:700;';
        colorPreview.style.color = colorPicker.value;
        colorPreview.textContent = 'Предпросмотр ' + entry.label;
        colorPicker.addEventListener('input', function() {
          colorPreview.style.color = colorPicker.value;
        });
        colorWrap.appendChild(colorPreview);
        row.appendChild(colorWrap);

        inputs[sec.key][entry.id] = {
          getRu: ruWrap.getValue,
          getEn: enWrap.getValue,
          getColor: function() { return colorPicker.value; }
        };

        secDiv.appendChild(row);
      });

      body.appendChild(secDiv);
    });

    win.appendChild(body);

    // Footer: save button
    var footer = document.createElement('div');
    footer.style.cssText = 'padding:14px 20px;border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;display:flex;gap:10px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = '💾 Сохранить все тексты';
    saveBtn.onclick = function() {
      var newData = {};
      _TEXTS_SCHEMA.forEach(function(sec) {
        newData[sec.key] = {};
        sec.entries.forEach(function(entry) {
          var inp = inputs[sec.key][entry.id];
          newData[sec.key][entry.id] = {
            ru: inp.getRu(),
            en: inp.getEn(),
            color: inp.getColor()
          };
        });
      });
      saveBtn.textContent = '⏳ Сохраняю...';
      saveBtn.disabled = true;
      db.collection('siteConfig').doc('texts').set(newData)
        .then(function() {
          window._siteTexts = newData;
          _applyAllSiteTexts(newData);
          _showToast('Тексты сохранены!', 'success');
          saveBtn.textContent = '💾 Сохранить все тексты';
          saveBtn.disabled = false;
        })
        .catch(function(err) {
          _showToast('Ошибка: ' + err.message, 'error');
          saveBtn.textContent = '💾 Сохранить все тексты';
          saveBtn.disabled = false;
        });
    };
    footer.appendChild(saveBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Закрыть';
    cancelBtn.onclick = function() { overlay.remove(); };
    footer.appendChild(cancelBtn);

    win.appendChild(footer);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  // Хелпер: input с кнопками вставки иконки
  function _makeTextInputWithIconPicker(lang, value) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;';

    var lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);min-width:20px;';
    lbl.textContent = lang + ':';
    row.appendChild(lbl);

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'cms-input';
    inp.value = value || '';
    inp.style.cssText = 'margin:0;flex:1;';
    row.appendChild(inp);

    // Иконки кнопки
    var icons = window._siteIcons || {};
    var iconNames = Object.keys(icons);
    if (iconNames.length > 0) {
      var iconsRow = document.createElement('div');
      iconsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;padding-left:26px;';
      iconNames.forEach(function(name) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);'
          + 'padding:2px 5px;border-radius:5px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;';
        btn.title = 'Вставить [icon:' + name + ']';
        var img = document.createElement('img');
        img.src = icons[name];
        img.style.cssText = 'height:14px;vertical-align:middle;';
        img.onerror = function() { btn.textContent = name; };
        btn.appendChild(img);
        btn.onclick = function() {
          var pos = inp.selectionStart || inp.value.length;
          var tag = '[icon:' + name + ']';
          inp.value = inp.value.slice(0, pos) + tag + inp.value.slice(pos);
          inp.focus();
          inp.setSelectionRange(pos + tag.length, pos + tag.length);
        };
        iconsRow.appendChild(btn);
      });
      wrap.appendChild(row);
      wrap.appendChild(iconsRow);
    } else {
      wrap.appendChild(row);
    }

    return {
      wrap: wrap,
      getValue: function() { return inp.value.trim(); }
    };
  }

  // Применить тексты из Firestore к DOM
  function _applyAllSiteTexts(data) {
    if (!data) return;
    var lang = localStorage.getItem('wr_lang') || 'ru';

    // Категории предметов (ITEM_CATEGORIES — обновляем массив + перерисовываем если открыто)
    if (data.itemCats) {
      ITEM_CATEGORIES.forEach(function(cat) {
        var saved = data.itemCats[cat.id];
        if (!saved) return;
        if (saved.ru) cat.label = saved.ru;
        if (saved.en) cat.labelEn = saved.en;
        if (saved.color) cat._color = saved.color;
      });
      // Перерисовываем секционные лейблы в DOM если предметы открыты
      document.querySelectorAll('.items-section-label').forEach(function(el) {
        var catId = el.getAttribute('data-cat-id');
        if (!catId) return;
        el.setAttribute('data-cms-inline', 'itemCats.' + catId);
        var saved = data.itemCats[catId];
        if (!saved) return;
        var text = lang === 'en' ? (saved.en || saved.ru) : saved.ru;
        if (text) el.textContent = text;
        if (saved.color) el.style.color = saved.color;
      });
    }

    // Деревья рун
    if (data.runeTrees) {
      RUNE_TREES.forEach(function(tree) {
        var saved = data.runeTrees[tree.id];
        if (!saved) return;
        if (saved.ru) tree.label = saved.ru;
        if (saved.en) tree.labelEn = saved.en;
        if (saved.color !== undefined) tree.color = saved.color || '';
      });
      document.querySelectorAll('.side-section[data-tree-id]').forEach(function(el) {
        var treeId = el.getAttribute('data-tree-id');
        el.setAttribute('data-cms-inline', 'runeTrees.' + treeId);
        var saved = data.runeTrees[treeId];
        if (!saved) return;
        var text = lang === 'en' ? (saved.en || saved.ru) : saved.ru;
        if (text) el.textContent = text;
        if (saved.color !== undefined) el.style.color = saved.color || '';
      });
    }

    // Разное
    if (data.misc) {
      // Подпись зачарований
      var encSub = data.misc.enchantsSubLabel;
      if (encSub) {
        document.querySelectorAll('.items-section-sublabel').forEach(function(el) {
          el.setAttribute('data-cms-inline', 'misc.enchantsSubLabel');
          el.textContent = lang === 'en' ? (encSub.en || encSub.ru) : encSub.ru;
        });
      }
      // Логотип
      var hTitle = data.misc.headerTitle;
      if (hTitle) {
        var nick = document.getElementById('nickname');
        if (nick) nick.textContent = lang === 'en' ? (hTitle.en || hTitle.ru) : hTitle.ru;
      }
      // Кнопки хедера
      var vBtnMain = data.misc.viewBtnMain;
      if (vBtnMain) {
        var el = document.getElementById('viewBtnMain');
        if (el) el.textContent = lang === 'en' ? (vBtnMain.en || vBtnMain.ru) : vBtnMain.ru;
      }
      var vBtnWrpr = data.misc.viewBtnWrpr;
      if (vBtnWrpr) {
        var elW = document.getElementById('viewBtnWrpr');
        if (elW) elW.textContent = lang === 'en' ? (vBtnWrpr.en || vBtnWrpr.ru) : vBtnWrpr.ru;
      }
      // Патч-бейдж
      var pb = data.misc.patchBadge;
      if (pb) {
        document.querySelectorAll('.patch-badge').forEach(function(el) {
          el.textContent = lang === 'en' ? (pb.en || pb.ru) : pb.ru;
        });
      }
    }
  }

  // Применить кастомные тексты ко всем [data-i18n] элементам
  function _applyCustomTexts() {
    var data = window._customTexts;
    if (!data) return;
    var lang = localStorage.getItem('wr_lang') || 'ru';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var ct = data[key];
      if (!ct) return;
      var isAttr = el.getAttribute('data-i18n-attr');
      var text = lang === 'en' ? (ct.en || ct.ru || key) : (ct.ru || key);
      if (isAttr === 'placeholder') el.placeholder = text;
      else if (isAttr === 'title') el.title = text;
      else el.textContent = text;
    });
  }

  // Применять тексты при смене языка (патчим setLang)
  var _origSetLangForTexts = window.setLang;
  if (typeof _origSetLangForTexts === 'function') {
    window.setLang = function(lang) {
      _origSetLangForTexts(lang);
      if (window._siteTexts) _applyAllSiteTexts(window._siteTexts);
      _applyCustomTexts();
    };
  }

  // Экспортируем для вызова из cmsLoadData callback
  window.cmsApplyAllSiteTexts = function() {
    if (window._siteTexts) _applyAllSiteTexts(window._siteTexts);
  };
  window.cmsApplyCustomTexts = function() { _applyCustomTexts(); };

  // ═══════════════════════════════════════════════════════════════
  // ✏ INLINE TEXT EDITING — прямо на месте, без модалки
  // ═══════════════════════════════════════════════════════════════

  // Помечаем элементы атрибутом data-cms-inline
  function _markStaticInlineElements() {
    // Элементы из _TEXTS_SCHEMA (специфичные)
    var nick = document.getElementById('nickname');
    if (nick) nick.setAttribute('data-cms-inline', 'misc.headerTitle');
    var btn1 = document.getElementById('viewBtnMain');
    if (btn1) btn1.setAttribute('data-cms-inline', 'misc.viewBtnMain');
    var btn2 = document.getElementById('viewBtnWrpr');
    if (btn2) btn2.setAttribute('data-cms-inline', 'misc.viewBtnWrpr');
    document.querySelectorAll('.patch-badge').forEach(function(el) {
      el.setAttribute('data-cms-inline', 'misc.patchBadge');
    });
    document.querySelectorAll('.items-section-sublabel').forEach(function(el) {
      el.setAttribute('data-cms-inline', 'misc.enchantsSubLabel');
    });
    // Все [data-i18n] элементы (кроме inputs/selects с data-i18n-attr)
    document.querySelectorAll('[data-i18n]:not(input):not(select):not(textarea):not([data-i18n-attr])').forEach(function(el) {
      if (!el.hasAttribute('data-cms-inline')) {
        el.setAttribute('data-cms-inline', 'i18n:' + el.getAttribute('data-i18n'));
      }
    });
  }

  window.cmsSetupInlineEditing = function() {
    if (window._inlineEditingSetup) return;
    window._inlineEditingSetup = true;

    // CSS
    var style = document.createElement('style');
    style.id = 'cms-inline-style';
    style.textContent = [
      'body.cms-admin-mode [data-cms-inline]{',
      '  outline:1px dashed rgba(255,215,0,0.35);outline-offset:2px;cursor:pointer;',
      '}',
      'body.cms-admin-mode [data-cms-inline]:hover{',
      '  outline:2px solid rgba(255,215,0,0.9);outline-offset:2px;',
      '  position:relative;',
      '}',
      '.cms-ipop{',
      '  position:fixed;background:#161625;border:1px solid rgba(255,215,0,0.45);',
      '  border-radius:10px;padding:14px 16px;z-index:100000;min-width:270px;max-width:320px;',
      '  box-shadow:0 10px 40px rgba(0,0,0,0.7);',
      '}',
      '.cms-ipop h4{margin:0 0 10px;font-size:11px;color:rgba(255,215,0,0.85);',
      '  font-weight:700;text-transform:uppercase;letter-spacing:.6px;}',
      '.cms-ipop .irow{display:flex;align-items:center;gap:6px;margin-bottom:6px;}',
      '.cms-ipop .ilbl{font-size:10px;color:rgba(255,255,255,0.38);min-width:24px;}',
      '.cms-ipop input[type=text]{flex:1;background:rgba(255,255,255,0.07);',
      '  border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;',
      '  font-size:13px;padding:5px 8px;outline:none;width:0;}',
      '.cms-ipop input[type=text]:focus{border-color:rgba(255,215,0,0.5);}',
      '.cms-ipop input[type=color]{width:30px;height:26px;padding:0;',
      '  border:1px solid rgba(255,255,255,0.2);border-radius:5px;',
      '  cursor:pointer;background:transparent;}',
      '.cms-ipop .ibtns{display:flex;gap:6px;margin-top:10px;}',
      '.cms-ipop .ibtn-save{flex:1;background:rgba(255,215,0,0.13);',
      '  border:1px solid rgba(255,215,0,0.45);color:#FFD700;border-radius:6px;',
      '  padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;}',
      '.cms-ipop .ibtn-save:hover{background:rgba(255,215,0,0.25);}',
      '.cms-ipop .ibtn-cancel{background:rgba(255,255,255,0.06);',
      '  border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.55);',
      '  border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;}',
    ].join('\n');
    document.head.appendChild(style);

    _markStaticInlineElements();

    // MutationObserver: автоматически помечаем новые [data-i18n] элементы
    var _i18nObs = new MutationObserver(function(muts) {
      if (!window._isAdmin) return;
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          var els = [];
          if (node.hasAttribute('data-i18n') && !node.matches('input,select,textarea') && !node.hasAttribute('data-i18n-attr')) els.push(node);
          node.querySelectorAll('[data-i18n]:not(input):not(select):not(textarea):not([data-i18n-attr])').forEach(function(el) { els.push(el); });
          els.forEach(function(el) {
            if (!el.hasAttribute('data-cms-inline'))
              el.setAttribute('data-cms-inline', 'i18n:' + el.getAttribute('data-i18n'));
          });
        });
      });
    });
    _i18nObs.observe(document.body, { childList: true, subtree: true });

    var _pop = null;

    function _closePop() { if (_pop) { _pop.remove(); _pop = null; } }

    function _findEntry(key) {
      // Кастомный i18n-текст
      if (key.indexOf('i18n:') === 0) {
        var k = key.slice(5);
        return { secKey: 'i18n', entry: { id: k, label: k.length > 45 ? k.slice(0, 42) + '…' : k, defaultRu: k, defaultEn: '' } };
      }
      var parts = key.split('.');
      var secKey = parts[0], entryId = parts.slice(1).join('.');
      for (var i = 0; i < _TEXTS_SCHEMA.length; i++) {
        if (_TEXTS_SCHEMA[i].key !== secKey) continue;
        for (var j = 0; j < _TEXTS_SCHEMA[i].entries.length; j++) {
          if (_TEXTS_SCHEMA[i].entries[j].id === entryId)
            return { secKey: secKey, entry: _TEXTS_SCHEMA[i].entries[j] };
        }
      }
      return null;
    }

    function _openPop(el, key) {
      _closePop();
      var found = _findEntry(key);
      if (!found) return;
      var secKey = found.secKey, entry = found.entry;
      var isI18n = secKey === 'i18n';
      var saved = isI18n
        ? ((window._customTexts || {})[entry.id] || {})
        : (((window._siteTexts || {})[secKey] || {})[entry.id] || {});

      var pop = document.createElement('div');
      pop.className = 'cms-ipop';
      _pop = pop;

      var title = document.createElement('h4');
      title.textContent = '✏ ' + entry.label;
      pop.appendChild(title);

      function makeRow(lbl, val) {
        var row = document.createElement('div'); row.className = 'irow';
        var l = document.createElement('span'); l.className = 'ilbl'; l.textContent = lbl;
        var inp = document.createElement('input'); inp.type = 'text'; inp.value = val;
        row.appendChild(l); row.appendChild(inp);
        pop.appendChild(row);
        return inp;
      }

      var ruInp = makeRow('RU:', saved.ru || (isI18n ? el.textContent.trim() : entry.defaultRu) || '');
      var enInp = makeRow('EN:', saved.en || (isI18n ? '' : entry.defaultEn) || '');

      // Цвет — только для _TEXTS_SCHEMA элементов
      var ci = null;
      if (!isI18n) {
        var crow = document.createElement('div'); crow.className = 'irow';
        var cl = document.createElement('span'); cl.className = 'ilbl'; cl.textContent = 'Цвет:';
        ci = document.createElement('input'); ci.type = 'color';
        ci.value = saved.color || entry.defaultColor || '#ffffff';
        crow.appendChild(cl); crow.appendChild(ci);
        pop.appendChild(crow);
      }

      var btns = document.createElement('div'); btns.className = 'ibtns';
      var saveBtn = document.createElement('button'); saveBtn.className = 'ibtn-save'; saveBtn.textContent = '💾 Сохранить';
      var cancelBtn = document.createElement('button'); cancelBtn.className = 'ibtn-cancel'; cancelBtn.textContent = 'Закрыть';
      cancelBtn.onclick = _closePop;
      btns.appendChild(saveBtn); btns.appendChild(cancelBtn);
      pop.appendChild(btns);

      saveBtn.onclick = function() {
        var db = firebase.firestore();
        saveBtn.textContent = '⏳'; saveBtn.disabled = true;
        if (isI18n) {
          var newData = JSON.parse(JSON.stringify(window._customTexts || {}));
          newData[entry.id] = { ru: ruInp.value.trim(), en: enInp.value.trim() };
          db.collection('siteConfig').doc('customTexts').set(newData)
            .then(function() {
              window._customTexts = newData;
              _applyCustomTexts();
              _showToast('Сохранено!', 'success');
              _closePop();
            })
            .catch(function(err) {
              _showToast('Ошибка: ' + err.message, 'error');
              saveBtn.textContent = '💾 Сохранить'; saveBtn.disabled = false;
            });
        } else {
          var newData = JSON.parse(JSON.stringify(window._siteTexts || {}));
          if (!newData[secKey]) newData[secKey] = {};
          newData[secKey][entry.id] = { ru: ruInp.value.trim(), en: enInp.value.trim(), color: ci ? ci.value : '' };
          db.collection('siteConfig').doc('texts').set(newData)
            .then(function() {
              window._siteTexts = newData;
              _applyAllSiteTexts(newData);
              _markStaticInlineElements();
              _showToast('Сохранено!', 'success');
              _closePop();
            })
            .catch(function(err) {
              _showToast('Ошибка: ' + err.message, 'error');
              saveBtn.textContent = '💾 Сохранить'; saveBtn.disabled = false;
            });
        }
      };

      document.body.appendChild(pop);

      // Позиционирование — под элементом, не выходим за края
      var rect = el.getBoundingClientRect();
      var ph = pop.offsetHeight, pw = pop.offsetWidth;
      var top = rect.bottom + 8, left = rect.left;
      if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
      if (left < 8) left = 8;
      if (top + ph > window.innerHeight - 10) top = rect.top - ph - 8;
      if (top < 8) top = 8;
      pop.style.top = top + 'px';
      pop.style.left = left + 'px';

      ruInp.focus(); ruInp.select();
    }

    // Глобальный обработчик в capture-фазе — перехватываем клик на [data-cms-inline]
    document.addEventListener('click', function(e) {
      if (!window._isAdmin) return;

      // Клик вне попоувера — закрыть
      if (_pop && !_pop.contains(e.target)) _closePop();

      var target = e.target.closest('[data-cms-inline]');
      if (!target) return;

      // Не перехватываем клики внутри кнопок/ссылок — чтобы onclick кнопки срабатывал
      var btn = e.target.closest('button, a');
      if (btn && btn !== target && btn.contains(target)) return;

      e.preventDefault();
      e.stopPropagation();
      _openPop(target, target.getAttribute('data-cms-inline'));
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _pop) _closePop();
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 📰 CHANGES FEED — лента изменений и патч-нотов
  // Источники: changesFeed (новости), patchnotes (чемпионы), changelog (предметы/руны)
  // ═══════════════════════════════════════════════════════════════

  window._changesFeed = null; // admin-added entries from Firestore

  // Загрузка changesFeed при старте
  window.cmsLoadChangesFeed = function(callback) {
    var db = firebase.firestore();
    db.collection('changesFeed').orderBy('timestamp', 'desc').limit(50).get()
      .then(function(snap) {
        window._changesFeed = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          d._id = doc.id;
          window._changesFeed.push(d);
        });
        _updateChangesBadge();
        if (callback) callback();
      })
      .catch(function() { window._changesFeed = []; if (callback) callback(); });
  };

  // Бейдж на кнопке сайдбара (показывает кол-во непрочитанных)
  function _updateChangesBadge() {
    var badge = document.getElementById('sidebarChangesBadge');
    if (!badge) return;
    var lastSeen = parseInt(localStorage.getItem('_changesLastSeen') || '0', 10);
    var entries = window._changesFeed || [];
    var unseen = entries.filter(function(e) {
      var ts = e.timestamp && e.timestamp.seconds ? e.timestamp.seconds * 1000 : 0;
      return ts > lastSeen;
    }).length;
    if (unseen > 0) {
      badge.textContent = unseen;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  // Рендеринг ленты
  window.changesRender = function() {
    var body = document.getElementById('changesFeedBody');
    if (!body) return;
    body.innerHTML = '';

    // Обнуляем бейдж: пользователь открыл панель
    localStorage.setItem('_changesLastSeen', Date.now().toString());
    _updateChangesBadge();

    var lang = localStorage.getItem('wr_lang') || 'ru';
    var isAdmin = window._isAdmin;
    var allItems = []; // { ts, html }

    // ── 1. Admin-added news из changesFeed ──
    (window._changesFeed || []).forEach(function(e) {
      var ts = e.timestamp && e.timestamp.seconds ? e.timestamp.seconds * 1000 : 0;
      var typeColors = { news: '#6D3FF5', buff: '#2ecc71', nerf: '#e74c3c', adjust: '#f1c40f', patch: '#f1c40f' };
      var typeLabels = { news: '📣 Новость', buff: '🟢 Бафф', nerf: '🔴 Нерф', adjust: '🟡 Корректировка', patch: '🔖 Патч' };
      var color = typeColors[e.type || 'news'] || '#6D3FF5';
      var typeLabel = typeLabels[e.type || 'news'] || '📣 Новость';
      var title = e.title || '';
      var text = (lang === 'en' && e.text_en) ? e.text_en : (e.text || '');
      var patchBadge = e.patch ? '<span class="cf-patch-badge">Patch ' + e.patch + '</span>' : '';
      var adminBtns = isAdmin ? '<div class="cf-admin-btns">'
        + '<button onclick="cmsEditChangesEntry(\'' + e._id + '\')" title="Редактировать">✏</button>'
        + '<button onclick="cmsDeleteChangesEntry(\'' + e._id + '\')" title="Удалить">🗑</button>'
        + '</div>' : '';

      var html = '<div class="cf-card" style="border-left-color:' + color + ';">'
        + adminBtns
        + '<div class="cf-card-top">'
        + '<span class="cf-type-badge" style="background:' + color + '20;color:' + color + ';">' + typeLabel + '</span>'
        + patchBadge
        + '<span class="cf-date">' + _formatDate(ts) + '</span>'
        + '</div>'
        + (title ? '<div class="cf-card-title">' + _escHtml(title) + '</div>' : '')
        + (text ? '<div class="cf-card-text">' + _renderCfText(text) + '</div>' : '')
        + '</div>';

      allItems.push({ ts: ts, html: html });
    });

    // ── 2. Патч-ноты чемпионов из _cmsPatchnotes ──
    var patchGroups = {}; // groupBy patch version
    (window._cmsPatchnotes || []).forEach(function(note) {
      if (!note.champion || !note.type) return;
      var p = note.patch || 'Unknown';
      if (!patchGroups[p]) patchGroups[p] = { buff: [], nerf: [], adjust: [], ts: note.timestamp && note.timestamp.seconds ? note.timestamp.seconds * 1000 : 0 };
      patchGroups[p][note.type] = patchGroups[p][note.type] || [];
      patchGroups[p][note.type].push(note);
      if (patchGroups[p].ts < (note.timestamp && note.timestamp.seconds ? note.timestamp.seconds * 1000 : 0)) {
        patchGroups[p].ts = note.timestamp.seconds * 1000;
      }
    });

    Object.keys(patchGroups).forEach(function(patch) {
      var g = patchGroups[patch];
      var rows = '';

      function renderChampRow(note, color, emoji) {
        var chText = (lang === 'en' && note.change_en) ? note.change_en : (note.change || '');
        return '<div class="cf-champ-row">'
          + '<span class="cf-champ-dot" style="background:' + color + ';"></span>'
          + '<span class="cf-champ-name">' + _escHtml(note.champion) + '</span>'
          + (chText ? '<span class="cf-champ-change">' + _escHtml(chText) + '</span>' : '')
          + '</div>';
      }

      (g.buff || []).forEach(function(n) { rows += renderChampRow(n, '#2ecc71', '🟢'); });
      (g.nerf || []).forEach(function(n) { rows += renderChampRow(n, '#e74c3c', '🔴'); });
      (g.adjust || []).forEach(function(n) { rows += renderChampRow(n, '#f1c40f', '🟡'); });

      if (!rows) return;

      var totalCount = (g.buff||[]).length + (g.nerf||[]).length + (g.adjust||[]).length;
      var html = '<div class="cf-card" style="border-left-color:#5dade2;">'
        + '<div class="cf-card-top">'
        + '<span class="cf-type-badge" style="background:#5dade220;color:#5dade2;">⚔ Чемпионы</span>'
        + '<span class="cf-patch-badge">Patch ' + _escHtml(patch) + '</span>'
        + '<span class="cf-date">' + (g.buff||[]).length + '🟢 ' + (g.nerf||[]).length + '🔴 ' + (g.adjust||[]).length + '🟡</span>'
        + '</div>'
        + '<div class="cf-card-title">Изменения чемпионов · ' + totalCount + ' героев</div>'
        + '<div class="cf-champ-list">' + rows + '</div>'
        + '</div>';

      allItems.push({ ts: g.ts, html: html });
    });

    // ── 3. Изменения предметов/рун из changelog ──
    // Берём только последние 20 из localStorage/memory (changelog уже был загружен отдельно)
    // Нет смысла перегружать, показываем только add/edit записи предметов/рун
    var clItems = [];
    if (window._cmsChangelogCache) {
      window._cmsChangelogCache.forEach(function(entry) {
        if (entry.entity !== 'item' && entry.entity !== 'rune') return;
        var ts = entry.timestamp && entry.timestamp.seconds ? entry.timestamp.seconds * 1000 : 0;
        var color = entry.type === 'add' ? '#2ecc71' : entry.type === 'delete' ? '#e74c3c' : '#6D3FF5';
        var typeStr = entry.type === 'add' ? '➕ Добавлено' : entry.type === 'delete' ? '🗑 Удалено' : '✏ Изменено';
        var entityStr = entry.entity === 'item' ? '📦 Предмет' : '💎 Руна';
        var html = '<div class="cf-card" style="border-left-color:' + color + ';">'
          + '<div class="cf-card-top">'
          + '<span class="cf-type-badge" style="background:' + color + '20;color:' + color + ';">' + typeStr + '</span>'
          + '<span class="cf-type-badge" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);">' + entityStr + '</span>'
          + '<span class="cf-date">' + _formatDate(ts) + '</span>'
          + '</div>'
          + '<div class="cf-card-title">' + _escHtml(entry.name || '—') + '</div>'
          + '</div>';
        clItems.push({ ts: ts, html: html });
      });
    }
    // Добавляем только последние 10 changelog записей
    clItems.sort(function(a, b) { return b.ts - a.ts; });
    allItems = allItems.concat(clItems.slice(0, 10));

    // ── Сортируем по времени убыванию ──
    allItems.sort(function(a, b) { return b.ts - a.ts; });

    if (allItems.length === 0) {
      body.innerHTML = '<div class="cf-empty">Пока нет изменений.<br><span style="font-size:12px;color:rgba(255,255,255,0.3);">Обновляется после каждого патча</span></div>';
    } else {
      allItems.forEach(function(item) {
        var div = document.createElement('div');
        div.innerHTML = item.html;
        while (div.firstChild) body.appendChild(div.firstChild);
      });
    }

    // ── Admin: кнопка добавить новость ──
    if (isAdmin) {
      var addBtn = document.createElement('button');
      addBtn.className = 'cf-add-btn';
      addBtn.innerHTML = '➕ Добавить новость / патч-запись';
      addBtn.onclick = function() { cmsOpenChangesEntryEditor(null); };
      body.insertBefore(addBtn, body.firstChild);
    }
  };

  // ── Хелперы ──
  function _formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' дн назад';
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }

  function _escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _renderCfText(text) {
    // Простой render: переносы строк → <br>, иконки
    var escaped = _escHtml(text).replace(/\n/g, '<br>');
    // [icon:name]
    escaped = escaped.replace(/\[icon:([^\]]+)\]/g, function(_, name) {
      var url = (window._siteIcons || {})[name];
      return url ? '<img loading="lazy" decoding="async" src="' + url + '" style="height:16px;vertical-align:middle;margin:0 2px;">' : '[' + name + ']';
    });
    return escaped;
  }

  // ── Admin: редактор записи changesFeed ──
  window.cmsOpenChangesEntryEditor = function(entry) {
    var isNew = !entry;
    var db = firebase.firestore();
    var data = entry ? Object.assign({}, entry) : {
      type: 'news', title: '', text: '', text_en: '', patch: '', pinned: false
    };

    var overlay = document.createElement('div');
    overlay.className = 'cms-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var win = document.createElement('div');
    win.className = 'cms-modal-win';
    win.style.maxWidth = '500px';

    win.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
      + '<h3 style="margin:0;color:#fff;font-size:18px;">' + (isNew ? '➕ Новая запись' : '✏ Редактировать') + '</h3>'
      + '<button onclick="this.closest(\'.cms-modal-overlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;">✕</button>'
      + '</div>';

    // Type select
    var typeGroup = document.createElement('div');
    typeGroup.style.marginBottom = '12px';
    typeGroup.innerHTML = '<label style="display:block;color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:4px;">ТИП ЗАПИСИ</label>';
    var typeSelect = document.createElement('select');
    typeSelect.className = 'cms-input';
    typeSelect.style.margin = '0';
    [
      { v: 'news', l: '📣 Новость' }, { v: 'patch', l: '🔖 Патч' },
      { v: 'buff', l: '🟢 Бафф' }, { v: 'nerf', l: '🔴 Нерф' }, { v: 'adjust', l: '🟡 Корректировка' }
    ].forEach(function(o) {
      var opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.l;
      if (data.type === o.v) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeGroup.appendChild(typeSelect);
    win.appendChild(typeGroup);

    // Fields
    function _mkField(label, key, isTextarea) {
      var g = document.createElement('div');
      g.style.marginBottom = '12px';
      g.innerHTML = '<label style="display:block;color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;margin-bottom:4px;">' + label + '</label>';
      var el = isTextarea ? document.createElement('textarea') : document.createElement('input');
      el.className = 'cms-input';
      el.style.margin = '0';
      if (isTextarea) el.rows = 4;
      else el.type = 'text';
      el.value = data[key] || '';
      el.setAttribute('data-key', key);
      if (isTextarea) el.style.resize = 'vertical';
      g.appendChild(el);
      win.appendChild(g);
      return el;
    }

    var titleEl = _mkField('ЗАГОЛОВОК', 'title', false);
    var patchEl = _mkField('ПАТЧ (напр. 7.0g)', 'patch', false);
    var textEl  = _mkField('ТЕКСТ (RU) — поддерживает [icon:name]', 'text', true);
    var textEnEl = _mkField('ТЕКСТ (EN) — необязательно', 'text_en', true);

    // Pinned
    var pinnedRow = document.createElement('div');
    pinnedRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    var pinnedCb = document.createElement('input');
    pinnedCb.type = 'checkbox';
    pinnedCb.checked = !!data.pinned;
    pinnedCb.id = 'cfPinnedCb';
    var pinnedLbl = document.createElement('label');
    pinnedLbl.htmlFor = 'cfPinnedCb';
    pinnedLbl.style.cssText = 'color:rgba(255,255,255,0.6);font-size:13px;cursor:pointer;';
    pinnedLbl.textContent = '📌 Закрепить вверху';
    pinnedRow.appendChild(pinnedCb);
    pinnedRow.appendChild(pinnedLbl);
    win.appendChild(pinnedRow);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'cms-btn-save';
    saveBtn.textContent = isNew ? '➕ Добавить' : '💾 Сохранить';
    saveBtn.onclick = function() {
      var newData = {
        type: typeSelect.value,
        title: titleEl.value.trim(),
        patch: patchEl.value.trim(),
        text: textEl.value.trim(),
        text_en: textEnEl.value.trim(),
        pinned: pinnedCb.checked,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      saveBtn.disabled = true;
      saveBtn.textContent = '⏳...';

      var ref = isNew
        ? db.collection('changesFeed').add(newData)
        : db.collection('changesFeed').doc(entry._id).set(newData, { merge: true });

      ref.then(function(docRef) {
          if (isNew && docRef) newData._id = docRef.id;
          else if (!isNew) newData._id = entry._id;

          if (!window._changesFeed) window._changesFeed = [];
          if (isNew) {
            window._changesFeed.unshift(newData);
          } else {
            var idx = window._changesFeed.findIndex(function(e) { return e._id === entry._id; });
            if (idx !== -1) window._changesFeed[idx] = newData;
          }

          _showToast(isNew ? 'Запись добавлена!' : 'Запись обновлена!', 'success');
          overlay.remove();
          if (window.changesRender) window.changesRender();
        })
        .catch(function(err) {
          _showToast('Ошибка: ' + err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = isNew ? '➕ Добавить' : '💾 Сохранить';
        });
    };
    btnRow.appendChild(saveBtn);

    if (!isNew) {
      var delBtn = document.createElement('button');
      delBtn.className = 'cms-btn-delete';
      delBtn.textContent = '🗑 Удалить';
      delBtn.onclick = function() {
        window._showConfirm({ msg: 'Запись будет удалена.', title: 'Удалить?', confirmText: 'Удалить' }, function() {
          db.collection('changesFeed').doc(entry._id).delete().then(function() {
            window._changesFeed = (window._changesFeed || []).filter(function(e) { return e._id !== entry._id; });
            _showToast('Удалено', 'success');
            overlay.remove();
            if (window.changesRender) window.changesRender();
          }).catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); });
        });
      };
      btnRow.appendChild(delBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cms-btn-cancel';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    win.appendChild(btnRow);
    overlay.appendChild(win);
    document.body.appendChild(overlay);
  };

  window.cmsEditChangesEntry = function(id) {
    var entry = (window._changesFeed || []).find(function(e) { return e._id === id; });
    if (entry) cmsOpenChangesEntryEditor(entry);
  };

  window.cmsDeleteChangesEntry = function(id) {
    var entry = (window._changesFeed || []).find(function(e) { return e._id === id; });
    if (!entry) return;
    window._showConfirm({ msg: 'Запись «' + (entry.title || 'без названия') + '» будет удалена.', title: 'Удалить?', confirmText: 'Удалить' }, function() {
      firebase.firestore().collection('changesFeed').doc(id).delete().then(function() {
        window._changesFeed = (window._changesFeed || []).filter(function(e) { return e._id !== id; });
        _showToast('Удалено', 'success');
        if (window.changesRender) window.changesRender();
      }).catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); });
    });
  };

  // ═══════════════════════════════════════════
  // FONT SWITCHER
  // ═══════════════════════════════════════════

  var _FONT_OPTIONS = [
    { id: 'default',    label: 'По умолчанию',  family: null,                              google: null },
    { id: 'inter',      label: 'Inter',          family: "'Inter', sans-serif",             google: 'Inter:wght@400;600;700;900' },
    { id: 'roboto',     label: 'Roboto',         family: "'Roboto', sans-serif",            google: 'Roboto:wght@400;700;900' },
    { id: 'montserrat', label: 'Montserrat',     family: "'Montserrat', sans-serif",        google: 'Montserrat:wght@400;700;900' },
    { id: 'oswald',     label: 'Oswald',         family: "'Oswald', sans-serif",            google: 'Oswald:wght@400;700' },
    { id: 'rajdhani',   label: 'Rajdhani',       family: "'Rajdhani', sans-serif",          google: 'Rajdhani:wght@400;700' },
    { id: 'orbitron',   label: 'Orbitron',       family: "'Orbitron', sans-serif",          google: 'Orbitron:wght@400;700;900' },
    { id: 'exo2',       label: 'Exo 2',          family: "'Exo 2', sans-serif",             google: 'Exo+2:wght@400;700;900' },
    { id: 'bebas',      label: 'Bebas Neue',     family: "'Bebas Neue', sans-serif",        google: 'Bebas+Neue' },
    { id: 'nunito',     label: 'Nunito',         family: "'Nunito', sans-serif",            google: 'Nunito:wght@400;700;900' },
    { id: 'pressstart', label: 'Press Start 2P', family: "'Press Start 2P', monospace",     google: 'Press+Start+2P' }
  ];

  function _applyFont(fontId) {
    var opt = null;
    for (var i = 0; i < _FONT_OPTIONS.length; i++) {
      if (_FONT_OPTIONS[i].id === fontId) { opt = _FONT_OPTIONS[i]; break; }
    }
    if (!opt) opt = _FONT_OPTIONS[0];
    var linkEl = document.getElementById('cms-google-font');
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'cms-google-font';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }
    linkEl.href = opt.google ? 'https://fonts.googleapis.com/css2?family=' + opt.google + '&display=swap' : '';
    document.documentElement.style.setProperty(
      '--site-font',
      opt.family || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
  }

  window.cmsLoadFonts = function() {
    firebase.firestore().collection('siteConfig').doc('fonts').get()
      .then(function(doc) { if (doc.exists && doc.data().bodyFont) _applyFont(doc.data().bodyFont); })
      .catch(function() {});
  };

  window.cmsOpenFontEditor = function() {
    var db = firebase.firestore();
    db.collection('siteConfig').doc('fonts').get().then(function(docSnap) {
      var currentFont = docSnap.exists ? (docSnap.data().bodyFont || 'default') : 'default';
      var selectedFont = currentFont;

      var overlay = document.createElement('div');
      overlay.className = 'cms-modal-overlay';
      overlay.onclick = function(e) { if (e.target === overlay) { _applyFont(currentFont); overlay.remove(); } };

      var win = document.createElement('div');
      win.className = 'cms-modal-win';
      win.style.cssText = 'max-width:580px;max-height:90vh;display:flex;flex-direction:column;padding:0;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;';
      hdr.innerHTML = '<h3 style="margin:0;color:#fff;font-size:18px;">🔤 Шрифты сайта</h3>';
      var closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:22px;cursor:pointer;';
      closeBtn.textContent = '✕';
      closeBtn.onclick = function() { _applyFont(currentFont); overlay.remove(); };
      hdr.appendChild(closeBtn);
      win.appendChild(hdr);

      // Load all preview fonts at once
      var allGFonts = _FONT_OPTIONS.filter(function(f) { return f.google; }).map(function(f) { return f.google; });
      var previewLink = document.createElement('link');
      previewLink.rel = 'stylesheet';
      previewLink.href = 'https://fonts.googleapis.com/css2?family=' + allGFonts.join('&family=') + '&display=swap';
      document.head.appendChild(previewLink);

      var grid = document.createElement('div');
      grid.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;';

      _FONT_OPTIONS.forEach(function(font) {
        var card = document.createElement('div');
        card.dataset.fontCard = font.id;
        var sel = font.id === selectedFont;
        card.style.cssText = 'padding:14px 10px;border-radius:12px;border:2px solid '
          + (sel ? 'var(--accent)' : 'rgba(255,255,255,0.1)') + ';background:'
          + (sel ? 'rgba(11,196,227,0.08)' : 'rgba(255,255,255,0.03)')
          + ';cursor:pointer;text-align:center;transition:all 0.2s;user-select:none;';

        var previewTxt = document.createElement('div');
        previewTxt.style.cssText = 'font-size:30px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1;';
        previewTxt.style.fontFamily = font.family || 'inherit';
        previewTxt.textContent = 'Aa';

        var nameTxt = document.createElement('div');
        nameTxt.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;line-height:1.3;';
        nameTxt.textContent = font.label;

        card.appendChild(previewTxt);
        card.appendChild(nameTxt);

        card.onmouseenter = function() { if (font.id !== selectedFont) card.style.borderColor = 'rgba(255,255,255,0.3)'; };
        card.onmouseleave = function() { if (font.id !== selectedFont) card.style.borderColor = 'rgba(255,255,255,0.1)'; };
        card.onclick = function() {
          selectedFont = font.id;
          grid.querySelectorAll('[data-font-card]').forEach(function(c) {
            var now = c.dataset.fontCard === selectedFont;
            c.style.borderColor = now ? 'var(--accent)' : 'rgba(255,255,255,0.1)';
            c.style.background  = now ? 'rgba(11,196,227,0.08)' : 'rgba(255,255,255,0.03)';
          });
          _applyFont(font.id);
        };
        grid.appendChild(card);
      });
      win.appendChild(grid);

      var footer = document.createElement('div');
      footer.style.cssText = 'display:flex;gap:8px;padding:14px 20px;border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;';

      var saveBtn = document.createElement('button');
      saveBtn.className = 'cms-btn-save';
      saveBtn.textContent = '💾 Сохранить';
      saveBtn.onclick = function() {
        saveBtn.disabled = true; saveBtn.textContent = '⏳...';
        db.collection('siteConfig').doc('fonts').set({ bodyFont: selectedFont }, { merge: true })
          .then(function() { _showToast('Шрифт сохранён!', 'success'); overlay.remove(); })
          .catch(function(err) { _showToast('Ошибка: ' + err.message, 'error'); saveBtn.disabled = false; saveBtn.textContent = '💾 Сохранить'; });
      };
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'cms-btn-cancel';
      cancelBtn.textContent = 'Отмена';
      cancelBtn.onclick = function() { _applyFont(currentFont); overlay.remove(); };
      footer.appendChild(saveBtn);
      footer.appendChild(cancelBtn);
      win.appendChild(footer);
      overlay.appendChild(win);
      document.body.appendChild(overlay);
    });
  };

  // ═══════════════════════════════════════════
  // INLINE TEXT EDITOR (event delegation, scoped)
  // ═══════════════════════════════════════════

  (function() {
    var _inlineTexts = {};
    var _activeEdit  = null;

    // Tags that should never be treated as text targets (form elements, media, scripts)
    // BUTTON and A are NOT here — in edit mode their text IS editable
    var _SKIP = { SCRIPT:1,STYLE:1,INPUT:1,TEXTAREA:1,SELECT:1,OPTION:1,SVG:1,PATH:1,IMG:1,CANVAS:1 };

    /* ── helpers ── */
    function _directText(el) {
      var t = '';
      for (var i = 0; i < el.childNodes.length; i++)
        if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].textContent;
      return t.trim();
    }

    function _applyText(el, text) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim().length > 0) { n.textContent = text; return; }
      }
      el.textContent = text;
    }

    function _makeKey(el) {
      if (el.dataset && el.dataset.cmsKey) return el.dataset.cmsKey;
      if (el.dataset && el.dataset.i18n)   return 'i18n__' + el.dataset.i18n;
      var parts = [], curr = el;
      while (curr && curr !== document.body && parts.length < 5) {
        var seg = curr.tagName.toLowerCase();
        if (curr.id) { parts.unshift('#' + curr.id); break; }
        if (curr.className && typeof curr.className === 'string') {
          var cls = curr.className.trim().split(/\s+/).filter(function(c) {
            return c && !c.startsWith('cms-') && c.length < 28;
          }).slice(0, 2).join('.');
          if (cls) seg += '.' + cls;
        }
        if (curr.parentElement) {
          var sib = [].filter.call(curr.parentElement.children, function(s) { return s.tagName === curr.tagName; });
          if (sib.length > 1) seg += ':nth-of-type(' + ([].indexOf.call(sib, curr) + 1) + ')';
        }
        parts.unshift(seg);
        curr = curr.parentElement;
      }
      return parts.join('>');
    }

    // Старый формат: значение — строка (трактуем как RU)
    // Новый формат: { ru, en }. Пустая строка для другого языка ⇒ не применяем оверрайд.
    function _getLangText(val, lang) {
      if (val == null) return null;
      if (typeof val === 'string') return lang === 'ru' ? val : null;
      if (typeof val === 'object') {
        var t = val[lang];
        return (typeof t === 'string' && t.length > 0) ? t : null;
      }
      return null;
    }

    function _applyOverrides(root) {
      var lang = (window._lang === 'en') ? 'en' : 'ru';
      Object.keys(_inlineTexts).forEach(function(key) {
        var text = _getLangText(_inlineTexts[key], lang);
        if (text == null) return;
        var sel = key.startsWith('i18n__') ? '[data-i18n="' + key.slice(6) + '"]' : key;
        try { root.querySelectorAll(sel).forEach(function(el) { _applyText(el, text); }); } catch(e) {}
      });
    }

    window.cmsLoadInlineTexts = function() {
      firebase.firestore().collection('siteConfig').doc('inlineTexts').get()
        .then(function(doc) {
          if (doc.exists) { _inlineTexts = doc.data() || {}; _applyOverrides(document); }
        }).catch(function() {});
    };

    // Вызывается из i18n.js после applyLang(), чтобы перезаписать DOM нужным языком
    window.cmsApplyInlineOverrides = function() { _applyOverrides(document); };

    /* ── popup ── */
    function _closePopup() {
      if (_activeEdit) { _activeEdit.popup.remove(); _activeEdit = null; }
    }

    function _openPopup(el, key) {
      _closePopup();
      var domText = _directText(el);
      var currentLang = (window._lang === 'en') ? 'en' : 'ru';

      // Распаковываем сохранённое значение в RU/EN, остальное — берём из DOM для текущего языка
      var saved = _inlineTexts[key];
      var ruVal = '', enVal = '';
      if (saved != null) {
        if (typeof saved === 'string')      { ruVal = saved; }
        else if (typeof saved === 'object') { ruVal = saved.ru || ''; enVal = saved.en || ''; }
      }
      if (currentLang === 'ru' && !ruVal) ruVal = domText;
      if (currentLang === 'en' && !enVal) enVal = domText;

      var popup = document.createElement('div');
      popup.className = 'cms-inline-edit-popup';

      function _makeField(labelText, value) {
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.55);font-weight:700;letter-spacing:0.5px;margin-bottom:-3px;';
        lbl.textContent = labelText;
        var ta = document.createElement('textarea');
        ta.className = 'cms-inline-edit-input';
        ta.value = value;
        ta.rows = Math.min(Math.max(1, Math.ceil((value.length || 1) / 35)), 4);
        return { label: lbl, input: ta };
      }

      var ruField = _makeField('🇷🇺 RU', ruVal);
      var enField = _makeField('🇺🇸 EN', enVal);

      var btnRow = document.createElement('div');
      btnRow.className = 'cms-inline-edit-btnrow';

      var saveBtn = document.createElement('button');
      saveBtn.className = 'cms-inline-save-btn';
      saveBtn.textContent = '💾 Сохранить';
      saveBtn.onclick = function(e) {
        e.stopPropagation();
        saveBtn.disabled = true; saveBtn.textContent = '⏳...';
        var newVal = { ru: ruField.input.value, en: enField.input.value };
        var upd = {}; upd[key] = newVal;
        firebase.firestore().collection('siteConfig').doc('inlineTexts').set(upd, { merge: true })
          .then(function() {
            _inlineTexts[key] = newVal;
            var displayText = _getLangText(newVal, currentLang);
            if (displayText != null) {
              _applyText(el, displayText);
              var sel = key.startsWith('i18n__') ? '[data-i18n="' + key.slice(6) + '"]' : key;
              try { document.querySelectorAll(sel).forEach(function(e2) { _applyText(e2, displayText); }); } catch(ex) {}
            }
            _closePopup();
            _showToast('Текст сохранён (RU + EN)!', 'success');
          })
          .catch(function(err) {
            _showToast('Ошибка: ' + err.message, 'error');
            saveBtn.disabled = false; saveBtn.textContent = '💾 Сохранить';
          });
      };

      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'cms-inline-cancel-btn';
      cancelBtn.textContent = '✕';
      cancelBtn.onclick = function(e) { e.stopPropagation(); _closePopup(); };

      var keyLbl = document.createElement('div');
      keyLbl.className = 'cms-inline-key-label';
      keyLbl.textContent = key.length > 55 ? key.slice(0, 52) + '…' : key;

      btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
      popup.appendChild(ruField.label); popup.appendChild(ruField.input);
      popup.appendChild(enField.label); popup.appendChild(enField.input);
      popup.appendChild(btnRow); popup.appendChild(keyLbl);

      var rect = el.getBoundingClientRect();
      var top = rect.bottom + 6;
      if (top + 220 > window.innerHeight) top = Math.max(4, rect.top - 226);
      popup.style.top  = top + 'px';
      popup.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 320)) + 'px';

      document.body.appendChild(popup);
      var focusInput = (currentLang === 'en') ? enField.input : ruField.input;
      focusInput.focus(); focusInput.select();
      _activeEdit = { popup: popup, el: el, key: key };
    }

    // Close popup when clicking outside it
    document.addEventListener('click', function(e) {
      if (_activeEdit && !_activeEdit.popup.contains(e.target)) _closePopup();
    });

    /* ── walk up from click target to find a valid text element ──
       Returns null if we hit an interactive element first (preserves normal clicks). */
    function _findTextTarget(clickTarget, stopEl) {
      var textTarget = null;
      var el = clickTarget;
      while (el && el !== stopEl) {
        if (_SKIP[el.tagName])                             return null;
        if (el.dataset && el.dataset.cmsInlineSkip)        return null;
        if (!textTarget && _directText(el).length > 1)     textTarget = el;
        el = el.parentElement;
      }
      return textTarget;
    }

    /* ── ОДИН глобальный floating toggle ──
       Поверх всего (z-index: 999999). ВКЛ → весь текст на экране редактируется
       (главная, модалки, всё). ВЫКЛ → ничего не перехватывается. */
    window.cmsInitInlineEdit = function() {
      if (document.getElementById('cmsEditModeToggle')) return;
      window.cmsLoadInlineTexts();

      var editOn = false;
      var listener = null;

      var btn = document.createElement('button');
      btn.id = 'cmsEditModeToggle';
      btn.className = 'cms-edit-mode-toggle';
      btn.setAttribute('data-cms-inline-skip', '1');
      btn.innerHTML = '<span class="cms-edit-toggle-icon">✏</span>'
        + '<span class="cms-edit-toggle-label">Редактировать тексты</span>';

      btn.onclick = function(e) {
        e.stopPropagation();
        editOn = !editOn;
        btn.classList.toggle('active', editOn);
        btn.querySelector('.cms-edit-toggle-label').textContent =
          editOn ? 'Редактирование ВКЛ' : 'Редактировать тексты';
        document.body.classList.toggle('cms-edit-mode', editOn);

        if (editOn) {
          listener = function(e) {
            // Пропускаем только саму кнопку toggle и popup редактора
            if (e.target.closest && e.target.closest('#cmsEditModeToggle')) return;
            if (e.target.closest && e.target.closest('.cms-inline-edit-popup')) return;
            var target = _findTextTarget(e.target, document.body);
            if (!target) return;
            // capture phase: перехватываем ДО onclick
            e.stopPropagation();
            e.preventDefault();
            var key = _makeKey(target);
            target.dataset.cmsKey = key;
            _openPopup(target, key);
          };
          // capture=true на document — ловим ВСЁ, включая модалки
          document.addEventListener('click', listener, true);
        } else {
          if (listener) { document.removeEventListener('click', listener, true); listener = null; }
          _closePopup();
        }
      };

      document.body.appendChild(btn);
    };

  })();

})();;
