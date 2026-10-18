/* ============================================================
   NMS Galactic Map -- private systems (2026-10-18)

   "Keep this system private" in Edit system. Private saves are NOT written
   to data/overrides.json (that file is in a public GitHub repo); they live
   here, in a separate Netlify Blobs store, so they survive clearing the
   browser and can follow a traveller to another device.

   - No accounts. The first private save makes a random private code
     (e.g. NMS-7KQ2-XM4D-P9TA) which is the traveller's key. Entering the
     same code on another device loads the same systems.
   - Who can see them: whoever has the code, and the site owner via
     ?admin=1&token=<ADMIN_TOKEN> (for code recovery: a traveller who lost
     their code messages Tony with the glyphs of one of their private
     systems, he looks up which code owns it). Never shown on the map,
     Recently charted, the Hub ticker or the Community page.
   - Writes nothing to GitHub, so it never triggers a deploy.

   GET  ?code=CODE                          -> { ok, code, name, systems }
   GET  ?admin=1&token=ADMIN_TOKEN          -> { ok, owners:[...] } (no photos)
   POST { action:"save", code?, key, data, name? } -> { ok, code, created }
   POST { action:"delete", code, key }      -> { ok }
   POST { action:"recover", key, contact, name?, note? } -> lost-code request,
        stored privately (req/...) with the matching code(s) for the owner
   POST { action:"resolve", token, id }     -> owner marks a request done
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json, ipKey } from "./lib/shared.mjs";

const STORE = "nms-galmap-private";
const HOUR = 60 * 60 * 1000;
const CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^NMS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const KEY_RE = /^\d{1,3}:[0-9A-F]{12}$/;
const MAX_ENTRY_BYTES = 900 * 1024;     // one system incl. photos
const MAX_SYSTEMS = 300;                // per code
const LIMITS = { write: 60, create: 5, read: 120 }; // per IP per hour
const IMG_OK = /^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+|https:\/\/raw\.githubusercontent\.com\/elegra1965-source\/nms-galactic-map\/[^\s"'<>]+)$/;

function newCode(){
  var b = new Uint8Array(12); crypto.getRandomValues(b);
  var s = ""; for(var i = 0; i < 12; i++) s += CODE_ALPHA[b[i] % CODE_ALPHA.length];
  return "NMS-" + s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12);
}
function normCode(c){ return String(c || "").trim().toUpperCase().replace(/\s+/g, ""); }

/* Strip < and > from every string so nothing a code-holder stored can
   become markup in the map or the owner view. Image fields must be a real
   image data URL or one of the repo's own raw URLs. */
function clean(v, depth){
  if(depth > 6) return null;
  if(typeof v === "string") return v.replace(/[<>]/g, "").slice(0, 4000);
  if(typeof v === "number" || typeof v === "boolean" || v === null) return v;
  if(Array.isArray(v)) return v.slice(0, 60).map(function(x){ return clean(x, depth + 1); });
  if(typeof v === "object"){
    var o = {}, n = 0;
    for(var k in v){ if(++n > 80) break; o[String(k).slice(0, 40)] = clean(v[k], depth + 1); }
    return o;
  }
  return null;
}
function cleanData(d){
  var imgs = {};
  ["screenshot", "stationPhoto", "allianceBadge"].forEach(function(f){
    var u = d && typeof d[f] === "string" ? d[f] : "";
    imgs[f] = IMG_OK.test(u) ? u : "";
  });
  var out = clean(d, 0) || {};
  for(var f in imgs) out[f] = imgs[f];
  return out;
}

async function allow(store, key, limit, now){
  var list = [];
  try { list = (await store.get(key, { type: "json" })) || []; } catch(e){ list = []; }
  list = list.filter(function(t){ return now - t < HOUR; });
  if(list.length >= limit) return false;
  list.push(now);
  try { await store.setJSON(key, list); } catch(e){}
  return true;
}

