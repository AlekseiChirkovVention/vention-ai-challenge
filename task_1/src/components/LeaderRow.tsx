import { Star, ChevronDown, FlaskConical, Mic, GraduationCap, Presentation } from 'lucide-react';
import type { Employee, Category } from '../types';

interface LeaderRowProps {
  employee: Employee;
  rank: number;
}

const categoryIcons: Record<Category, React.ReactNode> = {
  LAB: <FlaskConical size={16} className="text-blue-500" />,
  PEG: <Mic size={16} className="text-blue-500" />,
  UNI: <GraduationCap size={16} className="text-blue-500" />,
  EDU: <Presentation size={16} className="text-blue-500" />,
};

const categoryOrder: Category[] = ['LAB', 'PEG', 'UNI', 'EDU'];

export default function LeaderRow({ employee, rank }: LeaderRowProps) {
  return (
    <div className="border rounded-md p-3 flex items-center gap-4">
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
      <ChevronDown size={16} className="text-slate-400 ml-2 shrink-0" />
    </div>
  );
}
