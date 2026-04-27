# Report — Vention Company Leaderboard Clone

## Approach

The work was split across three AI tools, each playing a distinct role:

1. **Planning — ChatGPT:** Used in the early stage to break down the task, identify the key UI regions (podium, filters, leaderboard table, activity drawer), and define a rough component structure before any code was written.
2. **Architecture — Claude:** Used to design the data model (`Employee`, `Category`, filter/sort logic), decide on the technology stack, and plan the folder structure and component responsibilities.
3. **Implementation — Claude Code + Claude slash commands:** The actual source files were generated and iteratively refined using Claude Code (Anthropic's CLI) running inside the Windsurf IDE. Claude slash commands (`/phase-pipeline`, `/phase-execution`, `/phase-validation`, etc.) drove a structured Discovery → Execution → Validation workflow, ensuring each requirement was verified before moving on.

## Tools

- **Planning:** ChatGPT
- **Architecture:** Claude (claude.ai)
- **Implementation:** Claude Code CLI (claude-sonnet-4-6) + Claude slash commands inside Windsurf IDE
- **Build tool:** Vite 6 with @vitejs/plugin-react
- **Language / framework:** TypeScript 5, React 18
- **Styling:** TailwindCSS v3 (utility-first; no custom CSS beyond the three Tailwind directives)
- **Icons:** lucide-react
- **Avatar placeholders:** pravatar.cc (public CDN, no account required)
- **Deployment:** GitHub Actions → GitHub Pages (actions/upload-pages-artifact + actions/deploy-pages)
- **Package manager:** npm

## Data replacement

All 40 employee records are purely synthetic: first names are drawn from a fixed pool of gender-neutral English names (Alex, Jordan, Sam, Taylor, Morgan, Casey, Riley, Jamie, Robin, Drew) and last names are obviously fictional (Fakename, Placeholder, Sample, Demo, Testov, Mockley, Dummy, Synthetic, Generic, Stub). Department codes follow the pattern `XX.U#.D#.G#` with randomly chosen uppercase letters — no real Vention location or department codes (such as SK, BY, TGU, IPSD, MU) were used. Avatars are fetched from `https://i.pravatar.cc/150?img=<n>` (public placeholder images). No corporate names, titles, photos, or department identifiers were sent to any AI tool at any point.

## Trade-offs

The original leaderboard lives inside a SharePoint site that includes a top navigation bar and breadcrumb trail — those are platform chrome, not part of the leaderboard widget, so they were excluded. Each row supports expand/collapse to reveal a per-employee activity breakdown (category, title, date, points), which is implemented via the `ActivityDetails` component. Pagination and virtualization were omitted because 40 rows scroll naturally without them. No dark mode, tests, or i18n were added, as none were part of the requirements.

## Live link

https://alekseichirkov.github.io/vention-ai-challenge/
