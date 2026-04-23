import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
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

type ElectionRow = {
  _id: string;
  name: string;
  phase: 1 | 2;
  startsOn: string;
  endsOn: string;
  status: "Draft" | "Active" | "Closed";
};

function phaseLabel(phase: 1 | 2) {
  return phase === 1 ? "Phase 1 - Batch Representative Ballot" : "Phase 2 - Office Bearer Ballot";
}

function getCandidateName(candidate: CandidateRow) {
  const user = candidate.memberId?.userId;
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unnamed candidate";
}

export function ElectionVotePage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));
  const [form, setForm] = useState({ candidateId: "" });
  const [confirmSubmission, setConfirmSubmission] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: elections = [] } = useQuery({
    queryKey: ["elections", token],
    queryFn: () => apiRequest<ElectionRow[]>("/elections", { token }),
    enabled: Boolean(token && hasValidId),
    retry: false,
  });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["election-candidates", id, token],
    queryFn: () => apiRequest<CandidateRow[]>(`/elections/${id}/candidates`, { token }),
    enabled: Boolean(hasValidId && token),
    retry: false,
  });

  const election = useMemo(() => elections.find((row) => row._id === id) || null, [elections, id]);
  const approvedCandidates = candidates.filter((candidate) => candidate.status === "Approved");
  const selectedCandidate = approvedCandidates.find((candidate) => candidate._id === form.candidateId) || null;

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/elections/votes", {
        method: "POST",
        token,
        body: JSON.stringify({ electionId: id, candidateId: form.candidateId }),
      }),
    onSuccess: async () => {
      setMessage("Your ballot was submitted successfully.");
      setConfirmSubmission(false);
    },
    onError: (err) => setMessage(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasValidId) {
      setMessage("Invalid election link.");
      return;
    }
    if (!form.candidateId) {
      setMessage("Choose a candidate before submitting your ballot.");
      return;
    }
    if (!confirmSubmission) {
      setMessage("Confirm your selection before casting the vote.");
      return;
    }
    mutation.mutate();
  }

  return (
    <PageScreen title="Ballot" subtitle="A guided voting screen with clear candidate cards, confirmation, and election context.">
      {!hasValidId ? <div className="alert">Invalid election link.</div> : null}

      <section className="page-section constitution-form-card constitution-form-card--submit">
        <div className="event-review-hero">
          <div style={{ maxWidth: 760 }}>
            <p className="eyebrow">Secure vote</p>
            <h2 className="page-section__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 10 }}>
              {election?.name || "Election ballot"}
            </h2>
            <p style={{ lineHeight: 1.7, color: "var(--muted)" }}>
              Review the approved candidates below, then cast a single selection. This ballot uses the current election phase and approvals only.
            </p>
            <div className="button-row" style={{ marginTop: 16 }}>
              <span className="chip">{election ? phaseLabel(election.phase) : "Loading election"}</span>
              <span className="chip">{election?.status || "Status pending"}</span>
              <span className="chip">{approvedCandidates.length} approved candidates</span>
            </div>
          </div>

          <div className="card" style={{ minWidth: 280, maxWidth: 360 }}>
            <p className="eyebrow">Your ballot</p>
            <h3 style={{ marginTop: 0 }}>Selection summary</h3>
            <div className="stack" style={{ gap: 10 }}>
              <span className="chip">Voter: {user ? `${user.firstName} ${user.lastName}` : "Signed in member"}</span>
              <span className="chip">Window: {election ? `${new Date(election.startsOn).toLocaleString()} - ${new Date(election.endsOn).toLocaleString()}` : "Loading"}</span>
              <span className="chip">Mode: Single choice</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Candidates</p>
              <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>Choose one approved candidate</h2>
            </div>
          </div>

          {isLoading ? <div className="notice">Loading approved candidates...</div> : null}
          {!isLoading && approvedCandidates.length === 0 ? <div className="empty-state">No approved candidates are available yet for voting.</div> : null}

          <div className="stack">
            {approvedCandidates.map((candidate) => {
              const fullName = getCandidateName(candidate);
              const postName = candidate.postId?.title ? candidate.postId.title : election?.phase === 1 ? "Batch representative" : "Office bearer";
              const batch = candidate.memberId?.batch ? `Batch ${candidate.memberId.batch}` : "Batch not listed";
              const isSelected = form.candidateId === candidate._id;

              return (
                <button
                  type="button"
                  key={candidate._id}
                  className={`candidate-ballot-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setForm({ candidateId: candidate._id });
                    setConfirmSubmission(false);
                    setMessage(null);
                  }}
                >
                  <div className="candidate-ballot-card__head">
                    <div>
                      <p className="candidate-ballot-card__label">{postName}</p>
                      <h3>{fullName}</h3>
                    </div>
                    <span className="chip">{isSelected ? "Selected" : "Select"}</span>
                  </div>

                  <div className="candidate-ballot-card__meta">
                    <span className="chip">{batch}</span>
                    <span className="chip">Student ID: {candidate.memberId?.studentId || "Not listed"}</span>
                    <span className="chip">Status: {candidate.status}</span>
                  </div>

                  <p className="candidate-ballot-card__hint">
                    {candidate.postId?.title
                      ? `Running for ${candidate.postId.title}.`
                      : election?.phase === 1
                        ? "Running as a batch representative candidate."
                        : "Running for office-bearer selection."}
                  </p>

                  <div className="candidate-ballot-card__footer">
                    <span className="subtle-link">{isSelected ? "Ballot selection active" : "Tap to select this candidate"}</span>
                    <span className="chip">{candidate.memberId?.userId?.email || "Member profile loaded"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Review ballot</p>
              <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>Confirm before submitting</h2>
            </div>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="candidate-summary-card">
              <p className="eyebrow">Current selection</p>
              {selectedCandidate ? (
                <>
                  <h3>{getCandidateName(selectedCandidate)}</h3>
                  <p>{selectedCandidate.postId?.title || (election?.phase === 1 ? "Batch representative" : "Office bearer")}</p>
                  <div className="button-row">
                    <span className="chip">{selectedCandidate.memberId?.studentId || "No student ID"}</span>
                    <span className="chip">{selectedCandidate.memberId?.batch ? `Batch ${selectedCandidate.memberId.batch}` : "Batch unknown"}</span>
                  </div>
                </>
              ) : (
                <div className="empty-state">No candidate selected yet. Choose one from the ballot list.</div>
              )}
            </div>

            <label className="register-agreement" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={confirmSubmission}
                onChange={(event) => setConfirmSubmission(event.target.checked)}
              />
              <span>
                <strong>I confirm my vote selection</strong>
                <small>Only one vote will be recorded for this ballot according to the current election phase rules.</small>
              </span>
            </label>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={mutation.isPending || !selectedCandidate || !confirmSubmission}>
                {mutation.isPending ? "Submitting ballot..." : "Cast vote"}
              </button>
              <Link className="secondary-button" to="/dashboard/elections">Back to elections</Link>
            </div>

            {message ? <div className="info">{message}</div> : null}
          </form>
        </aside>
      </div>
    </PageScreen>
  );
}