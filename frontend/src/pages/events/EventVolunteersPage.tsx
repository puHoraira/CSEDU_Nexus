import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type EventRow = {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  venue: string;
  status: string;
  budget?: number;
  volunteerEligibility?: {
    allowedYears?: number[];
    allowedBatches?: number[];
  };
  volunteerProgram?: {
    applicationDeadline?: string | null;
    notes?: string;
    positions?: Array<{
      name: string;
      slots: number;
      description?: string;
      requiredYears?: number[];
      requiredBatches?: number[];
    }>;
  };
  createdBy?: { firstName?: string; lastName?: string; email?: string };
};

type VolunteerRow = {
  _id: string;
  role: string;
  message?: string;
  preferredPositions?: string[];
  availability?: string;
  status: "Pending" | "Shortlisted" | "Waitlisted" | "Approved" | "Rejected";
  reviewNote?: string;
  assignedPosition?: string;
  createdAt: string;
  reviewedAt?: string;
  memberId?: { studentId?: string; batch?: number; currentYear?: number; status?: string };
  reviewedBy?: { firstName?: string; lastName?: string; email?: string };
};

const MANAGER_ROLES = ["President", "Vice President", "General Secretary", "AGS (Organization)"];

type DecisionDraft = {
  reason: string;
  assignedPosition: string;
  decision: VolunteerRow["status"];
};

