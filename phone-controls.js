/* ============================================================
   Phone controls tidy (Tony, 2026-11-04; his "New mobile and desktop GUI concept").
   Phones only (width <= 900px). The toolbar used to be six stacked rows over half the
   screen. Same buttons, same handlers -- they are only MOVED into 4 short rows plus a
   quick row and a "More" panel (the map stays visible behind it). Wider screens keep
   the old toolbar untouched (elements are put back if the window grows).
     Row 1  title . language . settings
     Row 2  flip-card (charted today / this week / latest system) . Trending
     Row 3  galaxy . type . Galaxy|Local
     Row 4  Random . hex address . Reset
     Quick  Glyphs Search Jump Routes Filters More
     More   Navigation (Favourites, Warp FX, Traveller discoveries) .
            Map display (Labels, Grid, Orbit, Camera, Galactic Atlas) .
            Exploration (Tour, About, Install app, Reviews & feedback)
   The old "Hide controls" cascade is switched off in this layout.
   ============================================================ */
(function(){
  'use strict';
  var top = document.getElementById('top');
  if(!top || !window.matchMedia) return;
  var mq = window.matchMedia('(max-width:900px)');
  var $ = function(i){ return document.getElementById(i); };
  var T = function(s, v){ return window.NMS_T ? window.NMS_T(s, v) : s; };
  var HUB_URL = 'https://nomansskyhub.app/#discoveries';
  var ro = null, active = false, home = [], root = null, panel = null, moreBtn = null, ask = null, tourStep = null;

  var css = document.createElement('style');
  css.textContent =
'html.b7 #toggleRow,html.b7 #toolbarBody,html.b7 #toolbarToggle,html.b7 #top>.sep{display:none!important}' +
'#b7{flex:0 0 100%;display:flex;flex-direction:column;gap:6px;margin-top:4px;position:relative;box-sizing:border-box;max-width:100%}' +
'#b7 .r{display:flex;gap:6px;align-items:stretch}' +
'#b7 .r:not(:has(>:not([hidden]))){display:none}' +
'#b7 .r>*,#b7p .g>*{min-width:0!important;order:0!important;width:auto!important;overflow:hidden;box-sizing:border-box;margin:0!important}' +
'#b7 .r>.btn,#b7 .r>select,#b7 .r>input{flex:1 1 0!important;font-size:9px!important;padding:8px 2px!important;letter-spacing:.03em!important;text-align:center;justify-content:center;white-space:nowrap}' +
'#b7 .r>.btn{flex:1 1 auto!important}' +
'#b7 .r1{align-items:center}#b7 #bRoutes{flex-grow:1.3!important}#b7 #bFiltToggle{flex-grow:1.1!important}#b7 #bJump{flex-grow:.75!important}' +
'#b7 .r1>#title{flex:1 1 auto!important;min-width:0!important;margin:0!important}' +
'#b7 .r1:has(#nmsRefresh) #titleIcon{display:none}#b7 .r1>.btn{flex:0 0 auto!important;padding:8px 9px!important;font-size:10px!important}' +
'#b7 #titleText{font-size:13px!important;letter-spacing:.06em!important}#b7 #title{gap:5px!important;padding:6px 8px!important}#top.b7open{z-index:42!important}' +
'#b7 #chartedLine{flex:1.7 1 0;display:flex;align-items:center;justify-content:flex-start;text-align:left;font:8.5px/1.3 Orbitron,sans-serif;letter-spacing:.05em;color:var(--cyan);border:1px solid rgba(0,229,255,.35);border-radius:6px;background:rgba(6,18,30,.7);padding:2px 6px;height:38px;cursor:pointer;white-space:normal;transition:transform .28s,opacity .28s}' +
'#b7 #chartedLine.fOut{transform:rotateX(90deg);opacity:0}' +
'#b7 #trendLine{flex:1 1 0;display:flex;align-items:center;justify-content:center;font:700 10px Orbitron,sans-serif;letter-spacing:.06em;color:#ff9a3c;background:none;border:1px solid rgba(255,154,60,.45);border-radius:6px;padding:8px 3px;height:38px}' +
'#b7 #galSel{flex:1.3 1 0!important;font:9px Orbitron,sans-serif!important}' +
'#b7 #galTypeFilter{flex:1 1 0!important;font:9px Orbitron,sans-serif!important;max-width:none!important}' +
'#b7 #mLoc{flex:.9 1 0!important}#b7 #mGal{flex:0 0 auto!important;letter-spacing:0!important;padding-left:18px!important;padding-right:3px!important}@media(max-width:360px){#b7 #mGal{font-size:8px!important;padding-left:4px!important}#b7 #mGal::before{display:none}}' +
'#b7 #inAddr{flex:2 1 0!important;font-size:11px!important;letter-spacing:.12em!important}' +
'#b7p{position:absolute;right:0;top:100%;margin-top:6px;width:min(310px,100%);z-index:40;background:rgba(5,14,26,.94);border:1px solid var(--cyan);border-radius:10px;padding:8px 10px 10px;box-shadow:0 0 18px rgba(0,229,255,.25);display:none;box-sizing:border-box}' +
'#b7p.open{display:block}' +
'#b7p h4{margin:10px 0 6px;font:700 10px Orbitron,sans-serif;letter-spacing:.14em;color:var(--cyan);text-transform:uppercase}#b7p h4:first-child{margin-top:2px}' +
'#b7p .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
'#b7p .g>.btn{padding:9px 4px!important;font-size:10px!important;letter-spacing:.05em!important;text-align:center;justify-content:center}' +
'#b7p .g>.wide{grid-column:1/-1}' +
'#b7p #bFeedback .nms-fb-ico{margin:-5px 6px -5px 0}' +
'#b7ask{display:none;position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.6);align-items:center;justify-content:center}#b7ask.open{display:flex}' +
'#b7ask .bx{width:min(300px,86vw);background:#06121e;border:1px solid var(--cyan);border-radius:10px;padding:14px;box-shadow:0 0 24px rgba(0,229,255,.3);font-family:Orbitron,sans-serif;font-size:12px;color:var(--text)}' +
'#b7ask p{font-size:12px;color:var(--text-dim);margin:8px 0 12px;font-family:inherit;line-height:1.45}' +
'#b7ask .r{display:flex;gap:6px}#b7ask .btn{flex:1;padding:9px}' +
'@media(max-width:360px){#b7 #galSel{flex-grow:1.1!important}#b7 #galTypeFilter{flex-grow:1.2!important}#b7 #titleIcon,#b7 #annivBadge{display:none}#b7 #titleText{font-size:13px!important}#b7 .r5>.btn{font-size:8px!important;padding-left:1px!important;padding-right:1px!important}#b7 .r>.btn{letter-spacing:0!important}#b7 .r1>.btn{padding:8px 7px!important}#b7 #chartedLine{font-size:8px}}' +
/* 2026-11-11 phone readability (site review): text 11px minimum, tap targets 40px, quick row wraps on narrow phones */
'#b7 .r>.btn,#b7 .r>select,#b7 .r>input{font-size:11px!important;letter-spacing:.01em!important;padding:8px 2px!important;min-height:38px!important;box-sizing:border-box}' +
'#b7 #galSel,#b7 #galTypeFilter{font:11px Orbitron,sans-serif!important}' +
'#b7 .r1>.btn{font-size:11px!important;min-width:40px!important;min-height:38px!important}' +
'#b7 #chartedLine{font-size:10px;height:38px}#b7 #trendLine{font-size:11px;height:38px}' +
'#b7 .r3,#b7 .r4,#b7 .r5{flex-wrap:wrap}#b7 .r3>.btn,#b7 .r3>select,#b7 .r4>.btn,#b7 .r5>.btn{flex:1 0 auto!important}#b7 #inAddr{flex:2 0 124px!important}#b7 #mLoc,#b7 #mGal{flex:1 0 auto!important}' +
'#b7p h4{font-size:11px}#b7p .g>.btn{font-size:11px!important;min-height:40px!important;padding:10px 4px!important}' +
'@media(max-width:360px){#b7 #inAddr{letter-spacing:.04em!important}#b7 #mGal{font-size:11px!important}#b7 #chartedLine{font-size:10px}#b7 .r5>.btn,#b7 .r>.btn{font-size:11px!important}}' +
'@media(prefers-reduced-motion:reduce){#b7 #chartedLine{transition:none}}';
  document.head.appendChild(css);

  function mk(tag, attrs, html){
    var e = document.createElement(tag);
    if(attrs) for(var k in attrs) e.setAttribute(k, attrs[k]);
    if(html != null) e.innerHTML = html;
    return e;
  }
  function mv(parent, id){
    var e = $(id); if(!e) return null;
    home.push({ el:e, parent:e.parentNode, next:e.nextSibling });
    e.classList.remove('tb-hidden','tb-hiding','tb-revealing');
    parent.appendChild(e);
    return e;
  }
  function row(cls){ var r = mk('div', { 'class':'r ' + cls }); root.appendChild(r); return r; }
  function group(title, ids, wide){
    panel.appendChild(mk('h4', null, title));
    var g = mk('div', { 'class':'g' }); panel.appendChild(g);
    ids.forEach(function(id){
      var e = typeof id === 'string' ? mv(g, id) : (g.appendChild(id), id);
      if(e && wide && wide.indexOf(e.id) >= 0) e.classList.add('wide');
    });
    return g;
  }

  function setMore(open){
    if(!panel) return;
    panel.classList.toggle('open', !!open); top.classList.toggle('b7open', !!open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    moreBtn.style.borderColor = open ? 'var(--gold)' : '';
  }
  window.b7SetMore = setMore;

  function openHubAsk(){
    if(!ask){
      ask = mk('div', { id:'b7ask', role:'dialog', 'aria-modal':'true' },
        '<div class="bx"><b>Open the No Man\'s Sky Hub?</b><p>It opens in a new tab and shows what travellers charted this week.</p>' +
        '<div class="r"><button type="button" class="btn beveled" id="b7askNo">Cancel</button><button type="button" class="btn beveled primary" id="b7askYes">Open</button></div></div>');
      document.body.appendChild(ask);
      $('b7askNo').addEventListener('click', function(){ ask.classList.remove('open'); });
      $('b7askYes').addEventListener('click', function(){ ask.classList.remove('open'); window.open(HUB_URL, '_blank', 'noopener'); });
      ask.addEventListener('click', function(e){ if(e.target === ask) ask.classList.remove('open'); });
    }
    ask.classList.add('open');
    setTimeout(function(){ var y = $('b7askYes'); if(y) y.focus(); }, 30);
  }

  /* flip-card: the charted line turns between its faces every 6 s; it stays still while pressed or while the list is open */
  var flipTimer = null, flipIdx = 0, flipPause = 0;
  function faces(){ return window.NMS_CHARTED_FACES || []; }
  function setFace(i){
    var line = $('chartedLine'), f = faces(); if(!line || !f.length) return;
    flipIdx = i % f.length; line.textContent = f[flipIdx];
  }
  function flipStep(){
    var line = $('chartedLine'), f = faces();
    if(!active || !line || line.hidden || f.length < 2) return;
    var pop = $('chartedPop'); if(Date.now() < flipPause || (pop && pop.classList.contains('show'))) return;
    var reduce = false; try{ reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    if(reduce){ setFace(flipIdx + 1); return; }
    line.classList.add('fOut');
    setTimeout(function(){ setFace(flipIdx + 1); line.classList.remove('fOut'); }, 290);
  }
  document.addEventListener('nms-charted-faces', function(){ if(active){ flipIdx = 0; setFace(0); } });

  function build(){
    if(active) return;
    active = true; home = [];
    document.documentElement.classList.add('b7');
    document.documentElement.classList.remove('toolbar-collapsed');
    root = mk('div', { id:'b7' }); top.appendChild(root);
    var r1 = row('r1'); mv(r1, 'title'); mv(r1, 'bLang'); mv(r1, 'bAccess');
    /* the typewriter reserved the title's width before the smaller phone font applied: re-measure it */
    var tt = $('titleText');
    if(tt && tt.style.minWidth){
      var cl = tt.cloneNode(false); cl.removeAttribute('id'); cl.textContent = 'NMS GALACTIC MAP';
      cl.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;min-width:0;font-size:13px;letter-spacing:.06em;animation:none';
      tt.parentNode.appendChild(cl); var nw = cl.getBoundingClientRect().width; cl.remove();
      if(nw > 20) tt.style.minWidth = Math.ceil(nw) + 'px';
    }
    var r2 = row('r2'); mv(r2, 'chartedLine'); mv(r2, 'trendLine');
    var r3 = row('r3'); mv(r3, 'galSel'); mv(r3, 'galTypeFilter'); mv(r3, 'mGal'); mv(r3, 'mLoc');
    var r4 = row('r4'); mv(r4, 'bRand'); mv(r4, 'inAddr'); mv(r4, 'bAddrReset');
    var r5 = row('r5'); ['bKeys','bSearch','bJump','bRoutes','bFiltToggle'].forEach(function(i){ mv(r5, i); });
    moreBtn = mk('button', { type:'button', 'class':'btn beveled', id:'b7More', 'aria-expanded':'false', 'aria-controls':'b7p', 'aria-label':T('More controls') }, '&hellip; More');
    r5.appendChild(moreBtn);
    panel = mk('div', { id:'b7p' }); root.appendChild(panel);
    var disc = mk('button', { type:'button', 'class':'btn beveled', id:'b7Disc', title:'nomansskyhub.app' }, '&#9670; Traveller discoveries &#8599;');
    disc.addEventListener('click', openHubAsk);
    var g1 = group('Navigation', ['bFav', 'bWarpToggle', disc], ['b7Disc']);
    group('Map display', ['bLbl', 'bGrid', 'cOrb', 'cFly', 'bAtlas']);
    var atl = $('bAtlas'); if(atl && atl.firstChild && /^\s*Atlas\s*$/.test(atl.textContent)) atl.textContent = 'Galactic Atlas';
    var fb = $('bFeedback');
    if(fb && !fb.querySelector('.b7fbl')){ fb.appendChild(mk('span', { 'class':'b7fbl' }, 'Reviews &amp; feedback')); }
    group('Exploration', ['bTour', 'bAbout', 'bInstall', 'bFeedback'], ['bInstall', 'bFeedback']);
    moreBtn.addEventListener('click', function(){ setMore(!panel.classList.contains('open')); });
    ['bFav','bTour','bAbout','bFeedback'].forEach(function(i){ var e = $(i); if(e) e.addEventListener('click', closeMoreSoon); });
    disc.addEventListener('click', closeMoreSoon);
    var rf = $('nmsRefresh'); if(rf && rf.parentNode !== r1) r1.insertBefore(rf, $('bLang'));
    /* tour: a step that points at More, placed before the Atlas step */
    if(window.TOUR_STEPS && !tourStep){
      tourStep = { sel:'#b7More', title:'More controls',
        body:'Everything else lives under More: favourites, Warp FX, labels, grid, camera, the Galactic Atlas overlay, this tour and About. Tap it again to close.' };
      var at = TOUR_STEPS.findIndex(function(s){ return s.sel === '#bAtlas'; });
      TOUR_STEPS.splice(at >= 0 ? at : TOUR_STEPS.length, 0, tourStep);
    }
    if(!flipTimer) flipTimer = setInterval(flipStep, 6000);
    var line = $('chartedLine');
    if(line){
      line.addEventListener('pointerdown', function(){ flipPause = Date.now() + 8000; });
      if(faces().length) setFace(0);
    }
    sync();
    if(window.ResizeObserver && !ro){ ro = new ResizeObserver(function(){ if(active) sync(); }); ro.observe(top); }
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if(active) sync(); });
  }
  function closeMoreSoon(){ setTimeout(function(){ setMore(false); }, 0); }

  function restore(){
    if(!active) return;
    active = false;
    setMore(false);
    for(var i = home.length - 1; i >= 0; i--){
      var h = home[i];
      if(h.next && h.next.parentNode === h.parent) h.parent.insertBefore(h.el, h.next); else h.parent.appendChild(h.el);
    }
    home = [];
    var fb = $('bFeedback'); if(fb){ var l = fb.querySelector('.b7fbl'); if(l) l.remove(); }
    var atl = $('bAtlas'); if(atl && atl.textContent === 'Galactic Atlas') atl.textContent = 'Atlas';
    if(root){ root.remove(); root = null; }
    document.documentElement.classList.remove('b7');
    if(tourStep && window.TOUR_STEPS){ var at = TOUR_STEPS.indexOf(tourStep); if(at >= 0) TOUR_STEPS.splice(at, 1); tourStep = null; }
    var line = $('chartedLine'); if(line && faces().length) line.textContent = faces()[0];
    sync();
  }
  function sync(){
    try{ if(window.syncTopOffset) syncTopOffset(); if(window.positionAnnivBadge) positionAnnivBadge(); if(window.positionSysBanner) positionSysBanner(); }catch(e){}
  }
  function apply(){ if(mq.matches) build(); else restore(); }

  /* the old auto-hide after an action now just closes More (and the keypad) */
  var oldAuto = window.autoHideControls;
  window.autoHideControls = function(withKeypad){
    if(!active){ if(oldAuto) oldAuto(withKeypad); return; }
    if(withKeypad){ var k = $('keys'), bk = $('bKeys'); if(k && k.classList.contains('show')){ k.classList.remove('show'); if(bk) bk.classList.remove('on'); } }
    setMore(false);
  };
  /* tour: open More only for the steps that point inside it */
  if(typeof window.tourPosition === 'function'){
    var tp = window.tourPosition;
    window.tourPosition = function(){
      if(active && window.TOUR_STEPS){
        var st = TOUR_STEPS[window.tourIdx], el = st && document.querySelector(st.sel);
        setMore(!!(el && el.closest && el.closest('#b7p')));
      }
      return tp.apply(this, arguments);
    };
  }
  if(typeof window.closeTour === 'function'){
    var ct = window.closeTour;
    window.closeTour = function(){ setMore(false); return ct.apply(this, arguments); };
  }
  document.addEventListener('pointerdown', function(e){
    if(!active || !panel || !panel.classList.contains('open')) return;
    if(panel.contains(e.target) || (moreBtn && moreBtn.contains(e.target))) return;
    if(window.tourActive) return;
    setMore(false);
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(ask && ask.classList.contains('open')) ask.classList.remove('open'); else setMore(false);
  });
  if(mq.addEventListener) mq.addEventListener('change', apply); else if(mq.addListener) mq.addListener(apply);
  apply();
  /* 2026-11-11: the system panel used to cover ~half the screen the moment a system opened.
     On phones it now opens folded to its name row the first time; the arrow unfolds it and
     the choice then stays for the visit. */
  (function(){
    var pn = $('panel'); if(!pn || !window.MutationObserver) return;
    var done = false;
    new MutationObserver(function(){
      if(done || !mq.matches || !pn.classList.contains('show')) return;
      done = true; pn.classList.add('panel-min');
      var b = $('bPanelMin'); if(b) b.innerHTML = '&#9656;';
    }).observe(pn, { attributes:true, attributeFilter:['class'] });
  })();
})();
