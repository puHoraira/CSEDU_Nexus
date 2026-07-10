import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Users, Vote, Play, Square, Trophy, History, ClipboardList, CalendarDays, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";

type Election = { _id: string; name: string; phase: number; status: "Draft" | "Active" | "Closed" | string };
type Candidate = {
  id: string;
  status: string;
  election?: { _id?: string; name?: string; phase?: number; status?: string };
  member?: { studentId?: string; batch?: number; currentYear?: number };
  post?: { title?: string };
};
type AuditRow = { _id: string; action: string; resource: string; createdAt: string };
type ModeratorDetails = {
  queues?: { pendingCandidateCount?: number; activeElectionCount?: number; upcomingMeetingCount?: number; pendingCancellationCount?: number };
  pendingCandidates?: Candidate[];
  recentAudit?: AuditRow[];
};

type PhaseStatus = "Draft" | "Active" | "Closed";

function phaseLabel(phase: number) {
  return phase === 1 ? "Phase 1 - Batch Representatives" : "Phase 2 - Executive Posts";
}

function statusLabel(status?: string) {
  if (!status) return "Draft";
  if (status.includes("Phase1_Active") || status === "Active") return "Phase 1 Active";
  if (status.includes("Phase2_Active")) return "Phase 2 Active";
  if (status.includes("Completed") || status === "Closed") return "Closed";
  if (status.includes("Cancelled")) return "Cancelled";
  return status;
}

