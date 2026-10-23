/* NMS Galactic Map -- NMS Almanac (nmsalmanac.com, by Borjomi / u/Fosferus), 2026-10-23.
   Real game data for a system, from netlify/functions/almanac.mjs (key stays on the server).
   - Info panel fold "Real game data · NMS Almanac": loaded only when opened.
   - Entering a system's 3D view swaps procedural planet names for the real ones.
   - A traveller's own edit always wins over Almanac data.
   - Busy (500/hour key used up) -> "please try again later".
   All Almanac text is set with textContent. */
(function(){
  var MEM = {}, LS = "nms-alm-cache", busyToastAt = 0;
  function lsGet(){ try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch(e){ return {}; } }
  function lsPut(k, v){
    try {
      var c = lsGet(); c[k] = { t: Date.now(), v: v };
      var ks = Object.keys(c); if(ks.length > 120){ ks.sort(function(a,b){ return c[a].t - c[b].t; }); ks.slice(0, ks.length - 120).forEach(function(x){ delete c[x]; }); }
      localStorage.setItem(LS, JSON.stringify(c));
    } catch(e){}
  }
  function key(s){ return s.galaxy + ":" + s.address; }
  function cached(s){
    var k = key(s); if(MEM[k]) return MEM[k];
    var c = lsGet()[k]; if(c && Date.now() - c.t < 7 * 864e5){ MEM[k] = c.v; return c.v; }
    return null;
  }
  function busyToast(){
    if(Date.now() - busyToastAt < 600000) return; busyToastAt = Date.now();
    if(typeof toast === "function") toast("NMS Almanac is busy right now — please try again later.", 4000);
  }
  var inflight = {};
  function get(s){
    var hit = cached(s); if(hit) return Promise.resolve(hit);
    var k = key(s); if(inflight[k]) return inflight[k];
    inflight[k] = fetch("/.netlify/functions/almanac?addr=" + encodeURIComponent(s.address) + "&galaxy=" + encodeURIComponent(s.galaxy))
      .then(function(r){ return r.json(); })
      .catch(function(){ return { ok:false }; })
      .then(function(d){
        delete inflight[k];
        if(d && d.ok){ MEM[k] = d; lsPut(k, d); }
        else if(d && d.busy) busyToast();
        return d;
      });
    return inflight[k];
  }
  function byIndex(d, i){ var b = d && d.bodies || []; for(var j=0;j<b.length;j++) if(b[j].p === i) return b[j]; return null; }

  // Real names onto the map's own body objects (3D labels read b.name live).
  function apply(s, d){
    if(!s || !d || !d.found) return false;
    var changed = false;
    (s.bodies || []).forEach(function(b){
      var a = byIndex(d, b.index);
      b.almanac = a || null;
      if(a && a.name && !b.nameOverridden && b.name !== a.name){ b.name = a.name; changed = true; }
    });
    return changed;
  }
  function anyFoldOpen(){
    return ["pAlmBody","pHavenBody","pSeqBody","pNoteBody"].some(function(id){ var e = document.getElementById(id); return e && e.style.display !== "none"; });
  }
  // called from updatePanel(): re-apply names already known (no network)
  window.almReset = function(s){
    var b = document.getElementById("pAlmBody"); if(b) b.textContent = "";
    almFor = null;
    var d = s && cached(s); if(d) apply(s, d);
  };
  // called when a system's 3D view is entered
  window.almNames = function(s){
    if(!s) return;
    get(s).then(function(d){
      if(apply(s, d) && typeof selected !== "undefined" && selected === s && !anyFoldOpen() && typeof updatePanel === "function") updatePanel(s);
    });
  };

  function el(tag, text, css){ var e = document.createElement(tag); if(text != null) e.textContent = text; if(css) e.style.cssText = css; return e; }
  function row(body, label, val){ if(val == null || val === "") return; var d = el("div"); d.appendChild(el("b", label + ": ")); d.appendChild(document.createTextNode(String(val))); body.appendChild(d); }
  function pct(v){ return v == null ? null : (v > 0 ? "+" : "") + v + "%"; }

  function render(body, s, d){
    body.textContent = "";
    if(!d || !d.ok){
      body.appendChild(el("div", d && d.busy ? "NMS Almanac is busy right now — please try again later." : "Couldn't reach NMS Almanac right now. Try again later."));
      return;
    }
    if(!d.found){ body.appendChild(el("div", "NMS Almanac has no system at this address.")); return; }
    var y = d.system || {};
    row(body, "Name", y.name);
    row(body, "Star", [y.star, y.spectral, y.suns > 1 ? y.suns + " suns" : null].filter(Boolean).join(" · "));
    row(body, "Race", y.race);
    row(body, "Economy", [y.economyType, y.economy, y.wealth].filter(Boolean).join(" · "));
    row(body, "Conflict", y.conflict);
    if(y.sell != null || y.buy != null) row(body, "Sell / Buy", (pct(y.sell) || "—") + " / " + (pct(y.buy) || "—"));
    row(body, "In demand", y.demand);
    (d.bodies || []).forEach(function(a){
      var mb = null; (s.bodies || []).forEach(function(b){ if(b.index === a.p) mb = b; });
      // a traveller's own edit wins
      var name = mb && mb.nameOverridden ? mb.name : a.name;
      var desc = mb && mb.biomeOverridden ? (mb.biome + (mb.subtype ? " (" + mb.subtype + ")" : "")) : a.desc;
      var weather = mb && mb.bodyOverridden && mb.descriptor ? mb.descriptor : a.weather;
      var sent = mb && mb.sentinelOverridden ? mb.sentinel : a.sentinels;
      var wrap = el("div", null, "display:grid;grid-template-columns:40px 1fr;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.06);cursor:pointer");
      var img = el("img", null, "width:40px;height:40px"); img.alt = ""; img.loading = "lazy"; if(a.discSmall) img.src = a.discSmall;
      wrap.appendChild(img);
      var t = el("div");
      t.appendChild(el("div", (a.moonOf ? "☾ " : "") + (name || "Unnamed"), "font-family:Orbitron,monospace;font-size:10.5px;color:var(--text,#fff);letter-spacing:.04em"));
      var l2 = el("div"); l2.appendChild(document.createTextNode(desc || ""));
      if(weather){ l2.appendChild(document.createTextNode(" · ")); l2.appendChild(el("span", weather, (a.extreme && !(mb && mb.bodyOverridden && mb.descriptor)) ? "color:#ff5a4a" : "")); }
      t.appendChild(l2);
      if(sent) t.appendChild(el("div", "Sentinels: " + sent));
      var more = el("div", null, "display:none;color:var(--text-faint);margin-top:3px");
      more.appendChild(el("div", "Fauna " + (a.fauna != null ? a.fauna : "?") + (a.faunaW ? " (" + a.faunaW + ")" : "") + " · Flora " + (a.flora != null ? a.flora : "?") + (a.floraW ? " (" + a.floraW + ")" : "")));
      if(a.resources && a.resources.length) more.appendChild(el("div", a.resources.join(", ")));
      t.appendChild(more);
      wrap.appendChild(t);
      wrap.addEventListener("click", function(){ more.style.display = more.style.display === "none" ? "" : "none"; });
      body.appendChild(wrap);
    });
    var foot = el("div", null, "margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;color:var(--text-faint)");
    var c = el("span"); c.appendChild(document.createTextNode("Data: "));
    var a = el("a", "NMS Almanac", "color:var(--cyan)"); a.href = "https://nmsalmanac.com"; a.target = "_blank"; a.rel = "noopener";
    c.appendChild(a); foot.appendChild(c);
    var fb = el("button", "Fill blanks in Edit system"); fb.type = "button"; fb.className = "btn beveled"; fb.style.cssText = "font-size:10px;padding:5px 8px";
    fb.addEventListener("click", function(){ fillBlanks(s, d); });
    foot.appendChild(fb);
    body.appendChild(foot);
  }

  var almFor = null;
  function load(){
    var s = (typeof selected !== "undefined") ? selected : null, body = document.getElementById("pAlmBody");
    if(!s || !body || body.style.display === "none") return;
    var k = key(s); if(almFor === k) return; almFor = k;
    body.textContent = "Checking NMS Almanac…";
    get(s).then(function(d){
      if(selected && key(selected) === k){ if(apply(s, d)) {} render(body, s, d); }
    });
  }

  var BIOME = { lush:"Lush", barren:"Barren", dead:"Dead", exotic:"Exotic", "mega-exotic":"Mega Exotic", scorched:"Scorched", frozen:"Frozen", toxic:"Toxic", irradiated:"Radioactive", swamp:"Marsh", volcanic:"Volcanic", waterworld:"Water World", "gas-giant":"Gas Giant" };
  function setIfBlank(id, v){ var e = document.getElementById(id); if(e && v != null && v !== "" && !String(e.value || "").trim()){ e.value = v; return 1; } return 0; }
  function fillBlanks(s, d){
    if(typeof openEditModal !== "function") return;
    openEditModal();
    var y = d.system || {}, n = 0;
    if(!s.override){
      // nothing saved yet: the form holds procedural guesses, so Almanac values replace them
      var set = function(id, v){ var e = document.getElementById(id); if(e && v != null && v !== ""){ e.value = v; n++; } };
      set("edName", y.name); set("edRegion", y.region); set("edStarClass", y.spectral);
      var race = y.abandoned ? null : String(y.race || "").replace("’", "'");
      if(["Gek","Vy'keen","Korvax"].indexOf(race) >= 0) set("edRace", race);
      if(y.abandoned){ var ab = document.getElementById("edAbandoned"); if(ab) ab.checked = true; }
      set("edEcon", y.economy); set("edEconStr", y.wealth); set("edConflict", y.conflict);
      set("edSell", y.sell); set("edBuy", y.buy);
    } else {
      n += setIfBlank("edRegion", y.region) + setIfBlank("edStarClass", y.spectral) + setIfBlank("edEcon", y.economy) + setIfBlank("edEconStr", y.wealth) + setIfBlank("edConflict", y.conflict);
    }
    if(typeof editBodies !== "undefined" && editBodies){
      editBodies.forEach(function(eb, i){
        var a = byIndex(d, i + 1); if(!a) return;
        if(!eb.name && a.name){ eb.name = a.name; n++; }
        if(!eb.biome && BIOME[a.biome]){ eb.biome = BIOME[a.biome]; n++; }
        if(!eb.descriptor && a.weather){ eb.descriptor = a.weather; n++; }
        var mb = (s.bodies || [])[i];
        if((!eb.sentinel || eb.sentinel === "None" || (mb && !mb.sentinelOverridden)) && eb.sentinel !== a.sentinels && typeof SENTINEL_ALL_WORDS !== "undefined" && SENTINEL_ALL_WORDS.indexOf(a.sentinels) >= 1){ eb.sentinel = a.sentinels; n++; }
      });
      if(typeof renderBodyEditList === "function") renderBodyEditList();
    }
    if(typeof toast === "function") toast(n ? ("Filled " + n + " fields from NMS Almanac — check them, then Save.") : "Nothing blank to fill.", 3600);
  }

  var head = document.getElementById("pAlmHead");
  if(head){
    head.addEventListener("click", function(){ togglePanelFold("pAlmHead","pAlmBody"); load(); });
    head.addEventListener("keydown", function(e){ panelFoldKey(e,"pAlmHead","pAlmBody"); load(); });
  }
})();
