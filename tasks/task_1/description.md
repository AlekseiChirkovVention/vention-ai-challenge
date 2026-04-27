# Task 1 — Company Leader Board Clone

## 1. Goal

Build a static frontend SPA that visually and functionally replicates Vention's internal "Company Leader Board 2025" page (provided in screenshots). Deploy it to GitHub Pages. No backend. No real corporate data.

This document fully specifies the architecture and implementation. **Do not make architectural decisions.** Only implement what is described below.

## 2. Hard constraints

- No real names, real job titles, real department names, real photos. All data must be synthetic.
- No extra features beyond what is listed in section 5.
- No backend, no database, no auth.
- No state management library (no Redux/Zustand/Jotai). Use only React `useState` / `useMemo`.
- No UI component library (no MUI, no shadcn, no Ant). Only TailwindCSS + `lucide-react` icons.
- No routing library. Single page.
- All data is loaded from a static JSON file bundled with the app.

## 3. Tech stack (locked)

- **Build tool**: Vite (latest stable)
- **Language**: TypeScript
- **Framework**: React 18
- **Styling**: TailwindCSS v3 (do not use v4)
- **Icons**: `lucide-react`
- **Avatars**: `https://i.pravatar.cc/150?img=<n>` where `n` is 1..70
- **Deployment**: GitHub Pages via GitHub Actions workflow
- **Package manager**: npm

## 4. Repository layout (locked)

```
/
├── README.md                  # short: what it is + live link + run instructions
├── report.md                  # write-up: tools, techniques, data replacement approach
├── tasks/task_1/description.md
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts             # must set `base: '/<repo-name>/'`
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── index.css              # tailwind directives
    ├── App.tsx
    ├── types.ts
    ├── data/employees.json
    └── components/
        ├── Header.tsx
        ├── Filters.tsx
        ├── Podium.tsx
        ├── LeaderList.tsx
        └── LeaderRow.tsx
```

## 5. UI specification

The page contains exactly these sections, in this order, inside a centered white card on a light gray page background (`bg-slate-100`, card `bg-white rounded-md shadow-sm p-8 max-w-5xl mx-auto`):

### 5.1 Header (`Header.tsx`)
- Title: `Leaderboard` — `text-2xl font-semibold`
- Subtitle: `Top performers based on contributions and activity` — `text-sm text-slate-500`

### 5.2 Filters (`Filters.tsx`)
A horizontal row, gray rounded panel (`bg-slate-50 border rounded-md p-3 flex gap-3 items-center`):
- `<select>` Years: options `All Years`, `2025`, `2024`, `2023`
- `<select>` Quarters: options `All Quarters`, `Q1`, `Q2`, `Q3`, `Q4`
- `<select>` Categories: options `All Categories`, `LAB`, `PEG`, `UNI`, `EDU`
- `<input type="text">` placeholder `Search employee...` with `Search` icon from lucide. Takes remaining width (`flex-1`).

All four controls actually filter the list (see section 7).

### 5.3 Podium (`Podium.tsx`)
Three columns, flex, items aligned to bottom. Order left-to-right: rank 2, rank 1, rank 3.

Each column has, top to bottom:
1. Circular avatar (`w-20 h-20 rounded-full`) with a small colored numeric badge at bottom-right showing the rank:
   - rank 1 → `bg-yellow-400`
   - rank 2 → `bg-slate-400`
   - rank 3 → `bg-amber-700`
2. Name (`font-semibold`)
3. Title + deptCode in muted small text: `<title> (<deptCode>)`
4. Star + total in blue: lucide `Star` filled `text-blue-500` + number `text-blue-500 font-semibold`
5. A large rectangular podium block with the rank number rendered very large and faded inside it:
   - rank 1: `bg-yellow-300 h-40`
   - rank 2: `bg-slate-200 h-28`
   - rank 3: `bg-slate-200 h-24`
   - All blocks share the same width; rank 1 visually taller.

Avatar for rank 1 is larger (`w-24 h-24`).

### 5.4 Leader list (`LeaderList.tsx` + `LeaderRow.tsx`)
A vertical stack of rows starting at rank 1 (yes, rank 1 appears both on podium and as the first row — this matches the original). Each row is a white card with border (`border rounded-md p-3 flex items-center gap-4`):

Left to right inside a row:
- Rank number: `text-slate-400 w-8 text-center` (large for rank 1..3, regular otherwise — keep simple: same style for all)
- Avatar: `w-10 h-10 rounded-full`
- Name + title block (column):
  - Name `font-semibold text-sm`
  - `<title> (<deptCode>)` `text-xs text-slate-500`
- Spacer (`flex-1`)
- Category icons cluster: for each category in `['LAB','PEG','UNI','EDU']`, if `categories[cat] > 0`, render the icon (size 16, `text-blue-500`) with the number below it (`text-xs text-slate-500`). Use these lucide icons:
  - LAB → `FlaskConical`
  - PEG → `Mic`
  - UNI → `GraduationCap`
  - EDU → `Presentation`
- TOTAL block: small uppercase label `TOTAL` (`text-[10px] text-slate-400`) above a row of `Star` (filled, `text-blue-500`) + number (`text-blue-500 font-semibold`)
- A `ChevronDown` icon at far right (decorative, no click handler)

Render all employees that pass the filter, sorted by `total` descending. The list must scroll naturally with the page.

## 6. Data specification

