import { Link, Outlet } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../auth/AuthContext";

export function PublicShell() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  return (
    <div className="public-shell">
      <header className="public-topbar">
        <Link to="/" className="public-topbar__brand">
          <span className="sidebar__mark">CN</span>
          <strong>CSEDU Nexus</strong>
        </Link>
        <nav className="public-topbar__nav">
          <Link to="/events">Events</Link>
          <Link to="/notices">Notices</Link>
          <Link to="/constitution">Constitution</Link>
          <Link to="/ec-members">EC Members</Link>
          {user ? (
            <>
              <Link to="/dashboard/home" className="public-topbar__user-link" title={displayName || user.email}>
                {displayName || user.email}
              </Link>
              <Link to="/dashboard/home">Dashboard</Link>
              <button type="button" className="secondary-button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth/login">Login</Link>
          )}
          <button type="button" className="secondary-button" onClick={toggleTheme}>
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {resolvedTheme === "dark" ? "Day" : "Night"}
          </button>
        </nav>
      </header>
      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
}
