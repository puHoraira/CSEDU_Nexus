import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type EventRow = { _id: string; title: string; eventDate: string; venue: string; status: string };

export function AlumniPortalPage() {
  const { user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["alumni-events"], queryFn: () => apiRequest<EventRow[]>("/events") });
  const isAlumni = (user?.roles || []).includes("Alumni");

  return (
    <PageScreen title="Alumni Portal" subtitle="Event visibility and election-commission eligibility status for alumni.">
      <section className="page-section">
        <h2 className="page-section__title">Eligibility</h2>
        <p>
          <strong>Status:</strong> <span className="chip">{isAlumni ? "Alumni verified" : "Not marked as Alumni"}</span>
        </p>
        <p>Only users with Alumni role can be appointed as Election Commissioner by Moderator workflow.</p>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Upcoming events</h2>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Date</th><th>Venue</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td>{new Date(item.eventDate).toLocaleString()}</td>
                <td>{item.venue}</td>
                <td><span className="chip">{item.status}</span></td>
                <td><Link className="secondary-button" to={`/events/${item._id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}