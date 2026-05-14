import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError, type ApiUser } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type ProfilePayload = {
  user: ApiUser;
  membership: { studentId: string; batch: number; currentYear: number; status: string } | null;
  account: { isActive: boolean; joinedAt: string; updatedAt: string };
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  bio: string;
};

export function ProfilePage() {
  const { token, setUserProfile, loading } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
    avatarUrl: "",
    bio: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["my-profile", token],
    queryFn: () => apiRequest<ProfilePayload>("/auth/me", { token }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const nextForm: ProfileForm = {
      firstName: profileQuery.data.user.firstName,
      lastName: profileQuery.data.user.lastName,
      phone: profileQuery.data.user.phone || "",
      avatarUrl: profileQuery.data.user.avatarUrl || "",
      bio: profileQuery.data.user.bio || "",
    };
    setForm(nextForm);
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest<ApiUser>("/auth/profile", {
        method: "PATCH",
        token,
        body: JSON.stringify(form),
      }),
    onSuccess: (updatedUser) => {
      setUserProfile(updatedUser);
      setMessage("Profile updated successfully");
      profileQuery.refetch();
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    updateMutation.mutate();
  }

  const initials = useMemo(() => {
    const first = form.firstName?.trim()?.[0] || "U";
    const last = form.lastName?.trim()?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [form.firstName, form.lastName]);

  return (
    <PageScreen title="Profile" subtitle="Personal identity, membership details, and account overview.">
      {message ? <div className="info">{message}</div> : null}
      {profileQuery.isLoading ? <div className="notice">Loading profile...</div> : null}

      <div className="grid-2">
        <section className="page-section">
          <h2 className="page-section__title">Profile identity</h2>
          <div className="profile-hero">
            <div className="profile-avatar">
              {form.avatarUrl ? <img className="profile-avatar__image" src={form.avatarUrl} alt={`${form.firstName} ${form.lastName}`} /> : initials}
            </div>
            <div>
              <p><strong>{profileQuery.data?.user.firstName} {profileQuery.data?.user.lastName}</strong></p>
              <p>{profileQuery.data?.user.email}</p>
              <p><span className="chip">{profileQuery.data?.account.isActive ? "Active account" : "Inactive account"}</span></p>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <p><strong>Student ID:</strong> {profileQuery.data?.membership?.studentId || "-"}</p>
              <p><strong>Batch:</strong> {profileQuery.data?.membership?.batch ?? "-"}</p>
              <p><strong>Current year:</strong> {profileQuery.data?.membership?.currentYear ?? "-"}</p>
              <p><strong>Membership status:</strong> <span className="chip">{profileQuery.data?.membership?.status || "N/A"}</span></p>
            </div>
            <div className="card">
              <p><strong>Joined:</strong> {profileQuery.data?.account.joinedAt ? new Date(profileQuery.data.account.joinedAt).toLocaleString() : "-"}</p>
              <p><strong>Last update:</strong> {profileQuery.data?.account.updatedAt ? new Date(profileQuery.data.account.updatedAt).toLocaleString() : "-"}</p>
              <p><strong>Roles:</strong> {(profileQuery.data?.user.roles || []).join(", ") || "-"}</p>
            </div>
          </div>
        </section>

        <section className="page-section">
          <h2 className="page-section__title">Edit profile</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>First name</span>
              <input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Last name</span>
              <input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+8801XXXXXXXXX" />
            </label>
            <label className="field">
              <span>Profile image URL</span>
              <input value={form.avatarUrl} onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="https://..." />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Bio</span>
              <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell others about your role, interests, and contributions." />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </PageScreen>
  );
}