# ARK Fitness v2 — Barbell Era

Personal training tracker built for the ARK plan: Push → Legs → Pull → Sculptor rotation with progressive overload as the core engine.

## What's new in v2

- **Barbell-era plan**: Barbell Bench Press (Push), Barbell Back Squat (Legs), Trap-Bar/Barbell Deadlift (Pull) as MAIN lifts with heavier rest periods and safety-first coaching notes
- **Rest timer**: auto-starts after every logged set (per-exercise durations), floating countdown with skip
- **Exercise alternatives**: every movement has swap options for when equipment is busy — each alternate keeps its own progression history
- **Readiness score (0–100)**: computed from rest days, consecutive training days, and Acute:Chronic Workload Ratio (ACWR) — the same fatigue metric used in sports science
- **Smart daily recommendation**: train / active-recovery cardio / rest, based on your actual history
- **Insights dashboard**: weekly report vs last week, 12-week consistency heatmap, 8-week volume trend, Big-3 estimated-1RM strength curves (Epley), muscle balance with imbalance flags, stalled-lift detection with deload advice
- **Cardio logging**: zone-2 sessions tracked separately — never advances the lifting rotation
- **Bodyweight tracking**: 7-day moving average, weekly rate, projected date to hit 78 kg
- **PR detection**: automatic, stored per session, celebrated on finish
- **Export / Import**: full JSON backup for moving between devices or URLs

## Your data — read this before deploying

Data lives in browser `localStorage` under the key `ark_fitness_v3` — **the same key as v1, so updating the app in place keeps all history automatically**. Old-format data is migrated on load with zero loss (all legacy exercises like Goblet Squats remain browsable in History).

**localStorage is per-domain.** If you switch URLs (e.g., local → GitHub Pages, or GitHub Pages → Vercel), the new URL starts empty. Before switching:

1. Old URL → Settings (gear icon) → **Export Backup**
2. New URL → Settings → **Import from File** (or paste the JSON)

Do this backup occasionally anyway — clearing browser data wipes localStorage.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a repo and push this folder
2. Repo → Settings → Pages → Source: **GitHub Actions**
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`
4. App appears at `https://<username>.github.io/<repo>/`

## Deploy to Vercel (alternative)

Import the repo at vercel.com — zero config needed (Vite is auto-detected).

## Add to iPhone home screen

Open the deployed URL in Safari → Share → **Add to Home Screen**. Runs fullscreen like a native app with the ARK icon.

## Editing the plan

All exercises, sets/reps, starting weights, rest times, and alternatives live in `src/data.js`. Analytics and progression rules live in `src/engine.js`. UI in `src/App.jsx`.
