import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type ElectionRow = { _id: string; name: string; phase: number; startsOn: string; endsOn: string; status: string };
type TermRow = { _id: string; name: string; startsOn: string; endsOn: string; status: string };

function phaseLabel(phase: number) {
  return phase === 1 ? "Phase 1 - Batch Representative Selection" : "Phase 2 - Office Bearer Election";
}

export function ElectionsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = Boolean(user?.roles.some((role) => ["Election Commissioner", "Moderator"].includes(role)));
  const canRead = Boolean(
    user?.roles.some((role) =>
      [
        "General Member",
        "Alumni",
        "President",
        "Vice President",
        "General Secretary",
        "Moderator",
        "Election Commissioner",
        "Chief Patron",
      ].includes(role)
    )
  );
  const [form, setForm] = useState({ name: "", termId: "", phase: 1, startsOn: "", endsOn: "" });
  const [error, setError] = useState<string | null>(null);

  const {
    data = [],
    isError: isElectionQueryError,
    error: electionQueryError,
  } = useQuery({
    queryKey: ["elections", token],
    queryFn: () => apiRequest<ElectionRow[]>("/elections", { token }),
    enabled: Boolean(token && canRead),
  });

  const {
    data: terms = [],
    isError: isTermsQueryError,
    error: termsQueryError,
  } = useQuery({
    queryKey: ["ec-terms-for-election", token],
    queryFn: () => apiRequest<TermRow[]>("/governance/ec-terms", { token }),
    enabled: Boolean(token && canCreate),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        startsOn: new Date(form.startsOn).toISOString(),
        endsOn: new Date(form.endsOn).toISOString(),
      };
      return apiRequest("/elections", { method: "POST", token, body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["elections", token] });
      setForm({ name: "", termId: "", phase: 1, startsOn: "", endsOn: "" });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ electionId, status }: { electionId: string; status: "Draft" | "Active" | "Closed" }) =>
      apiRequest(`/elections/${electionId}/phase`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["elections", token] });
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
    <PageScreen title="Elections" subtitle="Election cycles, phases, and status overview.">
      {!canRead ? (
        <section className="page-section">
          <div className="empty-state">You do not have permission to view elections. Contact a moderator or system admin for role assignment.</div>
        </section>
      ) : null}

      <section className="page-section">
        <h2 className="page-section__title">Constitution-Aligned Election Design</h2>
        <div className="grid-3">
          <article className="stat-card">
            <h3>Phase 1</h3>
            <strong>Batch Representatives</strong>
            <p>Voters select representatives from their own batch (ARTICLE XIV).</p>
          </article>
          <article className="stat-card">
            <h3>Phase 2</h3>
            <strong>Posts 1-11</strong>
            <p>Approved representatives contest office-bearing posts under eligibility constraints.</p>
          </article>
          <article className="stat-card">
            <h3>Governance</h3>
            <strong>Commission Controlled</strong>
            <p>Candidate validation, phase control, and result publication are role-protected actions.</p>
          </article>
        </div>
      </section>

      {canCreate ? (
        <section className="page-section">
          <h2 className="page-section__title">Create election</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field"><span>Name</span><input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required /></label>
            <label className="field">
              <span>Term</span>
              <select
                value={form.termId}
                onChange={(e) => setForm((current) => ({ ...current, termId: e.target.value }))}
                required
              >
                <option value="">Select EC term</option>
                {terms.map((term) => (
                  <option key={term._id} value={term._id}>
                    {term.name} ({new Date(term.startsOn).toLocaleDateString()} - {new Date(term.endsOn).toLocaleDateString()}) [{term.status}]
                  </option>
                ))}
              </select>
            </label>
            <label className="field"><span>Phase</span><select value={form.phase} onChange={(e) => setForm((current) => ({ ...current, phase: Number(e.target.value) }))}><option value={1}>Phase 1 - Batch Representatives</option><option value={2}>Phase 2 - Office Bearers</option></select></label>
            <label className="field"><span>Starts on</span><input type="datetime-local" value={form.startsOn} onChange={(e) => setForm((current) => ({ ...current, startsOn: e.target.value }))} required /></label>
            <label className="field"><span>Ends on</span><input type="datetime-local" value={form.endsOn} onChange={(e) => setForm((current) => ({ ...current, endsOn: e.target.value }))} required /></label>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create election"}</button></div>
          </form>
          {isTermsQueryError ? <div className="alert">{normalizeApiError(termsQueryError)}</div> : null}
          {terms.length === 0 ? <div className="notice">No EC terms found. Create a term first in Governance - EC Terms.</div> : null}
          {error ? <div className="alert">{error}</div> : null}
        </section>
      ) : null}

      <section className="page-section">
        <h2 className="page-section__title">Election list</h2>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phase</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map((election) => (
              <tr key={election._id}>
                <td>{election.name}</td>
                <td>{phaseLabel(election.phase)}</td>
                <td>{new Date(election.startsOn).toLocaleString()}</td>
                <td>{new Date(election.endsOn).toLocaleString()}</td>
                <td><span className="chip">{election.status}</span></td>
                <td>
                  <div className="button-row">
                    <Link className="secondary-button" to={`/dashboard/elections/${election._id}/results`}>Results</Link>
                    {election.status === "Active" ? (
                      <Link className="primary-button" to={`/dashboard/elections/${election._id}/vote`}>Vote</Link>
                    ) : (
                      <button className="secondary-button" type="button" disabled>
                        Vote unavailable
                      </button>
                    )}
                    {canCreate ? (
                      <>
                        <Link className="secondary-button" to={`/dashboard/elections/${election._id}/candidates`}>Candidates</Link>
                        {election.status === "Draft" ? (
                          <button
                            className="primary-button"
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ electionId: election._id, status: "Active" })}
                          >
                            Activate
                          </button>
                        ) : null}
                        {election.status === "Active" ? (
                          <button
                            className="secondary-button"
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ electionId: election._id, status: "Closed" })}
                          >
                            Close
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isElectionQueryError ? <div className="alert">{normalizeApiError(electionQueryError)}</div> : null}
        {canRead && data.length === 0 ? (
          <div className="notice">
            No elections found yet. Ask an Election Commissioner or Moderator to create and activate an election first.
          </div>
        ) : null}
      </section>
    </PageScreen>
  );
}