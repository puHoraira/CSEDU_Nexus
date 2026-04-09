import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { PageScreen } from "../../components/ui/PageScreen";

export function HelpPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];

  return (
    <PageScreen title="Help Center" subtitle="Complete operation guide for roles, workflows, setup, and troubleshooting.">
      <section className="page-section">
        <h2 className="page-section__title">Quick Start</h2>
        <div className="grid-3">
          <div className="card">
            <p><strong>Step 1</strong></p>
            <p>Register a Student or Teacher account from the register page.</p>
            <Link className="subtle-link" to="/auth/register">Open registration</Link>
          </div>
          <div className="card">
            <p><strong>Step 2</strong></p>
            <p>Sign in and open your dashboard pages based on assigned roles.</p>
            <Link className="subtle-link" to="/dashboard/home">Open dashboard</Link>
          </div>
          <div className="card">
            <p><strong>Step 3</strong></p>
            <p>If role pages are missing, ask System Admin to assign your role and re-login.</p>
            <Link className="subtle-link" to="/dashboard/admin">Open admin panel</Link>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Role Access Guide</h2>
        <div className="grid-2">
          <div className="card">
            <p><strong>Current roles:</strong> {roles.join(", ") || "No role loaded"}</p>
            <p><strong>Tip:</strong> If your new role does not appear, logout and login again.</p>
          </div>
          <div className="card">
            <p><strong>Key role panels:</strong></p>
            <p><Link className="subtle-link" to="/dashboard/moderator">Moderator panel</Link></p>
            <p><Link className="subtle-link" to="/dashboard/chief-patron">Chief Patron panel</Link></p>
            <p><Link className="subtle-link" to="/dashboard/election-commission">Election commission</Link></p>
            <p><Link className="subtle-link" to="/dashboard/alumni">Alumni portal</Link></p>
            <p><Link className="subtle-link" to="/dashboard/admin">System Admin</Link></p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Operations by Module</h2>
        <div className="grid-2">
          <div className="card">
            <p><strong>Membership</strong></p>
            <p>View members, submit cancellation requests, review/execute approvals.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/membership">Membership</Link>
              <Link className="secondary-button" to="/dashboard/membership/cancellations">Cancellations</Link>
              <Link className="secondary-button" to="/dashboard/membership/roster">Roster</Link>
            </div>
          </div>

          <div className="card">
            <p><strong>Governance</strong></p>
            <p>Manage EC posts, terms, and appointments with rule-based eligibility.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/governance/ec-posts">EC Posts</Link>
              <Link className="secondary-button" to="/dashboard/governance/ec-terms">EC Terms</Link>
              <Link className="secondary-button" to="/dashboard/governance/ec-appointments">Appointments</Link>
            </div>
          </div>

          <div className="card">
            <p><strong>Meetings</strong></p>
            <p>Create meetings, record attendance, and inspect absence alerts.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/meetings">Meetings</Link>
              <Link className="secondary-button" to="/dashboard/meetings/create">Create meeting</Link>
              <Link className="secondary-button" to="/dashboard/meetings/absence-alerts">Absence alerts</Link>
            </div>
          </div>

          <div className="card">
            <p><strong>Elections</strong></p>
            <p>Create election, manage phase, validate candidates, publish results, cast votes.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/elections">Elections</Link>
              <Link className="secondary-button" to="/dashboard/elections/create">Create election</Link>
              <Link className="secondary-button" to="/dashboard/election-commission">Commission panel</Link>
            </div>
          </div>

          <div className="card">
            <p><strong>Events</strong></p>
            <p>Create and manage events, and monitor volunteer registration flow.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/events">Events list</Link>
              <Link className="secondary-button" to="/dashboard/events/create">Create event</Link>
            </div>
          </div>

          <div className="card">
            <p><strong>Finance</strong></p>
            <p>Add transactions, monitor ledger, sign cheques (Chief Patron), and generate reports.</p>
            <div className="button-row">
              <Link className="secondary-button" to="/dashboard/finance">Finance overview</Link>
              <Link className="secondary-button" to="/dashboard/finance/ledger">Ledger</Link>
              <Link className="secondary-button" to="/dashboard/finance/reports">Reports</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Moderator CSV Bulk Registration</h2>
        <p>From Moderator Panel, upload CSV and auto-register all users as General Member accounts.</p>
        <p><strong>Required CSV columns:</strong> firstName,lastName,email,password,studentId,batch,currentYear,experience</p>
        <p><strong>Default demo password:</strong> 12345678</p>
        <div className="button-row">
          <Link className="secondary-button" to="/dashboard/moderator">Open moderator panel</Link>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Profile, Theme, and Personalization</h2>
        <div className="grid-2">
          <div className="card">
            <p><strong>Profile</strong></p>
            <p>Update image URL, phone, bio, designation, and experience.</p>
            <Link className="subtle-link" to="/dashboard/profile">Open profile</Link>
          </div>
          <div className="card">
            <p><strong>Appearance</strong></p>
            <p>Switch theme mode from Settings: System, Day, Night.</p>
            <Link className="subtle-link" to="/dashboard/settings">Open settings</Link>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section__title">System Setup and Troubleshooting</h2>
        <div className="card">
          <p><strong>Backend setup commands</strong></p>
          <p>1. npm run seed</p>
          <p>2. npm start</p>
          <p>3. npm run grant-admin -- your_email@example.com</p>
          <p><strong>Frontend run command</strong></p>
          <p>1. npm run dev</p>
          <p><strong>Common fixes</strong></p>
          <p>1. Unauthorized page after role change: logout and login again.</p>
          <p>2. Admin page not visible: ensure System Admin role is assigned to current account.</p>
          <p>3. Moderator teacher issue: use Teacher registration (maps to Alumni), Moderator must be assigned in Admin.</p>
          <p>4. Atlas connection issue: verify IP whitelist and valid credentials.</p>
        </div>
      </section>
    </PageScreen>
  );
}