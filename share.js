/* ═══════════════════════════════════════════
   share.js — генерация PNG-карточек для шеринга.
   Используется тир-листом и винрейтами (кнопка 📷).
   Каждая карточка содержит водяной знак pro-wildrift.com —
   при репосте в Telegram/Discord это бесплатный канал привлечения.

   Публичное API:
     window.exportShareCard({
       title:    'Тир-лист чемпионов',
       subtitle: 'Mid · Patch 7.0f',
       mode:     'tier' | 'table',
       tiers:    [{ label:'S+', color:'#FF3A3A', items:[{img,name}] }],   // mode='tier'
       rows:     [{ img, name, value:'54.2%', valueColor:'#2ecc71' }],    // mode='table'
       fileName: 'wr-tierlist-mid'
     })
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  var CARD_W = 1080;          // ширина карточки (оптимально для соцсетей)
  var PAD = 48;               // внешние отступы
  var BG_TOP = '#1a0d2e';
  var BG_BOT = '#0a0318';
  var ACCENT = '#6d3ff5';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    if (window.showToast) window.showToast(msg); else console.log('[share]', msg);
  }

  // ─── helpers ───
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function loadImg(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  function patchLabel() {
    // Берём номер патча со страницы, если он отрисован (#patchBadge / .patch-badge)
    var el = document.querySelector('#patchBadge, .patch-badge, [data-patch]');
    var txt = el ? (el.getAttribute('data-patch') || el.textContent || '') : '';
    txt = (txt || '').trim();
    return txt || '';
  }

  // ─── рендер карточки в canvas ───
  // Возвращает Promise<canvas>
  function buildCanvas(opts) {
    var mode = opts.mode === 'table' ? 'table' : 'tier';
    var dpr = Math.min(2, window.devicePixelRatio || 1);

    // 1. Считаем высоту
    var headerH = 150;
    var footerH = 64;
    var bodyH = 0;
    var rowGeom;

    if (mode === 'tier') {
      var iconSz = 76, iconGap = 10, rowPadV = 14, labelW = 92;
      var perRow = Math.floor((CARD_W - PAD * 2 - labelW - 16) / (iconSz + iconGap));
      rowGeom = { iconSz: iconSz, iconGap: iconGap, rowPadV: rowPadV, labelW: labelW, perRow: perRow };
      (opts.tiers || []).forEach(function (tr) {
        var n = (tr.items || []).length;
        var lines = Math.max(1, Math.ceil(n / perRow));
        tr._h = lines * iconSz + (lines - 1) * iconGap + rowPadV * 2;
        bodyH += tr._h + 12;
      });
    } else {
      var rowH = 78, rowGap = 8;
      rowGeom = { rowH: rowH, rowGap: rowGap };
      var rows = opts.rows || [];
      bodyH = rows.length * rowH + Math.max(0, rows.length - 1) * rowGap;
    }

    var CARD_H = headerH + bodyH + footerH + PAD;

    var canvas = document.createElement('canvas');
    canvas.width = CARD_W * dpr;
    canvas.height = CARD_H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 2. Фон
    var grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, BG_TOP);
    grad.addColorStop(1, BG_BOT);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // лёгкое свечение сверху
    var glow = ctx.createRadialGradient(CARD_W / 2, 0, 0, CARD_W / 2, 0, CARD_W * 0.7);
    glow.addColorStop(0, 'rgba(109,63,245,0.25)');
    glow.addColorStop(1, 'rgba(109,63,245,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_W, 300);

    // 3. Заголовок
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    ctx.font = '900 42px system-ui, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(opts.title || 'Wild Rift', PAD, 78);
    if (opts.subtitle) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '700 22px system-ui, "Segoe UI", sans-serif';
      ctx.fillText(opts.subtitle, PAD, 112);
    }
    // разделитель
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, headerH - 16);
    ctx.lineTo(CARD_W - PAD, headerH - 16);
    ctx.stroke();

    // 4. Тело — собираем job'ы загрузки картинок, рисуем после
    var jobs = [];
    var y = headerH;

    if (mode === 'tier') {
      (opts.tiers || []).forEach(function (tr) {
        var rowTop = y;
        var rowH = tr._h;
        // фон строки
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        roundRect(ctx, PAD, rowTop, CARD_W - PAD * 2, rowH, 14);
        ctx.fill();
        // цветной лейбл тира
        ctx.fillStyle = tr.color || ACCENT;
        roundRect(ctx, PAD, rowTop, rowGeom.labelW, rowH, 14);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '900 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tr.label || '?', PAD + rowGeom.labelW / 2, rowTop + rowH / 2 + 10);
        // иконки
        var items = tr.items || [];
        var startX = PAD + rowGeom.labelW + 16;
        items.forEach(function (it, idx) {
          var col = idx % rowGeom.perRow;
          var line = Math.floor(idx / rowGeom.perRow);
          var ix = startX + col * (rowGeom.iconSz + rowGeom.iconGap);
          var iy = rowTop + rowGeom.rowPadV + line * (rowGeom.iconSz + rowGeom.iconGap);
          // плейсхолдер-рамка (на случай если картинка не загрузится)
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, ix, iy, rowGeom.iconSz, rowGeom.iconSz, 10);
          ctx.fill();
          if (it.img) {
            (function (ix, iy) {
              jobs.push(loadImg(it.img).then(function (img) {
                if (!img) return;
                ctx.save();
                roundRect(ctx, ix, iy, rowGeom.iconSz, rowGeom.iconSz, 10);
                ctx.clip();
                ctx.drawImage(img, ix, iy, rowGeom.iconSz, rowGeom.iconSz);
                ctx.restore();
              }));
            })(ix, iy);
          }
        });
        if (!items.length) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.font = '600 20px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('—', startX, rowTop + rowH / 2 + 7);
        }
        y += rowH + 12;
      });
    } else {
      var rg = rowGeom;
      (opts.rows || []).forEach(function (r, idx) {
        var rt = y;
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        roundRect(ctx, PAD, rt, CARD_W - PAD * 2, rg.rowH, 12);
        ctx.fill();
        // ранг-номер
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), PAD + 34, rt + rg.rowH / 2 + 8);
        // иконка
        var iconSz = 56, ix = PAD + 64, iy = rt + (rg.rowH - iconSz) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, ix, iy, iconSz, iconSz, 10);
        ctx.fill();
        if (r.img) {
          (function (ix, iy) {
            jobs.push(loadImg(r.img).then(function (img) {
              if (!img) return;
              ctx.save();
              roundRect(ctx, ix, iy, iconSz, iconSz, 10);
              ctx.clip();
              ctx.drawImage(img, ix, iy, iconSz, iconSz);
              ctx.restore();
            }));
          })(ix, iy);
        }
        // имя
        ctx.fillStyle = '#fff';
        ctx.font = '800 26px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(r.name || ''), ix + iconSz + 20, rt + rg.rowH / 2 + 9);
        // значение справа
        if (r.value != null) {
          ctx.fillStyle = r.valueColor || '#2ecc71';
          ctx.font = '900 30px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(String(r.value), CARD_W - PAD - 24, rt + rg.rowH / 2 + 10);
        }
        y += rg.rowH + rg.rowGap;
      });
    }

    // 5. Footer — watermark
    var fy = CARD_H - footerH / 2 - 4;
    ctx.fillStyle = ACCENT;
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚔ pro-wildrift.com', PAD, fy + 8);
    var rightTxt = patchLabel();
    if (rightTxt) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(rightTxt, CARD_W - PAD, fy + 6);
    }

    return Promise.all(jobs).then(function () { return canvas; });
  }

  // ─── overlay-превью с кнопками шеринга ───
  function showShareOverlay(canvas, fileName) {
    var prev = document.getElementById('shareCardOverlay');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'shareCardOverlay';
    overlay.className = 'share-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    var box = document.createElement('div');
    box.className = 'share-box';

    var dataUrl = '';
    try { dataUrl = canvas.toDataURL('image/png'); } catch (e) { dataUrl = ''; }

    box.innerHTML = ''
      + '<button class="share-close" type="button" aria-label="Закрыть">✕</button>'
      + '<div class="share-preview-wrap">'
      +   (dataUrl
            ? '<img class="share-preview" alt="Превью карточки" src="' + dataUrl + '">'
            : '<div class="share-preview-fail">Превью недоступно (CORS), но скачивание/копирование могут сработать.</div>')
      + '</div>'
      + '<div class="share-actions">'
      +   '<button class="share-act share-act-primary" data-act="copy" type="button">📋 Копировать</button>'
      +   '<button class="share-act" data-act="download" type="button">💾 Скачать</button>'
      +   '<button class="share-act" data-act="share" type="button" style="display:none;">📤 Поделиться</button>'
      + '</div>'
      + '<div class="share-hint">Картинку можно вставить в Telegram, Discord или соцсети.</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey, true);
    box.querySelector('.share-close').addEventListener('click', close);

    // canvas → Blob (с fallback)
    function withBlob(cb) {
      try {
        canvas.toBlob(function (blob) {
          if (blob) cb(blob);
          else cb(null);
        }, 'image/png');
      } catch (e) { cb(null); }
    }

    var dlName = (fileName || 'wild-rift-share') + '.png';

    // Web Share API (мобилки) — показываем кнопку только если доступно с файлами
    var shareBtn = box.querySelector('[data-act="share"]');
    if (navigator.canShare) {
      try {
        var probe = new File([new Blob()], dlName, { type: 'image/png' });
        if (navigator.canShare({ files: [probe] })) shareBtn.style.display = '';
      } catch (e) {}
    }

    box.querySelector('.share-actions').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');

      if (act === 'download') {
        withBlob(function (blob) {
          if (!blob) {
            // fallback — открыть в новой вкладке
            if (dataUrl) { var w = window.open(); if (w) w.document.write('<img src="' + dataUrl + '">'); }
            else toast('Не удалось создать картинку (CORS)');
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = dlName;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          toast('Картинка сохранена');
        });
      } else if (act === 'copy') {
        withBlob(function (blob) {
          if (!blob || !navigator.clipboard || !window.ClipboardItem) {
            toast('Копирование не поддерживается — используй «Скачать»');
            return;
          }
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            .then(function () { toast('Картинка скопирована'); })
            .catch(function () { toast('Не удалось скопировать — используй «Скачать»'); });
        });
      } else if (act === 'share') {
        withBlob(function (blob) {
          if (!blob) { toast('Не удалось создать картинку'); return; }
          var file = new File([blob], dlName, { type: 'image/png' });
          navigator.share({ files: [file], title: 'Wild Rift Stats' })
            .catch(function () { /* юзер отменил — норм */ });
        });
      }
    });
  }

  // ─── публичное API ───
  window.exportShareCard = function (opts) {
    if (!opts) return;
    // Показываем «генерируется…» сразу — рендер с картинками может занять ~0.5-1с
    toast('Готовим карточку…');
    buildCanvas(opts).then(function (canvas) {
      showShareOverlay(canvas, opts.fileName);
    }).catch(function (e) {
      console.warn('[share] build failed', e);
      toast('Не удалось создать карточку');
    });
  };
})();
