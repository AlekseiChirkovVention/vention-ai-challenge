import { API_URL } from "../lib/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../lib/auth";



export default function CreateHostPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!name.trim() || name.trim().length > 100) return "Name is required (1-100 characters)";
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) return "A valid contact email is required";
    if (logoUrl.trim()) {
      try { new URL(logoUrl.trim()); } catch { return "Logo URL must be a valid URL"; }
    }
    if (bio.length > 1000) return "Bio must be 1000 characters or fewer";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/hosts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || undefined,
          contact_email: contactEmail.trim(),
          logo_url: logoUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      navigate(`/hosts/${data.slug}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Create a Host</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Cool Event Co."
            disabled={loading}
            className="border rounded px-3 py-2 w-full"
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact Email *</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="hello@example.com"
            disabled={loading}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about your organization..."
            disabled={loading}
            className="border rounded px-3 py-2 w-full"
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 mt-1">{bio.length}/1000</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            disabled={loading}
            className="border rounded px-3 py-2 w-full"
          />
          <p className="text-xs text-gray-400 mt-1">Enter a publicly accessible image URL</p>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
          {loading ? "Creating..." : "Create Host"}
        </button>
      </form>
    </div>
  );
}
