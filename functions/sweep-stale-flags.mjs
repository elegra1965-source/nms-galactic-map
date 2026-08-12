/* ============================================================
   NMS Galactic Map — sweep-stale-flags Netlify Scheduled Function
   Runs once a day (see `schedule` in config below).

   The "timeout backstop" from EDIT-TRACKING-AND-DISPUTES.md: a flagged
   (amber) field that nobody has voted on or resolved within 7 days
   auto-resolves to whatever value it currently shows and the flag
   clears, so nothing sits in the review queue forever just because
   traffic on that particular system dried up. This deliberately does
   NOT touch disputedFields (red) -- those mean Tony already looked at
   it and confirmed a real problem, so only he (via resolve-flag) or a
   fresh community consensus (via a normal edit -- see
   voteAndMaybeResolve() in system-edit.mjs) should clear one, never a
   timer.

   Netlify scheduled functions run on a cron-style schedule with no
   meaningful request body/params -- this just wakes up, does its
   sweep, and returns. Only commits to GitHub if it actually found and
   cleared something, so a quiet day doesn't add an empty commit.
   ============================================================ */

import { githubGetFile, githubPutFile, invalidateGetCache } from "./lib/shared.mjs";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async (req) => {
  var token = process.env.GITHUB_TOKEN;
  if(!token) return new Response("Skipped: no GITHUB_TOKEN configured", {status:200});

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return new Response("Could not read shared data store: "+e.message, {status:200}); }

  var now = Date.now();
  var cleared = [];

  for(var addr in current.data.systems){
    var sysRec = current.data.systems[addr];
    var flags = sysRec.flaggedFields||[];
    if(!flags.length) continue;
    var stillFlagged = [];
    for(var i=0;i<flags.length;i++){
      var field = flags[i];
      var meta = (sysRec.flagMeta && sysRec.flagMeta[field]) || null;
      var flaggedAt = meta ? meta.flaggedAt : 0;
      if(flaggedAt && (now - flaggedAt) > SEVEN_DAYS_MS){
        cleared.push(addr+"/"+field);
        if(sysRec.flagMeta) delete sysRec.flagMeta[field];
        if(sysRec.fieldVotes) delete sysRec.fieldVotes[field];
        if(!sysRec.history) sysRec.history=[];
        sysRec.history.push({ at: new Date(now).toISOString(), text: field+" auto-resolved (7-day timeout, no consensus reached)" });
        if(sysRec.history.length>30) sysRec.history=sysRec.history.slice(-30);
      } else {
        stillFlagged.push(field);
      }
    }
    sysRec.flaggedFields = stillFlagged;
  }

  if(!cleared.length) return new Response("Nothing to sweep ("+Object.keys(current.data.systems).length+" systems checked)", {status:200});

  try { await githubPutFile(token, current.data, current.sha, "Sweep: auto-resolve "+cleared.length+" stale flag(s)"); }
  catch(e){ return new Response("Sweep found "+cleared.length+" stale flag(s) but failed to save: "+e.message, {status:200}); }

  invalidateGetCache();
  return new Response("Auto-resolved "+cleared.length+" stale flag(s): "+cleared.join(", "), {status:200});
};

export const config = { schedule: "@daily" };
