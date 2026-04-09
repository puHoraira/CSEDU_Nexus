import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type TransactionRow = {
  _id: string;
  type: string;
  amount: number;
  category: string;
  reference: string;
  occurredOn: string;
};

export function LedgerPage() {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const canRead = user?.roles.some((role) => ["Treasurer", "Moderator", "Chief Patron"].includes(role));
  const canCreate = user?.roles.includes("Treasurer");
  const [form, setForm] = useState({ type: "Income", amount: 0, category: "Donation", reference: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", token],
    queryFn: () => apiRequest<{ rows: TransactionRow[]; balance: number; totals: { income: number; expenditure: number } }>("/finance/ledger", { token }),
    enabled: Boolean(token) && canRead,
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest("/finance/transactions", { method: "POST", token, body: JSON.stringify(form) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ledger", token] });
      setForm({ type: "Income", amount: 0, category: "Donation", reference: "" });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <PageScreen title="Ledger" subtitle="Immutable financial transaction history.">
      {canCreate ? (
        <section className="page-section">
          <h2 className="page-section__title">Add transaction</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field"><span>Type</span><select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}><option>Income</option><option>Expenditure</option></select></label>
            <label className="field"><span>Amount</span><input type="number" min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: Number(e.target.value) }))} /></label>
            <label className="field"><span>Category</span><input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} /></label>
            <label className="field"><span>Reference</span><input value={form.reference} onChange={(e) => setForm((current) => ({ ...current, reference: e.target.value }))} /></label>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save transaction"}</button></div>
          </form>
          {error ? <div className="alert">{error}</div> : null}
        </section>
      ) : null}

      <section className="page-section">
        <div className="grid-3">
          <div className="stat-card"><h3>Income</h3><strong>৳{data?.totals.income ?? 0}</strong></div>
          <div className="stat-card"><h3>Expenditure</h3><strong>৳{data?.totals.expenditure ?? 0}</strong></div>
          <div className="stat-card"><h3>Balance</h3><strong>৳{data?.balance ?? 0}</strong></div>
        </div>

        {isLoading ? <div className="notice">Loading ledger...</div> : null}
        {!canRead ? <div className="info">You do not have permission to read the ledger.</div> : null}

        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Reference</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.occurredOn).toLocaleDateString()}</td>
                <td><span className="chip">{row.type}</span></td>
                <td>{row.category}</td>
                <td>{row.reference}</td>
                <td>৳{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}