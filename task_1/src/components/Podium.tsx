import { Star } from 'lucide-react';
import type { Employee } from '../types';

interface PodiumProps {
  employees: Employee[];
}

interface SlotProps {
  employee: Employee;
  rank: 1 | 2 | 3;
}

const badgeColor: Record<1 | 2 | 3, string> = {
  1: 'bg-yellow-400',
  2: 'bg-slate-400',
  3: 'bg-amber-700',
};

const blockStyle: Record<1 | 2 | 3, string> = {
  1: 'bg-yellow-300 h-40',
  2: 'bg-slate-200 h-28',
  3: 'bg-slate-200 h-24',
};

function PodiumSlot({ employee, rank }: SlotProps) {
  const avatarSize = rank === 1 ? 'w-24 h-24' : 'w-20 h-20';

  return (
    <div className="flex flex-col items-center flex-1">
      <div className="relative mb-2">
        <img
          src={employee.avatar}
          alt={employee.name}
          className={`${avatarSize} rounded-full object-cover`}
        />
        <span
          className={`absolute bottom-0 right-0 ${badgeColor[rank]} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center`}
        >
          {rank}
        </span>
      </div>
      <p className="font-semibold text-sm text-center">{employee.name}</p>
      <p className="text-xs text-slate-500 text-center mb-1">
        {employee.title} ({employee.deptCode})
      </p>
      <div className="flex items-center gap-1 mb-2">
        <Star size={14} fill="currentColor" className="text-blue-500" />
        <span className="text-blue-500 font-semibold text-sm">{employee.total}</span>
      </div>
      <div className={`${blockStyle[rank]} w-full rounded-t-sm flex items-center justify-center`}>
        <span className="text-7xl font-black text-white/40 select-none">{rank}</span>
      </div>
    </div>
  );
}

export default function Podium({ employees }: PodiumProps) {
  const [first, second, third] = employees;

  return (
    <div className="flex items-end gap-2 mb-8">
      {second && <PodiumSlot employee={second} rank={2} />}
      {first && <PodiumSlot employee={first} rank={1} />}
      {third && <PodiumSlot employee={third} rank={3} />}
    </div>
  );
}
