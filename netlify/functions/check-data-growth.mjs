/* ============================================================
   NMS Galactic Map — check-data-growth Netlify Scheduled Function
   Runs @daily (same cadence as sweep-stale-flags.mjs).

   Watches data/overrides.json's raw size as the leading indicator for
   the "split overrides.json by galaxy" rework Tony and Claude discussed
   (2026-09-03) -- NOT needed for launch, and this function doesn't fix
   anything itself, it just tells Tony when it's worth planning that
   work: as the one shared file keeps growing, every edit's read-merge-
   write round trip gets slower and 409 sha-conflicts (two people
   editing near-simultaneously) get more frequent. Better to get an
   early nudge than to notice only once visitors start complaining.

   Tracks its own tiny state in Netlify Blobs (previous size/date, and
   which warning tier was last emailed) so it only emails ONCE per tier
   crossed, not every single day after -- same store the GET-response
   cache uses (lib/shared.mjs), different key, so no extra Netlify
   config beyond what the cache fix already needed.

   Requires two Netlify env vars in addition to the existing GITHUB_TOKEN:
     RESEND_API_KEY   -- free at resend.com; Contents: sending only, no
                         domain verification needed if using their
                         onboarding@resend.dev sender address (below)
     NOTIFY_EMAIL_TO  -- Tony's real email address
   Site settings -> Environment variables, same place GITHUB_TOKEN and
   ADMIN_TOKEN already live (see SHARED-EDITS-SETUP.md).
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { githubGetFile } from "./lib/shared.mjs";

// ~1.5x the 1.3MB size that prompted this whole conversation -- an early
// heads-up, not a fire alarm.
const WARN_BYTES = 2 * 1024 * 1024;
// Where Claude suggested it's actually worth planning the per-galaxy split,
// rather than reacting once writes are visibly slow or conflicts pile up.
const ACT_BYTES = 3.5 * 1024 * 1024;

const STATE_STORE = "nms-galmap-cache";
const STATE_KEY = "growth-monitor-state";

function tierFor(bytes){
  if(bytes >= ACT_BYTES) return 2;
  if(bytes >= WARN_BYTES) return 1;
  return 0;
}
const TIER_LABEL = { 1: "WARNING", 2: "ACTION NEEDED" };

async function sendEmail(subject, html){
  var key = process.env.RESEND_API_KEY;
  var to = process.env.NOTIFY_EMAIL_TO;
  if(!key || !to) return { skipped: true, reason: "RESEND_API_KEY or NOTIFY_EMAIL_TO not set" };
  var res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer "+key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NMS Galactic Map <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html
    })
  });
  if(!res.ok) throw new Error("Resend send failed: "+res.status+" "+(await res.text()));
  return { sent: true };
}

export default async (req) => {
  var token = process.env.GITHUB_TOKEN;
  if(!token) return new Response("Skipped: no GITHUB_TOKEN configured", {status:200});

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return new Response("Could not read shared data store: "+e.message, {status:200}); }

  var bytes = Buffer.byteLength(JSON.stringify(current.data), "utf8");
  var systemCount = Object.keys(current.data.systems||{}).length;
  var now = Date.now();

  var store = getStore(STATE_STORE);
  var state;
  try { state = (await store.get(STATE_KEY, { type: "json" })) || null; }
  catch(e){ state = null; }
  if(!state) state = { lastBytes: null, lastCheckedAt: null, lastNotifiedTier: 0 };

  var tier = tierFor(bytes);
  var growthNote = "";
  if(state.lastBytes != null && state.lastCheckedAt){
    var days = Math.max(1, (now - state.lastCheckedAt) / 86400000);
    var perDay = (bytes - state.lastBytes) / days;
    growthNote = "Growing ~"+Math.round(perDay)+" bytes/day since the last check ("+Math.round(days)+" day(s) ago).";
    if(perDay > 0 && tier < 2){
      var daysToAct = Math.round((ACT_BYTES - bytes) / perDay);
      if(daysToAct > 0 && daysToAct < 365) growthNote += " At this rate, roughly "+daysToAct+" day(s) until the action threshold.";
    }
  }

  var summary = "data/overrides.json: "+bytes+" bytes ("+(bytes/1024/1024).toFixed(2)+"MB), "+systemCount+" systems documented. "+growthNote;

  var notifiedTier = state.lastNotifiedTier;
  if(tier > state.lastNotifiedTier){
    try {
      await sendEmail(
        "[NMS Galactic Map] Data file growth: "+TIER_LABEL[tier],
        "<p><b>"+TIER_LABEL[tier]+"</b> — data/overrides.json has reached "+(bytes/1024/1024).toFixed(2)+"MB ("+systemCount+" systems documented).</p>"+
        "<p>"+growthNote+"</p>"+
        "<p>"+(tier===2
          ? "This is the point flagged as worth planning the per-galaxy split of overrides.json (from the shared-edits growth conversation), rather than letting writes keep slowing and 409 sha-conflicts get more frequent."
          : "No action needed yet — this is just the early warning ahead of the action threshold ("+(ACT_BYTES/1024/1024)+"MB).")+
        "</p>"
      );
      notifiedTier = tier;
    } catch(e){
      // A broken/missing email config shouldn't block recording the new
      // state below -- the next run will just try to notify again.
    }
  }

  try {
    await store.setJSON(STATE_KEY, { lastBytes: bytes, lastCheckedAt: now, lastNotifiedTier: Math.max(notifiedTier, state.lastNotifiedTier) });
  } catch(e){ /* non-fatal: worst case tomorrow's run just re-derives growth from scratch */ }

  return new Response(summary+" | tier="+tier+" (0=ok,1=warn,2=act)", {status:200});
};

export const config = { schedule: "@daily" };
