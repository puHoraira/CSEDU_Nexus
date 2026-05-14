import { FormEvent, useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type MeetingRow = { 
  _id: string; roomId?: string; meetingMode: string; title: string; 
  agenda: string; meetingDate: string; venue: string; status: string; minutes?: string 
};

export function MeetingEditPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ 
    title: "", agenda: "", meetingDate: "", venue: "", meetingMode: "Online" 
  });
  const [error, setError] = useState<string | null>(null);

  const { data: meetings = [], isLoading } = useQuery({ 
    queryKey: ["meetings", token], 
    queryFn: () => apiRequest<MeetingRow[]>("/meetings", { token }), 
    enabled: Boolean(token) 
  });

  const meeting = useMemo(() => meetings.find((item) => item._id === id), [meetings, id]);

  useEffect(() => {
    if (!meeting) return;
    setForm({
      title: meeting.title,
      agenda: meeting.agenda,
      meetingDate: new Date(meeting.meetingDate).toISOString().slice(0, 16),
      venue: meeting.venue,
      meetingMode: meeting.meetingMode || (meeting.roomId ? "Online" : "Offline"),
    });
  }, [meeting]);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/meetings/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ 
          ...form, 
          meetingDate: new Date(form.meetingDate).toISOString() 
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meetings", token] });
      setError(null);
      navigate(`/dashboard/meetings/${id}`);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  if (isLoading) return <PageScreen title="Edit Meeting" subtitle="Loading..."><div className="notice">Loading meeting...</div></PageScreen>;
  if (!meeting) return <PageScreen title="Edit Meeting" subtitle="Meeting not found"><div className="alert">Meeting not found</div></PageScreen>;

  const canEdit = user?.roles.some(r => ['President', 'General Secretary', 'Moderator'].includes(r));
  if (!canEdit) return <PageScreen title="Edit Meeting" subtitle="Unauthorized"><div className="alert">You don't have permission to edit this meeting</div></PageScreen>;

  // Don't allow editing past meetings
  const isPast = new Date(meeting.meetingDate) < new Date();
  if (isPast && meeting.status === 'Completed') {
    return (
      <PageScreen title="Edit Meeting" subtitle="Cannot edit completed meeting">
        <div className="alert">Cannot edit meetings that have already been completed</div>
      </PageScreen>
    );
  }

  return (
    <PageScreen title="Edit Meeting" subtitle={`Editing: ${meeting.title}`}>
      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Meeting mode</span>
            <select value={form.meetingMode} onChange={(e) => setForm((current) => ({ ...current, meetingMode: e.target.value }))}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </label>
          <label className="field">
            <span>Title</span>
            <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Agenda</span>
            <input value={form.agenda} onChange={(e) => setForm((current) => ({ ...current, agenda: e.target.value }))} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="datetime-local" value={form.meetingDate} onChange={(e) => setForm((current) => ({ ...current, meetingDate: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Venue</span>
            <input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required />
          </label>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => navigate(`/dashboard/meetings/${id}`)}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>
    </PageScreen>
  );
}
