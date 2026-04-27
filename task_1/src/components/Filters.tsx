import { Search } from 'lucide-react';
import type { Category } from '../types';

interface FiltersProps {
  year: 'all' | 2023 | 2024 | 2025;
  quarter: 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: 'all' | Category;
  search: string;
  onYear: (v: 'all' | 2023 | 2024 | 2025) => void;
  onQuarter: (v: 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4') => void;
  onCategory: (v: 'all' | Category) => void;
  onSearch: (v: string) => void;
}

export default function Filters({ year, quarter, category, search, onYear, onQuarter, onCategory, onSearch }: FiltersProps) {
  return (
    <div className="bg-slate-50 border rounded-md p-3 flex gap-3 items-center mb-6">
      <select
        className="border rounded px-2 py-1.5 text-sm bg-white"
        value={String(year)}
        onChange={e => {
          const v = e.target.value;
          onYear(v === 'all' ? 'all' : (Number(v) as 2023 | 2024 | 2025));
        }}
      >
        <option value="all">All Years</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
        <option value="2023">2023</option>
      </select>

      <select
        className="border rounded px-2 py-1.5 text-sm bg-white"
        value={quarter}
        onChange={e => onQuarter(e.target.value as 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4')}
      >
        <option value="all">All Quarters</option>
        <option value="Q1">Q1</option>
        <option value="Q2">Q2</option>
        <option value="Q3">Q3</option>
        <option value="Q4">Q4</option>
      </select>

      <select
        className="border rounded px-2 py-1.5 text-sm bg-white"
        value={category}
        onChange={e => onCategory(e.target.value as 'all' | Category)}
      >
        <option value="all">All Categories</option>
        <option value="LAB">LAB</option>
        <option value="PEG">PEG</option>
        <option value="UNI">UNI</option>
        <option value="EDU">EDU</option>
      </select>

      <div className="flex items-center gap-2 flex-1 border rounded px-2 py-1.5 bg-white">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          className="flex-1 text-sm outline-none bg-transparent"
          placeholder="Search employee..."
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
