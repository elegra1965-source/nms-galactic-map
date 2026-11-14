/* Daily digest: one email, only on days with new un-emailed photos. */
import { loadQueue, saveQueue, itemCard, reviewLink, sendEmail } from "./lib/photo-review.mjs";
export default async () => {
  var q = await loadQueue();
  var fresh = q.items.filter(function(i){ return i.status==="new" && !i.emailed; });
  if(!fresh.length) return new Response("nothing new", {status:200});
  try {
    await sendEmail("[NMS Map] "+fresh.length+" new photo"+(fresh.length>1?"s":"")+" today",
      fresh.map(function(i){return itemCard(i,true);}).join("")+'<p><a href="'+reviewLink()+'">Open review page</a></p>');
    fresh.forEach(function(i){ i.emailed = true; });
    q.lastDigest = Date.now();
    await saveQueue(q);
  } catch(e){ return new Response("email failed", {status:200}); }
  return new Response("digest sent "+fresh.length, {status:200});
};
export const config = { schedule: "@daily" };
