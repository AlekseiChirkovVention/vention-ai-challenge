import { Star } from 'lucide-react';
import type { Employee } from '../types';

interface PodiumProps {
  employees: Employee[];
  rankOf: (id: string) => number;
}

interface SlotProps {
  employee: Employee;
  rank: 1 | 2 | 3;
}

const AVATAR_BORDER: Record<1 | 2 | 3, { color: string; width: string }> = {
  1: { color: '#F5A623', width: '3px' },
  2: { color: '#B0BEC5', width: '2px' },
  3: { color: '#B0BEC5', width: '2px' },
};

const BADGE_BG: Record<1 | 2 | 3, string> = {
  1: '#F5A623',
  2: '#B0BEC5',
  3: '#795548',
};

const BLOCK_BG: Record<1 | 2 | 3, string> = {
  1: '#F5C842',
  2: '#E0E4EA',
  3: '#E0E4EA',
};

const BLOCK_NUMBER_COLOR: Record<1 | 2 | 3, string> = {
  1: '#C8890A',
  2: '#9BA8BB',
  3: '#9BA8BB',
};

const BLOCK_HEIGHT: Record<1 | 2 | 3, number> = {
  1: 160,
  2: 112,
  3: 112,
};

function PodiumSlot({ employee, rank }: SlotProps) {
  const avatarSize = rank === 1 ? 80 : 65;
  const isFirst = rank === 1;
  const { color: borderColor, width: borderWidth } = AVATAR_BORDER[rank];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      {/* Avatar */}
      <div style={{ position: 'relative', width: avatarSize, height: avatarSize, marginBottom: 8 }}>
        <img
          src={employee.avatar}
          alt={employee.name}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `${borderWidth} solid ${borderColor}`,
            display: 'block',
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: BADGE_BG[rank],
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
      </div>

      {/* Name */}
      <p
        style={{
          fontWeight: 700,
          color: '#1a1a1a',
          fontSize: 16,
          margin: '0 0 2px',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {employee.name}
      </p>

      {/* Title */}
      <p
        style={{
          color: '#757575',
          fontSize: 12,
          fontWeight: 400,
          margin: '0 0 8px',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {employee.title}
      </p>

      {/* Star score pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isFirst ? '#F5A623' : '#ffffff',
          border: isFirst ? 'none' : '1px solid #CFD4DC',
          borderRadius: 20,
          padding: '6px 16px',
          marginBottom: 10,
        }}
      >
        <Star
          size={14}
          fill={isFirst ? '#ffffff' : '#F5A623'}
          color={isFirst ? '#ffffff' : '#F5A623'}
        />
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: isFirst ? '#ffffff' : '#1a1a1a',
          }}
        >
          {employee.total}
        </span>
      </div>

      {/* Podium block (avatar overlaps top slightly via negative margin) */}
      <div
        style={{
          width: '100%',
          height: BLOCK_HEIGHT[rank],
          background: BLOCK_BG[rank],
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginTop: -6,
        }}
      >
        <span
          style={{
            fontSize: 90,
            fontWeight: 900,
            color: BLOCK_NUMBER_COLOR[rank],
            opacity: 0.45,
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}

export default function Podium({ employees, rankOf }: PodiumProps) {
  if (employees.length === 1) {
    const sole = employees[0];
    return (
      <div
        style={{ background: '#ffffff', display: 'flex', alignItems: 'flex-end', gap: 16 }}
        className="mb-8 px-4"
      >
        <div style={{ flex: 1 }} />
        <PodiumSlot employee={sole} rank={rankOf(sole.id) as 1 | 2 | 3} />
        <div style={{ flex: 1 }} />
      </div>
    );
  }

  const byRank = (r: 1 | 2 | 3) => employees.find(e => rankOf(e.id) === r);
  const first = byRank(1);
  const second = byRank(2);
  const third = byRank(3);

  return (
    <div
      style={{ background: '#ffffff', display: 'flex', alignItems: 'flex-end', gap: 16 }}
      className="mb-8 px-4"
    >
      {second ? <PodiumSlot employee={second} rank={2} /> : <div style={{ flex: 1 }} />}
      {first ? <PodiumSlot employee={first} rank={1} /> : <div style={{ flex: 1 }} />}
      {third ? <PodiumSlot employee={third} rank={3} /> : <div style={{ flex: 1 }} />}
    </div>
  );
}
