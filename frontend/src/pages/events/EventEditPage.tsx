import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { queryKeys, invalidateQueries } from "../../lib/queryKeys";
import { PageScreen } from "../../components/ui/PageScreen";

const SUPPORTED_YEARS = [1, 2, 3, 4, 5];
const EVENT_STATUSES = ["Planned", "Ongoing", "Completed", "Cancelled"] as const;

type EventRow = {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  venue: string;
  status: "Planned" | "Ongoing" | "Completed" | "Cancelled";
  budget?: number;
  visibility?: string;
  targetAudience?: {
    allowedYears?: number[];
    allowedBatches?: number[];
    allowedRoles?: string[];
    invitedUsers?: string[];
  };
  volunteerEligibility?: {
    allowedYears?: number[];
    allowedBatches?: number[];
  };
  volunteerProgram?: {
    applicationDeadline?: string | null;
    notes?: string;
    positions?: Array<{
      name: string;
      slots: number;
      description?: string;
      requiredYears?: number[];
      requiredBatches?: number[];
    }>;
  };
};

type EventForm = {
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  status: EventRow["status"];
  budget: number;
  visibility: string;
  targetAudience: {
    allowedYears: number[];
    allowedBatches: number[];
    allowedRoles: string[];
    invitedUsers: string[];
  };
  volunteerEligibility: {
    allowedYears: number[];
    allowedBatches: number[];
  };
  volunteerProgram: {
    applicationDeadline: string;
    notes: string;
    positions: Array<{
      name: string;
      slots: number;
      description: string;
      requiredYears: number[];
      requiredBatches: number[];
    }>;
  };
};

