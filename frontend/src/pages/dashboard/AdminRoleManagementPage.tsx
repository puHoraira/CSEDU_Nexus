import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type RoleRow = { name: string; scope: "system" | "governance" };
type UserRow = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  memberStatus: string | null;
  roles: string[];
};

export function AdminRoleManagementPage() {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Role assigned");
      await queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      apiRequest("/admin/revoke-role", {
        method: "POST",
        token,
        body: JSON.stringify({ userId, roleName }),
      }),
    onSuccess: async () => {
      setMessage("Role revoked");
      await queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!userId || !roleName) {
      setMessage("Select user and role");
      return;
    }
    assignMutation.mutate();
  }

  function handleRevoke(event: FormEvent) {
    event.preventDefault();
    if (!userId || !roleName) {
      setMessage("Select user and role");
      return;
    }
    revokeMutation.mutate();
  }

  const selectedUser = useMemo(() => (usersQuery.data || []).find((item) => item.id === userId), [usersQuery.data, userId]);

  return (
    <PageScreen title="System Admin" subtitle="Assign and revoke roles from one place.">
      {message ? <div className="info">{message}</div> : null}

      <section className="page-section">
        <h2 className="page-section__title">Role Assignment</h2>
        <form className="form-grid" onSubmit={handleAssign}>
          <label className="field">
            <span>User</span>
            <select value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">Select user</option>
              {(usersQuery.data || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.email})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Role</span>
            <select value={roleName} onChange={(event) => setRoleName(event.target.value)}>
              <option value="">Select role</option>
              {(rolesQuery.data || []).map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={assignMutation.isPending}>
              Assign role
            </button>
          </div>
        </form>

        <form className="form-grid" onSubmit={handleRevoke}>
          <div className="form-actions">
            <button className="secondary-button" type="submit" disabled={revokeMutation.isPending}>
              Revoke role
            </button>
          </div>
        </form>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Selected User</h2>
        {selectedUser ? (
          <div className="card">
            <p><strong>Name:</strong> {selectedUser.name}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Student ID:</strong> {selectedUser.studentId || "-"}</p>
            <p><strong>Member Status:</strong> {selectedUser.memberStatus || "-"}</p>
            <p><strong>Roles:</strong> {selectedUser.roles.join(", ") || "None"}</p>
          </div>
        ) : (
          <div className="notice">Select a user to inspect role memberships.</div>
        )}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">All Users</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data || []).map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.studentId || "-"}</td>
                <td>{item.roles.join(" | ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}
