import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type PostRow = { _id: string; code: string; title: string; minYear: number; minEcYears: number; displayOrder: number; isActive: boolean };

export function EcPostsPage() {
  const { token, loading } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", title: "", minYear: 2, minEcYears: 0, displayOrder: 1, isActive: true });
  const [error, setError] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["ec-posts", token],
    queryFn: () => apiRequest<PostRow[]>("/governance/ec-posts", { token }),
    enabled: Boolean(token),
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest("/governance/ec-posts", { method: "POST", token, body: JSON.stringify(form) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ec-posts", token] });
      setForm({ code: "", title: "", minYear: 2, minEcYears: 0, displayOrder: 1, isActive: true });
      setError(null);
    },
    onError: (err) => setError(normalizeApiError(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="EC Post Catalog" subtitle="Dynamic post definitions and eligibility rules.">
      <section className="page-section">
        <h2 className="page-section__title">Create post</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Code</span><input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} required /></label>
          <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required /></label>
          <label className="field"><span>Minimum year</span><input type="number" value={form.minYear} onChange={(e) => setForm((current) => ({ ...current, minYear: Number(e.target.value) }))} /></label>
          <label className="field"><span>Minimum EC years</span><input type="number" value={form.minEcYears} onChange={(e) => setForm((current) => ({ ...current, minEcYears: Number(e.target.value) }))} /></label>
          <label className="field"><span>Display order</span><input type="number" value={form.displayOrder} onChange={(e) => setForm((current) => ({ ...current, displayOrder: Number(e.target.value) }))} /></label>
          <label className="field"><span>Active</span><select value={String(form.isActive)} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.value === "true" }))}><option value="true">Yes</option><option value="false">No</option></select></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save post"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>

      <section className="page-section">
        <h2 className="page-section__title">Post catalog</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Min year</th>
              <th>Min EC years</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((post) => (
              <tr key={post._id}>
                <td>{post.code}</td>
                <td>{post.title}</td>
                <td>{post.minYear}</td>
                <td>{post.minEcYears}</td>
                <td><span className="chip">{post.isActive ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageScreen>
  );
}