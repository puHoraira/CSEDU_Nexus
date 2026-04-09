import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Entry = { memberId: string; present: boolean };

export function MeetingAttendancePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [memberId, setMemberId] = useState("");
  const [present, setPresent] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiRequest("/meetings/attendance", { method: "POST", token, body: JSON.stringify({ meetingId: id, entries }) }),
    onSuccess: () => {
      setEntries([]);
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberId) return;
    setEntries((current) => [...current, { memberId, present }]);
    setMemberId("");
    setPresent(true);
  }

  return (
    <PageScreen title="Attendance" subtitle="Record present and absent members.">
      <section className="page-section">
        <h2 className="page-section__title">Meeting {id}</h2>
        <form className="form-grid" onSubmit={addEntry}>
          <label className="field"><span>Member ID</span><input value={memberId} onChange={(e) => setMemberId(e.target.value)} required /></label>
          <label className="field"><span>Present</span><select value={String(present)} onChange={(e) => setPresent(e.target.value === "true")}><option value="true">Present</option><option value="false">Absent</option></select></label>
          <div className="form-actions"><button className="secondary-button" type="submit">Add row</button></div>
        </form>
        <table className="data-table">
          <thead><tr><th>Member ID</th><th>Status</th></tr></thead>
          <tbody>{entries.map((entry, index) => <tr key={`${entry.memberId}-${index}`}><td>{entry.memberId}</td><td><span className="chip">{entry.present ? "Present" : "Absent"}</span></td></tr>)}</tbody>
        </table>
        {error ? <div className="alert">{error}</div> : null}
        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || entries.length === 0}>
            {mutation.isPending ? "Saving..." : "Submit attendance"}
          </button>
        </div>
      </section>
    </PageScreen>
  );
}