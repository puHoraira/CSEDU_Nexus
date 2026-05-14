import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type ConstitutionArticleInput = {
  articleNo: string;
  title: string;
  content: string;
  imageUrl: string;
  order: number;
};

type ConstitutionDoc = {
  _id?: string;
  title: string;
  logoImageUrl?: string;
  preamble?: string;
  content?: string;
  version: number;
  status: "Active" | "Archived";
  changeNote?: string;
  updatedAt: string;
  articles?: ConstitutionArticleInput[];
};

type TabKey = "live" | "compose" | "history";

function normalizeArticles(source: ConstitutionArticleInput[] | undefined): ConstitutionArticleInput[] {
  const items = source || [];
  return [...items]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item, index) => ({
      articleNo: item.articleNo || `Article ${index + 1}`,
      title: item.title || "",
      content: item.content || "",
      imageUrl: item.imageUrl || "",
      order: item.order || index + 1,
    }));
}

function combineArticleHeading(articleNo: string, title: string) {
  const label = articleNo.trim();
  const articleTitle = title.trim();
  if (label && articleTitle) return `${label}. ${articleTitle}`;
  if (label) return label;
  return articleTitle;
}

function splitArticleHeading(rawHeading: string) {
  const value = rawHeading.trim();
  if (!value) return { articleNo: "", title: "" };

  const match = value.match(/^(.+?)[\.:\-\–\—]\s*(.+)$/);
  if (match) {
    return { articleNo: match[1].trim(), title: match[2].trim() };
  }

  const segments = value.split(/\s+/);
  if (segments.length <= 1) {
    return { articleNo: value, title: "" };
  }

  return { articleNo: segments.slice(0, 2).join(" "), title: segments.slice(2).join(" ") };
}

