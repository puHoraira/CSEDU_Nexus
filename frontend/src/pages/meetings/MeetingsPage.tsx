import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type MeetingRow = { _id: string; roomId?: string; meetingMode: string; title: string; agenda: string; meetingDate: string; venue: string; status: string };

export function MeetingsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = user?.roles.some((role) => ["President", "General Secretary"].includes(role));
  const [form, setForm] = useState({ title: "", agenda: "", meetingDate: "", venue: "", meetingMode: "Online" });
  const [error, setError] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["meetings", token],
    queryFn: () => apiRequest<MeetingRow[]>("/meetings", { token }),
    enabled: Boolean(token),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/meetings", {
        method: "POST",
        token,
        body: JSON.stringify({ ...form, meetingDate: new Date(form.meetingDate).toISOString() }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meetings", token] });
      setForm({ title: "", agenda: "", meetingDate: "", venue: "", meetingMode: "Online" });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="Meetings" subtitle="Schedule and monitor committee meetings.">
      {canCreate ? (
        <section className="page-section">
          <h2 className="page-section__title">Create meeting</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field"><span>Meeting mode</span><select value={form.meetingMode} onChange={(e) => setForm((current) => ({ ...current, meetingMode: e.target.value }))}><option value="Online">Online</option><option value="Offline">Offline</option></select></label>
            <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required /></label>
            <label className="field"><span>Agenda</span><input value={form.agenda} onChange={(e) => setForm((current) => ({ ...current, agenda: e.target.value }))} /></label>
            <label className="field"><span>Date</span><input type="datetime-local" value={form.meetingDate} onChange={(e) => setForm((current) => ({ ...current, meetingDate: e.target.value }))} required /></label>
            <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required /></label>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create meeting"}</button></div>
          </form>
          {error ? <div className="alert">{error}</div> : null}
        </section>
      ) : null}

      <section className="page-section">
        <h2 className="page-section__title">Meeting list</h2>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Date</th><th>Venue</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map((meeting) => (
              (() => {
                const meetingMode = meeting.meetingMode || (meeting.roomId ? "Online" : "Offline");
                return (
              <tr key={meeting._id}>
                <td>{meeting.title}</td>
                <td>{new Date(meeting.meetingDate).toLocaleString()}</td>
                <td>{meeting.venue}</td>
                <td>
                  <div className="stack">
                    <span className="chip">{meeting.status}</span>
                    <span className="chip">{meetingMode}</span>
                    {meeting.roomId ? <span className="chip">Room: {meeting.roomId}</span> : <span className="chip">No room</span>}
                  </div>
                </td>
                <td>
                  <div className="button-row">
                    <Link className="secondary-button" to={`/dashboard/meetings/${meeting._id}`}>Details</Link>
                    {meetingMode === "Online" ? <Link className="primary-button" to={`/dashboard/meetings/${meeting._id}/room`}>Join Room</Link> : <span className="chip">Offline meeting</span>}
                  </div>
                </td>
              </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}