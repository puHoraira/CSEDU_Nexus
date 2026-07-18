import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Vote, Play, Square, Trophy, History, ClipboardList, ArrowRight, CheckCircle2, Clock, Zap, Shield, Settings, Eye, CheckCircle, UserCheck } from "lucide-react";
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
import { motion } from "framer-motion";
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
  electionType?: 'full' | 'phase2_only' | 'single_post';
  targetPost?: { _id: string; title: string } | null;
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
function stepIndex(status?: string, electionType?: string): number {
  if (electionType && electionType !== 'full') {
    if (!status || status === "Draft" || status === "Setup") return 0;
    if (status.includes("Phase2_Active") || status === "Active") return 1;
    if (status.includes("Completed")) return 2;
    return 0;
  }
  if (!status || status === "Draft" || status === "Setup") return 0;
  if (status.includes("Phase1_Active") || status === "Active") return 1;
  if (status === "Phase1_Completed") return 2;
  if (status.includes("Phase2_Active")) return 3;
  if (status.includes("Completed")) return 4;
  return 0;
}

const WORKFLOW_STEPS = ["Setup", "Phase 1 Voting", "Phase 1 Done", "Phase 2 Voting", "Completed"];
const WORKFLOW_STEPS_NONFULL = ["Setup", "Voting", "Completed"];

