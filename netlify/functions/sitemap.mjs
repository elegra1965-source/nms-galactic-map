/* ============================================================
   Live sitemap (2026-10-30)

   Bing Webmaster asked for a sitemap that is refreshed at least daily.
   The map's content really does change most days (travellers chart and
   edit systems), but the old static sitemap.xml only got a new <lastmod>
   when the site was deployed. This serves /sitemap.xml (config.path below; a function
   path wins over the static file) with an honest date: the newer of
     - the last traveller edit (last commit touching data/overrides.json)
     - the last deploy (written into lib/deploy-date.mjs by the build)
   No deploys needed; cached 1 hour at Netlify's edge, so at most ~24
   GitHub calls a day. Falls back to the deploy date if GitHub fails.
   ============================================================ */
import DEPLOY_DATE from "./lib/deploy-date.mjs";
// Same values as lib/shared.mjs (not imported, so this tiny function doesn't pull in @netlify/blobs).
const GITHUB_OWNER = "elegra1965-source", GITHUB_REPO = "nms-galactic-map", GITHUB_BRANCH = "main", DATA_PATH = "data/overrides.json";

const SITE = "https://map.nomansskyhub.app";
const PAGES = [
  { loc: "/", freq: "daily", pri: "1.0", live: true },
  { loc: "/community", freq: "daily", pri: "0.8", live: true },
  { loc: "/navigator/index.html", freq: "weekly", pri: "0.7", live: false },
];

async function lastDataEdit() {
  try {
    const url = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO +
      "/commits?path=" + encodeURIComponent(DATA_PATH) + "&sha=" + GITHUB_BRANCH + "&per_page=1";
    const headers = { "Accept": "application/vnd.github+json", "User-Agent": "nms-galmap-sitemap" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(url, { headers, signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const d = j && j[0] && j[0].commit && j[0].commit.committer && j[0].commit.committer.date;
    return /^\d{4}-\d{2}-\d{2}/.test(d || "") ? d.slice(0, 10) : null;
  } catch (e) { return null; }
}

export function buildXml(deployDate, dataDate) {
  const live = dataDate && dataDate > deployDate ? dataDate : deployDate;
  const rows = PAGES.map((p) =>
    "  <url>\n    <loc>" + SITE + p.loc + "</loc>\n    <lastmod>" + (p.live ? live : deployDate) +
    "</lastmod>\n    <changefreq>" + p.freq + "</changefreq>\n    <priority>" + p.pri + "</priority>\n  </url>");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    rows.join("\n") + "\n</urlset>\n";
}

export default async () => {
  const xml = buildXml(DEPLOY_DATE, await lastDataEdit());
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
    },
  });
};

export const config = { path: "/sitemap.xml" };
