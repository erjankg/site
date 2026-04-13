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
      delBtn.onclick = function() {
        if (!confirm('Удалить патч-нот для "' + champName + '"?')) return;
        _deletePatchnote(existingNote._id, champName);
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
    if (!confirm('Удалить ВСЕ патч-ноты (' + count + ' шт.)? Это нельзя отменить (только через changelog).')) return;
    if (!confirm('Точно? Все бафф/нерф/корректировки исчезнут у всех пользователей.')) return;

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

})();
