import { Link } from "react-router-dom";

interface EventCardProps {
  id: string;
  title: string;
  description: string | null;
  date: string;
  isPast?: boolean;
}

export default function EventCard({ id, title, description, date, isPast }: EventCardProps) {
  const formattedDate = new Date(date).toLocaleDateString();

  return (
    <Link to={`/events/${id}`} className="block">
      <div className="border rounded p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {isPast && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
              Ended
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
        {description !== null && (
          <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
        )}
      </div>
    </Link>
  );
}
