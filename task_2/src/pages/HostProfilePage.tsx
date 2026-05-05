import { API_URL } from "../lib/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";



type HostData = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  contact_email: string;
  logo_url: string | null;
  created_at: string;
  events: unknown[];
};

export default function HostProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [host, setHost] = useState<HostData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const res = await fetch(`${API_URL}/api/hosts/${slug}`);
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        setHost(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchHost();
  }, [slug]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (notFound) return <div className="p-6 text-center text-gray-500">Host not found</div>;
  if (!host) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Helmet>
        <title>{host.name} — Hosts</title>
        <meta property="og:title" content={host.name} />
        <meta property="og:description" content={host.bio ?? ""} />
        <meta property="og:image" content={host.logo_url ?? ""} />
        <meta property="og:url" content={window.location.href} />
      </Helmet>
      <div className="flex items-center gap-4 mb-6">
        {host.logo_url ? (
          <img src={host.logo_url} alt={`${host.name} logo`} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
            {host.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold">{host.name}</h1>
      </div>

      {host.bio && <p className="text-gray-700 mb-4">{host.bio}</p>}

      <p className="text-sm text-gray-500 mb-8">
        Contact: <a href={`mailto:${host.contact_email}`} className="underline">{host.contact_email}</a>
      </p>

      <h2 className="text-lg font-semibold mb-3">Events</h2>
      {(host.events as any[]).length === 0 ? (
        <p className="text-gray-400 text-sm">No events yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {(host.events as any[]).map((evt: any) => {
            const isPast = new Date(evt.date) < new Date();
            return (
              <a key={evt.id} href={`/events/${evt.id}`} className="border rounded p-3 block hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{evt.title}</span>
                  {isPast && <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">Ended</span>}
                </div>
                <p className="text-sm text-gray-500">{new Date(evt.date).toLocaleDateString()}</p>
                {evt.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{evt.description}</p>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
