/* ============================================================
   NMS Galactic Map — feedback Netlify Function
   Endpoint: /.netlify/functions/feedback

   POST body: { category, message, repro, device, contact }
     category = one of CATEGORIES below (falls back to "Other")
     message  = required, what happened / what they'd like (<=800 chars)
     repro    = optional, steps to reproduce a bug (<=500 chars)
     device   = optional, device/browser (<=100 chars) -- client
                auto-fills this from navigator.userAgent, editable
     contact  = optional, how to reach them back (<=100 chars)

   General site feedback -- deliberately separate from the two existing
   report flows, which are both about a SPECIFIC system:
     - system-edit.mjs's "report" action -- inappropriate content on a system
     - flag-dispute.mjs -- a data dispute on a system's fields
   This one isn't tied to any address at all. Tony's ask (2026-08-16): a way
   to hear from players without exposing a personal email, reusing the
   GitHub Issues + no-account-form combo already chosen for the site's
   in-game data reporting.

   Unlike flag-dispute.mjs's best-effort Issue creation (which has
   overrides.json's flagMeta as a fallback record if Issues:write is
   missing from the token), general feedback has NO fallback store -- if
   the Issue doesn't get created, the feedback has nowhere to live at all.
   So this function hard-fails with a clear error rather than silently
   "succeeding" with no visible trace anywhere. That means the existing
   GITHUB_TOKEN needs "Issues: Read and write" permission for this to work
   at all, not just for optional notifications -- check that on the
   fine-grained PAT's permission list if feedback submissions start failing.

   Rate limiting is intentionally in-memory only, NOT persisted to
   data/overrides.json the way editLog/reportLog/flagLog are. General site
   feedback has nothing to do with per-system data, so it doesn't need a
   durable cross-cold-start store -- the worst case of an imperfect
   in-memory cap (a function instance recycling and forgetting recent hits)
   is a few extra GitHub Issues, which GitHub's own abuse controls and
   Tony's own moderation already cover. Not worth coupling this unrelated
   feature's write traffic into the same precious shared file every system
   edit/report/flag already writes to.
   ============================================================ */

import { filterText } from "./filter.mjs";
import { json, GITHUB_OWNER, GITHUB_REPO } from "./lib/shared.mjs";

const MAX_FEEDBACK_PER_IP_PER_HOUR = 5;
const CATEGORIES = ["Bug/glitch", "Feature idea", "Something looks wrong", "Other"];
const HOUR = 3600 * 1000;

// Module-scope, so it persists across warm invocations of the same function
// instance (not across cold starts -- see header comment on why that's an
// accepted tradeoff here).
var _feedbackLog = {};
function hitsInLastHour(ip, now) {
  var kept = (_feedbackLog[ip] || []).filter(function (ts) { return now - ts < HOUR; });
  _feedbackLog[ip] = kept;
  return kept.length;
}

async function openGithubIssue(token, category, message, repro, device, contact) {
  var titleMsg = message.length > 60 ? message.slice(0, 60) + "..." : message;
  var title = "[Feedback] " + category + ": " + titleMsg;
  var bodyLines = ["**Category:** " + category, "", "**Message:**", message];
  if (repro) bodyLines.push("", "**Steps to reproduce:**", repro);
  if (device) bodyLines.push("", "**Device/browser:** " + device);
  if (contact) bodyLines.push("", "**Contact:** " + contact);
  bodyLines.push("", "_Submitted via the site's Feedback form, not tied to any specific system._");
  var res = await fetch("https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/issues", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "nms-galactic-map-function"
    },
    body: JSON.stringify({ title: title, body: bodyLines.join("\n"), labels: ["feedback"] })
  });
  if (!res.ok) {
    var errText = await res.text();
    throw new Error("write failed: " + res.status + " " + errText);
  }
  var j = await res.json();
  return j.html_url || null;
}

export default async (req, context) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });

  var token = process.env.GITHUB_TOKEN;
  if (!token) return json(500, { ok: false, error: "Server not configured (missing GITHUB_TOKEN)." });

  var body;
  try { body = await req.json(); }
  catch (e) { return json(400, { ok: false, error: "Invalid JSON body" }); }

  var category = CATEGORIES.indexOf(body.category) >= 0 ? body.category : "Other";

  var msgR = filterText(body.message, { maxLen: 800, allowNewlines: true, fieldName: "Message" });
  if (!msgR.ok) return json(422, { ok: false, error: msgR.reason });
  if (!msgR.cleaned) return json(400, { ok: false, error: "Please describe what happened or what you'd like." });

  var reproR = filterText(body.repro, { maxLen: 500, allowNewlines: true, fieldName: "Steps to reproduce" });
  if (!reproR.ok) return json(422, { ok: false, error: reproR.reason });

  var deviceR = filterText(body.device, { maxLen: 100, fieldName: "Device/browser" });
  if (!deviceR.ok) return json(422, { ok: false, error: deviceR.reason });

  var contactR = filterText(body.contact, { maxLen: 100, fieldName: "Contact" });
  if (!contactR.ok) return json(422, { ok: false, error: contactR.reason });

  var ip = req.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
  var now = Date.now();
  if (hitsInLastHour(ip, now) >= MAX_FEEDBACK_PER_IP_PER_HOUR) {
    return json(429, { ok: false, error: "Too much feedback from this connection in the last hour. Try again later." });
  }

  var issueUrl;
  try {
    issueUrl = await openGithubIssue(token, category, msgR.cleaned, reproR.cleaned, deviceR.cleaned, contactR.cleaned);
  } catch (e) {
    return json(502, { ok: false, error: "Could not submit feedback: " + e.message });
  }

  _feedbackLog[ip] = (_feedbackLog[ip] || []).concat(now);

  return json(200, { ok: true, issueUrl: issueUrl });
};

export const config = { path: "/.netlify/functions/feedback" };
