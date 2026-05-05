import { API_URL } from "../lib/api";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getToken } from "../lib/auth";



type InviteInfo = { hostName: string; hostSlug: string; role: string };

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "accepting" | "already_member" | "invalid">("loading");
  const [error, setError] = useState<string | null>(null);
  const [memberSlug, setMemberSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/invite/${token}`);
        if (res.status === 404) { setStatus("invalid"); return; }
        const data = await res.json();
        setInfo(data);
        setStatus("ready");
      } catch {
        setStatus("invalid");
      }
    };
    fetchInfo();
  }, [token]);

  const handleAccept = async () => {
    setStatus("accepting");
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.status === 409) {
        setStatus("already_member");
        setMemberSlug(info?.hostSlug ?? null);
        return;
      }
      if (!res.ok) { setError(data.error || "Something went wrong"); setStatus("ready"); return; }
      navigate(`/hosts/${data.host.slug}`);
    } catch {
      setError("Something went wrong");
      setStatus("ready");
    }
  };

  if (status === "loading") return <div className="p-6 text-center">Loading invitation...</div>;

  if (status === "invalid") {
    return (
      <div className="max-w-md mx-auto py-10 px-4 text-center">
        <p className="text-gray-500">This invite link is invalid or has expired.</p>
      </div>
    );
  }

  if (status === "already_member") {
    return (
      <div className="max-w-md mx-auto py-10 px-4 text-center">
        <p className="mb-4">You're already a member of this host.</p>
        {memberSlug && <Link to={`/hosts/${memberSlug}`} className="underline">Go to host page</Link>}
      </div>
    );
  }

  const roleLabel = info?.role === "host" ? "Host" : "Checker";

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-center">
      <h1 className="text-xl font-bold mb-2">You've been invited!</h1>
      <p className="mb-6 text-gray-600">
        Join <span className="font-semibold">{info?.hostName}</span> as <span className="font-semibold">{roleLabel}</span>
      </p>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={status === "accepting"}
        className="bg-black text-white rounded px-6 py-2 disabled:opacity-50"
      >
        {status === "accepting" ? "Accepting..." : "Accept Invitation"}
      </button>
    </div>
  );
}
