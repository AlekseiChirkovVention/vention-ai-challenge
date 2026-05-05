import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import TicketCard from "../components/TicketCard";

interface Ticket {
  id: string;
  code: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    description: string | null;
    hidden?: boolean;
  };
}



export default function TicketsPage() {
  const { token } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchTickets() {
      try {
        const res = await fetch(`${API_URL}/api/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          setError("Session expired, please log in again");
          return;
        }

        if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);

        const data = await res.json();
        setTickets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [token]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Tickets</h1>

      {loading ? (
        <p>Loading tickets...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : tickets.length === 0 ? (
        <p>No upcoming tickets.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              id={ticket.id}
              code={ticket.code}
              event={ticket.event}
            />
          ))}
        </div>
      )}
    </main>
  );
}