function WorkflowStepper({ status, electionType }: { status?: string; electionType?: string }) {
  const steps = (electionType && electionType !== 'full') ? WORKFLOW_STEPS_NONFULL : WORKFLOW_STEPS;
  const active = stepIndex(status, electionType);
  return (
    <div className="ui-flex ui-flex-wrap" style={{ gap: 0, alignItems: "center", position: 'relative' }}>
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        const color = done ? "var(--accent)" : current ? "var(--accent)" : "var(--border)";
        return (
          <motion.div
            key={label}
            className="ui-flex"
            style={{ alignItems: "center", flex: i < steps.length - 1 ? 1 : "0 0 auto", minWidth: 0 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: "center", flexShrink: 0 }}>
              <motion.div
                style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", fontWeight: 700,
                  background: done
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : current
                    ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    : "var(--surface-soft)",
                  color: done || current ? "#fff" : "var(--muted)",
                  border: `2px solid ${current || done ? "transparent" : "var(--border)"}`,
                  boxShadow: current || done ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
                  transition: "all 0.3s ease",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {done ? <CheckCircle size={16} /> : i + 1}
              </motion.div>
              <span style={{
                fontSize: "0.82rem", fontWeight: current ? 700 : 500, whiteSpace: "nowrap",
                color: current || done ? "var(--text)" : "var(--muted)",
                transition: "all 0.2s ease",
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                style={{
                  flex: 1,
                  height: 3,
                  margin: "0 12px",
                  background: done ? "linear-gradient(90deg, #10b981, #059669)" : color,
                  minWidth: 20, 
                  borderRadius: 3,
                  boxShadow: done ? "0 2px 6px rgba(16, 185, 129, 0.3)" : "none",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: done ? 1 : 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            )}
          </motion.div>
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
    queryFn: async () => {
      const result = await apiRequest<Array<{
        _id: string;
        status: string;
        electionId: { _id?: string; name?: string; phase?: number; currentPhase?: number; status?: string };
        memberId?: { _id?: string; studentId?: string; batch?: number; currentYear?: number };
        postId?: { _id?: string; title?: string };
        phase?: number;
      }>>(`/enhanced-elections/${selectedElectionId}/candidates`, { token });
      return result;
    },
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
    () => {
      const filtered = pendingCandidates.filter((item) => {
        const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
        return phase === 2;
      });
      return filtered;
    },
    [pendingCandidates]
  );

  const phase2Approved = useMemo(
    () => {
      const filtered = approvedCandidates.filter((item) => {
        const phase = item.phase ?? item.electionId?.phase ?? item.electionId?.currentPhase ?? 1;
        return phase === 2;
      });
      return filtered;
    },
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
    <div className="ui-page" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", minHeight: "100vh", paddingBottom: 40 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader
          title="Election Commission"
          description="Setup, candidate review, phase activation, and one-click publication — with automatic phase transitions."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard/home" }, { label: "Election Commission" }]}
        />
      </motion.div>

      <motion.div 
        className="ui-grid-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <StatsCard title="Pending candidates" value={pendingCandidates.length} icon={ClipboardList} color="primary" />
        <StatsCard title="Phase 1 queue" value={phase1Candidates.length} icon={Users} color="info" />
        <StatsCard title="Phase 2 queue" value={phase2Candidates.length} icon={Vote} color="warning" />
        <StatsCard title="Audit entries" value={moderatorDetails.data?.recentAudit?.length || 0} icon={History} color="success" />
      </motion.div>

      {!selectedElectionId ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Alert variant="warning">
            <Shield size={18} style={{ marginRight: 8 }} />
            Select an election below to manage its phase workflow. Phase 1 (batch representatives) must run first; Phase 2 (office bearers) unlocks only after Phase 1 completes.
          </Alert>
        </motion.div>
      ) : null}

      {/* Automation status */}
      {selectedElection && automation ? (
        <motion.div 
          className="ui-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
            border: "2px solid var(--accent)",
            boxShadow: "0 10px 30px rgba(59, 130, 246, 0.15)",
          }}
        >
          <div className="ui-card__header" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", borderRadius: "12px 12px 0 0", padding: "18px 24px" }}>
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: "center", margin: 0, color: "#fff" }}>
              <Zap size={20} /> 
              Automation Status
            </h3>
            <Badge 
              variant={automation.state === "counting" ? "success" : automation.state === "due" ? "warning" : "neutral"}
              style={{ background: "#fff", color: automation.state === "counting" ? "#10b981" : automation.state === "due" ? "#f59e0b" : "#6b7280", fontWeight: 600 }}
            >
              {automation.state === "counting" ? "🔥 Auto-close armed" : automation.state === "due" ? "⏰ Closing shortly" : automation.state === "no-window" ? "⚙️ No window set" : "💤 Idle"}
            </Badge>
          </div>
          <div className="ui-card__body" style={{ padding: "24px" }}>
            <div className="ui-flex ui-flex-gap-3 ui-flex-wrap ui-text-sm" style={{ marginBottom: 16 }}>
              <span className="ui-flex ui-flex-gap-2" style={{ 
                alignItems: "center", 
                padding: "10px 16px", 
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                borderRadius: 12,
                fontWeight: 500,
              }}>
                <Clock size={16} style={{ color: "#3b82f6" }} />
                {automation.endDate
                  ? <>Phase {automation.phase} voting ends <strong style={{ marginLeft: 4, color: "#1e40af" }}>{automation.endDate.toLocaleString()}</strong></>
                  : <>No voting window configured for Phase {automation.phase}</>}
              </span>
            </div>
            <p className="ui-text-sm" style={{ margin: 0, lineHeight: 1.7, color: "var(--muted)", background: "var(--surface-soft)", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--accent)" }}>
              {automation.state === "counting" && "⚡ When the window ends, the system automatically tallies votes, records winners, and advances the phase — no manual close needed."}
              {automation.state === "due" && "🎯 The voting window has ended. Results are finalized automatically on the next read or hourly check; you can also publish now below."}
              {automation.state === "no-window" && "⚙️ Set a voting window (startsOn/endsOn) so the phase can auto-close. Without it you must close the stage manually."}
              {automation.state === "idle" && "💡 Open a phase to arm automatic tallying and transitions."}
            </p>
          </div>
        </motion.div>
      ) : null}

      {/* Phase 1 per-batch sub-elections control panel */}
      {selectedElectionId && selectedElection &&
        (selectedElection.status === "Draft" ||
         selectedElection.status === "Setup" ||
         selectedElection.status.includes("Phase1")) ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Phase1BatchPanel electionId={selectedElectionId} token={token} />
        </motion.div>
      ) : null}

      <motion.div 
        style={{ display: "grid", gap: 24 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.section 
          className="ui-card"
          whileHover={{ boxShadow: "0 15px 35px rgba(0,0,0,0.12)" }}
          transition={{ duration: 0.3 }}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
            border: "2px solid #fbbf24",
            overflow: "hidden",
          }}
        >
          <div className="ui-card__header" style={{ 
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", 
            color: "#fff", 
            borderRadius: "12px 12px 0 0", 
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h3 className="ui-card__title" style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
              <Settings size={20} />
              Setup & Control
            </h3>
            <Badge variant={selectedElection ? (selectedElection.status.includes("Active") ? "success" : selectedElection.status.includes("Completed") ? "neutral" : "warning") : "neutral"}
              style={{ background: "#fff", color: selectedElection?.status.includes("Active") ? "#10b981" : "#6b7280", fontWeight: 600 }}
            >
              {selectedElection ? statusLabel(selectedElection.status) : "No election selected"}
            </Badge>
          </div>
          <div className="ui-card__body" style={{ padding: "28px" }}>
            {selectedElection && (
              <motion.div 
                style={{ 
                  marginBottom: 28, 
                  paddingBottom: 28, 
                  borderBottom: "2px solid rgba(251, 191, 36, 0.3)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <WorkflowStepper status={selectedElection.status} electionType={selectedElection.electionType} />
              </motion.div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              <label className="ui-input-wrap">
                <span className="ui-input-label" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Election</span>
                <select 
                  className="ui-select" 
                  value={selectedElectionId} 
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                  style={{ 
                    borderWidth: 2, 
                    borderColor: "#d97706", 
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="">Select election</option>
                  {(elections.data || []).map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}{item.electionType && item.electionType !== 'full' ? ` [${item.electionType === 'single_post' ? 'Single Post' : 'Direct'}]` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ui-input-wrap">
                <span className="ui-input-label" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Target phase</span>
                <select 
                  className="ui-select" 
                  value={String(phase)} 
                  onChange={(e) => setPhase(Number(e.target.value))}
                  style={{ 
                    borderWidth: 2, 
                    borderColor: "#d97706", 
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="1">Phase 1 - Batch Representatives</option>
                  <option value="2">Phase 2 - Executive Posts</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 20 }}>
              <motion.div 
                style={{ 
                  padding: 18, 
                  borderRadius: 16, 
                  border: "2px solid #fbbf24", 
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  boxShadow: "0 4px 12px rgba(251, 191, 36, 0.2)",
                }}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(251, 191, 36, 0.3)" }}
              >
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Current stage</p>
                <p style={{ margin: "8px 0 0", fontWeight: 700, fontSize: "1rem", color: "#78350f" }}>
                  {selectedElection ? phaseLabel(selectedElection.phase) : "Select an election"}
                </p>
              </motion.div>
              <motion.div 
                style={{ 
                  padding: 18, 
                  borderRadius: 16, 
                  border: "2px solid #60a5fa", 
                  background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  boxShadow: "0 4px 12px rgba(96, 165, 250, 0.2)",
                }}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(96, 165, 250, 0.3)" }}
              >
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Workflow rule</p>
                <p style={{ margin: "8px 0 0", fontWeight: 700, fontSize: "0.95rem", color: "#1e40af" }}>
                  Phase 1 first, then Phase 2 only for eligible voters
                </p>
              </motion.div>
            </div>

            <motion.div 
              style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {(!selectedElection?.electionType || selectedElection.electionType === 'full') && (
                <Button
                  variant="success"
                  leftIcon={Play}
                  onClick={() => phaseMutation.mutate({ nextPhase: 1, nextStatus: "Phase1_Active" })}
                  disabled={!selectedElectionId || phaseMutation.isPending}
                  style={{
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Open Phase 1
                </Button>
              )}
              {(!selectedElection?.electionType || selectedElection.electionType === 'full') && (
                <Button
                  variant="primary"
                  leftIcon={ArrowRight}
                  onClick={() => phaseMutation.mutate({ nextPhase: 2, nextStatus: "Phase2_Active" })}
                  disabled={!selectedElectionId || phaseMutation.isPending || selectedElection?.status !== "Phase1_Completed"}
                  style={{
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  Move to Phase 2
                </Button>
              )}
              {(selectedElection?.electionType && selectedElection.electionType !== 'full') && (
                <Button
                  variant="success"
                  leftIcon={Play}
                  onClick={() => phaseMutation.mutate({ nextPhase: 2, nextStatus: "Phase2_Active" })}
                  disabled={!selectedElectionId || phaseMutation.isPending}
                  style={{
                    borderRadius: 12,
                    padding: "12px 20px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Open Voting
                </Button>
              )}
              <Button
                variant="outline"
                leftIcon={Square}
                onClick={() => {
                  const currentPhase = selectedElection?.currentPhase || selectedElection?.phase || 1;
                  const nextStatus = currentPhase === 1 ? "Phase1_Completed" : currentPhase === 2 ? "Phase2_Completed" : "Completed";
                  phaseMutation.mutate({ nextPhase: currentPhase, nextStatus });
                }}
                disabled={!selectedElectionId || phaseMutation.isPending}
                style={{
                  borderRadius: 12,
                  padding: "12px 20px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderWidth: 2,
                }}
              >
                Close current stage
              </Button>
            </motion.div>

            <div style={{ marginTop: 12 }}>
              <Alert variant={selectedElection?.status.includes("Phase2") ? "info" : "warning"}>
                {(selectedElection?.electionType && selectedElection.electionType !== 'full')
                  ? `This is a ${selectedElection.electionType === 'single_post' ? 'single-post' : 'direct'} election. Phase 1 is skipped — candidates nominate directly for EC posts.`
                  : selectedElection?.status.includes("Phase2")
                  ? "Phase 2 is active. The main election ballot should be visible only to eligible voters and approved candidates for the relevant posts."
                  : "Phase 2 remains locked until Phase 1 is completed. That keeps the main election visible only after the batch representative stage finishes."}
              </Alert>
            </div>
          </div>
        </motion.section>

        <motion.div 
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <motion.section 
            className="ui-card"
            whileHover={{ scale: 1.02, boxShadow: "0 15px 35px rgba(59, 130, 246, 0.2)" }}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)",
              border: "2px solid #3b82f6",
              overflow: "hidden",
            }}
          >
            <div className="ui-card__header" style={{ 
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
              color: "#fff", 
              borderRadius: "12px 12px 0 0", 
              padding: "18px 24px",
            }}>
              <h3 className="ui-card__title" style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={20} />
                Review - Phase 1
              </h3>
              <div className="ui-flex ui-flex-gap-2">
                <Badge variant="info" style={{ background: "#fff", color: "#3b82f6", fontWeight: 600 }}>
                  {phase1Candidates.length} pending
                </Badge>
                <Badge variant="success" style={{ background: "#fff", color: "#10b981", fontWeight: 600 }}>
                  {phase1Approved.length} approved
                </Badge>
              </div>
            </div>
            <div className="ui-card__body" style={{ padding: "24px" }}>
              <p style={{ marginTop: 0, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Batch-wise representative nominations are reviewed here before the main election opens.
              </p>
              
              {/* Pending candidates */}
              {Object.keys(phase1ByBatch).length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px', color: '#1e40af', display: "flex", alignItems: "center", gap: 8 }}>
                    <Eye size={16} />
                    Pending Review
                  </h4>
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    {Object.entries(phase1ByBatch).map(([batch, items]) => (
                      <motion.div 
                        key={batch} 
                        style={{ 
                          padding: 16, 
                          borderRadius: 16, 
                          border: "2px solid #60a5fa", 
                          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                          boxShadow: "0 4px 12px rgba(96, 165, 250, 0.15)",
                        }}
                        whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(96, 165, 250, 0.25)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                          <strong style={{ fontSize: "1rem", color: "#1e40af" }}>{batch}</strong>
                          <Badge variant="neutral" style={{ background: "#3b82f6", color: "#fff" }}>
                            {items.length} candidates
                          </Badge>
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {items.map((item) => (
                            <motion.div 
                              key={item._id} 
                              style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                gap: 10, 
                                padding: "12px 14px", 
                                borderRadius: 12, 
                                background: "#fff", 
                                border: "2px solid #93c5fd",
                                boxShadow: "0 2px 6px rgba(59, 130, 246, 0.1)",
                              }}
                              whileHover={{ scale: 1.03, x: 5 }}
                            >
                              <span style={{ fontWeight: 500, color: "#111827" }}>{item.memberId?.studentId || item._id}</span>
                              <Badge variant={item.status === "Rejected" ? "error" : item.status === "Approved" ? "success" : "warning"}>
                                {item.status}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {/* Approved candidates (can be re-evaluated) */}
              {phase1Approved.length > 0 && (
                <>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '20px 0 14px', color: '#059669', display: "flex", alignItems: "center", gap: 8 }}>
                    <UserCheck size={16} />
                    Approved (Can Re-evaluate)
                  </h4>
                  <div style={{ display: "grid", gap: 14 }}>
                    {Object.entries(phase1Approved.reduce<Record<string, typeof phase1Approved>>((groups, candidate) => {
                      const batchKey = candidate.memberId?.batch ? `Batch ${candidate.memberId.batch}` : "Unknown batch";
                      if (!groups[batchKey]) groups[batchKey] = [];
                      groups[batchKey].push(candidate);
                      return groups;
                    }, {})).map(([batch, items]) => (
                      <motion.div 
                        key={batch} 
                        style={{ 
                          padding: 16, 
                          borderRadius: 16, 
                          border: "2px solid #10b981", 
                          background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                        }}
                        whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <strong style={{ fontSize: '1rem', color: '#065f46' }}>{batch}</strong>
                          <Badge variant="success" style={{ background: "#059669", color: "#fff", fontWeight: 600 }}>
                            {items.length} approved
                          </Badge>
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {items.map((item) => (
                            <motion.div 
                              key={item._id} 
                              style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: 'center',
                                gap: 10, 
                                padding: "12px 14px", 
                                borderRadius: 12, 
                                background: "#fff", 
                                border: "2px solid #6ee7b7",
                                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.1)",
                              }}
                              whileHover={{ scale: 1.03, x: 5 }}
                            >
                              <span style={{ fontWeight: 500, color: '#111827', display: "flex", alignItems: "center", gap: 8 }}>
                                <CheckCircle size={16} color="#10b981" />
                                {item.memberId?.studentId || item._id}
                              </span>
                              <Badge variant="success">{item.status}</Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {Object.keys(phase1ByBatch).length === 0 && phase1Approved.length === 0 && (
                <EmptyState icon={Users} title="No Phase 1 candidates" description="Batch representative nominations awaiting review will appear here." size="sm" />
              )}
            </div>
          </motion.section>

          <motion.section 
            className="ui-card"
            whileHover={{ scale: 1.02, boxShadow: "0 15px 35px rgba(245, 158, 11, 0.2)" }}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
              border: "2px solid #f59e0b",
              overflow: "hidden",
            }}
          >
            <div className="ui-card__header" style={{ 
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", 
              color: "#fff", 
              borderRadius: "12px 12px 0 0", 
              padding: "18px 24px",
            }}>
              <h3 className="ui-card__title" style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <Vote size={20} />
                Review - Phase 2
              </h3>
              <Badge variant="warning" style={{ background: "#fff", color: "#d97706", fontWeight: 600 }}>
                {phase2Candidates.length + phase2Approved.length} total
              </Badge>
            </div>
            <div className="ui-card__body" style={{ padding: "24px" }}>
              <p style={{ marginTop: 0, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                This card stays hidden until the main election is actually reachable. It keeps the office-bearer stage separate from the batch vote.
              </p>
              {phase2Visible ? (
                <>
                  {/* Pending Phase 2 Candidates */}
                  {Object.keys(phase2ByPost).length > 0 && (
                    <>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px', color: '#d97706', display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={16} />
                        Pending Review
                      </h4>
                      <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
                        {Object.entries(phase2ByPost).map(([post, items]) => (
                          <motion.div 
                            key={post} 
                            style={{ 
                              padding: 16, 
                              borderRadius: 16, 
                              border: "2px solid #fbbf24", 
                              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                              boxShadow: "0 4px 12px rgba(251, 191, 36, 0.15)",
                            }}
                            whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(251, 191, 36, 0.25)" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                              <strong style={{ fontSize: "1rem", color: "#92400e" }}>{post}</strong>
                              <Badge variant="neutral" style={{ background: "#f59e0b", color: "#fff" }}>
                                {items.length} candidates
                              </Badge>
                            </div>
                            <div style={{ display: "grid", gap: 10 }}>
                              {items.map((item) => (
                                <motion.div 
                                  key={item._id} 
                                  style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    gap: 10, 
                                    padding: "12px 14px", 
                                    borderRadius: 12, 
                                    background: "#fff", 
                                    border: "2px solid #fcd34d",
                                    boxShadow: "0 2px 6px rgba(245, 158, 11, 0.1)",
                                  }}
                                  whileHover={{ scale: 1.03, x: 5 }}
                                >
                                  <span style={{ fontWeight: 500, color: "#111827" }}>{item.memberId?.studentId || item._id}</span>
                                  <Badge variant={item.status === "Rejected" ? "error" : item.status === "Approved" ? "success" : "warning"}>
                                    {item.status}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Approved Phase 2 Candidates */}
                  {phase2Approved.length > 0 && (
                    <>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '20px 0 14px', color: '#059669', display: "flex", alignItems: "center", gap: 8 }}>
                        <UserCheck size={16} />
                        Approved (Can Re-evaluate)
                      </h4>
                      <div style={{ display: "grid", gap: 14 }}>
                        {Object.entries(phase2Approved.reduce<Record<string, typeof phase2Approved>>((groups, candidate) => {
                          const postKey = candidate.postId?.title || "Unknown Post";
                          if (!groups[postKey]) groups[postKey] = [];
                          groups[postKey].push(candidate);
                          return groups;
                        }, {})).map(([post, items]) => (
                          <motion.div 
                            key={post} 
                            style={{ 
                              padding: 16, 
                              borderRadius: 16, 
                              border: "2px solid #10b981", 
                              background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                            }}
                            whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', gap: 10, marginBottom: 12 }}>
                              <strong style={{ fontSize: '1rem', color: '#065f46' }}>{post}</strong>
                              <Badge variant="success" style={{ background: "#059669", color: "#fff", fontWeight: 600 }}>
                                {items.length} approved
                              </Badge>
                            </div>
                            <div style={{ display: "grid", gap: 10 }}>
                              {items.map((item) => (
                                <motion.div 
                                  key={item._id} 
                                  style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: 'center',
                                    gap: 10, 
                                    padding: "12px 14px", 
                                    borderRadius: 12, 
                                    background: "#fff", 
                                    border: "2px solid #6ee7b7",
                                    boxShadow: "0 2px 6px rgba(16, 185, 129, 0.1)",
                                  }}
                                  whileHover={{ scale: 1.03, x: 5 }}
                                >
                                  <span style={{ fontWeight: 500, color: '#111827', display: "flex", alignItems: "center", gap: 8 }}>
                                    <CheckCircle size={16} color="#10b981" />
                                    {item.memberId?.studentId || item._id}
                                  </span>
                                  <Badge variant="success">{item.status}</Badge>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {Object.keys(phase2ByPost).length === 0 && phase2Approved.length === 0 && (
                    <EmptyState icon={Vote} title="No Phase 2 candidates" description="Office-bearer nominations awaiting review will appear here." size="sm" />
                  )}
                </>
              ) : (
                <Alert variant="info">
                  <Shield size={18} style={{ marginRight: 8 }} />
                  Phase 2 stays hidden until Phase 1 is complete and the election moves into the main executive stage.
                </Alert>
              )}
            </div>
          </motion.section>
        </motion.div>

        <motion.section 
          className="ui-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)",
            border: "2px solid #a855f7",
            overflow: "hidden",
          }}
        >
          <div className="ui-card__header" style={{ 
            background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)", 
            color: "#fff", 
            borderRadius: "12px 12px 0 0", 
            padding: "18px 24px",
          }}>
            <h3 className="ui-card__title" style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={20} />
              Decision lane
            </h3>
            <Badge variant="neutral" style={{ background: "#fff", color: "#9333ea", fontWeight: 600 }}>
              Review selected candidate
            </Badge>
          </div>
          <div className="ui-card__body" style={{ padding: "28px" }}>
            <form onSubmit={handleReviewSubmit}>
              <div className="ui-grid-3" style={{ marginBottom: 20, gap: 18 }}>
                <div className="ui-input-wrap">
                  <label className="ui-input-label" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Candidate</label>
                  <select 
                    className="ui-select" 
                    value={candidateId} 
                    onChange={(e) => setCandidateId(e.target.value)}
                    style={{ 
                      borderWidth: 2, 
                      borderColor: "#c084fc", 
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: "0.95rem",
                    }}
                  >
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
                  <label className="ui-input-label" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Decision</label>
                  <select 
                    className="ui-select" 
                    value={decision} 
                    onChange={(e) => setDecision(e.target.value as "Approved" | "Rejected")}
                    style={{ 
                      borderWidth: 2, 
                      borderColor: "#c084fc", 
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: "0.95rem",
                    }}
                  > 
                    <option value="Approved">Approve</option>
                    <option value="Rejected">Reject</option>
                  </select>
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Reason</label>
                  <input 
                    className="ui-input" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="Optional note for the decision"
                    style={{ 
                      borderWidth: 2, 
                      borderColor: "#c084fc", 
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <Button 
                  type="submit" 
                  variant="primary" 
                  leftIcon={CheckCircle2} 
                  isLoading={reviewMutation.isPending}
                  style={{
                    borderRadius: 12,
                    padding: "12px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
                  }}
                >
                  Save decision
                </Button>
                <Button 
                  type="button" 
                  variant="success" 
                  leftIcon={Trophy} 
                  onClick={() => publishMutation.mutate()} 
                  disabled={!selectedElectionId || publishMutation.isPending} 
                  isLoading={publishMutation.isPending}
                  style={{
                    borderRadius: 12,
                    padding: "12px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Publish current phase
                </Button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12, padding: "10px 16px", background: "linear-gradient(135deg, #fae8ff 0%, #f3e8ff 100%)", borderRadius: 12, cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={autoCreateAppointments} 
                    onChange={(e) => setAutoCreateAppointments(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 500, color: "#6b21a8" }}>Auto-create appointments</span>
                </label>
              </div>
            </form>
          </div>
        </motion.section>

        <motion.section 
          className="ui-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
            border: "2px solid #6366f1",
          }}
        >
          <div className="ui-card__header" style={{ 
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
            color: "#fff", 
            borderRadius: "12px 12px 0 0", 
            padding: "18px 24px",
          }}>
            <h3 className="ui-card__title" style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
              <History size={20} />
              Audit trail
            </h3>
            <Badge variant="neutral" style={{ background: "#fff", color: "#4f46e5", fontWeight: 600 }}>
              {moderatorDetails.data?.recentAudit?.length || 0} entries
            </Badge>
          </div>
          <div className="ui-card__body" style={{ padding: "24px" }}>
            {moderatorDetails.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Spinner size="md" /></div>
            ) : (moderatorDetails.data?.recentAudit || []).length === 0 ? (
              <EmptyState icon={History} title="No audit entries" size="sm" />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {(moderatorDetails.data?.recentAudit || []).map((row, index) => (
                  <motion.div 
                    key={row._id} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      gap: 14, 
                      padding: "14px 16px", 
                      borderRadius: 14, 
                      background: "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)", 
                      border: "2px solid #c7d2fe",
                      boxShadow: "0 2px 6px rgba(99, 102, 241, 0.1)",
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)" }}
                  >
                    <div>
                      <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem", color: "#1e1b4b" }}>{row.action}</strong>
                      <span style={{ color: "#6366f1", fontSize: "0.85rem", fontWeight: 500 }}>{row.resource}</span>
                    </div>
                    <span style={{ color: "#64748b", fontSize: "0.82rem", whiteSpace: "nowrap", alignSelf: "flex-start", padding: "4px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}