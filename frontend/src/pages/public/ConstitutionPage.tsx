import { PageScreen } from "../../components/ui/PageScreen";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

type ConstitutionDoc = {
  title: string;
  logoImageUrl?: string;
  preamble?: string;
  content?: string;
  articles?: Array<{
    articleNo?: string;
    title: string;
    content: string;
    imageUrl?: string;
    order?: number;
  }>;
  version: number;
  changeNote?: string;
  updatedAt: string;
  updatedBy?: { firstName?: string; lastName?: string; email?: string };
};

export function ConstitutionPage() {
  const { user } = useAuth();
  const isModerator = Boolean(user?.roles?.includes("Moderator"));

  const { data, isLoading } = useQuery({
    queryKey: ["constitution-active"],
    queryFn: () => apiRequest<ConstitutionDoc | null>("/governance/constitution"),
  });

  return (
    <PageScreen title="Constitution" subtitle="Browse articles and governance rules.">
      {isLoading ? <div className="notice">Loading constitution...</div> : null}
      {!data ? (
        <div className="empty-state">No constitution published yet. Moderator can add one from moderator panel.</div>
      ) : (
        <section className="page-section constitution-sheet constitution-classic-layout">
          {isModerator ? (
            <Link className="constitution-corner-edit" to="/dashboard/governance/constitution-editor">
              Edit
            </Link>
          ) : null}
          <h2 className="page-section__title">{data.title}</h2>
          <p className="muted-inline">
            Version {data.version} | Updated {new Date(data.updatedAt).toLocaleString()}
            {data.updatedBy ? ` by ${data.updatedBy.firstName || ""} ${data.updatedBy.lastName || ""}` : ""}
          </p>
          {data.logoImageUrl ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ marginTop: 0, marginBottom: 10 }}><strong>Official Logo</strong></p>
              <img src={data.logoImageUrl} alt="CSEDUSC Official Logo" style={{ maxWidth: 220, borderRadius: 12 }} />
            </div>
          ) : null}
          {data.changeNote ? <p><strong>Change note:</strong> {data.changeNote}</p> : null}
          <div className="constitution-content-flow">
            {data.preamble ? (
              <article className="constitution-article-card constitution-preamble-card">
                <h3 className="constitution-article-heading">PREAMBLE</h3>
                <p className="constitution-article-text">{data.preamble}</p>
              </article>
            ) : null}

            {(data.articles || []).length > 0 ? (
              <div className="constitution-articles-wrap">
                <div className="constitution-articles-intro">
                  <h3 className="constitution-article-heading">ARTICLES OF GOVERNANCE</h3>
                </div>
                <div className="stack constitution-articles-stack">
                  {(data.articles || []).map((article, index) => (
                    <article key={`${article.articleNo || "A"}-${index}`} className="constitution-article-card">
                      <h3 className="constitution-article-heading">
                        {article.articleNo ? `${article.articleNo}: ${article.title}` : article.title}
                      </h3>
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={`${article.title} illustration`}
                          style={{ maxWidth: 260, borderRadius: 10, marginBottom: 8, display: "block" }}
                        />
                      ) : null}
                      <p className="constitution-article-text">{article.content}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="constitution-body">{data.content || ""}</pre>
            )}
          </div>
        </section>
      )}
    </PageScreen>
  );
}