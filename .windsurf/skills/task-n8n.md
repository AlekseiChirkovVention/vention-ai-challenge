---
trigger: model_decision
description: Use when working on task-3 (n8n workflow design / export)
---
n8n tactics:
- Deliverable is usually a `workflow.json` export + short README with trigger + node list.
- Build minimum nodes: Trigger → Core logic → Output. Add Set/IF nodes only if spec requires.
- Use built-in nodes before Code nodes; Code nodes only when no native node fits.
- Test the workflow once in n8n UI; export via "Download" to keep clean JSON (no execution data).
- README must list: trigger type, required credentials/env, expected input sample, expected output.
- Verify JSON imports cleanly into a fresh n8n instance before submit.
