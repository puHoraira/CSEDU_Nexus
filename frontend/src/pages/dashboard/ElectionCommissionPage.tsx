import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Vote, Play, Square, Trophy, History, ClipboardList, ArrowRight, CheckCircle2, Clock, Zap } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatsCard } from "../../components/ui/StatsCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Phase1BatchPanel } from "../../components/elections/Phase1BatchPanel";
import toast from "react-hot-toast";

type Election = {
  _id: string;
  name: string;
  phase: number;
  currentPhase?: number;
  status: "Draft" | "Setup" | "Phase1_Active" | "Phase1_Completed" | "Phase2_Active" | "Phase2_Completed" | "Completed" | "Cancelled";
  startsOn?: string | null;
  endsOn?: string | null;
  phase1?: { votingStart?: string | null; votingEnd?: string | null };
  phase2?: { votingStart?: string | null; votingEnd?: string | null };
};
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

type PhaseStatus = "Draft" | "Setup" | "Phase1_Active" | "Phase1_Completed" | "Phase2_Active" | "Phase2_Completed" | "Completed" | "Cancelled";

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

/** Map an election status to a 0-based step index in the workflow. */
function stepIndex(status?: string): number {
  if (!status || status === "Draft" || status === "Setup") return 0;
  if (status.includes("Phase1_Active") || status === "Active") return 1;
  if (status === "Phase1_Completed") return 2;
  if (status.includes("Phase2_Active")) return 3;
  if (status.includes("Completed")) return 4;
  return 0;
}

const WORKFLOW_STEPS = ["Setup", "Phase 1 Voting", "Phase 1 Done", "Phase 2 Voting", "Completed"];

