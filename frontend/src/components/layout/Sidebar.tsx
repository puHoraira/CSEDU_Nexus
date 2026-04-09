import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { navigationGroups } from "../../data/navigation";

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">CN</span>
        <div>
          <strong>CSEDU Nexus</strong>
          <p>Club platform</p>
        </div>
      </div>

      {navigationGroups.map((group) => (
        user && group.title === "Public" ? null : (
        <section key={group.title} className="sidebar__group">
          <h3>{group.title}</h3>
          <nav>
            {group.items
              .filter((item) => {
                if (!item.roles || item.roles.length === 0) return true;
                if (!user) return item.public === true;
                return item.roles.some((role) => user.roles.includes(role));
              })
              .map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </nav>
        </section>
        )
      ))}
    </aside>
  );
}