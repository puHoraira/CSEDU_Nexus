import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

const SUPPORTED_YEARS = [1, 2, 3, 4, 5];

export function MeetingCreatePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ 
    title: "", 
    agenda: "", 
    meetingDate: "", 
    venue: "", 
    meetingMode: "Online",
    visibility: "Members_Only",
    targetAudience: {
      allowedYears: [] as number[],
      allowedBatches: [] as number[],
      allowedRoles: [] as string[],
      invitedUsers: [] as string[],
    },
  });
  const [audienceBatchInput, setAudienceBatchInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; roomId?: string; meetingMode: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ title: string; roomId?: string; meetingMode: string }>("/meetings", {
        method: "POST",
        token,
        body: JSON.stringify({ 
          ...form, 
          meetingDate: new Date(form.meetingDate).toISOString(),
          visibility: form.visibility,
          targetAudience: form.targetAudience,
        }),
      }),
    onSuccess: async (meeting) => {
      await queryClient.invalidateQueries({ queryKey: ["meetings", token] });
      setSuccess({ title: meeting.title, roomId: meeting.roomId, meetingMode: meeting.meetingMode });
      setForm({ 
        title: "", 
        agenda: "", 
        meetingDate: "", 
        venue: "", 
        meetingMode: "Online",
        visibility: "Members_Only",
        targetAudience: {
          allowedYears: [],
          allowedBatches: [],
          allowedRoles: [],
          invitedUsers: [],
        },
      });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
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

  return (
    <PageScreen title="Create Meeting" subtitle="Set title, agenda, venue, and date. Control who can see and attend this meeting.">
      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Meeting mode</span>
            <select value={form.meetingMode} onChange={(e) => setForm((current) => ({ ...current, meetingMode: e.target.value }))}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </label>
          <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required /></label>
          <label className="field"><span>Agenda</span><input value={form.agenda} onChange={(e) => setForm((current) => ({ ...current, agenda: e.target.value }))} /></label>
          <label className="field"><span>Date</span><input type="datetime-local" value={form.meetingDate} onChange={(e) => setForm((current) => ({ ...current, meetingDate: e.target.value }))} required /></label>
          <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required /></label>

          {/* Target Audience Section */}
          <div className="card" style={{ gridColumn: '1 / -1', padding: '24px', marginTop: '20px' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Target Audience & Visibility</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 16 }}>
                Control who can see and attend this meeting. Perfect for EC-only meetings, committee meetings, or year/batch-specific sessions.
              </p>
            </div>

            <label className="field" style={{ marginBottom: 20 }}>
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

            {/* Year Filtering */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Year Filtering</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUPPORTED_YEARS.map((year) => {
                  const selected = form.targetAudience.allowedYears.includes(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      className={selected ? "primary-button" : "secondary-button"}
                      onClick={() => toggleAudienceYear(year)}
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      Year {year}
                    </button>
                  );
                })}
              </div>
              {form.targetAudience.allowedYears.length > 0 && (
                <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Only Year {form.targetAudience.allowedYears.join(', ')} students will see this meeting.
                </p>
              )}
            </div>

            {/* Batch Filtering */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Batch Filtering</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="number"
                  min={1}
                  placeholder="Add batch e.g. 29"
                  value={audienceBatchInput}
                  onChange={(e) => setAudienceBatchInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button type="button" className="secondary-button" onClick={addAudienceBatch}>Add batch</button>
              </div>

              {form.targetAudience.allowedBatches.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.targetAudience.allowedBatches.map((batch) => (
                    <button key={batch} type="button" className="chip chip--interactive" onClick={() => removeAudienceBatch(batch)}>
                      Batch {batch} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No batch restriction. All batches can see this.</p>
              )}
            </div>

            {/* Role-Based Access */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Role-Based Access (EC, Committees)</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
                Use this for EC-only meetings, committee-specific meetings, or role-restricted sessions.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. President, Vice President, EC Member, Treasurer"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button type="button" className="secondary-button" onClick={addRole}>Add role</button>
              </div>

              {form.targetAudience.allowedRoles.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.targetAudience.allowedRoles.map((role) => (
                    <button key={role} type="button" className="chip chip--interactive" onClick={() => removeRole(role)} style={{ background: 'rgba(16,185,129,0.12)', borderColor: '#059669', color: '#059669' }}>
                      {role} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  No role restriction. Add roles for EC-only or committee-specific meetings.
                </p>
              )}
            </div>

            {/* Manually Invite Users */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Manually Invite Specific Users</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Enter user ID or email to invite"
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button type="button" className="secondary-button" onClick={addInvitedUser}>Invite user</button>
              </div>

              {form.targetAudience.invitedUsers.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.targetAudience.invitedUsers.map((userId) => (
                    <button key={userId} type="button" className="chip chip--interactive" onClick={() => removeInvitedUser(userId)} style={{ background: 'rgba(245,158,11,0.12)', borderColor: '#d97706', color: '#d97706' }}>
                      {userId} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  No users manually invited. Use this for private/exclusive meetings.
                </p>
              )}
            </div>

            <div className="alert" style={{ background: '#fff3cd', borderColor: '#ffc107', color: '#856404', padding: '12px 16px', borderRadius: 8 }}>
              <strong>🔐 How filtering works:</strong> If you use multiple filters, users need to match at least one criterion. 
              Invited users always have access regardless of other filters.
            </div>
          </div>

          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="primary-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create meeting"}
            </button>
          </div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
        {success ? <div className="success">Created {success.title}. {success.meetingMode === "Online" ? `Room ready: ${success.roomId}` : "Offline meeting created."}</div> : null}
      </section>
    </PageScreen>
  );
}