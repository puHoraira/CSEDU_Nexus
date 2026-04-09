import { Link } from "react-router-dom";
import { PageScreen } from "../../components/ui/PageScreen";

export function UnauthorizedPage() {
  return (
    <PageScreen title="Unauthorized" subtitle="You do not have permission to access this page.">
      <Link className="primary-button" to="/dashboard/home">Return to dashboard</Link>
    </PageScreen>
  );
}
