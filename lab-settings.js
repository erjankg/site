/* ════════════════════════════════════════════════════════════════
   lab-settings.js — общий механизм настроек для всех песочниц (папки lab-X)
   1) ПАМЯТЬ ЛАБА: автосохранение набора в localStorage (переживает
      перезагрузку и мои правки кода — настройки не «уходят в дефолт»).
   2) КОД НАСТРОЕК: «📋 Код» (копировать) / «📥 Вставить» — точная
      передача набора 1-в-1 другому Клоду / в другую вкладку.
   3) ПРЕСЕТЫ: именованные наборы внутри лаба, переключение в списке.

   Подключение в лабе:
     <div id="labTools"></div>             // куда вставить кнопки (в шапке)
     <script src="../lab-settings.js"></script>   // ДО скрипта лаба
   В скрипте лаба (в конце, после первого render):
     var LS = LabSettings.attach({
       id:'имя-лаба', defaults:DEFAULTS, mount:'#labTools',
       getState:function(){ return S; },
       apply:function(st){ S=Object.assign({},DEFAULTS,st); buildPanel(); render(); }
     });
   А в обработчике кнопки «Сбросить»: if(LS) LS.clearSaved();
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(window.LabSettings) return;

var CSS=
".ls-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap}"+
".ls-btn,.ls-presets{font:inherit;font-size:12px;font-weight:700;color:#dff2fb;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:7px 11px;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:.14s}"+
".ls-btn:hover,.ls-presets:hover{background:rgba(11,196,227,.14);border-color:rgba(11,196,227,.4)}"+
".ls-presets{padding:7px 9px;max-width:170px}"+
".ls-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(2,8,14,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}"+
".ls-modal{width:min(560px,92vw);background:linear-gradient(180deg,rgba(12,26,38,.95),rgba(5,14,22,.97));border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:16px;box-shadow:0 30px 80px rgba(0,0,0,.55);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}"+
".ls-mh{font-size:13px;font-weight:800;color:#eaf6ff;margin-bottom:10px;line-height:1.35}"+
".ls-ta{width:100%;height:210px;resize:vertical;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#cfe6f3;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;box-sizing:border-box}"+
".ls-mf{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}"+
".ls-pri{background:rgba(11,196,227,.18);border-color:rgba(11,196,227,.45);color:#eaf6ff}"+
".ls-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:10000;background:rgba(12,26,38,.95);border:1px solid rgba(11,196,227,.4);color:#eaf6ff;font-size:13px;font-weight:700;padding:10px 16px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}"+
".ls-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}";

function injectCSS(){ if(document.getElementById('ls-css')) return;
  var s=document.createElement('style'); s.id='ls-css'; s.textContent=CSS; document.head.appendChild(s); }

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function loadJSON(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
function saveJSON(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

var _tt;
function toast(msg){
  var el=document.querySelector('.ls-toast');
  if(!el){ el=document.createElement('div'); el.className='ls-toast'; document.body.appendChild(el); }
  el.textContent=msg; requestAnimationFrame(function(){ el.classList.add('show'); });
  clearTimeout(_tt); _tt=setTimeout(function(){ el.classList.remove('show'); },1900);
}

function attach(opts){
  injectCSS();
  var id=opts.id, getState=opts.getState, apply=opts.apply;
  var wkey='lab:'+id, pkey='lab-presets:'+id;
  var mount=document.querySelector(opts.mount||'#labTools');

  // 1) восстановить сохранённый рабочий набор
  var saved=loadJSON(wkey);
  if(saved && saved.s) try{ apply(saved.s); }catch(e){}

  // 2) автосохранение (ловит любые изменения, не трогая обработчики лаба)
  var last='';
  function tick(){ try{ var cur=JSON.stringify(getState()); if(cur!==last){ last=cur; saveJSON(wkey,{lab:id,v:1,s:getState()}); } }catch(e){} }
  setInterval(tick,700);
  window.addEventListener('beforeunload',tick);

  function presets(){ return loadJSON(pkey)||{}; }

  function renderBar(){
    if(!mount) return;
    var ps=presets(), names=Object.keys(ps);
    mount.innerHTML='<div class="ls-tools">'+
      '<select class="ls-presets" title="Мои пресеты"><option value="">★ Пресеты…</option>'+
        names.map(function(n){ return '<option value="'+esc(encodeURIComponent(n))+'">'+esc(n)+'</option>'; }).join('')+
      '</select>'+
      '<button class="ls-btn ls-save" type="button">💾 Сохранить</button>'+
      (names.length?'<button class="ls-btn ls-del" type="button" title="Удалить выбранный пресет">🗑</button>':'')+
      '<button class="ls-btn ls-copy" type="button">📋 Код</button>'+
      '<button class="ls-btn ls-paste" type="button">📥 Вставить</button>'+
    '</div>';
    mount.querySelector('.ls-presets').onchange=function(){
      var n=decodeURIComponent(this.value||''); var ps2=presets();
      if(n && ps2[n]){ apply(ps2[n]); toast('Пресет «'+n+'» применён'); } };
    mount.querySelector('.ls-save').onclick=function(){
      var n=(prompt('Название пресета:','')||'').trim(); if(!n) return;
      var all=presets(); all[n]=getState(); saveJSON(pkey,all); renderBar(); toast('Сохранено: «'+n+'»'); };
    var del=mount.querySelector('.ls-del');
    if(del) del.onclick=function(){
      var sel=mount.querySelector('.ls-presets'); var n=decodeURIComponent(sel.value||'');
      if(!n){ toast('Сначала выбери пресет в списке'); return; }
      var all=presets(); delete all[n]; saveJSON(pkey,all); renderBar(); toast('Удалён: «'+n+'»'); };
    mount.querySelector('.ls-copy').onclick=function(){ openModal('copy', JSON.stringify({lab:id,v:1,s:getState()},null,2)); };
    mount.querySelector('.ls-paste').onclick=function(){ openModal('paste',''); };
  }

  function openModal(mode,text){
    var ov=document.createElement('div'); ov.className='ls-ov';
    ov.innerHTML='<div class="ls-modal">'+
      '<div class="ls-mh">'+(mode==='copy'
        ?'📋 Код настроек — скопируй и передай другому Клоду или в другую вкладку (он применит 1-в-1)'
        :'📥 Вставь код настроек и нажми «Применить»')+'</div>'+
      '<textarea class="ls-ta" spellcheck="false">'+esc(text)+'</textarea>'+
      '<div class="ls-mf">'+
        (mode==='copy'?'<button class="ls-btn ls-pri ls-do-copy" type="button">Скопировать</button>'
                      :'<button class="ls-btn ls-pri ls-do-apply" type="button">Применить</button>')+
        '<button class="ls-btn ls-close" type="button">Закрыть</button>'+
      '</div></div>';
    document.body.appendChild(ov);
    var ta=ov.querySelector('.ls-ta');
    if(mode==='copy'){ ta.focus(); ta.select(); }
    function close(){ ov.remove(); }
    ov.querySelector('.ls-close').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
    var dc=ov.querySelector('.ls-do-copy');
    if(dc) dc.onclick=function(){
      ta.select(); var ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(ta.value).then(function(){toast('Скопировано ✓');},function(){toast(ok?'Скопировано ✓':'Выдели текст и Ctrl+C');});
      } else toast(ok?'Скопировано ✓':'Выдели текст и Ctrl+C'); };
    var da=ov.querySelector('.ls-do-apply');
    if(da) da.onclick=function(){
      var obj; try{ obj=JSON.parse(ta.value); }catch(e){ toast('Не похоже на JSON — проверь текст'); return; }
      var st=(obj&&obj.s)?obj.s:obj;
      if(st&&typeof st==='object'){ apply(st); toast('Настройки применены ✓'); close(); }
      else toast('Пустой набор'); };
  }

  renderBar();
  return {
    renderBar:renderBar,
    save:tick,
    clearSaved:function(){ try{ localStorage.removeItem(wkey); }catch(e){} last=''; }
  };
}

window.LabSettings={ attach:attach };
})();
