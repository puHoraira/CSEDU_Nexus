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
    <PageScreen title="CSEDU Nexus" subtitle="Digital club management platform for CSEDUSC.">
      <div className="hero-card-grid">
        <div className="card">
          <p className="eyebrow">Welcome</p>
          <h2>One platform for members, EC, governance, finance, and elections.</h2>
          <p>Built for role-aware workflows, transparent records, and future extension.</p>
          <div className="button-row">
            {user ? (
              <>
                <Link className="primary-button" to="/dashboard/home">Go to Dashboard</Link>
                <Link className="secondary-button" to="/dashboard/profile">Open Profile</Link>
              </>
            ) : (
              <>
                <Link className="primary-button" to="/auth/register">Join as Member</Link>
                <Link className="secondary-button" to="/auth/login">Login</Link>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Quick entry</p>
          <p>Events, notices, constitution, and club information should be immediately visible to visitors.</p>
          <div className="button-row">
            <Link className="secondary-button" to="/events">Browse events</Link>
            <Link className="secondary-button" to="/notices">Latest notices</Link>
          </div>
        </div>
      </div>

      <section className="page-section">
        <h2 className="page-section__title">Upcoming events</h2>
        <div className="grid-3">
          {events.slice(0, 3).map((event) => (
            <article key={event._id} className="stat-card">
              <h3>{event.title}</h3>
              <strong>{new Date(event.eventDate).toLocaleDateString()}</strong>
              <p>{event.venue}</p>
              <span className="chip">{event.status}</span>
            </article>
          ))}
          {events.length === 0 ? <div className="empty-state">No public events yet.</div> : null}
        </div>
      </section>
    </PageScreen>
  );
}