/* ============================================================
   Theme Pack download counter (2026-10-14)

   Replaces api.countapi.xyz (shut down, so the Theme Pack page was stuck
   showing its fixed "500+"). GET returns the count, POST adds one. Lives
   here because this site already has Netlify Blobs set up; the Theme Pack
   (theme.nomansskyhub.app) calls it cross-site, CORS is open via json().
   The page adds its own +500 base on top, so the number carries on from
   the 500+ it showed before.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json } from "./lib/shared.mjs";

const STORE = "nms-theme-downloads";
const KEY = "downloads";

export default async (req) => {
  if(req.method === "OPTIONS") return json(200, { ok: true });
  if(req.method !== "GET" && req.method !== "POST") return json(405, { ok: false, error: "GET or POST only" });
  var store;
  try { store = getStore(STORE); } catch(e){ return json(503, { ok: false, error: "store unavailable" }); }
  var n = 0;
  try { n = Number(await store.get(KEY)) || 0; } catch(e){ n = 0; }
  if(req.method === "POST"){
    n += 1;
    try { await store.set(KEY, String(n)); } catch(e){ return json(503, { ok: false, error: "could not save" }); }
    return json(200, { ok: true, value: n }, { "Cache-Control": "no-store" });
  }
  return json(200, { ok: true, value: n }, { "Cache-Control": "public, max-age=60" });
};

export const config = { path: "/.netlify/functions/dl-count" };
