import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { env } from "../../config/env";
import { PageScreen } from "../../components/ui/PageScreen";

type CertificateRequestRow = {
  _id: string;
  certificateNo?: string;
  certificateType: string;
  purpose: string;
  contributionSummary: string;
  status: "PendingModerator" | "PendingChairman" | "Approved" | "Rejected";
  rejectionReason?: string;
  requesterUserId?: { firstName?: string; lastName?: string; email?: string };
  requesterMemberId?: { studentId?: string; batch?: number; currentYear?: number; status?: string };
  moderatorReview?: { action?: string; signatureName?: string; signatureTitle?: string };
  chairmanReview?: { action?: string; signatureName?: string; signatureTitle?: string };
  approvedAt?: string;
  createdAt?: string;
};

function statusLabel(status: CertificateRequestRow["status"]) {
  if (status === "PendingModerator") return "Pending Moderator";
  if (status === "PendingChairman") return "Pending Chairman";
  if (status === "Approved") return "Approved";
  return "Rejected";
}

export function CertificatesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    certificateType: "MembershipContribution",
    purpose: "",
    contributionSummary: "",
  });
  const [moderatorSign, setModeratorSign] = useState({ signatureName: "", signatureTitle: "Moderator" });
  const [chairmanSign, setChairmanSign] = useState({ signatureName: "", signatureTitle: "Chairman" });

  const roles = user?.roles || [];
  const isModerator = roles.includes("Moderator");
  const isChairman = roles.includes("Chief Patron") || roles.includes("Chairman");
  const isReviewer = isModerator || isChairman;
  const canApply = !isReviewer;

  const { data: myRequests = [], isLoading: loadingMyRequests } = useQuery({
    queryKey: ["certificate-my", token],
    queryFn: () => apiRequest<CertificateRequestRow[]>("/certificates/my", { token }),
    enabled: Boolean(token),
    retry: false,
  });

  const { data: moderatorInbox = [], isLoading: loadingModeratorInbox } = useQuery({
    queryKey: ["certificate-inbox-moderator", token],
    queryFn: () => apiRequest<CertificateRequestRow[]>("/certificates/inbox/moderator", { token }),
    enabled: Boolean(token && isModerator),
    retry: false,
  });

  const { data: chairmanInbox = [], isLoading: loadingChairmanInbox } = useQuery({
    queryKey: ["certificate-inbox-chairman", token],
    queryFn: () => apiRequest<CertificateRequestRow[]>("/certificates/inbox/chairman", { token }),
    enabled: Boolean(token && isChairman),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/certificates/requests", {
        method: "POST",
        token,
        body: JSON.stringify(requestForm),
      }),
    onSuccess: async () => {
      setRequestForm({ certificateType: "MembershipContribution", purpose: "", contributionSummary: "" });
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["certificate-my", token] });
      if (isModerator) await queryClient.invalidateQueries({ queryKey: ["certificate-inbox-moderator", token] });
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  const moderatorReviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "Approved" | "Rejected" }) =>
      apiRequest(`/certificates/${id}/moderator-review`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          action,
          comment: action === "Rejected" ? "Rejected by moderator" : "",
          signatureName: action === "Approved" ? moderatorSign.signatureName : "",
          signatureTitle: action === "Approved" ? moderatorSign.signatureTitle : "",
        }),
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["certificate-inbox-moderator", token] });
      await queryClient.invalidateQueries({ queryKey: ["certificate-inbox-chairman", token] });
      await queryClient.invalidateQueries({ queryKey: ["certificate-my", token] });
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  const chairmanReviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "Approved" | "Rejected" }) =>
      apiRequest(`/certificates/${id}/chairman-review`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          action,
          comment: action === "Rejected" ? "Rejected by chairman" : "",
          signatureName: action === "Approved" ? chairmanSign.signatureName : "",
          signatureTitle: action === "Approved" ? chairmanSign.signatureTitle : "",
        }),
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["certificate-inbox-chairman", token] });
      await queryClient.invalidateQueries({ queryKey: ["certificate-my", token] });
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  const myApproved = useMemo(
    () => myRequests.filter((item) => item.status === "Approved"),
    [myRequests]
  );

  async function downloadCertificate(id: string) {
    if (!token) return;

    try {
      const response = await fetch(`${env.apiBaseUrl}/certificates/${id}/download`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const isJson = response.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await response.json() : null;
        throw new Error(data?.message || `Download failed with ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
      const filename = match?.[1] || "certificate.txt";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (downloadError) {
      setError(normalizeApiError(downloadError));
    }
  }

  function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate();
  }

  return (
    <PageScreen title="Certificates" subtitle="Request certificates, collect moderator/chairman signatures, and download after full approval.">
      {canApply ? (
        <section className="page-section">
          <h2 className="page-section__title">Apply for Certificate</h2>
          <form className="form-grid" onSubmit={handleCreateRequest}>
            <label className="field">
              <span>Type</span>
              <select
                value={requestForm.certificateType}
                onChange={(e) => setRequestForm((current) => ({ ...current, certificateType: e.target.value }))}
              >
                <option value="MembershipContribution">Membership Contribution</option>
              </select>
            </label>
            <label className="field">
              <span>Purpose</span>
              <input
                value={requestForm.purpose}
                onChange={(e) => setRequestForm((current) => ({ ...current, purpose: e.target.value }))}
                placeholder="Higher study / internship / placement"
                required
              />
            </label>
            <label className="field">
              <span>Contribution Summary</span>
              <textarea
                rows={4}
                value={requestForm.contributionSummary}
                onChange={(e) => setRequestForm((current) => ({ ...current, contributionSummary: e.target.value }))}
                placeholder="Mention your contributions in club events and activities"
                required
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="page-section">
          <div className="notice">Reviewer mode active: Moderator/Chairman accounts can review and sign requests from this page.</div>
        </section>
      )}

      <section className="page-section">
        <h2 className="page-section__title">My Requests</h2>
        {loadingMyRequests ? <div className="notice">Loading requests...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>Certificate No</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {myRequests.map((item) => (
              <tr key={item._id}>
                <td>{item.certificateNo || "Pending"}</td>
                <td>{item.purpose}</td>
                <td><span className="chip">{statusLabel(item.status)}</span></td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
                <td>
                  {item.status === "Approved" ? (
                    <button className="secondary-button" onClick={() => downloadCertificate(item._id)} type="button">
                      Download
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myRequests.length === 0 ? <div className="notice">No certificate requests yet.</div> : null}
      </section>

      {isModerator ? (
        <section className="page-section">
          <h2 className="page-section__title">Moderator Approval Desk</h2>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <label className="field">
              <span>Moderator Signature Name</span>
              <input
                value={moderatorSign.signatureName}
                onChange={(e) => setModeratorSign((current) => ({ ...current, signatureName: e.target.value }))}
                placeholder="e.g. Dr. Jane Doe"
              />
            </label>
            <label className="field">
              <span>Signature Title</span>
              <input
                value={moderatorSign.signatureTitle}
                onChange={(e) => setModeratorSign((current) => ({ ...current, signatureTitle: e.target.value }))}
                placeholder="Moderator"
              />
            </label>
          </div>
          {loadingModeratorInbox ? <div className="notice">Loading moderator inbox...</div> : null}
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Student ID</th>
                <th>Purpose</th>
                <th>Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {moderatorInbox.map((item) => {
                const applicant = `${item.requesterUserId?.firstName || ""} ${item.requesterUserId?.lastName || ""}`.trim() || item.requesterUserId?.email || "Unknown";
                return (
                  <tr key={item._id}>
                    <td>{applicant}</td>
                    <td>{item.requesterMemberId?.studentId || "-"}</td>
                    <td>{item.purpose}</td>
                    <td>{item.contributionSummary}</td>
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={moderatorReviewMutation.isPending}
                          onClick={() => moderatorReviewMutation.mutate({ id: item._id, action: "Approved" })}
                        >
                          Sign & Approve
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={moderatorReviewMutation.isPending}
                          onClick={() => moderatorReviewMutation.mutate({ id: item._id, action: "Rejected" })}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {moderatorInbox.length === 0 ? <div className="notice">No pending requests for moderator review.</div> : null}
        </section>
      ) : null}

      {isChairman ? (
        <section className="page-section">
          <h2 className="page-section__title">Chairman Final Approval Desk</h2>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <label className="field">
              <span>Chairman Signature Name</span>
              <input
                value={chairmanSign.signatureName}
                onChange={(e) => setChairmanSign((current) => ({ ...current, signatureName: e.target.value }))}
                placeholder="e.g. Prof. Chairman Name"
              />
            </label>
            <label className="field">
              <span>Signature Title</span>
              <input
                value={chairmanSign.signatureTitle}
                onChange={(e) => setChairmanSign((current) => ({ ...current, signatureTitle: e.target.value }))}
                placeholder="Chairman"
              />
            </label>
          </div>
          {loadingChairmanInbox ? <div className="notice">Loading chairman inbox...</div> : null}
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Student ID</th>
                <th>Purpose</th>
                <th>Moderator Signature</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chairmanInbox.map((item) => {
                const applicant = `${item.requesterUserId?.firstName || ""} ${item.requesterUserId?.lastName || ""}`.trim() || item.requesterUserId?.email || "Unknown";
                const modSign = item.moderatorReview?.signatureName
                  ? `${item.moderatorReview.signatureName} (${item.moderatorReview.signatureTitle || "Moderator"})`
                  : "Pending";
                return (
                  <tr key={item._id}>
                    <td>{applicant}</td>
                    <td>{item.requesterMemberId?.studentId || "-"}</td>
                    <td>{item.purpose}</td>
                    <td>{modSign}</td>
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={chairmanReviewMutation.isPending}
                          onClick={() => chairmanReviewMutation.mutate({ id: item._id, action: "Approved" })}
                        >
                          Sign & Final Approve
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={chairmanReviewMutation.isPending}
                          onClick={() => chairmanReviewMutation.mutate({ id: item._id, action: "Rejected" })}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {chairmanInbox.length === 0 ? <div className="notice">No pending requests for chairman review.</div> : null}
        </section>
      ) : null}

      {myApproved.length > 0 ? (
        <section className="page-section">
          <h2 className="page-section__title">Approved Certificates Ready to Download</h2>
          <div className="button-row">
            {myApproved.map((item) => (
              <button
                key={item._id}
                type="button"
                className="secondary-button"
                onClick={() => downloadCertificate(item._id)}
              >
                Download {item.certificateNo || "Certificate"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <div className="alert" style={{ marginTop: 12 }}>{error}</div> : null}
    </PageScreen>
  );
}