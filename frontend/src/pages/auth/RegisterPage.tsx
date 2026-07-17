import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { normalizeApiError } from "../../lib/api";

function getRoleHomePage(roles: string[]): string {
  if (roles.includes("Moderator"))             return "/dashboard/moderator";
  if (roles.includes("Chief Patron"))          return "/dashboard/chief-patron";
  if (roles.includes("Election Commissioner")) return "/dashboard/election-commission";
  if (roles.includes("System Admin"))          return "/dashboard/admin";
  if (roles.includes("Alumni"))                return "/dashboard/alumni";
  return "/dashboard/home";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, registerTeacher } = useAuth();
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [form, setForm] = useState({
    // Basic Authentication
    email: "",
    password: "",
    
    // Essential Personal Information
    firstName: "",
    lastName: "",
    phone: "",
    
    // Academic Information (for students only)
    studentId: "",
    batch: new Date().getFullYear(),
    currentYear: 1,
    
    // Teacher Information (for teachers only)
    designation: "",
    
    // Basic Experience (optional)
    experience: "",
  });
  
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!agreed) {
      setError("You must agree to the CSEDUSC Constitution to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (accountType === "teacher") {
        const result = await registerTeacher({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          designation: form.designation,
          phone: form.phone,
          experience: form.experience,
        });
        
        // Show verification success message
        setUserEmail(form.email);
        setRegistrationSuccess(true);
      } else {
        const result = await register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          studentId: form.studentId,
          batch: form.batch,
          currentYear: form.currentYear,
          experience: form.experience || "",
        });
        
        // Show verification success message
        setUserEmail(form.email);
        setRegistrationSuccess(true);
      }
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-layout">
      {registrationSuccess ? (
        <div style={{ 
          gridColumn: "1 / -1", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "100vh",
          padding: "40px 20px"
        }}>
          <div style={{ 
            maxWidth: 600, 
            width: "100%",
            textAlign: "center", 
            padding: 40, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 12,
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✉️</div>
            <h1 style={{ marginBottom: 16, color: "white", fontSize: 32 }}>Check Your Email</h1>
            <p style={{ fontSize: 18, marginBottom: 24, opacity: 0.95 }}>
              We've sent a verification link to <strong>{userEmail}</strong>
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
              <ol style={{ textAlign: "left", fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
                <li>Open your email inbox</li>
                <li>Look for an email from CSEDU Nexus</li>
                <li>Click the verification link in the email</li>
                <li>Once verified, you can log in to your account</li>
              </ol>
            </div>
            <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
              Didn't receive the email? Check your spam folder or wait a few minutes.
            </p>
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
                fontWeight: 600,
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      ) : (
        <>
          <aside className="register-hero">
        <h2>Join the club workspace.</h2>
        <p>
          Create your account to access membership tools, event workflows, meeting actions, and role-aware club services.
        </p>

        <div className="stack" style={{ gap: 10 }}>
          <span className="chip">Member access</span>
          <span className="chip">Volunteer workflows</span>
          <span className="chip">Meeting and governance tools</span>
        </div>

        <div className="register-hero__footer">
          <strong>Registration Portal</strong>
          <span>Academic workspace access</span>
        </div>
      </aside>

      <div className="register-content">
        <header className="register-content__header">
          <p className="eyebrow">Create account</p>
          <h1>Set up your profile</h1>
          <p>Use your official university details to register for CSEDU Nexus.</p>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button 
              type="button" 
              className={accountType === "student" ? "primary-button" : "secondary-button"} 
              onClick={() => setAccountType("student")}
            >
              Student
            </button>
            <button 
              type="button" 
              className={accountType === "teacher" ? "primary-button" : "secondary-button"} 
              onClick={() => setAccountType("teacher")}
            >
              Teacher (Alumni-equivalent)
            </button>
          </div>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <p className="register-form__section">Personal Information</p>
          <div className="register-form__grid">
            <label className="field">
              <span>First name</span>
              <input 
                value={form.firstName} 
                onChange={(e) => updateField("firstName", e.target.value)} 
                placeholder="Abu" 
                required 
              />
            </label>
            <label className="field">
              <span>Last name</span>
              <input 
                value={form.lastName} 
                onChange={(e) => updateField("lastName", e.target.value)} 
                placeholder="Mamun" 
                required 
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <input 
                value={form.email} 
                onChange={(e) => updateField("email", e.target.value)} 
                type="email" 
                placeholder="name@du.ac.bd" 
                required 
              />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input 
                value={form.phone} 
                onChange={(e) => updateField("phone", e.target.value)} 
                type="tel" 
                placeholder="+8801XXXXXXXXX" 
                required 
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input 
                value={form.password} 
                onChange={(e) => updateField("password", e.target.value)} 
                type="password" 
                minLength={8} 
                placeholder="Min 8 characters" 
                required 
              />
            </label>
          </div>

          {accountType === "student" ? (
            <>
              <p className="register-form__section">Academic Information</p>
              <div className="register-form__grid">
                <label className="field">
                  <span>Student ID</span>
                  <input 
                    value={form.studentId} 
                    onChange={(e) => updateField("studentId", e.target.value)} 
                    placeholder="2020-02-045" 
                    required 
                  />
                </label>
                <label className="field">
                  <span>Batch</span>
                  <input 
                    value={form.batch} 
                    onChange={(e) => updateField("batch", Number(e.target.value))} 
                    type="number" 
                    placeholder="e.g. 2020" 
                    required 
                  />
                </label>
                <label className="field">
                  <span>Current semester/year</span>
                  <select 
                    value={form.currentYear} 
                    onChange={(e) => updateField("currentYear", Number(e.target.value))}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                    <option value={5}>5th Year</option>
                  </select>
                </label>
              </div>
              
              <div className="info">
                <strong>Quick Registration:</strong> This creates your basic account. To participate in EC elections, you can complete your full profile with CGPA, attendance, and other details later from your dashboard.
              </div>
            </>
          ) : (
            <>
              <p className="register-form__section">Teacher Information</p>
              <div className="register-form__grid">
                <label className="field">
                  <span>Designation</span>
                  <input 
                    value={form.designation} 
                    onChange={(e) => updateField("designation", e.target.value)} 
                    placeholder="Student Advisor / Lecturer" 
                    required 
                  />
                </label>
              </div>
            </>
          )}

          <p className="register-form__section">Experience (Optional)</p>
          <div className="register-form__grid">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>{accountType === "teacher" ? "Professional / Club experience" : "EC / volunteering experience"}</span>
              <textarea 
                value={form.experience} 
                onChange={(e) => updateField("experience", e.target.value)} 
                placeholder="Write brief experience summary (optional)" 
                rows={3}
              />
            </label>
          </div>

          <label className="register-agreement">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(event) => setAgreed(event.target.checked)} 
            />
            <span>
              <strong>I have read and agree to the CSEDUSC Constitution</strong>
              <small>
                By registering, you agree to uphold club values, ethics, and bylaws of the Department of CSE Students'
                Club. You can complete your full profile later to participate in elections.
              </small>
            </span>
          </label>

          {error ? <div className="alert">{error}</div> : null}

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </div>

          <p className="register-login-line">
            Already have an account? <Link to="/auth/login">Login</Link>
          </p>
        </form>

        <footer className="register-footer">
          <span>© 2024 CSEDU STUDENT'S CLUB</span>
          <span>PRIVACY POLICY</span>
          <span>SUPPORT CENTER</span>
          <span>UNIVERSITY CHARTER</span>
        </footer>
      </div>
    </>
      )}
    </section>
  );
}