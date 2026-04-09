import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

export function MeetingCreatePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", agenda: "", meetingDate: "", venue: "", meetingMode: "Online" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; roomId?: string; meetingMode: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ title: string; roomId?: string; meetingMode: string }>("/meetings", {
        method: "POST",
        token,
        body: JSON.stringify({ ...form, meetingDate: new Date(form.meetingDate).toISOString() }),
      }),
    onSuccess: async (meeting) => {
      await queryClient.invalidateQueries({ queryKey: ["meetings", token] });
      setSuccess({ title: meeting.title, roomId: meeting.roomId, meetingMode: meeting.meetingMode });
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
    <PageScreen title="Create Meeting" subtitle="Set title, agenda, venue, and date. The room is created automatically.">
      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Meeting mode</span>
            <select value={form.meetingMode} onChange={(e) => setForm((current) => ({ ...current, meetingMode: e.target.value }))}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </label>
          <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required /></label>
          <label className="field"><span>Agenda</span><input value={form.agenda} onChange={(e) => setForm((current) => ({ ...current, agenda: e.target.value }))} /></label>
          <label className="field"><span>Date</span><input type="datetime-local" value={form.meetingDate} onChange={(e) => setForm((current) => ({ ...current, meetingDate: e.target.value }))} required /></label>
          <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required /></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create meeting"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
        {success ? <div className="success">Created {success.title}. {success.meetingMode === "Online" ? `Room ready: ${success.roomId}` : "Offline meeting created."}</div> : null}
      </section>
    </PageScreen>
  );
}