export function ElectionCommissionPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [phase, setPhase] = useState(1);
  const [candidateId, setCandidateId] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [autoCreateAppointments, setAutoCreateAppointments] = useState<boolean>(true);

  const elections = useQuery({
    queryKey: ["commission-elections", token],
    queryFn: () => apiRequest<Election[]>("/elections", { token }),
    enabled: Boolean(token),
  });

  const moderatorDetails = useQuery({
    queryKey: ["moderator-details", token],
    queryFn: () => apiRequest<ModeratorDetails>("/moderator/details", { token }),
    enabled: Boolean(token),
  });

  const selectedElection = useMemo(
    () => (elections.data || []).find((item) => item._id === selectedElectionId) || null,
    [elections.data, selectedElectionId]
  );

  const pendingCandidates = useMemo(
    () => (moderatorDetails.data?.pendingCandidates || []).filter((item) => ["Pending", "Submitted", "Under_Review"].includes(item.status)),
    [moderatorDetails.data]
  );

  const phase1Candidates = useMemo(
    () => pendingCandidates.filter((item) => (item.election?.phase ?? 1) === 1),
    [pendingCandidates]
  );

  const phase2Candidates = useMemo(
    () => pendingCandidates.filter((item) => item.election?.phase === 2),
    [pendingCandidates]
  );

  const phase1ByBatch = useMemo(() => {
    return phase1Candidates.reduce<Record<string, Candidate[]>>((groups, candidate) => {
      const batchKey = candidate.member?.batch ? `Batch ${candidate.member.batch}` : "Unknown batch";
      if (!groups[batchKey]) groups[batchKey] = [];
      groups[batchKey].push(candidate);
      return groups;
    }, {});
  }, [phase1Candidates]);

  const phase2ByPost = useMemo(() => {
    return phase2Candidates.reduce<Record<string, Candidate[]>>((groups, candidate) => {
      const postKey = candidate.post?.title || candidate.election?.name || "Executive post";
      if (!groups[postKey]) groups[postKey] = [];
      groups[postKey].push(candidate);
      return groups;
    }, {});
  }, [phase2Candidates]);

  const phaseMutation = useMutation({
    mutationFn: ({ nextPhase, nextStatus }: { nextPhase: number; nextStatus: PhaseStatus }) =>
      apiRequest(`/enhanced-elections/${selectedElectionId}/phase`, {
        method: "PUT",
        token,
        body: JSON.stringify({ currentPhase: nextPhase, status: nextStatus }),
      }),
    onSuccess: async () => {
      setMessage("Election phase updated");
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/enhanced-elections/candidates/${candidateId}/review`, {
        method: "POST",
        token,
        body: JSON.stringify({ status: decision, reason, comments: "Reviewed from commission workflow board" }),
      }),
    onSuccess: async () => {
      setMessage("Candidate decision saved");
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/enhanced-elections/${selectedElectionId}/publish-results`, {
        method: "POST",
        token,
        body: JSON.stringify({ phase, autoCreateAppointments }),
      }),
    onSuccess: async (data: any) => {
      let msg = "Results published for the selected phase";
      if (data?.createdAppointments) {
        msg += ` — ${data.createdAppointments.length} appointments created`;
        if (data?.appointmentErrors && data.appointmentErrors.length > 0) {
          msg += `, ${data.appointmentErrors.length} errors`;
        }
      }
      setMessage(msg);
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  function handleReviewSubmit(event: FormEvent) {
    event.preventDefault();
    if (!candidateId) {
      setMessage("Select a candidate first");
      return;
    }
    reviewMutation.mutate();
  }

  const stats = [
    { label: "Pending candidates", value: pendingCandidates.length, icon: ClipboardList, color: "#7c3aed" },
    { label: "Phase 1 queue", value: phase1Candidates.length, icon: Users, color: "#0ea5e9" },
    { label: "Phase 2 queue", value: phase2Candidates.length, icon: Vote, color: "#f59e0b" },
    { label: "Audit entries", value: moderatorDetails.data?.recentAudit?.length || 0, icon: History, color: "#10b981" },
  ];

  const phase2Visible = Boolean(selectedElection && (selectedElection.phase === 2 || selectedElection.status.includes("Phase2") || selectedElection.status === "Closed"));

  return (
    <PageScreen title="Election Commission" subtitle="Workflow board for setup, candidate review, phase activation, publication, and audit trail.">
      {message ? <Alert variant="info">{message}</Alert> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="ui-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "var(--muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {!selectedElectionId ? (
        <Alert variant="warning">Select an election to manage its phase workflow. Phase 1 must run first; Phase 2 is activated only after Phase 1 completes.</Alert>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        <section className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Setup</h3>
            <Badge variant={selectedElection ? (selectedElection.status.includes("Active") ? "success" : selectedElection.status.includes("Completed") ? "neutral" : "warning") : "neutral"}>
              {selectedElection ? statusLabel(selectedElection.status) : "No election selected"}
            </Badge>
          </div>
          <div className="ui-card__body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
              <label className="field">
                <span>Election</span>
                <select value={selectedElectionId} onChange={(e) => setSelectedElectionId(e.target.value)}>
                  <option value="">Select election</option>
                  {(elections.data || []).map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Target phase</span>
                <select value={String(phase)} onChange={(e) => setPhase(Number(e.target.value))}>
                  <option value="1">Phase 1 - Batch Representatives</option>
                  <option value="2">Phase 2 - Executive Posts</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current stage</p>
                <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{selectedElection ? phaseLabel(selectedElection.phase) : "Select an election"}</p>
              </div>
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Workflow rule</p>
                <p style={{ margin: "6px 0 0", fontWeight: 700 }}>Phase 1 first, then Phase 2 only for eligible voters</p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
              <Button variant="success" leftIcon={Play} onClick={() => phaseMutation.mutate({ nextPhase: 1, nextStatus: "Active" })} disabled={!selectedElectionId || phaseMutation.isPending}>
                Open Phase 1
              </Button>
              <Button
                variant="primary"
                leftIcon={ArrowRight}
                onClick={() => phaseMutation.mutate({ nextPhase: 2, nextStatus: "Active" })}
                disabled={!selectedElectionId || phaseMutation.isPending || selectedElection?.status !== "Phase1_Completed"}
              >
                Move to Phase 2
              </Button>
              <Button variant="outline" leftIcon={Square} onClick={() => phaseMutation.mutate({ nextPhase: phase, nextStatus: "Closed" })} disabled={!selectedElectionId || phaseMutation.isPending}>
                Close current stage
              </Button>
            </div>

            <div style={{ marginTop: 12 }}>
              <Alert variant={selectedElection?.status.includes("Phase2") ? "info" : "warning"}>
                {selectedElection?.status.includes("Phase2")
                  ? "Phase 2 is active. The main election ballot should be visible only to eligible voters and approved candidates for the relevant posts."
                  : "Phase 2 remains locked until Phase 1 is completed. That keeps the main election visible only after the batch representative stage finishes."}
              </Alert>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <section className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Review - Phase 1</h3>
              <Badge variant="info">{phase1Candidates.length} pending</Badge>
            </div>
            <div className="ui-card__body">
              <p style={{ marginTop: 0, color: "var(--muted)" }}>Batch-wise representative nominations are reviewed here before the main election opens.</p>
              <div style={{ display: "grid", gap: 12 }}>
                {Object.keys(phase1ByBatch).length === 0 ? (
                  <div className="empty-state">No Phase 1 candidates awaiting review.</div>
                ) : (
                  Object.entries(phase1ByBatch).map(([batch, items]) => (
                    <div key={batch} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                        <strong>{batch}</strong>
                        <Badge variant="neutral">{items.length} candidates</Badge>
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {items.map((item) => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
                            <span>{item.member?.studentId || item.id}</span>
                            <Badge variant={item.status === "Rejected" ? "error" : item.status === "Approved" ? "success" : "warning"}>{item.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Review - Phase 2</h3>
              <Badge variant="warning">{phase2Candidates.length} pending</Badge>
            </div>
            <div className="ui-card__body">
              <p style={{ marginTop: 0, color: "var(--muted)" }}>This card stays hidden until the main election is actually reachable. It keeps the office-bearer stage separate from the batch vote.</p>
              {phase2Visible ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {Object.keys(phase2ByPost).length === 0 ? (
                    <div className="empty-state">No Phase 2 candidates awaiting review.</div>
                  ) : (
                    Object.entries(phase2ByPost).map(([post, items]) => (
                      <div key={post} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                          <strong>{post}</strong>
                          <Badge variant="neutral">{items.length} candidates</Badge>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {items.map((item) => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
                              <span>{item.member?.studentId || item.id}</span>
                              <Badge variant={item.status === "Rejected" ? "error" : item.status === "Approved" ? "success" : "warning"}>{item.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <Alert variant="info">Phase 2 stays hidden until Phase 1 is complete and the election moves into the main executive stage.</Alert>
              )}
            </div>
          </section>
        </div>

        <section className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Decision lane</h3>
            <Badge variant="neutral">Review selected candidate</Badge>
          </div>
          <div className="ui-card__body">
            <form onSubmit={handleReviewSubmit}>
              <div className="ui-grid-3" style={{ marginBottom: 16 }}>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Candidate</label>
                  <select className="ui-select" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                    <option value="">Select candidate…</option>
                    {pendingCandidates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {(item.election?.phase ?? 1) === 1 ? `Phase 1 - ${item.member?.studentId || item.id}` : `${item.post?.title || "Phase 2"} - ${item.member?.studentId || item.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Decision</label>
                  <select className="ui-select" value={decision} onChange={(e) => setDecision(e.target.value as "Approved" | "Rejected")}> 
                    <option value="Approved">Approve</option>
                    <option value="Rejected">Reject</option>
                  </select>
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Reason</label>
                  <input className="ui-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note for the decision" />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Button type="submit" variant="primary" leftIcon={CheckCircle2} isLoading={reviewMutation.isPending}>
                  Save decision
                </Button>
                <Button type="button" variant="success" leftIcon={Trophy} onClick={() => publishMutation.mutate()} disabled={!selectedElectionId || publishMutation.isPending} isLoading={publishMutation.isPending}>
                  Publish current phase
                </Button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                  <input type="checkbox" checked={autoCreateAppointments} onChange={(e) => setAutoCreateAppointments(e.target.checked)} />
                  <span style={{ fontSize: '0.9rem' }}>Auto-create appointments</span>
                </label>
              </div>
            </form>
          </div>
        </section>

        <section className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Audit trail</h3>
            <Badge variant="neutral">{moderatorDetails.data?.recentAudit?.length || 0} entries</Badge>
          </div>
          <div className="ui-card__body">
            {moderatorDetails.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}><Spinner size="md" /></div>
            ) : (moderatorDetails.data?.recentAudit || []).length === 0 ? (
              <div className="empty-state">No audit entries found.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {(moderatorDetails.data?.recentAudit || []).map((row) => (
                  <div key={row._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div>
                      <strong style={{ display: "block", marginBottom: 4 }}>{row.action}</strong>
                      <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{row.resource}</span>
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{new Date(row.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageScreen>
  );
}