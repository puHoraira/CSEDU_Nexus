import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type EventRow = {
  _id: string;
  title: string;
  description?: string;
  eventDate: string;
  venue: string;
  status: string;
  budget?: number;
  createdBy?: { firstName?: string; lastName?: string; email?: string };
};

type FeedAuthor = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type EventFeedComment = {
  _id: string;
  content: string;
  createdAt: string;
  authorId?: FeedAuthor;
};

type EventFeedPost = {
  _id: string;
  content: string;
  createdAt: string;
  authorId?: FeedAuthor;
  comments: EventFeedComment[];
};

const GENERAL_APPLICANT_ROLES = ["General Member", "Executive Member"];
const EVENT_MANAGER_ROLES = ["President", "Vice President", "General Secretary", "AGS (Organization)"];

export function EventDetailsPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState("Volunteer");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [volunteerMessage, setVolunteerMessage] = useState<string | null>(null);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail-public", id],
    queryFn: () => apiRequest<EventRow>(`/events/${id}`),
    enabled: hasValidId,
    retry: false,
  });

  const { data: feed, isLoading: isFeedLoading } = useQuery({
    queryKey: ["event-feed", id],
    queryFn: () => apiRequest<EventFeedPost[]>(`/events/${id}/feed`),
    enabled: hasValidId,
    retry: false,
  });

  const canApply = Boolean(user?.roles.some((item) => GENERAL_APPLICANT_ROLES.includes(item)));
  const canManage = Boolean(user?.roles.some((item) => EVENT_MANAGER_ROLES.includes(item)));
  const hasAccount = Boolean(user);
  const isParticipationLocked = hasAccount && !canApply;
  const userRoles = user?.roles || [];
  const roleLabel = userRoles.length > 0 ? userRoles.join(", ") : "Guest";
  const heroStats = useMemo(
    () => [
      { label: "Venue", value: event?.venue || "-" },
      { label: "Date", value: event ? new Date(event.eventDate).toLocaleString() : "-" },
      { label: "Status", value: event?.status || "-" },
    ],
    [event]
  );

  const applyMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/events/${id}/volunteer-applications`, {
        method: "POST",
        token,
        body: JSON.stringify({ role, message: applicationMessage.trim() }),
      }),
    onSuccess: async () => {
      setVolunteerMessage("Your volunteer application has been submitted.");
      setApplicationMessage("");
      await queryClient.invalidateQueries({ queryKey: ["event-detail-public", id] });
    },
    onError: (error) => setVolunteerMessage(normalizeApiError(error)),
  });

  const createPostMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/events/${id}/posts`, {
        method: "POST",
        token,
        body: JSON.stringify({ content: postContent }),
      }),
    onSuccess: async () => {
      setPostMessage("Update posted successfully.");
      setPostContent("");
      await queryClient.invalidateQueries({ queryKey: ["event-feed", id] });
    },
    onError: (error) => setPostMessage(normalizeApiError(error)),
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/events/${id}/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      }),
    onSuccess: async (_result, variables) => {
      setCommentMessage("Comment added.");
      setCommentDrafts((current) => ({ ...current, [variables.postId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["event-feed", id] });
    },
    onError: (error) => setCommentMessage(normalizeApiError(error)),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyMutation.mutate();
  }

  function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = postContent.trim();
    if (!trimmed) {
      setPostMessage("Write an update before posting.");
      return;
    }
    if (trimmed.length < 3) {
      setPostMessage("Update must be at least 3 characters long.");
      return;
    }
    if (trimmed.length > 2000) {
      setPostMessage("Update cannot exceed 2000 characters.");
      return;
    }
    createPostMutation.mutate();
  }

  function handleCommentSubmit(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const content = (commentDrafts[postId] || "").trim();
    if (!content) {
      setCommentMessage("Comment cannot be empty.");
      return;
    }
    if (content.length > 1200) {
      setCommentMessage("Comment cannot exceed 1200 characters.");
      return;
    }
    commentMutation.mutate({ postId, content });
  }

  function handleCommentDraftChange(postId: string, value: string) {
    setCommentDrafts((current) => ({ ...current, [postId]: value }));
  }

  function getAuthorName(author?: FeedAuthor) {
    const name = `${author?.firstName || ""} ${author?.lastName || ""}`.trim();
    return name || author?.email || "Unknown member";
  }

  return (
    <PageScreen title="Event Details" subtitle="Public event information and volunteer entry point.">
      {isLoading ? <div className="notice">Loading event...</div> : null}
      {!hasValidId ? (
        <div className="empty-state">Invalid event link.</div>
      ) : null}
      {!isLoading && hasValidId && !event ? <div className="empty-state">Event not found. It may have been removed.</div> : null}

      {hasValidId && event ? (
        <div className="event-detail-layout">
          <section className="event-detail-main page-section">
            <div className="constitution-section-header">
              <div>
                <p className="constitution-section-header__eyebrow">Public Event</p>
                <h2 className="page-section__title" style={{ fontSize: "1.8rem" }}>{event.title}</h2>
              </div>
              <span className="chip">{event.status}</span>
            </div>

            <div className="grid-3" style={{ marginBottom: 18 }}>
              {heroStats.map((item) => (
                <div className="stat-card" key={item.label}>
                  <h3>{item.label}</h3>
                  <strong style={{ fontSize: "1rem" }}>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="constitution-article-card">
              <h3 className="constitution-article-heading">About this event</h3>
              <p className="constitution-article-text">{event.description || "No description provided."}</p>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <p><strong>Organized by:</strong> {event.createdBy ? `${event.createdBy.firstName || ""} ${event.createdBy.lastName || ""}` : "-"}</p>
              <p><strong>Budget:</strong> ৳{event.budget ?? 0}</p>
            </div>

            <section className="event-feed-card" aria-label="Event updates and comments">
              <div className="event-feed-card__header">
                <h3>Event Updates & Comments</h3>
                <p>All posts and member comments for this event.</p>
              </div>

              {user ? (
                <form className="event-feed-compose" onSubmit={handlePostSubmit}>
                  <label className="field">
                    <span>Post an update</span>
                    <textarea
                      rows={3}
                      placeholder="Share an update for participants..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" type="submit" disabled={createPostMutation.isPending}>
                      {createPostMutation.isPending ? "Posting..." : "Post update"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="empty-state">Login to post updates and comments.</div>
              )}

              {postMessage ? <div className="notice">{postMessage}</div> : null}
              {commentMessage ? <div className="notice">{commentMessage}</div> : null}

              {isFeedLoading ? <div className="notice">Loading updates...</div> : null}
              {!isFeedLoading && (!feed || feed.length === 0) ? (
                <div className="empty-state">No updates posted yet for this event.</div>
              ) : null}

              <div className="event-feed-list">
                {(feed || []).map((post) => (
                  <article className="event-post" key={post._id}>
                    <header className="event-post__header">
                      <strong>{getAuthorName(post.authorId)}</strong>
                      <small>{new Date(post.createdAt).toLocaleString()}</small>
                    </header>
                    <p className="event-post__content">{post.content}</p>

                    <div className="event-comment-list">
                      {post.comments.length === 0 ? (
                        <p className="event-comment-list__empty">No comments yet.</p>
                      ) : (
                        post.comments.map((comment) => (
                          <div className="event-comment" key={comment._id}>
                            <p>{comment.content}</p>
                            <small>
                              {getAuthorName(comment.authorId)} • {new Date(comment.createdAt).toLocaleString()}
                            </small>
                          </div>
                        ))
                      )}
                    </div>

                    {user ? (
                      <form className="event-comment-form" onSubmit={(e) => handleCommentSubmit(e, post._id)}>
                        <input
                          placeholder="Write a comment"
                          value={commentDrafts[post._id] || ""}
                          onChange={(e) => handleCommentDraftChange(post._id, e.target.value)}
                        />
                        <button
                          className="secondary-button"
                          type="submit"
                          disabled={commentMutation.isPending && commentMutation.variables?.postId === post._id}
                        >
                          {commentMutation.isPending && commentMutation.variables?.postId === post._id
                            ? "Adding..."
                            : "Comment"}
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="event-detail-side">
            <section className="event-participation-hub">
              <p className="constitution-rail-card__eyebrow">Participation Hub</p>
              <h3>Join the event team</h3>
              <div className="event-participation-hub__meta">
                <span className="chip">Role: {roleLabel}</span>
                <span className="chip">Event: {event.status}</span>
              </div>

              {!hasAccount ? (
                <div className="button-stack">
                  <p>Sign in with a General or Executive Member account to volunteer.</p>
                  <Link className="primary-button primary-button--wide" to="/auth/login">
                    Login to Participate
                  </Link>
                </div>
              ) : null}

              {hasAccount && canApply ? (
                <form className="form-grid" onSubmit={handleSubmit}>
                  <label className="field">
                    <span>Preferred role</span>
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Volunteer" />
                  </label>
                  <label className="field">
                    <span>Why do you want to join?</span>
                    <textarea
                      rows={3}
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      placeholder="Share a short motivation for this event team."
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button primary-button--wide" type="submit" disabled={applyMutation.isPending}>
                      {applyMutation.isPending ? "Submitting..." : "Apply as Volunteer"}
                    </button>
                  </div>
                </form>
              ) : null}

              {isParticipationLocked ? (
                <div className="event-participation-hub__locked">
                  Your role does not allow volunteer application from this page.
                </div>
              ) : null}

              {volunteerMessage ? <div className="notice" style={{ marginTop: 10 }}>{volunteerMessage}</div> : null}
            </section>

            {canManage ? (
              <section className="event-manager-card">
                <p className="constitution-rail-card__eyebrow">Manager Controls</p>
                <h3>Volunteer Review Workspace</h3>
                <p>Open the manager dashboard to approve, reject, and track all volunteer applications for this event.</p>
                <Link className="secondary-button" to={`/dashboard/events/${event._id}/volunteers`}>
                  Open Review Dashboard
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}
    </PageScreen>
  );
}
