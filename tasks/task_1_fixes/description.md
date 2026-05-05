# Task 1 Fixes — Connect ActivityDetails, Comments, and Submit

## 1. Goal

Three components exist in `task_1/src/components/` but are not wired into the running app:

- `ActivityDetails.tsx` — written, never rendered
- `Comments.tsx` — written, never rendered
- `LeaderRow.tsx` has a decorative `ChevronDown` with no click handler

This task connects all three. **Do not make architectural decisions.** Follow the exact instructions below.

## 2. Hard constraints

- Do not change any component that is not listed in section 5.
- Do not add new files.
- Do not add new dependencies.
- Do not change `employees.json`, `types.ts`, `Podium.tsx`, `Filters.tsx`, `Header.tsx`, `LeaderList.tsx`, or `ActivityDetails.tsx`.
- Do not add error boundaries, loading states, or fallback UI.
- Do not debounce anything.

## 3. Tech stack (unchanged)

React 18, TypeScript, TailwindCSS v3, lucide-react. No new packages.

## 4. Files to modify

Exactly three files:

1. `task_1/src/components/LeaderRow.tsx`
2. `task_1/src/App.tsx`
3. `task_1/src/components/Comments.tsx`

---

## 5. Exact changes

### 5.1 `task_1/src/components/LeaderRow.tsx`

**What is broken:** `ChevronDown` is decorative; `ActivityDetails` is never shown.

**What to add:**

Add `useState` to the import from `'react'`. Add the `ActivityDetails` import.

```tsx
import { useState } from 'react';
import ActivityDetails from './ActivityDetails';
```

Inside `LeaderRow`, add one state variable at the top of the function body:

```tsx
const [open, setOpen] = useState(false);
```

The outermost `<div>` currently is:

```tsx
<div className="border rounded-md p-3 flex items-center gap-4">
```

Replace it with a wrapper that separates the clickable header row from the expandable panel:

```tsx
<div className="border rounded-md overflow-hidden">
  <div
    className="p-3 flex items-center gap-4 cursor-pointer"
    onClick={() => setOpen(o => !o)}
  >
```

Close the inner `<div>` (the clickable row) before closing the outer `<div>`, then append the conditional panel:

```tsx
  </div>
  {open && <ActivityDetails employee={employee} />}
</div>
```

Change the `ChevronDown` className to rotate when open:

```tsx
<ChevronDown
  size={16}
  className={`text-slate-400 ml-2 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
