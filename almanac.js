/* NMS Galactic Map -- NMS Almanac (nmsalmanac.com, by Borjomi / u/imurashka), 2026-10-23.
   Real game data for a system, from netlify/functions/almanac.mjs (key stays on the server).
   - Info panel fold "Real game data · NMS Almanac": loaded only when opened.
   - Entering a system's 3D view swaps procedural planet names for the real ones.
   - A traveller's own edit always wins over Almanac data.
   - Busy (500/hour key used up) -> "please try again later".
   All Almanac text is set with textContent. */
(function(){
  var MEM = {}, LS = "nms-alm-cache3", busyToastAt = 0; // cache3 (2026-10-26): player-given names + station picture
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
  // Pair an Almanac body with the map's own body: by a traveller's typed name first (their
  // saved order can differ from the game's), then by position if that body has no real name
  // matching some other Almanac planet.
  function low(x){ return String(x || "").trim().toLowerCase(); }
  // 2026-10-26: an Almanac planet answers to its player-given name or its game name
  function nameIs(a, n){ n = low(n); return !!n && !!a && (low(a.name) === n || low(a.gameName) === n); }
  function mapBodyFor(s, d, a){
    var mbs = (s && s.bodies) || [], ab = (d && d.bodies) || [], i, b;
    for(i = 0; i < mbs.length; i++){ b = mbs[i]; if(b.nameOverridden && nameIs(a, b.name)) return b; }
    for(i = 0; i < mbs.length; i++){
      b = mbs[i]; if(b.index !== a.p) continue;
      if(!b.nameOverridden) return b;
      var other = ab.some(function(x){ return x !== a && nameIs(x, b.name); });
      return other ? null : b;
    }
    return null;
  }
  // 2026-10-26, Borjomi's wish: link to the Almanac's own system / planet page wherever we show one.
  // Galaxy = its name in lower case with "-" for spaces and apostrophes; hex = the portal address.
  function galSlug(g){ var n = (typeof GALAXIES !== "undefined" && GALAXIES[g]) || "Euclid"; return String(n).toLowerCase().replace(/[\s'’]+/g, "-"); }
  function sysUrl(g, addr){ return "https://nmsalmanac.com/system/" + galSlug(g) + "/0" + String(addr).toUpperCase().slice(1); }
  function planetUrl(g, portal){ return "https://nmsalmanac.com/planet/" + galSlug(g) + "/" + String(portal).toUpperCase(); }
  window.almSysUrl = sysUrl; window.almPlanetUrl = planetUrl;
  var BIOME_W = { lush:"Lush", barren:"Barren", dead:"Dead", exotic:"Exotic", "mega-exotic":"Mega Exotic", scorched:"Scorched", frozen:"Frozen", toxic:"Toxic", irradiated:"Radioactive", swamp:"Marsh", volcanic:"Volcanic", waterworld:"Water World", "gas-giant":"Gas Giant" };
  function byIndex(d, i){ var b = d && d.bodies || []; for(var j=0;j<b.length;j++) if(b[j].p === i) return b[j]; return null; }

  // Real names onto the map's own body objects (3D labels read b.name live).
  function apply(s, d){
    if(!s || !d || !d.found) return false;
    var changed = false;
    s.almanacCard = d.system && d.system.card || null; // 2026-10-24: star hover card (preview.js)
    s.almanacStation = d.system && d.system.station || null; // 2026-10-26: real station picture (preview.js almLook), a traveller's own photo wins
    // 2026-10-26: name a player gave the system in game (else its game name), unless a traveller saved one
    if(!s.override && d.system && d.system.name && s.name !== d.system.name){ s.name = d.system.name; changed = true; }
    // 2026-10-26, Tony: economy, wealth, conflict and race come from the game (NMS Almanac) first,
    // for every system, edited or not -- the map's own figures were a best guess
    var y = d.system || {};
    if(!y.abandoned){
      var race = String(y.race || "").replace("\u2019", "'");
      if(["Gek","Vy'keen","Korvax"].indexOf(race) >= 0){ if(s.race !== race){ s.race = race; changed = true; } s.raceVerified = true; }
      if(y.economy){
        if(typeof ECON !== "undefined" && y.economyType){ ECON.forEach(function(e){ if(e[0].toLowerCase() === String(y.economyType).toLowerCase()) s.econType = e[0]; }); }
        if(s.econName !== y.economy || s.uncharted){ s.econName = y.economy; s.uncharted = false; changed = true; }
        s.econVerified = true;
      }
      if(y.wealth && s.econDesc !== y.wealth){ s.econDesc = y.wealth; var et = typeof tierFromWord === "function" ? tierFromWord(y.wealth, ECON_S) : null; if(et !== null) s.econTier = et; changed = true; }
      // The Almanac writes trade from the station's side: its sell_percent is the game's "Buy" (negative)
      // and its buy_percent the game's "Sell" (positive), so they swap into the map's Sell / Buy
      if(y.sell != null && y.buy != null){ var sl = Number(y.buy).toFixed(1), by = Number(y.sell).toFixed(1); if(s.sell !== sl || s.buy !== by){ s.sell = sl; s.buy = by; changed = true; } s.econVerified = true; }
      if(y.conflict && s.conflict !== y.conflict){ s.conflict = y.conflict; var ct = typeof tierFromWord === "function" ? tierFromWord(y.conflict, CONFLICT) : null; if(ct !== null) s.conTier = ct; s.conflictVerified = true; changed = true; }
    }
    (s.bodies || []).forEach(function(b){
      // 2026-10-24: a traveller's saved planets can be in a different order from the game's,
      // so pair by their typed name first (as Fill blanks does), then by position
      var a = null;
      if(b.nameOverridden && b.name) (d.bodies || []).forEach(function(x){ if(!a && nameIs(x, b.name)) a = x; });
      if(!a) a = byIndex(d, b.index);
      b.almanac = a || null;
      if(a && a.name && !b.nameOverridden && b.name !== a.name){ b.name = a.name; changed = true; }
      // 2026-10-26, Tony: what a planet IS can't be changed in game (type, water, weather, sentinels),
      // so the real game data wins over a traveller's typed text for those; names stay the traveller's.
      if(a){
        var bw = BIOME_W[a.biome];
        if(bw && (b.biome !== bw || !b.biomeOverridden)){ if(b.biome !== bw) b.subtype = ""; b.biome = bw; b.biomeOverridden = true; changed = true; }
        var wet = !!(a.water && a.water !== "none");
        if(b.water !== wet || !b.bodyOverridden){ b.water = wet; b.bodyOverridden = true; changed = true; }
        if(a.weather && b.descriptor !== a.weather){ b.descriptor = a.weather; changed = true; }
        if(a.sentinels && typeof SENTINEL_ALL_WORDS !== "undefined" && SENTINEL_ALL_WORDS.indexOf(a.sentinels) >= 1 && (b.sentinel !== a.sentinels || !b.sentinelOverridden)){ b.sentinel = a.sentinels; b.sentinelOverridden = true; changed = true; }
      }
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
      var ch = apply(s, d);
      if(ch && typeof selected !== "undefined" && selected === s && typeof setSysBanner === "function"){ try { setSysBanner(s); } catch(e){} } // 2026-10-26: player-given system name on the banner
      if(ch && typeof selected !== "undefined" && selected === s && !anyFoldOpen() && typeof updatePanel === "function") updatePanel(s);
      if(typeof window.almLook === "function") window.almLook(s); // 2026-10-24: real colours + rings on the 3D planets
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
    if(y.gameName && y.name && y.gameName !== y.name) row(body, "Game name", y.gameName);
    row(body, "Star", [y.star, y.spectral, y.suns > 1 ? y.suns + " suns" : null].filter(Boolean).join(" · "));
    row(body, "Race", y.race);
    row(body, "Economy", [y.economyType, y.economy, y.wealth].filter(Boolean).join(" · "));
    row(body, "Conflict", y.conflict);
    if(y.sell != null || y.buy != null) row(body, "Trade", "Buy: " + (pct(y.sell) || "—") + " // Sell: " + (pct(y.buy) || "—")); // game's format; the Almanac's numbers are from the station's side, see apply()
    row(body, "In demand", y.demand);
    (d.bodies || []).forEach(function(a){
      var mb = mapBodyFor(s, d, a);
      // a traveller's own edit wins
      var name = mb && mb.nameOverridden ? mb.name : a.name;
      // 2026-10-26: type / weather / sentinels can't change in game, so always the Almanac's
      var desc = a.desc, weather = a.weather, sent = a.sentinels;
      var wrap = el("div", null, "display:grid;grid-template-columns:40px 1fr;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.06);cursor:pointer");
      var img = el("img", null, "width:40px;height:40px"); img.alt = ""; img.loading = "lazy"; if(a.discSmall) img.src = a.discSmall;
      wrap.appendChild(img);
      var t = el("div");
      t.appendChild(el("div", (a.moonOf ? "☾ " : "") + (name || "Unnamed"), "font-family:Orbitron,monospace;font-size:10.5px;color:var(--text,#fff);letter-spacing:.04em"));
      var l2 = el("div"); l2.appendChild(document.createTextNode(desc || ""));
      if(weather){ l2.appendChild(document.createTextNode(" · ")); l2.appendChild(el("span", weather, a.extreme ? "color:#ff5a4a" : "")); }
      t.appendChild(l2);
      if(sent) t.appendChild(el("div", "Sentinels: " + sent));
      var more = el("div", null, "display:none;color:var(--text-faint);margin-top:3px");
      more.appendChild(el("div", "Fauna " + (a.fauna != null ? a.fauna : "?") + (a.faunaW ? " (" + a.faunaW + ")" : "") + " · Flora " + (a.flora != null ? a.flora : "?") + (a.floraW ? " (" + a.floraW + ")" : "")));
      if(a.resources && a.resources.length) more.appendChild(el("div", a.resources.join(", ")));
      if(a.portal){ var pl = el("a", "Planet page on NMS Almanac ↗", "color:var(--cyan)"); pl.href = planetUrl(s.galaxy, a.portal); pl.target = "_blank"; pl.rel = "noopener";
        pl.addEventListener("click", function(e){ e.stopPropagation(); }); var pd = el("div", null, "margin-top:3px"); pd.appendChild(pl); more.appendChild(pd); }
      t.appendChild(more);
      wrap.appendChild(t);
      wrap.addEventListener("click", function(){ more.style.display = more.style.display === "none" ? "" : "none"; });
      body.appendChild(wrap);
    });
    var foot = el("div", null, "margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;color:var(--text-faint)");
    var c = el("span"); c.appendChild(document.createTextNode("Data: "));
    var a = el("a", "NMS Almanac", "color:var(--cyan)"); a.href = "https://nmsalmanac.com"; a.target = "_blank"; a.rel = "noopener";
    c.appendChild(a);
    c.appendChild(document.createTextNode(" · "));
    var sl = el("a", "System page ↗", "color:var(--cyan)"); sl.href = sysUrl(s.galaxy, s.address); sl.target = "_blank"; sl.rel = "noopener";
    c.appendChild(sl); foot.appendChild(c);
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
      set("edSell", y.buy); set("edBuy", y.sell); // swapped: see apply()
    } else {
      n += setIfBlank("edRegion", y.region) + setIfBlank("edStarClass", y.spectral) + setIfBlank("edEcon", y.economy) + setIfBlank("edEconStr", y.wealth) + setIfBlank("edConflict", y.conflict);
    }
    if(typeof editBodies !== "undefined" && editBodies){
      editBodies.forEach(function(eb, i){
        var a = null;
        if(eb.name){ (d.bodies || []).forEach(function(x){ if(!a && nameIs(x, eb.name)) a = x; }); }
        if(!a){
          var cand = byIndex(d, i + 1);
          var taken = cand && editBodies.some(function(o){ return o !== eb && nameIs(cand, o.name); });
          if(cand && !taken && !eb.name) a = cand;
        }
        if(!a) return;
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
