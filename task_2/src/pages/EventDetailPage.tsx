import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../context/AuthContext";
import FeedbackSection from "../components/FeedbackSection";
import GallerySection from "../components/GallerySection";
import ReportModal from "../components/ReportModal";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  capacity: number | null;
  coverImageUrl: string | null;
  hostId: string | null;
  hidden: boolean;
  createdAt: string;
}



export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [removed, setRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<"CONFIRMED" | "WAITLISTED" | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [isHostMember, setIsHostMember] = useState(false);
  const [isCheckerOrHost, setIsCheckerOrHost] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/events/${eventId}`, { headers });
        if (!res.ok) throw new Error("Event not found");
        const data = await res.json();
        if (data.removed) {
          setRemoved(true);
        } else {
          setEvent(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId, token]);

  useEffect(() => {
    if (!token) return;

    async function fetchRsvpStatus() {
      try {
        const res = await fetch(`${API_URL}/api/events/${eventId}/rsvp-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRsvpStatus(data.status);
        }
      } catch {
        // silently fail
      }
    }
    fetchRsvpStatus();
  }, [token, eventId]);

  // Check host membership for check-in button
  useEffect(() => {
    if (!token || !eventId) return;
    fetch(`${API_URL}/api/events/${eventId}/checkin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) {
        setIsCheckerOrHost(true);
        setIsHostMember(true); // If they can access check-in stats, they're a host/checker member
      } else if (res.status === 403) {
        // Not a host/checker, but may still be a host member for gallery
        // Try to detect via my-hosts
        if (event?.hostId) {
          fetch(`${API_URL}/api/my-hosts`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()).then(data => {
            const match = data.items?.find((m: any) => m.host_id === event.hostId && m.role === "host");
            if (match) setIsHostMember(true);
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, [token, eventId, event?.hostId]);

  const handleRsvp = async () => {
    if (!isAuthenticated) {
      localStorage.setItem("redirectAfterLogin", `/events/${eventId}`);
      navigate("/login");
      return;
    }

    setRsvpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to RSVP");
      }

      const data = await res.json();
      setRsvpStatus(data.rsvp.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    setRsvpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/rsvp`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to cancel RSVP");
      }

      setRsvpStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6"><p>Loading event...</p></div>;
  }

  if (removed) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="border rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Event Removed</h1>
          <p className="text-muted-foreground">This event has been removed and is no longer available.</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return <div className="p-6"><p className="text-red-500">{error || "Event not found"}</p></div>;
  }

  const isPast = new Date(event.endDate || event.date) <= new Date();

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <Helmet>
        <title>{event.title} — Events</title>
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description ?? ""} />
        <meta property="og:image" content={event.coverImageUrl ?? ""} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
      </Helmet>

      {event.hidden && isHostMember && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-4 py-2 mb-4">
          ⚠️ This event has been hidden due to a report.
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <div className="flex gap-2">
          {isAuthenticated && !isHostMember && (
            <button
              onClick={() => setReportOpen(true)}
              className="border rounded px-3 py-1.5 text-sm text-red-500"
            >
              Report
            </button>
          )}
          {isCheckerOrHost && (
            <Link
              to={`/events/${eventId}/checkin`}
              className="border rounded px-3 py-1.5 text-sm bg-foreground text-background"
            >
              Check-in
            </Link>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-2">{new Date(event.date).toLocaleDateString()}</p>
      {event.capacity !== null && (
        <p className="text-sm text-gray-500 mb-4">Capacity: {event.capacity}</p>
      )}
      {event.description !== null && (
        <p className="text-gray-700 mb-6">{event.description}</p>
      )}

      <div className="border-t pt-4">
        {isPast ? (
          <p className="text-gray-500">Event ended</p>
        ) : rsvpStatus === "CONFIRMED" ? (
          <div className="flex items-center gap-4">
            <p className="text-green-600 font-medium">You're going ✓</p>
            <button
              onClick={handleCancelRsvp}
              disabled={rsvpLoading}
              className="border rounded px-3 py-2 text-red-500"
            >
              {rsvpLoading ? "Cancelling..." : "Cancel RSVP"}
            </button>
          </div>
        ) : rsvpStatus === "WAITLISTED" ? (
          <div className="flex items-center gap-4">
            <p className="text-yellow-600 font-medium">You're on the waitlist</p>
            <button
              onClick={handleCancelRsvp}
              disabled={rsvpLoading}
              className="border rounded px-3 py-2 text-red-500"
            >
              {rsvpLoading ? "Leaving..." : "Leave waitlist"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleRsvp}
            disabled={rsvpLoading}
            className="border rounded px-4 py-2 font-medium"
          >
            {rsvpLoading ? "Submitting..." : "RSVP"}
          </button>
        )}
      </div>

      <FeedbackSection
        eventId={eventId!}
        isPast={isPast}
        hasConfirmedRsvp={rsvpStatus === "CONFIRMED"}
      />

      <GallerySection
        eventId={eventId!}
        isHostMember={isHostMember}
        hasConfirmedRsvp={rsvpStatus === "CONFIRMED"}
      />

      <ReportModal
        targetType="event"
        targetId={eventId!}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setReportOpen(false)}
      />
    </main>
  );
}
