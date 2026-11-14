/* Photo review pages + daily digest (2026-11-14). Owner-only by signed links. */
import { verify, loadQueue, saveQueue, itemCard, reviewLink, sendEmail, esc, AGE_OFF_MS, SITE } from "./lib/photo-review.mjs";
import { githubGetFile, githubPutFile, invalidateGetCache } from "./lib/shared.mjs";

const PAGE = function(body){ return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Photo review</title><body style="background:#04090f;color:#cfe9f2;font-family:Arial,sans-serif;max-width:560px;margin:20px auto;padding:0 14px">'+body, { status:200, headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"} }); };
const BTN = 'style="background:#00d8f0;color:#04090f;border:0;padding:12px 20px;font-size:16px;font-weight:bold;cursor:pointer"';

async function removePhoto(it){
  var token = process.env.GITHUB_TOKEN;
  var cur = await githubGetFile(token);
  var rec = cur.data.systems[it.key];
  if(rec && rec.data){
    // only clear it if the live value is still this photo
    if(rec.data[it.field]===it.url){
      rec.data[it.field] = "";
      rec.photoNote = { field: it.field, ts: Date.now() };
      rec.editedAt = new Date().toISOString();
      (rec.history = rec.history||[]).push({ at:new Date().toISOString(), note:"photo removed by review" });
      await githubPutFile(token, cur.data, cur.sha, "Photo removed by review "+it.key);
      await invalidateGetCache();
    }
  }
}

export default async (req) => {
  var u = new URL(req.url), id = u.searchParams.get("id"), a = u.searchParams.get("a"), s = u.searchParams.get("s");
  var q = await loadQueue();
  if(u.searchParams.get("view")==="list"){
    if(!verify("list","list",s)) return PAGE("<p>Link not valid.</p>");
    var now = Date.now();
    var open = q.items.filter(function(i){ return i.status==="new" && (now-i.ts)<AGE_OFF_MS; });
    return PAGE("<h2>Photos to check ("+open.length+")</h2>"+(open.length?open.map(function(i){return itemCard(i,true);}).join(""):"<p>Nothing to check.</p>"));
  }
  var it = q.items.find(function(i){ return i.id===id; });
  if(!it || (a!=="remove" && a!=="keep") || !verify(id,a,s)) return PAGE("<p>Link not valid or already used.</p>");
  if(req.method==="POST"){
    if(it.status!=="new") return PAGE("<p>Already handled: "+esc(it.status)+".</p>");
    try { if(a==="remove") await removePhoto(it); } catch(e){ return PAGE("<p>Could not remove: "+esc(e.message)+"</p>"); }
    it.status = a==="remove" ? "removed" : "kept"; it.doneAt = Date.now();
    await saveQueue(q);
    return PAGE("<h2>"+(a==="remove"?"Photo removed":"Photo kept")+"</h2><p><a style='color:#00d8f0' href='"+reviewLink()+"'>Back to the review list</a></p>");
  }
  // GET: confirm page only, never acts (link scanners can't remove by accident)
  return PAGE("<h2>"+(a==="remove"?"Remove this photo?":"Keep this photo?")+"</h2>"+itemCard(it,false)+
    '<form method="POST" action="'+req.url.replace(/&/g,"&amp;")+'"><button '+BTN+'>'+(a==="remove"?"Remove photo":"Keep photo")+'</button></form>');
};

export const config = { path: "/.netlify/functions/photo-review" };
