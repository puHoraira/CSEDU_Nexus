import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type EventRow = { _id: string; title: string; eventDate: string; venue: string; status: string };

export function DashboardHomePage() {
  const { user, token } = useAuth();
  const canReadFinance = user?.roles.some((role) => ["Treasurer", "Moderator", "Chief Patron"].includes(role));

  const { data: events = [] } = useQuery({
    queryKey: ["dashboard-events"],
    queryFn: () => apiRequest<EventRow[]>("/events"),
  });

  const { data: ledger } = useQuery({
    queryKey: ["dashboard-ledger", token],
    queryFn: () => apiRequest<{ balance: number; totals: { income: number; expenditure: number }; rows: Array<{ _id: string }> }>("/finance/ledger", { token }),
    enabled: Boolean(token) && canReadFinance,
  });

  return (
    <PageScreen title="Dashboard" subtitle="Role-aware landing hub with pending items and shortcuts.">
      <section className="page-section constitution-form-card constitution-form-card--submit">
        <div className="event-review-hero">
          <div>
            <p className="eyebrow">Workspace overview</p>
            <h2 className="page-section__title" style={{ fontSize: "1.8rem" }}>Welcome back{user ? `, ${user.firstName}` : ""}.</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.6, maxWidth: 760 }}>
              This dashboard gives role-aware access to the work that needs attention right now, with a cleaner action-first layout.
            </p>
          </div>
          <div className="button-row">
            <span className="chip">{user?.roles.join(", ") || "No role loaded"}</span>
            <span className="chip">{events.length} public events</span>
          </div>
        </div>
      </section>

      <div className="grid-3" style={{ marginTop: 18 }}>
        <div className="stat-card">
          <h3>Signed in as</h3>
          <strong>{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</strong>
          <p>Current account and access roles</p>
        </div>
        <div className="stat-card">
          <h3>Public events</h3>
          <strong>{events.length}</strong>
          <p>Visible to visitors and members</p>
        </div>
        <div className="stat-card">
          <h3>Ledger balance</h3>
          <strong>{canReadFinance ? `৳${ledger?.balance ?? 0}` : "Restricted"}</strong>
          <p>{canReadFinance ? `Income ৳${ledger?.totals?.income ?? 0}` : "Treasurer/oversight only"}</p>
        </div>
      </div>

      <section className="page-section">
        <div className="constitution-section-header">
          <div>
            <p className="constitution-section-header__eyebrow">Operations</p>
            <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>Recent events</h2>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Venue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 5).map((event, index) => (
              <tr key={event._id} style={{ background: index % 2 === 0 ? "var(--surface-soft)" : "transparent" }}>
                <td style={{ fontWeight: 600 }}>{event.title}</td>
                <td>{new Date(event.eventDate).toLocaleDateString()}</td>
                <td>{event.venue}</td>
                <td><span className="chip">{event.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}