export function EventVolunteersPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({});
  const [note, setNote] = useState<string | null>(null);
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-detail", id],
    queryFn: () => apiRequest<EventRow>(`/events/${id}`),
    enabled: hasValidId,
    retry: false,
  });

  const { data: volunteers = [], isLoading: volunteersLoading, refetch } = useQuery({
    queryKey: ["event-volunteers", id, token],
    queryFn: () => apiRequest<VolunteerRow[]>(`/events/${id}/volunteers`, { token }),
    enabled: hasValidId && Boolean(token),
    retry: false,
  });

  const approveRejectMutation = useMutation({
    mutationFn: ({ volunteerId, decision, reason, assignedPosition }: { volunteerId: string; decision: VolunteerRow["status"]; reason: string; assignedPosition: string }) =>
      apiRequest(`/events/volunteers/${volunteerId}/review`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ decision, reason, assignedPosition }),
      }),
    onSuccess: async (_, variables) => {
      setNote("Volunteer application reviewed.");
      setDrafts((current) => {
        if (!current[variables.volunteerId]) {
          return current;
        }
        const next = { ...current };
        delete next[variables.volunteerId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["event-volunteers", id, token] });
      await refetch();
    },
    onError: (error) => setNote(normalizeApiError(error)),
  });

  const sortedVolunteers = useMemo(() => volunteers, [volunteers]);
  const pending = sortedVolunteers.filter((item) => item.status === "Pending");
  const shortlisted = sortedVolunteers.filter((item) => item.status === "Shortlisted");
  const waitlisted = sortedVolunteers.filter((item) => item.status === "Waitlisted");
  const approved = sortedVolunteers.filter((item) => item.status === "Approved");
  const rejected = sortedVolunteers.filter((item) => item.status === "Rejected");

  const canManage = Boolean(user?.roles.some((role) => MANAGER_ROLES.includes(role)));

  function handleDecisionSubmit(volunteerId: string, decision: VolunteerRow["status"]) {
    const reason = (drafts[volunteerId]?.reason || "").trim();
    if (reason.length === 0) {
      setNote("Please provide a reason before reviewing the application.");
      return;
    }
    if (reason.length < 5) {
      setNote("Reason must be at least 5 characters.");
      return;
    }
    approveRejectMutation.mutate({ volunteerId, decision, reason, assignedPosition: drafts[volunteerId]?.assignedPosition || "" });
  }

  function updateReason(volunteerId: string, reason: string) {
    if (note) {
      setNote(null);
    }
    setDrafts((current) => ({
      ...current,
      [volunteerId]: {
        reason,
        assignedPosition: current[volunteerId]?.assignedPosition || "",
        decision: current[volunteerId]?.decision || "Shortlisted",
      },
    }));
  }

  function updateAssignedPosition(volunteerId: string, assignedPosition: string) {
    setDrafts((current) => ({
      ...current,
      [volunteerId]: {
        reason: current[volunteerId]?.reason || "",
        assignedPosition,
        decision: current[volunteerId]?.decision || "Shortlisted",
      },
    }));
  }

  return (
    <PageScreen title="Volunteer Management" subtitle="Review volunteer applications for this event with a reason for every decision.">
      <section className="page-section constitution-form-card constitution-form-card--submit">
        {!hasValidId ? (
          <div className="alert">Invalid event link.</div>
        ) : eventLoading ? (
          <div className="notice">Loading event...</div>
        ) : event ? (
          <div className="event-review-hero">
            <div>
              <p className="eyebrow">Event Snapshot</p>
              <h2 className="page-section__title" style={{ fontSize: "1.6rem" }}>{event.title}</h2>
              <p>{event.description || "No description provided."}</p>
              <p><strong>Date:</strong> {new Date(event.eventDate).toLocaleString()}</p>
              <p><strong>Venue:</strong> {event.venue}</p>
              <p><strong>Status:</strong> <span className="chip">{event.status}</span></p>
              <p>
                <strong>Volunteer eligibility:</strong>{" "}
                {(event.volunteerEligibility?.allowedYears || []).length === 0 && (event.volunteerEligibility?.allowedBatches || []).length === 0
                  ? "All active members"
                  : `${
                      (event.volunteerEligibility?.allowedYears || []).length > 0
                        ? `Year ${(event.volunteerEligibility?.allowedYears || []).join(", ")}`
                        : "Year all"
                    } | ${
                      (event.volunteerEligibility?.allowedBatches || []).length > 0
                        ? `Batch ${(event.volunteerEligibility?.allowedBatches || []).join(", ")}`
                        : "Batch all"
                    }`}
              </p>
            </div>
            <div className="event-review-actions">
              <Link className="secondary-button" to={`/events/${event._id}`}>Open public page</Link>
              <Link className="secondary-button" to="/dashboard/events">Back to events</Link>
            </div>
          </div>
        ) : (
          <div className="alert">Event not found. It may have been removed.</div>
        )}
      </section>

      {!canManage ? (
        <section className="page-section">
          <div className="empty-state">Only event managers can approve or reject volunteer applications.</div>
        </section>
      ) : (
        <>
          <section className="page-section">
            <div className="constitution-section-header">
              <div>
                <p className="constitution-section-header__eyebrow">Pending queue</p>
                <h2 className="page-section__title">Pending applications</h2>
              </div>
              <span className="chip">{pending.length} pending</span>
            </div>

            {volunteersLoading ? <div className="notice">Loading applications...</div> : null}
            {pending.length === 0 ? <div className="empty-state">No pending volunteer applications.</div> : null}

            <div className="constitution-article-list">
              {pending.map((item) => (
                <article className="constitution-history-card" key={item._id}>
                  <div className="constitution-history-card__meta">
                    <span className="constitution-history-card__version">{item.memberId?.studentId || item._id}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <h4>{item.role}</h4>
                  <p><strong>Member status:</strong> {item.memberId?.status || "Unknown"}</p>
                  <p><strong>Preferred positions:</strong> {(item.preferredPositions || []).length > 0 ? item.preferredPositions?.join(", ") : "Any"}</p>
                  {item.availability ? <p><strong>Availability:</strong> {item.availability}</p> : null}
                  <p>{item.message || "No application note provided."}</p>

                  <div className="form-grid">
                    <label className="field" style={{ gridColumn: "1 / -1" }}>
                      <span>Reason for approval or rejection</span>
                      <textarea
                        value={drafts[item._id]?.reason || item.reviewNote || ""}
                        onChange={(event) => updateReason(item._id, event.target.value)}
                        placeholder="Explain why this volunteer should be approved or rejected..."
                        style={{ minHeight: 120 }}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Assign position (optional)</span>
                      <input
                        value={drafts[item._id]?.assignedPosition || item.assignedPosition || ""}
                        onChange={(event) => updateAssignedPosition(item._id, event.target.value)}
                        placeholder="Registration desk"
                      />
                    </label>
                    <div className="button-row" style={{ gridColumn: "1 / -1", flexWrap: "wrap" }}>
                      <button type="button" className="secondary-button" onClick={() => handleDecisionSubmit(item._id, "Shortlisted")} disabled={approveRejectMutation.isPending}>
                        Shortlist
                      </button>
                      <button type="button" className="secondary-button" onClick={() => handleDecisionSubmit(item._id, "Waitlisted")} disabled={approveRejectMutation.isPending}>
                        Waitlist
                      </button>
                      <button className="primary-button" type="button" disabled={approveRejectMutation.isPending} onClick={() => handleDecisionSubmit(item._id, "Approved")}>
                        Approve
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={approveRejectMutation.isPending}
                        onClick={() => handleDecisionSubmit(item._id, "Rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="grid-2">
            <section className="page-section">
              <h2 className="page-section__title">Approved volunteers</h2>
              <div className="stack">
                {approved.length === 0 ? <div className="empty-state">No approved volunteers yet.</div> : null}
                {approved.map((item) => (
                  <div className="card" key={item._id}>
                    <p><strong>{item.memberId?.studentId || item._id}</strong></p>
                    <p>{item.role}</p>
                    <p>{item.assignedPosition || "Assigned position not set."}</p>
                    <p>{item.reviewNote || "Approved without note."}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-section">
              <h2 className="page-section__title">Shortlisted volunteers</h2>
              <div className="stack">
                {shortlisted.length === 0 ? <div className="empty-state">No shortlisted volunteers yet.</div> : null}
                {shortlisted.map((item) => (
                  <div className="card" key={item._id}>
                    <p><strong>{item.memberId?.studentId || item._id}</strong></p>
                    <p>{item.role}</p>
                    <p>{item.assignedPosition || "No position assigned."}</p>
                    <p>{item.reviewNote || "Shortlisted without note."}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-section">
              <h2 className="page-section__title">Waitlisted volunteers</h2>
              <div className="stack">
                {waitlisted.length === 0 ? <div className="empty-state">No waitlisted volunteers yet.</div> : null}
                {waitlisted.map((item) => (
                  <div className="card" key={item._id}>
                    <p><strong>{item.memberId?.studentId || item._id}</strong></p>
                    <p>{item.role}</p>
                    <p>{item.reviewNote || "Waitlisted without note."}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-section">
              <h2 className="page-section__title">Rejected volunteers</h2>
              <div className="stack">
                {rejected.length === 0 ? <div className="empty-state">No rejected volunteers yet.</div> : null}
                {rejected.map((item) => (
                  <div className="card" key={item._id}>
                    <p><strong>{item.memberId?.studentId || item._id}</strong></p>
                    <p>{item.role}</p>
                    <p>{item.reviewNote || "Rejected without note."}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {note ? <div className="notice">{note}</div> : null}
        </>
      )}
    </PageScreen>
  );
}
