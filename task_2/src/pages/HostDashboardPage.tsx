import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";



interface DashboardData {
  host: { id: string; name: string; slug: string; logo_url: string | null; bio: string | null };
  upcoming: Array<{ event: any; stats: { going: number; waitlist: number; checked_in: number } }>;
  past: Array<{ event: any; stats: { going: number; waitlist: number; checked_in: number } }>;
  pending_reports_count: number;
}

export default function HostDashboardPage() {
  const { hostId } = useParams<{ hostId: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState<"host" | "checker">("checker");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!token || !hostId) return;
    fetch(`${API_URL}/api/hosts/${hostId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, hostId]);

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setInviteUrl(null);
    setInviteCopied(false);
    try {
      const res = await fetch(`${API_URL}/api/hosts/${hostId}/invite-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      });
      if (res.ok) {
        const d = await res.json();
        setInviteUrl(d.inviteUrl);
      }
    } catch { /* ignore */ }
    finally { setInviteLoading(false); }
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const handleExportCsv = async (eventId: string) => {
    const res = await fetch(`${API_URL}/api/events/${eventId}/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "attendees.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-8 bg-muted rounded w-48" /></div>;
  }

  if (!data) {
    return <div className="p-6"><p className="text-red-500">Failed to load dashboard</p></div>;
  }

  const items = tab === "upcoming" ? data.upcoming : data.past;

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {data.host.logo_url && (
          <img src={data.host.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        )}
        <h1 className="text-2xl font-bold">{data.host.name}</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("upcoming")}
          className={`border rounded px-3 py-1.5 text-sm ${tab === "upcoming" ? "bg-foreground text-background" : ""}`}
        >
          Upcoming ({data.upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`border rounded px-3 py-1.5 text-sm ${tab === "past" ? "bg-foreground text-background" : ""}`}
        >
          Past ({data.past.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No {tab} events.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(({ event, stats }) => (
            <div key={event.id} className="border rounded p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link to={`/events/${event.id}`} className="font-medium hover:underline">
                    {event.title}
                  </Link>
                  {event.hidden && (
                    <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">Hidden</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{stats.going} going</span>
                  <span>{stats.checked_in} checked in</span>
                  <span>{stats.waitlist} waitlist</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {tab === "upcoming" && (
                  <>
                    <Link to={`/events/${event.id}/checkin`} className="border rounded px-2 py-1 text-xs">
                      Check-in
                    </Link>
                  </>
                )}
                <button
                  onClick={() => handleExportCsv(event.id)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  Export CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 border rounded p-4">
        <h2 className="text-lg font-semibold mb-3">Invite Members</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => { setInviteRole(e.target.value as "host" | "checker"); setInviteUrl(null); }}
              className="border rounded px-3 py-2"
            >
              <option value="checker">Checker</option>
              <option value="host">Host</option>
            </select>
          </div>
          <button
            onClick={handleGenerateInvite}
            disabled={inviteLoading}
            className="border rounded px-4 py-2 text-sm bg-foreground text-background disabled:opacity-50"
          >
            {inviteLoading ? "Generating..." : "Generate Invite Link"}
          </button>
        </div>
        {inviteUrl && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="border rounded px-3 py-2 flex-1 text-sm font-mono bg-muted/30"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopyInvite}
              className="border rounded px-3 py-2 text-sm whitespace-nowrap"
            >
              {inviteCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
