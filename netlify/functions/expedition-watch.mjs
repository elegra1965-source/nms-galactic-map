/* ============================================================
   expedition-watch -- Netlify Scheduled Function (2026-11-25)
   Every 3 hours (so a Wednesday launch, or any other day, is picked up within hours) reads Hello Games'
   news feed, opens any expedition post and saves the schedule in Netlify Blobs
   (store nms-expedition). The sites read it through expedition.mjs, so one check keeps the
   Atlas ticker, countdown and answers, the Hub, the Theme Pack and the Weather alerts right.
   Costs no deploys. Emails Tony (RESEND_API_KEY + NOTIFY_EMAIL_TO, same as the other watchers) when
   a new expedition is found, when a post cannot be read, or when the feed has been unreachable ~24 h.
   Also follows which Galactic Atlas community mission is actually being played (its total moves).
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { SITE, parseFeed, isExpeditionPost, parseRedux, parseLaunch, mergeRuns, runKey, SEED_RUNS, displayName } from "./expedition-lib.mjs";

const STORE = "nms-expedition";
const API = "https://galacticatlas-api.nomanssky.com/api/mission/";
const UA = { "User-Agent": "NMS-Hub-expedition-watch (nomansskyhub.app; fan project)" };

async function sendEmail(subject, html){
  var key = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL_TO;
  if(!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NMS Hub Expedition Watch <onboarding@resend.dev>", to: [to], subject: subject, html: html })
    });
  } catch(e){ /* best effort */ }
}
function dateStr(ms){ return ms ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "unknown"; }

async function get(url){
  var ctl = new AbortController(), t = setTimeout(function(){ ctl.abort(); }, 15000);
  try { var r = await fetch(url, { headers: UA, signal: ctl.signal }); if(!r.ok) throw new Error("HTTP " + r.status); return await r.text(); }
  finally { clearTimeout(t); }
}

async function missionProbe(state, now){
  var base = state.researchBase || 117, hist = state.missions || {}, found = {};
  var ids = []; for(var i = base; i <= base + 8; i++) ids.push(i);
  var res = await Promise.all(ids.map(async function(id){
    try { return [id, JSON.parse(await get(API + id + "?platform=merged"))]; } catch(e){ return [id, null]; }
  }));
  res.forEach(function(p){
    var id = p[0], j = p[1];
    if(!j || typeof j.totalContribution !== "number") return;
    var h = hist[id] || { total: j.totalContribution, changedAt: 0 };
    if(j.totalContribution !== h.total) h = { total: j.totalContribution, changedAt: now };
    hist[id] = h; found[id] = j;
  });
  state.missions = hist;
  var active = 0;
  Object.keys(found).map(Number).sort(function(a, b){ return b - a; }).forEach(function(id){
    if(!active && hist[id].changedAt && now - hist[id].changedAt < 36 * 3600000) active = id;
  });
  state.research = active ? { mission: active, tier: found[active].currentTier, totalTiers: found[active].totalTiers, percentage: found[active].percentage, at: now } : null;
}

export default async function(){
  var store = getStore(STORE), now = Date.now();
  var state = (await store.get("state", { type: "json" }).catch(function(){ return null; })) || {};
  var data = (await store.get("runs", { type: "json" }).catch(function(){ return null; })) || { runs: SEED_RUNS.slice() };
  var before = {}; data.runs.forEach(function(r){ before[runKey(r)] = 1; });
  state.unreadable = state.unreadable || {};

  try {
    var feed = parseFeed(await get(SITE + "/feed/"));
    if(!feed.length) throw new Error("feed had no items");
    state.failCount = 0; state.lastFeedOk = now;
    var posts = feed.filter(function(f){ return isExpeditionPost(f.title); }).slice(0, 4);
    var found = [];
    for(var i = 0; i < posts.length; i++){
      var p = posts[i], got = [];
      try {
        var html = await get(p.link);
        var launchFirst = /^\s*Expedition\s+[^:]+:/i.test(p.title);
        got = launchFirst ? parseLaunch(p.title, html, p.link, p.pubDate) : parseRedux(html, p.link, p.pubDate);
        if(!got.length) got = launchFirst ? parseRedux(html, p.link, p.pubDate) : parseLaunch(p.title, html, p.link, p.pubDate);
      } catch(e){ got = []; }
      if(got.length){ found = found.concat(got); delete state.unreadable[p.link]; }
      else if(!state.unreadable[p.link]){
        state.unreadable[p.link] = now;
        if(now - p.pubDate < 30 * 86400000) await sendEmail("NMS Hub: could not read a Hello Games expedition post",
          "<p>The expedition watch found this post but could not read the schedule from it:</p><p><a href=\"" + p.link + "\">" + p.title + "</a></p>" +
          "<p>The sites keep showing the last known schedule until this is fixed. Send this email to Claude and it will update the reader.</p>");
      }
    }
    if(found.length) data.runs = mergeRuns(data.runs, found);
    var fresh = data.runs.filter(function(r){ return !before[runKey(r)] && (!r.end || r.end > now - 14 * 86400000); });
    if(fresh.length){
      await sendEmail("NMS Hub: new expedition found (" + fresh.map(function(r){ return r.title; }).join(", ") + ")",
        "<p>The expedition watch read Hello Games' news and added:</p><ul>" + fresh.map(function(r){
          return "<li>" + displayName(r) + (r.redux ? " (redux)" : "") + ": " + dateStr(r.start) + " to " + dateStr(r.end) + (r.estimated ? " (end estimated)" : "") + "</li>";
        }).join("") + "</ul><p>All sites pick it up automatically.</p>");
    }
    data.checkedAt = now; data.lastChange = fresh.length ? now : (data.lastChange || 0);
    await store.setJSON("runs", data);
  } catch(e){
    state.failCount = (state.failCount || 0) + 1;
    if(state.failCount === 8) await sendEmail("NMS Hub: expedition watch cannot reach Hello Games", "<p>The Hello Games news feed has not been readable for about 24 hours (" + String(e && e.message) + "). The sites keep showing the last known schedule.</p>");
  }

  try { await missionProbe(state, now); } catch(e){ /* progress only */ }
  await store.setJSON("state", state);
}

export const config = { schedule: "7 */3 * * *" };
