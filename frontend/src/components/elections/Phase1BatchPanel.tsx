import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Square, RefreshCw, Users, Trophy, UserCheck, Clock, Settings2 } from "lucide-react";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import toast from "react-hot-toast";

type Winner = { candidateId: string; memberId: string; name: string; studentId?: string; votes: number; percentage: number; rank: number; appointed: boolean };
type Batch = {
  _id: string; batch: string; label: string; status: string;
  votingStart?: string | null; votingEnd?: string | null;
  repSeats: number; maxVotesPerVoter: number;
  candidateCount: number; totalVotes: number; totalVoters: number;
  resultsPublishedAt?: string | null; winners: Winner[];
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral" | "error"> = {
  Active: "success", Paused: "warning", Not_Started: "neutral", Completed: "neutral", Cancelled: "error",
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Phase1BatchPanel({ electionId, token }: { electionId: string; token: string | null }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ votingStart: "", votingEnd: "", repSeats: 5, maxVotesPerVoter: 5 });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["election-batches", electionId, token],
    queryFn: () => apiRequest<Batch[]>(`/elections/${electionId}/batches`, { token }),
    enabled: Boolean(electionId && token),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["election-batches", electionId, token] });

  const initMut = useMutation({
    mutationFn: () => apiRequest(`/elections/${electionId}/batches/init`, { method: "POST", token, body: JSON.stringify({}) }),
    onSuccess: () => { toast.success("Batches synced from candidates"); invalidate(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ batchKey, status }: { batchKey: string; status: string }) =>
      apiRequest(`/elections/${electionId}/batches/${batchKey}/status`, { method: "PATCH", token, body: JSON.stringify({ status }) }),
    onSuccess: (_d, v) => { toast.success(`Batch ${v.status === "Active" ? "activated" : v.status.toLowerCase()}`); invalidate(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const editMut = useMutation({
    mutationFn: (batchKey: string) =>
      apiRequest(`/elections/${electionId}/batches/${batchKey}`, {
        method: "PATCH", token,
        body: JSON.stringify({
          votingStart: editForm.votingStart ? new Date(editForm.votingStart).toISOString() : null,
          votingEnd: editForm.votingEnd ? new Date(editForm.votingEnd).toISOString() : null,
          repSeats: Number(editForm.repSeats),
          maxVotesPerVoter: Number(editForm.maxVotesPerVoter),
        }),
      }),
    onSuccess: () => { toast.success("Batch updated"); setEditing(null); invalidate(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const appointMut = useMutation({
    mutationFn: (batchKey: string) => apiRequest(`/elections/${electionId}/batches/${batchKey}/appoint`, { method: "POST", token }),
    onSuccess: (d: any) => { toast.success(`${d?.appointed ?? 0} representative(s) appointed`); invalidate(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  function openEdit(b: Batch) {
    setEditing(b.batch);
    setEditForm({ votingStart: toLocalInput(b.votingStart), votingEnd: toLocalInput(b.votingEnd), repSeats: b.repSeats, maxVotesPerVoter: b.maxVotesPerVoter });
  }

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}>
            <Users size={17} /> Phase 1 — Batch Sub-Elections
          </h3>
          <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3 }}>Each batch elects its own representatives. Activate, pause, edit, or auto-close on deadline.</p>
        </div>
        <Button size="sm" variant="outline" leftIcon={RefreshCw} isLoading={initMut.isPending} onClick={() => initMut.mutate()}>
          Sync Batches
        </Button>
      </div>
      <div className="ui-card__body">
        {isLoading ? (
          <div className="ui-flex-center" style={{ padding: 32 }}><Spinner label="Loading batches…" /></div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No batch sub-elections yet"
            description="Add approved Phase-1 candidates, then click Sync Batches to create a sub-election per batch."
            action={<Button variant="primary" leftIcon={RefreshCw} onClick={() => initMut.mutate()}>Sync Batches</Button>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {batches.map((b) => (
              <div key={b._id} style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", padding: 16 }}>
                <div className="ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <div className="ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>{b.label || `Batch ${b.batch}`}</h4>
                      <Badge variant={STATUS_VARIANT[b.status] ?? "neutral"}>{b.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="ui-flex ui-flex-gap-3 ui-flex-wrap ui-text-xs ui-text-muted" style={{ marginTop: 6 }}>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: "center" }}><Users size={12} /> {b.candidateCount} candidates</span>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: "center" }}><Trophy size={12} /> {b.repSeats} seats</span>
                      <span>{b.maxVotesPerVoter} votes/voter</span>
                      {b.totalVoters > 0 && <span>{b.totalVoters} voted · {b.totalVotes} votes</span>}
                      {b.votingEnd && <span className="ui-flex ui-flex-gap-1" style={{ alignItems: "center" }}><Clock size={12} /> ends {new Date(b.votingEnd).toLocaleString()}</span>}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ justifyContent: "flex-end" }}>
                    {b.status !== "Active" && b.status !== "Completed" && (
                      <Button size="sm" variant="primary" leftIcon={Play} isLoading={statusMut.isPending}
                        onClick={() => statusMut.mutate({ batchKey: b.batch, status: "Active" })}>Activate</Button>
                    )}
                    {b.status === "Active" && (
                      <>
                        <Button size="sm" variant="outline" leftIcon={Pause}
                          onClick={() => statusMut.mutate({ batchKey: b.batch, status: "Paused" })}>Pause</Button>
                        <Button size="sm" variant="danger" leftIcon={Square}
                          onClick={() => { if (confirm(`Close voting for Batch ${b.batch} and publish results?`)) statusMut.mutate({ batchKey: b.batch, status: "Completed" }); }}>Close & Tally</Button>
                      </>
                    )}
                    {b.status !== "Completed" && (
                      <Button size="sm" variant="ghost" leftIcon={Settings2} onClick={() => openEdit(b)}>Edit</Button>
                    )}
                  </div>
                </div>

                {/* Edit form */}
                {editing === b.batch && (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--surface-soft)", border: "1px solid var(--border)" }}>
                    <div className="ui-grid-2" style={{ gap: 12 }}>
                      <label className="ui-input-wrap"><span className="ui-input-label">Voting start</span>
                        <input className="ui-input" type="datetime-local" value={editForm.votingStart} onChange={(e) => setEditForm((f) => ({ ...f, votingStart: e.target.value }))} /></label>
                      <label className="ui-input-wrap"><span className="ui-input-label">Voting end (auto-close)</span>
                        <input className="ui-input" type="datetime-local" value={editForm.votingEnd} onChange={(e) => setEditForm((f) => ({ ...f, votingEnd: e.target.value }))} /></label>
                      <label className="ui-input-wrap"><span className="ui-input-label">Representative seats</span>
                        <input className="ui-input" type="number" min={1} max={10} value={editForm.repSeats} onChange={(e) => setEditForm((f) => ({ ...f, repSeats: Number(e.target.value) }))} /></label>
                      <label className="ui-input-wrap"><span className="ui-input-label">Max votes per voter</span>
                        <input className="ui-input" type="number" min={1} max={10} value={editForm.maxVotesPerVoter} onChange={(e) => setEditForm((f) => ({ ...f, maxVotesPerVoter: Number(e.target.value) }))} /></label>
                    </div>
                    <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                      <Button size="sm" variant="primary" isLoading={editMut.isPending} onClick={() => editMut.mutate(b.batch)}>Save</Button>
                    </div>
                  </div>
                )}

                {/* Winners */}
                {b.status === "Completed" && b.winners.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <div className="ui-flex ui-flex-between" style={{ alignItems: "center", marginBottom: 10 }}>
                      <span className="ui-text-sm" style={{ fontWeight: 700, color: "var(--text)" }}>🏆 Elected Representatives</span>
                      <Button size="sm" variant="outline" leftIcon={UserCheck} isLoading={appointMut.isPending}
                        onClick={() => appointMut.mutate(b.batch)}>
                        {b.winners.every((w) => w.appointed) ? "Re-appoint" : "Appoint Reps"}
                      </Button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {b.winners.map((w) => (
                        <div key={w.candidateId} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
                          <div className="ui-flex ui-flex-between" style={{ alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>#{w.rank} {w.name}</span>
                            {w.appointed && <Badge variant="success">✓</Badge>}
                          </div>
                          <div className="ui-text-xs ui-text-muted" style={{ marginTop: 2 }}>{w.studentId} · {w.votes} votes ({w.percentage}%)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
