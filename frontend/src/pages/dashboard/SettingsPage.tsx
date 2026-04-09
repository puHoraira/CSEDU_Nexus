import { PageScreen } from "../../components/ui/PageScreen";
import { useTheme } from "../../theme/ThemeContext";

export function SettingsPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <PageScreen title="Settings" subtitle="Password, language, notification, and appearance preferences.">
      <section className="page-section">
        <h2 className="page-section__title">Appearance</h2>
        <div className="form-grid">
          <label className="field">
            <span>Theme mode</span>
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as "light" | "dark" | "system") }>
              <option value="system">System</option>
              <option value="light">Day</option>
              <option value="dark">Night</option>
            </select>
          </label>
        </div>
        <p>
          <strong>Current selection:</strong> <span className="chip">{themeMode}</span>
        </p>
        <p>
          <strong>Applied theme:</strong> <span className="chip">{resolvedTheme}</span>
        </p>
      </section>
    </PageScreen>
  );
}