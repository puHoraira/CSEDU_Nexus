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
      <div className="grid-3">
        <div className="stat-card">
          <h3>Signed in as</h3>
          <strong>{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</strong>
          <p>{user?.roles.join(", ") || "No role loaded"}</p>
        </div>
        <div className="stat-card">
          <h3>Public events</h3>
          <strong>{events.length}</strong>
          <p>Currently visible to visitors and members</p>
        </div>
        <div className="stat-card">
          <h3>Ledger balance</h3>
          <strong>{canReadFinance ? `৳${ledger?.balance ?? 0}` : "Restricted"}</strong>
          <p>{canReadFinance ? `Income ৳${ledger?.totals?.income ?? 0}` : "Treasurer/oversight only"}</p>
        </div>
      </div>

      <section className="page-section">
        <h2 className="page-section__title">Recent events</h2>
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
            {events.slice(0, 5).map((event) => (
              <tr key={event._id}>
                <td>{event.title}</td>
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