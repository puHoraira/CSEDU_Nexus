import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type PostRow = { _id: string; code: string; title: string };
type TermRow = { _id: string; name: string };
type MemberRow = { _id: string; studentId: string; batch: number };
type AppointmentRow = {
  _id: string;
  startsOn: string;
  source: string;
  termId?: { name?: string };
  postId?: { title?: string };
  memberId?: { studentId?: string; batch?: number };
};

export function EcAppointmentsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ termId: "", postId: "", memberId: "", startsOn: "", source: "Election", memberEcYears: 0 });
  const [error, setError] = useState<string | null>(null);

  const { data: posts = [] } = useQuery({ queryKey: ["ec-posts-select", token], queryFn: () => apiRequest<PostRow[]>("/governance/ec-posts", { token }), enabled: Boolean(token) });
  const { data: terms = [] } = useQuery({ queryKey: ["ec-terms-select", token], queryFn: () => apiRequest<TermRow[]>("/governance/ec-terms", { token }), enabled: Boolean(token) });
  const { data: members = [] } = useQuery({ queryKey: ["members-select", token], queryFn: () => apiRequest<MemberRow[]>("/membership/members", { token }), enabled: Boolean(token) });
  const { data: appointments = [] } = useQuery({ queryKey: ["ec-appointments", token], queryFn: () => apiRequest<AppointmentRow[]>("/governance/ec-appointments", { token }), enabled: Boolean(token) });

  const mutation = useMutation({
    mutationFn: () => apiRequest("/governance/ec-appointments", { method: "POST", token, body: JSON.stringify(form) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ec-appointments", token] });
      setForm({ termId: "", postId: "", memberId: "", startsOn: "", source: "Election", memberEcYears: 0 });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="EC Appointments" subtitle="Assign members to posts by term.">
      <section className="page-section">
        <h2 className="page-section__title">Create appointment</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Term</span><select value={form.termId} onChange={(e) => setForm((current) => ({ ...current, termId: e.target.value }))} required><option value="">Select term</option>{terms.map((term) => <option key={term._id} value={term._id}>{term.name}</option>)}</select></label>
          <label className="field"><span>Post</span><select value={form.postId} onChange={(e) => setForm((current) => ({ ...current, postId: e.target.value }))} required><option value="">Select post</option>{posts.map((post) => <option key={post._id} value={post._id}>{post.title}</option>)}</select></label>
          <label className="field"><span>Member</span><select value={form.memberId} onChange={(e) => setForm((current) => ({ ...current, memberId: e.target.value }))} required><option value="">Select member</option>{members.map((member) => <option key={member._id} value={member._id}>{member.studentId} / Batch {member.batch}</option>)}</select></label>
          <label className="field"><span>Starts on</span><input type="datetime-local" value={form.startsOn} onChange={(e) => setForm((current) => ({ ...current, startsOn: e.target.value }))} required /></label>
          <label className="field"><span>Source</span><select value={form.source} onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))}><option>Election</option><option>VacancyFill</option><option>Nomination</option></select></label>
          <label className="field"><span>Member EC years</span><input type="number" min={0} value={form.memberEcYears} onChange={(e) => setForm((current) => ({ ...current, memberEcYears: Number(e.target.value) }))} /></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Assign member"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Appointments</h2>
        <table className="data-table">
          <thead><tr><th>Term</th><th>Post</th><th>Member</th><th>Starts</th><th>Source</th></tr></thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment._id}>
                <td>{appointment.termId?.name}</td>
                <td>{appointment.postId?.title}</td>
                <td>{appointment.memberId?.studentId}</td>
                <td>{new Date(appointment.startsOn).toLocaleDateString()}</td>
                <td><span className="chip">{appointment.source}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}