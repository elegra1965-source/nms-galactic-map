/* ============================================================
   NMS medals + streaks (2026-10-30, Tony) -- the same file on the Galactic
   Map and the Hub (copy it to both when it changes).

   ONE medal set for Trending #1-3, Top Surveyors #1-3 and personal streaks:
   metal disc + laurels, an NMS ship flying in (bronze Shuttle, silver Fighter,
   gold Exotic), its trail starting at the top-left rim star and running behind
   the rim + laurels into the engines, dots + tiny 4-point stars in the face,
   ribbon with an Orbitron label. Locked = grey disc + black ship, no trail.
   Earned = colour reveal (grey -> colour, trail draws from the star, stars
   twinkle, ~1.5 s, tap skips, reduced motion = instant).
   Ship positions = Tony's signed-off positioner settings (30 Oct 15:20).

   STREAKS (no login; your streak itself never leaves the device):
   - Counted on the Galactic Map only: a PUBLIC save of a system nobody had
     charted before, and only once the NMS Almanac confirms the system exists
     (map function almanac?exists=1, cached). One count per system, ever.
   - Days are UK calendar days. 1 grace day a week: one missed day in a
     Monday-Sunday week doesn't break the streak (it just doesn't add a day).
   - Daily medals at 3 / 7 / 14 / 30 days in a row (bronze, bronze, silver,
     gold -- see DAILY), weekly medal for 3 new systems in a week, monthly
     medal for 10 in a calendar month. Change the numbers in TARGETS.
   - Saved on this device: cookie nms_streak on .nomansskyhub.app (so the Hub
     can show it) + a localStorage copy on the map. "Who am I" = the map's
     Edit system "Your name", else the Hub Traveller ID name (nmsTraveller cookie).
   - "Total unlocked" (Tony, 30 Oct): when a medal is earned, ONLY which medal it
     was (e.g. "d7") goes to the map's medal-count function, which keeps one
     total per medal. No name, system, streak or device id. Cards and the panel
     show "Unlocked by N travellers so far".

   API (window.NMSMedals):
     svg(metal, label, {locked, size})      -> <svg> element
     card(o)                                -> opens a medal card (see card())
     cardBlob(o)                            -> Promise<PNG Blob> 1080x1350 picture of a card
     charted({galaxy,address,name,editor})  -> map: count a NEW public system
     panel()                                -> opens the View Streak panel
     stats()                                -> {cur, longest, week, month, ...}
     me()                                   -> traveller name on this device ('' if none)
     config: {glyph(ch) -> url, shipBase, mapUrl, onTrending()}
   Test: ?medaldemo=bronze|silver|gold|week|month opens a sample earned card
   (nothing saved).
   ============================================================ */
