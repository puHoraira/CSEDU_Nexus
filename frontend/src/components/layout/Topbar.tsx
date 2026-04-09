import { Bell, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";

export function Topbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <label className="topbar__search">
        <Search size={16} />
        <input placeholder="Search members, events, notices..." />
      </label>

      <div className="topbar__actions">
        <button type="button" className="icon-button" onClick={toggleTheme} title={resolvedTheme === "dark" ? "Switch to day mode" : "Switch to night mode"}>
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" className="icon-button">
          <Bell size={18} />
          <span className="icon-button__badge">2</span>
        </button>
        <div className="topbar__profile">
          <div className="topbar__avatar">
            {user?.avatarUrl ? (
              <img className="topbar__avatar-image" src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
            ) : (
              user ? user.firstName.slice(0, 1).toUpperCase() : "G"
            )}
          </div>
          <div>
            <strong>{user ? `${user.firstName} ${user.lastName}` : "Guest"}</strong>
            <p>{user ? user.roles.join(", ") : "Public visitor"}</p>
          </div>
        </div>
        {user ? (
          <button type="button" className="secondary-button" onClick={logout}>
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}