function toDateTimeLocal(isoString: string) {
  const date = new Date(isoString);
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function EventEditPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [batchInput, setBatchInput] = useState("");
  const [audienceBatchInput, setAudienceBatchInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [form, setForm] = useState<EventForm | null>(null);
  const [positionDraft, setPositionDraft] = useState({
    name: "",
    slots: 1,
    description: "",
    requiredYears: [] as number[],
    requiredBatches: [] as number[],
  });
  const [positionBatchInput, setPositionBatchInput] = useState("");
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail-edit", id],
    queryFn: () => apiRequest<EventRow>(`/events/${id}`),
    enabled: hasValidId,
    retry: false,
  });

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title,
      description: event.description || "",
      eventDate: toDateTimeLocal(event.eventDate),
      venue: event.venue,
      status: event.status,
      budget: event.budget ?? 0,
      visibility: event.visibility || "Public",
      targetAudience: {
        allowedYears: [...(event.targetAudience?.allowedYears || [])].sort((a, b) => a - b),
        allowedBatches: [...(event.targetAudience?.allowedBatches || [])].sort((a, b) => a - b),
        allowedRoles: [...(event.targetAudience?.allowedRoles || [])],
        invitedUsers: [...(event.targetAudience?.invitedUsers || [])],
      },
      volunteerEligibility: {
        allowedYears: [...(event.volunteerEligibility?.allowedYears || [])].sort((a, b) => a - b),
        allowedBatches: [...(event.volunteerEligibility?.allowedBatches || [])].sort((a, b) => a - b),
      },
      volunteerProgram: {
        applicationDeadline: event.volunteerProgram?.applicationDeadline ? toDateTimeLocal(event.volunteerProgram.applicationDeadline) : "",
        notes: event.volunteerProgram?.notes || "",
        positions: (event.volunteerProgram?.positions || []).map((position) => ({
          name: position.name,
          slots: position.slots,
          description: position.description || "",
          requiredYears: [...(position.requiredYears || [])],
          requiredBatches: [...(position.requiredBatches || [])],
        })),
      },
    });
  }, [event]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!id || !form) throw new Error("Invalid event");
      return apiRequest(`/events/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          ...form,
          eventDate: new Date(form.eventDate).toISOString(),
          visibility: form.visibility,
          targetAudience: form.targetAudience,
          volunteerProgram: {
            ...form.volunteerProgram,
            applicationDeadline: form.volunteerProgram.applicationDeadline
              ? new Date(form.volunteerProgram.applicationDeadline).toISOString()
              : null,
          },
        }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        ...invalidateQueries.events.all(queryClient, token),
        ...invalidateQueries.events.detail(queryClient, id, token),
      ]);
      navigate("/dashboard/events");
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function toggleYear(year: number) {
    if (!form) return;
    const exists = form.volunteerEligibility.allowedYears.includes(year);
    setForm({
      ...form,
      volunteerEligibility: {
        ...form.volunteerEligibility,
        allowedYears: exists
          ? form.volunteerEligibility.allowedYears.filter((item) => item !== year)
          : [...form.volunteerEligibility.allowedYears, year].sort((a, b) => a - b),
      },
    });
  }

  function addBatch() {
    if (!form) return;
    const value = Number(batchInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Batch must be a positive number.");
      return;
    }

    setError(null);
    if (form.volunteerEligibility.allowedBatches.includes(value)) {
      setBatchInput("");
      return;
    }
    setForm({
      ...form,
      volunteerEligibility: {
        ...form.volunteerEligibility,
        allowedBatches: [...form.volunteerEligibility.allowedBatches, value].sort((a, b) => a - b),
      },
    });
    setBatchInput("");
  }

  function removeBatch(batch: number) {
    if (!form) return;
    setForm({
      ...form,
      volunteerEligibility: {
        ...form.volunteerEligibility,
        allowedBatches: form.volunteerEligibility.allowedBatches.filter((item) => item !== batch),
      },
    });
  }

  function togglePositionYear(year: number) {
    setPositionDraft((current) => {
      const exists = current.requiredYears.includes(year);
      return {
        ...current,
        requiredYears: exists ? current.requiredYears.filter((item) => item !== year) : [...current.requiredYears, year].sort((a, b) => a - b),
      };
    });
  }

  function addPositionBatch() {
    const value = Number(positionBatchInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Position batch must be a positive number.");
      return;
    }
    setPositionDraft((current) => {
      if (current.requiredBatches.includes(value)) return current;
      return { ...current, requiredBatches: [...current.requiredBatches, value].sort((a, b) => a - b) };
    });
    setPositionBatchInput("");
  }

  function addPosition() {
    if (!form) return;
    const name = positionDraft.name.trim();
    if (!name) {
      setError("Volunteer position name is required.");
      return;
    }
    setForm({
      ...form,
      volunteerProgram: {
        ...form.volunteerProgram,
        positions: [
          ...form.volunteerProgram.positions,
          {
            name,
            slots: positionDraft.slots,
            description: positionDraft.description.trim(),
            requiredYears: [...positionDraft.requiredYears],
            requiredBatches: [...positionDraft.requiredBatches],
          },
        ],
      },
    });
    setPositionDraft({ name: "", slots: 1, description: "", requiredYears: [], requiredBatches: [] });
    setError(null);
  }

  function removePosition(index: number) {
    if (!form) return;
    setForm({
      ...form,
      volunteerProgram: {
        ...form.volunteerProgram,
        positions: form.volunteerProgram.positions.filter((_, itemIndex) => itemIndex !== index),
      },
    });
  }

  // Target Audience functions
  function toggleAudienceYear(year: number) {
    if (!form) return;
    const exists = form.targetAudience.allowedYears.includes(year);
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        allowedYears: exists
          ? form.targetAudience.allowedYears.filter((item) => item !== year)
          : [...form.targetAudience.allowedYears, year].sort((a, b) => a - b),
      },
    });
  }

  function addAudienceBatch() {
    if (!form) return;
    const value = Number(audienceBatchInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Batch must be a positive number.");
      return;
    }
    setError(null);
    if (form.targetAudience.allowedBatches.includes(value)) {
      setAudienceBatchInput("");
      return;
    }
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        allowedBatches: [...form.targetAudience.allowedBatches, value].sort((a, b) => a - b),
      },
    });
    setAudienceBatchInput("");
  }

  function removeAudienceBatch(batch: number) {
    if (!form) return;
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        allowedBatches: form.targetAudience.allowedBatches.filter((item) => item !== batch),
      },
    });
  }

  function addRole() {
    if (!form) return;
    const role = roleInput.trim();
    if (!role) {
      setError("Role name cannot be empty.");
      return;
    }
    setError(null);
    if (form.targetAudience.allowedRoles.includes(role)) {
      setRoleInput("");
      return;
    }
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        allowedRoles: [...form.targetAudience.allowedRoles, role],
      },
    });
    setRoleInput("");
  }

  function removeRole(role: string) {
    if (!form) return;
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        allowedRoles: form.targetAudience.allowedRoles.filter((item) => item !== role),
      },
    });
  }

  function addInvitedUser() {
    if (!form) return;
    const userId = userSearchInput.trim();
    if (!userId) {
      setError("User ID cannot be empty.");
      return;
    }
    setError(null);
    if (form.targetAudience.invitedUsers.includes(userId)) {
      setUserSearchInput("");
      return;
    }
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        invitedUsers: [...form.targetAudience.invitedUsers, userId],
      },
    });
    setUserSearchInput("");
  }

  function removeInvitedUser(userId: string) {
    if (!form) return;
    setForm({
      ...form,
      targetAudience: {
        ...form.targetAudience,
        invitedUsers: form.targetAudience.invitedUsers.filter((item) => item !== userId),
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="Edit Event" subtitle="Update schedule, status, and volunteer eligibility criteria.">
      {!hasValidId ? <div className="alert">Invalid event link.</div> : null}
      {isLoading ? <div className="notice">Loading event...</div> : null}
      {hasValidId && !isLoading && !event ? <div className="alert">Event not found.</div> : null}

      {form ? (
        <section className="page-section">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => current ? { ...current, title: e.target.value } : current)} required /></label>
            <label className="field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm((current) => current ? { ...current, description: e.target.value } : current)} /></label>
            <label className="field"><span>Date</span><input type="datetime-local" value={form.eventDate} onChange={(e) => setForm((current) => current ? { ...current, eventDate: e.target.value } : current)} required /></label>
            <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => current ? { ...current, venue: e.target.value } : current)} required /></label>
            <label className="field"><span>Budget</span><input type="number" min={0} value={form.budget} onChange={(e) => setForm((current) => current ? { ...current, budget: Number(e.target.value) } : current)} /></label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm((current) => current ? { ...current, status: e.target.value as EventRow["status"] } : current)}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <div className="card" style={{ gridColumn: "1 / -1", marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Target Audience & Visibility</h3>
              <p style={{ marginBottom: 12, color: "var(--muted)", fontSize: "0.9rem" }}>
                Control who can see this event. Use role-based for EC meetings, year/batch for academic targeting, or invite specific users.
              </p>

              <label className="field" style={{ marginBottom: 16 }}>
                <span>Visibility Mode</span>
                <select 
                  value={form.visibility} 
                  onChange={(e) => setForm((current) => current ? { ...current, visibility: e.target.value } : current)}
                >
                  <option value="Public">Public</option>
                  <option value="Members_Only">Members Only</option>
                  <option value="Year_Based">Year Based</option>
                  <option value="Batch_Based">Batch Based</option>
                  <option value="Role_Based">Role Based (EC, committees)</option>
                  <option value="Invited_Only">Invited Only</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>

              <label className="field" style={{ marginBottom: 12 }}>
                <span>Year Filtering</span>
                <div className="button-row" style={{ flexWrap: "wrap" }}>
                  {SUPPORTED_YEARS.map((year) => {
                    const selected = form.targetAudience.allowedYears.includes(year);
                    return (
                      <button
                        key={year}
                        type="button"
                        className={selected ? "primary-button" : "secondary-button"}
                        onClick={() => toggleAudienceYear(year)}
                      >
                        Year {year}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="field" style={{ marginBottom: 12 }}>
                <span>Batch Filtering</span>
                <div className="button-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min={1}
                    placeholder="Add batch e.g. 29"
                    value={audienceBatchInput}
                    onChange={(e) => setAudienceBatchInput(e.target.value)}
                    style={{ maxWidth: 180 }}
                  />
                  <button type="button" className="secondary-button" onClick={addAudienceBatch}>Add batch</button>
                </div>
              </label>

              {form.targetAudience.allowedBatches.length > 0 && (
                <div className="button-row" style={{ flexWrap: "wrap", marginBottom: 12 }}>
                  {form.targetAudience.allowedBatches.map((batch) => (
                    <button key={batch} type="button" className="chip chip--interactive" onClick={() => removeAudienceBatch(batch)}>
                      Batch {batch} ×
                    </button>
                  ))}
                </div>
              )}

              <label className="field" style={{ marginBottom: 12 }}>
                <span>Role-Based Access (EC, committees)</span>
                <div className="button-row" style={{ alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="e.g. President, EC Member"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    style={{ flex: 1, maxWidth: 300 }}
                  />
                  <button type="button" className="secondary-button" onClick={addRole}>Add role</button>
                </div>
              </label>

              {form.targetAudience.allowedRoles.length > 0 && (
                <div className="button-row" style={{ flexWrap: "wrap", marginBottom: 12 }}>
                  {form.targetAudience.allowedRoles.map((role) => (
                    <button key={role} type="button" className="chip chip--interactive" onClick={() => removeRole(role)}>
                      {role} ×
                    </button>
                  ))}
                </div>
              )}

              <label className="field" style={{ marginBottom: 12 }}>
                <span>Manually Invite Users</span>
                <div className="button-row" style={{ alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="User ID or email"
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    style={{ flex: 1, maxWidth: 300 }}
                  />
                  <button type="button" className="secondary-button" onClick={addInvitedUser}>Invite</button>
                </div>
              </label>

              {form.targetAudience.invitedUsers.length > 0 && (
                <div className="button-row" style={{ flexWrap: "wrap" }}>
                  {form.targetAudience.invitedUsers.map((userId) => (
                    <button key={userId} type="button" className="chip chip--interactive" onClick={() => removeInvitedUser(userId)}>
                      {userId} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ marginBottom: 8 }}>Volunteer Program</h3>
              <p style={{ marginBottom: 12, color: "var(--muted)" }}>
                Manage who can apply and what volunteer roles the event actually needs.
              </p>

              <label className="field" style={{ marginBottom: 10 }}>
                <span>Allowed years (multiple select)</span>
                <div className="button-row" style={{ flexWrap: "wrap" }}>
                  {SUPPORTED_YEARS.map((year) => {
                    const selected = form.volunteerEligibility.allowedYears.includes(year);
                    return (
                      <button
                        key={year}
                        type="button"
                        className={selected ? "primary-button" : "secondary-button"}
                        onClick={() => toggleYear(year)}
                      >
                        Year {year}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="field">
                <span>Allowed batches (add multiple)</span>
                <div className="button-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 29"
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    style={{ maxWidth: 180 }}
                  />
                  <button type="button" className="secondary-button" onClick={addBatch}>Add batch</button>
                </div>
              </label>

              {form.volunteerEligibility.allowedBatches.length > 0 ? (
                <div className="button-row" style={{ flexWrap: "wrap", marginTop: 10 }}>
                  {form.volunteerEligibility.allowedBatches.map((batch) => (
                    <button key={batch} type="button" className="secondary-button" onClick={() => removeBatch(batch)}>
                      Batch {batch} x
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="field" style={{ marginTop: 18 }}>
                <span>Application deadline (optional)</span>
                <input
                  type="datetime-local"
                  value={form.volunteerProgram.applicationDeadline}
                  onChange={(e) => setForm((current) => current ? { ...current, volunteerProgram: { ...current.volunteerProgram, applicationDeadline: e.target.value } } : current)}
                />
              </label>

              <label className="field" style={{ marginTop: 10 }}>
                <span>Volunteer notes</span>
                <textarea
                  value={form.volunteerProgram.notes}
                  onChange={(e) => setForm((current) => current ? { ...current, volunteerProgram: { ...current.volunteerProgram, notes: e.target.value } } : current)}
                />
              </label>

              <div className="card" style={{ marginTop: 16 }}>
                <h4 style={{ marginTop: 0 }}>Position-based staffing</h4>
                <div className="form-grid">
                  <label className="field"><span>Position name</span><input value={positionDraft.name} onChange={(e) => setPositionDraft((current) => ({ ...current, name: e.target.value }))} /></label>
                  <label className="field"><span>Slots</span><input type="number" min={1} value={positionDraft.slots} onChange={(e) => setPositionDraft((current) => ({ ...current, slots: Number(e.target.value) }))} /></label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}><span>Description</span><textarea value={positionDraft.description} onChange={(e) => setPositionDraft((current) => ({ ...current, description: e.target.value }))} /></label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Required years</span>
                    <div className="button-row" style={{ flexWrap: "wrap" }}>
                      {SUPPORTED_YEARS.map((year) => {
                        const selected = positionDraft.requiredYears.includes(year);
                        return (
                          <button key={year} type="button" className={selected ? "primary-button" : "secondary-button"} onClick={() => togglePositionYear(year)}>
                            Year {year}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Required batches</span>
                    <div className="button-row" style={{ alignItems: "center" }}>
                      <input type="number" min={1} value={positionBatchInput} onChange={(e) => setPositionBatchInput(e.target.value)} style={{ maxWidth: 180 }} />
                      <button type="button" className="secondary-button" onClick={addPositionBatch}>Add batch</button>
                    </div>
                  </label>
                  <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                    <button type="button" className="secondary-button" onClick={addPosition}>Add position</button>
                  </div>
                </div>

                <div className="stack">
                  {form.volunteerProgram.positions.length === 0 ? <div className="empty-state">No positions yet.</div> : null}
                  {form.volunteerProgram.positions.map((position, index) => (
                    <div className="card" key={`${position.name}-${index}`}>
                      <div className="event-card__head">
                        <div>
                          <h4 style={{ margin: 0 }}>{position.name}</h4>
                          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{position.description || "No description"}</p>
                        </div>
                        <button type="button" className="secondary-button" onClick={() => removePosition(index)}>Remove</button>
                      </div>
                      <p><strong>Slots:</strong> {position.slots}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save changes"}
              </button>
              <Link className="secondary-button" to="/dashboard/events">Cancel</Link>
            </div>
          </form>
          {error ? <div className="alert">{error}</div> : null}
        </section>
      ) : null}
    </PageScreen>
  );
}