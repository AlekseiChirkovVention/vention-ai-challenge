---
trigger: model_decision
description: Use when working on task-2 (prototyping a small app/UI/service)
---
Prototype tactics:
- Pin stack from spec; if free choice → Vite+React+Tailwind (web) or FastAPI (API). No exotic deps.
- One README run command (`npm run dev` / `uvicorn ...`) — verify it works before extending.
- Build the happy path end-to-end first (UI → call → response). Mock external calls if keys missing.
- Skip auth/persistence unless required by spec.
- Submit checklist: app starts cold from clean clone, demoable in <60s.
