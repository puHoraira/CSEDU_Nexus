import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  category: "System" | "Meeting" | "Membership" | "Governance" | "Certificate" | "Event";
  actionUrl?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};

type NotificationListPayload = {
  items: NotificationRow[];
  page: number;
  limit: number;
  total: number;
  unreadCount: number;
};

export function NotificationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["notifications", token, unreadOnly],
    queryFn: () =>
      apiRequest<NotificationListPayload>(`/notifications?limit=50&unreadOnly=${unreadOnly ? "true" : "false"}`, {
        token,
      }),
    enabled: Boolean(token),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "PATCH", token }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications", token] }),
        queryClient.invalidateQueries({ queryKey: ["notification-unread-count", token] }),
      ]);
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest(`/notifications/read-all`, { method: "PATCH", token }),
    onSuccess: async () => {
      setMessage("All notifications marked as read.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications", token] }),
        queryClient.invalidateQueries({ queryKey: ["notification-unread-count", token] }),
      ]);
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const rows = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <PageScreen title="Notifications" subtitle="All alerts, updates, and direct workflow links.">
      <section className="page-section">
        <div className="button-row" style={{ justifyContent: "space-between" }}>
          <div className="button-row">
            <button
              type="button"
              className={unreadOnly ? "primary-button" : "secondary-button"}
              onClick={() => setUnreadOnly((current) => !current)}
            >
              {unreadOnly ? "Showing unread only" : "Show unread only"}
            </button>
            <span className="chip">Unread: {listQuery.data?.unreadCount || 0}</span>
            <span className="chip">Total: {listQuery.data?.total || 0}</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={markAllMutation.isPending || (listQuery.data?.unreadCount || 0) === 0}
            onClick={() => {
              setMessage(null);
              markAllMutation.mutate();
            }}
          >
            {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
          </button>
        </div>
        {message ? <div className="info" style={{ marginTop: 14 }}>{message}</div> : null}
      </section>

      <section className="page-section">
        {listQuery.isLoading ? <div className="notice">Loading notifications...</div> : null}
        {rows.length === 0 && !listQuery.isLoading ? (
          <div className="empty-state">No notifications found for the selected filter.</div>
        ) : null}

        <div className="stack">
          {rows.map((row) => (
            <article key={row._id} className={`notification-card ${row.isRead ? "" : "is-unread"}`}>
              <div className="notification-card__head">
                <div>
                  <p className="eyebrow">{row.category}</p>
                  <h3>{row.title}</h3>
                </div>
                <span className="chip">{row.isRead ? "Read" : "Unread"}</span>
              </div>

              <p className="notification-card__message">{row.message}</p>

              <div className="notification-card__footer">
                <span className="chip">{new Date(row.createdAt).toLocaleString()}</span>
                <div className="button-row">
                  {row.actionUrl ? (
                    <Link className="secondary-button" to={row.actionUrl}>
                      Open
                    </Link>
                  ) : null}
                  {!row.isRead ? (
                    <button
                      type="button"
                      className="primary-button"
                      disabled={markReadMutation.isPending}
                      onClick={() => {
                        setMessage(null);
                        markReadMutation.mutate(row._id);
                      }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageScreen>
  );
}