/>
```

**Full resulting structure of the return:**

```tsx
return (
  <div className="border rounded-md overflow-hidden">
    <div
      className="p-3 flex items-center gap-4 cursor-pointer"
      onClick={() => setOpen(o => !o)}
    >
      <span className="text-slate-400 w-8 text-center text-sm">{rank}</span>
      <img
        src={employee.avatar}
        alt={employee.name}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-sm truncate">{employee.name}</span>
        <span className="text-xs text-slate-500 truncate">
          {employee.title} ({employee.deptCode})
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-end gap-3">
        {categoryOrder.map(cat =>
          employee.categories[cat] > 0 ? (
            <div key={cat} className="flex flex-col items-center gap-0.5">
              {categoryIcons[cat]}
              <span className="text-xs text-slate-500">{employee.categories[cat]}</span>
            </div>
          ) : null,
        )}
      </div>
      <div className="flex flex-col items-center ml-4">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">TOTAL</span>
        <div className="flex items-center gap-1">
          <Star size={14} fill="currentColor" className="text-blue-500" />
          <span className="text-blue-500 font-semibold text-sm">{employee.total}</span>
        </div>
      </div>
      <ChevronDown
        size={16}
        className={`text-slate-400 ml-2 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </div>
    {open && <ActivityDetails employee={employee} />}
  </div>
);
```

---

### 5.2 `task_1/src/App.tsx`

**What is broken:** `Comments` is never imported or rendered.

**What to add:**

Add the import at the top of the file (after the existing imports):

```tsx
import Comments from './components/Comments';
```

In the JSX, `Comments` must appear once, after `<LeaderList employees={filtered} />` and before the closing `</>` fragment. The `Comments` component takes no props.

The relevant JSX block changes from:

```tsx
<>
  <Podium employees={filtered.slice(0, 3)} />
  <LeaderList employees={filtered} />
</>
```

to:

```tsx
<>
  <Podium employees={filtered.slice(0, 3)} />
  <LeaderList employees={filtered} />
  <Comments />
</>
```

No other changes in `App.tsx`.

---

### 5.3 `task_1/src/components/Comments.tsx`

**What is broken:** The comment input captures text but has no submit mechanism. Submitted comments are never added to the list.

**What to change:**

Replace the static `const COMMENTS: Comment[]` array declaration with a `useState` call so comments can be appended at runtime.

Current code:

```tsx
const COMMENTS: Comment[] = [
  { ... },
  { ... },
  { ... },
];
```

Replace with (inside the `Comments` function body, after the existing `useState` calls):

```tsx
const [comments, setComments] = useState<Comment[]>([
  {
    id: 'c1',
    name: 'Taylor Placeholder',
    avatar: 'https://i.pravatar.cc/150?img=47',
    text:
      'How to check your contributions:\nClick the arrow next to your name to expand your details. You\'ll see the categories where you earned points — Education, Public Speaking, University Partnership — along with the specific activities and dates.\n\nAbbreviations meaning:\n[LAB] — lab curators, lecturers, and mentors\n[PEG] — speakers at events and internal trainings in locations\n[UNI] — university speakers, academic practice curators, and other activities with universities\n[EDU] — speakers/performers at EDU events',
    date: '25/02/2026',
    likes: 1,
    edited: true,
  },
  {
    id: 'c2',
    name: 'Taylor Placeholder',
    avatar: 'https://i.pravatar.cc/150?img=47',
    text:
      'What counts in 2025:\nEmployees in both production and non-production units can be recognized for: Mentoring, Labs, Public Speaking, DevDev, and University Partnership.\nManagers can be recognized for Public Speaking and University Partnership.',
    date: '25/02/2026',
    likes: 1,
    edited: true,
  },
  {
    id: 'c3',
    name: 'Jordan Sample',
    avatar: 'https://i.pravatar.cc/150?img=32',
    text:
      'The list is in the final check (together with contributors and managers), so this is the moment to take a quick look and make sure nothing important is missing (or accidentally duplicated, especially mentoring).\nIf you spot something off, no drama, just drop an update via this form.\nWe want this thing to stay fair, transparent, and honest. No magic, no guessing.',
    date: '20/02/2026',
    likes: 2,
  },
]);
```

Add a `submitComment` function inside the `Comments` function body, after the `useState` declarations and before the `sorted` computation:

```tsx
function submitComment() {
  const text = draft.trim();
  if (!text) return;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  setComments(prev => [
    ...prev,
    {
      id: `c${Date.now()}`,
      name: 'You',
      avatar: 'https://i.pravatar.cc/150?img=12',
      text,
      date: `${day}/${month}/${year}`,
      likes: 0,
    },
  ]);
  setDraft('');
}
```

Change the `sorted` computation to use the state variable:

```tsx
const sorted = [...comments].sort((a, b) => {
```

(was `[...COMMENTS].sort(...)`)

Change the input to trigger submit on Enter key:

```tsx
<input
  type="text"
  value={draft}
  onChange={e => setDraft(e.target.value)}
  onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
  placeholder="Add a comment"
  className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400"
/>
```

Add a submit button immediately after the `<input>`, inside the same wrapping `<div>`:

```tsx
<button
  onClick={submitComment}
  className="ml-2 px-4 py-2 text-sm bg-slate-800 text-white rounded-full hover:bg-slate-700 disabled:opacity-40"
  disabled={!draft.trim()}
>
  Post
</button>
```

The wrapping div for the input row must also include `items-center` to vertically align the button. It currently is:

```tsx
<div className="flex items-start gap-3 mb-4">
```

Change `items-start` to `items-center`:

```tsx
<div className="flex items-center gap-3 mb-4">
```

---

## 6. Acceptance checklist

- [ ] Clicking any row in the leader list expands to show `ActivityDetails` panel below the row.
- [ ] Clicking the same row again collapses the panel.
- [ ] `ChevronDown` rotates 180° when the row is open.
- [ ] `Comments` section is visible below the leader list on the main page.
- [ ] The comment input accepts text.
- [ ] Pressing Enter or clicking `Post` appends a new comment to the list and clears the input.
- [ ] `Post` button is disabled (visually) when the input is empty.
- [ ] Existing three seed comments remain visible.
- [ ] Sorting tabs (Newest / Oldest / Popular) still work correctly including newly added comments.
- [ ] `npm run dev` starts with no TypeScript or console errors.
- [ ] No new files, no new dependencies.

## 7. Out of scope

- Persisting comments across page reloads (no localStorage, no backend).
- Editing or deleting comments.
- Like button functionality.
- Reply button functionality.
- Any changes to `ActivityDetails.tsx` content or layout.
- Any changes to filtering, sorting, podium, or header logic.
