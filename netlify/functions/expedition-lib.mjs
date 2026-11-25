/* ============================================================
   Shared expedition source (2026-11-25).
   Hello Games' news feed (https://www.nomanssky.com/feed/) -> the expedition schedule every
   NMS Hub site reads. Pure functions here (parsing + picking) so they can be tested offline;
   the scheduled watcher (expedition-watch.mjs) fetches and stores, the endpoint
   (expedition.mjs) answers. Dates are UTC; expeditions go live / end around 14:00 UTC.
   ============================================================ */

export const SITE = "https://www.nomanssky.com";
export const GO_LIVE_HOUR = 14;

const WORDS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40 };
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

export function wordToNum(s){
  s = String(s || "").toLowerCase().trim();
  if(/^\d+$/.test(s)) return parseInt(s, 10);
  var p = s.split(/[\s-]+/), n = 0;
  for(var i = 0; i < p.length; i++){ if(WORDS[p[i]] == null) return 0; n += WORDS[p[i]]; }
  return n;
}

export function decode(s){
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, function(_, h){ return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function(_, d){ return String.fromCodePoint(parseInt(d, 10)); })
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function plain(html){ return decode(String(html || "").replace(/<[^>]+>/g, " ")); }

/* RSS -> [{title, link, pubDate(ms)}] */
export function parseFeed(xml){
  var out = [], re = /<item>([\s\S]*?)<\/item>/g, m;
  while((m = re.exec(String(xml || "")))){
    var t = (m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    var l = (m[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    var d = (m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    if(!t || !l) continue;
    var ms = Date.parse(d || "");
    out.push({ title: decode(t), link: l.trim(), pubDate: isNaN(ms) ? 0 : ms });
  }
  return out;
}

/* Posts that can announce an expedition (patch notes like "Forsaken 7.14" or "... 6.17.1" are not). */
export function isExpeditionPost(title){
  title = String(title || "");
  if(/\b\d+\.\d+(\.\d+)?\s*$/.test(title)) return false;
  return /expedition/i.test(title);
}

function abs(u){ u = String(u || ""); return /^https?:/i.test(u) ? u : SITE + (u.charAt(0) === "/" ? "" : "/") + u; }
function dayMs(day, mon, year){ return Date.UTC(year, mon, day, GO_LIVE_HOUR, 0, 0); }

/* "Holiday Expeditions" style post: <img patch-expedition-N> <strong>Title</strong>: <span>25th Nov - 9th Dec</span> text.
   Years come from the post date; a month earlier than the first one rolls into the next year. */
export function parseRedux(html, postUrl, postMs){
  var runs = [], re = /<li>([\s\S]*?)<\/li>/g, m, y0 = new Date(postMs).getUTCFullYear(), prevMon = -1, add = 0;
  while((m = re.exec(html))){
    var li = m[1];
    var im = li.match(/patch-expedition-(\d+)[^"']*\.(?:png|jpe?g|webp)/i);
    var src = li.match(/<img[^>]+src="([^"]+)"/i);
    var sm = li.match(/<strong>([\s\S]*?)<\/strong>\s*:?\s*(?:<[^>]+>\s*)*?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*\s*[-–—]\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})/i);
    if(!sm) continue;
    var title = decode(sm[1].replace(/<[^>]+>/g, "")), d1 = +sm[2], mo1 = MONTHS[sm[3].toLowerCase()], d2 = +sm[4], mo2 = MONTHS[sm[5].toLowerCase()];
    if(mo1 == null || mo2 == null || !title) continue;
    if(prevMon >= 0 && mo1 < prevMon) add++;
    prevMon = mo1;
    var ys = y0 + add, ye = ys + (mo2 < mo1 ? 1 : 0);
    var after = li.slice(li.indexOf("</span>") + 7);
    var desc = plain(after);
    runs.push({
      num: im ? parseInt(im[1], 10) : 0, title: title, redux: true, estimated: false,
      start: dayMs(d1, mo1, ys), end: dayMs(d2, mo2, ye),
      art: src ? abs(src[1]) : "", url: postUrl, desc: desc.slice(0, 400)
    });
    if(mo2 < mo1) add++, prevMon = mo2;
  }
  return runs;
}

/* A new expedition's own launch post: "Expedition Twenty-Four: Name". Goes live when the post does;
   the length is the "N weeks" the post says (estimated until the wiki or a later post gives the day). */
export function parseLaunch(title, html, postUrl, postMs){
  var tm = String(title).match(/^\s*Expedition\s+([A-Za-z0-9-]+(?:\s+[A-Za-z]+)?)\s*:\s*(.+?)\s*$/i);
  if(!tm) return [];
  var num = wordToNum(tm[1]);
  if(!num) return [];
  var txt = plain(String(html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ""));
  var wm = txt.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+weeks?\b/i);
  var weeks = wm ? wordToNum(wm[1]) : 0;
  var start = new Date(postMs); start.setUTCMinutes(0, 0, 0);
  var og = (String(html || "").match(/og:image"\s+content="([^"]+)"/i) || [])[1];
  var end = weeks ? start.getTime() + weeks * 7 * 86400000 : 0;
  return [{ num: num, title: tm[2], redux: false, estimated: true, start: start.getTime(), end: end, art: og || "", url: postUrl, desc: "", weeks: weeks }];
}

export function runKey(r){ return r.title.toLowerCase().replace(/[^a-z0-9]+/g, "") + "@" + new Date(r.start).toISOString().slice(0, 10); }

/* merge new runs into the stored list (newer parse of the same run wins, but a known real end is not
   replaced by an estimate) */
export function mergeRuns(old, add){
  var map = {};
  (old || []).forEach(function(r){ map[runKey(r)] = r; });
  (add || []).forEach(function(r){
    var k = runKey(r), prev = map[k];
    if(prev && !prev.estimated && r.estimated) return;
    map[k] = r;
  });
  return Object.keys(map).map(function(k){ return map[k]; }).sort(function(a, b){ return a.start - b.start; });
}

/* live / next / last as of `now` */
export function pick(runs, now){
  var live = null, next = null, last = null;
  (runs || []).forEach(function(r){
    var ended = r.end && now >= r.end;
    if(r.start <= now && !ended){ if(!live || r.start > live.start) live = r; }
    else if(r.start > now){ if(!next || r.start < next.start) next = r; }
    else if(!last || r.end > last.end) last = r;
  });
  return { live: live, next: next, last: last };
}

export function displayName(r){
  if(!r) return "";
  return (r.num ? "EXPEDITION " + r.num + ": " : "EXPEDITION: ") + String(r.title).toUpperCase();
}

/* Holiday 2026 reduxes, announced 25 Nov 2026 (https://www.nomanssky.com/2026/11/holiday-expeditions-2026/).
   Seed so the endpoint is right before the first watcher run; the watcher replaces it from the post itself. */
export const SEED_RUNS = [
  { num: 15, title: "Aquarius", redux: true, estimated: false, start: Date.UTC(2026, 10, 25, 14), end: Date.UTC(2026, 11, 9, 14), art: SITE + "/media/1axngoey/patch-expedition-15.png", url: SITE + "/2026/11/holiday-expeditions-2026/", desc: "" },
  { num: 21, title: "Remnant", redux: true, estimated: false, start: Date.UTC(2026, 11, 9, 14), end: Date.UTC(2026, 11, 23, 14), art: SITE + "/media/42mlujam/patch-expedition-21.png", url: SITE + "/2026/11/holiday-expeditions-2026/", desc: "" },
  { num: 23, title: "Our Journey Continues", redux: true, estimated: false, start: Date.UTC(2026, 11, 23, 14), end: Date.UTC(2027, 0, 6, 14), art: SITE + "/media/kyfjoth0/patch-expedition-23.png", url: SITE + "/2026/11/holiday-expeditions-2026/", desc: "" },
  { num: 22, title: "Swarm", redux: true, estimated: false, start: Date.UTC(2027, 0, 6, 14), end: Date.UTC(2027, 0, 20, 14), art: SITE + "/media/cxmpk0pa/patch-expedition-22.png", url: SITE + "/2026/11/holiday-expeditions-2026/", desc: "" },
  { num: 23, title: "Our Journey Continues", redux: false, estimated: false, start: Date.UTC(2026, 8, 16, 14), end: Date.UTC(2026, 9, 28, 14), art: "", url: SITE + "/2026/09/expedition-twenty-three-our-journey-continues/", desc: "" }
];
