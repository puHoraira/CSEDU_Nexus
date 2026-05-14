import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type MeetingRow = { _id: string; roomId?: string; meetingMode: string; title: string; agenda: string; meetingDate: string; venue: string; status: string; minutes?: string };

export function MeetingDetailsPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["meetings", token], queryFn: () => apiRequest<MeetingRow[]>("/meetings", { token }), enabled: Boolean(token) });
  const meeting = useMemo(() => data.find((item) => item._id === id), [data, id]);
  const meetingMode = meeting?.meetingMode || (meeting?.roomId ? "Online" : "Offline");
  const canEdit = user?.roles.some(r => ['President', 'General Secretary', 'Moderator'].includes(r));

  return (
    <PageScreen title="Meeting Details" subtitle="Minutes, decisions, and meeting status.">
      {meeting ? (
        <section className="page-section">
          <h2 className="page-section__title">{meeting.title}</h2>
          <p><strong>Date:</strong> {new Date(meeting.meetingDate).toLocaleString()}</p>
          <p><strong>Venue:</strong> {meeting.venue}</p>
          <p><strong>Mode:</strong> <span className="chip">{meetingMode}</span></p>
          <p><strong>Room:</strong> {meeting.roomId || "No room for offline meeting"}</p>
          <p><strong>Agenda:</strong> {meeting.agenda}</p>
          <p><strong>Status:</strong> <span className="chip">{meeting.status}</span></p>
          <p>{meeting.minutes || "Minutes not added yet."}</p>
          <div className="button-row">
            {meetingMode === "Online" ? <Link className="primary-button" to={`/dashboard/meetings/${meeting._id}/room`}>Open Zego Room</Link> : <span className="chip">Offline meeting</span>}
            <Link className="secondary-button" to={`/dashboard/meetings/${meeting._id}/attendance`}>Attendance</Link>
            {canEdit && <Link className="secondary-button" to={`/dashboard/meetings/${meeting._id}/edit`}>Edit Meeting</Link>}
          </div>
        </section>
      ) : (
        <div className="notice">Open the meetings list to view a meeting.</div>
      )}
    </PageScreen>
  );
}