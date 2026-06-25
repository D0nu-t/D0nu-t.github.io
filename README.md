# Portfolio Site — Setup Guide

## What this is

Static portfolio site built with TypeScript + Vite. Deploys automatically to GitHub Pages via GitHub Actions on every push to `main`. No framework, no component library — vanilla TypeScript compiled through Vite for fast dev and optimised output.

---

## Prerequisites

- Node.js ≥ 18 (check: `node -v`)
- npm ≥ 9 (check: `npm -v`)
- A GitHub account
- Git installed

---

## Step 1 — Create the GitHub repo

1. Go to github.com and click **New repository**.
2. Name it exactly `<your-github-username>.github.io` (e.g. `D0nu-t.github.io`).
   This special name tells GitHub to serve the site at `https://D0nu-t.github.io` with no path prefix.
   If you use any other repo name, the site deploys at `https://D0nu-t.github.io/repo-name/` and you'll need to update `base: './'` in `vite.config.ts` accordingly.
3. Set visibility to **Public** (required for the free GitHub Pages tier).
4. Do **not** initialise with a README — you'll push your own files.

---

## Step 2 — Clone and copy files

```bash
# Clone your empty repo
git clone https://github.com/D0nu-t/D0nu-t.github.io.git
cd D0nu-t.github.io

# Copy every file from this portfolio-site folder into it
cp -r /path/to/portfolio-site/. .
```

Your folder should look like this:

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── styles/
│   │   └── main.css
│   ├── main.ts
│   └── types.ts
├── projects/
│   └── interpretability-platform.html
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Step 3 — Install dependencies locally

```bash
npm install
```

This creates `node_modules/` with Vite and TypeScript. It is git-ignored automatically since `node_modules` is in `.gitignore` (add one if you haven't — see below).

Add a `.gitignore`:

```
node_modules/
dist/
.DS_Store
*.local
```

---

## Step 4 — Add your résumé

Put your résumé PDF in the repo root, named exactly `resume.pdf`. The download buttons on the site already point to this path.

```bash
cp /path/to/your/resume.pdf ./resume.pdf
```

---

## Step 5 — Run locally to check everything

```bash
npm run dev
```

Vite starts a dev server at `http://localhost:5173`. Open it in a browser. Check:

- Hero renders with the SVG cluster diagram
- Status bar pip animates
- Work cards display
- The interpretability platform project page loads at `/projects/interpretability-platform.html`
- Scroll reveals trigger as you scroll down

---

## Step 6 — Enable GitHub Pages (first time only)

1. In your repo on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. That's it. The Actions workflow in `.github/workflows/deploy.yml` handles the rest.

---

## Step 7 — Push and deploy

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

GitHub Actions picks up the push, runs `npm ci && npm run build`, and deploys the `dist/` folder to Pages. You can watch the deployment in the **Actions** tab of your repo. First deploy takes about 90 seconds. Subsequent pushes are faster.

Your site is live at: `https://D0nu-t.github.io`

---

## Step 8 — Add remaining project pages

Copy `projects/interpretability-platform.html` as a template for PolicySwarm and TinyNLA:

```bash
cp projects/interpretability-platform.html projects/policy-simulator.html
cp projects/interpretability-platform.html projects/tinynla.html
```

Edit each copy:
- Update the `<title>` and `<meta name="description">`.
- Rewrite the header title, dek, and chips.
- Replace the body content (metrics, body text, figures, callouts).
- Update the TOC links to match your new section `id` attributes.

Then link them from `index.html` — find the two work cards that say "Write-up in progress" and replace the static text with:

```html
<a class="card-link" href="projects/policy-simulator.html">Read write-up</a>
```

---

## Development reference

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with HMR at localhost:5173 |
| `npm run build` | Type-check + compile to `dist/` |
| `npm run preview` | Preview the built `dist/` locally before pushing |

---

## Customisation quick-reference

All design tokens live in the `:root` block at the top of `src/styles/main.css`.

To change the accent colour from mint-green to something else, update these three variables:

```css
--green-bright: #4ade80;
--green-mid:    #86efac;
--green-deep:   #166534;
--green-glow:   #4ade8033;
```

The SVG diagrams on both pages use these same CSS variables via `fill="var(--green-bright)"`, so they update automatically.

---

## Adding a custom domain (optional)

1. Buy a domain from any registrar (Namecheap, Cloudflare, etc.).
2. In your registrar's DNS settings, add a CNAME record: `www → D0nu-t.github.io`.
3. Add a file named `CNAME` to the repo root containing just your domain:
   ```
   www.krishnasaiaddala.com
   ```
4. In GitHub → Settings → Pages → Custom domain, enter your domain.
5. Check "Enforce HTTPS" once DNS propagates (usually under 10 minutes with Cloudflare).
