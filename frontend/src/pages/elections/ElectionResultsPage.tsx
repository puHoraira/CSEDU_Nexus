import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type ResultRow = {
  candidateId: string;
  total: number;
  candidateName: string;
  studentId?: string | null;
  batch?: number | null;
  post?: { title?: string } | null;
};

export function ElectionResultsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["election-results", id, token],
    queryFn: () => apiRequest<ResultRow[]>(`/elections/${id}/results`, { token }),
    enabled: Boolean(token && id),
  });

  const rows = useMemo(() => data, [data]);

  return (
    <PageScreen title="Results" subtitle="Transparent election result publication.">
      <section className="page-section">
        <table className="data-table">
          <thead><tr><th>Candidate</th><th>Post</th><th>Student ID</th><th>Batch</th><th>Votes</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.candidateId}>
                <td>{row.candidateName}</td>
                <td>{row.post?.title || "Representative"}</td>
                <td>{row.studentId || "-"}</td>
                <td>{row.batch || "-"}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}