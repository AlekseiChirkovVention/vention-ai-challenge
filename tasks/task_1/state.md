---
task: tasks/task_1/description.md
updated: 2026-04-27
---

## Phases
- discovery: complete
- execution: complete
- validation: complete

## Summary
Build a static frontend SPA replicating Vention's Company Leader Board 2025 page. Deploy to GitHub Pages. No backend. Synthetic data only.

## Solution Design
Architecture: Single-page React 18 + Vite + TypeScript SPA with TailwindCSS v3, lucide-react icons, static JSON data (40 synthetic employees), deployed to GitHub Pages via GitHub Actions.

Tech stack locked by spec: Vite (latest), TypeScript, React 18, TailwindCSS v3, lucide-react, npm.

No state management library, no routing library, no UI component library — only React useState/useMemo.

### Autonomous Decision
No architectural decisions required. Task description explicitly states: "Do not make architectural decisions. Only implement what is described below." All design choices are prescribed in the spec.

## Subtask Progress

### T-01 — Project scaffolding
Status: not-started
Files: index.html, package.json, tsconfig.json, vite.config.ts, tailwind.config.js, postcss.config.js, src/main.tsx, src/index.css

### T-02 — Types and static data
Status: not-started
Files: src/types.ts, src/data/employees.json

### T-03 — App.tsx filtering/sorting logic
Status: not-started
Files: src/App.tsx

### T-04 — Header and Filters components
Status: not-started
Files: src/components/Header.tsx, src/components/Filters.tsx

### T-05 — Podium component
Status: not-started
Files: src/components/Podium.tsx

### T-06 — LeaderList and LeaderRow components
Status: not-started
Files: src/components/LeaderList.tsx, src/components/LeaderRow.tsx

### T-07 — GitHub Actions deploy workflow
Status: not-started
Files: .github/workflows/deploy.yml

### T-08 — README and report
Status: not-started
Files: README.md, report.md