function WorkflowStepper({ status }: { status?: string }) {
  const active = stepIndex(status);
  return (
    <div className="ui-flex ui-flex-wrap" style={{ gap: 0, alignItems: "center" }}>
      {WORKFLOW_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        const color = done ? "var(--accent)" : current ? "var(--accent)" : "var(--border)";
        return (
          <div key={label} className="ui-flex" style={{ alignItems: "center", flex: i < WORKFLOW_STEPS.length - 1 ? 1 : "0 0 auto", minWidth: 0 }}>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.72rem", fontWeight: 700,
                background: done ? "var(--accent)" : current ? "var(--accent-glow)" : "var(--surface-soft)",
                color: done ? "#fff" : current ? "var(--accent)" : "var(--muted)",
                border: `1px solid ${current || done ? "var(--accent)" : "var(--border)"}`,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "0.78rem", fontWeight: current ? 700 : 500, whiteSpace: "nowrap",
                color: current || done ? "var(--text)" : "var(--muted)",
              }}>
                {label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 10px", background: color, minWidth: 16, borderRadius: 2 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ElectionCommissionPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [phase, setPhase] = useState(1);
  const [candidateId, setCandidateId] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Rejected">("Approved");
  const [reason, setReason] = useState("");
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

  // Fetch candidates directly for the selected election
  const { data: allCandidates } = useQuery({
    queryKey: ["election-all-candidates", selectedElectionId, token],
    queryFn: () => apiRequest<Array<{
      _id: string;
      status: string;
      electionId: { _id?: string; name?: string; phase?: number; currentPhase?: number; status?: string };
      memberId?: { _id?: string; studentId?: string; batch?: number; currentYear?: number };
      postId?: { _id?: string; title?: string };
      phase?: number;
    }>>(`/elections/${selectedElectionId}/candidates`, { token }),
    enabled: Boolean(selectedElectionId && token),
  });

  const selectedElection = useMemo(
    () => (elections.data || []).find((item) => item._id === selectedElectionId) || null,
    [elections.data, selectedElectionId]
  );

  const pendingCandidates = useMemo(
    () => {
      // Use direct candidates if available, fallback to moderator details
      const candidates = allCandidates || moderatorDetails.data?.pendingCandidates || [];
      return candidates.filter((item) => ["Pending", "Submitted", "Under_Review"].includes(item.status));
    },
    [allCandidates, moderatorDetails.data]
  );

  const approvedCandidates = useMemo(
    () => {
      const candidates = allCandidates || moderatorDetails.data?.pendingCandidates || [];
      return candidates.filter((item) => item.status === "Approved");
    },
    [allCandidates, moderatorDetails.data]
  );

  const phase1Candidates = useMemo(
    () => pendingCandidates.filter((item) => {
      const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
      return phase === 1;
    }),
    [pendingCandidates]
  );

  const phase1Approved = useMemo(
    () => approvedCandidates.filter((item) => {
      const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
      return phase === 1;
    }),
    [approvedCandidates]
  );

  const phase2Candidates = useMemo(
    () => pendingCandidates.filter((item) => {
      const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
      return phase === 2;
    }),
    [pendingCandidates]
  );

  const phase2Approved = useMemo(
    () => approvedCandidates.filter((item) => {
      const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
      return phase === 2;
    }),
    [approvedCandidates]
  );

  // Combined list of ALL candidates for the Decision lane dropdown (pending + approved)
  const allCandidatesForReview = useMemo(
    () => [...pendingCandidates, ...approvedCandidates],
    [pendingCandidates, approvedCandidates]
  );

  const phase1ByBatch = useMemo(() => {
    return phase1Candidates.reduce<Record<string, typeof phase1Candidates>>((groups, candidate) => {
      const batchKey = candidate.memberId?.batch ? `Batch ${candidate.memberId.batch}` : "Unknown batch";
      if (!groups[batchKey]) groups[batchKey] = [];
      groups[batchKey].push(candidate);
      return groups;
    }, {});
  }, [phase1Candidates]);

  const phase2ByPost = useMemo(() => {
    return phase2Candidates.reduce<Record<string, typeof phase2Candidates>>((groups, candidate) => {
      const postKey = candidate.postId?.title || candidate.electionId?.name || "Executive post";
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
      toast.success("Election phase updated");
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => toast.error(normalizeApiError(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/enhanced-elections/candidates/${candidateId}/review`, {
        method: "POST",
        token,
        body: JSON.stringify({ status: decision, reason, comments: "Reviewed from commission workflow board" }),
      }),
    onSuccess: async () => {
      toast.success("Candidate decision saved");
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => toast.error(normalizeApiError(error)),
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
        msg += ` — ${data.createdAppointments.length} appointment(s) auto-created`;
        if (data?.appointmentErrors && data.appointmentErrors.length > 0) {
          msg += `, ${data.appointmentErrors.length} error(s)`;
        }
      }
      toast.success(msg);
      await queryClient.invalidateQueries({ queryKey: ["commission-elections", token] });
      await queryClient.invalidateQueries({ queryKey: ["moderator-details", token] });
    },
    onError: (error) => toast.error(normalizeApiError(error)),
  });

  function handleReviewSubmit(event: FormEvent) {
    event.preventDefault();
    if (!candidateId) {
      toast.error("Select a candidate first");
      return;
    }
    reviewMutation.mutate();
  }

  const phase2Visible = Boolean(selectedElection && (selectedElection.phase === 2 || selectedElection.status.includes("Phase2") || selectedElection.status === "Closed"));

  // Derive the active voting window + automation state for the selected election.
  const automation = useMemo(() => {
    if (!selectedElection) return null;
    const p = selectedElection.currentPhase || selectedElection.phase || 1;
    const cfg = p === 1 ? selectedElection.phase1 : selectedElection.phase2;
    const end = cfg?.votingEnd || selectedElection.endsOn || null;
    const isActive = ["Active", "Phase1_Active", "Phase2_Active"].includes(selectedElection.status);
    const endDate = end ? new Date(end) : null;
    const now = new Date();
    let state: "no-window" | "counting" | "due" | "idle" = "idle";
    if (isActive && endDate) state = endDate > now ? "counting" : "due";
    else if (isActive && !endDate) state = "no-window";
    return { phase: p, endDate, isActive, state };
  }, [selectedElection]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Election Commission"
        description="Setup, candidate review, phase activation, and one-click publication — with automatic phase transitions."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard/home" }, { label: "Election Commission" }]}
      />

      <div className="ui-grid-4">
        <StatsCard title="Pending candidates" value={pendingCandidates.length} icon={ClipboardList} color="primary" />
        <StatsCard title="Phase 1 queue" value={phase1Candidates.length} icon={Users} color="info" />
        <StatsCard title="Phase 2 queue" value={phase2Candidates.length} icon={Vote} color="warning" />
        <StatsCard title="Audit entries" value={moderatorDetails.data?.recentAudit?.length || 0} icon={History} color="success" />
      </div>

      {!selectedElectionId ? (
        <Alert variant="warning">Select an election below to manage its phase workflow. Phase 1 (batch representatives) must run first; Phase 2 (office bearers) unlocks only after Phase 1 completes.</Alert>
      ) : null}

      {/* Automation status */}
      {selectedElection && automation ? (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}><Zap size={17} /> Automation</h3>
            <Badge variant={automation.state === "counting" ? "success" : automation.state === "due" ? "warning" : "neutral"}>
              {automation.state === "counting" ? "Auto-close armed" : automation.state === "due" ? "Closing shortly" : automation.state === "no-window" ? "No window set" : "Idle"}
            </Badge>
          </div>
          <div className="ui-card__body">
            <div className="ui-flex ui-flex-gap-3 ui-flex-wrap ui-text-sm">
              <span className="ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}>
                <Clock size={15} style={{ color: "var(--muted)" }} />
                {automation.endDate
                  ? <>Phase {automation.phase} voting ends <strong>{automation.endDate.toLocaleString()}</strong></>
                  : <>No voting window configured for Phase {automation.phase}</>}
              </span>
            </div>
            <p className="ui-text-sm ui-text-muted" style={{ margin: "12px 0 0", lineHeight: 1.6 }}>
              {automation.state === "counting" && "When the window ends, the system automatically tallies votes, records winners, and advances the phase — no manual close needed."}
              {automation.state === "due" && "The voting window has ended. Results are finalized automatically on the next read or hourly check; you can also publish now below."}
              {automation.state === "no-window" && "Set a voting window (startsOn/endsOn) so the phase can auto-close. Without it you must close the stage manually."}
              {automation.state === "idle" && "Open a phase to arm automatic tallying and transitions."}
            </p>
          </div>
        </div>
      ) : null}

      {/* Phase 1 per-batch sub-elections control panel */}
      {selectedElectionId && selectedElection &&
        (selectedElection.status === "Draft" ||
         selectedElection.status === "Setup" ||
         selectedElection.status.includes("Phase1")) ? (
        <Phase1BatchPanel electionId={selectedElectionId} token={token} />
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
            {selectedElection && (
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
                <WorkflowStepper status={selectedElection.status} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
              <label className="ui-input-wrap">
                <span className="ui-input-label">Election</span>
                <select className="ui-select" value={selectedElectionId} onChange={(e) => setSelectedElectionId(e.target.value)}>
                  <option value="">Select election</option>
                  {(elections.data || []).map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ui-input-wrap">
                <span className="ui-input-label">Target phase</span>
                <select className="ui-select" value={String(phase)} onChange={(e) => setPhase(Number(e.target.value))}>
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
              <Button variant="success" leftIcon={Play} onClick={() => phaseMutation.mutate({ nextPhase: 1, nextStatus: "Phase1_Active" })} disabled={!selectedElectionId || phaseMutation.isPending}>
                Open Phase 1
              </Button>
              <Button
                variant="primary"
                leftIcon={ArrowRight}
                onClick={() => phaseMutation.mutate({ nextPhase: 2, nextStatus: "Phase2_Active" })}
                disabled={!selectedElectionId || phaseMutation.isPending || selectedElection?.status !== "Phase1_Completed"}
              >
                Move to Phase 2
              </Button>
              <Button 
                variant="outline" 
                leftIcon={Square} 
                onClick={() => {
                  const currentPhase = selectedElection?.currentPhase || selectedElection?.phase || 1;
                  const nextStatus = currentPhase === 1 ? "Phase1_Completed" : currentPhase === 2 ? "Phase2_Completed" : "Completed";
                  phaseMutation.mutate({ nextPhase: currentPhase, nextStatus });
                }} 
                disabled={!selectedElectionId || phaseMutation.isPending}
              >
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
              <div className="ui-flex ui-flex-gap-2">
                <Badge variant="info">{phase1Candidates.length} pending</Badge>
                <Badge variant="success">{phase1Approved.length} approved</Badge>
              </div>
            </div>
            <div className="ui-card__body">
              <p style={{ marginTop: 0, color: "var(--muted)" }}>Batch-wise representative nominations are reviewed here before the main election opens.</p>
              
              {/* Pending candidates */}
              {Object.keys(phase1ByBatch).length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 12px', color: 'var(--text)' }}>Pending Review</h4>
                  <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                    {Object.entries(phase1ByBatch).map(([batch, items]) => (
                      <div key={batch} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                          <strong>{batch}</strong>
                          <Badge variant="neutral">{items.length} candidates</Badge>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {items.map((item) => (
                            <div key={item._id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
                              <span>{item.memberId?.studentId || item._id}</span>
                              <Badge variant={item.status === "Rejected" ? "error" : item.status === "Approved" ? "success" : "warning"}>{item.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Approved candidates (can be re-evaluated) */}
              {phase1Approved.length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '16px 0 12px', color: 'var(--text)' }}>Approved (Can Re-evaluate)</h4>
                  <div style={{ display: "grid", gap: 12 }}>
                    {Object.entries(phase1Approved.reduce<Record<string, typeof phase1Approved>>((groups, candidate) => {
                      const batchKey = candidate.memberId?.batch ? `Batch ${candidate.memberId.batch}` : "Unknown batch";
                      if (!groups[batchKey]) groups[batchKey] = [];
                      groups[batchKey].push(candidate);
                      return groups;
                    }, {})).map(([batch, items]) => (
                      <div key={batch} style={{ padding: 14, borderRadius: 14, border: "2px solid #10b981", background: "#d1fae5" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <strong style={{ fontSize: '0.95rem', color: '#065f46' }}>{batch}</strong>
                          <Badge variant="success">{items.length} approved</Badge>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {items.map((item) => (
                            <div key={item._id} style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: 'center',
                              gap: 10, 
                              padding: "10px 12px", 
                              borderRadius: 10, 
                              background: "rgba(255,255,255,0.8)", 
                              border: "1px solid #10b981" 
                            }}>
                              <span style={{ fontWeight: 500, color: '#111' }}>{item.memberId?.studentId || item._id}</span>
                              <Badge variant="success">{item.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {Object.keys(phase1ByBatch).length === 0 && phase1Approved.length === 0 && (
                <EmptyState icon={Users} title="No Phase 1 candidates" description="Batch representative nominations awaiting review will appear here." size="sm" />
              )}
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
                    <EmptyState icon={Vote} title="No Phase 2 candidates" description="Office-bearer nominations awaiting review will appear here." size="sm" />
                  ) : (
                    Object.entries(phase2ByPost).map(([post, items]) => (
                      <div key={post} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                          <strong>{post}</strong>
                          <Badge variant="neutral">{items.length} candidates</Badge>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {items.map((item) => (
                            <div key={item._id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--panel-strong)", border: "1px solid var(--border)" }}>
                              <span>{item.memberId?.studentId || item._id}</span>
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
                    {allCandidatesForReview.map((item) => {
                      const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
                      const studentId = item.memberId?.studentId || item._id;
                      const statusBadge = item.status === 'Approved' ? ' ✓' : '';
                      return (
                        <option key={item._id} value={item._id}>
                          {phase === 1 ? `Phase 1 - ${studentId}${statusBadge}` : `${item.postId?.title || "Phase 2"} - ${studentId}${statusBadge}`}
                        </option>
                      );
                    })}
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
              <EmptyState icon={History} title="No audit entries" size="sm" />
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
    </div>
  );
}