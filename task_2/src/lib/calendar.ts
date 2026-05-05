function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeICS(text: string): string {
  return text.replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateICS(params: {
  title: string;
  date: string;
  description?: string | null;
  code: string;
}): string {
  const start = new Date(params.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventPlatform//EN",
    "BEGIN:VEVENT",
    `UID:${params.code}@eventplatform`,
    `DTSTAMP:${formatDateUTC(now)}`,
    `DTSTART:${formatDateUTC(start)}`,
    `DTEND:${formatDateUTC(end)}`,
    `SUMMARY:${escapeICS(params.title)}`,
    `DESCRIPTION:${escapeICS(params.description || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
