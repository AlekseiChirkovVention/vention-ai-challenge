import { API_URL } from "../lib/api";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate?: string | null;
  timezone?: string;
  venueAddress?: string | null;
  onlineLink?: string | null;
  coverImageUrl?: string | null;
  capacity?: number | null;
  status: string;
  visibility: string;
  hidden: boolean;
  hostId: string | null;
  createdAt: string;
  userRole?: string | null;
  host?: { id: string; name: string; slug: string } | null;
}

const COMMON_TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

const ALL_TIMEZONES = (() => {
  try { return (Intl as any).supportedValuesOf("timeZone") as string[]; }
  catch { return COMMON_TIMEZONES; }
})();

const REMAINING_TIMEZONES = ALL_TIMEZONES.filter((tz) => !COMMON_TIMEZONES.includes(tz));

export default function MyEventsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [locationType, setLocationType] = useState<"venue" | "online">("venue");
  const [venueAddress, setVenueAddress] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [capacity, setCapacity] = useState("");

  // List state
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter state
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTimezone, setEditTimezone] = useState("UTC");
  const [editLocationType, setEditLocationType] = useState<"venue" | "online">("venue");
  const [editVenueAddress, setEditVenueAddress] = useState("");
  const [editOnlineLink, setEditOnlineLink] = useState("");
  const [editCoverImageUrl, setEditCoverImageUrl] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "unlisted">("public");
  const [editCapacity, setEditCapacity] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchMyEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/my-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setListError("Session expired"); return; }
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchMyEvents(); }, [token]);

  const validate = (): string | null => {
    if (title.trim().length < 3) return "Title must be at least 3 characters";
    if (!date) return "Date is required";
    if (new Date(date) <= new Date()) return "Event date must be in the future";
    if (endDate && new Date(endDate) <= new Date(date)) return "End date must be after start date";
    if (capacity && (isNaN(Number(capacity)) || Number(capacity) < 1)) return "Capacity must be a positive number";
    if (coverImageUrl.trim()) {
      try { new URL(coverImageUrl.trim()); } catch { return "Cover image URL must be a valid URL"; }
    }
    return null;
  };

  const handleSubmit = async (status: "draft" | "published") => {
    setFormError(null);
    const err = validate();
    if (err) { setFormError(err); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(), description: description.trim() || null,
        date: new Date(date).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        timezone, visibility, status, is_paid: false,
        cover_image_url: coverImageUrl.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      };
      if (locationType === "venue") { body.venue_address = venueAddress.trim() || null; body.online_link = null; }
      else { body.online_link = onlineLink.trim() || null; body.venue_address = null; }

      const res = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.status === 401) { setFormError("Session expired"); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const created = await res.json();
      navigate(`/events/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  };

  const handleAction = async (eventId: string, action: "publish" | "unpublish" | "duplicate") => {
    setActionLoading(eventId);
    try {
      const method = action === "duplicate" ? "POST" : "PATCH";
      const path = `${API_URL}/api/events/${eventId}/${action}`;
      const res = await fetch(path, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Action failed"); }
      await fetchMyEvents();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Action failed");
    } finally { setActionLoading(null); }
  };

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || "");
    setEditDate(new Date(event.date).toISOString().slice(0, 16));
    setEditEndDate(event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "");
    setEditTimezone(event.timezone || "UTC");
    setEditLocationType(event.onlineLink ? "online" : "venue");
    setEditVenueAddress(event.venueAddress || "");
    setEditOnlineLink(event.onlineLink || "");
    setEditCoverImageUrl(event.coverImageUrl || "");
    setEditVisibility((event.visibility as "public" | "unlisted") || "public");
    setEditCapacity(event.capacity != null ? String(event.capacity) : "");
    setEditError(null);
  };

  const handleEditSubmit = async () => {
    setEditError(null);
    if (editTitle.trim().length < 3) { setEditError("Title must be at least 3 characters"); return; }
    if (!editDate) { setEditError("Date is required"); return; }
    if (editEndDate && new Date(editEndDate) <= new Date(editDate)) { setEditError("End date must be after start date"); return; }
    if (editCapacity && (isNaN(Number(editCapacity)) || Number(editCapacity) < 1)) { setEditError("Capacity must be a positive number"); return; }
    if (editCoverImageUrl.trim()) {
      try { new URL(editCoverImageUrl.trim()); } catch { setEditError("Cover image URL must be a valid URL"); return; }
    }
    setEditSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        date: new Date(editDate).toISOString(),
        end_date: editEndDate ? new Date(editEndDate).toISOString() : null,
        timezone: editTimezone,
        visibility: editVisibility,
        cover_image_url: editCoverImageUrl.trim() || null,
        capacity: editCapacity ? Number(editCapacity) : null,
      };
      if (editLocationType === "venue") { body.venue_address = editVenueAddress.trim() || null; body.online_link = null; }
      else { body.online_link = editOnlineLink.trim() || null; body.venue_address = null; }
      const res = await fetch(`${API_URL}/api/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update"); }
      setEditingId(null);
      await fetchMyEvents();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setEditSubmitting(false); }
  };

  // Unique hosts for filter dropdown
  const hostOptions = Array.from(new Map(events.filter((e) => e.host).map((e) => [e.host!.id, e.host!.name])).entries());

  const filtered = events.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (searchFilter && !e.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (hostFilter !== "all" && e.host?.id !== hostFilter) return false;
    if (dateFromFilter && new Date(e.date) < new Date(dateFromFilter)) return false;
    if (dateToFilter && new Date(e.date) > new Date(dateToFilter + "T23:59:59")) return false;
    return true;
  });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Events</h1>

      {/* ── Create Event Form ── */}
      <details className="mb-8 border rounded p-4">
        <summary className="cursor-pointer font-medium">+ Create New Event</summary>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 max-w-md mt-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title" className="border rounded px-3 py-2" disabled={submitting} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)" className="border rounded px-3 py-2" disabled={submitting} />

          <div>
            <label className="block text-sm font-medium mb-1">Start date & time *</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2 w-full" disabled={submitting} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End date & time (optional)</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 w-full" disabled={submitting} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="border rounded px-3 py-2 w-full" disabled={submitting}>
              {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              <option disabled>──────────</option>
              {REMAINING_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setLocationType("venue")} disabled={submitting}
                className={`border rounded px-3 py-1 text-sm ${locationType === "venue" ? "bg-foreground text-background" : ""}`}>
                In Person
              </button>
              <button type="button" onClick={() => setLocationType("online")} disabled={submitting}
                className={`border rounded px-3 py-1 text-sm ${locationType === "online" ? "bg-foreground text-background" : ""}`}>
                Online
              </button>
            </div>
            {locationType === "venue" ? (
              <input type="text" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Venue address" className="border rounded px-3 py-2 w-full" disabled={submitting} />
            ) : (
              <input type="text" value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://zoom.us/j/..." className="border rounded px-3 py-2 w-full" disabled={submitting} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Capacity (optional)</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)}
              placeholder="Leave empty for unlimited" className="border rounded px-3 py-2 w-full"
              disabled={submitting} min="1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cover image URL</label>
            <input type="text" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg" className="border rounded px-3 py-2 w-full" disabled={submitting} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Visibility</label>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" value="public" checked={visibility === "public"}
                  onChange={() => setVisibility("public")} disabled={submitting} /> Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" value="unlisted" checked={visibility === "unlisted"}
                  onChange={() => setVisibility("unlisted")} disabled={submitting} /> Unlisted
              </label>
              {visibility === "unlisted" && (
                <p className="text-xs text-muted-foreground ml-5">Only people with the link can find this event</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pricing</label>
            <div className="flex gap-2">
              <button type="button" className="border rounded px-3 py-1 text-sm bg-foreground text-background" disabled={submitting}>Free</button>
              <button type="button" disabled className="border rounded px-3 py-1 text-sm opacity-50 cursor-not-allowed"
                title="Coming soon — payments not yet supported">Paid</button>
            </div>
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => handleSubmit("draft")} disabled={submitting}
              className="border rounded px-4 py-2">{submitting ? "Saving..." : "Save Draft"}</button>
            <button type="button" onClick={() => handleSubmit("published")} disabled={submitting}
              className="border rounded px-4 py-2 bg-foreground text-background">{submitting ? "Publishing..." : "Publish"}</button>
          </div>
        </form>
      </details>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search my events..." className="border rounded px-3 py-2 flex-1 min-w-[200px]" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "draft" | "published")}
          className="border rounded px-3 py-2">
          <option value="all">All statuses</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
        </select>
        {hostOptions.length > 0 && (
          <select value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}
            className="border rounded px-3 py-2">
            <option value="all">All hosts</option>
            {hostOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)}
            className="border rounded px-2 py-2" />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)}
            className="border rounded px-2 py-2" />
        </div>
      </div>

      {/* ── Event List ── */}
      {loading ? (
        <p>Loading events...</p>
      ) : listError ? (
        <p className="text-red-500">{listError}</p>
      ) : filtered.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((event) => {
            const isPast = new Date(event.date) < new Date();
            const canEdit = event.userRole === "host" || event.userRole === "creator";
            const isChecker = event.userRole === "checker";
            return (
              <div key={event.id} className={`border rounded p-4 ${event.hidden ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/events/${event.id}`} className="font-bold text-lg hover:underline">
                      {event.title}
                    </Link>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs border rounded px-1.5 py-0.5">{event.status}</span>
                      <span className="text-xs border rounded px-1.5 py-0.5">{event.visibility}</span>
                      {event.host && <span className="text-xs border rounded px-1.5 py-0.5">{event.host.name}</span>}
                      {event.userRole && <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">{event.userRole}</span>}
                      {event.hidden && <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5">Hidden</span>}
                      {isPast && <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">Ended</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canEdit && event.status === "draft" && (
                      <button onClick={() => handleAction(event.id, "publish")}
                        disabled={actionLoading === event.id}
                        className="border rounded px-2 py-1 text-xs bg-foreground text-background">
                        Publish
                      </button>
                    )}
                    {canEdit && event.status === "published" && (
                      <button onClick={() => handleAction(event.id, "unpublish")}
                        disabled={actionLoading === event.id}
                        className="border rounded px-2 py-1 text-xs">
                        Unpublish
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => handleAction(event.id, "duplicate")}
                        disabled={actionLoading === event.id}
                        className="border rounded px-2 py-1 text-xs">
                        Duplicate
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => startEdit(event)}
                        className="border rounded px-2 py-1 text-xs">
                        Edit
                      </button>
                    )}
                    {(isChecker || canEdit) && !isPast && (
                      <Link to={`/events/${event.id}/checkin`}
                        className="border rounded px-2 py-1 text-xs bg-foreground text-background">
                        Check-in
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editingId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}
        >
          <div className="bg-background border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Event</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="border rounded px-3 py-2 w-full" rows={3} disabled={editSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start date & time *</label>
                <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End date & time</label>
                <input type="datetime-local" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <select value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)}
                  className="border rounded px-3 py-2 w-full" disabled={editSubmitting}>
                  {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  <option disabled>──────────</option>
                  {REMAINING_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setEditLocationType("venue")} disabled={editSubmitting}
                    className={`border rounded px-3 py-1 text-sm ${editLocationType === "venue" ? "bg-foreground text-background" : ""}`}>
                    In Person
                  </button>
                  <button type="button" onClick={() => setEditLocationType("online")} disabled={editSubmitting}
                    className={`border rounded px-3 py-1 text-sm ${editLocationType === "online" ? "bg-foreground text-background" : ""}`}>
                    Online
                  </button>
                </div>
                {editLocationType === "venue" ? (
                  <input type="text" value={editVenueAddress} onChange={(e) => setEditVenueAddress(e.target.value)}
                    placeholder="Venue address" className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
                ) : (
                  <input type="text" value={editOnlineLink} onChange={(e) => setEditOnlineLink(e.target.value)}
                    placeholder="https://zoom.us/j/..." className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)}
                  placeholder="Leave empty for unlimited" className="border rounded px-3 py-2 w-full"
                  disabled={editSubmitting} min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cover image URL</label>
                <input type="text" value={editCoverImageUrl} onChange={(e) => setEditCoverImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg" className="border rounded px-3 py-2 w-full" disabled={editSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Visibility</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="editVisibility" value="public" checked={editVisibility === "public"}
                      onChange={() => setEditVisibility("public")} disabled={editSubmitting} /> Public
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="editVisibility" value="unlisted" checked={editVisibility === "unlisted"}
                      onChange={() => setEditVisibility("unlisted")} disabled={editSubmitting} /> Unlisted
                  </label>
                </div>
              </div>
              {editError && <p className="text-red-500 text-sm">{editError}</p>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditingId(null)} disabled={editSubmitting}
                  className="border rounded px-4 py-2 flex-1">Cancel</button>
                <button type="button" onClick={handleEditSubmit} disabled={editSubmitting}
                  className="border rounded px-4 py-2 bg-foreground text-background flex-1">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
