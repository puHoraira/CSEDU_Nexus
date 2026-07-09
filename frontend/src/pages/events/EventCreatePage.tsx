import { FormEvent, useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { queryKeys, invalidateQueries } from "../../lib/queryKeys";
import { PageScreen } from "../../components/ui/PageScreen";

const SUPPORTED_YEARS = [1, 2, 3, 4, 5];

type VolunteerPositionDraft = {
  name: string;
  slots: number;
  description: string;
  requiredYears: number[];
  requiredBatches: number[];
};

type EventForm = {
  title: string;
  description: string;
  eventDate: string;
  venue: string;
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
    positions: VolunteerPositionDraft[];
  };
  roomAssignment?: {
    enabled: boolean;
    rooms: { roomId: string; priority: number }[];
    autoAssignSeats: boolean;
  };
};

export function EventCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [form, setForm] = useState<EventForm>({
    title: "",
    description: "",
    eventDate: "",
    venue: "",
    budget: 0,
    visibility: "Public",
    targetAudience: {
      allowedYears: [],
      allowedBatches: [],
      allowedRoles: [],
      invitedUsers: [],
    },
    volunteerEligibility: {
      allowedYears: [],
      allowedBatches: [],
    },
    volunteerProgram: {
      applicationDeadline: "",
      notes: "",
      positions: [],
    },
    roomAssignment: {
      enabled: false,
      rooms: [],
      autoAssignSeats: true,
    },
  });
  const [batchInput, setBatchInput] = useState("");
  const [audienceBatchInput, setAudienceBatchInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [positionDraft, setPositionDraft] = useState<VolunteerPositionDraft>({
    name: "",
    slots: 1,
    description: "",
    requiredYears: [],
    requiredBatches: [],
  });
  const [positionBatchInput, setPositionBatchInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Fetch available rooms
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiRequest('/rooms', { method: 'GET', token }),
  });

  function formatValidationMessage(err: unknown) {
    const message = normalizeApiError(err);
    if (message === "Validation failed" && err && typeof err === "object" && "details" in err) {
      const details = (err as { details?: Array<{ path?: string; message?: string }> }).details || [];
      const summary = details
        .map((item) => `${item.path || "field"}: ${item.message || "invalid"}`)
        .join("; ");
      return summary ? `Validation failed: ${summary}` : message;
    }
    return message;
  }

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/events", {
        method: "POST",
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
          roomAssignment: form.roomAssignment?.enabled ? form.roomAssignment : undefined,
        }),
      }),
    onSuccess: async () => {
      await Promise.all(invalidateQueries.events.all(queryClient, token));
      navigate("/dashboard/events");
    },
    onError: (err) => setError(formatValidationMessage(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  function toggleYear(year: number) {
    setForm((current) => {
      const exists = current.volunteerEligibility.allowedYears.includes(year);
      return {
        ...current,
        volunteerEligibility: {
          ...current.volunteerEligibility,
          allowedYears: exists
            ? current.volunteerEligibility.allowedYears.filter((item) => item !== year)
            : [...current.volunteerEligibility.allowedYears, year].sort((a, b) => a - b),
        },
      };
    });
  }

  function addBatch() {
    const value = Number(batchInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Batch must be a positive number.");
      return;
    }

    setError(null);
    setForm((current) => {
      if (current.volunteerEligibility.allowedBatches.includes(value)) {
        return current;
      }
      return {
        ...current,
        volunteerEligibility: {
          ...current.volunteerEligibility,
          allowedBatches: [...current.volunteerEligibility.allowedBatches, value].sort((a, b) => a - b),
        },
      };
    });
    setBatchInput("");
  }

  function removeBatch(batch: number) {
    setForm((current) => ({
      ...current,
      volunteerEligibility: {
        ...current.volunteerEligibility,
        allowedBatches: current.volunteerEligibility.allowedBatches.filter((item) => item !== batch),
      },
    }));
  }

  // Target Audience functions
  function toggleAudienceYear(year: number) {
    setForm((current) => {
      const exists = current.targetAudience.allowedYears.includes(year);
      return {
        ...current,
        targetAudience: {
          ...current.targetAudience,
          allowedYears: exists
            ? current.targetAudience.allowedYears.filter((item) => item !== year)
            : [...current.targetAudience.allowedYears, year].sort((a, b) => a - b),
        },
      };
    });
  }

  function addAudienceBatch() {
    const value = Number(audienceBatchInput);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Batch must be a positive number.");
      return;
    }

    setError(null);
    setForm((current) => {
      if (current.targetAudience.allowedBatches.includes(value)) {
        return current;
      }
      return {
        ...current,
        targetAudience: {
          ...current.targetAudience,
          allowedBatches: [...current.targetAudience.allowedBatches, value].sort((a, b) => a - b),
        },
      };
    });
    setAudienceBatchInput("");
  }

  function removeAudienceBatch(batch: number) {
    setForm((current) => ({
      ...current,
      targetAudience: {
        ...current.targetAudience,
        allowedBatches: current.targetAudience.allowedBatches.filter((item) => item !== batch),
      },
    }));
  }

  function addRole() {
    const role = roleInput.trim();
    if (!role) {
      setError("Role name cannot be empty.");
      return;
    }

    setError(null);
    setForm((current) => {
      if (current.targetAudience.allowedRoles.includes(role)) {
        return current;
      }
      return {
        ...current,
        targetAudience: {
          ...current.targetAudience,
          allowedRoles: [...current.targetAudience.allowedRoles, role],
        },
      };
    });
    setRoleInput("");
  }

  function removeRole(role: string) {
    setForm((current) => ({
      ...current,
      targetAudience: {
        ...current.targetAudience,
        allowedRoles: current.targetAudience.allowedRoles.filter((item) => item !== role),
      },
    }));
  }

  function addInvitedUser() {
    const userId = userSearchInput.trim();
    if (!userId) {
      setError("User ID cannot be empty.");
      return;
    }

    setError(null);
    setForm((current) => {
      if (current.targetAudience.invitedUsers.includes(userId)) {
        return current;
      }
      return {
        ...current,
        targetAudience: {
          ...current.targetAudience,
          invitedUsers: [...current.targetAudience.invitedUsers, userId],
        },
      };
    });
    setUserSearchInput("");
  }

  function removeInvitedUser(userId: string) {
    setForm((current) => ({
      ...current,
      targetAudience: {
        ...current.targetAudience,
        invitedUsers: current.targetAudience.invitedUsers.filter((item) => item !== userId),
      },
    }));
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
      if (current.requiredBatches.includes(value)) {
        return current;
      }
      return { ...current, requiredBatches: [...current.requiredBatches, value].sort((a, b) => a - b) };
    });
    setPositionBatchInput("");
    setError(null);
  }

  function addPosition() {
    const name = positionDraft.name.trim();
    if (!name) {
      setError("Volunteer position name is required.");
      return;
    }
    if (positionDraft.slots < 1) {
      setError("Volunteer position slots must be at least 1.");
      return;
    }

    setForm((current) => ({
      ...current,
      volunteerProgram: {
        ...current.volunteerProgram,
        positions: [
          ...current.volunteerProgram.positions,
          {
            ...positionDraft,
            name,
            description: positionDraft.description.trim(),
            requiredYears: [...positionDraft.requiredYears],
            requiredBatches: [...positionDraft.requiredBatches],
          },
        ],
      },
    }));

    setPositionDraft({ name: "", slots: 1, description: "", requiredYears: [], requiredBatches: [] });
    setError(null);
  }

  function removePosition(index: number) {
    setForm((current) => ({
      ...current,
      volunteerProgram: {
        ...current.volunteerProgram,
        positions: current.volunteerProgram.positions.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function addRoomToAssignment() {
    if (!selectedRoomId) {
      setError("Please select a room.");
      return;
    }

    if (form.roomAssignment?.rooms.some(r => r.roomId === selectedRoomId)) {
      setError("Room already added.");
      return;
    }

    setForm((current) => ({
      ...current,
      roomAssignment: {
        ...current.roomAssignment!,
        rooms: [
          ...(current.roomAssignment?.rooms || []),
          { roomId: selectedRoomId, priority: (current.roomAssignment?.rooms.length || 0) + 1 },
        ],
      },
    }));
    setSelectedRoomId("");
    setError(null);
  }

  function removeRoomFromAssignment(roomId: string) {
    setForm((current) => ({
      ...current,
      roomAssignment: {
        ...current.roomAssignment!,
        rooms: (current.roomAssignment?.rooms || [])
          .filter(r => r.roomId !== roomId)
          .map((r, idx) => ({ ...r, priority: idx + 1 })),
      },
    }));
  }

  function updateRoomPriority(roomId: string, direction: 'up' | 'down') {
    setForm((current) => {
      const rooms = [...(current.roomAssignment?.rooms || [])];
      const index = rooms.findIndex(r => r.roomId === roomId);
      
      if (index === -1) return current;
      if (direction === 'up' && index === 0) return current;
      if (direction === 'down' && index === rooms.length - 1) return current;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [rooms[index], rooms[swapIndex]] = [rooms[swapIndex], rooms[index]];
      
      // Reassign priorities
      rooms.forEach((r, idx) => { r.priority = idx + 1; });

      return {
        ...current,
        roomAssignment: {
          ...current.roomAssignment!,
          rooms,
        },
      };
    });
  }

  const rooms = roomsData || [];
  const totalRoomCapacity = form.roomAssignment?.rooms.reduce((sum, assignment) => {
    const room = rooms.find((r: any) => r._id === assignment.roomId);
    return sum + (room?.totalCapacity || 0);
  }, 0) || 0;
    return sum + (room?.capacity || 0);
  }, 0) || 0;

  return (
    <PageScreen title="Create Event" subtitle="Create the event, set volunteer rules, and define position-based staffing.">
      <section className="page-section event-create-layout">
        <form className="event-create-form" onSubmit={handleSubmit}>
          <div className="event-create-grid">
            <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required placeholder="Freshers' orientation, seminar, or celebration" /></label>
            <label className="field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="What is this event for, and what should participants expect?" /></label>
            <label className="field"><span>Date</span><input type="datetime-local" value={form.eventDate} onChange={(e) => setForm((current) => ({ ...current, eventDate: e.target.value }))} required /></label>
            <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required placeholder="Auditorium, seminar room, or outdoor venue" /></label>
            <label className="field"><span>Budget</span><input type="number" min={0} value={form.budget} onChange={(e) => setForm((current) => ({ ...current, budget: Number(e.target.value) }))} /></label>
          </div>

          <section className="event-create-section card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Visibility & Access</p>
                <h3>Who can see this event?</h3>
              </div>
              <span className="chip">Target Audience</span>
            </div>
            <p className="muted-inline">
              Control who can see and access this event. Leave all filters empty to make it public. 
              Use year/batch filtering for academic targeting, role-based for EC/committee meetings, or manually invite specific users.
            </p>

            <label className="field">
              <span>Visibility Mode</span>
              <select 
                value={form.visibility} 
                onChange={(e) => setForm((current) => ({ ...current, visibility: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="Public">Public - Everyone can see</option>
                <option value="Members_Only">Members Only - Active members only</option>
                <option value="Year_Based">Year Based - Specific academic years</option>
                <option value="Batch_Based">Batch Based - Specific batches</option>
                <option value="Role_Based">Role Based - Specific roles (EC, committees)</option>
                <option value="Invited_Only">Invited Only - Manually selected users</option>
                <option value="Custom">Custom - Combine multiple filters</option>
              </select>
            </label>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Year Filtering</p>
              <div className="event-create-chip-grid">
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
              {form.targetAudience.allowedYears.length > 0 && (
                <p className="muted-inline" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                  Only Year {form.targetAudience.allowedYears.join(', ')} students will see this event.
                </p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Batch Filtering</p>
              <div className="event-inline-input-row">
                <input
                  type="number"
                  min={1}
                  placeholder="Add batch e.g. 29"
                  value={audienceBatchInput}
                  onChange={(e) => setAudienceBatchInput(e.target.value)}
                />
                <button type="button" className="secondary-button" onClick={addAudienceBatch}>Add batch</button>
              </div>

              {form.targetAudience.allowedBatches.length > 0 ? (
                <div className="chip-cloud" style={{ marginTop: 10 }}>
                  {form.targetAudience.allowedBatches.map((batch) => (
                    <button key={batch} type="button" className="chip chip--interactive" onClick={() => removeAudienceBatch(batch)}>
                      Batch {batch} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted-inline" style={{ marginTop: 8, fontSize: '0.85rem' }}>No batch restriction. All batches can see this.</p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Role-Based Access (EC, Committees)</p>
              <div className="event-inline-input-row">
                <input
                  type="text"
                  placeholder="e.g. President, Vice President, EC Member, Treasurer"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                />
                <button type="button" className="secondary-button" onClick={addRole}>Add role</button>
              </div>

              {form.targetAudience.allowedRoles.length > 0 ? (
                <div className="chip-cloud" style={{ marginTop: 10 }}>
                  {form.targetAudience.allowedRoles.map((role) => (
                    <button key={role} type="button" className="chip chip--interactive" onClick={() => removeRole(role)}>
                      {role} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted-inline" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                  No role restriction. Perfect for EC-only or committee-specific meetings.
                </p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Manually Invite Specific Users</p>
              <div className="event-inline-input-row">
                <input
                  type="text"
                  placeholder="Enter user ID or email to invite"
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                />
                <button type="button" className="secondary-button" onClick={addInvitedUser}>Invite user</button>
              </div>

              {form.targetAudience.invitedUsers.length > 0 ? (
                <div className="chip-cloud" style={{ marginTop: 10 }}>
                  {form.targetAudience.invitedUsers.map((userId) => (
                    <button key={userId} type="button" className="chip chip--interactive" onClick={() => removeInvitedUser(userId)}>
                      {userId} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted-inline" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                  No users manually invited. Use this for private/exclusive events.
                </p>
              )}
            </div>

            <div className="alert" style={{ marginTop: 20, background: '#fff3cd', borderColor: '#ffc107', color: '#856404' }}>
              <strong>🔐 How filtering works:</strong> If you use multiple filters, users need to match at least one criterion. 
              Invited users always have access regardless of other filters.
            </div>
          </section>

          <section className="event-create-section card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Volunteer access</p>
                <h3>Who can apply?</h3>
              </div>
              <span className="chip">Optional rule set</span>
            </div>
            <p className="muted-inline">Leave both filters empty to allow all active members. Use either one or both for stricter entry control.</p>

            <div className="event-create-chip-grid">
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

            <div className="event-inline-input-row">
              <input
                type="number"
                min={1}
                placeholder="Add batch e.g. 29"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
              />
              <button type="button" className="secondary-button" onClick={addBatch}>Add batch</button>
            </div>

            {form.volunteerEligibility.allowedBatches.length > 0 ? (
              <div className="chip-cloud">
                {form.volunteerEligibility.allowedBatches.map((batch) => (
                  <button key={batch} type="button" className="chip chip--interactive" onClick={() => removeBatch(batch)}>
                    Batch {batch} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted-inline">No batch restriction added yet.</p>
            )}

            <div className="event-create-note-grid">
              <label className="field">
                <span>Application deadline</span>
                <input
                  type="datetime-local"
                  value={form.volunteerProgram.applicationDeadline}
                  onChange={(e) => setForm((current) => ({
                    ...current,
                    volunteerProgram: { ...current.volunteerProgram, applicationDeadline: e.target.value },
                  }))}
                />
              </label>
              <label className="field">
                <span>Volunteer notes</span>
                <textarea
                  value={form.volunteerProgram.notes}
                  onChange={(e) => setForm((current) => ({
                    ...current,
                    volunteerProgram: { ...current.volunteerProgram, notes: e.target.value },
                  }))}
                  placeholder="Example: bring a bottle of water, arrive 30 minutes early, and sign attendance on entry."
                />
              </label>
            </div>
          </section>

          <section className="event-create-section card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Staffing plan</p>
                <h3>Volunteer positions</h3>
              </div>
              <span className="chip">Limited slots per position</span>
            </div>

            <div className="event-position-builder">
              <label className="field"><span>Position name</span><input value={positionDraft.name} onChange={(e) => setPositionDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Registration desk" /></label>
              <label className="field"><span>Slots</span><input type="number" min={1} value={positionDraft.slots} onChange={(e) => setPositionDraft((current) => ({ ...current, slots: Number(e.target.value) }))} /></label>
              <label className="field field--full"><span>Description</span><textarea value={positionDraft.description} onChange={(e) => setPositionDraft((current) => ({ ...current, description: e.target.value }))} placeholder="Short duty summary" /></label>
              <label className="field field--full">
                <span>Required years</span>
                <div className="event-create-chip-grid">
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
              <label className="field field--full">
                <span>Required batches</span>
                <div className="event-inline-input-row">
                  <input type="number" min={1} placeholder="Add batch e.g. 29" value={positionBatchInput} onChange={(e) => setPositionBatchInput(e.target.value)} />
                  <button type="button" className="secondary-button" onClick={addPositionBatch}>Add batch</button>
                </div>
              </label>
              {positionDraft.requiredBatches.length > 0 ? (
                <div className="chip-cloud field--full">
                  {positionDraft.requiredBatches.map((batch) => (
                    <span key={batch} className="chip">Batch {batch}</span>
                  ))}
                </div>
              ) : null}
              <div className="form-actions field--full">
                <button type="button" className="secondary-button" onClick={addPosition}>Add position</button>
              </div>
            </div>

            {form.volunteerProgram.positions.length > 0 ? (
              <div className="stack">
                {form.volunteerProgram.positions.map((position, index) => (
                  <article className="event-position-card" key={`${position.name}-${index}`}>
                    <div className="event-card__head">
                      <div>
                        <h4>{position.name}</h4>
                        <p>{position.description || "No description provided."}</p>
                      </div>
                      <button type="button" className="secondary-button" onClick={() => removePosition(index)}>Remove</button>
                    </div>
                    <div className="button-row">
                      <span className="chip">Slots: {position.slots}</span>
                      <span className="chip">Years: {position.requiredYears.length > 0 ? position.requiredYears.join(", ") : "All"}</span>
                      <span className="chip">Batches: {position.requiredBatches.length > 0 ? position.requiredBatches.join(", ") : "All"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No volunteer positions added yet.</div>
            )}
          </section>

          <section className="event-create-section card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Room assignment</p>
                <h3>Allocate seats</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.roomAssignment?.enabled || false}
                  onChange={(e) => setForm((current) => ({
                    ...current,
                    roomAssignment: {
                      ...(current.roomAssignment || { enabled: false, rooms: [], autoAssignSeats: true }),
                      enabled: e.target.checked,
                    },
                  }))}
                />
                <span className="chip">Enable room assignment</span>
              </label>
            </div>

            {form.roomAssignment?.enabled && (
              <>
                <p className="muted-inline">
                  Assign rooms to this event. Attendees will be automatically assigned seats based on room priority.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10, marginBottom: 20 }}>
                  <input 
                    type="checkbox" 
                    checked={form.roomAssignment?.autoAssignSeats || false}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      roomAssignment: {
                        ...current.roomAssignment!,
                        autoAssignSeats: e.target.checked,
                      },
                    }))}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Auto-assign seats on registration</span>
                </label>

                <div className="event-inline-input-row">
                  <select 
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    <option value="">Select a room...</option>
                    {rooms.map((room: any) => (
                      <option key={room._id} value={room._id}>
                        {room.roomNumber} - {room.roomName} (Capacity: {room.capacity}, Mode: {room.seatManagementMode})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="secondary-button" onClick={addRoomToAssignment}>
                    Add room
                  </button>
                </div>

                {form.roomAssignment?.rooms && form.roomAssignment.rooms.length > 0 ? (
                  <div className="stack" style={{ marginTop: 16 }}>
                    {form.roomAssignment.rooms.map((assignment, index) => {
                      const room = rooms.find((r: any) => r._id === assignment.roomId);
                      if (!room) return null;

                      return (
                        <article className="event-position-card" key={assignment.roomId}>
                          <div className="event-card__head">
                            <div>
                              <h4>{room.roomNumber} - {room.roomName}</h4>
                              <p>
                                Capacity: {room.capacity} | Mode: {room.seatManagementMode} | Priority: {assignment.priority}
                              </p>
                            </div>
                            <div className="button-row" style={{ gap: 8 }}>
                              <button 
                                type="button" 
                                className="secondary-button"
                                onClick={() => updateRoomPriority(assignment.roomId, 'up')}
                                disabled={index === 0}
                                style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                              >
                                ↑
                              </button>
                              <button 
                                type="button" 
                                className="secondary-button"
                                onClick={() => updateRoomPriority(assignment.roomId, 'down')}
                                disabled={index === form.roomAssignment!.rooms.length - 1}
                                style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                              >
                                ↓
                              </button>
                              <button 
                                type="button" 
                                className="secondary-button"
                                onClick={() => removeRoomFromAssignment(assignment.roomId)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          {room.features && (
                            <div className="button-row" style={{ flexWrap: 'wrap' }}>
                              {room.features.projector && <span className="chip">🎥 Projector</span>}
                              {room.features.whiteboard && <span className="chip">📝 Whiteboard</span>}
                              {room.features.AC && <span className="chip">❄️ AC</span>}
                              {room.features.WiFi && <span className="chip">📶 WiFi</span>}
                              {room.features.desktops && <span className="chip">💻 Desktops</span>}
                              {room.features.soundSystem && <span className="chip">🔊 Sound</span>}
                              {room.features.accessibility && <span className="chip">♿ Accessible</span>}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    
                    <div className="alert" style={{ marginTop: 10, background: '#e7f5ff', borderColor: '#339af0', color: '#1971c2' }}>
                      <strong>Total Capacity:</strong> {totalRoomCapacity} seats across {form.roomAssignment.rooms.length} room(s)
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ marginTop: 16 }}>
                    No rooms assigned yet. Add rooms to enable seat allocation.
                  </div>
                )}
              </>
            )}
          </section>

          <div className="form-actions event-create-actions">
            <button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create event"}</button>
          </div>
          {error ? <div className="alert">{error}</div> : null}
        </form>

        <aside className="event-create-aside">
          <div className="event-summary-card card">
            <p className="eyebrow">Live summary</p>
            <h3>{form.title || "Untitled event"}</h3>
            <p>{form.description || "Event description will appear here."}</p>
            <div className="stack" style={{ gap: 10 }}>
              <span className="chip">When: {form.eventDate ? new Date(form.eventDate).toLocaleString() : "Not set"}</span>
              <span className="chip">Where: {form.venue || "Not set"}</span>
              <span className="chip">Budget: ৳{form.budget || 0}</span>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Volunteer rule preview</p>
            <p className="muted-inline">
              {form.volunteerEligibility.allowedYears.length === 0 && form.volunteerEligibility.allowedBatches.length === 0
                ? "Open to all active members."
                : [
                    form.volunteerEligibility.allowedYears.length > 0 ? `Years ${form.volunteerEligibility.allowedYears.join(", ")}` : null,
                    form.volunteerEligibility.allowedBatches.length > 0 ? `Batches ${form.volunteerEligibility.allowedBatches.join(", ")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">Checklist</p>
            <div className="stack" style={{ gap: 10 }}>
              <span className="chip">Event basics</span>
              <span className="chip">Volunteer eligibility</span>
              <span className="chip">Application deadline</span>
              <span className="chip">Position-based staffing</span>
            </div>
          </div>
        </aside>
      </section>
    </PageScreen>
  );
}