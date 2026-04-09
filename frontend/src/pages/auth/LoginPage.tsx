import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

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
      await login(email, password);
      navigate("/dashboard/home");
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageScreen title="Login" subtitle="Authenticate and continue to your role-based dashboard.">
      <div className="grid-2">
        <section className="page-section">
          <h2 className="page-section__title">Sign in</h2>
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            {error ? <div className="alert">{error}</div> : null}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
              <Link className="secondary-button" to="/auth/register">
                Register
              </Link>
            </div>
          </form>
        </section>
        <aside className="card">
          <p className="eyebrow">Access</p>
          <p>Use the credentials provided by the system to access role-based pages and workflows.</p>
          <p className="info">Once logged in, the sidebar changes based on your roles and permissions.</p>
        </aside>
      </div>
    </PageScreen>
  );
}