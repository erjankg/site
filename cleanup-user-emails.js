/**
 * ОДНОРАЗОВАЯ ЧИСТКА: удалить поле "email" из документов коллекции "users".
 *
 * Зачем: app.js при каждом входе/обновлении присутствия уже удаляет email из
 * users-документа (FieldValue.delete()), поэтому у активных юзеров его нет.
 * Но у старых "призрачных" аккаунтов (заходили до этой правки и не вернулись)
 * email мог остаться, а правило firestore.rules разрешает читать /users любому
 * авторизованному → потенциальная утечка PII. Этот скрипт дочищает остатки.
 *
 * Безопасность: писать в чужой users-док может только админ владельца
 * (firestore.rules: allow update ... || request.auth.uid == adminUid()).
 * Поэтому запускать ОБЯЗАТЕЛЬНО под админ-аккаунтом.
 *
 * Запуск: открой pro-wildrift.com, войди как АДМИН, открой консоль (F12), затем:
 *   var s=document.createElement('script');s.src='cleanup-user-emails.js';document.head.appendChild(s);
 *   countUserEmails();      // 1) посчитать — ничего не меняет
 *   cleanupUserEmails();    // 2) вычистить (после подтверждения)
 */

window.countUserEmails = async function() {
  if (!window.firebase || !firebase.firestore) { console.error('Firebase не загружен'); return; }
  var db = firebase.firestore();
  var snap = await db.collection('users').get();
  var total = 0, withEmail = 0;
  snap.forEach(function(d) { total++; if (d.data().email) withEmail++; });
  console.log('Всего юзеров: ' + total + '. С email в документе: ' + withEmail);
  return { total: total, withEmail: withEmail };
};

window.cleanupUserEmails = async function() {
  if (!window.firebase || !firebase.firestore) { console.error('Firebase не загружен'); return; }
  var db = firebase.firestore();
  var del = firebase.firestore.FieldValue.delete();
  var snap = await db.collection('users').get();
  var fixed = 0, fail = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var d = snap.docs[i];
    if (!d.data().email) continue;
    try { await d.ref.update({ email: del }); fixed++; }
    catch (e) { fail++; console.warn('Не смог вычистить', d.id, e && e.code); }
  }
  console.log('Готово. Вычищено: ' + fixed + '. Ошибок: ' + fail);
  return { fixed: fixed, fail: fail };
};
