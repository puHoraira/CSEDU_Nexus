import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

export function FinanceOverviewPage() {
  const { token, user } = useAuth();
  const canRead = user?.roles.some((role) => ["Treasurer", "Moderator", "Chief Patron"].includes(role));

  const { data: ledger } = useQuery({
    queryKey: ["finance-overview", token],
    queryFn: () => apiRequest<{ balance: number; totals: { income: number; expenditure: number }; rows: Array<any> }>("/finance/ledger", { token }),
    enabled: Boolean(token) && canRead,
  });

  return (
    <PageScreen title="Finance" subtitle="Ledger access, reports, and financial overview.">
      <div className="grid-3">
        <div className="stat-card"><h3>Total income</h3><strong>৳{ledger?.totals?.income ?? 0}</strong></div>
        <div className="stat-card"><h3>Total expenditure</h3><strong>৳{ledger?.totals?.expenditure ?? 0}</strong></div>
        <div className="stat-card"><h3>Balance</h3><strong>৳{ledger?.balance ?? 0}</strong></div>
      </div>

      <section className="page-section">
        <div className="button-row">
          <Link className="primary-button" to="/dashboard/finance/ledger">Open ledger</Link>
          {user?.roles.includes("Treasurer") ? <Link className="secondary-button" to="/dashboard/finance/transactions/new">New transaction</Link> : null}
          <Link className="secondary-button" to="/dashboard/finance/reports">Reports</Link>
        </div>
      </section>

      {!canRead ? <div className="info">Finance data is restricted to Treasurer and oversight roles.</div> : null}
    </PageScreen>
  );
}