export function ModeratorConstitutionEditorPage() {
  const { token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("live");
  const [constitutionTitle, setConstitutionTitle] = useState("Constitution of CSEDU Students' Club");
  const [constitutionLogoImageUrl, setConstitutionLogoImageUrl] = useState("");
  const [constitutionPreamble, setConstitutionPreamble] = useState("");
  const [constitutionArticles, setConstitutionArticles] = useState<ConstitutionArticleInput[]>([
    { articleNo: "Article I", title: "", content: "", imageUrl: "", order: 1 },
  ]);
  const [constitutionChangeNote, setConstitutionChangeNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const constitutionQuery = useQuery({
    queryKey: ["moderator-constitution-editor-active", token],
    queryFn: () => apiRequest<ConstitutionDoc | null>("/governance/constitution", { token }),
    enabled: Boolean(token),
  });

  const constitutionVersionsQuery = useQuery({
    queryKey: ["moderator-constitution-editor-versions", token],
    queryFn: () => apiRequest<ConstitutionDoc[]>("/governance/constitution/versions", { token }),
    enabled: Boolean(token),
  });

  const constitutionSaveMutation = useMutation({
    mutationFn: () =>
      apiRequest("/governance/constitution", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: constitutionTitle,
          logoImageUrl: constitutionLogoImageUrl,
          preamble: constitutionPreamble,
          articles: constitutionArticles
            .map((item, index) => ({
              articleNo: item.articleNo.trim(),
              title: item.title.trim(),
              content: item.content.trim(),
              imageUrl: item.imageUrl.trim(),
              order: index + 1,
            }))
            .filter((item) => item.title && item.content),
          changeNote: constitutionChangeNote,
        }),
      }),
    onSuccess: async () => {
      setMessage("New constitution version published.");
      setConstitutionChangeNote("");
      await constitutionQuery.refetch();
      await constitutionVersionsQuery.refetch();
      setActiveTab("history");
    },
    onError: (error) => setMessage(normalizeApiError(error)),
  });

  useEffect(() => {
    const current = constitutionQuery.data;
    if (!current) return;

    setConstitutionTitle(current.title || "Constitution of CSEDU Students' Club");
    setConstitutionLogoImageUrl(current.logoImageUrl || "");
    setConstitutionPreamble(current.preamble || "");
    setConstitutionArticles(
      current.articles && current.articles.length > 0
        ? normalizeArticles(current.articles)
        : [{ articleNo: "Article I", title: "", content: "", imageUrl: "", order: 1 }]
    );
  }, [constitutionQuery.data]);

  function loadCurrentConstitutionToEditor() {
    const current = constitutionQuery.data;
    if (!current) return;
    setConstitutionTitle(current.title || "Constitution of CSEDU Students' Club");
    setConstitutionLogoImageUrl(current.logoImageUrl || "");
    setConstitutionPreamble(current.preamble || "");
    setConstitutionArticles(
      current.articles && current.articles.length > 0
        ? normalizeArticles(current.articles)
        : [{ articleNo: "Article I", title: "", content: "", imageUrl: "", order: 1 }]
    );
    setConstitutionChangeNote("");
    setActiveTab("compose");
  }

  function addConstitutionArticle() {
    setActiveTab("compose");
    setConstitutionArticles((prev) => [
      ...prev,
      {
        articleNo: `Article ${prev.length + 1}`,
        title: "",
        content: "",
        imageUrl: "",
        order: prev.length + 1,
      },
    ]);
  }

  function removeConstitutionArticle(index: number) {
    setConstitutionArticles((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, newIndex) => ({ ...item, order: newIndex + 1 }));
    });
  }

  function updateConstitutionArticle(index: number, field: keyof ConstitutionArticleInput, value: string) {
    setConstitutionArticles((prev) =>
      prev.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function updateArticleHeading(index: number, rawHeading: string) {
    const nextHeading = splitArticleHeading(rawHeading);
    setConstitutionArticles((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, articleNo: nextHeading.articleNo, title: nextHeading.title } : item
      )
    );
  }

  const liveConstitution = constitutionQuery.data;
  const activeVersions = constitutionVersionsQuery.data || [];
  const hasPublishableArticle = constitutionArticles.some(
    (item) => item.title.trim().length > 0 && item.content.trim().length > 0
  );
  const articleCount = useMemo(() => constitutionArticles.filter((item) => item.title.trim() && item.content.trim()).length, [constitutionArticles]);

  return (
    <PageScreen
      title="Constitution Management"
      subtitle="The primary legal framework governing the Department of Computer Science and Engineering club. Use this interface to manage, propose, and audit legislative adjustments."
    >
      <section className="constitution-manager-shell">
        <div className="constitution-manager-main">
          <header className="constitution-hero">
            <div>
              <p className="constitution-hero__eyebrow">Legislative Workspace</p>
              <h2>Constitution Management</h2>
              <p>
                Manage the preamble separately, edit each article one by one, and publish updates without leaving the
                moderator workspace.
              </p>
            </div>
            <div className="constitution-metric-card">
              <span>Annual amendment limit</span>
              <strong>0 / 1 changes</strong>
              <small>Demo placeholder, fully dynamic editor below.</small>
            </div>
          </header>

          <div className="constitution-tabs" role="tablist" aria-label="Constitution sections">
            <button className={activeTab === "live" ? "is-active" : ""} type="button" onClick={() => setActiveTab("live")}>
              Live Constitution
            </button>
            <button className={activeTab === "compose" ? "is-active" : ""} type="button" onClick={() => setActiveTab("compose")}>
              Propose Changes
            </button>
            <button className={activeTab === "history" ? "is-active" : ""} type="button" onClick={() => setActiveTab("history")}>
              Change History
            </button>
          </div>

          {activeTab === "live" ? (
            <div className="constitution-live-grid">
              <div className="constitution-panel">
                <div className="constitution-section-header">
                  <div>
                    <p className="constitution-section-header__eyebrow">Live Constitution</p>
                    <h3>{liveConstitution?.title || constitutionTitle}</h3>
                  </div>
                  <Link className="constitution-inline-action" to="/constitution">
                    Open public view
                  </Link>
                </div>

                {liveConstitution?.logoImageUrl ? (
                  <div className="constitution-logo-block">
                    <img src={liveConstitution.logoImageUrl} alt="Official logo" />
                  </div>
                ) : null}

                {liveConstitution?.preamble ? (
                  <article className="constitution-block constitution-preamble-block">
                    <div className="constitution-block__head">
                      <span>The Preamble</span>
                      <Link className="constitution-inline-action" to="/dashboard/governance/constitution-editor">
                        Edit preamble
                      </Link>
                    </div>
                    <p>{liveConstitution.preamble}</p>
                  </article>
                ) : (
                  <div className="constitution-empty-block">No preamble has been published yet.</div>
                )}

                <div className="constitution-article-list">
                  {(liveConstitution?.articles || []).map((article, index) => (
                    <article className="constitution-article-card" key={`${article.articleNo || "article"}-${index}`}>
                      <div className="constitution-article-card__header">
                        <div>
                          <span className="constitution-article-card__label">{article.articleNo || `Article ${index + 1}`}</span>
                          <h4>{article.title}</h4>
                        </div>
                        <Link className="constitution-inline-action" to="/dashboard/governance/constitution-editor">
                          Edit
                        </Link>
                      </div>
                      {article.imageUrl ? <img className="constitution-article-card__image" src={article.imageUrl} alt={article.title} /> : null}
                      <p>{article.content}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="constitution-sidebar">
                <div className="constitution-rail-card constitution-rail-card--dark">
                  <p className="constitution-rail-card__eyebrow">Amendment Proposal</p>
                  <h3>Workflow</h3>
                  <div className="constitution-rail-step is-complete">
                    <span />
                    <div>
                      <strong>Drafting Stage</strong>
                      <p>Write preamble and article blocks separately.</p>
                    </div>
                  </div>
                  <div className="constitution-rail-step is-active">
                    <span />
                    <div>
                      <strong>Moderator Review</strong>
                      <p>Validate wording, images, and section order.</p>
                    </div>
                  </div>
                  <div className="constitution-rail-step">
                    <span />
                    <div>
                      <strong>Publish Update</strong>
                      <p>Save a new constitutional version with audit log.</p>
                    </div>
                  </div>
                  <button className="primary-button primary-button--wide" type="button" onClick={() => setActiveTab("compose")}>
                    Start Editing
                  </button>
                </div>

                <div className="constitution-rail-card">
                  <p className="constitution-rail-card__eyebrow">Quick Actions</p>
                  <div className="button-stack">
                    <button className="secondary-button" type="button" onClick={loadCurrentConstitutionToEditor}>
                      Load current active constitution
                    </button>
                    <button className="secondary-button" type="button" onClick={addConstitutionArticle}>
                      Add another article
                    </button>
                    <Link className="secondary-button" to="/constitution">
                      Public preview
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {activeTab === "compose" ? (
            <div className="constitution-compose-layout">
              <form
                className="constitution-editor-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  constitutionSaveMutation.mutate();
                }}
              >
                <section className="constitution-form-card">
                  <div className="constitution-section-header">
                    <div>
                      <p className="constitution-section-header__eyebrow">General</p>
                      <h3>Constitution identity</h3>
                    </div>
                  </div>
                  <label className="field">
                    <span>Constitution title</span>
                    <input value={constitutionTitle} onChange={(e) => setConstitutionTitle(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Official logo image URL</span>
                    <input
                      value={constitutionLogoImageUrl}
                      onChange={(e) => setConstitutionLogoImageUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </label>
                  {constitutionLogoImageUrl ? (
                    <img className="constitution-logo-preview" src={constitutionLogoImageUrl} alt="Logo preview" />
                  ) : null}
                </section>

                <section className="constitution-form-card constitution-form-card--preamble">
                  <div className="constitution-section-header">
                    <div>
                      <p className="constitution-section-header__eyebrow">Section 1</p>
                      <h3>Preamble</h3>
                    </div>
                    <span className="constitution-badge">Separate section</span>
                  </div>
                  <label className="field">
                    <span>Write the PREAMBLE here</span>
                    <textarea
                      value={constitutionPreamble}
                      onChange={(e) => setConstitutionPreamble(e.target.value)}
                      placeholder="Write the preamble text here..."
                      style={{ minHeight: 180 }}
                    />
                  </label>
                </section>

                <section className="constitution-form-card constitution-form-card--articles">
                  <div className="constitution-section-header">
                    <div>
                      <p className="constitution-section-header__eyebrow">Sections</p>
                      <h3>Articles</h3>
                    </div>
                    <button className="secondary-button" type="button" onClick={addConstitutionArticle}>
                      Add article
                    </button>
                  </div>

                  <div className="constitution-article-editor-list">
                    {constitutionArticles.map((article, index) => (
                      <article className="constitution-article-editor" key={`constitution-editor-article-${index}`}>
                        <div className="constitution-article-editor__header">
                          <div>
                            <span className="constitution-article-card__label">Article {index + 1}</span>
                            <h4>{combineArticleHeading(article.articleNo, article.title) || "Untitled article"}</h4>
                          </div>
                          <button className="mini-button" type="button" onClick={() => removeConstitutionArticle(index)} disabled={constitutionArticles.length <= 1}>
                            Remove
                          </button>
                        </div>

                        <div className="constitution-article-title-box">
                          <label className="field constitution-article-title-box__title">
                            <span>Article heading</span>
                            <input
                              value={combineArticleHeading(article.articleNo, article.title)}
                              onChange={(e) => updateArticleHeading(index, e.target.value)}
                              placeholder="ARTICLE III. PURPOSE:"
                            />
                          </label>
                        </div>

                        <div className="form-grid form-grid--compact">
                          <label className="field" style={{ gridColumn: "1 / -1" }}>
                            <span>Article content</span>
                            <textarea
                              value={article.content}
                              onChange={(e) => updateConstitutionArticle(index, "content", e.target.value)}
                              placeholder="Write article details here..."
                              style={{ minHeight: 160 }}
                            />
                          </label>
                          <label className="field" style={{ gridColumn: "1 / -1" }}>
                            <span>Article image URL</span>
                            <input
                              value={article.imageUrl}
                              onChange={(e) => updateConstitutionArticle(index, "imageUrl", e.target.value)}
                              placeholder="https://example.com/article-image.png"
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="constitution-form-card constitution-form-card--submit">
                  <div className="constitution-section-header">
                    <div>
                      <p className="constitution-section-header__eyebrow">Publish</p>
                      <h3>Change note</h3>
                    </div>
                  </div>
                  <label className="field">
                    <span>Change note</span>
                    <input
                      value={constitutionChangeNote}
                      onChange={(e) => setConstitutionChangeNote(e.target.value)}
                      placeholder="Example: Updated ARTICLE II Logo & Motto"
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" type="submit" disabled={constitutionSaveMutation.isPending || !hasPublishableArticle}>
                      {constitutionSaveMutation.isPending ? "Publishing..." : `Publish constitution (${articleCount} articles)`}
                    </button>
                    <button className="secondary-button" type="button" onClick={loadCurrentConstitutionToEditor}>
                      Reset from live version
                    </button>
                  </div>
                  {message ? <div className="notice">{message}</div> : null}
                </section>
              </form>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <section className="constitution-history-panel">
              <div className="constitution-section-header">
                <div>
                  <p className="constitution-section-header__eyebrow">Change History</p>
                  <h3>Published versions</h3>
                </div>
                <button className="secondary-button" type="button" onClick={() => constitutionVersionsQuery.refetch()}>
                  Refresh history
                </button>
              </div>

              <div className="constitution-history-list">
                {activeVersions.length === 0 ? (
                  <div className="empty-state">No constitution versions published yet.</div>
                ) : (
                  activeVersions.map((item) => (
                    <article className="constitution-history-card" key={item._id || `${item.version}-${item.updatedAt}`}>
                      <div>
                        <span className="constitution-history-card__version">Version {item.version}</span>
                        <h4>{item.title}</h4>
                      </div>
                      <div className="constitution-history-card__meta">
                        <span className="chip">{item.status}</span>
                        <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</span>
                      </div>
                      <p>{item.changeNote || "No change note provided."}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="constitution-sidebar constitution-sidebar--sticky">
          <div className="constitution-rail-card constitution-rail-card--dark">
            <p className="constitution-rail-card__eyebrow">Current Snapshot</p>
            <h3>{liveConstitution?.title || constitutionTitle}</h3>
            <div className="constitution-rail-stats">
              <div>
                <span>Version</span>
                <strong>{liveConstitution?.version || 0}</strong>
              </div>
              <div>
                <span>Articles</span>
                <strong>{liveConstitution?.articles?.length || 0}</strong>
              </div>
            </div>
            <p>{liveConstitution?.changeNote || "No active change note yet."}</p>
            <button className="primary-button primary-button--wide" type="button" onClick={loadCurrentConstitutionToEditor}>
              Edit current constitution
            </button>
          </div>

          <div className="constitution-rail-card">
            <p className="constitution-rail-card__eyebrow">Editor Tips</p>
            <ul className="constitution-tip-list">
              <li>Preamble should come before all articles.</li>
              <li>Use direct image URLs for logo and article images.</li>
              <li>Keep ARTICLE labels consistent for cleaner rendering.</li>
            </ul>
          </div>
        </aside>
      </section>
    </PageScreen>
  );
}
