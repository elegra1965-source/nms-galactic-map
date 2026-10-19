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
  window.loadTrending = load;
  load();
  setInterval(function(){ if(!document.hidden) load(); }, 300000);
})();
