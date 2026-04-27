import type { Employee, Category } from '../types';

interface ActivityDetailsProps {
  employee: Employee;
}

interface Activity {
  title: string;
  category: Category;
  label: string;
  date: string;
  points: number;
}

const CATEGORY_LABEL: Record<Category, string> = {
  LAB: 'Lab Curation',
  PEG: 'Public Speaking',
  UNI: 'University Partnership',
  EDU: 'Education',
};

const TITLES_BY_CATEGORY: Record<Category, string[]> = {
  EDU: [
    'Github Copilot Workshop',
    'PowerPoint Karaoke #3: The New Year playlist',
    'AI Digest #15',
    'AI Digest #13',
    'Building a Web for Humans and Machines',
    'AI Digest #11',
    'AI Digest #10 First Global Edition',
    'AI Panel Discussion with Top Managers',
    'AI Digest #9',
    'AI Digest #8',
    'AI Digest #7',
    'MCP Workshop',
  ],
  PEG: [
    'Internal Tech Talk: React Patterns',
    'Lightning Talk: TypeScript tips',
    'Team Demo: New Design System',
    'Tooling deep-dive session',
  ],
  LAB: [
    'Frontend Lab mentoring',
    'Backend Lab curation',
    'QA Lab office hours',
    'Intern code review session',
  ],
  UNI: [
    'Guest lecture at State University',
    'Academic partnership sync',
    'Career day at Tech University',
    'Thesis mentoring session',
  ],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildActivities(employee: Employee): Activity[] {
  const cats: Category[] = ['EDU', 'PEG', 'LAB', 'UNI'];
  const seed = hash(employee.id);
  const activities: Activity[] = [];

  cats.forEach(cat => {
    const count = Math.min(employee.categories[cat], 6);
    const titles = TITLES_BY_CATEGORY[cat];
    for (let i = 0; i < count; i++) {
      const t = titles[(seed + i) % titles.length];
      const monthIdx = (seed + i * 3 + cats.indexOf(cat) * 2) % 12;
      const day = ((seed + i * 7) % 27) + 1;
      const points = [8, 16, 16, 32, 64][(seed + i) % 5];
      activities.push({
        title: `[${cat}] ${t}`,
        category: cat,
        label: CATEGORY_LABEL[cat],
        date: `${String(day).padStart(2, '0')}-${MONTHS[monthIdx]}-${employee.year}`,
        points,
      });
    }
  });

  return activities;
}

export default function ActivityDetails({ employee }: ActivityDetailsProps) {
  const activities = buildActivities(employee);

  return (
    <div className="bg-slate-50 border-t">
      <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-slate-500 tracking-wide uppercase">
        Recent Activity
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-[1fr_200px_110px_70px] gap-3 px-3 py-2 text-[11px] uppercase text-slate-400 tracking-wide">
          <div>Activity</div>
          <div>Category</div>
          <div>Date</div>
          <div className="text-right">Points</div>
        </div>
        <div className="flex flex-col gap-1.5">
          {activities.length === 0 ? (
            <div className="text-sm text-slate-500 px-3 py-4">No activity yet.</div>
          ) : (
            activities.map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_200px_110px_70px] gap-3 items-center bg-white border rounded-md px-3 py-2 text-sm"
              >
                <div className="text-slate-700 font-medium truncate">{a.title}</div>
                <div>
                  <span className="inline-block bg-slate-100 text-slate-600 text-xs rounded-full px-3 py-0.5">
                    {a.label}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{a.date}</div>
                <div className="text-right text-blue-500 font-semibold">+{a.points}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
