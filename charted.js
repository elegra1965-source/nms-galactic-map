/* ============================================================
   "Recently charted" (2026-10-17, Tony): a small counter beside
   Show controls ("◈ 9 charted today ›") and a popover listing the
   systems travellers have documented in the last 7 days, so visitors
   can find other people's systems, not just their own.

   Works only from data the map already loads (OVERRIDES.systems from
   loadOverrides() in preview.js, which calls window.renderCharted()
   when it arrives) -- no extra network requests. Bulk imports (the
   Galactic Hub wiki pass, the no-name backfill) are left out so the
   numbers mean people. A link with ?recent=1 (the Hub ticker's
   "See all") opens the list as soon as the data is in.
   ============================================================ */
(function(){
  var DAY = 86400000, WEEK = 7 * DAY;
  var line = document.getElementById("chartedLine");
  var pop = document.getElementById("chartedPop");
  var list = document.getElementById("chartedList");
  var sub = document.getElementById("chartedSub");
  if(!line || !pop || !list) return;
  var openOnLoad = /[?&]recent=1\b/.test(location.search);
  var items = [];

  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function isImport(who){ return /\(import\)|no original editor name/i.test(who); }
  function plain(s){ var t = document.createElement("textarea"); t.innerHTML = String(s || ""); return t.value; }
  function ago(t){
    var s = Math.max(0, (Date.now() - t) / 1000);
    if(s < 90) return "just now";
    if(s < 3600) return Math.round(s / 60) + " min ago";
    if(s < DAY / 1000) return Math.round(s / 3600) + " h ago";
    var d = Math.round(s / 86400); return d + (d === 1 ? " day ago" : " days ago");
  }

  function collect(){
    var out = [], now = Date.now();
    var systems = (window.OVERRIDES && OVERRIDES.systems) || {};
    for(var k in systems){
      var r = systems[k], t = Date.parse(r && r.editedAt);
      if(!(t > now - WEEK)) continue;
      var d = r.data || {}, who = String(d.editorName || "").trim();
      if(isImport(who)) continue;
      var i = k.indexOf(":"); if(i < 0) continue;
      var g = parseInt(k.slice(0, i), 10), addr = k.slice(i + 1).toUpperCase();
      if(!(g >= 0) || !/^[0-9A-F]{12}$/.test(addr)) continue;
      out.push({ t:t, galaxy:g, address:addr, name:plain(d.name) || "Unnamed system", who:plain(who) });
    }
    out.sort(function(a, b){ return b.t - a.t; });
    return out;
  }

  function render(){
    items = collect();
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var today = items.filter(function(x){ return x.t >= start.getTime(); }).length;
    if(!items.length){ line.hidden = true; return; }
    var sys = function(v){ return v === 1 ? " system" : " systems"; };
    line.textContent = "◈ " + (today ? today + sys(today) + " charted today" : items.length + sys(items.length) + " charted this week") + " ›";
    line.setAttribute("aria-label", today + " systems charted today, " + items.length + " this week. Show the list.");
    line.hidden = false;
    if(sub) sub.textContent = "Systems travellers documented on this map: " + today + " today · " + items.length + " this week. Tap one to fly there.";
    if(pop.classList.contains("show")) fill();
    if(openOnLoad){ openOnLoad = false; openWhenClear(); }
  }

  function fill(){
    list.textContent = "";
    if(!items.length){ list.appendChild(el("div", "searchEmpty", "No systems charted this week yet. Be the first: open a system and tap Edit.")); return; }
    items.forEach(function(x){
      var row = el("button", "searchRes chartedRow");
      row.type = "button";
      row.setAttribute("data-addr", x.address);
      row.setAttribute("data-galaxy", String(x.galaxy));
      row.appendChild(el("div", "searchResName", x.name));
      var meta = el("div", "searchResMeta");
      meta.appendChild(document.createTextNode((x.who ? "by " + x.who + " · " : "") + ((window.GALAXIES && GALAXIES[x.galaxy]) || ("Galaxy " + (x.galaxy + 1))) + " · " + ago(x.t)));
      row.appendChild(meta);
      var gl = el("div", "searchResMeta chartedGlyphs");
      x.address.split("").forEach(function(ch){
        var im = el("img"); im.alt = ch; im.src = (typeof glyphSrc === "function" ? glyphSrc(ch) : "glyphs/glyph-mask-" + ch + ".png");
        gl.appendChild(im);
      });
      gl.appendChild(document.createTextNode(" " + x.address));
      row.appendChild(gl);
      list.appendChild(row);
    });
  }

  function position(){
    var r = line.getBoundingClientRect();
    var pw = pop.offsetWidth || 300;
    pop.style.left = Math.min(window.innerWidth - pw - 8, Math.max(8, r.left)) + "px";
    pop.style.right = "auto";
    pop.style.top = (r.bottom + 8) + "px";
    if(typeof clampPopoverTop === "function") clampPopoverTop(pop);
  }
  function open(){
    if(typeof window.closeFavPop === "function") window.closeFavPop();
    fill();
    pop.classList.add("show");
    line.setAttribute("aria-expanded", "true");
    position();
    pop.classList.toggle("scroll", pop.scrollHeight > pop.clientHeight + 3);
  }
  // A first-time visitor arriving from the Hub sees the "Before you explore" tips first;
  // open the list once that (or any other modal) is closed.
  function openWhenClear(){
    var wrap = document.getElementById("modalWrap");
    if(wrap && wrap.classList.contains("show")){ setTimeout(openWhenClear, 700); return; }
    open();
  }
  function close(){ pop.classList.remove("show"); line.setAttribute("aria-expanded", "false"); }

  line.addEventListener("click", function(e){ e.stopPropagation(); pop.classList.contains("show") ? close() : open(); });
  document.addEventListener("click", function(e){ if(pop.classList.contains("show") && !pop.contains(e.target) && e.target !== line) close(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && pop.classList.contains("show")){ close(); line.focus(); } });
  window.addEventListener("resize", function(){ if(pop.classList.contains("show")) position(); });

  // Same jump as the Favourites list: switch galaxy if needed, then fly there.
  list.addEventListener("click", function(e){
    var row = e.target.closest ? e.target.closest(".chartedRow") : null;
    if(!row) return;
    var addr = row.getAttribute("data-addr"), gal = parseInt(row.getAttribute("data-galaxy"), 10);
    close();
    if(!isNaN(gal) && gal !== GALAXY){
      switchGalaxy(gal);
      document.getElementById("galSel").value = String(gal);
      if(typeof syncGalaxyPickInput === "function") syncGalaxyPickInput();
      toast("Switched to " + GALAXIES[gal] + " -- that's where this system is", 3200);
    }
    document.getElementById("inAddr").value = addr;
    if(typeof setKeypad === "function") setKeypad(addr);
    if(jumpTo(addr) && typeof playWarpTransition === "function") playWarpTransition("portal");
  });

  window.renderCharted = render;
  render(); // in case the shared data arrived before this file loaded
  setInterval(function(){ if(!document.hidden) render(); }, 60000); // keeps "x min ago" and the day boundary right
})();
