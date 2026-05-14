import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

/** Returns the best landing page for a given set of roles. */
function getRoleHomePage(roles: string[]): string {
  if (roles.includes("Moderator"))           return "/dashboard/moderator";
  if (roles.includes("Chief Patron"))        return "/dashboard/chief-patron";
  if (roles.includes("Election Commissioner")) return "/dashboard/election-commission";
  if (roles.includes("System Admin"))        return "/dashboard/admin";
  if (roles.includes("Alumni"))              return "/dashboard/alumni";
  return "/dashboard/home";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password);
      navigate(getRoleHomePage(result.user.roles));
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageScreen title="Login" subtitle="Authenticate and continue to your role-based dashboard.">
      <section className="page-section constitution-form-card constitution-form-card--submit">
        <div className="event-review-hero">
          <div style={{ maxWidth: 640 }}>
            <p className="eyebrow">Secure access</p>
            <h2 className="page-section__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.7rem)", marginBottom: 10 }}>
              Sign in to continue your role-based workflow.
            </h2>
            <p style={{ lineHeight: 1.7, color: "var(--muted)" }}>
              The dashboard adapts to your role, so the interface stays focused on the work you can actually do.
            </p>
            <div className="button-row" style={{ marginTop: 16 }}>
              <span className="chip">Members</span>
              <span className="chip">EC</span>
              <span className="chip">Moderators</span>
              <span className="chip">Admins</span>
            </div>
          </div>

          <div className="card" style={{ minWidth: 280, maxWidth: 360 }}>
            <p className="eyebrow">Why this screen</p>
            <h3 style={{ marginTop: 0 }}>Fast access, less clutter</h3>
            <div className="stack" style={{ gap: 10 }}>
              <span className="chip">Role aware dashboard</span>
              <span className="chip">Protected routes</span>
              <span className="chip">Theme preserved</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Sign in</p>
              <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>Welcome back</h2>
            </div>
          </div>
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@du.ac.bd" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Your account password" required />
            </label>
            {error ? <div className="alert">{error}</div> : null}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Login"
                )}
              </button>
              <Link className="secondary-button" to="/auth/register">
                Create account
              </Link>
            </div>
          </form>
        </section>
        <aside className="card stack">
          <div>
            <p className="eyebrow">Access</p>
            <p style={{ marginBottom: 0 }}>Use the credentials provided by the system to access role-based pages and workflows.</p>
          </div>
          <div className="info">Once logged in, the sidebar changes based on your roles and permissions.</div>
          <div className="chip-cloud">
            <span className="chip">Announcements</span>
            <span className="chip">Events</span>
            <span className="chip">Meetings</span>
            <span className="chip">Finance</span>
          </div>
        </aside>
      </div>
    </PageScreen>
  );
}