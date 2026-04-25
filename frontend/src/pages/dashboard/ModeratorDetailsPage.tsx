import { Link } from "react-router-dom";
import { ChangeEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type ModeratorDetails = {
  profile: {
    name: string;
    email: string;
    studentId: string | null;
    batch: number | null;
    currentYear: number | null;
    memberStatus: string | null;
  };
  access: {
    roles: string[];
    permissions: string[];
  };
  queues: {
    pendingCancellationCount: number;
    pendingCandidateCount: number;
    activeElectionCount: number;
    upcomingMeetingCount: number;
  };
  financialSummary: {
    income: number;
    expenditure: number;
    balance: number;
  };
  pendingCancellations: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
    member?: { studentId?: string; batch?: number; currentYear?: number; status?: string };
  }>;
  pendingCandidates: Array<{
    id: string;
    status: string;
    election?: { name?: string; phase?: number; status?: string };
    member?: { studentId?: string; batch?: number; currentYear?: number };
    post?: { title?: string };
  }>;
  upcomingMeetings: Array<{ _id: string; title: string; meetingDate: string; venue: string; status: string }>;
  recentAudit: Array<{ _id: string; action: string; resource: string; createdAt: string }>;
};

export function ModeratorDetailsPage() {
  const { token, loading } = useAuth();
  const [csvFileName, setCsvFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["moderator-details", token],
    queryFn: () => apiRequest<ModeratorDetails>("/moderator/details", { token }),
    enabled: Boolean(token) && !loading,
  });

  const bulkRegisterMutation = useMutation({
    mutationFn: () =>
      apiRequest<{
        totalRows: number;
        created: number;
        skipped: number;
        errors: Array<{ rowNumber: number; message: string }>;
      }>("/moderator/bulk-register-csv", {
        method: "POST",
        token,
        body: JSON.stringify({ csvContent }),
      }),
    onSuccess: (result) => {
      const errorCount = result.errors?.length || 0;
      setCsvMessage(`CSV processed. Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${errorCount}`);
    },
    onError: (error) => setCsvMessage(normalizeApiError(error)),
  });

  function handleCsvSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  }

  return (
    <PageScreen title="Moderator Details" subtitle="Moderation queues, oversight insights, and governance access.">
      {isLoading ? <div className="info">Loading moderator details...</div> : null}

      <div className="grid-3">
        <div className="stat-card"><h3>Pending cancellations</h3><strong>{data?.queues.pendingCancellationCount ?? 0}</strong></div>
        <div className="stat-card"><h3>Pending candidates</h3><strong>{data?.queues.pendingCandidateCount ?? 0}</strong></div>
        <div className="stat-card"><h3>Active elections</h3><strong>{data?.queues.activeElectionCount ?? 0}</strong></div>
      </div>

      <section className="page-section">
        <h2 className="page-section__title">Moderator profile</h2>
        <div className="grid-2">
          <div className="card">
            <p><strong>Name:</strong> {data?.profile.name || "-"}</p>
            <p><strong>Email:</strong> {data?.profile.email || "-"}</p>
            <p><strong>Student ID:</strong> {data?.profile.studentId || "-"}</p>
          </div>
          <div className="card">
            <p><strong>Batch:</strong> {data?.profile.batch ?? "-"}</p>
            <p><strong>Current year:</strong> {data?.profile.currentYear ?? "-"}</p>
            <p><strong>Member status:</strong> <span className="chip">{data?.profile.memberStatus || "-"}</span></p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Operational queues</h2>
        <div className="button-row">
          <Link className="secondary-button" to="/dashboard/membership/cancellations">Open cancellation workflow</Link>
          <Link className="secondary-button" to="/dashboard/elections">Open elections</Link>
          <Link className="secondary-button" to="/dashboard/finance/ledger">Open finance ledger</Link>
          <Link className="secondary-button" to="/dashboard/governance/constitution-editor">Open constitution editor</Link>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Bulk registration (CSV)</h2>
        <p>Upload a CSV file to auto-register student users in bulk as General Member accounts.</p>
        <div className="form-grid">
          <label className="field">
            <span>CSV File</span>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvSelect} />
          </label>
          <div className="form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => bulkRegisterMutation.mutate()}
              disabled={!csvContent || bulkRegisterMutation.isPending}
            >
              {bulkRegisterMutation.isPending ? "Processing..." : "Register all from CSV"}
            </button>
          </div>
        </div>
        {csvFileName ? <p><strong>Selected:</strong> {csvFileName}</p> : null}
        <p className="info">Required columns: firstName,lastName,email,password,studentId,batch,currentYear,experience</p>
        {csvMessage ? <div className="notice">{csvMessage}</div> : null}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Pending cancellations</h2>
        <table className="data-table">
          <thead><tr><th>Member</th><th>Reason</th><th>Status</th><th>Requested</th></tr></thead>
          <tbody>
            {(data?.pendingCancellations || []).map((row) => (
              <tr key={row.id}>
                <td>{row.member?.studentId || row.id}</td>
                <td>{row.reason}</td>
                <td><span className="chip">{row.status}</span></td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Pending election candidates</h2>
        <table className="data-table">
          <thead><tr><th>Election</th><th>Member</th><th>Post</th><th>Status</th></tr></thead>
          <tbody>
            {(data?.pendingCandidates || []).map((row) => (
              <tr key={row.id}>
                <td>{row.election?.name || "-"}</td>
                <td>{row.member?.studentId || "-"}</td>
                <td>{row.post?.title || "General"}</td>
                <td><span className="chip">{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid-2">
        <section className="page-section">
          <h2 className="page-section__title">Upcoming meetings</h2>
          <div className="stack">
            {(data?.upcomingMeetings || []).map((row) => (
              <div key={row._id} className="card">
                <p><strong>{row.title}</strong></p>
                <p>{new Date(row.meetingDate).toLocaleString()} at {row.venue}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-section">
          <h2 className="page-section__title">Finance snapshot</h2>
          <div className="stack">
            <div className="card"><p><strong>Total income:</strong> ৳{data?.financialSummary.income ?? 0}</p></div>
            <div className="card"><p><strong>Total expenditure:</strong> ৳{data?.financialSummary.expenditure ?? 0}</p></div>
            <div className="card"><p><strong>Balance:</strong> ৳{data?.financialSummary.balance ?? 0}</p></div>
          </div>
        </section>
      </div>

      <section className="page-section">
        <h2 className="page-section__title">Access capabilities</h2>
        <p><strong>Roles:</strong> {(data?.access.roles || []).join(", ") || "-"}</p>
        <p><strong>Permissions:</strong> {(data?.access.permissions || []).join(" | ") || "-"}</p>
      </section>
    </PageScreen>
  );
}