import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Election = { _id: string; name: string; phase: number; status: "Draft" | "Active" | "Closed" };
type Candidate = { _id: string; status: string; rejectionReason?: string; electionId?: { _id: string; name: string }; memberId?: { studentId?: string } };
type ModeratorDetailsPayload = { pendingCandidates: Candidate[] };

export function ElectionCommissionPage() {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [phase, setPhase] = useState(1);
  const [status, setStatus] = useState<"Draft" | "Active" | "Closed">("Draft");
  const [candidateId, setCandidateId] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const elections = useQuery({
    queryKey: ["commission-elections", token],
    queryFn: () => apiRequest<Election[]>("/elections", { token }),
    enabled: Boolean(token),
  });

  const candidates = useQuery({
    queryKey: ["commission-candidates", token],
    queryFn: () =>
      apiRequest<ModeratorDetailsPayload>("/moderator/details", { token }).then((data) => data.pendingCandidates || []),
    enabled: Boolean(token),
  });

  const phaseMutation = useMutation({
    mutationFn: () => apiRequest(`/elections/${selectedElectionId}/phase`, { method: "PATCH", token, body: JSON.stringify({ phase, status }) }),
    onSuccess: async () => {
      setMessage("Election phase updated");
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/elections/candidates/${candidateId}/validate`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ action: decision, reason }),
      }),
    onSuccess: async () => {
      setMessage("Candidate decision saved");
      await queryClient.invalidateQueries({ queryKey: ["commission-candidates", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest(`/elections/${selectedElectionId}/publish-results`, { method: "POST", token }),
    onSuccess: async () => {
      setMessage("Results published and election closed");
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  function handlePhaseSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedElectionId) {
      setMessage("Select an election first");
      return;
    }
    phaseMutation.mutate();
  }

  function handleCandidateSubmit(event: FormEvent) {
    event.preventDefault();
    if (!candidateId) {
      setMessage("Select a candidate first");
      return;
    }
    validateMutation.mutate();
  }

  const pendingCandidates = useMemo(() => (candidates.data || []).filter((item) => item.status === "Pending"), [candidates.data]);

  return (
    <PageScreen title="Election Commission" subtitle="Manage election phases, validate candidacy, and publish final results.">
      {message ? <div className="info">{message}</div> : null}

      <section className="page-section">
        <h2 className="page-section__title">Manage phase</h2>
        <form className="form-grid" onSubmit={handlePhaseSubmit}>
          <label className="field">
            <span>Election</span>
            <select value={selectedElectionId} onChange={(e) => setSelectedElectionId(e.target.value)}>
              <option value="">Select election</option>
              {(elections.data || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Phase</span><select value={String(phase)} onChange={(e) => setPhase(Number(e.target.value))}><option value="1">1</option><option value="2">2</option></select></label>
          <label className="field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value as "Draft" | "Active" | "Closed")}><option value="Draft">Draft</option><option value="Active">Active</option><option value="Closed">Closed</option></select></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={phaseMutation.isPending}>Update phase</button></div>
        </form>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Validate candidacy</h2>
        <form className="form-grid" onSubmit={handleCandidateSubmit}>
          <label className="field">
            <span>Pending candidate</span>
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
              <option value="">Select candidate</option>
              {pendingCandidates.map((item) => (
                <option key={item._id} value={item._id}>{item.memberId?.studentId || item._id} - {item.electionId?.name || "Election"}</option>
              ))}
            </select>
          </label>
          <label className="field"><span>Decision</span><select value={decision} onChange={(e) => setDecision(e.target.value as "Approved" | "Rejected")}><option value="Approved">Approve</option><option value="Rejected">Reject</option></select></label>
          <label className="field"><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={validateMutation.isPending}>Save decision</button></div>
        </form>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Publish results</h2>
        <p>Publishing closes the election and records who published the official result.</p>
        <button className="secondary-button" type="button" onClick={() => publishMutation.mutate()} disabled={!selectedElectionId || publishMutation.isPending}>
          Publish selected election results
        </button>
      </section>
    </PageScreen>
  );
}