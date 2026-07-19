import { ChangeEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { SessionBatchOverview } from "../../components/membership/SessionBatchOverview";
import { YearCorrectionPanel } from "../../components/membership/YearCorrectionPanel";
import {
  Users, AlertTriangle, Vote, Calendar, DollarSign,
  FileText, Upload, Shield
} from "lucide-react";

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
  const { token } = useAuth();
  const [csvFileName, setCsvFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["moderator-details", token],
    queryFn: () => apiRequest<ModeratorDetails>("/moderator/details", { token }),
    enabled: Boolean(token),
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
      setCsvMessage(`✓ CSV processed. Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${errorCount}`);
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

  if (isLoading) {
    return (
      <div className="ui-page">
        <PageHeader title="Moderator Dashboard" description="Moderation queues, oversight insights, and governance access." />
        <div style={{ display: "flex", justifyContent: "center", padding: "72px 0" }}>
          <Spinner size="xl" label="Loading moderator details..." />
        </div>
      </div>
    );
  }

  const queues = data?.queues;

  return (
    <div className="ui-page">
      <PageHeader
        title="Moderator Dashboard"
        description="Moderation queues, oversight insights, and governance access."
      />

      {/* ── Queue Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { icon: AlertTriangle, label: "Pending Cancellations", value: queues?.pendingCancellationCount ?? 0, color: "#f59e0b" },
          { icon: Users,        label: "Pending Candidates",    value: queues?.pendingCandidateCount ?? 0,    color: "#8b5cf6" },
          { icon: Vote,         label: "Active Elections",      value: queues?.activeElectionCount ?? 0,      color: "#3b82f6" },
          { icon: Calendar,     label: "Upcoming Meetings",     value: queues?.upcomingMeetingCount ?? 0,     color: "#10b981" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="ui-card"
            style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{value}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Session & Batch Overview + Year Corrections ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 20, marginBottom: 24, alignItems: "start" }}>
        <SessionBatchOverview />
        <YearCorrectionPanel />
      </div>

      {/* ── Quick Actions ── */}
      <div className="ui-card" style={{ marginBottom: 24 }}>
        <div className="ui-card__header">
          <h3 className="ui-card__title">Quick Actions</h3>
        </div>
        <div className="ui-card__body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "Cancellation Workflow", href: "/dashboard/membership/cancellations", icon: AlertTriangle },
              { label: "Elections",             href: "/dashboard/elections",                icon: Vote },
              { label: "Finance Ledger",        href: "/dashboard/finance/ledger",           icon: DollarSign },
              { label: "Constitution Editor",   href: "/dashboard/governance/constitution-editor", icon: FileText },
              { label: "Member Roster",         href: "/dashboard/membership/roster",        icon: Users },
            ].map(({ label, href, icon: Icon }) => (
              <Button key={href} variant="outline" size="sm" leftIcon={Icon} href={href}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column: Pending Cancellations + Pending Candidates ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Pending Cancellations */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              Pending Cancellations
            </h3>
          </div>
          <div className="ui-card__body">
            {(data?.pendingCancellations ?? []).length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>No pending cancellations</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data?.pendingCancellations.map((row) => (
                  <div key={row.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>
                        {row.member?.studentId ?? row.id.slice(-6)}
                      </span>
                      <Badge variant="warning">{row.status}</Badge>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>{row.reason}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Candidates */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Vote size={16} style={{ color: "#8b5cf6" }} />
              Pending Candidates
            </h3>
          </div>
          <div className="ui-card__body">
            {(data?.pendingCandidates ?? []).length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "16px 0" }}>No pending candidates</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data?.pendingCandidates.map((row) => (
                  <div key={row.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>
                        {row.member?.studentId ?? "-"}
                      </span>
                      <Badge variant="warning">{row.status}</Badge>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
                      {row.election?.name ?? "Election"} — {row.post?.title ?? "General"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Finance Snapshot ── */}
      <div className="ui-card" style={{ marginBottom: 24 }}>
        <div className="ui-card__header">
          <h3 className="ui-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={16} style={{ color: "#10b981" }} /> Finance Snapshot
          </h3>
        </div>
        <div className="ui-card__body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Total Income",      value: data?.financialSummary.income ?? 0,      color: "#10b981" },
              { label: "Total Expenditure", value: data?.financialSummary.expenditure ?? 0, color: "#ef4444" },
              { label: "Balance",           value: data?.financialSummary.balance ?? 0,     color: "var(--accent)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color }}> ৳{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bulk CSV Registration ── */}
      <div className="ui-card" style={{ marginBottom: 24 }}>
        <div className="ui-card__header">
          <h3 className="ui-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={16} style={{ color: "var(--accent)" }} /> Bulk Registration (CSV)
          </h3>
        </div>
        <div className="ui-card__body">
          <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "var(--muted)" }}>
            Upload a CSV file to auto-register student users in bulk as General Member accounts.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="ui-input-wrap" style={{ flex: 1, minWidth: 200 }}>
              <label className="ui-input-label">CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvSelect}
                className="ui-input"
                style={{ cursor: "pointer" }}
              />
            </div>
            <Button
              variant="primary"
              leftIcon={Upload}
              isLoading={bulkRegisterMutation.isPending}
              onClick={() => bulkRegisterMutation.mutate()}
              disabled={!csvContent}
            >
              Register All from CSV
            </Button>
          </div>
          {csvFileName && (
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              Selected: <strong>{csvFileName}</strong>
            </p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
            Required columns: firstName, lastName, email, password, studentId, batch, currentYear, experience
          </p>
          {csvMessage && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: csvMessage.startsWith("✓") ? "#10b98120" : "#ef444420",
                border: `1px solid ${csvMessage.startsWith("✓") ? "#10b98140" : "#ef444440"}`,
                fontSize: "0.85rem",
                color: csvMessage.startsWith("✓") ? "#10b981" : "#ef4444",
                fontWeight: 600,
              }}
            >
              {csvMessage}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
