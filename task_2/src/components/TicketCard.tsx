import { QRCodeSVG } from "qrcode.react";
import { generateICS } from "../lib/calendar";

interface TicketCardProps {
  id: string;
  code: string;
  event: {
    id: string;
    title: string;
    date: string;
    description?: string | null;
    hidden?: boolean;
  };
}

export default function TicketCard({ code, event }: TicketCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString();
  const isHidden = event.hidden === true;

  const handleAddToCalendar = () => {
    const ics = generateICS({
      title: event.title,
      date: event.date,
      description: event.description,
      code,
    });

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const filename =
      event.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") + ".ics";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`border rounded p-4 flex flex-col items-center gap-3 ${isHidden ? "opacity-50" : ""}`}>
      <h2 className="text-lg font-bold">{event.title}</h2>
      {isHidden && (
        <p className="text-xs text-red-500 font-medium">This event has been moderated</p>
      )}
      <p className="text-sm text-gray-500">{formattedDate}</p>
      <QRCodeSVG value={code} size={128} />
      <p className="text-xs text-gray-400 font-mono">{code}</p>
      {!isHidden && (
        <button
          onClick={handleAddToCalendar}
          className="border rounded px-3 py-1 text-sm"
        >
          Add to Calendar
        </button>
      )}
    </div>
  );
}
