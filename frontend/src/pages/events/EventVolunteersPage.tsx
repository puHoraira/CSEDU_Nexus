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
  createdBy?: { firstName?: string; lastName?: string; email?: string };
};

type VolunteerRow = {
  _id: string;
  role: string;
  message?: string;
  status: "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  memberId?: { studentId?: string; batch?: number; currentYear?: number; status?: string };
  reviewedBy?: { firstName?: string; lastName?: string; email?: string };
};

const MANAGER_ROLES = ["President", "Vice President", "General Secretary", "AGS (Organization)"];

type DecisionDraft = {
  reason: string;
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
    mutationFn: ({ volunteerId, decision, reason }: { volunteerId: string; decision: "Approved" | "Rejected"; reason: string }) =>
      apiRequest(`/events/volunteers/${volunteerId}/review`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ decision, reason }),
      }),
    onSuccess: async () => {
      setNote("Volunteer application reviewed.");
      await queryClient.invalidateQueries({ queryKey: ["event-volunteers", id, token] });
      await refetch();
    },
    onError: (error) => setNote(normalizeApiError(error)),
  });

  const sortedVolunteers = useMemo(() => volunteers, [volunteers]);
  const pending = sortedVolunteers.filter((item) => item.status === "Pending");
  const approved = sortedVolunteers.filter((item) => item.status === "Approved");
  const rejected = sortedVolunteers.filter((item) => item.status === "Rejected");

  const canManage = Boolean(user?.roles.some((role) => MANAGER_ROLES.includes(role)));

  function handleDecisionSubmit(volunteerId: string, decision: "Approved" | "Rejected") {
    const reason = drafts[volunteerId]?.reason || "";
    if (reason.trim().length < 5) {
      setNote("Please provide a reason before reviewing the application.");
      return;
    }
    approveRejectMutation.mutate({ volunteerId, decision, reason });
  }

  function updateReason(volunteerId: string, reason: string) {
    setDrafts((current) => ({ ...current, [volunteerId]: { reason } }));
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
                    <div className="form-actions">
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
                    <p>{item.reviewNote || "Approved without note."}</p>
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
