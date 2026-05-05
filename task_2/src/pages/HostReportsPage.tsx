import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/api";

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function HostReportsPage() {
  const { hostId } = useParams<{ hostId: string }>();
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hosts/${hostId}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && hostId) fetchReports();
  }, [token, hostId]);

  const handleAction = async (reportId: string, action: "hide" | "dismiss") => {
    setActionLoading(reportId);
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Reports</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : reports.length === 0 ? (
        <p>No pending reports.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Target ID</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.target_type}</td>
                  <td className="p-2 font-mono text-xs">{r.target_id.slice(0, 12)}...</td>
                  <td className="p-2 max-w-xs truncate">{r.reason}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleAction(r.id, "hide")}
                      disabled={actionLoading === r.id}
                      className="border rounded px-2 py-1 text-xs bg-red-500 text-white"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "dismiss")}
                      disabled={actionLoading === r.id}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
