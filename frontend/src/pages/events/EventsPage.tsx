import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
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
};

export function EventsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiRequest<EventRow[]>("/events"),
  });

  const rows = useMemo(
    () =>
      data
        .filter((event) => event.title.toLowerCase().includes(search.toLowerCase()) || event.venue.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    [data, search]
  );

  const canCreate = user?.roles.some((role) => ["President", "Vice President", "General Secretary", "AGS (Organization)"].includes(role));
  const canManageVolunteers = user?.roles.some((role) => ["President", "Vice President", "General Secretary", "AGS (Organization)"].includes(role));

  const plannedCount = rows.filter((item) => item.status === "Planned").length;
  const ongoingCount = rows.filter((item) => item.status === "Ongoing").length;
  const completedCount = rows.filter((item) => item.status === "Completed").length;

  function getEligibilityLabel(event: EventRow) {
    const years = event.volunteerEligibility?.allowedYears || [];
    const batches = event.volunteerEligibility?.allowedBatches || [];
    if (years.length === 0 && batches.length === 0) {
      return "Volunteer eligibility: All active members";
    }
    const parts: string[] = [];
    if (years.length > 0) {
      parts.push(`Year ${years.join(", ")}`);
    }
    if (batches.length > 0) {
      parts.push(`Batch ${batches.join(", ")}`);
    }
    return `Volunteer eligibility: ${parts.join(" | ")}`;
  }

  return (
    <PageScreen title="Events" subtitle="Event command center for discovery, scheduling, and volunteer workflows.">
      <section className="page-section constitution-form-card">
        <div className="constitution-section-header">
          <div>
            <p className="constitution-section-header__eyebrow">Operations</p>
            <h2 className="page-section__title" style={{ fontSize: "1.5rem" }}>Event Dashboard</h2>
          </div>
          {canCreate ? (
            <Link className="primary-button" to="/dashboard/events/create">
              Create event
            </Link>
          ) : null}
        </div>

        <div className="grid-3">
          <div className="stat-card"><h3>Planned</h3><strong>{plannedCount}</strong></div>
          <div className="stat-card"><h3>Ongoing</h3><strong>{ongoingCount}</strong></div>
          <div className="stat-card"><h3>Completed</h3><strong>{completedCount}</strong></div>
        </div>
      </section>

      <section className="page-section">
        <div className="form-actions" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <label className="field" style={{ flex: 1, maxWidth: 420 }}>
            <span>Search events</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or venue" />
          </label>
        </div>

        {isLoading ? <div className="notice">Loading events...</div> : null}
        {error ? <div className="alert">Failed to load events.</div> : null}

        {!isLoading && rows.length === 0 ? <div className="empty-state">No events found for your query.</div> : null}

        <div className="event-card-grid">
          {rows.map((event) => (
            <article key={event._id} className="event-card">
              <div className="event-card__head">
                <h3>{event.title}</h3>
                <span className="chip">{event.status}</span>
              </div>
              <p className="event-card__meta">{new Date(event.eventDate).toLocaleString()} at {event.venue}</p>
              <p className="event-card__description">{event.description || "No description provided."}</p>
              <p className="event-card__description" style={{ marginTop: 8 }}>{getEligibilityLabel(event)}</p>
              <div className="event-card__footer">
                <p><strong>Budget:</strong> ৳{event.budget ?? 0}</p>
                <div className="button-row">
                  <Link className="secondary-button" to={`/events/${event._id}`}>View</Link>
                  {canCreate ? (
                    <Link className="secondary-button" to={`/dashboard/events/${event._id}/edit`}>Edit</Link>
                  ) : null}
                  {canManageVolunteers ? (
                    <Link className="secondary-button" to={`/dashboard/events/${event._id}/volunteers`}>Volunteers</Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageScreen>
  );
}