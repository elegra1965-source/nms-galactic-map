/* Photo review queue (2026-11-14). Publish first, review after: photos go live
   at once; each new one is queued here so the owner gets an instant email
   (risky cases) or one daily digest. Links are signed per photo (HMAC) so
   Remove/Keep work from a phone with no token typing. GET never acts: it
   shows a confirm page; only the POST button does. */
import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";

const STORE = "nms-galmap-photo-review";
const KEY = "queue";
export const SITE = "https://map.nomansskyhub.app";
export const AGE_OFF_MS = 14*24*3600*1000;

export function secret(){ return process.env.PHOTO_REVIEW_SECRET || process.env.ADMIN_TOKEN || ""; }
export function sign(id, action){
  return createHmac("sha256", secret()).update(id+"|"+action).digest("hex").slice(0,32);
}
export function verify(id, action, sig){
  if(!secret() || !sig) return false;
  var a = Buffer.from(sign(id, action)), b = Buffer.from(String(sig));
  return a.length===b.length && timingSafeEqual(a,b);
}
export function link(id, action){
  return SITE+"/.netlify/functions/photo-review?id="+encodeURIComponent(id)+"&a="+action+"&s="+sign(id,action);
}
export function reviewLink(){
  return SITE+"/.netlify/functions/photo-review?view=list&s="+sign("list","list");
}
export async function loadQueue(){
  try { return (await getStore("nms-galmap-cache").get(KEY,{type:"json"})) || { items:[], lastDigest:0 }; }
  catch(e){ return { items:[], lastDigest:0 }; }
}
export async function saveQueue(q){ await getStore("nms-galmap-cache").setJSON(KEY, q); }

export function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

export async function sendEmail(subject, html){
  var key = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL_TO;
  if(!key || !to) return { skipped:true };
  var res = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{ "Authorization":"Bearer "+key, "Content-Type":"application/json" },
    body: JSON.stringify({ from:"NMS Galactic Map <onboarding@resend.dev>", to:[to], subject:subject, html:html })
  });
  if(!res.ok) throw new Error("Resend "+res.status);
  return { sent:true };
}

// Loose flag: letters only, so 'fuckhead' and 'f u c k' are caught. Substring =
// review only (never blocks a save).
export function looseFlag(text, words){
  var t = String(text||"").toLowerCase().replace(/[^a-z]/g,"");
  for(var i=0;i<words.length;i++){ if(t.indexOf(words[i])>=0) return words[i]; }
  return null;
}

export function itemCard(it, withLinks){
  var h = '<div style="border:1px solid #1b3a4a;padding:10px;margin:10px 0;background:#07111a;color:#cfe9f2;font-family:Arial,sans-serif">'+
    '<img src="'+esc(it.url)+'" alt="New photo" style="max-width:100%;max-height:220px;display:block;margin-bottom:8px">'+
    '<div style="font-size:13px"><b>'+esc(it.field==="stationPhoto"?"Station photo":"Screenshot")+'</b> · '+esc(it.address)+' (galaxy '+esc(it.galaxy)+') · by '+esc(it.editor||"anonymous")+
    (it.risk&&it.risk.length?' · <b style="color:#f0a500">CHECK: '+esc(it.risk.join(", "))+'</b>':'')+'</div>';
  if(withLinks) h += '<div style="margin-top:8px"><a href="'+link(it.id,"remove")+'" style="color:#ff7a7a">Remove</a> &nbsp; <a href="'+link(it.id,"keep")+'" style="color:#00d8f0">Keep</a></div>';
  return h+'</div>';
}

/* Called from system-edit after a successful save. items = [{field,url}]. */
export async function queuePhotos(items, meta, extraRisk){
  if(!items.length) return;
  var q = await loadQueue(), now = Date.now(), instant = [];
  items.forEach(function(p){
    var risk = (extraRisk||[]).slice();
    if(p.tiny) risk.push("tiny or broken image");
    var it = { id: now.toString(36)+Math.random().toString(36).slice(2,7), field:p.field, url:p.url,
      galaxy:meta.galaxy, address:meta.address, key:meta.key, editor:meta.editor||"", ts:now, status:"new", risk:risk, emailed:risk.length>0 };
    q.items.push(it);
    if(risk.length) instant.push(it);
  });
  q.items = q.items.filter(function(i){ return i.status==="new" ? (now - i.ts) < AGE_OFF_MS*3 : (now - i.ts) < AGE_OFF_MS; });
  await saveQueue(q);
  if(instant.length){
    try { await sendEmail("[NMS Map] Photo to check ("+instant[0].risk.join(", ")+")", instant.map(function(i){return itemCard(i,true);}).join("")+'<p><a href="'+reviewLink()+'">Open review page</a></p>'); } catch(e){}
  }
}

export async function flagEmail(what, meta, words){
  try {
    await sendEmail("[NMS Map] Flagged wording in a "+what+" save",
      '<p>A '+esc(what)+' save has wording to check (matched: '+esc(words.join(", "))+').</p><p>System '+esc(meta.address)+' (galaxy '+esc(meta.galaxy)+'), by '+esc(meta.editor||"anonymous")+'.</p><p><a href="'+SITE+'/preview.html?galaxy='+esc(meta.galaxy)+'#'+esc(meta.address)+'">Open on the map</a></p>');
  } catch(e){}
}
