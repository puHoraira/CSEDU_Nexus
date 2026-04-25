import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
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
  };
  speakers?: Array<{
    name: string;
    designation: string;
  }>;
};

export function EnhancedEventsPage() {
  const { user, token } = useAuth();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState({
    search: "",
    category: "all",
    status: "all",
    timeFilter: "all", // upcoming, past, today
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", token],
    queryFn: () => apiRequest<Event[]>("/events", { token }),
  });

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower) ||
          e.venue.toLowerCase().includes(searchLower) ||
          e.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filter.category !== "all") {
      filtered = filtered.filter((e) => e.category === filter.category);
    }

    // Status filter
    if (filter.status !== "all") {
      filtered = filtered.filter((e) => e.status === filter.status);
    }

    // Time filter
    const now = new Date();
    if (filter.timeFilter === "upcoming") {
      filtered = filtered.filter((e) => new Date(e.eventDate) > now);
    } else if (filter.timeFilter === "past") {
      filtered = filtered.filter((e) => new Date(e.endDate || e.eventDate) < now);
    } else if (filter.timeFilter === "today") {
      const today = now.toDateString();
      filtered = filtered.filter((e) => new Date(e.eventDate).toDateString() === today);
    }

    // Sort: Featured first, then by date
    return filtered.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });
  }, [events, filter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: events.length,
      upcoming: events.filter((e) => new Date(e.eventDate) > now).length,
      ongoing: events.filter((e) => e.status === "Ongoing").length,
      completed: events.filter((e) => e.status === "Completed").length,
      featured: events.filter((e) => e.isFeatured).length,
    };
  }, [events]);

  const canCreate = user?.roles.some((role) =>
    ["President", "Vice President", "General Secretary", "AGS (Organization)", "Moderator"].includes(role)
  );

  const categories = ["Workshop", "Seminar", "Competition", "Social", "Cultural", "Sports", "Academic", "Networking"];

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function getEventStatus(event: Event) {
    const now = new Date();
    const eventDate = new Date(event.eventDate);
    const endDate = event.endDate ? new Date(event.endDate) : eventDate;

    if (event.status === "Cancelled") return { label: "Cancelled", color: "red" };
    if (event.status === "Completed") return { label: "Completed", color: "gray" };
    if (now >= eventDate && now <= endDate) return { label: "Ongoing", color: "green" };
    if (now < eventDate) return { label: "Upcoming", color: "blue" };
    return { label: "Past", color: "gray" };
  }

  return (
    <PageScreen
      title="Events"
      subtitle="Discover, register, and participate in club events, workshops, and competitions."
    >
      {/* Header with Stats */}
      <div className="events-header">
        <div className="events-stats-grid">
          <div className="stat-card-modern">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <span className="stat-label">Total Events</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">🔜</div>
            <div className="stat-content">
              <span className="stat-label">Upcoming</span>
              <span className="stat-value">{stats.upcoming}</span>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">▶️</div>
            <div className="stat-content">
              <span className="stat-label">Ongoing</span>
              <span className="stat-value">{stats.ongoing}</span>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats.completed}</span>
            </div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <span className="stat-label">Featured</span>
              <span className="stat-value">{stats.featured}</span>
            </div>
          </div>
        </div>

        {canCreate && (
          <Link to="/dashboard/events/create" className="primary-button create-event-btn">
            <span>+</span> Create Event
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="events-filters">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search events..."
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={filter.category}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filter.timeFilter}
            onChange={(e) => setFilter((f) => ({ ...f, timeFilter: e.target.value }))}
          >
            <option value="all">All Time</option>
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="past">Past</option>
          </select>

          <select
            className="filter-select"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">All Status</option>
            <option value="Planned">Planned</option>
            <option value="Registration_Open">Registration Open</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${view === "grid" ? "active" : ""}`}
            onClick={() => setView("grid")}
            title="Grid View"
          >
            ⊞
          </button>
          <button
            className={`view-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            title="List View"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredEvents.length === 0 && (
        <div className="empty-state-modern">
          <div className="empty-icon">📭</div>
          <h3>No events found</h3>
          <p>Try adjusting your filters or search query</p>
          {canCreate && (
            <Link to="/dashboard/events/create" className="primary-button">
              Create First Event
            </Link>
          )}
        </div>
      )}

      {/* Events Grid/List */}
      {!isLoading && filteredEvents.length > 0 && (
        <div className={view === "grid" ? "events-grid" : "events-list"}>
          {filteredEvents.map((event) => {
            const status = getEventStatus(event);
            return (
              <div
                key={event._id}
                className={`event-card-modern ${view === "list" ? "list-view" : ""}`}
              >
                {event.isFeatured && <div className="featured-badge">⭐ Featured</div>}

                {event.coverImage && (
                  <div className="event-image">
                    <img src={event.coverImage} alt={event.title} />
                    <div className={`event-status-badge ${status.color}`}>{status.label}</div>
                  </div>
                )}

                <div className="event-content">
                  <div className="event-header">
                    <div>
                      <h3 className="event-title">{event.title}</h3>
                      <p className="event-category">
                        <span className="category-badge">{event.category}</span>
                        {event.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="tag-badge">
                            #{tag}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  <p className="event-description">
                    {event.shortDescription || event.description?.substring(0, 120) + "..."}
                  </p>

                  <div className="event-meta">
                    <div className="meta-item">
                      <span className="meta-icon">📅</span>
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">📍</span>
                      <span>{event.venue}</span>
                    </div>
                    {event.registrationRequired && (
                      <div className="meta-item">
                        <span className="meta-icon">👥</span>
                        <span>
                          {event.stats?.totalRegistrations || 0}
                          {event.registrationSettings?.maxParticipants
                            ? `/${event.registrationSettings.maxParticipants}`
                            : ""}{" "}
                          registered
                        </span>
                      </div>
                    )}
                  </div>

                  {event.speakers && event.speakers.length > 0 && (
                    <div className="event-speakers">
                      <span className="speakers-label">Speakers:</span>
                      {event.speakers.slice(0, 2).map((speaker, idx) => (
                        <span key={idx} className="speaker-name">
                          {speaker.name}
                        </span>
                      ))}
                      {event.speakers.length > 2 && (
                        <span className="speaker-more">+{event.speakers.length - 2} more</span>
                      )}
                    </div>
                  )}

                  <div className="event-footer">
                    {event.registrationRequired && event.registrationSettings?.registrationFee ? (
                      <span className="event-price">৳{event.registrationSettings.registrationFee}</span>
                    ) : (
                      <span className="event-price free">Free</span>
                    )}
                    <Link to={`/dashboard/events/${event._id}`} className="event-action-btn">
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {!isLoading && filteredEvents.length > 0 && (
        <div className="results-count">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      )}
    </PageScreen>
  );
}
