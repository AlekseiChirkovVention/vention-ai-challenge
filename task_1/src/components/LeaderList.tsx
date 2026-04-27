import type { Employee } from '../types';
import LeaderRow from './LeaderRow';

interface LeaderListProps {
  employees: Employee[];
  rankOf: (id: string) => number;
}

export default function LeaderList({ employees, rankOf }: LeaderListProps) {
  return (
    <div className="flex flex-col gap-2">
      {employees.map(employee => (
        <LeaderRow key={employee.id} employee={employee} rank={rankOf(employee.id)} />
      ))}
    </div>
  );
}
