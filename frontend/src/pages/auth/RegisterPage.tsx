import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { normalizeApiError } from "../../lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, registerTeacher } = useAuth();
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    studentId: "",
    batch: 2021,
    currentYear: 1,
    designation: "",
    phone: "",
    experience: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await registerTeacher({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          designation: form.designation,
          phone: form.phone,
          experience: form.experience,
        });
      } else {
        await register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          studentId: form.studentId,
          batch: form.batch,
          currentYear: form.currentYear,
          experience: form.experience,
        });
      }
      navigate("/dashboard/home");
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-layout">
      <aside className="register-hero">
        <h2>Join the Academic Legacy.</h2>
        <p>
          The Department of Computer Science and Engineering, University of Dhaka welcomes its scholars to the
          official governance portal.
        </p>

        <div className="register-hero__footer">
          <strong>Registration Portal</strong>
          <span>Academic Year 2024-25</span>
        </div>
      </aside>

      <div className="register-content">
        <header className="register-content__header">
          <h1>Create your account</h1>
          <p>Please provide your official university credentials to register for CSEDU Nexus.</p>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button type="button" className={accountType === "student" ? "primary-button" : "secondary-button"} onClick={() => setAccountType("student")}>Student</button>
            <button type="button" className={accountType === "teacher" ? "primary-button" : "secondary-button"} onClick={() => setAccountType("teacher")}>Teacher (Alumni-equivalent)</button>
          </div>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <p className="register-form__section">Personal Information</p>
          <div className="register-form__grid">
            <label className="field">
              <span>First name</span>
              <input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="Abu" required />
            </label>
            <label className="field">
              <span>Last name</span>
              <input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Mamun" required />
            </label>
            <label className="field">
              <span>Email address</span>
              <input value={form.email} onChange={(e) => updateField("email", e.target.value)} type="email" placeholder="name@du.ac.bd" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={form.password} onChange={(e) => updateField("password", e.target.value)} type="password" minLength={8} placeholder="Min 8 characters" required />
            </label>
          </div>

          {accountType === "student" ? (
            <>
              <p className="register-form__section">Academic Information</p>
              <div className="register-form__grid">
                <label className="field">
                  <span>Student ID</span>
                  <input value={form.studentId} onChange={(e) => updateField("studentId", e.target.value)} placeholder="20XX-XXX-XXX" required />
                </label>
                <label className="field">
                  <span>Batch</span>
                  <input value={form.batch} onChange={(e) => updateField("batch", Number(e.target.value))} type="number" placeholder="e.g. 29" required />
                </label>
                <label className="field">
                  <span>Current semester/year</span>
                  <input value={form.currentYear} onChange={(e) => updateField("currentYear", Number(e.target.value))} type="number" min={1} max={5} required />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="register-form__section">Teacher Information</p>
              <div className="register-form__grid">
                <label className="field">
                  <span>Designation</span>
                  <input value={form.designation} onChange={(e) => updateField("designation", e.target.value)} placeholder="Student Advisor / Lecturer" required />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+8801XXXXXXXXX" />
                </label>
              </div>
            </>
          )}

          <p className="register-form__section">Experience</p>
          <div className="register-form__grid">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>{accountType === "teacher" ? "Professional / Club experience" : "EC / volunteering experience"}</span>
              <textarea value={form.experience} onChange={(e) => updateField("experience", e.target.value)} placeholder="Write brief experience summary" />
            </label>
          </div>

          <label className="register-agreement">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              <strong>I have read and agree to the CSEDUSC Constitution</strong>
              <small>
                By registering, you agree to uphold club values, ethics, and bylaws of the Department of CSE Students'
                Club.
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
    </section>
  );
}