import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type CancellationRow = {
  _id: string;
  reason: string;
  status: string;
  createdAt: string;
  memberId?: { studentId?: string; batch?: number; status?: string };
  approvals: Array<{ role: string; action: string; comment?: string }>;
};

type MemberRow = {
  _id: string;
  studentId: string;
  batch: number;
  currentYear: number;
  status: string;
};

export function MembershipCancellationsPage() {
  const { token, user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState("");
  const [reason, setReason] = useState("");
  const reasonTemplates = [
    "Studentship expired (final result published)",
    "Punishment for unlawful activities by University/Department/Hall authority",
    "Violation of constitution rules",
    "Proven affiliation with banned/extremist organization",
  ];
  const [error, setError] = useState<string | null>(null);
  const roles = user?.roles || [];
  const canRequest = roles.some((role) => ["Moderator"].includes(role));
  const canReview = roles.some((role) => ["President", "Moderator", "Chief Patron"].includes(role));
  const canExecute = roles.some((role) => ["Chief Patron"].includes(role));
  const reviewerRole = roles.find((role) => ["President", "Moderator", "Chief Patron"].includes(role)) || null;

  const { data = [], isLoading } = useQuery({
    queryKey: ["cancellations", token],
    queryFn: () => apiRequest<CancellationRow[]>("/membership/cancellations", { token }),
    enabled: Boolean(token) && canReview && !loading,
    retry: false,
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members-for-cancellation", token],
    queryFn: () => apiRequest<MemberRow[]>("/membership/members", { token }),
    enabled: Boolean(token) && canRequest && !loading,
    retry: false,
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      apiRequest("/membership/cancellations", {
        method: "POST",
        token,
        body: JSON.stringify({ memberId, reason }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cancellations", token] });
      setMemberId("");
      setReason("");
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  async function review(id: string, action: "Approved" | "Rejected") {
    try {
      const comment = action === "Rejected"
        ? (window.prompt("Enter rejection reason", "Not sufficient grounds") || "Rejected")
        : "Approved";
      await apiRequest(`/membership/cancellations/${id}/review`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ action, comment }),
      });
      await queryClient.invalidateQueries({ queryKey: ["cancellations", token] });
      setError(null);
    } catch (err) {
      setError(normalizeApiError(err));
    }
  }

  async function execute(id: string) {
    try {
      await apiRequest(`/membership/cancellations/${id}/execute`, { method: "PATCH", token });
      await queryClient.invalidateQueries({ queryKey: ["cancellations", token] });
      setError(null);
    } catch (err) {
      setError(normalizeApiError(err));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberId) {
      setError("Please select a member.");
      return;
    }
    requestMutation.mutate();
  }

  function canCurrentReviewerAct(row: CancellationRow) {
    if (!canReview || !reviewerRole) return false;
    if (!row.approvals || row.approvals.length === 0) return false;
    const step = row.approvals.find((item) => item.role === reviewerRole);
    return Boolean(step && step.action === "Pending" && ["InReview", "Approved"].includes(row.status));
  }

  function isExecutable(row: CancellationRow) {
    return canExecute && row.status === "Approved";
  }

  return (
    <PageScreen title="Membership Cancellations" subtitle="Approve, reject, and execute cancellation workflows.">
      {canRequest ? (
        <section className="page-section">
          <h2 className="page-section__title">Create request</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Member</span>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
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
              <span>Reason</span>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write a clear reason for cancellation request"
                required
              />
            </label>
            <label className="field">
              <span>Quick Templates</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setReason(e.target.value);
                }}
              >
                <option value="">Select a template (optional)</option>
                {reasonTemplates.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={requestMutation.isPending}>{requestMutation.isPending ? "Submitting..." : "Submit request"}</button></div>
          </form>
          {loadingMembers ? <div className="notice">Loading members...</div> : null}
          {!loadingMembers && members.length === 0 ? <div className="notice">No members available for cancellation request.</div> : null}
          {error ? <div className="alert">{error}</div> : null}
        </section>
      ) : null}

      {!canRequest && !canReview ? (
        <section className="page-section">
          <div className="empty-state">You do not have permission to request/review membership cancellations.</div>
        </section>
      ) : null}

      <section className="page-section">
        <h2 className="page-section__title">Requests</h2>
        {isLoading ? <div className="notice">Loading cancellation requests...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Approvals</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row._id}>
                <td>{row.memberId?.studentId || "Unknown"}</td>
                <td>{row.reason}</td>
                <td><span className="chip">{row.status}</span></td>
                <td>{row.approvals.map((approval) => `${approval.role}:${approval.action}`).join(" | ")}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  {canReview || canExecute ? (
                    <div className="button-row">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!canCurrentReviewerAct(row)}
                        onClick={() => review(row._id, "Approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!canCurrentReviewerAct(row)}
                        onClick={() => review(row._id, "Rejected")}
                      >
                        Reject
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        disabled={!isExecutable(row)}
                        onClick={() => execute(row._id)}
                      >
                        Execute
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && data.length === 0 ? <div className="notice">No cancellation requests yet.</div> : null}
        {error ? <div className="alert" style={{ marginTop: 10 }}>{error}</div> : null}
      </section>
    </PageScreen>
  );
}