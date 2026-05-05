import { API_URL } from "../lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";



interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  eventId?: string;
  eventTitle?: string;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setUnreadCount(data.unread_count);
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const tick = () => { if (!document.hidden) fetchNotifications(); };
    fetchNotifications();
    timer = setInterval(tick, 30000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.read) {
      markRead(n.id);
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, read: true } : item));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.eventId) {
      navigate(`/events/${n.eventId}`);
    }
  };

  const renderText = (n: NotificationItem) => {
    if (n.type === "waitlist_promoted") {
      return `You've been promoted from the waitlist for "${n.eventTitle || "an event"}"`;
    }
    return "You have a new notification";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="relative p-1">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 underline">
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No notifications
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`block w-full text-left px-3 py-2 text-sm border-b hover:bg-muted/50 ${!n.read ? "bg-muted/30 font-medium" : ""}`}
              >
                <p>{renderText(n)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
