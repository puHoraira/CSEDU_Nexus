import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

export function EventCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", eventDate: "", venue: "", budget: 0 });
  const [error, setError] = useState<string | null>(null);

  function formatValidationMessage(err: unknown) {
    const message = normalizeApiError(err);
    if (message === "Validation failed" && err && typeof err === "object" && "details" in err) {
      const details = (err as { details?: Array<{ path?: string; message?: string }> }).details || [];
      const summary = details
        .map((item) => `${item.path || "field"}: ${item.message || "invalid"}`)
        .join("; ");
      return summary ? `Validation failed: ${summary}` : message;
    }
    return message;
  }

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/events", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...form,
          eventDate: new Date(form.eventDate).toISOString(),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/dashboard/events");
    },
    onError: (err) => setError(formatValidationMessage(err)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <PageScreen title="Create Event" subtitle="Create a club event and define its budget and venue.">
      <section className="page-section">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required /></label>
          <label className="field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></label>
          <label className="field"><span>Date</span><input type="datetime-local" value={form.eventDate} onChange={(e) => setForm((current) => ({ ...current, eventDate: e.target.value }))} required /></label>
          <label className="field"><span>Venue</span><input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} required /></label>
          <label className="field"><span>Budget</span><input type="number" min={0} value={form.budget} onChange={(e) => setForm((current) => ({ ...current, budget: Number(e.target.value) }))} /></label>
          <div className="form-actions"><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create event"}</button></div>
        </form>
        {error ? <div className="alert">{error}</div> : null}
      </section>
    </PageScreen>
  );
}