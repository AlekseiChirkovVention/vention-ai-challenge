import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Star } from "lucide-react";
import { toast } from "sonner";



interface FeedbackSectionProps {
  eventId: string;
  isPast: boolean;
  hasConfirmedRsvp: boolean;
}

interface PublicFeedback {
  average_rating: number;
  count: number;
  items: Array<{ id: string; rating: number; comment: string | null; created_at: string }>;
}

interface OwnFeedback {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function FeedbackSection({ eventId, isPast, hasConfirmedRsvp }: FeedbackSectionProps) {
  const { token, isAuthenticated } = useAuth();
  const [publicData, setPublicData] = useState<PublicFeedback | null>(null);
  const [ownFeedback, setOwnFeedback] = useState<OwnFeedback | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isPast) return;
    fetch(`${API_URL}/api/events/${eventId}/feedback`)
      .then((r) => r.json())
      .then(setPublicData)
      .catch(() => {});
  }, [eventId, isPast]);

  useEffect(() => {
    if (!isPast || !isAuthenticated || !hasConfirmedRsvp || !token) return;
    fetch(`${API_URL}/api/events/${eventId}/feedback?mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOwnFeedback(data.feedback);
        if (data.feedback) {
          setRating(data.feedback.rating);
          setComment(data.feedback.comment || "");
        }
      })
      .catch(() => {});
  }, [eventId, isPast, isAuthenticated, hasConfirmedRsvp, token]);

  if (!isPast) return null;

  const handleSubmit = async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      const isEdit = !!ownFeedback;
      const res = await fetch(`${API_URL}/api/events/${eventId}/feedback`, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setOwnFeedback(data);
        toast.success(isEdit ? "Feedback updated" : "Feedback submitted");
        // Refresh public data
        const pubRes = await fetch(`${API_URL}/api/events/${eventId}/feedback`);
        if (pubRes.ok) setPublicData(await pubRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = ownFeedback
    ? Date.now() - new Date(ownFeedback.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="border-t pt-4 mt-6">
      <h2 className="text-lg font-semibold mb-3">Feedback</h2>

      {publicData && publicData.count > 0 ? (
        <p className="text-sm text-muted-foreground mb-3">
          ⭐ {publicData.average_rating.toFixed(1)} average ({publicData.count} rating{publicData.count !== 1 ? "s" : ""})
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No feedback yet.</p>
      )}

      {isAuthenticated && hasConfirmedRsvp && ownFeedback === undefined && null}

      {isAuthenticated && hasConfirmedRsvp && ownFeedback === null && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setRating(v)} type="button">
                <Star size={24} className={v <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            className="border rounded px-3 py-2 text-sm"
            maxLength={2000}
          />
          <button
            onClick={handleSubmit}
            disabled={rating < 1 || submitting}
            className="border rounded px-4 py-2 text-sm bg-foreground text-background disabled:opacity-50 w-fit"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}

      {isAuthenticated && hasConfirmedRsvp && ownFeedback && canEdit && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setRating(v)} type="button">
                <Star size={24} className={v <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            className="border rounded px-3 py-2 text-sm"
            maxLength={2000}
          />
          <button
            onClick={handleSubmit}
            disabled={rating < 1 || submitting}
            className="border rounded px-4 py-2 text-sm bg-foreground text-background disabled:opacity-50 w-fit"
          >
            {submitting ? "Updating..." : "Update"}
          </button>
        </div>
      )}

      {isAuthenticated && hasConfirmedRsvp && ownFeedback && !canEdit && (
        <div className="bg-muted/30 rounded p-3 text-sm">
          <p>Thanks for your feedback!</p>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <Star key={v} size={16} className={v <= ownFeedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
