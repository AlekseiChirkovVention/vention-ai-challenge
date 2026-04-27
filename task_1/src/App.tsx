import { useState, useMemo } from 'react';
import type { Category } from './types';
import employeesData from './data/employees.json';
import type { Employee } from './types';
import Header from './components/Header';
import Filters from './components/Filters';
import Podium from './components/Podium';
import LeaderList from './components/LeaderList';
import Comments from './components/Comments';

const employees = employeesData as Employee[];

export default function App() {
  const [year, setYear] = useState<'all' | 2023 | 2024 | 2025>('all');
  const [quarter, setQuarter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      employees
        .filter(e => year === 'all' || e.year === year)
        .filter(e => quarter === 'all' || e.quarter === quarter)
        .filter(e => category === 'all' || e.categories[category] > 0)
        .filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice()
        .sort((a, b) => b.total - a.total),
    [year, quarter, category, search],
  );

  const rankOf = (id: string) => filtered.findIndex(e => e.id === id) + 1;

  const podiumEmployees = filtered.slice(0, 3);
  const listEmployees = filtered.slice(3);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="bg-white rounded-md shadow-sm p-8 max-w-5xl mx-auto">
        <Header />
        <Filters
          year={year}
          quarter={quarter}
          category={category}
          search={search}
          onYear={setYear}
          onQuarter={setQuarter}
          onCategory={setCategory}
          onSearch={setSearch}
        />
        {filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-16">No employees match the filters.</p>
        ) : (
          <>
            {podiumEmployees.length > 0 && (
              <Podium employees={podiumEmployees} rankOf={rankOf} />
            )}
            <LeaderList employees={listEmployees} rankOf={rankOf} />
            <Comments />
          </>
        )}
      </div>
    </div>
  );
}
