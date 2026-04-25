import { useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Event = {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  eventDate: string;
  endDate?: string;
  venue: string;
  category: string;
  tags: string[];
  coverImage?: string;
  status: string;
  visibility: string;
  isFeatured: boolean;
  registrationRequired: boolean;
  registrationSettings?: {
    maxParticipants: number;
    registrationFee: number;
  };
  stats?: {
    totalRegistrations: number;
    totalAttendees: number;
    totalVolunteers: number;
    totalPosts: number;
    totalComments: number;
    totalFollowers: number;
  };
  speakers?: Array<{
    name: string;
    designation: string;
    organization?: string;
  }>;
  followers: string[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  volunteerProgram?: {
    applicationDeadline?: string;
    positions: Array<{
      name: string;
      slots: number;
      description: string;
    }>;
  };
};

type Post = {
  _id: string;
  content: string;
  images?: string[];
  isAnnouncement: boolean;
  authorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: string;
  stats: {
    totalComments: number;
  };
  comments: Array<{
    _id: string;
    content: string;
    authorId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
    createdAt: string;
  }>;
};

type VolunteerEligibility = {
  isEligible: boolean;
  reasons: string[];
  memberInfo: {
    studentId: string;
    batch: number;
    currentYear: number;
    status: string;
  } | null;
  existingApplication?: {
    status: string;
    appliedAt: string;
    assignedPosition?: string;
  };
  availablePositions?: Array<{
    name: string;
    slots: number;
    description: string;
  }>;
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showPostForm, setShowPostForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [postForm, setPostForm] = useState({
    content: "",
    images: [] as string[],
    isAnnouncement: false,
  });
  const [volunteerForm, setVolunteerForm] = useState({
    preferredPositions: [] as string[],
    availability: "",
    message: "",
  });
  const [commentForms, setCommentForms] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", id, token],
    queryFn: () => apiRequest<Event>(`/events/${id}`, { token }),
    enabled: Boolean(id && token),
  });

  // Fetch event feed (posts and comments)
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["event-feed", id, token],
    queryFn: () => apiRequest<Post[]>(`/events/${id}/feed`, { token }),
    enabled: Boolean(id && token),
  });

  // Check volunteer eligibility
  const { data: eligibility } = useQuery({
    queryKey: ["volunteer-eligibility", id, token],
    queryFn: () => apiRequest<VolunteerEligibility>(`/events/${id}/volunteer-eligibility`, { token }),
    enabled: Boolean(id && token),
  });

  // Follow/Unfollow mutations
  const followMutation = useMutation({
    mutationFn: () => apiRequest(`/events/${id}/follow`, { method: "POST", token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setMessage({ type: "success", text: "Event followed successfully!" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest(`/events/${id}/follow`, { method: "DELETE", token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setMessage({ type: "success", text: "Event unfollowed" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/events/${id}/posts`, {
        method: "POST",
        token,
        body: JSON.stringify(postForm),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-feed", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setPostForm({ content: "", images: [], isAnnouncement: false });
      setShowPostForm(false);
      setMessage({ type: "success", text: "Post created successfully!" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/events/${id}/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-feed", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setCommentForms({});
      setMessage({ type: "success", text: "Comment added!" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  // Apply as volunteer mutation
  const applyVolunteerMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/events/${id}/volunteer-applications`, {
        method: "POST",
        token,
        body: JSON.stringify(volunteerForm),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-eligibility", id] });
      setVolunteerForm({ preferredPositions: [], availability: "", message: "" });
      setShowVolunteerForm(false);
      setMessage({ type: "success", text: "Volunteer application submitted!" });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  function handlePostSubmit(e: FormEvent) {
    e.preventDefault();
    if (!postForm.content.trim()) {
      setMessage({ type: "error", text: "Post content is required" });
      return;
    }
    createPostMutation.mutate();
  }

  function handleCommentSubmit(postId: string) {
    const content = commentForms[postId]?.trim();
    if (!content) return;
    createCommentMutation.mutate({ postId, content });
  }

  function handleVolunteerSubmit(e: FormEvent) {
    e.preventDefault();
    if (volunteerForm.preferredPositions.length === 0) {
      setMessage({ type: "error", text: "Please select at least one position" });
      return;
    }
    applyVolunteerMutation.mutate();
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const isFollowing = event?.followers?.includes(user?.id || "");
  const canPost = user?.roles.some((role) =>
    ["President", "Vice President", "General Secretary", "AGS (Organization)", "Moderator"].includes(role)
  ) || event?.createdBy._id === user?.id;

  if (eventLoading) {
    return (
      <PageScreen title="Loading..." subtitle="">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </PageScreen>
    );
  }

  if (!event) {
    return (
      <PageScreen title="Event Not Found" subtitle="">
        <div className="empty-state-modern">
          <div className="empty-icon">❌</div>
          <h3>Event not found</h3>
          <Link to="/dashboard/events" className="primary-button">
            Back to Events
          </Link>
        </div>
      </PageScreen>
    );
  }

  return (
    <PageScreen title={event.title} subtitle={event.shortDescription || ""}>
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      <div className="event-detail-layout">
        {/* Main Content */}
        <div className="event-detail-main">
          {/* Event Header */}
          {event.coverImage && (
            <div className="event-detail-cover">
              <img src={event.coverImage} alt={event.title} />
            </div>
          )}

          <div className="event-detail-header">
            <div className="event-detail-meta">
              <span className="category-badge">{event.category}</span>
              {event.isFeatured && <span className="featured-badge">⭐ Featured</span>}
              <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status.replace("_", " ")}</span>
            </div>

            <div className="event-detail-tags">
              {event.tags?.map((tag) => (
                <span key={tag} className="tag-badge">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Event Description */}
          <div className="event-detail-section">
            <h2>About This Event</h2>
            <p className="event-description">{event.description}</p>
          </div>

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="event-detail-section">
              <h2>Speakers</h2>
              <div className="speakers-grid">
                {event.speakers.map((speaker, idx) => (
                  <div key={idx} className="speaker-card">
                    <h4>{speaker.name}</h4>
                    <p>{speaker.designation}</p>
                    {speaker.organization && <p className="text-muted">{speaker.organization}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          <div className="event-detail-section">
            <div className="section-header">
              <h2>Updates & Announcements</h2>
              {canPost && (
                <button
                  className="secondary-button"
                  onClick={() => setShowPostForm(!showPostForm)}
                >
                  {showPostForm ? "Cancel" : "+ New Post"}
                </button>
              )}
            </div>

            {/* Post Form */}
            {showPostForm && (
              <form onSubmit={handlePostSubmit} className="post-form">
                <div className="post-form-header">
                  <div className="post-author-avatar">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.firstName} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user?.firstName[0]}{user?.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <strong>{user?.firstName} {user?.lastName}</strong>
                    <p className="text-muted">Posting as organizer</p>
                  </div>
                </div>

                <textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Share an update or announcement..."
                  rows={4}
                  maxLength={2000}
                  required
                />
                <small>{postForm.content.length}/2000 characters</small>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={postForm.isAnnouncement}
                    onChange={(e) => setPostForm((f) => ({ ...f, isAnnouncement: e.target.checked }))}
                  />
                  <span>Mark as important announcement (notify all followers)</span>
                </label>

                <div className="form-actions">
                  <button type="submit" className="primary-button" disabled={createPostMutation.isPending}>
                    {createPostMutation.isPending ? "Posting..." : "Post Update"}
                  </button>
                </div>
              </form>
            )}

            {/* Posts List */}
            {postsLoading && <div className="notice">Loading posts...</div>}

            {!postsLoading && posts.length === 0 && (
              <div className="empty-state-small">
                <p>No updates yet. Be the first to post!</p>
              </div>
            )}

            <div className="posts-list">
              {posts.map((post) => (
                <div key={post._id} className={`post-card ${post.isAnnouncement ? "announcement" : ""}`}>
                  {post.isAnnouncement && (
                    <div className="announcement-badge">📢 Important Announcement</div>
                  )}

                  <div className="post-header">
                    <div className="post-author">
                      <div className="post-author-avatar">
                        {post.authorId.avatarUrl ? (
                          <img src={post.authorId.avatarUrl} alt={post.authorId.firstName} />
                        ) : (
                          <div className="avatar-placeholder-small">
                            {post.authorId.firstName[0]}{post.authorId.lastName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong>{post.authorId.firstName} {post.authorId.lastName}</strong>
                        <p className="text-muted">{formatRelativeTime(post.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="post-content">
                    <p>{post.content}</p>
                  </div>

                  {post.images && post.images.length > 0 && (
                    <div className="post-images">
                      {post.images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Post image ${idx + 1}`} />
                      ))}
                    </div>
                  )}

                  <div className="post-stats">
                    <span>💬 {post.stats.totalComments} comments</span>
                  </div>

                  {/* Comments */}
                  <div className="comments-section">
                    {post.comments.map((comment) => (
                      <div key={comment._id} className="comment">
                        <div className="comment-avatar">
                          {comment.authorId.avatarUrl ? (
                            <img src={comment.authorId.avatarUrl} alt={comment.authorId.firstName} />
                          ) : (
                            <div className="avatar-placeholder-tiny">
                              {comment.authorId.firstName[0]}{comment.authorId.lastName[0]}
                            </div>
                          )}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <strong>{comment.authorId.firstName} {comment.authorId.lastName}</strong>
                            <span className="text-muted">{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p>{comment.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Comment Form */}
                    <div className="comment-form">
                      <div className="comment-avatar">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.firstName} />
                        ) : (
                          <div className="avatar-placeholder-tiny">
                            {user?.firstName[0]}{user?.lastName[0]}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentForms[post._id] || ""}
                        onChange={(e) =>
                          setCommentForms((f) => ({ ...f, [post._id]: e.target.value }))
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit(post._id);
                          }
                        }}
                      />
                      <button
                        className="icon-button"
                        onClick={() => handleCommentSubmit(post._id)}
                        disabled={!commentForms[post._id]?.trim()}
                      >
                        ➤
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="event-detail-sidebar">
          {/* Event Info Card */}
          <div className="sidebar-card">
            <h3>Event Details</h3>
            <div className="event-info-list">
              <div className="info-item">
                <span className="info-icon">📅</span>
                <div>
                  <strong>Date & Time</strong>
                  <p>{formatDate(event.eventDate)}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📍</span>
                <div>
                  <strong>Venue</strong>
                  <p>{event.venue}</p>
                </div>
              </div>
              {event.registrationRequired && (
                <div className="info-item">
                  <span className="info-icon">💰</span>
                  <div>
                    <strong>Registration Fee</strong>
                    <p>
                      {event.registrationSettings?.registrationFee
                        ? `৳${event.registrationSettings.registrationFee}`
                        : "Free"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="sidebar-card">
            <h3>Statistics</h3>
            <div className="stats-list">
              <div className="stat-row">
                <span>👥 Followers</span>
                <strong>{event.stats?.totalFollowers || 0}</strong>
              </div>
              <div className="stat-row">
                <span>📝 Registrations</span>
                <strong>{event.stats?.totalRegistrations || 0}</strong>
              </div>
              <div className="stat-row">
                <span>🙋 Volunteers</span>
                <strong>{event.stats?.totalVolunteers || 0}</strong>
              </div>
              <div className="stat-row">
                <span>💬 Posts</span>
                <strong>{event.stats?.totalPosts || 0}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sidebar-actions">
            {/* Registration Button */}
            {event.registrationRequired && (
              <button
                className="primary-button full-width"
                onClick={() => navigate(`/dashboard/events/${event._id}/register`)}
                style={{ background: '#3b82f6', borderColor: '#3b82f6', marginBottom: '0.75rem' }}
              >
                📝 Register for Event
              </button>
            )}

            {eligibility?.isEligible && !showVolunteerForm && (
              <button
                className="primary-button full-width"
                onClick={() => setShowVolunteerForm(true)}
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                🙋 Apply as Volunteer
              </button>
            )}

            {isFollowing ? (
              <button
                className="secondary-button full-width"
                onClick={() => unfollowMutation.mutate()}
                disabled={unfollowMutation.isPending}
              >
                {unfollowMutation.isPending ? "Unfollowing..." : "✓ Following"}
              </button>
            ) : (
              <button
                className="primary-button full-width"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {followMutation.isPending ? "Following..." : "+ Follow Event"}
              </button>
            )}

            {eligibility?.existingApplication && (
              <div className="info" style={{ marginTop: "1rem" }}>
                <strong>Your Application:</strong>
                <p>Status: {eligibility.existingApplication.status}</p>
                {eligibility.existingApplication.assignedPosition && (
                  <p>Position: {eligibility.existingApplication.assignedPosition}</p>
                )}
              </div>
            )}
          </div>

          {/* Volunteer Application Form */}
          {showVolunteerForm && eligibility?.isEligible && (
            <div className="sidebar-card volunteer-highlight">
              <h3>🙋 Volunteer Application</h3>
              <form onSubmit={handleVolunteerSubmit}>
                <label className="field">
                  <span>Preferred Positions *</span>
                  {(!eligibility.availablePositions || eligibility.availablePositions.length === 0) ? (
                    <div className="info" style={{ marginTop: '0.5rem' }}>
                      No volunteer positions available for this event yet. Please check back later.
                    </div>
                  ) : (
                    eligibility.availablePositions.map((pos) => (
                      <label key={pos.name} className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={volunteerForm.preferredPositions.includes(pos.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVolunteerForm((f) => ({
                                ...f,
                                preferredPositions: [...f.preferredPositions, pos.name],
                              }));
                            } else {
                              setVolunteerForm((f) => ({
                                ...f,
                                preferredPositions: f.preferredPositions.filter((p) => p !== pos.name),
                              }));
                            }
                          }}
                        />
                        <span>
                          {pos.name} ({pos.slots} slots)
                          {pos.description && <small style={{ display: 'block', marginTop: '0.25rem' }}>{pos.description}</small>}
                        </span>
                      </label>
                    ))
                  )}
                </label>

                {eligibility.availablePositions && eligibility.availablePositions.length > 0 && (
                  <>
                    <label className="field">
                      <span>Availability</span>
                      <textarea
                        value={volunteerForm.availability}
                        onChange={(e) => setVolunteerForm((f) => ({ ...f, availability: e.target.value }))}
                        placeholder="When are you available?"
                        rows={2}
                      />
                    </label>

                    <label className="field">
                      <span>Message (Optional)</span>
                      <textarea
                        value={volunteerForm.message}
                        onChange={(e) => setVolunteerForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Why do you want to volunteer?"
                        rows={3}
                      />
                    </label>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setShowVolunteerForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={applyVolunteerMutation.isPending}
                      >
                        {applyVolunteerMutation.isPending ? "Submitting..." : "Submit Application"}
                      </button>
                    </div>
                  </>
                )}

                {(!eligibility.availablePositions || eligibility.availablePositions.length === 0) && (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowVolunteerForm(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Organizer Card */}
          <div className="sidebar-card">
            <h3>Organized By</h3>
            <div className="organizer-info">
              <div className="organizer-avatar">
                {event.createdBy.avatarUrl ? (
                  <img src={event.createdBy.avatarUrl} alt={event.createdBy.firstName} />
                ) : (
                  <div className="avatar-placeholder">
                    {event.createdBy.firstName[0]}{event.createdBy.lastName[0]}
                  </div>
                )}
              </div>
              <div>
                <strong>{event.createdBy.firstName} {event.createdBy.lastName}</strong>
                <p className="text-muted">Event Organizer</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageScreen>
  );
}
