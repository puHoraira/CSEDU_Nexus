import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Search, UserCog, UserPlus, UserMinus, Users } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

type RoleRow = { name: string; scope: "system" | "governance" };
type UserRow = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  academicYearLevel: string | null;
  memberStatus: string | null;
  roles: string[];
};

type Feedback = { variant: "success" | "error"; text: string } | null;

export function AdminRoleManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const rolesQuery = useQuery({
    queryKey: ["admin-roles", token],
    queryFn: () => apiRequest<RoleRow[]>("/admin/roles", { token }),
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", token],
    queryFn: () => apiRequest<UserRow[]>("/admin/users", { token }),
    enabled: Boolean(token),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      apiRequest("/admin/assign-role", {
        method: "POST",
        token,
        body: JSON.stringify({ userId, roleName }),
      }),
    onSuccess: async () => {
      setFeedback({ variant: "success", text: `Role "${roleName}" assigned successfully.` });
      await queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
    },
    onError: (error) => setFeedback({ variant: "error", text: normalizeApiError(error) }),
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      apiRequest("/admin/revoke-role", {
        method: "POST",
        token,
        body: JSON.stringify({ userId, roleName }),
      }),
    onSuccess: async () => {
      setFeedback({ variant: "success", text: `Role "${roleName}" revoked successfully.` });
      await queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
    },
    onError: (error) => setFeedback({ variant: "error", text: normalizeApiError(error) }),
  });

  function submitAssign(event: FormEvent) {
    event.preventDefault();
    if (!userId || !roleName) {
      setFeedback({ variant: "error", text: "Select both a user and a role." });
      return;
    }
    assignMutation.mutate();
  }

  function submitRevoke() {
    if (!userId || !roleName) {
      setFeedback({ variant: "error", text: "Select both a user and a role." });
      return;
    }
    revokeMutation.mutate();
  }

  const users = usersQuery.data || [];
  const roles = rolesQuery.data || [];
  const selectedUser = useMemo(() => users.find((u) => u.id === userId), [users, userId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const busy = assignMutation.isPending || revokeMutation.isPending;

  return (
    <div className="ui-page">
      <PageHeader
        title="Role Management"
        description="Assign and revoke system roles for any member from one console."
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Roles" },
        ]}
        backButton
      />

      {feedback && (
        <Alert variant={feedback.variant} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      {/* Assignment console */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}>
            <UserCog size={17} /> Assign or Revoke Role
          </h3>
        </div>
        <div className="ui-card__body">
          <form onSubmit={submitAssign} className="ui-flex ui-flex-gap-4 ui-flex-wrap" style={{ alignItems: "flex-end" }}>
            <label className="ui-input-wrap ui-flex-1" style={{ minWidth: 260 }}>
              <span className="ui-input-label">User</span>
              <select className="ui-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="ui-input-wrap ui-flex-1" style={{ minWidth: 220 }}>
              <span className="ui-input-label">Role</span>
              <select className="ui-select" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
                <option value="">Select role…</option>
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="ui-flex ui-flex-gap-2">
              <Button type="submit" variant="primary" leftIcon={UserPlus} isLoading={assignMutation.isPending} disabled={busy}>
                Assign
              </Button>
              <Button type="button" variant="danger" leftIcon={UserMinus} isLoading={revokeMutation.isPending} disabled={busy} onClick={submitRevoke}>
                Revoke
              </Button>
            </div>
          </form>

          {selectedUser && (
            <div className="ui-mt-4" style={{ padding: 16, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-soft)" }}>
              <div className="ui-flex ui-flex-between ui-flex-wrap ui-flex-gap-3" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="ui-font-medium">{selectedUser.name}</div>
                  <div className="ui-text-sm ui-text-muted">{selectedUser.email}</div>
                  <div className="ui-text-xs ui-text-muted ui-mt-2">
                    {selectedUser.studentId ? `ID ${selectedUser.studentId}` : "No student ID"}
                    {selectedUser.academicYearLevel ? ` · ${selectedUser.academicYearLevel.replace(/_/g, " ")}` : ""}
                    {selectedUser.memberStatus ? ` · ${selectedUser.memberStatus}` : ""}
                  </div>
                </div>
                <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ justifyContent: "flex-end" }}>
                  {selectedUser.roles.length > 0 ? (
                    selectedUser.roles.map((r) => (
                      <Badge key={r} variant="primary" icon={Shield}>
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="neutral">No roles</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All users */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: "center" }}>
            <Users size={17} /> All Users
            {users.length > 0 && <span className="ui-tab__count">{users.length}</span>}
          </h3>
          <div className="ui-input-row" style={{ minWidth: 220 }}>
            <span className="ui-input-icon"><Search size={16} /></span>
            <input
              className="ui-input ui-input--icon"
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="ui-card__body ui-card__body--flush">
          {usersQuery.isLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}>
              <Spinner size="lg" label="Loading users…" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="ui-table--scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Student ID</th>
                    <th>Roles</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="ui-font-medium">{u.name}</td>
                      <td className="ui-text-sm ui-text-muted">{u.email}</td>
                      <td>{u.studentId || "—"}</td>
                      <td>
                        {u.roles.length > 0 ? (
                          <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
                            {u.roles.map((r) => (
                              <Badge key={r} variant="neutral">{r}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="ui-text-muted">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button
                          variant={userId === u.id ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setUserId(u.id)}
                        >
                          {userId === u.id ? "Selected" : "Select"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={search ? "No matching users" : "No users found"}
              description={search ? "Try a different search term." : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
