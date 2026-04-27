import type { Employee } from '../types';
import LeaderRow from './LeaderRow';

interface LeaderListProps {
  employees: Employee[];
}

export default function LeaderList({ employees }: LeaderListProps) {
  return (
    <div className="flex flex-col gap-2">
      {employees.map((employee, index) => (
        <LeaderRow key={employee.id} employee={employee} rank={index + 1} />
      ))}
    </div>
  );
}
