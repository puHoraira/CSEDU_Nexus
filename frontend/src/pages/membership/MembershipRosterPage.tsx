import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type MemberRow = { _id: string; studentId: string; batch: number; currentYear: number; status: string };

export function MembershipRosterPage() {
  const { token, loading } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["members", token],
    queryFn: () => apiRequest<MemberRow[]>("/membership/members", { token }),
    enabled: Boolean(token),
  });

  return (
    <PageScreen title="Membership Roster" subtitle="Searchable club member list with status filters.">
      <section className="page-section">
        <h2 className="page-section__title">Members</h2>
        {isLoading ? <div className="notice">Loading members...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Batch</th>
              <th>Year</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => (
              <tr key={member._id}>
                <td>{member.studentId}</td>
                <td>{member.batch}</td>
                <td>{member.currentYear}</td>
                <td><span className="chip">{member.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}