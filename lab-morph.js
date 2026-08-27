/* ════════════════════════════════════════════════════════════════
   labMorph — ОБЩЕЕ ЛЕКАРСТВО ОТ ДЁРГАНЬЯ (для лабов и боевого).

   Болезнь: `host.innerHTML = html` на каждое действие юзера пересоздаёт
   ВСЕ узлы → появление/анимации играют заново → «весь экран дёргается».

   Лечение: labMorph(host, html) сравнивает НОВУЮ разметку со СТАРЫМ деревом
   и трогает только то, что реально изменилось (текст, атрибут, лишний узел).
   Узлы живут дальше: класс, скролл, фокус, проигрывающийся плеер — на месте.
   Приёмка — счётчиком выживших узлов (см. PORT-BACKLOG «НЕ ТАЩИТЬ ДЁРГАНЬЕ»).

   ГРАНИЦА: если разметка блока изменилась структурно (другой набор тегов) —
   morph честно заменит эту ветку, единицы узлов, а не весь контейнер.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function sameNode(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    if (a.tagName !== b.tagName) return false;
    var ka = a.getAttribute('data-key'), kb = b.getAttribute('data-key');
    if (ka || kb) return ka === kb;
    return true;
  }

  function morphAttrs(oldEl, newEl) {
    var oa = oldEl.attributes, i, n;
    for (i = oa.length - 1; i >= 0; i--) {
      n = oa[i].name;
      if (!newEl.hasAttribute(n)) oldEl.removeAttribute(n);
    }
    var na = newEl.attributes;
    for (i = 0; i < na.length; i++) {
      if (oldEl.getAttribute(na[i].name) !== na[i].value) oldEl.setAttribute(na[i].name, na[i].value);
    }
    // живое состояние полей формы атрибутом не описывается — переносим руками
    var tag = oldEl.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (newEl.hasAttribute('value') && oldEl.value !== newEl.value) oldEl.value = newEl.value;
      if (oldEl.type === 'checkbox' || oldEl.type === 'radio') oldEl.checked = newEl.hasAttribute('checked');
    } else if (tag === 'SELECT') {
      var want = newEl.querySelector('option[selected]');
      if (want && oldEl.value !== want.value) oldEl.value = want.value;
    }
  }

  function keyOf(node) {
    return (node && node.nodeType === 1) ? node.getAttribute('data-key') : null;
  }

  function morphChildren(oldParent, newParent) {
    /* data-key = якорь узла. Блок, который то есть, то нет (закреп, полоса, вкладка),
       сдвигает всех соседей — без якорей morph бы порубил живые узлы соседей. */
    var newKeys = {}, keyed = {}, x, k;
    for (x = newParent.firstChild; x; x = x.nextSibling) { k = keyOf(x); if (k) newKeys[k] = 1; }
    for (x = oldParent.firstChild; x; x = x.nextSibling) { k = keyOf(x); if (k) keyed[k] = x; }

    var o = oldParent.firstChild, n = newParent.firstChild;
    while (n) {
      var nextN = n.nextSibling;
      var nk = keyOf(n);
      if (nk && keyed[nk]) {                       // узел с таким якорем уже живёт — переставляем и правим его
        var m = keyed[nk];
        if (m === o) o = o.nextSibling; else oldParent.insertBefore(m, o || null);
        morphAttrs(m, n); morphChildren(m, n);
        n = nextN; continue;
      }
      var ok = keyOf(o);
      if (ok && newKeys[ok]) {                     // старый якорь ещё понадобится ниже — не убиваем, вставляем перед ним
        oldParent.insertBefore(n, o);
        n = nextN; continue;
      }
      if (!o) { oldParent.appendChild(n); n = nextN; continue; }
      var nextO = o.nextSibling;
      if (!sameNode(o, n)) {
        oldParent.replaceChild(n, o);
      } else if (o.nodeType === 3 || o.nodeType === 8) {
        if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
      } else if (o.nodeType === 1) {
        morphAttrs(o, n);
        morphChildren(o, n);
      }
      o = nextO; n = nextN;
    }
    while (o) { var dead = o; o = o.nextSibling; oldParent.removeChild(dead); }
  }

  /* host — живой контейнер, html — свежая разметка его содержимого */
  window.labMorph = function (host, html) {
    if (!host) return;
    if (!host.firstChild) { host.innerHTML = html; return; }   // первая сборка — обычным путём
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    morphChildren(host, tpl.content);
  };

  /* Счётчик приёмки: пометить узлы → действие → сколько выжило.
     labNodeMark(host) перед действием, labNodeCount() после. */
  var _marked = 0;
  window.labNodeMark = function (host) {
    var prev = document.querySelectorAll('*');            // старые метки снять, иначе замер врёт
    for (var j = 0; j < prev.length; j++) prev[j].__labKeep = 0;
    var all = (host || document.body).querySelectorAll('*');
    for (var i = 0; i < all.length; i++) all[i].__labKeep = 1;
    _marked = all.length;
    return _marked;
  };
  window.labNodeCount = function () {
    var all = document.querySelectorAll('*'), c = 0;
    for (var i = 0; i < all.length; i++) if (all[i].__labKeep) c++;
    return c + '/' + _marked;
  };
})();
