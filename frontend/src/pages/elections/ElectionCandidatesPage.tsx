import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type CandidateRow = {
  _id: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  postId?: { title?: string } | null;
  memberId?: {
    studentId?: string;
    currentYear?: number;
    batch?: number;
    userId?: { firstName?: string; lastName?: string; email?: string };
  };
};

export function ElectionCandidatesPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ memberId: "", postId: "", memberEcYears: 0 });
  const [message, setMessage] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members-for-candidacy", token],
    queryFn: () => apiRequest<Array<{ _id: string; studentId: string; batch: number; currentYear: number; status: string }>>("/membership/members", { token }),
    enabled: Boolean(token),
    retry: false,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["ec-posts-for-candidacy", token],
    queryFn: () => apiRequest<Array<{ _id: string; title: string; isActive?: boolean }>>("/governance/ec-posts", { token }),
    enabled: Boolean(token),
    retry: false,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["election-candidates", id, token],
    queryFn: () => apiRequest<CandidateRow[]>(`/elections/${id}/candidates`, { token }),
    enabled: Boolean(hasValidId && token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/elections/candidates", {
        method: "POST",
        token,
        body: JSON.stringify({
          electionId: id,
          memberId: form.memberId,
          postId: form.postId || null,
          memberEcYears: form.memberEcYears,
        }),
      }),
    onSuccess: async () => {
      setMessage("Candidate saved");
      await queryClient.invalidateQueries({ queryKey: ["election-candidates", id, token] });
    },
    onError: (err) => setMessage(normalizeApiError(err)),
  });

  const validateMutation = useMutation({
    mutationFn: ({ candidateId, action, reason }: { candidateId: string; action: "Approved" | "Rejected"; reason?: string }) =>
      apiRequest(`/elections/candidates/${candidateId}/validate`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ action, reason: reason || "" }),
      }),
    onSuccess: async () => {
      setMessage("Candidate validation updated");
      await queryClient.invalidateQueries({ queryKey: ["election-candidates", id, token] });
    },
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
    <PageScreen title="Candidate Management" subtitle="Review and manage candidacy eligibility.">
      {!hasValidId ? (
        <section className="page-section">
          <div className="empty-state">Invalid election link.</div>
        </section>
      ) : null}

      <section className="page-section">
        <h2 className="page-section__title">Constitution Eligibility Guide</h2>
        <p>Phase 1: Representatives do not require post assignment. Phase 2: post assignment is mandatory and eligibility follows year/EC experience constraints from EC post policy.</p>
      </section>

      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Member</span>
            <select value={form.memberId} onChange={(e) => setForm((current) => ({ ...current, memberId: e.target.value }))} required>
              <option value="">Select member</option>
              {members
                .filter((member) => member.status === "Active")
                .map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.studentId} • Batch {member.batch} • Year {member.currentYear}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Post (optional for Phase 1)</span>
            <select value={form.postId} onChange={(e) => setForm((current) => ({ ...current, postId: e.target.value }))}>
              <option value="">Representative (Phase 1)</option>
              {posts
                .filter((post) => post.isActive !== false)
                .map((post) => (
                  <option key={post._id} value={post._id}>
                    {post.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="field"><span>Member EC years</span><input type="number" min={0} value={form.memberEcYears} onChange={(e) => setForm((current) => ({ ...current, memberEcYears: Number(e.target.value) }))} /></label>
          <div className="form-actions"><button className="primary-button" type="submit">Save candidate</button></div>
        </form>
        {message ? <div className="info">{message}</div> : null}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Candidates</h2>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Student ID</th><th>Batch</th><th>Year</th><th>Post</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody>
            {candidates.map((candidate) => {
              const user = candidate.memberId?.userId;
              const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown";
              return (
                <tr key={candidate._id}>
                  <td>{fullName}</td>
                  <td>{candidate.memberId?.studentId || "-"}</td>
                  <td>{candidate.memberId?.batch || "-"}</td>
                  <td>{candidate.memberId?.currentYear || "-"}</td>
                  <td>{candidate.postId?.title || "Representative"}</td>
                  <td><span className="chip">{candidate.status}</span></td>
                  <td>{candidate.status === "Rejected" ? (candidate.rejectionReason || "Rejected") : "-"}</td>
                  <td>
                    {candidate.status === "Pending" ? (
                      <div className="button-row">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => validateMutation.mutate({ candidateId: candidate._id, action: "Approved" })}
                          disabled={validateMutation.isPending}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            const reason = window.prompt("Enter rejection reason", "Eligibility criteria not met") || "Rejected";
                            validateMutation.mutate({ candidateId: candidate._id, action: "Rejected", reason });
                          }}
                          disabled={validateMutation.isPending}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}