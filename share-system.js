/* NMS Galactic Map \u2014 "Share this system" card (2026-10-10).
   Draws the selected system as a 1080x1350 card (system name, star, race,
   economy, conflict, the 12 portal glyphs, hex and a fly-there link) and hands
   it to the phone's share sheet; where a browser can't share files it saves
   the PNG and copies the link. Reads the same `selected` system the info
   panel shows, so it always matches what's on screen. */
(function () {
  "use strict";
  var W = 1080, H = 1350, HEXD = "0123456789ABCDEF";
  var STAR_HEX = { yellow: "#ffe08a", red: "#ff7a4a", green: "#6bffa8", blue: "#6ba8ff", purple: "#c78aff" };
  var STAR_NAME = { yellow: "Yellow", red: "Red", green: "Green", blue: "Blue", purple: "Purple" };
  var CON_COL = ["#4cff9a", "#f0a500", "#ff5a4a"];
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function sys() { return window.selected || null; }
  function link(s) {
    return "https://map.nomansskyhub.app/?arrival=1&addr=" + s.address + "&galaxy=" + (typeof s.galaxy === "number" ? s.galaxy : 0);
  }
  function fit(x, text, maxW, size, weight, family) {
    var f = size;
    do { x.font = weight + " " + f + "px " + family; f -= 2; } while (x.measureText(text).width > maxW && f > 24);
  }
  function tinted(img, col, size) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"); g.drawImage(img, 0, 0, size, size);
    g.globalCompositeOperation = "source-atop"; g.fillStyle = col; g.fillRect(0, 0, size, size);
    return c;
  }
  function travellerName() {
    try { var m = document.cookie.match(/(?:^|; )nmsTraveller=([^;]*)/); return m ? (JSON.parse(decodeURIComponent(m[1])).n || "") : ""; } catch (e) { return ""; }
  }
  function corners(x, x0, y0, x1, y1, len, col) {
    x.strokeStyle = col; x.lineWidth = 4; x.beginPath();
    x.moveTo(x0, y0 + len); x.lineTo(x0, y0); x.lineTo(x0 + len, y0);
    x.moveTo(x1 - len, y0); x.lineTo(x1, y0); x.lineTo(x1, y0 + len);
    x.moveTo(x1, y1 - len); x.lineTo(x1, y1); x.lineTo(x1 - len, y1);
    x.moveTo(x0 + len, y1); x.lineTo(x0, y1); x.lineTo(x0, y1 - len); x.stroke();
  }

  async function draw(s) {
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    try { await Promise.all(["900 64px Orbitron", "700 30px Orbitron", "600 34px Rajdhani", "500 28px Rajdhani"].map(function (f) { return document.fonts.load(f); })); } catch (e) {}
    var bg = await loadImg("bg-stars.jpg");
    var glyphs = await Promise.all(s.address.split("").map(function (ch) { return loadImg("glyphs/glyph-mask-" + ch + ".png"); }));
    var col = STAR_HEX[s.type] || "#ffe08a";

    // space
    x.fillStyle = "#04070c"; x.fillRect(0, 0, W, H);
    if (bg) { var sc = Math.max(W / bg.width, H / bg.height); x.globalAlpha = 0.55; x.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc); x.globalAlpha = 1; }
    var vg = x.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, "rgba(4,7,12,.55)"); vg.addColorStop(.45, "rgba(4,7,12,.15)"); vg.addColorStop(1, "rgba(4,7,12,.92)");
    x.fillStyle = vg; x.fillRect(0, 0, W, H);

    // header
    x.textAlign = "left"; x.fillStyle = "#00e5ff"; x.font = "700 30px Orbitron"; x.fillText("NMS GALACTIC MAP", 70, 92);
    var tn = travellerName();
    x.fillStyle = "rgba(207,224,240,.7)"; x.font = "500 26px Rajdhani";
    x.fillText((tn ? "Shared by Traveller " + tn.slice(0, 24) : "A system worth the jump") + "  \u00b7  " + new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), 70, 128);
    x.fillStyle = "rgba(0,229,255,.35)"; x.fillRect(70, 150, W - 140, 2);

    // the star
    var cx = W / 2, cy = 360, r = 110;
    var glow = x.createRadialGradient(cx, cy, r * .3, cx, cy, r * 3.2); glow.addColorStop(0, col); glow.addColorStop(.25, col + "88"); glow.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = glow; x.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
    var core = x.createRadialGradient(cx - 25, cy - 25, 8, cx, cy, r); core.addColorStop(0, "#ffffff"); core.addColorStop(.55, col); core.addColorStop(1, col + "00");
    x.fillStyle = core; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = "lighter"; x.strokeStyle = col + "99"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - r * 2.6, cy); x.lineTo(cx + r * 2.6, cy); x.moveTo(cx, cy - r * 1.6); x.lineTo(cx, cy + r * 1.25); x.stroke();
    x.globalCompositeOperation = "source-over";
    if (s.stars > 1) { x.fillStyle = "rgba(234,246,255,.85)"; x.font = "600 26px Rajdhani"; x.textAlign = "center"; x.fillText(["", "", "BINARY SYSTEM", "TERNARY SYSTEM"][s.stars] || "", cx, cy + r + 46); }

    // name + region + galaxy
    x.textAlign = "center"; x.fillStyle = "#eaf6ff";
    var name = (s.name || "Unknown system").toUpperCase(); fit(x, name, W - 140, 72, "900", "Orbitron");
    x.shadowColor = "rgba(0,229,255,.5)"; x.shadowBlur = 24; x.fillText(name, cx, 610); x.shadowBlur = 0;
    x.fillStyle = "#f0a500"; fit(x, ("REGION: " + (s.region || "\u2014")).toUpperCase(), W - 160, 30, "700", "Orbitron"); x.fillText(("REGION: " + (s.region || "\u2014")).toUpperCase(), cx, 660);
    var gi = typeof s.galaxy === "number" ? s.galaxy : 0, gname = (window.GALAXIES && GALAXIES[gi]) || "Euclid";
    var gtype = "";
    try { gtype = window.galaxyType ? galaxyType(gi).k : ""; } catch (e) {}
    if (gtype === "Norm") gtype = "Normal";
    var ly = (typeof s.coreLY === "number") ? s.coreLY : 0;
    x.fillStyle = "rgba(207,224,240,.8)"; x.font = "500 30px Rajdhani";
    x.fillText(gname + " Galaxy (#" + (gi + 1) + (gtype ? ", " + gtype : "") + ")  \u00b7  " + ly.toLocaleString("en-GB") + " LY from the core", cx, 702);

    // facts grid
    var facts = [
      ["STAR", (STAR_NAME[s.type] || "") + (s.spectral ? " \u00b7 " + s.spectral : "")],
      ["WORLDS", s.planets + (s.planets === 1 ? " planet" : " planets") + (s.moons ? " \u00b7 " + s.moons + (s.moons === 1 ? " moon" : " moons") : "")],
      ["LIFEFORM", (s.race || "Uninhabited") + (s.abandoned ? " (Abandoned)" : "")],
      ["ECONOMY", s.uncharted ? "Data unavailable" : (s.econName || "\u2014")],
      ["CONFLICT", s.conflict === "Not Available" ? "Not available" : (s.conflict || "\u2014")],
      ["FEATURES", [s.blackHole ? "Black hole" : "", s.atlas ? "Atlas interface" : "", s.outlaw ? "Outlaw" : "", s.giant ? "Gas giant" : "", s.hasStation ? "Station" : ""].filter(Boolean).join(" \u00b7 ") || "\u2014"]
    ];
    var gx0 = 90, gy0 = 750, cw = (W - 180) / 2, rh = 78;
    facts.forEach(function (f, i) {
      var fx = gx0 + (i % 2) * cw, fy = gy0 + Math.floor(i / 2) * rh;
      x.fillStyle = "rgba(10,18,28,.72)"; x.fillRect(fx + 6, fy, cw - 12, rh - 10);
      x.fillStyle = "rgba(0,229,255,.7)"; x.fillRect(fx + 6, fy, 4, rh - 10);
      x.textAlign = "left"; x.fillStyle = "rgba(0,229,255,.85)"; x.font = "700 18px Orbitron"; x.fillText(f[0], fx + 24, fy + 26);
      var v = f[1]; x.fillStyle = f[0] === "CONFLICT" ? (CON_COL[s.conTier] || "#eaf6ff") : "#eaf6ff";
      fit(x, v, cw - 44, 30, "600", "Rajdhani"); x.fillText(v, fx + 24, fy + 58);
    });

    // portal address
    var py = 1000, ph = 190;
    x.fillStyle = "rgba(6,12,20,.82)"; x.fillRect(70, py, W - 140, ph);
    corners(x, 70, py, W - 70, py + ph, 26, "#00e5ff");
    x.textAlign = "center"; x.fillStyle = "#00e5ff"; x.font = "700 20px Orbitron"; x.fillText("PORTAL ADDRESS", cx, py + 36);
    var gs = 64, gap = 5, tw = 12 * gs + 11 * gap, gx = (W - tw) / 2;
    glyphs.forEach(function (im, i) {
      if (!im) return;
      var t = tinted(im, i === 0 ? "#f0a500" : "#bff6ff", 128);
      x.shadowColor = "rgba(0,229,255,.8)"; x.shadowBlur = 12;
      x.drawImage(t, gx + i * (gs + gap), py + 52, gs, gs); x.shadowBlur = 0;
    });
    x.fillStyle = "#f0a500"; x.font = "700 40px Orbitron"; x.fillText(s.address.split("").join(" "), cx, py + 166);

    // footer
    x.fillStyle = "#00e5ff"; x.font = "700 26px Orbitron"; x.fillText("FLY THERE \u00b7 MAP.NOMANSSKYHUB.APP", cx, H - 82);
    x.fillStyle = "rgba(207,224,240,.55)"; x.font = "500 22px Rajdhani";
    x.fillText("Dial it at any portal in " + gname + ", or open the link in 3D. Free fan-made tool, not affiliated with Hello Games.", cx, H - 44);
    return new Promise(function (res) { c.toBlob(res, "image/png"); });
  }

  async function share() {
    var s = sys(); if (!s || !s.address) return;
    var btn = document.getElementById("bShareSys"); if (btn) btn.disabled = true;
    try {
      var blob = await draw(s); if (!blob) throw new Error("no image");
      var fname = (s.name || "nms-system").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + ".png";
      var file = new File([blob], fname, { type: "image/png" }), url = link(s);
      var text = s.name + " (" + ((window.GALAXIES && GALAXIES[s.galaxy || 0]) || "Euclid") + ") \u00b7 portal address " + s.address + " \u25c8 fly there: " + url;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: s.name, text: text });
      } else {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        try { await navigator.clipboard.writeText(text); } catch (e) {}
        if (window.toast) toast("System card saved \u00b7 link copied, paste it with the picture");
      }
    } catch (e) { if (e && e.name !== "AbortError" && window.toast) toast("Couldn't make the card, try again"); }
    if (btn) btn.disabled = false;
  }

  function run() {
    var wp = document.getElementById("bWaypoint"); if (!wp) return;
    var b = document.createElement("button"); b.className = "btn"; b.id = "bShareSys"; b.type = "button";
    b.title = "Make a picture card of this system (name, star, race, economy, conflict, portal glyphs and a fly-there link) to post on Reddit, Discord or anywhere.";
    b.textContent = "Share system";
    b.addEventListener("click", share);
    wp.parentNode.appendChild(b);
  }
  window.NMSShareSystem = { draw: draw, share: share };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
