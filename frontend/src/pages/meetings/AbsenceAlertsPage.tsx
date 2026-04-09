import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

export function AbsenceAlertsPage() {
  const { token } = useAuth();
  const [memberIds, setMemberIds] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [alerts, setAlerts] = useState<Array<{ memberId: string; message: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiRequest<Array<{ memberId: string; message: string }>>("/meetings/absence-alerts", { method: "POST", token, body: JSON.stringify({ memberIds: memberIds.split(",").map((value) => value.trim()).filter(Boolean), threshold }) }),
    onSuccess: (data) => {
      setAlerts(data);
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="Absence Alerts" subtitle="Members with repeated missed meetings.">
      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Member IDs (comma separated)</span><textarea value={memberIds} onChange={(e) => setMemberIds(e.target.value)} /></label>
          <label className="field"><span>Threshold</span><input type="number" min={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Checking..." : "Run check"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>
      <section className="page-section">
        <h2 className="page-section__title">Alerts</h2>
        <table className="data-table">
          <thead><tr><th>Member ID</th><th>Message</th></tr></thead>
          <tbody>{alerts.map((alert) => <tr key={alert.memberId}><td>{alert.memberId}</td><td>{alert.message}</td></tr>)}</tbody>
        </table>
      </section>
    </PageScreen>
  );
}