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

  window.cmsLoadData = function(callback) {
    var db = firebase.firestore();
    var loaded = { items: false, runes: false };

    function checkDone() {
      if (loaded.items && loaded.runes) {
        window._cmsLoaded = true;
        if (callback) callback();
      }
    }

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
      if (cat.id === 'enchants') label.style.marginTop = '16px';
      label.textContent = (typeof t === 'function' && localStorage.getItem('wr_lang') === 'en') ? cat.labelEn : cat.label;
      container.appendChild(label);

      if (cat.id === 'enchants') {
        var sub = document.createElement('div');
        sub.className = 'items-section-sublabel';
        sub.textContent = (typeof t === 'function') ? t('Можно добавить к любым ботинкам') : 'Можно добавить к любым ботинкам';
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
    var tip = (item.name_ru || '') + '\u00A6' + (item.cost || '') + '\u00A6' + (item.stats || '') + '\u00A6' + (item.description || '');
    var card = document.createElement('div');
    card.className = 'item-card';
    card.setAttribute('data-tip', tip);
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
      section.style.cssText = 'padding:0;margin:' + (tree.id === 'keystone' ? '0 0 8px' : '16px 0 8px') + ';';
      if (tree.color) section.style.color = tree.color;
      section.textContent = (typeof t === 'function' && localStorage.getItem('wr_lang') === 'en') ? tree.labelEn : tree.label;
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
    var tip = (rune.name_ru || '') + '\u00A6' + (rune.category || '') + '\u00A6\u00A6' + (rune.description || '');
    var card = document.createElement('div');
    card.className = 'rune-card';
    card.setAttribute('data-tip', tip);
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
      name_ru: '', name_en: '', cost: '', stats: '', description: '',
      image: '', category: defaultCategory || 'physical', order: 999
    };

    var modal = _createEditorModal('Предмет', isNew, data, [
      { key: 'name_ru', label: 'Название (RU)', type: 'text' },
      { key: 'name_en', label: 'Название (EN)', type: 'text' },
      { key: 'cost', label: 'Цена', type: 'text', placeholder: '3000 г' },
      { key: 'stats', label: 'Статы (разделитель: |)', type: 'textarea', placeholder: '+40 Сила атаки  |  +20 Ускорение умений' },
      { key: 'description', label: 'Описание пассивки', type: 'textarea' },
      { key: 'image', label: 'URL картинки', type: 'text', placeholder: 'https://...' },
      { key: 'category', label: 'Категория', type: 'select', options: ITEM_CATEGORIES.map(function(c) { return { value: c.id, label: c.label }; }) }
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
    if (!confirm('Удалить предмет "' + name + '"?')) return;

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
      description: '', image: '', order: 999
    };

    var modal = _createEditorModal('Руна', isNew, data, [
      { key: 'name_ru', label: 'Название (RU)', type: 'text' },
      { key: 'name_en', label: 'Название (EN)', type: 'text' },
      { key: 'category', label: 'Тип (Ключевая/Доминация/...)', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'image', label: 'URL картинки', type: 'text', placeholder: 'https://...' },
      { key: 'tree', label: 'Дерево', type: 'select', options: RUNE_TREES.map(function(t) { return { value: t.id, label: t.label }; }) }
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
    if (!confirm('Удалить руну "' + name + '"?')) return;

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
    if (!confirm('Откатить изменение для "' + changeData.name + '"?')) return;

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
      delBtn.onclick = function() {
        if (!confirm('Удалить "' + data.name + '" из винрейтов?')) return;
        _deleteWinrateEntry(entry, rank, role);
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

})();