const H = { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(200, { ok: true }, H);
  var store;
  try { store = getStore(STORE); } catch(e){ return json(503, { ok: false, error: "store", message: "Private saves aren't available right now." }, H); }
  var now = Date.now();
  var ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown";
  var who = await ipKey(ip);
  var url = new URL(req.url);

  if(req.method === "GET"){
    if(url.searchParams.get("admin") === "1"){
      var tok = url.searchParams.get("token"), adm = process.env.ADMIN_TOKEN;
      if(!adm || !tok || tok !== adm) return json(403, { ok: false, error: "forbidden" }, H);
      var owners = [];
      var listed = await store.list({ prefix: "code/" });
      for(var i = 0; i < listed.blobs.length; i++){
        var rec = await store.get(listed.blobs[i].key, { type: "json" }).catch(function(){ return null; });
        if(!rec) continue;
        var sys = {};
        for(var k in (rec.systems || {})){
          var e = rec.systems[k], d = (e && e.data) || {};
          sys[k] = { name: d.name || "", editorName: d.editorName || "", race: d.race || "",
                     savedAt: e.savedAt || "", photos: (d.screenshot ? 1 : 0) + (d.stationPhoto ? 1 : 0) };
        }
        owners.push({ code: rec.code, name: rec.name || "", createdAt: rec.createdAt, updatedAt: rec.updatedAt, systems: sys });
      }
      owners.sort(function(a, b){ return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
      var requests = [];
      var rl = await store.list({ prefix: "req/" });
      for(var q = 0; q < rl.blobs.length; q++){
        var rq = await store.get(rl.blobs[q].key, { type: "json" }).catch(function(){ return null; });
        if(rq){ rq.id = rl.blobs[q].key.slice(4); requests.push(rq); }
      }
      requests.sort(function(a, b){ return String(b.at).localeCompare(String(a.at)); });
      return json(200, { ok: true, owners: owners, requests: requests }, H);
    }
    var code = normCode(url.searchParams.get("code"));
    if(!CODE_RE.test(code)) return json(400, { ok: false, error: "bad-code", message: "That doesn't look like a private code (NMS-XXXX-XXXX-XXXX)." }, H);
    if(!(await allow(store, "rl/read/" + who, LIMITS.read, now))) return json(429, { ok: false, error: "rate", message: "Too many tries -- wait a bit and try again." }, H);
    var r = await store.get("code/" + code, { type: "json" }).catch(function(){ return null; });
    if(!r) return json(404, { ok: false, error: "not-found", message: "No private systems found for that code." }, H);
    return json(200, { ok: true, code: r.code, name: r.name || "", systems: r.systems || {} }, H);
  }

  if(req.method !== "POST") return json(405, { ok: false, error: "method" }, H);
  var body;
  try { body = await req.json(); } catch(e){ return json(400, { ok: false, error: "bad json" }, H); }
  var action = body && body.action;
  if(action === "resolve"){
    var adm2 = process.env.ADMIN_TOKEN;
    if(!adm2 || body.token !== adm2) return json(403, { ok: false, error: "forbidden" }, H);
    if(typeof body.id !== "string" || !/^[\w.:-]{1,60}$/.test(body.id)) return json(400, { ok: false, error: "bad-id" }, H);
    try { await store.delete("req/" + body.id); } catch(e){}
    return json(200, { ok: true }, H);
  }
  var key = String((body && body.key) || "").toUpperCase();
  if(!KEY_RE.test(key) || Number(key.split(":")[0]) > 255) return json(400, { ok: false, error: "bad-key" }, H);
  if(action === "recover"){
    // Lost-code request: stored privately for the owner, with the matching
    // code(s) looked up here. Nothing about the match goes back to the requester.
    var contact = String(body.contact || "").replace(/[<>]/g, "").trim().slice(0, 80);
    if(contact.length < 3) return json(400, { ok: false, error: "contact", message: "Add a Reddit username or email so the code can be sent back to you." }, H);
    if(!(await allow(store, "rl/recover/" + who, 3, now))) return json(429, { ok: false, error: "rate", message: "Too many requests this hour -- try again later." }, H);
    var matches = [];
    var all = await store.list({ prefix: "code/" });
    for(var m = 0; m < all.blobs.length; m++){
      var rr = await store.get(all.blobs[m].key, { type: "json" }).catch(function(){ return null; });
      if(rr && rr.systems && rr.systems[key]) matches.push(rr.code);
    }
    var id = new Date(now).toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 7);
    await store.setJSON("req/" + id, { at: new Date(now).toISOString(), key: key, contact: contact,
      name: String(body.name || "").replace(/[<>]/g, "").trim().slice(0, 30),
      note: String(body.note || "").replace(/[<>]/g, "").trim().slice(0, 200), matches: matches });
    return json(200, { ok: true, message: "Request sent -- elegra1965 will check it and reply to " + contact + "." }, H);
  }
  if(!(await allow(store, "rl/write/" + who, LIMITS.write, now))) return json(429, { ok: false, error: "rate", message: "Too many private saves this hour -- try again later." }, H);

  var code2 = normCode(body.code), created = false, rec2 = null;
  if(code2){
    if(!CODE_RE.test(code2)) return json(400, { ok: false, error: "bad-code" }, H);
    rec2 = await store.get("code/" + code2, { type: "json" }).catch(function(){ return null; });
  }

  if(action === "delete"){
    if(!rec2) return json(200, { ok: true }, H);
    if(rec2.systems) delete rec2.systems[key];
    rec2.updatedAt = new Date(now).toISOString();
    await store.setJSON("code/" + code2, rec2);
    return json(200, { ok: true }, H);
  }
  if(action !== "save") return json(400, { ok: false, error: "bad-action" }, H);
  if(!body.data || typeof body.data !== "object") return json(400, { ok: false, error: "no-data" }, H);
  var data = cleanData(body.data);
  if(JSON.stringify(data).length > MAX_ENTRY_BYTES){
    data.screenshot = ""; data.stationPhoto = ""; data.allianceBadge = "";
  }

  if(!rec2){
    // Unknown or missing code -> a fresh one (never adopt a code the client made up).
    if(!(await allow(store, "rl/create/" + who, LIMITS.create, now))) return json(429, { ok: false, error: "rate", message: "Too many new private codes from here this hour." }, H);
    code2 = newCode();
    for(var tries = 0; tries < 3 && (await store.get("code/" + code2).catch(function(){ return null; })); tries++) code2 = newCode();
    rec2 = { code: code2, name: "", createdAt: new Date(now).toISOString(), systems: {} };
    created = true;
  }
  rec2.systems = rec2.systems || {};
  if(!rec2.systems[key] && Object.keys(rec2.systems).length >= MAX_SYSTEMS)
    return json(413, { ok: false, error: "full", message: "This private code already holds " + MAX_SYSTEMS + " systems." }, H);
  var savedAt = typeof body.savedAt === "string" && /^\d{4}-\d\d-\d\dT/.test(body.savedAt) ? body.savedAt.slice(0, 30) : new Date(now).toISOString();
  rec2.systems[key] = { data: data, savedAt: savedAt };
  if(typeof body.name === "string" && body.name.trim()) rec2.name = body.name.replace(/[<>]/g, "").trim().slice(0, 30);
  else if(data.editorName) rec2.name = String(data.editorName).slice(0, 30);
  rec2.updatedAt = new Date(now).toISOString();
  await store.setJSON("code/" + code2, rec2);
  return json(200, { ok: true, code: code2, created: created }, H);
};

export const config = { path: "/.netlify/functions/private-systems" };
