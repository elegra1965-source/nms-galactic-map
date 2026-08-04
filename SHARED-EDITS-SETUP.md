# Setting up shared system edits (Tony — do this yourself, plain English)

This lets any visitor type in their real in-game system data (name, race,
economy, conflict, planets/moons, resources, notes) and have it show up for
**every** visitor from then on, replacing the made-up procedural data for
that one address. Nothing about this changes how the map works if you skip
this setup — it just falls back to procedural-only, silently.

Three things need doing, all one-time, all on GitHub.com and Netlify.com in
your browser. I can't do any of these for you — they involve creating an
account/token, which I'm not allowed to do on your behalf.

## 1. Put this project on GitHub

If `NMS Galactic Map` isn't already a GitHub repo:
1. Go to github.com, sign in (or create a free account), click **New repository**.
2. Name it e.g. `nms-galactic-map`. Keep it Public or Private, your call — Private
   is fine, the site itself is still public even if the code repo isn't.
3. Upload the whole `NMS Galactic Map` folder's contents to it (drag-and-drop
   on the GitHub web UI works for this, or ask me to walk you through git if
   you'd rather use that).

## 2. Create a GitHub token (lets the site save edits back to the repo)

1. On GitHub: click your profile picture → **Settings** → **Developer settings**
   (bottom of the left sidebar) → **Personal access tokens** → **Fine-grained tokens**
   → **Generate new token**.
2. Give it a name like `nms-galmap-edits`.
3. Under **Repository access**, choose **Only select repositories** and pick
   your `nms-galactic-map` repo — not all repos.
4. Under **Permissions** → **Repository permissions**, find **Contents** and
   set it to **Read and write**. Leave everything else as No access.
5. Generate the token and **copy it immediately** — GitHub only shows it once.
   Paste it somewhere safe for the next step.

## 3. Connect Netlify to GitHub and add the token

This project currently deploys by dragging the folder onto Netlify. That
method **can't** run the backend piece (Netlify Functions need a real git
connection to build). Switching is a one-time change:

1. In Netlify, open this site → **Site configuration** → **Build & deploy** →
   **Link repository** (or **Site settings** → **Build & deploy** → **Link to Git**).
2. Authorize Netlify to see your GitHub account, pick the `nms-galactic-map`
   repo, branch `main`.
3. Build settings: leave **Build command** empty, **Publish directory** `.`
   (a dot) — the `netlify.toml` already in this folder handles the rest
   (functions directory, and making `preview.html` serve at the site root).
4. Go to **Site configuration** → **Environment variables** → **Add a variable**:
   - Key: `GITHUB_TOKEN`
   - Value: the token you copied in step 2
   - Scope: leave default (all deploy contexts)
5. Optional but recommended — add a second variable so you get a private
   link to see reported systems:
   - Key: `ADMIN_TOKEN`
   - Value: any password-like string you make up (e.g. `atlas-review-8843`)
6. Trigger a deploy (Netlify usually does this automatically once linked, or
   click **Trigger deploy** → **Deploy site**).

## After it's live

- Edits: click any system → **Edit system** → fill in your real in-game
  data → **Save**. It's live for every visitor immediately.
- Reports: **Report** button on any system flags it.
- To see what's been reported, open this in your browser (bookmark it):
  `https://<your-site>.netlify.app/.netlify/functions/system-edit?token=<your ADMIN_TOKEN>`
  — this returns raw JSON with a `reports` list. There's no pretty page for
  this yet; ask me to build a simple one anytime.
- Every edit is a real commit to the GitHub repo, so full history/revert is
  free — look at `data/overrides.json`'s file history on github.com any time.
- If you ever want to widen or trim the blocked-word list, it lives in
  `netlify/functions/filter.mjs` (`BAD_WORDS` near the top) — same list is
  mirrored client-side in `preview.html` (search `CHECK_WORDS`) purely for
  instant feedback; keep both in sync if you edit it.

## If something's not working

The site never breaks if this isn't set up — it just silently stays
procedural-only. If edits stop saving after it WAS working, the most likely
causes are: the `GITHUB_TOKEN` expired or was revoked, or the token's repo
access got changed. Regenerate a token (step 2) and update the Netlify env
var (step 4) if so.

**Error says `GitHub write failed: 404 ...Not Found`** — the site can't find
the repo at all. Check `GITHUB_OWNER`/`GITHUB_REPO` at the top of
`netlify/functions/system-edit.mjs` match your actual github.com username
and repo name exactly.

**Error says `GitHub write failed: 403 ...Resource not accessible by
personal access token`** — the repo was found but the token can't write to
it. Fine-grained tokens bind to a *specific* repo, not just its name — if
you ever delete and recreate the `nms-galactic-map` repo (e.g. to fix a
Netlify link issue) after already creating the token, the old token won't
carry over to the "new" repo even though the name matches. Fix: generate a
fresh fine-grained token (step 2) pointed at the current repo with Contents
set to Read and write, then update `GITHUB_TOKEN` in Netlify (step 4) and
trigger a redeploy.
