import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange, Plus, Pencil, Play, Square, Trash2, ShieldCheck,
  CheckCircle2, Clock, Archive,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatsCard } from "../../components/ui/StatsCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import toast from "react-hot-toast";

type TermRow = {
  _id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: "Draft" | "Active" | "Closed" | string;
};

type FormState = { name: string; startsOn: string; endsOn: string; status: string };

const emptyForm: FormState = { name: "", startsOn: "", endsOn: "", status: "Draft" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral"> = {
  Active: "success",
  Draft: "warning",
  Closed: "neutral",
};

/** Convert an ISO string to the value a datetime-local input expects. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function EcTermsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["ec-terms", token],
    queryFn: () => apiRequest<TermRow[]>("/governance/ec-terms", { token }),
    enabled: Boolean(token),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ec-terms", token] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        startsOn: new Date(form.startsOn).toISOString(),
        endsOn: new Date(form.endsOn).toISOString(),
        status: form.status,
      };
      return editingId
        ? apiRequest(`/governance/ec-terms/${editingId}`, { method: "PATCH", token, body: JSON.stringify(payload) })
        : apiRequest("/governance/ec-terms", { method: "POST", token, body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      toast.success(editingId ? "Term updated" : "Term created");
      await invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(normalizeApiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/governance/ec-terms/${id}`, { method: "PATCH", token, body: JSON.stringify({ status }) }),
    onSuccess: async (_d, vars) => {
      toast.success(vars.status === "Active" ? "Term activated" : `Term marked ${vars.status}`);
      await invalidate();
    },
    onError: (err) => toast.error(normalizeApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/governance/ec-terms/${id}`, { method: "DELETE", token }),
    onSuccess: async () => {
      toast.success("Term deleted");
      await invalidate();
    },
    onError: (err) => toast.error(normalizeApiError(err)),
  });

  const stats = useMemo(() => {
    const active = data.find((t) => t.status === "Active");
    return {
      total: data.length,
      active,
      draft: data.filter((t) => t.status === "Draft").length,
      closed: data.filter((t) => t.status === "Closed").length,
    };
  }, [data]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(term: TermRow) {
    setEditingId(term._id);
    setForm({
      name: term.name,
      startsOn: toLocalInput(term.startsOn),
      endsOn: toLocalInput(term.endsOn),
      status: term.status,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name || form.name.trim().length < 3) {
      setFormError("Name must be at least 3 characters.");
      return;
    }
    if (!form.startsOn || !form.endsOn) {
      setFormError("Start and end date-time are required.");
      return;
    }
    if (new Date(form.endsOn).getTime() <= new Date(form.startsOn).getTime()) {
      setFormError("End date-time must be later than start date-time.");
      return;
    }
    saveMutation.mutate();
  }

  const busy = statusMutation.isPending || deleteMutation.isPending;

  return (
    <div className="ui-page">
      <PageHeader
        title="EC Terms"
        description="Create committee terms and control which one is active. Only one term can be active at a time (Constitution Art. XIII)."
        breadcrumbs={[{ label: "Governance", href: "/dashboard/governance/ec-appointments" }, { label: "EC Terms" }]}
        actions={<Button variant="primary" leftIcon={Plus} onClick={openCreate}>New Term</Button>}
      />

      {/* Active-term banner */}
      {stats.active ? (
        <Alert variant="success">
          <strong>{stats.active.name}</strong> is the current active committee ({fmt(stats.active.startsOn)} – {fmt(stats.active.endsOn)}).
          Elections and appointments are bound to this term.
        </Alert>
      ) : (
        <Alert variant="warning">
          No active term. Activate one so it appears on the public EC Members page and can host elections & appointments.
        </Alert>
      )}

      <div className="ui-grid-4">
        <StatsCard title="Total Terms" value={stats.total} icon={CalendarRange} color="primary" />
        <StatsCard title="Active" value={stats.active ? 1 : 0} icon={ShieldCheck} color="success" />
        <StatsCard title="Draft" value={stats.draft} icon={Clock} color="warning" />
        <StatsCard title="Closed" value={stats.closed} icon={Archive} color="info" />
      </div>

      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title">All Terms</h3>
        </div>
        <div className="ui-card__body ui-card__body--flush">
          {isLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading terms…" /></div>
          ) : data.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No terms yet"
              description="Create your first committee term to get started."
              action={<Button variant="primary" leftIcon={Plus} onClick={openCreate}>New Term</Button>}
            />
          ) : (
            <div className="ui-table--scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((term) => (
                    <tr key={term._id}>
                      <td className="ui-font-medium">{term.name}</td>
                      <td>{fmt(term.startsOn)}</td>
                      <td>{fmt(term.endsOn)}</td>
                      <td><Badge variant={STATUS_VARIANT[term.status] ?? "neutral"}>{term.status}</Badge></td>
                      <td style={{ textAlign: "right" }}>
                        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {term.status !== "Active" && (
                            <Button variant="primary" size="sm" leftIcon={Play} disabled={busy}
                              onClick={() => statusMutation.mutate({ id: term._id, status: "Active" })}>
                              Activate
                            </Button>
                          )}
                          {term.status === "Active" && (
                            <Button variant="outline" size="sm" leftIcon={Square} disabled={busy}
                              onClick={() => statusMutation.mutate({ id: term._id, status: "Closed" })}>
                              Close
                            </Button>
                          )}
                          <Button variant="outline" size="sm" leftIcon={Pencil} onClick={() => openEdit(term)}>Edit</Button>
                          <Button variant="ghost" size="sm" leftIcon={Trash2} disabled={busy}
                            onClick={() => {
                              if (window.confirm(`Delete term "${term.name}"? This cannot be undone.`)) {
                                deleteMutation.mutate(term._id);
                              }
                            }}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Term" : "Create Term"}
        description="A term defines one Executive Committee period. Activating a term automatically closes any other active term."
        size="md"
        footer={
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button variant="primary" leftIcon={CheckCircle2} onClick={submit} isLoading={saveMutation.isPending}>
              {editingId ? "Save Changes" : "Create Term"}
            </Button>
          </div>
        }
      >
        <form onSubmit={submit} className="ui-flex-col" style={{ gap: 16 }}>
          {formError && <Alert variant="error" onClose={() => setFormError(null)}>{formError}</Alert>}
          <label className="ui-input-wrap">
            <span className="ui-input-label">Name</span>
            <input className="ui-input" value={form.name} placeholder="e.g. EC 2026-27"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Starts on</span>
              <input className="ui-input" type="datetime-local" value={form.startsOn}
                onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Ends on</span>
              <input className="ui-input" type="datetime-local" value={form.endsOn}
                onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
            </label>
          </div>
          <label className="ui-input-wrap">
            <span className="ui-input-label">Status</span>
            <select className="ui-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Draft">Draft — not yet in effect</option>
              <option value="Active">Active — current committee (closes others)</option>
              <option value="Closed">Closed — past term</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  );
}
