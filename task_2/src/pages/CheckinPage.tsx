import { API_URL } from "../lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";



interface ScanResult {
  id: string;
  code: string;
  attendee: { name: string; email: string };
  checked_in_at: string;
  undone?: boolean;
}

export default function CheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token } = useAuth();
  const [stats, setStats] = useState<{ going: number; checked_in: number; waitlist: number } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    if (!token || !eventId) return;
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/checkin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
  }, [token, eventId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const tick = () => { if (!document.hidden) fetchStats(); };
    fetchStats();
    timer = setInterval(tick, 10000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.warning(`Already checked in at ${data.checked_in_at ? new Date(data.checked_in_at).toLocaleTimeString() : "earlier"}`);
      } else if (res.status === 404 || res.status === 400) {
        toast.error(data.error || "Check-in failed");
      } else if (res.ok && data.success) {
        toast.success(`${data.attendee.name} checked in`);
        setStats((prev) => prev ? { ...prev, checked_in: prev.checked_in + 1 } : prev);
        setRecentScans((prev) => [
          { id: Date.now().toString(), code: trimmed, attendee: data.attendee, checked_in_at: data.checked_in_at },
          ...prev,
        ].slice(0, 10));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      setCode("");
      inputRef.current?.focus();
    }
  };

  const handleUndo = async (scan: ScanResult) => {
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/checkin/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: scan.code }),
      });
      if (res.ok) {
        toast.success("Check-in undone");
        setStats((prev) => prev ? { ...prev, checked_in: Math.max(0, prev.checked_in - 1) } : prev);
        setRecentScans((prev) => prev.map((s) => s.id === scan.id ? { ...s, undone: true } : s));
      } else {
        const data = await res.json();
        toast.error(data.error || "Undo failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg font-medium">Access denied</p>
        <Link to={`/events/${eventId}`} className="text-blue-600 underline">
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Check-in</h1>
        <Link to={`/events/${eventId}`} className="text-sm text-muted-foreground underline">
          Back to event
        </Link>
      </div>

      {stats && (
        <div className="flex gap-4 mb-6">
          <div className="border rounded px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{stats.going}</div>
            <div className="text-xs text-muted-foreground">Going</div>
          </div>
          <div className="border rounded px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{stats.checked_in}</div>
            <div className="text-xs text-muted-foreground">Checked In</div>
          </div>
          <div className="border rounded px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{stats.waitlist}</div>
            <div className="text-xs text-muted-foreground">Waitlist</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter ticket code"
          className="border rounded px-3 py-2 flex-1"
          autoFocus
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="border rounded px-4 py-2 bg-foreground text-background disabled:opacity-50"
        >
          {submitting ? "..." : "Scan"}
        </button>
      </form>

      {recentScans.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2 text-muted-foreground">Recent Scans</h2>
          <div className="flex flex-col gap-2">
            {recentScans.map((scan, index) => (
              <div
                key={scan.id}
                className={`border rounded px-3 py-2 flex items-center justify-between ${scan.undone ? "opacity-50 line-through" : ""}`}
              >
                <div>
                  <span className="font-medium">{scan.attendee.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(scan.checked_in_at).toLocaleTimeString()}
                  </span>
                </div>
                {index === 0 && !scan.undone && (
                  <button
                    onClick={() => handleUndo(scan)}
                    className="text-xs text-red-500 underline"
                  >
                    Undo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
