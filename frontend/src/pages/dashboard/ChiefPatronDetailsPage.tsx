import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Proposal = { _id: string; title: string; type: string; status: string; createdAt: string };
type Cancellation = { _id: string; reason: string; status: string; memberId?: { studentId?: string } };
type Ledger = {
  rows: Array<{ _id: string; reference: string; amount: number; type: string; requiresCheque?: boolean; chequeSignedAt?: string | null }>;
};

export function ChiefPatronDetailsPage() {
  const { token, loading } = useAuth();

  const proposals = useQuery({
    queryKey: ["chief-proposals", token],
    queryFn: () => apiRequest<Proposal[]>("/governance/proposals", { token }),
    enabled: Boolean(token),
  });
  const cancellations = useQuery({
    queryKey: ["chief-cancellations", token],
    queryFn: () => apiRequest<Cancellation[]>("/membership/cancellations", { token }),
    enabled: Boolean(token),
  });
  const ledger = useQuery({
    queryKey: ["chief-ledger", token],
    queryFn: () => apiRequest<Ledger>("/finance/ledger", { token }),
    enabled: Boolean(token),
  });

  const pendingConstitution = useMemo(
    () => (proposals.data || []).filter((item) => item.type === "ConstitutionChange" && item.status === "PendingChiefPatron"),
    [proposals.data]
  );
  const pendingCheque = useMemo(
    () => (ledger.data?.rows || []).filter((item) => item.requiresCheque && !item.chequeSignedAt),
    [ledger.data]
  );

  return (
    <PageScreen title="Chief Patron Panel" subtitle="Override approvals, constitution review, membership authority, and cheque signing.">
      <div className="grid-3">
        <div className="stat-card"><h3>Pending constitution approvals</h3><strong>{pendingConstitution.length}</strong></div>
        <div className="stat-card"><h3>Pending membership cancellations</h3><strong>{(cancellations.data || []).filter((x) => x.status !== "Executed").length}</strong></div>
        <div className="stat-card"><h3>Pending cheque signatures</h3><strong>{pendingCheque.length}</strong></div>
      </div>

      <section className="page-section">
        <h2 className="page-section__title">Constitution change queue</h2>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {pendingConstitution.map((item) => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td>{item.type}</td>
                <td><span className="chip">{item.status}</span></td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Membership authority queue</h2>
        <table className="data-table">
          <thead><tr><th>Member</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {(cancellations.data || []).slice(0, 10).map((item) => (
              <tr key={item._id}>
                <td>{item.memberId?.studentId || "-"}</td>
                <td>{item.reason}</td>
                <td><span className="chip">{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Transactions requiring cheque signature</h2>
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            {pendingCheque.map((item) => (
              <tr key={item._id}>
                <td>{item.reference}</td>
                <td>{item.type}</td>
                <td>৳{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}