(function(){
  'use strict';
  if(window.NMSMedals) return;
  var NS = 'http://www.w3.org/2000/svg';
  var TARGETS = { daily: [3, 7, 14, 30], week: 3, month: 10 };
  var DAILY = { 3: 'bronze', 7: 'bronze', 14: 'silver', 30: 'gold' };
  var COL = { gold: '#f2b84b', silver: '#c9d6df', bronze: '#d08a52' };
  var METALS = {
    gold:  { d:['#ffe7a3','#e2a83c','#8a5a10','#4e3006'], f:['#3a2a0e','#1d1406','#0d0903'], rim:['#fff3c8','#c88b22','#6a4208'], rib:['#f6d27a','#d29a32','#8d5d10'], tail:'#9a6614', ink:'#3a2404', edge:'#5e3b06', halo:'#f2b84b' },
    silver:{ d:['#ffffff','#c9d6df','#6b7c88','#36424b'], f:['#26303a','#151b22','#0a0d11'], rim:['#ffffff','#a9b8c3','#4d5b66'], rib:['#eef4f8','#b5c3cd','#6b7a85'], tail:'#7d8b96', ink:'#1e262d', edge:'#3d4952', halo:'#c9d6df' },
    bronze:{ d:['#ffd9b8','#d08a52','#7a4218','#3e1f08'], f:['#33200f','#1b1007','#0d0703'], rim:['#ffe0c4','#b8703a','#5e3010'], rib:['#f0b98a','#c47a42','#7a4218'], tail:'#8f5226', ink:'#2e1606', edge:'#4e2508', halo:'#d08a52' }
  };
  // Tony's final settings (positioner v6). Ships deliberately poke out past the rim.
  var SHIP = {
    bronze:{ img:'ship-shuttle.webp', iw:600, ih:342, x:285, y:220, w:340, rot:-10 },  /* 2026-10-31 Tony's own Shuttle + Fighter shots */
    silver:{ img:'ship-fighter.webp', iw:600, ih:295, x:305, y:228, w:340, rot:-17 },
    gold:  { img:'ship-exotic-topdown.webp', iw:500, ih:332, x:309, y:197, w:342, rot:-4 }
  };
  var C = window.NMSMedals_CONFIG || {};
  var cfg = {
    shipBase: C.shipBase || '/medals/',
    glyph: C.glyph || function(ch){ return '/glyphs/glyph-mask-' + ch + '.png'; },
    mapUrl: C.mapUrl || 'https://map.nomansskyhub.app',
    onTrending: C.onTrending || null,
    onFly: C.onFly || null,
    countUrl: C.countUrl || ((C.mapUrl || 'https://map.nomansskyhub.app') + '/.netlify/functions/medal-count')
  };
  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('calm'); } catch(e){}

  function T(s, v){
    var r = (typeof window.NMS_T === 'function') ? window.NMS_T(s, v) : s;
    if(v && r === s) r = s.replace(/\{(\w+)\}/g, function(m, k){ return v[k] != null ? v[k] : m; });
    return r;
  }
  function el(n, a, p){ var e = document.createElementNS(NS, n); for(var k in a) e.setAttribute(k, a[k]); if(p) p.appendChild(e); return e; }
  function hel(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function grad(id, cols, p, radial, vertical){
    var g = el(radial ? 'radialGradient' : 'linearGradient', radial ? { id:id, cx:'40%', cy:'30%', r:'80%' } : { id:id, x1:0, y1:0, x2: vertical ? 0 : 1, y2:1 }, p);
    cols.forEach(function(c, i){ el('stop', { offset: i / (cols.length - 1), 'stop-color': c }, g); });
    return g;
  }
  function star4(p, x, y, s, fill, op, cls){
    var a = { d:'M0 -34 L5 -5 L34 0 L5 5 L0 34 L-5 5 L-34 0 L-5 -5Z', fill:fill, opacity:op, transform:'translate(' + x + ' ' + y + ') scale(' + s + ')' };
    if(cls) a['class'] = cls;
    return el('path', a, p);
  }
  function rnd(seed){ return function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

  /* star trail geometry (Tony's Lab settings, FLY[metal]): from the corner star to the ship's engine tip.
     end = the engine point (engX/engY in the ship's frame) + (tx,ty); tilts 0 = tangent straight down. */
  function engineEnd(m){
    var S = SHIP[m], P = FLY[m], r = S.rot * Math.PI / 180;
    return { x: S.x + P.engX * Math.cos(r) - P.engY * Math.sin(r) + P.tx, y: S.y + P.engX * Math.sin(r) + P.engY * Math.cos(r) + P.ty };
  }
  function trailD(P, wx, wy){
    var dx = wx - P.sx, dy = wy - P.sy, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len, k = len * P.str;
    var ta = (90 + P.t1) * Math.PI / 180, tb = (90 + P.t2) * Math.PI / 180;
    return 'M' + P.sx + ' ' + P.sy + ' C ' + (P.sx + Math.cos(ta) * k + nx * P.bend).toFixed(1) + ' ' + (P.sy + Math.sin(ta) * k + ny * P.bend).toFixed(1) + ', ' +
           (wx - Math.cos(tb) * k + nx * P.bend).toFixed(1) + ' ' + (wy - Math.sin(tb) * k + ny * P.bend).toFixed(1) + ', ' + wx.toFixed(1) + ' ' + wy.toFixed(1);
  }
  var uidN = 0;

  /* ---------- the medal ---------- */
  // o.locked: grey + black ship, no trail. o.reveal: built locked-looking, then play().
  // o.noText: ribbon text left out (the picture export draws it on the canvas).
  // o.href: ship picture override (data: URL for the export).
  function svg(metal, label, o){
    o = o || {};
    var M = METALS[metal] || METALS.gold, S = SHIP[metal] || SHIP.gold, id = 'nm' + (++uidN) + '_';
    var s = el('svg', { viewBox:'0 0 560 560', 'data-metal':metal, role:'img', 'class':'nmsm-svg' + (o.locked ? ' lk' : '') + (o.reveal ? ' rv' : ''), 'aria-label': (o.locked ? T('Locked') + ' · ' : '') + T(metal === 'gold' ? 'Gold medal' : metal === 'silver' ? 'Silver medal' : 'Bronze medal') + (label ? ' · ' + label : '') });
    if(o.size){ s.setAttribute('width', o.size); s.setAttribute('height', o.size); }
    var FP = FLY[metal] || FLY.gold, SX = FP.sx, SY = FP.sy, EE = engineEnd(FLY[metal] ? metal : 'gold'); // corner star + trail end: Tony's Lab settings
    var d = el('defs', {}, s);
    grad(id + 'disc', M.d, d, true); grad(id + 'face', M.f, d, true); grad(id + 'rim', M.rim, d); grad(id + 'rib', M.rib, d, false, true);
    var tg = el('linearGradient', { id:id + 'tr', gradientUnits:'userSpaceOnUse', x1:SX, y1:SY, x2:EE.x, y2:EE.y }, d);
    [[0,'#fff8de',.9],[.25,'#9ff4ff',.25],[.7,'#7fe9ff',.6],[1,'#ffffff',.95]].forEach(function(t){ el('stop', { offset:t[0], 'stop-color':t[1], 'stop-opacity':t[2] }, tg); });
    var f = el('filter', { id:id + 'gl', x:'-50%', y:'-50%', width:'200%', height:'200%' }, d); el('feGaussianBlur', { stdDeviation:6 }, f);
    var sh = el('filter', { id:id + 'sh', x:'-30%', y:'-30%', width:'160%', height:'160%' }, d); el('feDropShadow', { dx:0, dy:10, stdDeviation:10, 'flood-color':'#000', 'flood-opacity':.6 }, sh);
    var bk = el('filter', { id:id + 'bk' }, d); el('feColorMatrix', { type:'matrix', values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .85 0' }, bk);
    var cp = el('clipPath', { id:id + 'fc' }, d); el('circle', { cx:280, cy:250, r:168 }, cp);
    var all = el('g', { 'class':'nmsm-all' }, s);
    el('circle', { cx:280, cy:250, r:215, fill:M.halo, opacity:.12, filter:'url(#' + id + 'gl)' }, all);
    el('circle', { cx:280, cy:250, r:200, fill:'url(#' + id + 'disc)', filter:'url(#' + id + 'sh)' }, all);
    el('circle', { cx:280, cy:250, r:186, fill:'none', stroke:'url(#' + id + 'rim)', 'stroke-width':4 }, all);
    el('circle', { cx:280, cy:250, r:170, fill:'url(#' + id + 'face)' }, all);
    el('circle', { cx:280, cy:250, r:170, fill:'none', stroke:M.rib[0], 'stroke-opacity':.6, 'stroke-width':2 }, all);
    var sf = el('g', { 'clip-path':'url(#' + id + 'fc)' }, all), R = rnd(7);
    for(var i = 0; i < 26; i++){ var a = R() * 6.283, r = Math.sqrt(R()) * 160; el('circle', { cx:280 + Math.cos(a) * r, cy:250 + Math.sin(a) * r, r:.6 + R() * 1.3, fill:'#fff6dc', opacity:.35 + R() * .55 }, sf); }
    [[218,148,.16],[372,170,.12],[336,372,.14],[205,338,.1],[402,268,.09],[262,128,.08]].forEach(function(t, k){ var p = star4(sf, t[0], t[1], t[2], '#fff6dc', .85, 'nmsm-tw'); p.style.animationDelay = (k * .19) + 's'; });
    if(!o.locked){
      var tp = trailD(FP, EE.x, EE.y);
      var tgp = el('g', { 'clip-path':'url(#' + id + 'fc)', 'class':'nmsm-trail' }, all);
      el('path', { d:tp, fill:'none', stroke:'url(#' + id + 'tr)', 'stroke-width':FP.gw, 'stroke-linecap':'round', filter:'url(#' + id + 'gl)', opacity:.8, pathLength:1 }, tgp);
      el('path', { d:tp, fill:'none', stroke:'url(#' + id + 'tr)', 'stroke-width':FP.tw, 'stroke-linecap':'round', pathLength:1 }, tgp);
    }
    var g = el('g', {}, all), rr = 152;
    [-1, 1].forEach(function(sg){
      var dd = '';
      for(var k = 0; k <= 12; k++){ var p = (18 + k * 10) * Math.PI / 180; dd += (k ? 'L' : 'M') + (280 + sg * rr * Math.sin(p)) + ' ' + (250 + rr * Math.cos(p)) + ' '; }
      el('path', { d:dd, fill:'none', stroke:M.rim[1], 'stroke-width':2.5 }, g);
      for(var j = 0; j < 12; j++){
        var ph = (22 + j * 10) * Math.PI / 180, x = 280 + sg * rr * Math.sin(ph), y = 250 + rr * Math.cos(ph), tang = Math.atan2(-Math.sin(ph), sg * -Math.cos(ph)) * 180 / Math.PI, sz = 24 - j * .9;
        [38, -38].forEach(function(of){ el('path', { d:'M0 0 Q ' + sz * .5 + ' ' + (-sz * .32) + ' ' + sz + ' 0 Q ' + sz * .5 + ' ' + (sz * .32) + ' 0 0Z', transform:'translate(' + x + ' ' + y + ') rotate(' + (tang + of * sg) + ')', fill:'url(#' + id + 'rim)', stroke:M.edge, 'stroke-width':1 }, g); });
      }
    });
    var W = S.w, H = W * S.ih / S.iw, href = o.href || (cfg.shipBase + S.img);
    var shipG = el('g', { transform:'translate(' + S.x + ' ' + S.y + ') rotate(' + S.rot + ')' }, all);
    if(!o.locked) el('image', { href:href, x:-W / 2, y:-H / 2, width:W, height:H, filter:'url(#' + id + 'sh)', 'class':'nmsm-ship' }, shipG);
    // black silhouette: the locked look, and the starting point of the reveal (fades out)
    if(o.locked || o.reveal) el('image', { href:href, x:-W / 2, y:-H / 2, width:W, height:H, filter:'url(#' + id + 'bk)', 'class':'nmsm-sil' }, shipG);
    var sgp = el('g', { transform:'translate(' + SX + ' ' + SY + ')' }, all);
    el('path', { d:'M0 -34 L6 -6 L34 0 L6 6 L0 34 L-6 6 L-34 0 L-6 -6Z', fill:'#fff8de', filter:'url(#' + id + 'gl)', opacity:.9, 'class':'nmsm-tw' }, sgp);
    star4(sgp, 0, 0, 1, '#fffbea', 1);
    star4(all, 430, 368, .45, '#fff3c8', .8, 'nmsm-tw').style.animationDelay = '.5s';
    var rg = el('g', { filter:'url(#' + id + 'sh)', transform:'translate(0 -26)' }, all);
    el('path', { d:'M110 418 L150 412 L150 462 L110 470 L124 444Z', fill:M.tail }, rg);
    el('path', { d:'M450 418 L410 412 L410 462 L450 470 L436 444Z', fill:M.tail }, rg);
    el('path', { d:'M140 400 Q280 380 420 400 L420 458 Q280 438 140 458Z', fill:'url(#' + id + 'rib)', stroke:M.edge, 'stroke-width':2 }, rg);
    if(!o.noText && label){
      var fs = label.length > 9 ? 26 : label.length > 7 ? 30 : 36;
      var tx = el('text', { x:280, y:412, 'text-anchor':'middle', 'font-family':'Orbitron, sans-serif', 'font-weight':700, 'font-size':fs, 'letter-spacing':4, fill:M.ink }, all);
      tx.textContent = label;
    }
    return s;
  }

  /* ---------- fly-in reveal (2026-11-04, Tony tuned it in the Medal Fly-in Lab) ----------
     The ship arrives nose first from behind, brakes onto its signed-off spot while the badge
     goes grey -> colour; an engine glow + wake follow it; on landing: flash, ring (centred,
     ends at the inner circle), sparkles, a little shake, rim pulse; then the star trail
     draws. Everything is a function of time t. Tap = jump to the finished badge.
     Reduced motion = instant (handled in play()). */
  var FLY = {"gold":{"delay":0.35,"dur":2.8,"dist":520,"arc":-55,"sScale":0.3,"bank":12,"ease":"inOutCubic","back":1.2,"fade":0.12,"thrust":1,"flame":70,"wake":1.05,"wakeW":10,"flash":0.8,"ring":0.9,"ringSize":170,"shake":3.5,"spark":16,"pulse":0.9,"trail":"follow","colour":"flight","angle":-151,"engX":-106,"engY":-25,"flameA":-165,"sx":143,"sy":113,"tx":2,"ty":9,"bend":4,"t1":-34,"t2":-71,"str":0.55,"tw":3,"gw":10,"mark":0,"tlead":0.15},"silver":{"delay":0.35,"dur":2.4,"angle":-155,"dist":520,"arc":-40,"sScale":0.3,"bank":4,"ease":"inOutCubic","back":1.2,"fade":0.12,"thrust":1,"flame":80,"wake":0.7,"wakeW":10,"flash":0.5,"ring":0.6,"ringSize":170,"shake":2,"spark":9,"pulse":0.6,"trail":"follow","colour":"flight","engX":-108,"engY":-80,"flameA":-135,"sx":122,"sy":95,"tx":18,"ty":11,"bend":8,"t1":-41,"t2":-117,"str":0.55,"tw":3,"gw":10,"mark":0,"tlead":0},"bronze":{"delay":0.35,"dur":2,"angle":-150,"dist":520,"arc":45,"sScale":0.3,"bank":15,"ease":"inOutCubic","back":1.2,"fade":0.12,"thrust":1,"flame":88,"wake":1.1,"wakeW":10.5,"flash":0.3,"ring":0.35,"ringSize":170,"shake":1,"spark":4,"pulse":0.4,"trail":"follow","colour":"flight","engX":-118,"engY":-56,"flameA":-148,"sx":150,"sy":105,"tx":0,"ty":0,"bend":0,"t1":0,"t2":0,"str":0.55,"tw":3,"gw":17,"mark":0,"tlead":0}};
  function fclamp(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function fsmooth(x){ x = fclamp(x); return x * x * (3 - 2 * x); }
  function fease(n, p, back){
    p = fclamp(p);
    if(n === 'outCubic') return 1 - Math.pow(1 - p, 3);
    if(n === 'outExpo') return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
    if(n === 'outBack'){ var c1 = back, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
    if(n === 'inOutCubic') return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    return 1 - Math.pow(1 - p, 4);
  }
  var SPK = (function(){ var q = 11, a = []; for(var i = 0; i < 28; i++){ q = (q * 16807) % 2147483647; var an = q / 2147483647 * 6.2832; q = (q * 16807) % 2147483647; var d = .45 + q / 2147483647 * .55; q = (q * 16807) % 2147483647; a.push({ a:an, d:d, z:.6 + q / 2147483647 * .7 }); } return a; })();
  function fly(s, m){
    var P = FLY[m], S = SHIP[m];
    var all = s.querySelector('.nmsm-all'), shipImg = s.querySelector('.nmsm-ship'), defs = s.querySelector('defs');
    if(!P || !S || !all || !shipImg || !defs) return false;
    var shipG = shipImg.parentNode, orig = shipG.getAttribute('transform');
    var kids = Array.prototype.slice.call(all.children), i = kids.indexOf(shipG), halo = kids[0];
    if(i < 1) return false;
    var A = el('g', {}), B = el('g', {});
    all.insertBefore(A, kids[0]); all.insertBefore(B, shipG.nextSibling);
    kids.slice(0, i).forEach(function(k){ A.appendChild(k); });
    kids.slice(i + 1).forEach(function(k){ B.appendChild(k); });
    var gid = 'fl' + (++uidN) + '_';
    var rg = el('radialGradient', { id:gid }, defs);
    [[0,'#ffffff',1],[.35,'#9ff4ff',.8],[1,'#00e5ff',0]].forEach(function(t){ el('stop', { offset:t[0], 'stop-color':t[1], 'stop-opacity':t[2] }, rg); });
    var fl = el('ellipse', { cx:0, cy:0, rx:30, ry:12, fill:'url(#' + gid + ')', opacity:0 }, shipG);
    var wake = el('g', { 'pointer-events':'none' }); all.insertBefore(wake, B);
    var segs = []; for(var q = 0; q < 28; q++) segs.push(el('line', { 'stroke-linecap':'round', stroke:'#bff8ff', opacity:0 }, wake));
    var fx = el('g', { 'pointer-events':'none' }, all);
    var fg = el('radialGradient', { id:gid + 'f' }, defs);
    [[0,'#ffffff',1],[.4,'#fff3c8',.55],[1,'#f2b84b',0]].forEach(function(t){ el('stop', { offset:t[0], 'stop-color':t[1], 'stop-opacity':t[2] }, fg); });
    var fcp = el('clipPath', { id:gid + 'c' }, defs); el('circle', { cx:280, cy:250, r:172 }, fcp);
    var fxc = el('g', { 'clip-path':'url(#' + gid + 'c)' }, fx);
    var flash = el('circle', { cx:280, cy:250, r:170, fill:'url(#' + gid + 'f)', opacity:0 }, fxc);
    var ring = el('circle', { cx:280, cy:250, r:20, fill:'none', stroke:'#ffffff', opacity:0 }, fxc);
    var sparks = []; for(var k = 0; k < 28; k++) sparks.push(el('path', { d:'M0 -34 L5 -5 L34 0 L5 5 L0 34 L-5 5 L-34 0 L-5 -5Z', fill:'#fff3c8', opacity:0 }, fx));
    var trail = s.querySelectorAll('.nmsm-trail path'), trailG = trail.length ? trail[0].parentNode : null, tg = s.querySelector('linearGradient[id$="tr"]'), fin = trail.length ? trail[0].getAttribute('d') : '';
    var follow = P.trail === 'follow' && trailG, tEnter = 0;
    if(follow){ var best = 1e9; for(var z = 0; z <= 60; z++){ var tz = P.delay + P.dur * z / 60, sz = state(tz), dz = Math.hypot(sz.x - P.sx, sz.y - P.sy); if(dz < best){ best = dz; tEnter = tz; } } tEnter += P.tlead || 0; }
    s.classList.add('fly');
    var sil = s.querySelector('.nmsm-sil'); if(sil) sil.style.display = 'none';
    var land = P.delay + P.dur, total = P.delay + P.dur + 1.5, gone = false, raf = 0, t0 = 0, glow = false;
    function state(t){
      var pr = fclamp((t - P.delay) / P.dur), e = fease(P.ease, pr, P.back), a = P.angle * Math.PI / 180;
      var x0 = S.x + Math.cos(a) * P.dist, y0 = S.y + Math.sin(a) * P.dist, dx = S.x - x0, dy = S.y - y0, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = P.arc * Math.sin(Math.PI * pr);
      return { x:x0 + dx * e + (-dy / len) * bend, y:y0 + dy * e + (dx / len) * bend, rot:S.rot + P.bank * (1 - e), sc:P.sScale + (1 - P.sScale) * e, pr:pr };
    }
    function eng(tt){ var s2 = state(tt), r = s2.rot * Math.PI / 180; return { x:s2.x + (P.engX * Math.cos(r) - P.engY * Math.sin(r)) * s2.sc, y:s2.y + (P.engX * Math.sin(r) + P.engY * Math.cos(r)) * s2.sc, ok:tt >= P.delay }; }
    function render(t){
      var st = state(t), started = t >= P.delay;
      shipG.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') rotate(' + st.rot.toFixed(2) + ') scale(' + st.sc.toFixed(3) + ')');
      shipG.style.opacity = started ? fclamp(st.pr / Math.max(.001, P.fade || .001)) : 0;
      var L = P.flame, ux = Math.cos(P.flameA * Math.PI / 180), uy = Math.sin(P.flameA * Math.PI / 180), cx = (P.engX + ux * L * .6).toFixed(1), cy = (P.engY + uy * L * .6).toFixed(1);
      fl.setAttribute('rx', Math.max(1, L)); fl.setAttribute('ry', Math.max(1, L * .38)); fl.setAttribute('cx', cx); fl.setAttribute('cy', cy);
      fl.setAttribute('transform', 'rotate(' + P.flameA + ' ' + cx + ' ' + cy + ')');
      fl.setAttribute('opacity', (P.thrust * Math.pow(1 - fclamp(st.pr), .7) * (started ? 1 : 0)).toFixed(3));
      var prev = eng(t);
      for(var n = 0; n < segs.length; n++){
        var tt = t - (n + 1) / segs.length * P.wake, cu = eng(tt), ln = segs[n], f = 1 - n / segs.length;
        if(P.wake <= 0 || !prev.ok || !cu.ok || !started){ ln.setAttribute('opacity', 0); prev = cu; continue; }
        ln.setAttribute('x1', prev.x.toFixed(1)); ln.setAttribute('y1', prev.y.toFixed(1)); ln.setAttribute('x2', cu.x.toFixed(1)); ln.setAttribute('y2', cu.y.toFixed(1));
        ln.setAttribute('stroke-width', Math.max(.4, P.wakeW * f * st.sc).toFixed(2)); ln.setAttribute('opacity', (f * .8).toFixed(3)); prev = cu;
      }
      var g = P.colour === 'none' ? 0 : P.colour === 'landing' ? 1 - fsmooth((t - land) / .5) : 1 - fsmooth((t - P.delay) / (P.dur * .9));
      var flt = g < .005 ? 'none' : 'grayscale(' + g.toFixed(3) + ') brightness(' + (1 - .5 * g).toFixed(3) + ')';
      A.style.filter = flt; B.style.filter = flt;
      var d = P.trail === 'off' ? 0 : follow ? 1 : P.trail === 'during' ? fsmooth(st.pr) : fsmooth((t - land) / .8);
      if(follow){   // the line stays tied to the star and its end rides the ship's engine
        var e0 = eng(t), wx = e0.x + P.tx * st.sc, wy = e0.y + P.ty * st.sc, dd = trailD(P, wx, wy);
        for(var y = 0; y < trail.length; y++) trail[y].setAttribute('d', dd);
        if(tg){ tg.setAttribute('x2', wx); tg.setAttribute('y2', wy); }
        trailG.style.opacity = fsmooth((t - tEnter) / .35);
      }
      for(var j = 0; j < trail.length; j++) trail[j].style.strokeDashoffset = (1 - d).toFixed(4);
      var qq = fclamp((t - land) / .9), q2 = fclamp((t - land) / .4), on = t >= land;
      if(on && !glow){ glow = true; s.classList.add('go'); }
      flash.setAttribute('opacity', on ? (P.flash * Math.pow(1 - qq, 2)).toFixed(3) : 0);
      ring.setAttribute('r', (20 + (P.ringSize - 20) * (1 - Math.pow(1 - qq, 3))).toFixed(1));
      ring.setAttribute('stroke-width', (1 + 5 * (1 - qq)).toFixed(2));
      ring.setAttribute('opacity', on ? (P.ring * (1 - qq)).toFixed(3) : 0);
      for(var u = 0; u < sparks.length; u++){
        var sp = sparks[u]; if(!on || u >= P.spark){ sp.setAttribute('opacity', 0); continue; }
        var c = SPK[u], dist = (50 + 130 * c.d) * (1 - Math.pow(1 - qq, 2.2)), sc = .24 * c.z * (1 - qq * .8);
        sp.setAttribute('transform', 'translate(' + (280 + Math.cos(c.a) * dist).toFixed(1) + ' ' + (250 + Math.sin(c.a) * dist).toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
        sp.setAttribute('opacity', (1 - qq).toFixed(3));
      }
      var sh = on ? P.shake * (1 - q2) * Math.sin(q2 * 38) : 0;
      s.style.transform = sh ? 'translate(' + sh.toFixed(2) + 'px,' + (sh * .6).toFixed(2) + 'px)' : '';
      halo.setAttribute('opacity', (.12 + (on ? P.pulse * .5 * Math.exp(-qq * 3.2) : 0)).toFixed(3));
    }
    function finish(){
      if(gone) return; gone = true; if(raf) cancelAnimationFrame(raf);
      if(orig != null) shipG.setAttribute('transform', orig); shipG.style.opacity = '';
      [fl, wake, fx].forEach(function(n){ if(n.parentNode) n.parentNode.removeChild(n); });
      A.style.filter = ''; B.style.filter = ''; s.style.transform = ''; halo.setAttribute('opacity', .12);
      for(var j = 0; j < trail.length; j++){ trail[j].style.strokeDashoffset = '0'; if(follow) trail[j].setAttribute('d', fin); }
      if(follow){ trailG.style.opacity = ''; if(tg){ var ee = engineEnd(m); tg.setAttribute('x2', ee.x); tg.setAttribute('y2', ee.y); } }
      s.classList.add('done');
    }
    function loop(ts){
      if(gone) return;
      if(!s.isConnected){ finish(); return; }
      if(!t0) t0 = ts;
      var t = (ts - t0) / 1000;
      if(t >= total){ finish(); return; }
      render(t); raf = requestAnimationFrame(loop);
    }
    render(0); raf = requestAnimationFrame(loop);
    s.addEventListener('click', finish, { once:true });
    return true;
  }
  // play the earned reveal on an svg built with {reveal:true}
  function play(s){
    if(!s) return;
    if(RM){ s.classList.add('done'); return; }
    if(fly(s, s.getAttribute('data-metal'))) return;
    s.getBoundingClientRect();
    requestAnimationFrame(function(){ s.classList.add('go'); });
    setTimeout(function(){ s.classList.add('done'); }, 2600);
    s.addEventListener('click', function(){ s.classList.add('done'); }, { once:true });
  }

  /* ---------- styles (one block, injected once) ---------- */
  function css(){
    if(document.getElementById('nmsmCss')) return;
    var st = document.createElement('style'); st.id = 'nmsmCss';
    st.textContent = [
      '.nmsm-svg{display:block;overflow:visible}',
      '.nmsm-svg.lk{filter:grayscale(1) brightness(.5)}',
      '.nmsm-svg.rv{filter:grayscale(1) brightness(.5);transition:filter 1.5s ease}',
      '.nmsm-svg.rv .nmsm-sil{transition:opacity 1.1s ease .2s}',
      '.nmsm-svg.rv .nmsm-trail path{stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset 1.3s ease .25s}',
      '.nmsm-svg.rv.go,.nmsm-svg.rv.done{filter:none}',
      '.nmsm-svg.rv.fly,.nmsm-svg.rv.fly *{transition:none!important}.nmsm-svg.rv.fly{filter:none}',
      '.nmsm-svg.rv.go .nmsm-sil,.nmsm-svg.rv.done .nmsm-sil{opacity:0}',
      '.nmsm-svg.rv.go .nmsm-trail path,.nmsm-svg.rv.done .nmsm-trail path{stroke-dashoffset:0}',
      '.nmsm-svg.rv.go .nmsm-tw{animation:nmsmTw .75s ease-in-out 2 alternate}',
      '.nmsm-svg.rv.done,.nmsm-svg.rv.done *{transition:none!important;animation:none!important}',
      '@keyframes nmsmTw{from{opacity:.85}to{opacity:.15}}',
      '.nmsm-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(2,5,9,.78);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(16px,env(safe-area-inset-top)) 12px 24px;-webkit-overflow-scrolling:touch}',
      '.nmsm-card{position:relative;width:340px;max-width:100%;margin:auto;padding:22px 20px 18px;background:linear-gradient(180deg,rgba(20,36,58,.97),rgba(4,7,12,.98));border:1px solid rgba(0,229,255,.35);box-shadow:0 0 24px rgba(0,229,255,.12),inset 0 0 40px rgba(0,229,255,.04);text-align:center;color:#e8f4f8;font-family:Rajdhani,"Chakra Petch",sans-serif;font-weight:500}',
      '.nmsm-card::before,.nmsm-card::after{content:"";position:absolute;width:18px;height:18px;border:2px solid #00e5ff}',
      '.nmsm-card::before{top:-2px;left:-2px;border-right:0;border-bottom:0}.nmsm-card::after{bottom:-2px;right:-2px;border-left:0;border-top:0}',
      '.nmsm-x{position:absolute;top:6px;right:6px;background:none;border:0;color:#8fb4bf;font-size:22px;cursor:pointer;width:44px;height:44px;line-height:1}',
      '.nmsm-x:hover,.nmsm-x:focus-visible{color:#fff;outline:none}',
      '.nmsm-kick{font-family:Orbitron,sans-serif;font-size:10.5px;letter-spacing:.2em;color:#00e5ff;margin:0 30px 4px;text-transform:uppercase}',
      '.nmsm-title{font-family:Orbitron,sans-serif;font-weight:700;font-size:18px;letter-spacing:.12em;margin:0;text-transform:uppercase;overflow-wrap:anywhere}',
      '.nmsm-medal{width:170px;height:170px;margin:6px auto 0;cursor:pointer}',
      '.nmsm-big{font-family:Orbitron,sans-serif;font-weight:700;font-size:28px;letter-spacing:.1em;margin:0;text-transform:uppercase;overflow-wrap:anywhere}',
      '.nmsm-sub{font-family:Orbitron,sans-serif;font-size:10.5px;letter-spacing:.16em;color:#8fb4bf;margin:2px 0 10px;text-transform:uppercase;overflow-wrap:anywhere}',
      '.nmsm-rule{height:1px;background:linear-gradient(90deg,transparent,rgba(0,229,255,.5),transparent);margin:10px 0}',
      '.nmsm-lab{font-family:Orbitron,sans-serif;font-size:9.5px;letter-spacing:.18em;color:#8fb4bf;text-transform:uppercase}',
      '.nmsm-sys{font-size:20px;font-weight:600;margin:2px 0 0;overflow-wrap:anywhere}',
      '.nmsm-meta{color:#8fb4bf;font-size:14.5px;margin:0 0 6px}',
      '.nmsm-gl{display:flex;justify-content:center;gap:2px;margin:6px 0 4px;flex-wrap:nowrap}',
      '.nmsm-gl img{width:22px;height:22px;min-width:0;flex:0 1 22px}',
      '.nmsm-hex{font-family:Orbitron,sans-serif;font-size:13px;letter-spacing:.2em;color:#00e5ff}',
      '.nmsm-next{font-size:14.5px;color:#8fb4bf;margin:8px 0 12px}',
      '.nmsm-next b{color:#e8f4f8;font-family:Orbitron,sans-serif;letter-spacing:.08em;font-size:12px}',
      '.nmsm-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.nmsm-btn{font-family:Orbitron,sans-serif;font-size:10.5px;letter-spacing:.12em;min-height:44px;padding:4px 6px;border-radius:2px;cursor:pointer;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.45);color:#00e5ff;text-transform:uppercase}',
      '.nmsm-btn:hover,.nmsm-btn:focus-visible{background:rgba(0,229,255,.16);outline:none}',
      '.nmsm-btn.prim{background:linear-gradient(180deg,#f2b84b,#c98a1e);color:#1a1205;border-color:#f2b84b;font-weight:700}',
      '.nmsm-btn.wide{grid-column:1/-1;background:none;border:1px dashed rgba(0,229,255,.6);color:#e8f4f8}',
      '.nmsm-btn[disabled]{opacity:.6;cursor:wait}',
      '.nmsm-msg{font-size:13.5px;color:#f2b84b;min-height:0;margin:8px 0 0}',
      '.nmsm-msg:empty{display:none}',
      '.nmsm-panel{width:720px}',
      '.nmsm-panel .nmsm-title{text-align:left;flex:1}',
      '.nmsm-ph{display:flex;align-items:center;gap:10px;margin:0 36px 12px 0}',
      '.nmsm-back{font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:.14em;background:none;border:1px solid rgba(0,229,255,.45);color:#00e5ff;min-height:44px;padding:0 12px;cursor:pointer;text-transform:uppercase}',
      '.nmsm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:6px 0 14px}',
      '.nmsm-st{border:1px solid rgba(0,229,255,.2);background:rgba(0,229,255,.03);padding:10px 6px;text-align:center;min-width:0}',
      '.nmsm-st .n{font-family:Orbitron,sans-serif;font-weight:700;font-size:24px;letter-spacing:.1em}',
      '.nmsm-st .l{font-family:Orbitron,sans-serif;font-size:8.5px;letter-spacing:.14em;color:#8fb4bf;margin-top:4px;text-transform:uppercase;overflow-wrap:anywhere}',
      '.nmsm-bar{height:8px;background:rgba(255,255,255,.08);margin-top:8px;position:relative;overflow:hidden}',
      '.nmsm-bar i{position:absolute;left:0;top:0;bottom:0}',
      '.nmsm-ms{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}',
      '.nmsm-m{text-align:center;padding:8px 4px;border:1px solid rgba(0,229,255,.15);min-width:0}',
      '.nmsm-m .nmsm-svg{width:84px;height:84px;margin:0 auto}',
      '.nmsm-m .d{font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase}',
      '.nmsm-m .s{font-size:13px;color:#8fb4bf}',
      '.nmsm-m .c{font-size:12px;color:#8fb4bf;opacity:.85;margin-top:2px}',
      '.nmsm-cnt{font-size:14px;color:#f2b84b;margin:-6px 0 8px}',
      '.nmsm-cnt[hidden],.nmsm-m .c[hidden]{display:none}',
      '.nmsm-m.locked .d{color:#6d7f88}',
      '.nmsm-m.nextm{border-color:rgba(242,184,75,.55)}',
      '.nmsm-m .nmsm-bar{margin:6px 6px 0}',
      '.nmsm-more{display:block;margin:12px auto 0;background:none;border:0;color:#00e5ff;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:.14em;cursor:pointer;min-height:44px;text-transform:uppercase}',
      '.nmsm-ms2{margin-top:6px}','.nmsm-ms[hidden]{display:none}',
      '.nmsm-rules{font-size:13.5px;color:#8fb4bf;text-align:center;margin:10px 0 0}',
      '.nmsm-mini{display:inline-block;width:30px;height:30px;vertical-align:middle;flex:0 0 30px}',
      '.nmsm-mini .nmsm-svg{width:30px;height:30px}',
      'html.nmsm-open{overflow:hidden}',
      '@media (max-width:600px){.nmsm-stats{grid-template-columns:repeat(2,1fr)}.nmsm-ms{grid-template-columns:repeat(2,1fr)}.nmsm-st .n{font-size:22px}}',
      '@media (max-width:340px){.nmsm-card{padding:20px 12px 14px}.nmsm-gl img{width:20px;height:20px}.nmsm-hex{letter-spacing:.14em}.nmsm-btn{font-size:9.5px;letter-spacing:.08em}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- small helpers ---------- */
  function glyphRow(hex){
    var g = hel('div', 'nmsm-gl'); g.setAttribute('translate', 'no'); g.setAttribute('aria-label', T('Portal address') + ' ' + hex);
    String(hex).toUpperCase().split('').forEach(function(ch){ var im = hel('img'); im.src = cfg.glyph(ch); im.alt = ch; g.appendChild(im); });
    return g;
  }
  function toast(msg, ms){
    if(typeof window.toast === 'function'){ try { window.toast(msg, ms || 4000); return; } catch(e){} }
    var t = document.getElementById('nmsmToast');
    if(!t){ t = hel('div'); t.id = 'nmsmToast'; t.setAttribute('role', 'status'); t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147482100;max-width:calc(100vw - 24px);background:rgba(4,7,12,.96);border:1px solid rgba(0,229,255,.5);color:#e8f4f8;font:500 15px Rajdhani,sans-serif;padding:10px 14px;text-align:center'; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, ms || 4000);
  }
  var openOv = null;
  function overlay(inner, label){
    css();
    if(openOv) closeOv();
    var ov = hel('div', 'nmsm-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', label || T('Medal'));
    ov.appendChild(inner);
    var x = hel('button', 'nmsm-x', '×'); x.type = 'button'; x.setAttribute('aria-label', T('Close')); inner.appendChild(x);
    x.addEventListener('click', closeOv);
    ov.addEventListener('click', function(e){ if(e.target === ov) closeOv(); });
    document.body.appendChild(ov);
    document.documentElement.classList.add('nmsm-open');
    openOv = ov; ov._prev = document.activeElement;
    setTimeout(function(){ try { x.focus({ preventScroll:true }); } catch(e){} }, 30);
    return ov;
  }
  function closeOv(){
    if(!openOv) return;
    var p = openOv._prev;
    if(openOv.parentNode) openOv.parentNode.removeChild(openOv);
    openOv = null; document.documentElement.classList.remove('nmsm-open');
    try { if(p && p.focus) p.focus({ preventScroll:true }); } catch(e){}
    if(queue.length) setTimeout(nextQueued, 400);
  }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && openOv) closeOv(); });

  /* ---------- the card ----------
     o = { metal, label (ribbon), kick, title, big, sub, lab, sys, meta, hex,
           next (text, may contain <b> via o.nextHtml), reveal, wide:{label, run},
           shareText, shareUrl, file } */
  function card(o){
    var c = hel('div', 'nmsm-card nmsm-' + o.metal);
    if(o.kick) c.appendChild(hel('p', 'nmsm-kick', o.kick));
    var ti = hel('p', 'nmsm-title', o.title || ''); ti.style.color = COL[o.metal]; c.appendChild(ti);
    var m = svg(o.metal, o.label, { reveal: !!o.reveal }); m.classList.add('nmsm-medal'); c.appendChild(m);
    if(o.big){ var b = hel('p', 'nmsm-big', o.big); b.style.color = COL[o.metal]; c.appendChild(b); }
    if(o.sub) c.appendChild(hel('p', 'nmsm-sub', o.sub));
    if(o.countFor){ var cl = hel('p', 'nmsm-cnt'); c.appendChild(cl); countLine(cl, o.countFor); }
    if(o.sys || o.hex){
      c.appendChild(hel('div', 'nmsm-rule'));
      if(o.lab) c.appendChild(hel('div', 'nmsm-lab', o.lab));
      if(o.sys){ var sy = hel('p', 'nmsm-sys', o.sys); sy.setAttribute('translate', 'no'); c.appendChild(sy); }
      if(o.meta) c.appendChild(hel('p', 'nmsm-meta', o.meta));
      if(o.hex){ c.appendChild(glyphRow(o.hex)); var hx = hel('div', 'nmsm-hex', String(o.hex).toUpperCase()); hx.setAttribute('translate', 'no'); c.appendChild(hx); }
    }
    if(o.next){ var nx = hel('p', 'nmsm-next'); nx.textContent = o.next; c.appendChild(nx); }
    var bt = hel('div', 'nmsm-btns');
    var dl = hel('button', 'nmsm-btn prim', '⬇ ' + T('Download')); dl.type = 'button';
    var sh = hel('button', 'nmsm-btn', '⇪ ' + T('Share')); sh.type = 'button';
    bt.appendChild(dl); bt.appendChild(sh);
    if(o.wide){ var w = hel('button', 'nmsm-btn wide', o.wide.label); w.type = 'button'; w.addEventListener('click', function(){ o.wide.run(); }); bt.appendChild(w); }
    c.appendChild(bt);
    var msg = hel('p', 'nmsm-msg'); msg.setAttribute('aria-live', 'polite'); c.appendChild(msg);
    var file = (o.file || 'nms-medal') + '.png';
    function busy(btn, on, txt){ btn.disabled = on; if(txt) btn.textContent = txt; }
    dl.addEventListener('click', function(){
      var t0 = dl.textContent; busy(dl, true, T('Making picture…'));
      cardBlob(o).then(function(blob){ busy(dl, false, t0); if(blob) download(blob, file); }).catch(function(){ busy(dl, false, t0); msg.textContent = T("Couldn't make the picture"); });
    });
    sh.addEventListener('click', function(){
      var t0 = sh.textContent; busy(sh, true, T('Making picture…'));
      cardBlob(o).then(function(blob){
        busy(sh, false, t0); if(!blob) return;
        var text = (o.shareText || '') + (o.shareUrl ? ' ' + o.shareUrl : ''), f = null;
        try { f = new File([blob], file, { type:'image/png' }); } catch(e){}
        if(f && navigator.canShare && navigator.canShare({ files:[f] })){ navigator.share({ files:[f], text:text }).catch(function(){}); return; }
        // no file sharing here (most computers): copy the picture, else save it
        if(navigator.clipboard && window.ClipboardItem){
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function(){
            msg.textContent = T('✓ Picture copied — click the message box and press Ctrl+V (Cmd+V on Mac) to paste it');
          }, function(){ download(blob, file); msg.textContent = T('Picture saved — attach it to your post'); });
        } else { download(blob, file); msg.textContent = T('Picture saved — attach it to your post'); }
      }).catch(function(){ busy(sh, false, t0); msg.textContent = T("Couldn't make the picture"); });
    });
    var ov = overlay(c, o.title);
    if(o.reveal) play(m);
    return ov;
  }
  function download(blob, name){
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }

  /* ---------- picture export (1080x1350 PNG) ---------- */
  var dataCache = {};
  function toData(url){
    if(dataCache[url]) return dataCache[url];
    dataCache[url] = fetch(url).then(function(r){ if(!r.ok) throw 0; return r.blob(); }).then(function(b){
      return new Promise(function(res){ var fr = new FileReader(); fr.onload = function(){ res(fr.result); }; fr.onerror = function(){ res(''); }; fr.readAsDataURL(b); });
    }).catch(function(){ delete dataCache[url]; return ''; });
    return dataCache[url];
  }
  function loadImg(src){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
  function medalImage(metal){
    return toData(cfg.shipBase + SHIP[metal].img).then(function(href){
      var s = svg(metal, '', { noText:true, href: href || undefined });
      s.setAttribute('xmlns', NS); s.setAttribute('width', 560); s.setAttribute('height', 560);
      var str = new XMLSerializer().serializeToString(s);
      var u = URL.createObjectURL(new Blob([str], { type:'image/svg+xml' }));
      return loadImg(u).then(function(im){ setTimeout(function(){ URL.revokeObjectURL(u); }, 1000); return im; });
    });
  }
  function sp(ctx, px){ if('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
  function fitFont(ctx, text, weight, size, maxW, fam){
    var s = size;
    do { ctx.font = weight + ' ' + s + 'px ' + (fam || 'Orbitron, sans-serif'); s -= 2; } while(ctx.measureText(text).width > maxW && s > 14);
  }
  function cardBlob(o){
    var W = 1080, H = 1350, col = COL[o.metal], M = METALS[o.metal];
    var fonts = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 60px Orbitron'), document.fonts.load('500 30px Orbitron'), document.fonts.load('600 40px Rajdhani')]).catch(function(){}) : Promise.resolve();
    var gl = o.hex ? Promise.all(String(o.hex).toUpperCase().split('').map(function(ch){ return loadImg(cfg.glyph(ch)); })) : Promise.resolve([]);
    return Promise.all([fonts, gl, medalImage(o.metal)]).then(function(r){
      var glyphs = r[1], med = r[2], c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var bg = ctx.createRadialGradient(W * .3, 120, 40, W / 2, 500, 1100); bg.addColorStop(0, '#14243a'); bg.addColorStop(1, '#04070c');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var R = rnd(11); for(var i = 0; i < 220; i++){ ctx.fillStyle = 'rgba(255,255,255,' + (R() * .5 + .08) + ')'; var z = R() * 2.2 + .4; ctx.fillRect(R() * W, R() * H, z, z); }
      ctx.strokeStyle = 'rgba(0,229,255,.45)'; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(38, 100); ctx.lineTo(38, 38); ctx.lineTo(100, 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 38, H - 100); ctx.lineTo(W - 38, H - 38); ctx.lineTo(W - 100, H - 38); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      var y = 120;
      if(o.kick){ ctx.fillStyle = '#00e5ff'; sp(ctx, 7); fitFont(ctx, o.kick.toUpperCase(), 500, 30, W - 180); ctx.fillText(o.kick.toUpperCase(), W / 2, y); y += 66; }
      ctx.fillStyle = col; sp(ctx, 7); fitFont(ctx, (o.title || '').toUpperCase(), 700, 56, W - 180); ctx.fillText((o.title || '').toUpperCase(), W / 2, y);
      var ms = 560, my = y + 6;
      if(med) ctx.drawImage(med, (W - ms) / 2, my, ms, ms);
      if(o.label){ // ribbon text, canvas so it uses the real Orbitron
        ctx.fillStyle = M.ink; sp(ctx, 4); var k = ms / 560;
        fitFont(ctx, o.label, 700, Math.round(36 * k), 250 * k);
        ctx.fillText(o.label, W / 2, my + 412 * k);
      }
      y = my + ms * .79 + 96;
      if(o.big){ ctx.fillStyle = col; sp(ctx, 9); fitFont(ctx, o.big.toUpperCase(), 700, 80, W - 160); ctx.fillText(o.big.toUpperCase(), W / 2, y); y += 58; }
      if(o.sub){ ctx.fillStyle = '#8fb4bf'; sp(ctx, 5); fitFont(ctx, o.sub.toUpperCase(), 500, 28, W - 180); ctx.fillText(o.sub.toUpperCase(), W / 2, y); y += 30; }
      if(o.sys || o.hex){
        var lg = ctx.createLinearGradient(140, 0, W - 140, 0); lg.addColorStop(0, 'rgba(0,229,255,0)'); lg.addColorStop(.5, 'rgba(0,229,255,.6)'); lg.addColorStop(1, 'rgba(0,229,255,0)');
        ctx.fillStyle = lg; ctx.fillRect(140, y, W - 280, 2); y += 66;
        if(o.sys){ ctx.fillStyle = '#e8f4f8'; sp(ctx, 1); fitFont(ctx, o.sys, 600, 54, W - 180, 'Rajdhani, "Chakra Petch", sans-serif'); ctx.fillText(o.sys, W / 2, y); y += 44; }
        if(o.meta){ ctx.fillStyle = '#8fb4bf'; sp(ctx, 0); fitFont(ctx, o.meta, 500, 34, W - 180, 'Rajdhani, "Chakra Petch", sans-serif'); ctx.fillText(o.meta, W / 2, y); y += 24; }
        if(glyphs.length){
          var gs = 62, gap = 6, gw = 12 * gs + 11 * gap, gx = (W - gw) / 2;
          glyphs.forEach(function(im, j){ if(im) ctx.drawImage(im, gx + j * (gs + gap), y, gs, gs); });
          y += gs + 52;
          ctx.fillStyle = '#00e5ff'; sp(ctx, 9); ctx.font = '500 36px Orbitron, sans-serif'; ctx.fillText(String(o.hex).toUpperCase(), W / 2, y);
        }
      }
      ctx.fillStyle = '#00e5ff'; sp(ctx, 4); ctx.font = '500 30px Orbitron, sans-serif';
      ctx.fillText(String(o.shareUrl || cfg.mapUrl).replace(/^https?:\/\//, '').replace(/[/?].*$/, ''), W / 2, H - 78);
      return new Promise(function(res){ c.toBlob(res, 'image/png'); });
    });
  }

  /* ---------- who am I ---------- */
  function cookie(name){ var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function setCookie(name, val){
    var dom = /(^|\.)nomansskyhub\.app$/.test(location.hostname) ? '; domain=.nomansskyhub.app' : '';
    document.cookie = name + '=' + encodeURIComponent(val) + dom + '; path=/; max-age=63072000; samesite=lax' + (location.protocol === 'https:' ? '; secure' : '');
  }
  function me(){
    var n = '';
    try { if(typeof window.loadTravellerId === 'function') n = String(window.loadTravellerId().name || ''); } catch(e){}
    if(!n.trim()){ try { n = String((JSON.parse(cookie('nmsTraveller') || '{}') || {}).name || ''); } catch(e){} }
    return n.trim();
  }

  /* ---------- streak data ---------- */
  var LS = 'nms-streak', LSK = 'nms-streak-keys', LSP = 'nms-streak-pending';
  function ukDay(d){
    var p = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' }).format(d || new Date()).split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5);
  }
  function monOf(n){ return n - ((n + 3) % 7); }          // 1 Jan 1970 was a Thursday
  function monthOf(n){ return new Date(n * 864e5).toISOString().slice(0, 7); }
  function dayLabel(n){ var d = new Date(n * 864e5); try { return typeof window.NMS_DATE === 'function' ? window.NMS_DATE(d, { day:'numeric', month:'short', timeZone:'UTC' }) : d.toLocaleDateString(undefined, { day:'numeric', month:'short', timeZone:'UTC' }); } catch(e){ return d.toISOString().slice(0, 10); } }
  function blank(){ return { v:1, d:{}, e:{}, w:{}, m:{}, L:0, last:null }; }
  function pack(s){ // compact form for the cookie (keeps ~150 days of history)
    var keys = Object.keys(s.d).map(Number).sort(function(a, b){ return b - a; }).slice(0, 150);
    var o = { v:1, d: keys.map(function(k){ return k.toString(36) + (s.d[k] > 1 ? '.' + s.d[k] : ''); }).join(','), e:{}, w: Object.keys(s.w).map(function(k){ return (+k).toString(36); }).join(','), m: Object.keys(s.m).join(','), L: s.L };
    for(var k in s.e) o.e[k] = (+s.e[k]).toString(36);
    if(s.last) o.l = [s.last.g, s.last.a, String(s.last.n || '').slice(0, 40), s.last.day.toString(36)];
    return JSON.stringify(o);
  }
  function unpack(str){
    var s = blank(); if(!str) return s;
    try {
      var o = JSON.parse(str);
      if(o.d) String(o.d).split(',').forEach(function(t){ if(!t) return; var p = t.split('.'); s.d[parseInt(p[0], 36)] = p[1] ? +p[1] : 1; });
      if(o.w) String(o.w).split(',').forEach(function(t){ if(t) s.w[parseInt(t, 36)] = 1; });
      if(o.m) String(o.m).split(',').forEach(function(t){ if(t) s.m[t] = 1; });
      for(var k in (o.e || {})) s.e[k] = parseInt(o.e[k], 36);
      s.L = +o.L || 0;
      if(o.l) s.last = { g:+o.l[0], a:o.l[1], n:o.l[2], day:parseInt(o.l[3], 36) };
    } catch(e){}
    return s;
  }
  function merge(a, b){ // keep the most of both copies
    for(var k in b.d) a.d[k] = Math.max(a.d[k] || 0, b.d[k]);
    for(var e in b.e) a.e[e] = a.e[e] ? Math.min(a.e[e], b.e[e]) : b.e[e];
    for(var w in b.w) a.w[w] = 1; for(var m in b.m) a.m[m] = 1;
    a.L = Math.max(a.L, b.L);
    if(b.last && (!a.last || b.last.day > a.last.day)) a.last = b.last;
    return a;
  }
  function load(){
    var s = unpack(cookie('nms_streak'));
    try { merge(s, unpack(localStorage.getItem(LS))); } catch(e){}
    return s;
  }
  function save(s){
    var p = pack(s);
    setCookie('nms_streak', p);
    try { localStorage.setItem(LS, p); } catch(e){}
  }
  // days in a row ending at day t; 1 grace day per Mon-Sun week bridges a single missed day.
  // lead: day t itself may be the missed day (today isn't over / yesterday was the grace day).
  function runEnding(d, t, lead){
    var n = 0, grace = {};
    if(lead && !d[t]){ if(!d[t - 1]) return 0; grace[monOf(t)] = 1; t--; }
    while(true){
      if(d[t]){ n++; t--; continue; }
      var wk = monOf(t);
      if(n > 0 && !grace[wk] && d[t - 1]){ grace[wk] = 1; t--; continue; }
      return n;
    }
  }
  function stats(s){
    s = s || load();
    var today = ukDay(), d = s.d;
    // today isn't over yet, so a streak that ran to yesterday is still alive
    var cur = d[today] ? runEnding(d, today) : runEnding(d, today - 1, true);
    var longest = s.L;
    Object.keys(d).forEach(function(k){ longest = Math.max(longest, runEnding(d, +k)); });
    var mon = monOf(today), wk = 0; for(var i = 0; i < 7; i++) wk += d[mon + i] || 0;
    var mo = monthOf(today), mc = 0; Object.keys(d).forEach(function(k){ if(monthOf(+k) === mo) mc += d[k]; });
    var nextT = null; TARGETS.daily.forEach(function(t){ if(nextT === null && !s.e['d' + t]) nextT = t; });
    return { cur:cur, longest:longest, week:wk, month:mc, today:today, doneToday: !!d[today], next:nextT,
             weeks: Object.keys(s.w).length, months: Object.keys(s.m).length, earned:s.e, last:s.last, any: Object.keys(d).length > 0 };
  }

  /* ---------- "Total unlocked" (anonymous counts, map function medal-count) ----------
     Sent only at the moment a medal is earned: just which medal ("d7"), nothing else. */
  function medalId(m){ return m.kind === 'day' ? 'd' + m.n : m.kind; }
  var countsP = null;
  function counts(){
    if(!countsP) countsP = fetch(cfg.countUrl, { cache:'no-store' }).then(function(r){ return r.json(); })
      .then(function(j){ return j && j.ok ? j.counts : null; }).catch(function(){ return null; });
    return countsP;
  }
  function sendEarned(got){
    got.forEach(function(m){
      try { fetch(cfg.countUrl, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ m: medalId(m) }), keepalive:true })
        .then(function(r){ return r.json(); }).then(function(j){ if(j && j.ok && j.counts) countsP = Promise.resolve(j.counts); }).catch(function(){}); } catch(e){}
    });
  }
  // fills el with "Unlocked by N travellers" once the counts arrive; stays hidden if 0 / offline
  function countLine(el, m, short){
    el.hidden = true;
    counts().then(function(c){
      var n = c && c[medalId(m)];
      if(!n) return;
      el.textContent = '🏅 ' + (short ? T('{n} unlocked', { n:n }) : m.kind === 'day' ? T(n === 1 ? 'Unlocked by {n} traveller so far' : 'Unlocked by {n} travellers so far', { n:n }) : T(n === 1 ? 'Unlocked {n} time so far' : 'Unlocked {n} times so far', { n:n }));
      el.hidden = false;
    });
  }

  /* record one confirmed new system; returns the medals it earned */
  function record(info){
    var s = load(), today = ukDay(), got = [];
    s.d[today] = (s.d[today] || 0) + 1;
    s.last = { g:+info.galaxy || 0, a:String(info.address).toUpperCase(), n:String(info.name || ''), day:today };
    var st = stats(s);
    TARGETS.daily.forEach(function(t){ if(st.cur >= t && !s.e['d' + t]){ s.e['d' + t] = today; got.push({ kind:'day', n:t, metal:DAILY[t] }); } });
    var mon = monOf(today); if(st.week >= TARGETS.week && !s.w[mon]){ s.w[mon] = 1; got.push({ kind:'week', metal:'silver' }); }
    var mo = monthOf(today); if(st.month >= TARGETS.month && !s.m[mo]){ s.m[mo] = 1; got.push({ kind:'month', metal:'gold' }); }
    s.L = Math.max(s.L, st.cur);
    save(s);
    if(got.length && !info.noCount) sendEarned(got);
    return { got:got, st:stats(s), s:s };
  }

  /* map: a PUBLIC save of a system nobody had charted before */
  function counted(){ try { return JSON.parse(localStorage.getItem(LSK) || '{}') || {}; } catch(e){ return {}; } }
  function sysKey(g, a){ a = String(a).toUpperCase(); return (+g || 0) + ':0' + a.slice(1); }
  function pend(op, info){
    var p = []; try { p = JSON.parse(localStorage.getItem(LSP) || '[]') || []; } catch(e){}
    if(op === 'add'){ if(!p.some(function(x){ return sysKey(x.galaxy, x.address) === sysKey(info.galaxy, info.address); })) p.push({ galaxy:info.galaxy, address:info.address, name:info.name, at:Date.now() }); }
    else if(op === 'del') p = p.filter(function(x){ return sysKey(x.galaxy, x.address) !== sysKey(info.galaxy, info.address); });
    p = p.filter(function(x){ return Date.now() - x.at < 2 * 864e5; }); // a check that never got through goes after 2 days
    try { localStorage.setItem(LSP, JSON.stringify(p)); } catch(e){}
    return p;
  }
  function charted(info, quiet){
    if(!info || !/^[0-9A-Fa-f]{12}$/.test(String(info.address || ''))) return;
    var key = sysKey(info.galaxy, info.address), done = counted();
    if(done[key]) return;
    if(info.editor) setCookie('nms_me', String(info.editor).slice(0, 40));
    fetch('/.netlify/functions/almanac?exists=1&galaxy=' + (+info.galaxy || 0) + '&addr=' + String(info.address).toUpperCase())
      .then(function(r){ return r.json(); }).then(function(j){
        if(!j || !j.ok){ pend('add', info); return; }            // busy / unreachable: try again later
        pend('del', info);
        if(!j.found){ if(!quiet) toast(T("Not counted for your streak — NMS Almanac can't find this system yet"), 5000); return; }
        done = counted(); if(done[key]) return;
        done[key] = ukDay(); try { localStorage.setItem(LSK, JSON.stringify(done)); } catch(e){}
        var r = record(info);
        if(r.got.length){ queue = queue.concat(r.got.map(function(g){ return [g, r.st]; })); if(!openOv) setTimeout(nextQueued, quiet ? 0 : 900); }
        else if(!quiet) toast(streakLine(r.st), 4500);
      }).catch(function(){ pend('add', info); });
  }
  var queue = []; // several medals at once (3 days + weekly): one card after another
  function nextQueued(){ var q = queue.shift(); if(q) earnedCard(q[0], q[1]); }
  function retryPending(){ pend('').forEach(function(x){ charted(x, true); }); }
  function streakLine(st){
    var t = '🔥 ' + T(st.cur === 1 ? 'Streak: {n} day' : 'Streak: {n} days', { n: st.cur });
    if(st.next) t += ' · ' + T('next medal at {n} days', { n: st.next });
    return t;
  }

  /* ---------- streak medal cards ---------- */
  function lastSys(st){ return st.last ? { sys: st.last.n || T('Unnamed system'), hex: st.last.a, meta: gal(st.last.g) + (me() ? ' · ' + T('Charted by {name}', { name: me() }) : '') } : {}; }
  function gal(g){ var G = window.GALAXIES; return (G && G[g]) || (g === 0 ? 'Euclid' : T('Galaxy {n}', { n: g + 1 })); }
  function earnedCard(m, st, demo){
    st = st || stats();
    var o = { metal:m.metal, reveal:true, kick:'◈ ' + T('Milestone reached'), lab:T('System that kept it going'), file:'nms-streak-medal',
              shareUrl: cfg.mapUrl, wide:{ label:'🔥 ' + T('View streak'), run: panel } };
    var ls = lastSys(st); o.sys = ls.sys; o.hex = ls.hex; o.meta = ls.meta;
    if(m.kind === 'day'){
      o.title = T('Daily discovery'); o.label = T('{n} DAYS', { n:m.n }); o.big = T('{n} DAYS', { n:m.n }); o.sub = T('In a row');
      var nx = null; TARGETS.daily.forEach(function(t){ if(nx === null && t > m.n) nx = t; });
      o.next = nx ? T('Next medal: {n} days · {left} to go', { n:nx, left: nx - st.cur }) : T('Top daily medal — keep the streak going!');
      o.shareText = '🔥 {n}-day discovery streak on the NMS Galactic Map!'.replace('{n}', m.n); // share messages stay English, like X / Reddit
    } else if(m.kind === 'week'){
      o.title = T('Weekly surveyor'); o.label = T('WEEKLY'); o.big = T('{n} SYSTEMS', { n: Math.max(st.week, TARGETS.week) }); o.sub = T('This week');
      o.next = T('A new week starts every Monday (UK)');
      o.shareText = '🏅 {n} new systems charted this week on the NMS Galactic Map!'.replace('{n}', Math.max(st.week, TARGETS.week)); // share messages stay English, like X / Reddit
    } else {
      o.title = T('Monthly surveyor'); o.label = T('MONTHLY'); o.big = T('{n} SYSTEMS', { n: Math.max(st.month, TARGETS.month) }); o.sub = T('This month');
      o.next = T('A new month, a new medal to earn');
      o.shareText = '🏅 {n} new systems charted this month on the NMS Galactic Map!'.replace('{n}', Math.max(st.month, TARGETS.month)); // share messages stay English, like X / Reddit
    }
    o.countFor = m;
    if(demo){ o.kick += ' · ' + T('Example'); }
    return card(o);
  }

  /* ---------- View Streak panel ---------- */
  function statBox(n, l, color, frac){
    var b = hel('div', 'nmsm-st'), nn = hel('div', 'n', n); if(color) nn.style.color = color; b.appendChild(nn); b.appendChild(hel('div', 'l', l));
    if(frac != null){ var bar = hel('div', 'nmsm-bar'), i = hel('i'); i.style.width = Math.min(100, Math.round(frac * 100)) + '%'; i.style.background = color || '#00e5ff'; bar.appendChild(i); b.appendChild(bar); }
    return b;
  }
  function medalTile(metal, label, earned, sub, frac, isNext){
    var t = hel('div', 'nmsm-m' + (earned ? '' : ' locked') + (isNext ? ' nextm' : ''));
    t.appendChild(svg(metal, earned ? label : '', { locked: !earned }));
    var dd = hel('div', 'd', label); if(earned) dd.style.color = COL[metal]; t.appendChild(dd);
    t.appendChild(hel('div', 's', sub));
    if(arguments[6]){ var cl = hel('div', 'c'); t.appendChild(cl); countLine(cl, arguments[6], true); }
    if(frac != null){ var bar = hel('div', 'nmsm-bar'), i = hel('i'); i.style.width = Math.min(100, Math.round(frac * 100)) + '%'; i.style.background = '#f2b84b'; bar.appendChild(i); t.appendChild(bar); }
    if(earned) t.style.cursor = 'pointer';
    return t;
  }
  function panel(){
    var s = load(), st = stats(s), today = ukDay();
    var c = hel('div', 'nmsm-card nmsm-panel');
    var ph = hel('div', 'nmsm-ph');
    var back = hel('button', 'nmsm-back', '◂ ' + T('Back')); back.type = 'button'; back.addEventListener('click', closeOv); ph.appendChild(back);
    var ti = hel('p', 'nmsm-title', T('Your streak')); ph.appendChild(ti); c.appendChild(ph);
    var g = hel('div', 'nmsm-stats');
    g.appendChild(statBox(String(st.cur), T('Days in a row'), st.cur ? '#d08a52' : null));
    g.appendChild(statBox(String(st.longest), T('Longest streak')));
    g.appendChild(statBox(Math.min(st.week, TARGETS.week) + '/' + TARGETS.week, T('This week'), '#c9d6df', st.week / TARGETS.week));
    g.appendChild(statBox(Math.min(st.month, TARGETS.month) + '/' + TARGETS.month, T('This month'), '#f2b84b', st.month / TARGETS.month));
    c.appendChild(g);
    c.appendChild(hel('div', 'nmsm-lab', T('Daily medals'))).style.cssText = 'text-align:left;margin-bottom:8px';
    var ms = hel('div', 'nmsm-ms'), nextDone = false;
    TARGETS.daily.forEach(function(t){
      var e = s.e['d' + t], isNext = !e && !nextDone; if(isNext) nextDone = true;
      var sub = e ? (e === today ? T('Earned today') : T('Earned {date}', { date: dayLabel(e) })) : isNext ? T('{a}/{b} days', { a: Math.min(st.cur, t), b: t }) : T('Locked');
      var tile = medalTile(DAILY[t], T('{n} DAYS', { n:t }), !!e, sub, isNext ? st.cur / t : null, isNext, { kind:'day', n:t });
      if(e) tile.addEventListener('click', function(){ earnedCard({ kind:'day', n:t, metal:DAILY[t] }, st).querySelector('.nmsm-svg').classList.add('done'); });
      ms.appendChild(tile);
    });
    c.appendChild(ms);
    var ew = st.weeks + st.months;
    var more = hel('button', 'nmsm-more'); more.type = 'button'; more.setAttribute('aria-expanded', 'false');
    var box = hel('div', 'nmsm-ms nmsm-ms2'); box.hidden = true;
    var wt = medalTile('silver', T('WEEKLY'), st.weeks > 0, st.weeks ? T('Earned {n}×', { n: st.weeks }) : T('{a}/{b} this week', { a: Math.min(st.week, TARGETS.week), b: TARGETS.week }), st.weeks ? null : st.week / TARGETS.week, false, { kind:'week' });
    var mt = medalTile('gold', T('MONTHLY'), st.months > 0, st.months ? T('Earned {n}×', { n: st.months }) : T('{a}/{b} this month', { a: Math.min(st.month, TARGETS.month), b: TARGETS.month }), st.months ? null : st.month / TARGETS.month, false, { kind:'month' });
    if(st.weeks) wt.addEventListener('click', function(){ earnedCard({ kind:'week', metal:'silver' }, st).querySelector('.nmsm-svg').classList.add('done'); });
    if(st.months) mt.addEventListener('click', function(){ earnedCard({ kind:'month', metal:'gold' }, st).querySelector('.nmsm-svg').classList.add('done'); });
    box.appendChild(wt); box.appendChild(mt);
    function lbl(open){ more.textContent = (open ? '▴ ' : '▾ ') + T(open ? 'Hide weekly + monthly medals' : 'Show weekly + monthly medals ({n} earned)', { n: ew }); }
    lbl(false);
    more.addEventListener('click', function(){ box.hidden = !box.hidden; more.setAttribute('aria-expanded', box.hidden ? 'false' : 'true'); lbl(!box.hidden); });
    c.appendChild(more); c.appendChild(box);
    var tip = st.doneToday ? T('✓ Today counted. Come back tomorrow to keep it going.') : T('Chart a NEW system on the Galactic Map today to keep it going.');
    c.appendChild(hel('p', 'nmsm-next', tip)).style.textAlign = 'center';
    c.appendChild(hel('p', 'nmsm-rules', T('Only new systems the NMS Almanac confirms count · 1 grace day a week · saved on this device')));
    if(C.panelExtra) try { C.panelExtra(c); } catch(e){}
    return overlay(c, T('Your streak'));
  }

  /* ---------- rank medals (Trending / Top surveyors) ---------- */
  var RANK = ['gold', 'silver', 'bronze'];
  function rankMetal(r){ return RANK[r - 1] || null; }
  function mini(r){ var w = hel('span', 'nmsm-mini'); css(); w.appendChild(svg(rankMetal(r), '#' + r)); w.setAttribute('aria-label', '#' + r); return w; }

  window.NMSMedals = {
    svg: function(metal, label, o){ css(); return svg(metal, label, o); },
    play: play, card: function(o){ return card(o); }, cardBlob: cardBlob, close: closeOv,
    charted: charted, record: record, stats: function(){ return stats(); }, panel: panel,
    streakLine: streakLine, earnedCard: earnedCard, me: me, mini: mini, rankMetal: rankMetal,
    ukDay: ukDay, TARGETS: TARGETS, config: cfg, _unpack: unpack, _pack: pack, _runEnding: runEnding
  };

  function boot(){
    css();
    var n = me(); if(n) setCookie('nms_me', n.slice(0, 40));
    if(/(^|\.)map\.nomansskyhub\.app$|^localhost$|^127\./.test(location.hostname) || C.counts) setTimeout(retryPending, 4000);
    var q = /[?&]medaldemo=(bronze|silver|gold|week|month)\b/.exec(location.search);
    if(q) setTimeout(function(){
      var k = q[1], st = stats(); st = { cur: k === 'bronze' ? 7 : k === 'silver' ? 14 : 30, week:3, month:10, longest:30, next:null,
        last:{ g:0, a:'1058E1434753', n:'Sranch Op10079', day:ukDay() } };
      earnedCard(k === 'week' ? { kind:'week', metal:'silver' } : k === 'month' ? { kind:'month', metal:'gold' } : { kind:'day', n: st.cur, metal: k }, st, true);
    }, 1500);
    if(/[?&]streak=1\b/.test(location.search)) setTimeout(panel, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
