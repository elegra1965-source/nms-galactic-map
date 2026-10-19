/* ============================================================
   "🔥 Trending this week" (2026-10-19, Tony) -- see
   netlify/functions/trending.mjs for the counting rules.

   1. Counts a view when someone opens a PUBLIC charted system's info
      panel: once per device per system per day, never for private
      systems, never for a system the traveller charted themselves.
      Views are batched and sent every 20 s (or when the tab is hidden).
   2. "🔥 Trending ›" link beside the Recently charted counter opens a
      top-10 list: medals for the top 3, rank arrows, views, glyphs + hex,
      and "Last week's #1". Tap a row to fly there.
   3. A top-3 system shows "🥇 #1 Trending this week" in its info panel.
   ============================================================ */
(function(){
  var URL_T = "/.netlify/functions/trending";
  var SEEN_K = "nms-trend-seen";
  var MEDAL = ["🥇", "🥈", "🥉"];
  var line = document.getElementById("trendLine");
  var pop = document.getElementById("trendPop");
  var list = document.getElementById("trendList");
  var queue = [];
  var T = { top: [], lastWeek: null, rank: {}, mode: "week" };
  window.TRENDING = T;

  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function plain(s){ var t = document.createElement("textarea"); t.innerHTML = String(s || ""); return t.value; }
  function today(){ return new Date().toISOString().slice(0, 10); }
  function gal(g){ return (window.GALAXIES && GALAXIES[g]) || ("Galaxy " + (g + 1)); }

  /* ---------- 1. counting ---------- */
  function myName(){
    try { return (typeof loadTravellerId === "function" ? String(loadTravellerId().name || "") : "").trim().toLowerCase(); } catch(e){ return ""; }
  }
  function noteView(s){
    if(!s || !s.override || s.privateOnly || !s.address) return;
    var key = s.galaxy + ":" + s.address, mine = myName();
    var rec = (window.OVERRIDES && OVERRIDES.systems && OVERRIDES.systems[key]) || null;
    var editor = rec && rec.data ? String(rec.data.editorName || "").trim().toLowerCase() : "";
    if(mine && editor && mine === editor) return;
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_K) || "{}") || {}; } catch(e){}
    var d = today();
    for(var k in seen) if(seen[k] !== d) delete seen[k]; // keep only today's
    if(seen[key] === d) return;
    seen[key] = d;
    try { localStorage.setItem(SEEN_K, JSON.stringify(seen)); } catch(e){}
    if(queue.indexOf(key) < 0) queue.push(key);
  }
  function flush(useBeacon){
    if(!queue.length) return;
    var body = JSON.stringify({ views: queue.splice(0, 20) });
    if(useBeacon && navigator.sendBeacon){ try { navigator.sendBeacon(URL_T, body); return; } catch(e){} }
    fetch(URL_T, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function(){});
  }
  setInterval(function(){ flush(false); }, 20000);
  document.addEventListener("visibilitychange", function(){ if(document.hidden) flush(true); });
  window.addEventListener("pagehide", function(){ flush(true); });

  /* ---------- 3. panel badge ---------- */
  function badge(s){
    var b = document.getElementById("trendBadge");
    var name = document.getElementById("pName");
    if(!name) return;
    if(!b){ b = el("div"); b.id = "trendBadge"; name.parentNode.insertBefore(b, name.nextSibling); }
    var r = s && !s.privateOnly ? T.rank[s.galaxy + ":" + s.address] : 0;
    if(r && r <= 3){ b.textContent = MEDAL[r - 1] + " #" + r + (T.mode === "last" ? " last week" : " Most viewed this week"); b.hidden = false; }
    else { b.textContent = ""; b.hidden = true; }
  }

  // updatePanel() is a global function in preview.js; wrap it so every
  // panel open both counts the view and refreshes the badge.
  if(typeof window.updatePanel === "function"){
    var orig = window.updatePanel;
    window.updatePanel = function(s){
      var r = orig.apply(this, arguments);
      try { noteView(s); badge(s); } catch(e){}
      return r;
    };
  }

  /* ---------- 2. leaderboard ---------- */
  function moveEl(m){
    if(m === "new") return el("span", "trMove new", "NEW");
    if(m > 0) return el("span", "trMove up", "▲" + m);
    if(m < 0) return el("span", "trMove dn", "▼" + (-m));
    return el("span", "trMove", "–");
  }
  function glyphs(addr){
    var gl = el("div", "searchResMeta chartedGlyphs");
    addr.split("").forEach(function(ch){
      var im = el("img"); im.alt = ch; im.src = (typeof glyphSrc === "function" ? glyphSrc(ch) : "glyphs/glyph-mask-" + ch + ".png");
      gl.appendChild(im);
    });
    gl.appendChild(document.createTextNode(" " + addr));
    return gl;
  }
  function row(x){
    var r = el("button", "searchRes chartedRow trRow");
    r.type = "button";
    r.setAttribute("data-addr", x.address); r.setAttribute("data-galaxy", String(x.galaxy));
    var top = el("div", "trTop");
    top.appendChild(el("span", "trPos" + (x.rank <= 3 ? " medal" : ""), x.rank <= 3 ? MEDAL[x.rank - 1] : "#" + x.rank));
    top.appendChild(el("span", "searchResName trName", plain(x.name) || "Unnamed system"));
    if(T.mode !== "last") top.appendChild(moveEl(x.move));
    r.appendChild(top);
    r.appendChild(el("div", "searchResMeta", (x.editor ? "by " + plain(x.editor) + " · " : "") + gal(x.galaxy) + " · " + x.views + (x.views === 1 ? " view" : " views")));
    r.appendChild(glyphs(x.address));
    return r;
  }
  function fill(){
    var kick = document.getElementById("trendKick"), sub = document.getElementById("trendSub");
    if(kick) kick.textContent = T.mode === "last" ? "\uD83D\uDD25 Last week's final standings" : "\uD83D\uDD25 Trending this week";
    if(sub) sub.textContent = T.mode === "last"
      ? "A new week has started. These were last week's winners until this week's list fills up. Tap one to fly there."
      : "The charted systems travellers opened most this week. Resets every Monday at midnight (UK). Tap one to fly there.";
    list.textContent = "";
    if(!T.top.length) list.appendChild(el("div", "searchEmpty", "Nothing trending yet this week. Open some charted systems and check back!"));
    T.top.forEach(function(x){ list.appendChild(row(x)); });
    if(T.lastWeek && T.mode !== "last"){
      var lw = el("div", "trLast");
      lw.appendChild(el("span", null, "Last week's 🥇 #1: "));
      var b = el("button", "trLastBtn", plain(T.lastWeek.name) || "Unnamed system");
      b.type = "button"; b.className += " chartedRow";
      b.setAttribute("data-addr", T.lastWeek.address); b.setAttribute("data-galaxy", String(T.lastWeek.galaxy));
      lw.appendChild(b);
      lw.appendChild(el("span", null, " · " + gal(T.lastWeek.galaxy)));
      list.appendChild(lw);
    }
  }
  function load(){
    fetch(URL_T, { cache: "no-store" }).then(function(r){ return r.json(); }).then(function(j){
      if(!j || !j.ok) return;
      T.mode = j.mode || "week";
      T.top = j.show || j.top || []; T.lastWeek = j.lastWeek || null; T.rank = {};
      T.top.forEach(function(x){ T.rank[x.key] = x.rank; });
      T.week = j.week || ""; T.thisWeek = j.top || []; T.lastWeekTop = j.lastWeekTop || [];
      try { checkMyRank(); } catch(e){}
      if(line) line.hidden = !(T.top.length || T.lastWeek);
      if(pop && pop.classList.contains("show")) fill();
      if(window.selected) badge(window.selected);
    }).catch(function(){});
  }

  if(line && pop && list){
    function position(){
      var r = line.getBoundingClientRect(), pw = pop.offsetWidth || 300;
      pop.style.left = Math.min(window.innerWidth - pw - 8, Math.max(8, r.left)) + "px";
      pop.style.right = "auto"; pop.style.top = (r.bottom + 8) + "px";
      if(typeof clampPopoverTop === "function") clampPopoverTop(pop);
    }
    function open(){
      if(typeof window.closeFavPop === "function") window.closeFavPop();
      var cp = document.getElementById("chartedPop"); if(cp) cp.classList.remove("show");
      fill(); pop.classList.add("show"); line.setAttribute("aria-expanded", "true"); position();
      pop.classList.toggle("scroll", pop.scrollHeight > pop.clientHeight + 3);
    }
    function close(){ pop.classList.remove("show"); line.setAttribute("aria-expanded", "false"); }
    line.addEventListener("click", function(e){ e.stopPropagation(); pop.classList.contains("show") ? close() : open(); });
    document.addEventListener("click", function(e){ if(pop.classList.contains("show") && !pop.contains(e.target) && e.target !== line) close(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && pop.classList.contains("show")){ close(); line.focus(); } });
    window.addEventListener("resize", function(){ if(pop.classList.contains("show")) position(); });
    // Same jump as Recently charted / Favourites.
    list.addEventListener("click", function(e){
      var r = e.target.closest ? e.target.closest(".chartedRow") : null;
      if(!r) return;
      var addr = r.getAttribute("data-addr"), g = parseInt(r.getAttribute("data-galaxy"), 10);
      close();
      if(!isNaN(g) && g !== GALAXY){
        switchGalaxy(g);
        document.getElementById("galSel").value = String(g);
        if(typeof syncGalaxyPickInput === "function") syncGalaxyPickInput();
        toast("Switched to " + GALAXIES[g] + " -- that's where this system is", 3200);
      }
      document.getElementById("inAddr").value = addr;
      if(typeof setKeypad === "function") setKeypad(addr);
      if(jumpTo(addr) && typeof playWarpTransition === "function") playWarpTransition("portal");
    });
    if(/[?&]trending=1\b/.test(location.search)){
      var tries = 0;
      (function openWhenClear(){
        var wrap = document.getElementById("modalWrap");
        if((wrap && wrap.classList.contains("show")) || (!T.top.length && tries++ < 15)){ setTimeout(openWhenClear, 700); return; }
        open();
      })();
    }
  }

  /* ---------- 4. "You're #1" popup + share picture (2026-10-19, Tony) ----------
     Shown once (per week, per rank) to whoever charted a top-3 system, when they
     open the map. "Whoever charted it" = the system's editor name matches the
     traveller name saved on this device (the "Your name" from Edit system), so
     it needs no login and stores nothing new. A popup, not another tile. */
  var RANK_SEEN_K = "nms-rank-seen";
  function rankSeen(){ try { return JSON.parse(localStorage.getItem(RANK_SEEN_K) || "{}") || {}; } catch(e){ return {}; } }
  function mapLink(x){ return "https://map.nomansskyhub.app/?arrival=1&galaxy=" + x.galaxy + "&addr=" + x.address; }
  function mine(x){ var n = myName(); return !!n && plain(x.editor || "").trim().toLowerCase() === n; }
  function checkMyRank(){
    if(!myName() || document.getElementById("rankPop")) return;
    var seen = rankSeen(), pick = null;
    (T.thisWeek || []).forEach(function(x){
      if(!pick && x.rank <= 3 && mine(x) && T.mode === "week" && !seen[T.week + ":" + x.key + ":" + x.rank]) pick = { x: x, last: false, id: T.week + ":" + x.key + ":" + x.rank };
    });
    (T.lastWeekTop || []).forEach(function(x){
      if(!pick && x.rank <= 3 && mine(x) && !seen["last:" + T.week + ":" + x.key]) pick = { x: x, last: true, id: "last:" + T.week + ":" + x.key };
    });
    if(!pick) return;
    var tries = 0;
    (function whenClear(){
      var wrap = document.getElementById("modalWrap");
      var tour = (typeof tourActive !== "undefined" && tourActive);
      if(((wrap && wrap.classList.contains("show")) || tour) && tries++ < 40){ setTimeout(whenClear, 1500); return; }
      showRankPop(pick);
    })();
  }
  function showRankPop(pick){
    var x = pick.x, name = plain(x.name) || "Your system";
    var seen = rankSeen(); seen[pick.id] = 1;
    for(var k in seen) if(k.indexOf(T.week) < 0) delete seen[k];
    try { localStorage.setItem(RANK_SEEN_K, JSON.stringify(seen)); } catch(e){}
    var pop = el("div"); pop.id = "rankPop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Your system's rank");
    pop.appendChild(el("div", "rpKick", MEDAL[x.rank - 1] + (pick.last ? " You finished #" + x.rank + " last week" : " You're #" + x.rank + " this week")));
    pop.appendChild(el("div", "rpName", name));
    var moveTxt = (!pick.last && typeof x.move === "number" && x.move > 0) ? " · up " + x.move + (x.move === 1 ? " place" : " places") : "";
    pop.appendChild(el("div", "rpSub", "Most viewed charted systems · " + gal(x.galaxy) + " · " + x.views + (x.views === 1 ? " view" : " views") + moveTxt));
    pop.appendChild(glyphs(x.address));
    var row = el("div", "rpBtns");
    var bShare = el("button", "rpBtn gold", "Share my rank"); bShare.type = "button";
    var bFly = el("button", "rpBtn", "Fly there"); bFly.type = "button";
    var bX = el("button", "rpBtn x", "✕"); bX.type = "button"; bX.setAttribute("aria-label", "Close");
    row.appendChild(bShare); row.appendChild(bFly); row.appendChild(bX);
    pop.appendChild(row);
    pop.appendChild(el("div", "rpNote", "This shows on devices where you've used the same name in Edit system's \"Your name\" box. Charted on another phone or PC, or cleared your browser? Enter that name once in Edit system here. Sign-in with your Traveller ID may come later."));
    document.body.appendChild(pop);
    function close(){ if(pop.parentNode) pop.parentNode.removeChild(pop); document.removeEventListener("keydown", esc); }
    function esc(e){ if(e.key === "Escape") close(); }
    document.addEventListener("keydown", esc);
    bX.addEventListener("click", close);
    bFly.addEventListener("click", function(){
      close();
      if(x.galaxy !== GALAXY && typeof switchGalaxy === "function"){ switchGalaxy(x.galaxy); document.getElementById("galSel").value = String(x.galaxy); if(typeof syncGalaxyPickInput === "function") syncGalaxyPickInput(); }
      document.getElementById("inAddr").value = x.address;
      if(typeof setKeypad === "function") setKeypad(x.address);
      if(jumpTo(x.address) && typeof playWarpTransition === "function") playWarpTransition("portal");
    });
    bShare.addEventListener("click", function(){ shareRank(x, pick.last, bShare); });
  }
  function loadImg(src){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
  function wrapText(ctx, text, maxW){
    var words = text.split(" "), lines = [], cur = "";
    words.forEach(function(w){ var t = cur ? cur + " " + w : w; if(ctx.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
    if(cur) lines.push(cur); return lines.slice(0, 3);
  }
  function shareRank(x, last, btn){
    var name = plain(x.name) || "Unnamed system", W = 1080, H = 1350;
    btn.disabled = true; btn.textContent = "Making picture…";
    var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load("500 60px Orbitron"), document.fonts.load("400 40px Orbitron")]).catch(function(){}) : Promise.resolve();
    var imgs = Promise.all(x.address.split("").map(function(ch){ return loadImg(typeof glyphSrc === "function" ? glyphSrc(ch) : "glyphs/glyph-mask-" + ch + ".png"); }));
    Promise.all([fontsReady, imgs]).then(function(r){
      var gl = r[1], c = document.createElement("canvas"); c.width = W; c.height = H;
      var ctx = c.getContext("2d");
      var bg = ctx.createRadialGradient(W / 2, 420, 60, W / 2, 600, 900);
      bg.addColorStop(0, "#14243a"); bg.addColorStop(1, "#04070c");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for(var i = 0; i < 260; i++){ ctx.fillStyle = "rgba(255,255,255," + (Math.random() * 0.6 + 0.1) + ")"; var sz = Math.random() * 2.2 + 0.4; ctx.fillRect(Math.random() * W, Math.random() * H, sz, sz); }
      ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 3; ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff"; ctx.font = "160px serif"; ctx.fillText(MEDAL[x.rank - 1], W / 2, 290);
      ctx.fillStyle = "#f2b84b"; ctx.font = "500 150px Orbitron, sans-serif";
      if("letterSpacing" in ctx) ctx.letterSpacing = "15px";   // keep "#1" from reading as "N" (Orbitron rule)
      ctx.fillText("#" + x.rank, W / 2, 470);
      ctx.font = "400 40px Orbitron, sans-serif"; if("letterSpacing" in ctx) ctx.letterSpacing = "6px";
      ctx.fillText(last ? "MOST VIEWED LAST WEEK" : "MOST VIEWED THIS WEEK", W / 2, 545);
      ctx.fillStyle = "#e8f4f8"; ctx.font = "500 56px Orbitron, sans-serif"; if("letterSpacing" in ctx) ctx.letterSpacing = "3px";
      var lines = wrapText(ctx, name, W - 180), y = 680;
      lines.forEach(function(l){ ctx.fillText(l, W / 2, y); y += 70; });
      ctx.fillStyle = "#8fb4bf"; ctx.font = "400 34px Orbitron, sans-serif"; if("letterSpacing" in ctx) ctx.letterSpacing = "2px";
      ctx.fillText(gal(x.galaxy) + (x.editor ? " · Charted by " + plain(x.editor) : ""), W / 2, y + 20);
      var gs = 66, gap = 6, gw = 12 * gs + 11 * gap, gx = (W - gw) / 2, gy = y + 80;
      gl.forEach(function(im, k){ if(im) ctx.drawImage(im, gx + k * (gs + gap), gy, gs, gs); });
      ctx.fillStyle = "#e8f4f8"; ctx.font = "400 40px Orbitron, sans-serif"; if("letterSpacing" in ctx) ctx.letterSpacing = "8px";
      ctx.fillText(x.address.toUpperCase(), W / 2, gy + gs + 64);
      ctx.fillStyle = "#00e5ff"; ctx.font = "400 36px Orbitron, sans-serif"; if("letterSpacing" in ctx) ctx.letterSpacing = "4px";
      ctx.fillText("map.nomansskyhub.app", W / 2, H - 110);
      return new Promise(function(res){ c.toBlob(res, "image/png"); });
    }).then(function(blob){
      btn.disabled = false; btn.textContent = "Share my rank";
      if(!blob) return;
      var text = MEDAL[x.rank - 1] + " " + name + " is #" + x.rank + " most viewed on the NMS Galactic Map " + (last ? "last week" : "this week") + "! Portal: " + x.address.toUpperCase();
      var url = mapLink(x), file = null;
      try { file = new File([blob], "nms-rank-" + x.address + ".png", { type: "image/png" }); } catch(e){}
      if(file && navigator.canShare && navigator.canShare({ files: [file] })){
        navigator.share({ files: [file], title: "NMS Galactic Map", text: text + " " + url }).catch(function(){});
        return;
      }
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nms-rank-" + x.address + ".png";
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      try { navigator.clipboard.writeText(text + " " + url); if(typeof toast === "function") toast("Picture saved and link copied -- paste it with the picture", 4000); } catch(e){}
    }).catch(function(){ btn.disabled = false; btn.textContent = "Share my rank"; });
  }
  // Demo / screenshot hook: ?rankdemo=1 (or 2, 3) shows the popup with sample data.
  window.showMyRankTest = function(x){
    if(typeof x !== "object" || !x) x = { rank: x || 1, name: "Example System", galaxy: GALAXY, address: "105200000000", views: 42, move: 2, editor: myName() || "Traveller", key: "demo" };
    showRankPop({ x: x, last: false, id: "demo" });
  };
  var demoM = /[?&]rankdemo=([123])\b/.exec(location.search);
  if(demoM){
    var dTries = 0;
    (function demoWhenClear(){
      var wrap = document.getElementById("modalWrap");
      if(((wrap && wrap.classList.contains("show")) || (typeof tourActive !== "undefined" && tourActive)) && dTries++ < 40){ setTimeout(demoWhenClear, 1000); return; }
      window.showMyRankTest(+demoM[1]);
    })();
  }
  window.loadTrending = load;
  load();
  setInterval(function(){ if(!document.hidden) load(); }, 300000);
})();