### 6.1 Type (`src/types.ts`)
```ts
export type Category = 'LAB' | 'PEG' | 'UNI' | 'EDU';

export interface Employee {
  id: string;
  name: string;
  title: string;
  deptCode: string;
  avatar: string;
  year: 2023 | 2024 | 2025;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  categories: Record<Category, number>;
  total: number;
}
```

### 6.2 Generation rules for `src/data/employees.json`
- Exactly **40** employee records.
- `id`: `"e1"`..`"e40"`.
- `name`: synthetic. Use a fixed pool of obviously fictional first names and last names (e.g. `Alex`, `Jordan`, `Sam`, `Taylor`, `Morgan`, `Casey`, `Riley`, `Jamie`, `Robin`, `Drew` + last names `Fakename`, `Placeholder`, `Sample`, `Demo`, `Testov`, `Mockley`, `Dummy`, `Synthetic`, `Generic`, `Stub`). Combine to get 40 unique names. Do **not** use names that resemble real Belarusian/Russian/Ukrainian names.
- `title`: pick from `['Software Engineer', 'Senior Software Engineer', 'Lead Engineer', 'QA Engineer', 'Senior QA Engineer', 'Group Manager', 'HR Manager', 'Marketing Manager', 'Designer', 'Product Manager']`.
- `deptCode`: pattern `XX.U#.D#.G#` with random uppercase letters and digits 1-3. E.g. `AA.U1.D2.G1`. Purely synthetic — do not use real Vention codes like `SK`, `BY`, `TGU`, `IPSD`, `MU`.
- `avatar`: `https://i.pravatar.cc/150?img=<n>` where `n = (index % 70) + 1`.
- `year`: distribute among 2023/2024/2025 (majority 2025).
- `quarter`: distribute among Q1..Q4.
- `categories`: each value 0..10, ensure at least one is > 0.
- `total`: integer between 5 and 600. Make sure values vary so sorting is meaningful. The first record after sorting should be ~536-ish to mirror screenshot scale.

The JSON file is hand-written (committed); do not generate at runtime.

## 7. Filtering & sorting logic (locked)

In `App.tsx` keep state:
```ts
const [year, setYear] = useState<'all'|2023|2024|2025>('all');
const [quarter, setQuarter] = useState<'all'|'Q1'|'Q2'|'Q3'|'Q4'>('all');
const [category, setCategory] = useState<'all'|Category>('all');
const [search, setSearch] = useState('');
```

Compute via `useMemo`:
```ts
const filtered = employees
  .filter(e => year === 'all' || e.year === year)
  .filter(e => quarter === 'all' || e.quarter === quarter)
  .filter(e => category === 'all' || e.categories[category] > 0)
  .filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()))
  .slice()
  .sort((a, b) => b.total - a.total);
```

- Podium: `filtered.slice(0, 3)` — order them as [rank2, rank1, rank3] visually.
- List: `filtered` (full, including top 3).
- If `filtered.length < 3`, render only the available podium slots (no placeholders).
- If `filtered.length === 0`, show centered text `No employees match the filters.` instead of podium and list.

No debouncing. No URL sync. No localStorage.

## 8. Deployment (locked)

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/vention-ai-challenge/',
});
```

`.github/workflows/deploy.yml`: on push to `main`, run `npm ci && npm run build`, then upload `dist/` to GitHub Pages using `actions/upload-pages-artifact` + `actions/deploy-pages`. Use `permissions: { contents: read, pages: write, id-token: write }` and `concurrency: { group: 'pages' }`.

After deploy, verify the site loads at `https://<user>.github.io/vention-ai-challenge/`.

## 9. report.md content (required)

Must contain these sections (short, 1–3 paragraphs each):
1. **Approach** — vibe-coding workflow used (Cascade / Windsurf, prompting style).
2. **Tools** — list of tools (IDE, AI assistant, libraries).
3. **Data replacement** — how synthetic data was constructed; explicit statement that no corporate data was sent to AI tools.
4. **Trade-offs** — what was simplified vs original (e.g. comments section excluded as it is a SharePoint platform feature, not part of the leaderboard widget).
5. **Live link** — URL of deployed GitHub Pages site.

## 10. README.md content (required)

- One-line description.
- Live demo link.
- Local run: `npm install && npm run dev`.
- Build: `npm run build`.
- Link to `report.md` and `tasks/task_1/description.md`.

## 11. Acceptance checklist

- [ ] App runs locally via `npm run dev` with no console errors.
- [ ] All four filter controls visibly affect the rendered list and podium.
- [ ] Sorting is by `total` descending at all times.
- [ ] Podium shows 3 employees with correct visual ordering (2-1-3) and rank 1 highlighted yellow & taller.
- [ ] Each list row shows rank, avatar, name, title+code, category icons with counts (only for non-zero categories), TOTAL with star, chevron.
- [ ] No real Vention names, titles, dept codes, or photos in the repo.
- [ ] `report.md` exists and covers all sections from §9.
- [ ] GitHub Actions workflow deploys successfully; live URL is reachable and renders the app.
- [ ] `git status` is clean; only intended files committed.

## 12. Out of scope (do NOT implement)

- SharePoint top navigation bar and breadcrumbs from the screenshots.
- Comments section at the bottom of the screenshots.
- Expanding a row on chevron click.
- Pagination or virtualization.
- Dark mode.
- Tests.
- i18n.
- Accessibility beyond what Tailwind defaults give (no aria audits required).
