import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tantml:react-query";
import { Bell, Moon, Sun } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { GlobalSearchBox } from "../search/GlobalSearchBox";

type UnreadCountPayload = { unreadCount: number };
type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  category: "System" | "Meeting" | "Membership" | "Governance" | "Certificate" | "Event";
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
};
type NotificationPreviewPayload = {
  items: NotificationRow[];
  unreadCount: number;
};

export function Topbar() {
  const { user, token, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const unreadQuery = useQuery({
    queryKey: ["notification-unread-count", token],
    queryFn: () => apiRequest<UnreadCountPayload>("/notifications/unread-count", { token }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const previewQuery = useQuery({
    queryKey: ["notifications-preview", token],
    queryFn: () => apiRequest<NotificationPreviewPayload>("/notifications?limit=5", { token }),
    enabled: Boolean(token && open),
    refetchInterval: open ? 45_000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH", token }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notification-unread-count", token] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-preview", token] }),
        queryClient.invalidateQueries({ queryKey: ["notifications", token] }),
      ]);
    },
    onError: (error) => setPanelMessage(normalizeApiError(error)),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("/notifications/read-all", { method: "PATCH", token }),
    onSuccess: async () => {
      setPanelMessage("All notifications marked as read.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notification-unread-count", token] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-preview", token] }),
        queryClient.invalidateQueries({ queryKey: ["notifications", token] }),
      ]);
    },
    onError: (error) => setPanelMessage(normalizeApiError(error)),
  });

  useEffect(() => {
    if (!open) return;

    function handleOutside(event: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const unreadCount = unreadQuery.data?.unreadCount || 0;
  const previewRows = previewQuery.data?.items || [];

  return (
    <header className="topbar">
      <GlobalSearchBox />

      <div className="topbar__actions">
        <button type="button" className="icon-button" onClick={toggleTheme} title={resolvedTheme === "dark" ? "Switch to day mode" : "Switch to night mode"}>
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="notification-menu" ref={panelRef}>
          <button
            type="button"
            className={`icon-button ${unreadCount > 0 ? "icon-button--ring" : ""}`}
            title="Notifications"
            aria-expanded={open}
            onClick={() => {
              setPanelMessage(null);
              setOpen((current) => !current);
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 ? <span className="icon-button__badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
          </button>

          {open ? (
            <div className="notification-menu__panel">
              <div className="notification-menu__header">
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h4>Latest updates</h4>
                </div>
                <span className="chip">Unread {unreadCount}</span>
              </div>

              <div className="notification-menu__actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={markAllMutation.isPending || unreadCount === 0}
                  onClick={() => {
                    setPanelMessage(null);
                    markAllMutation.mutate();
                  }}
                >
                  {markAllMutation.isPending ? "Marking..." : "Mark all read"}
                </button>
                <Link className="secondary-button" to="/dashboard/notifications" onClick={() => setOpen(false)}>
                  Open all
                </Link>
              </div>

              {panelMessage ? <div className="info">{panelMessage}</div> : null}
              {previewQuery.isLoading ? <div className="notice">Loading...</div> : null}

              <div className="notification-menu__list">
                {previewRows.length === 0 && !previewQuery.isLoading ? (
                  <div className="empty-state">No recent notifications.</div>
                ) : null}

                {previewRows.map((row) => (
                  <article key={row._id} className={`notification-menu__item ${row.isRead ? "" : "is-unread"}`}>
                    <div className="notification-menu__item-head">
                      <strong>{row.title}</strong>
                      <span className="chip">{row.category}</span>
                    </div>
                    <p>{row.message}</p>
                    <div className="notification-menu__item-footer">
                      <span className="chip">{new Date(row.createdAt).toLocaleString()}</span>
                      <div className="button-row">
                        {row.actionUrl ? (
                          <Link className="secondary-button" to={row.actionUrl} onClick={() => setOpen(false)}>
                            Open
                          </Link>
                        ) : null}
                        {!row.isRead ? (
                          <button
                            type="button"
                            className="primary-button"
                            disabled={markReadMutation.isPending}
                            onClick={() => {
                              setPanelMessage(null);
                              markReadMutation.mutate(row._id);
                            }}
                          >
                            Read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="topbar__profile">
          <div className="topbar__avatar">
            {user?.avatarUrl ? (
              <img className="topbar__avatar-image" src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
            ) : (
              user ? user.firstName.slice(0, 1).toUpperCase() : "G"
            )}
          </div>
          <div>
            <strong>{user ? `${user.firstName} ${user.lastName}` : "Guest"}</strong>
            <p>{user ? user.roles.join(", ") : "Public visitor"}</p>
          </div>
        </div>
        {user ? (
          <button type="button" className="secondary-button" onClick={logout}>
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}