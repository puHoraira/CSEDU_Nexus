import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageScreen } from "../../components/ui/PageScreen";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";

export function HomePage() {
  const { user } = useAuth();
  const { data: events = [] } = useQuery({
    queryKey: ["public-events"],
    queryFn: () => apiRequest<Array<{ _id: string; title: string; eventDate: string; venue: string; status: string }>>("/events"),
  });

  return (
    <PageScreen title="CSEDU Nexus" subtitle="A modern operating system for student club management, public information, and role-based workflows.">
      <section className="page-section constitution-form-card constitution-form-card--submit">
        <div className="event-review-hero">
          <div style={{ maxWidth: 760 }}>
            <p className="eyebrow">Student club platform</p>
            <h2 className="page-section__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 10 }}>
              Manage events, volunteers, governance, finance, and elections in one place.
            </h2>
            <p style={{ lineHeight: 1.7, color: "var(--muted)" }}>
              The interface is structured around clear actions, visible states, and real workflow boundaries so members and organizers can work without guessing.
            </p>
            <div className="button-row" style={{ marginTop: 18 }}>
              {user ? (
                <>
                  <Link className="primary-button" to="/dashboard/home">Open Dashboard</Link>
                  <Link className="secondary-button" to="/dashboard/profile">Profile</Link>
                </>
              ) : (
                <>
                  <Link className="primary-button" to="/auth/register">Become a Member</Link>
                  <Link className="secondary-button" to="/auth/login">Login</Link>
                </>
              )}
              <Link className="secondary-button" to="/events">Explore Events</Link>
            </div>
          </div>

          <div className="card" style={{ minWidth: 280, maxWidth: 360 }}>
            <p className="eyebrow">Today</p>
            <h3 style={{ marginTop: 0 }}>What the platform helps with</h3>
            <div className="stack" style={{ gap: 10 }}>
              <span className="chip">Public event browsing</span>
              <span className="chip">Volunteer applications</span>
              <span className="chip">Meeting room handling</span>
              <span className="chip">Approvals and audit trail</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-3" style={{ marginTop: 18 }}>
        <div className="stat-card">
          <h3>Transparent</h3>
          <strong>Visible workflows</strong>
          <p>Every key action is tied to a role and a clear state change.</p>
        </div>
        <div className="stat-card">
          <h3>Practical</h3>
          <strong>Real operations</strong>
          <p>Events, volunteers, approvals, and records follow realistic club procedures.</p>
        </div>
        <div className="stat-card">
          <h3>Scalable</h3>
          <strong>Structured design</strong>
          <p>Reusable screens and consistent components make growth easier.</p>
        </div>
      </div>

      <section className="page-section">
        <div className="constitution-section-header">
          <div>
            <p className="constitution-section-header__eyebrow">Upcoming</p>
            <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>Upcoming events</h2>
          </div>
          <Link className="secondary-button" to="/events">All events</Link>
        </div>

        <div className="grid-3">
          {events.slice(0, 3).map((event) => (
            <article key={event._id} className="event-card">
              <div className="event-card__head">
                <h3>{event.title}</h3>
                <span className="chip">{event.status}</span>
              </div>
              <p className="event-card__meta">{new Date(event.eventDate).toLocaleDateString()} • {event.venue}</p>
              <div className="event-card__footer">
                <span className="chip">Public</span>
                <Link className="secondary-button" to={`/events/${event._id}`}>Open</Link>
              </div>
            </article>
          ))}
          {events.length === 0 ? <div className="empty-state">No public events yet.</div> : null}
        </div>
      </section>
    </PageScreen>
  );
}