import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type CandidateRow = {
  _id: string;
  status: "Pending" | "Approved" | "Rejected";
  memberId?: {
    studentId?: string;
    batch?: number;
    userId?: { firstName?: string; lastName?: string; email?: string };
  };
  postId?: { title?: string } | null;
};

export function ElectionVotePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));
  const [form, setForm] = useState({ candidateId: "" });
  const [message, setMessage] = useState<string | null>(null);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["election-candidates", id, token],
    queryFn: () => apiRequest<CandidateRow[]>(`/elections/${id}/candidates`, { token }),
    enabled: Boolean(hasValidId && token),
    retry: false,
  });

  const approvedCandidates = candidates.filter((candidate) => candidate.status === "Approved");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/elections/votes", {
        method: "POST",
        token,
        body: JSON.stringify({ electionId: id, candidateId: form.candidateId }),
      }),
    onSuccess: () => setMessage("Vote submitted"),
    onError: (err) => setMessage(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasValidId) {
      setMessage("Invalid election link.");
      return;
    }
    mutation.mutate();
  }

  return (
    <PageScreen title="Vote" subtitle="Secure ballot interface for eligible users.">
      <section className="page-section">
        {!hasValidId ? <div className="empty-state">Invalid election link.</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Candidate</span>
            <select value={form.candidateId} onChange={(e) => setForm((current) => ({ ...current, candidateId: e.target.value }))} required>
              <option value="">Select approved candidate</option>
              {approvedCandidates.map((candidate) => {
                const user = candidate.memberId?.userId;
                const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unnamed";
                const postName = candidate.postId?.title ? ` • ${candidate.postId.title}` : " • Representative";
                const batch = candidate.memberId?.batch ? ` • Batch ${candidate.memberId.batch}` : "";
                return (
                  <option key={candidate._id} value={candidate._id}>
                    {fullName}{postName}{batch}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="form-actions"><button className="primary-button" type="submit">Cast vote</button></div>
        </form>
        {isLoading ? <div className="notice">Loading approved candidates...</div> : null}
        {!isLoading && approvedCandidates.length === 0 ? <div className="empty-state">No approved candidates are available yet for voting.</div> : null}
        {message ? <div className="info">{message}</div> : null}
      </section>
    </PageScreen>
  );
}