import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // This endpoint requires authentication, but the user can't log in if email is not verified
      // So we'll use a public endpoint that takes email as input
      await apiRequest("/auth/request-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <PageScreen 
        title="Verification Email Sent" 
        subtitle="Check your inbox for the verification link"
      >
        <section className="page-section">
          <div className="success-message" style={{ 
            textAlign: "center", 
            padding: 40, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 12,
            color: "white",
            maxWidth: 600,
            margin: "0 auto"
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✉️</div>
            <h2 style={{ marginBottom: 16, color: "white" }}>Email Sent Successfully</h2>
            <p style={{ fontSize: 16, marginBottom: 24, opacity: 0.95 }}>
              We've sent a new verification link to <strong>{email}</strong>
            </p>
            <div style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: 20, 
              borderRadius: 8,
              marginBottom: 24
            }}>
              <p style={{ marginBottom: 12, fontSize: 16 }}>
                <strong>Next Steps:</strong>
              </p>
              <ol style={{ textAlign: "left", fontSize: 14, lineHeight: 1.8 }}>
                <li>Open your email inbox</li>
                <li>Look for an email from CSEDU Nexus</li>
                <li>Click the verification link in the email</li>
                <li>Once verified, you can log in to your account</li>
              </ol>
            </div>
            <Link 
              to="/auth/login" 
              className="primary-button"
              style={{ 
                display: "inline-block",
                padding: "12px 32px",
                background: "white",
                color: "#667eea",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 600
              }}
            >
              Go to Login Page
            </Link>
          </div>
        </section>
      </PageScreen>
    );
  }

  return (
    <PageScreen 
      title="Resend Verification Email" 
      subtitle="Enter your email to receive a new verification link"
    >
      <div className="grid-2" style={{ marginTop: 18 }}>
        <section className="page-section">
          <div className="constitution-section-header">
            <div>
              <p className="constitution-section-header__eyebrow">Email Verification</p>
              <h2 className="page-section__title" style={{ fontSize: "1.35rem" }}>
                Resend Verification Link
              </h2>
              <p style={{ marginTop: 8, color: "var(--muted)" }}>
                Didn't receive the verification email? Enter your email address below to receive a new verification link.
              </p>
            </div>
          </div>
          
          <form className="stack" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <label className="field">
              <span>Email Address</span>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                type="email" 
                placeholder="name@du.ac.bd" 
                required 
              />
            </label>

            {error ? <div className="alert">{error}</div> : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </button>
              <Link className="secondary-button" to="/auth/login">
                Back to Login
              </Link>
            </div>
          </form>
        </section>

        <aside className="card stack">
          <div>
            <p className="eyebrow">Email Verification</p>
            <h3 style={{ marginTop: 8, marginBottom: 12 }}>Why verify your email?</h3>
            <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Secures your account</li>
              <li>Enables password recovery</li>
              <li>Confirms your identity</li>
              <li>Required for club activities</li>
            </ul>
          </div>

          <div className="info">
            <strong>Tip:</strong> Check your spam folder if you don't see the email in your inbox within a few minutes.
          </div>

          <div className="chip-cloud">
            <span className="chip">Secure</span>
            <span className="chip">Required</span>
            <span className="chip">One-time</span>
          </div>
        </aside>
      </div>
    </PageScreen>
  );
}
