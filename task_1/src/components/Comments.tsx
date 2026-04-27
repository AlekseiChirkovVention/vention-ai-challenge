import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';

type Tab = 'newest' | 'oldest' | 'popular';

interface Comment {
  id: string;
  name: string;
  avatar: string;
  text: string;
  date: string;
  likes: number;
  edited?: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'popular', label: 'Popular' },
];

export default function Comments() {
  const [tab, setTab] = useState<Tab>('newest');
  const [draft, setDraft] = useState('');
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

  const sorted = [...comments].sort((a, b) => {
    if (tab === 'popular') return b.likes - a.likes;
    const da = a.date.split('/').reverse().join('');
    const db = b.date.split('/').reverse().join('');
    return tab === 'newest' ? db.localeCompare(da) : da.localeCompare(db);
  });

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <img
          src="https://i.pravatar.cc/150?img=12"
          alt="me"
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
          placeholder="Add a comment"
          className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button
          onClick={submitComment}
          className="ml-2 px-4 py-2 text-sm bg-slate-800 text-white rounded-full hover:bg-slate-700 disabled:opacity-40"
          disabled={!draft.trim()}
        >
          Post
        </button>
      </div>

      <div className="flex gap-4 border-b text-sm mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2 -mb-px border-b-2 transition-colors ${
              tab === t.id
                ? 'border-slate-800 text-slate-800 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {sorted.map(c => (
          <div key={c.id} className="flex gap-3">
            <img
              src={c.avatar}
              alt={c.name}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-semibold text-sm text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400 shrink-0">{c.date}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line mt-0.5">{c.text}</p>
              {c.edited && (
                <p className="text-[11px] text-slate-400 italic mt-1">Edited {c.date}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <button className="hover:text-slate-700">Reply</button>
                <span className="flex items-center gap-1">
                  <ThumbsUp size={12} /> {c.likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
