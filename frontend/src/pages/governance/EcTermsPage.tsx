import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type TermRow = { _id: string; name: string; startsOn: string; endsOn: string; status: string };

export function EcTermsPage() {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", startsOn: "", endsOn: "", status: "Draft" });
  const [error, setError] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["ec-terms", token],
    queryFn: () => apiRequest<TermRow[]>("/governance/ec-terms", { token }),
    enabled: Boolean(token) && !loading,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        startsOn: new Date(form.startsOn).toISOString(),
        endsOn: new Date(form.endsOn).toISOString(),
      };
      return apiRequest("/governance/ec-terms", { method: "POST", token, body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ec-terms", token] });
      setForm({ name: "", startsOn: "", endsOn: "", status: "Draft" });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.startsOn || !form.endsOn) {
      setError("Start and end date-time are required.");
      return;
    }

    if (new Date(form.endsOn).getTime() <= new Date(form.startsOn).getTime()) {
      setError("End date-time must be later than start date-time.");
      return;
    }

    mutation.mutate();
  }

  return (
    <PageScreen title="EC Terms" subtitle="Create and manage committee terms.">
      <section className="page-section">
        <h2 className="page-section__title">What term name, start, and end mean</h2>
        <p><strong>Name:</strong> A human-readable label for the Executive Committee period (example: EC 2026-27 or Term 001).</p>
        <p><strong>Starts on:</strong> The official beginning of this committee term. Elections and appointments under this term should be planned with this boundary.</p>
        <p><strong>Ends on:</strong> The official closing date-time of the term. This separates one EC period from the next and prevents term overlap.</p>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Create term</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required /></label>
          <label className="field"><span>Starts on</span><input type="datetime-local" value={form.startsOn} onChange={(e) => setForm((current) => ({ ...current, startsOn: e.target.value }))} required /></label>
          <label className="field"><span>Ends on</span><input type="datetime-local" value={form.endsOn} onChange={(e) => setForm((current) => ({ ...current, endsOn: e.target.value }))} required /></label>
          <label className="field"><span>Status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}><option>Draft</option><option>Active</option><option>Closed</option></select></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save term"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Terms</h2>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {data.map((term) => (
              <tr key={term._id}>
                <td>{term.name}</td>
                <td>{new Date(term.startsOn).toLocaleString()}</td>
                <td>{new Date(term.endsOn).toLocaleString()}</td>
                <td><span className="chip">{term.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}