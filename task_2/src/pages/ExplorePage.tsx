import { API_URL } from "../lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import EventCard from "../components/EventCard";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  createdAt: string;
}



export default function ExplorePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [location, setLocation] = useState("");
  const [includePast, setIncludePast] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const locationTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    clearTimeout(locationTimerRef.current);
    locationTimerRef.current = setTimeout(() => setDebouncedLocation(value), 300);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("date_to", new Date(dateTo).toISOString());
      if (debouncedLocation) params.set("location", debouncedLocation);
      if (includePast) params.set("include_past", "true");

      const res = await fetch(`${API_URL}/api/events?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : { data: [] };
      setEvents(data.data ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo, debouncedLocation, includePast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const now = new Date();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Explore Events</h1>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 max-w-2xl">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events..."
          className="border rounded px-3 py-2"
        />

        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        </div>

        <input
          type="text"
          value={location}
          onChange={(e) => handleLocationChange(e.target.value)}
          placeholder="City or address..."
          className="border rounded px-3 py-2"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includePast}
            onChange={(e) => setIncludePast(e.target.checked)}
          />
          Include past events
        </label>
      </div>

      {loading ? (
        <p>Loading events...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              description={event.description}
              date={event.date}
              isPast={new Date(event.date) < now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
