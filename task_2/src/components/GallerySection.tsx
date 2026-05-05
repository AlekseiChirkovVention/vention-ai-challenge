import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";



interface GallerySectionProps {
  eventId: string;
  isHostMember: boolean;
  hasConfirmedRsvp: boolean;
}

interface Photo {
  id: string;
  image_url: string;
  uploaded_by: string;
  approved: boolean;
  pending_approval: boolean;
  hidden: boolean;
  created_at: string;
}

export default function GallerySection({ eventId, isHostMember, hasConfirmedRsvp }: GallerySectionProps) {
  const { token, isAuthenticated, user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const canUpload = isAuthenticated && (hasConfirmedRsvp || isHostMember);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${API_URL}/api/events/${eventId}/gallery`, { headers })
      .then((r) => r.json())
      .then((data) => setPhotos(data.items || []))
      .catch(() => {});
  }, [eventId, token]);

  const handleUpload = async () => {
    if (!imageUrl.trim() || uploading) return;
    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/gallery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_url: imageUrl.trim() }),
      });
      if (res.ok) {
        const photo = await res.json();
        setPhotos((prev) => [photo, ...prev]);
        setImageUrl("");
        toast.success("Photo uploaded (pending approval)");
      } else {
        const data = await res.json();
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (photoId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/gallery/${photoId}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPhotos((prev) =>
          prev.map((p) => p.id === photoId ? { ...p, approved: true, pending_approval: false } : p)
        );
        toast.success("Photo approved");
      }
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/gallery/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("Photo deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const currentUserId = user?.id;

  return (
    <div className="border-t pt-4 mt-6">
      <h2 className="text-lg font-semibold mb-3">Gallery</h2>

      {canUpload && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL"
            className="border rounded px-3 py-2 text-sm flex-1"
            disabled={uploading}
          />
          <button
            onClick={handleUpload}
            disabled={uploading || !imageUrl.trim()}
            className="border rounded px-4 py-2 text-sm bg-foreground text-background disabled:opacity-50"
          >
            {uploading ? "..." : "Upload"}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded overflow-hidden border">
              <img
                src={photo.image_url}
                alt="Event gallery"
                className="w-full h-40 object-cover"
                loading="lazy"
              />

              {/* Badges */}
              {photo.pending_approval && photo.uploaded_by === currentUserId && (
                <span className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded">
                  Pending approval
                </span>
              )}
              {photo.hidden && isHostMember && (
                <span className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                  Hidden
                </span>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {isHostMember && !photo.approved && (
                  <button
                    onClick={() => handleApprove(photo.id)}
                    className="bg-green-600 text-white text-xs px-2 py-1 rounded"
                  >
                    Approve
                  </button>
                )}
                {(photo.uploaded_by === currentUserId || isHostMember) && (
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="bg-red-600 text-white p-1.5 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
