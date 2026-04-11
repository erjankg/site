/**
 * МИГРАЦИЯ: Извлечение предметов и рун из HTML → Firestore
 *
 * Запуск: открой сайт, войди как админ, затем в консоли браузера:
 *   1. Подключи скрипт: var s=document.createElement('script');s.src='migrate.js';document.head.appendChild(s);
 *   2. Запусти: migrateAll();
 *
 * Или просто вставь содержимое этого файла в консоль и вызови migrateAll()
 */

window.migrateAll = async function() {
  if (!firebase || !firebase.firestore) {
    console.error('Firebase не загружен!');
    return;
  }
  var db = firebase.firestore();

  console.log('=== НАЧАЛО МИГРАЦИИ ===');

  // 1. Мигрируем предметы
  await migrateItems(db);

  // 2. Мигрируем руны
  await migrateRunes(db);

  console.log('=== МИГРАЦИЯ ЗАВЕРШЕНА ===');
};

async function migrateItems(db) {
  var itemsMask = document.getElementById('itemsMask');
  if (!itemsMask) { console.error('itemsMask не найден'); return; }

  var categories = [
    { label: '⚔ Физические', id: 'physical' },
    { label: '🔮 Магические', id: 'magic' },
    { label: '🛡 Защитные', id: 'defensive' },
    { label: '💛 Поддержка', id: 'support' },
    { label: '👟 Ботинки', id: 'boots' },
    { label: '✨ Зачарования ботинок', id: 'enchants' }
  ];

  var allItems = [];
  var currentCategory = '';
  var orderInCategory = 0;

  // Проходим по всем элементам: заголовки секций и карточки
  itemsMask.querySelectorAll('.items-section-label, .item-card').forEach(function(el) {
    if (el.classList.contains('items-section-label')) {
      var text = el.textContent.trim();
      for (var i = 0; i < categories.length; i++) {
        if (text.indexOf(categories[i].label.substring(2)) !== -1) {
          currentCategory = categories[i].id;
          orderInCategory = 0;
          break;
        }
      }
      return;
    }

    // item-card
    var tip = el.getAttribute('data-tip') || '';
    var parts = tip.split('\u00A6'); // ¦
    var imgEl = el.querySelector('img');
    var imgSrc = imgEl ? imgEl.getAttribute('src') : '';
    var nameRu = (parts[0] || '').trim();
    var nameEn = (window._itemName || {})[nameRu] || (window._altName || {})[nameRu] || nameRu;

    allItems.push({
      name_ru: nameRu,
      name_en: nameEn,
      cost: (parts[1] || '').trim(),
      stats: (parts[2] || '').trim(),
      description: (parts[3] || '').trim(),
      image: imgSrc,
      category: currentCategory || 'physical',
      order: orderInCategory++
    });
  });

  console.log('Найдено предметов: ' + allItems.length);

  // Записываем в Firestore
  var batch = db.batch();
  var itemsRef = db.collection('items');

  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];
    // Используем slug из name_en как ID документа
    var docId = slugify(item.name_en || item.name_ru);
    batch.set(itemsRef.doc(docId), item);

    if ((i + 1) % 450 === 0) {
      // Firestore batch limit = 500
      await batch.commit();
      console.log('Записано ' + (i + 1) + ' предметов...');
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log('Все ' + allItems.length + ' предметов записаны в Firestore!');
}

async function migrateRunes(db) {
  var runesMask = document.getElementById('runesMask');
  if (!runesMask) { console.error('runesMask не найден'); return; }

  var trees = [
    { label: 'ОСНОВНЫЕ РУНЫ', id: 'keystone' },
    { label: 'ДОМИНАЦИЯ', id: 'domination' },
    { label: 'ТОЧНОСТЬ', id: 'precision' },
    { label: 'СТОЙКОСТЬ', id: 'resolve' },
    { label: 'ВДОХНОВЕНИЕ', id: 'inspiration' }
  ];

  var allRunes = [];
  var currentTree = 'keystone';
  var orderInTree = 0;

  // Проходим по всем секциям и карточкам
  runesMask.querySelectorAll('.side-section, .rune-card').forEach(function(el) {
    if (el.classList.contains('side-section')) {
      var text = el.textContent.trim();
      for (var i = 0; i < trees.length; i++) {
        if (text.indexOf(trees[i].label) !== -1) {
          currentTree = trees[i].id;
          orderInTree = 0;
          break;
        }
      }
      return;
    }

    // rune-card
    var tip = el.getAttribute('data-tip') || '';
    var parts = tip.split('\u00A6'); // ¦
    var imgEl = el.querySelector('img');
    var imgSrc = imgEl ? imgEl.getAttribute('src') : '';
    var nameRu = (parts[0] || '').trim();
    var nameEn = (window._runeName || {})[nameRu] || nameRu;
    var category = (parts[1] || '').trim(); // Ключевая, Доминация, etc.
    var description = (parts[3] || parts[2] || '').trim();

    allRunes.push({
      name_ru: nameRu,
      name_en: nameEn,
      category: category,
      tree: currentTree,
      description: description,
      image: imgSrc,
      order: orderInTree++
    });
  });

  console.log('Найдено рун: ' + allRunes.length);

  // Записываем в Firestore
  var batch = db.batch();
  var runesRef = db.collection('runes');

  for (var i = 0; i < allRunes.length; i++) {
    var rune = allRunes[i];
    var docId = slugify(rune.name_en || rune.name_ru);
    batch.set(runesRef.doc(docId), rune);

    if ((i + 1) % 450 === 0) {
      await batch.commit();
      console.log('Записано ' + (i + 1) + ' рун...');
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log('Все ' + allRunes.length + ' рун записаны в Firestore!');
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}
