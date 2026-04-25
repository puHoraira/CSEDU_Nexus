import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { env } from "../../config/env";
import { PageScreen } from "../../components/ui/PageScreen";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

type ECPostHistory = {
  year: number;
  ecTermId?: string;
  postTitle: string;
  startDate: string;
  endDate?: string;
};

type VolunteerContribution = {
  eventId?: string;
  eventTitle: string;
  role: string;
  date: string;
  description?: string;
};

type CertificateRequestRow = {
  _id: string;
  certificateNo?: string;
  certificateType: string;
  purpose: string;
  contributionSummary: string;
  ecPostHistory?: ECPostHistory[];
  volunteerContributions?: VolunteerContribution[];
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
  const [ecPosts, setEcPosts] = useState<ECPostHistory[]>([]);
  const [volunteerContribs, setVolunteerContribs] = useState<VolunteerContribution[]>([]);
  const [newEcPost, setNewEcPost] = useState({ year: new Date().getFullYear(), postTitle: "", startDate: "", endDate: "" });
  const [newVolunteer, setNewVolunteer] = useState({ eventTitle: "", role: "", date: "", description: "" });
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
        body: JSON.stringify({
          ...requestForm,
          ecPostHistory: ecPosts,
          volunteerContributions: volunteerContribs,
        }),
      }),
    onSuccess: async () => {
      setRequestForm({ certificateType: "MembershipContribution", purpose: "", contributionSummary: "" });
      setEcPosts([]);
      setVolunteerContribs([]);
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

  function addEcPost() {
    if (!newEcPost.postTitle || !newEcPost.startDate) return;
    setEcPosts([...ecPosts, { ...newEcPost }]);
    setNewEcPost({ year: new Date().getFullYear(), postTitle: "", startDate: "", endDate: "" });
  }

  function removeEcPost(index: number) {
    setEcPosts(ecPosts.filter((_, i) => i !== index));
  }

  function addVolunteerContrib() {
    if (!newVolunteer.eventTitle || !newVolunteer.role || !newVolunteer.date) return;
    setVolunteerContribs([...volunteerContribs, { ...newVolunteer }]);
    setNewVolunteer({ eventTitle: "", role: "", date: "", description: "" });
  }

  function removeVolunteerContrib(index: number) {
    setVolunteerContribs(volunteerContribs.filter((_, i) => i !== index));
  }

  return (
    <PageScreen title="Certificates" subtitle="Request certificates with EC post history and volunteer contributions. Approved certificates are issued by the Chairman as per Article XIX of the Constitution.">
      {canApply ? (
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Apply</p>
              <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Request Certificate of Membership</h2>
            </div>
          </div>
          <form className="stack" onSubmit={handleCreateRequest} style={{ gap: 24 }}>
            <div className="form-grid">
              <label className="field">
                <span style={{ fontWeight: 600 }}>Certificate Type</span>
                <select
                  value={requestForm.certificateType}
                  onChange={(e) => setRequestForm((current) => ({ ...current, certificateType: e.target.value }))}
                >
                  <option value="MembershipContribution">Membership Contribution</option>
                </select>
              </label>
              <label className="field">
                <span style={{ fontWeight: 600 }}>Purpose</span>
                <input
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm((current) => ({ ...current, purpose: e.target.value }))}
                  placeholder="Higher study / internship / placement / job application"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span style={{ fontWeight: 600 }}>Contribution Summary</span>
              <textarea
                rows={5}
                value={requestForm.contributionSummary}
                onChange={(e) => setRequestForm((current) => ({ ...current, contributionSummary: e.target.value }))}
                placeholder="Describe your overall contributions to club events, activities, and initiatives..."
                required
              />
            </label>

            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: "1.2rem" }}>EC Post History (Optional)</h3>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>
                Add your Executive Committee positions held in different years
              </p>
              <div className="form-grid" style={{ marginBottom: 12 }}>
                <label className="field">
                  <span>Year</span>
                  <input
                    type="number"
                    value={newEcPost.year}
                    onChange={(e) => setNewEcPost({ ...newEcPost, year: parseInt(e.target.value) })}
                    min="2000"
                    max="2100"
                  />
                </label>
                <label className="field">
                  <span>Post Title</span>
                  <input
                    value={newEcPost.postTitle}
                    onChange={(e) => setNewEcPost({ ...newEcPost, postTitle: e.target.value })}
                    placeholder="President / General Secretary / Treasurer"
                  />
                </label>
                <label className="field">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={newEcPost.startDate}
                    onChange={(e) => setNewEcPost({ ...newEcPost, startDate: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>End Date (Optional)</span>
                  <input
                    type="date"
                    value={newEcPost.endDate}
                    onChange={(e) => setNewEcPost({ ...newEcPost, endDate: e.target.value })}
                  />
                </label>
              </div>
              <button type="button" className="secondary-button" onClick={addEcPost}>
                Add EC Post
              </button>
              {ecPosts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {ecPosts.map((post, index) => (
                    <div key={index} className="chip" style={{ marginRight: 8, marginBottom: 8 }}>
                      {post.postTitle} ({post.year})
                      <button
                        type="button"
                        onClick={() => removeEcPost(index)}
                        style={{ marginLeft: 8, cursor: "pointer", background: "none", border: "none", color: "inherit" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: "1.2rem" }}>Volunteer Contributions (Optional)</h3>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>
                Add specific events where you volunteered
              </p>
              <div className="form-grid" style={{ marginBottom: 12 }}>
                <label className="field">
                  <span>Event Title</span>
                  <input
                    value={newVolunteer.eventTitle}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, eventTitle: e.target.value })}
                    placeholder="Pohela Boishakh / Workshop / Cultural Festival"
                  />
                </label>
                <label className="field">
                  <span>Your Role</span>
                  <input
                    value={newVolunteer.role}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, role: e.target.value })}
                    placeholder="Organizer / Coordinator / Volunteer"
                  />
                </label>
                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={newVolunteer.date}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, date: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Description (Optional)</span>
                  <input
                    value={newVolunteer.description}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, description: e.target.value })}
                    placeholder="Brief description of your contribution"
                  />
                </label>
              </div>
              <button type="button" className="secondary-button" onClick={addVolunteerContrib}>
                Add Volunteer Contribution
              </button>
              {volunteerContribs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {volunteerContribs.map((contrib, index) => (
                    <div key={index} className="chip" style={{ marginRight: 8, marginBottom: 8 }}>
                      {contrib.eventTitle} - {contrib.role}
                      <button
                        type="button"
                        onClick={() => removeVolunteerContrib(index)}
                        style={{ marginLeft: 8, cursor: "pointer", background: "none", border: "none", color: "inherit" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Certificate Request"
                )}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="page-section">
          <div className="info">Reviewer mode active: Moderator/Chairman accounts can review and sign requests from this page.</div>
        </section>
      )}

      <section className="page-section">
        <div className="constitution-section-header">
          <div>
            <p className="constitution-section-header__eyebrow">My Requests</p>
            <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Certificate Requests Status</h2>
          </div>
        </div>
        {loadingMyRequests ? (
          <div className="notice">
            <LoadingSpinner size="md" />
            <span>Loading requests...</span>
          </div>
        ) : null}
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
                <td style={{ fontWeight: 600 }}>{item.certificateNo || "Pending"}</td>
                <td>{item.purpose}</td>
                <td><span className="chip">{statusLabel(item.status)}</span></td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
                <td>
                  {item.status === "Approved" ? (
                    <button className="primary-button" onClick={() => downloadCertificate(item._id)} type="button">
                      Download
                    </button>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Pending approval</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myRequests.length === 0 && !loadingMyRequests ? <div className="empty-state">No certificate requests yet.</div> : null}
      </section>

      {isModerator ? (
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Moderator</p>
              <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Approval Desk</h2>
            </div>
          </div>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label className="field">
              <span style={{ fontWeight: 600 }}>Moderator Signature Name</span>
              <input
                value={moderatorSign.signatureName}
                onChange={(e) => setModeratorSign((current) => ({ ...current, signatureName: e.target.value }))}
                placeholder="e.g. Dr. Jane Doe"
              />
            </label>
            <label className="field">
              <span style={{ fontWeight: 600 }}>Signature Title</span>
              <input
                value={moderatorSign.signatureTitle}
                onChange={(e) => setModeratorSign((current) => ({ ...current, signatureTitle: e.target.value }))}
                placeholder="Moderator"
              />
            </label>
          </div>
          {loadingModeratorInbox ? (
            <div className="notice">
              <LoadingSpinner size="md" />
              <span>Loading moderator inbox...</span>
            </div>
          ) : null}
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Student ID</th>
                <th>Purpose</th>
                <th>EC Posts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {moderatorInbox.map((item) => {
                const applicant = `${item.requesterUserId?.firstName || ""} ${item.requesterUserId?.lastName || ""}`.trim() || item.requesterUserId?.email || "Unknown";
                const ecPostCount = item.ecPostHistory?.length || 0;
                return (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{applicant}</td>
                    <td>{item.requesterMemberId?.studentId || "-"}</td>
                    <td>{item.purpose}</td>
                    <td>{ecPostCount > 0 ? `${ecPostCount} position(s)` : "None"}</td>
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={moderatorReviewMutation.isPending}
                          onClick={() => moderatorReviewMutation.mutate({ id: item._id, action: "Approved" })}
                        >
                          {moderatorReviewMutation.isPending ? <LoadingSpinner size="sm" /> : "Sign & Approve"}
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
          {moderatorInbox.length === 0 && !loadingModeratorInbox ? <div className="empty-state">No pending requests for moderator review.</div> : null}
        </section>
      ) : null}

      {isChairman ? (
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Chairman</p>
              <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Final Approval Desk</h2>
            </div>
          </div>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label className="field">
              <span style={{ fontWeight: 600 }}>Chairman Signature Name</span>
              <input
                value={chairmanSign.signatureName}
                onChange={(e) => setChairmanSign((current) => ({ ...current, signatureName: e.target.value }))}
                placeholder="e.g. Prof. Chairman Name"
              />
            </label>
            <label className="field">
              <span style={{ fontWeight: 600 }}>Signature Title</span>
              <input
                value={chairmanSign.signatureTitle}
                onChange={(e) => setChairmanSign((current) => ({ ...current, signatureTitle: e.target.value }))}
                placeholder="Chairman"
              />
            </label>
          </div>
          {loadingChairmanInbox ? (
            <div className="notice">
              <LoadingSpinner size="md" />
              <span>Loading chairman inbox...</span>
            </div>
          ) : null}
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
                    <td style={{ fontWeight: 600 }}>{applicant}</td>
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
                          {chairmanReviewMutation.isPending ? <LoadingSpinner size="sm" /> : "Sign & Final Approve"}
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
          {chairmanInbox.length === 0 && !loadingChairmanInbox ? <div className="empty-state">No pending requests for chairman review.</div> : null}
        </section>
      ) : null}

      {myApproved.length > 0 ? (
        <section className="page-section constitution-form-card constitution-form-card--submit">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Ready</p>
              <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Approved Certificates</h2>
            </div>
          </div>
          <div className="grid-3">
            {myApproved.map((item) => (
              <div key={item._id} className="card">
                <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>{item.certificateNo}</h3>
                <p style={{ color: "var(--muted)", margin: "8px 0" }}>{item.purpose}</p>
                <span className="chip chip--success">Approved</span>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: 12 }}
                  onClick={() => downloadCertificate(item._id)}
                >
                  Download Certificate
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <div className="alert" style={{ marginTop: 16 }}>{error}</div> : null}
    </PageScreen>
  );
}
