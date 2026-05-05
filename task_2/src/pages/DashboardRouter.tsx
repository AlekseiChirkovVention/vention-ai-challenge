import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";



export default function DashboardRouter() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/my-hosts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const hostRoles = data.items.filter((m: any) => m.role === "host");
      setHosts(hostRoles);

      if (hostRoles.length === 0) {
        navigate("/hosts/new", { replace: true });
      } else if (hostRoles.length === 1) {
        navigate(`/hosts/${hostRoles[0].host_id}/dashboard`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHosts(); }, [token]);

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchHosts} className="border rounded px-4 py-2">Retry</button>
      </div>
    );
  }

  if (hosts.length >= 2) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Select a Host</h1>
        <div className="flex flex-col gap-3">
          {hosts.map((m) => (
            <button
              key={m.host_id}
              onClick={() => navigate(`/hosts/${m.host_id}/dashboard`)}
              className="border rounded px-4 py-3 text-left hover:bg-muted/50"
            >
              <span className="font-medium">{m.host.name}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return null;
}
