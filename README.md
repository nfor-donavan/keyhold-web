# Keyhold Admin (web)

The office/admin side of Keyhold — *a product of Nexus Tech Labs.*

The mobile app is the field tool (inspections, repairs, land site visits). This
site is for the office: dashboard and KPIs, reviewing inspections and photos,
managing properties / land / maintenance / leases in bulk, rent-group overview,
team and invite codes, and CSV exports. Same API, same data as the mobile app.

No build step: plain HTML + ES modules.

## Run it locally

```bash
npm start        # serves this folder at http://localhost:5173
```

(or open the folder with VS Code's "Live Server" extension)

## Point it at your API

Edit the one line in `js/config.js`:

```js
export const API_URL = "https://keyhold-server.onrender.com";
```

Use your real Render URL (no trailing slash).

## Deploy to Vercel

1. Push this folder to its own GitHub repo (e.g. `keyhold-web`).
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework Preset: **Other**. Leave **Build Command** empty. Set **Output Directory** to `.`
4. Deploy. Every `git push` to `main` redeploys automatically.

## Project layout

```
index.html            entry page
css/styles.css        light + dark theme
js/config.js          API URL
js/api.js             fetch wrapper, retries while Render wakes up
js/auth.js            login / register / join, session
js/resources.js       ★ one entry per module: columns, form fields, detail view
js/views/             dashboard, generic list+form, team, login
js/app.js             shell + hash router
assets/               Keyhold icon + Nexus Tech Labs emblem (light/dark)
```

## Adding a module

1. Add the model + route on the API (see the server README).
2. Add one entry to `RESOURCES` in `js/resources.js`.

Search, sorting, filters, CSV export, create/edit/delete and the detail modal
come for free; the sidebar link appears automatically.

## Roles

- **Owner** (whoever registered the organization): everything, plus the Team page.
- **Member** (joined with an invite code): all data, no Team page.

## Security notes

- Everything from the API is rendered as text (never `innerHTML`), and links from
  user-entered data are restricted to http(s).
- The login token is kept in `localStorage`, which is common for this kind of
  token-based app. For a larger production rollout, consider httpOnly cookies.
- CSV exports neutralise spreadsheet formula injection.
