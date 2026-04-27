# Report — Vention Company Leaderboard Clone

## Approach

The implementation followed a spec-driven, vibe-coding workflow using Claude Code (Anthropic's CLI AI assistant) inside the Windsurf IDE. The task description was treated as the single source of truth: every component, type, filter behavior, and deployment detail was prescribed by the spec, so no architectural decisions were needed. The AI assistant generated all files in one continuous pass following the phase-pipeline workflow (Discovery → Execution → Validation), ensuring the spec was read and understood before a single line of code was written.

## Tools

- **IDE:** Windsurf with Claude Code CLI (claude-sonnet-4-6)
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

The original Vention leaderboard lives inside a SharePoint site that includes a top navigation bar, breadcrumb trail, and a threaded comments section at the bottom. These are SharePoint platform chrome, not part of the leaderboard widget itself, so they were explicitly excluded per §12 of the task spec. The chevron icon on each row is decorative only (row expansion was out of scope). Pagination and virtualization were omitted because 40 rows scroll naturally. No dark mode, tests, or i18n were implemented, again per the spec's out-of-scope list.

## Live link

https://alekseichirkov.github.io/vention-ai-challenge/
