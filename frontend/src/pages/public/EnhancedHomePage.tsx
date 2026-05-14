import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  BookOpen, 
  Lightbulb,
  Target,
  Heart,
  Trophy,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { ImageSlider } from "../../components/home/ImageSlider";
import { LeadershipMessage } from "../../components/home/LeadershipMessage";
import { StatsCounter } from "../../components/home/StatsCounter";
import { NewsCard } from "../../components/home/NewsCard";
import { usePublishedHomepageMessages } from "../../hooks/useHomepageMessages";

export function EnhancedHomePage() {
  const { user } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ["public-events"],
    queryFn: () => apiRequest<Array<{ 
      _id: string; 
      title: string; 
      eventDate: string; 
      venue: string; 
      status: string;
      description?: string;
    }>>("/events"),
  });

  // Fetch dynamic leadership messages
  const { data: leadershipMessages = [], isLoading: isLoadingMessages } = usePublishedHomepageMessages("Leadership");

  // Fallback leadership messages if no dynamic messages are available
  const fallbackLeadershipMessages = [
    {
      name: "Prof. Dr. Mohammad Mahfuzul Islam",
      title: "Chief Patron",
      designation: "Chairman, Department of CSE, University of Dhaka",
      message: "The CSEDU Students' Club represents the spirit of innovation and collaboration that defines our department. I am proud to see our students taking initiative in organizing events, workshops, and activities that enrich their academic journey and contribute to the broader community. This platform not only develops technical skills but also nurtures leadership, teamwork, and social responsibility.",
      imageUrl: ""
    },
    {
      name: "Dr. Md. Abdur Razzaque",
      title: "Moderator",
      designation: "Student Advisor, Department of CSE",
      message: "As moderator of the CSEDU Students' Club, I have witnessed firsthand the dedication and enthusiasm of our students. The club serves as a bridge between academic learning and practical application, providing opportunities for students to showcase their talents, learn from each other, and build lasting connections. I encourage all students to actively participate and make the most of this platform.",
      imageUrl: ""
    },
    {
      name: "Md. Rakibul Hasan",
      title: "President",
      designation: "CSEDU Students' Club 2024",
      message: "It is an honor to serve as President of the CSEDU Students' Club. Our mission is to create an inclusive environment where every member can thrive, learn, and contribute. This year, we are focused on organizing impactful events, fostering innovation, and strengthening our community bonds. Together, we will continue the legacy of excellence and make meaningful contributions to our department and society.",
      imageUrl: ""
    },
    {
      name: "Fatema Tuz Johora",
      title: "General Secretary",
      designation: "CSEDU Students' Club 2024",
      message: "As General Secretary, my goal is to ensure smooth coordination of all club activities and maintain transparent communication among members. We are committed to organizing diverse events that cater to different interests - from technical workshops to cultural festivals. I invite all members to actively participate, share ideas, and help us build a stronger, more vibrant club community.",
      imageUrl: ""
    }
  ];

  // Use dynamic messages if available, otherwise use fallback
  const displayMessages = leadershipMessages.length > 0 
    ? leadershipMessages.map(msg => ({
        name: msg.authorName,
        title: msg.authorTitle,
        designation: msg.authorDesignation,
        message: msg.message,
        imageUrl: msg.authorImageUrl
      }))
    : fallbackLeadershipMessages;

  // Hero Slider Data
  const heroSlides = [
    {
      id: "1",
      imageUrl: "/images/cseduStudentCLubLogo.png",
      title: "Welcome to CSEDU Students' Club",
      description: "Fostering innovation, leadership, and community engagement in Computer Science and Engineering",
      link: "/about"
    },
    {
      id: "2",
      imageUrl: "/images/csedu_logo.png",
      title: "Department of Computer Science and Engineering",
      description: "University of Dhaka - Leading the way in technology education and research",
      link: "/about"
    },
    {
      id: "3",
      imageUrl: "/images/du_logo.png",
      title: "University of Dhaka",
      description: "Be part of a vibrant community of innovators, leaders, and changemakers",
      link: "/auth/register"
    },
    {
      id: "4",
      imageUrl: "/images/cseduStudentCLubLogo.png",
      title: "Events & Activities",
      description: "Participate in workshops, seminars, cultural programs, and technical competitions",
      link: "/events"
    }
  ];

  // Statistics Data
  const stats = [
    { label: "Active Members", value: 500, suffix: "+", icon: <Users size={32} /> },
    { label: "Events This Year", value: 25, suffix: "+", icon: <Calendar size={32} /> },
    { label: "Workshops Conducted", value: 15, suffix: "+", icon: <BookOpen size={32} /> },
    { label: "Awards Won", value: 10, suffix: "+", icon: <Trophy size={32} /> }
  ];

  // Latest News/Updates
  const latestNews = [
    {
      title: "Annual Programming Contest 2024 Announced",
      excerpt: "Registration is now open for our flagship programming competition. Join us for an exciting day of problem-solving and innovation.",
      date: "2024-01-15",
      author: "EC Team",
      category: "Competition",
      link: "/events"
    },
    {
      title: "Workshop on Machine Learning Fundamentals",
      excerpt: "Learn the basics of ML from industry experts. Free for all CSEDU students. Limited seats available.",
      date: "2024-01-10",
      author: "Secretary (Seminars)",
      category: "Workshop",
      link: "/events"
    },
    {
      title: "Pohela Boishakh Celebration 1431",
      excerpt: "Join us for a grand celebration of Bengali New Year with cultural programs, food stalls, and traditional games.",
      date: "2024-01-05",
      author: "Secretary (Cultural)",
      category: "Cultural",
      link: "/events"
    }
  ];

  return (
    <div className="enhanced-homepage">
      {/* Hero Slider Section */}
      <section className="hero-section">
        <ImageSlider slides={heroSlides} autoPlayInterval={5000} />
      </section>

      {/* Welcome Section */}
      <section className="welcome-section">
        <div className="container">
          <div className="welcome-content">
            <div className="welcome-text">
              <p className="eyebrow">
                <Sparkles size={16} />
                About CSEDUSC
              </p>
              <h2 className="section-title">
                Innovation; Better Nation
              </h2>
              <p className="section-description">
                The CSEDU Students' Club has been constituted with the approval of the Academic Committee 
                of the Department of Computer Science and Engineering, University of Dhaka. Our mission is 
                to provide students with an organized platform for academic enrichment, leadership development, 
                and community engagement.
              </p>
              <div className="welcome-features">
                <div className="feature-item">
                  <Target size={24} />
                  <div>
                    <h4>Our Mission</h4>
                    <p>Fostering holistic growth through structured co-curricular and extra-curricular activities</p>
                  </div>
                </div>
                <div className="feature-item">
                  <Lightbulb size={24} />
                  <div>
                    <h4>Innovation First</h4>
                    <p>Encouraging new ideas and creative solutions to real-world problems</p>
                  </div>
                </div>
                <div className="feature-item">
                  <Heart size={24} />
                  <div>
                    <h4>Community Impact</h4>
                    <p>Contributing to the betterment of our nation through technology and service</p>
                  </div>
                </div>
              </div>
              <div className="button-row" style={{ marginTop: 24 }}>
                {user ? (
                  <>
                    <Link className="primary-button" to="/dashboard/home">
                      Go to Dashboard
                    </Link>
                    <Link className="secondary-button" to="/events">
                      Browse Events
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="primary-button" to="/auth/register">
                      Become a Member
                    </Link>
                    <Link className="secondary-button" to="/auth/login">
                      Member Login
                    </Link>
                  </>
                )}
                <Link className="secondary-button" to="/constitution">
                  Read Constitution
                </Link>
              </div>
            </div>
            <div className="welcome-image">
              <img 
                src="/images/hudai.png" 
                alt="CSEDU Students" 
                className="welcome-img"
              />
              <div className="welcome-badge">
                <Award size={32} />
                <div>
                  <strong>Excellence</strong>
                  <span>Since 2010</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="container">
          <div className="section-header-center">
            <p className="eyebrow">
              <TrendingUp size={16} />
              Our Impact
            </p>
            <h2 className="section-title">By The Numbers</h2>
            <p className="section-description">
              Our achievements and milestones that showcase the vibrant community we've built
            </p>
          </div>
          <StatsCounter stats={stats} />
        </div>
      </section>

      {/* Leadership Messages Section */}
      <section className="leadership-section">
        <div className="container">
          <div className="section-header-center">
            <p className="eyebrow">Leadership</p>
            <h2 className="section-title">Messages from Our Leaders</h2>
            <p className="section-description">
              Words of wisdom and guidance from those who lead and inspire us
            </p>
          </div>
          {isLoadingMessages ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading leadership messages...</p>
            </div>
          ) : (
            <div className="leadership-grid">
              {displayMessages.map((message, index) => (
                <LeadershipMessage key={index} {...message} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="events-section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">
                <Calendar size={16} />
                What's Happening
              </p>
              <h2 className="section-title">Upcoming Events</h2>
            </div>
            <Link className="secondary-button" to="/events">
              View All Events
            </Link>
          </div>
          <div className="events-grid">
            {events.slice(0, 3).map((event) => (
              <article key={event._id} className="event-card-enhanced">
                <div className="event-card-enhanced__header">
                  <span className="event-card-enhanced__date">
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                  <span className={`chip ${event.status === "Published" ? "chip--success" : ""}`}>
                    {event.status}
                  </span>
                </div>
                <h3 className="event-card-enhanced__title">{event.title}</h3>
                <p className="event-card-enhanced__venue">
                  <span>📍</span> {event.venue}
                </p>
                {event.description && (
                  <p className="event-card-enhanced__description">
                    {event.description.slice(0, 100)}...
                  </p>
                )}
                <Link className="event-card-enhanced__link" to={`/events/${event._id}`}>
                  Learn More →
                </Link>
              </article>
            ))}
          </div>
          {events.length === 0 && (
            <div className="empty-state">
              No upcoming events at the moment. Check back soon!
            </div>
          )}
        </div>
      </section>

      {/* Latest News Section */}
      <section className="news-section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">Updates</p>
              <h2 className="section-title">Latest News & Announcements</h2>
            </div>
            <Link className="secondary-button" to="/notices">
              All Notices
            </Link>
          </div>
          <div className="news-grid">
            {latestNews.map((news, index) => (
              <NewsCard key={index} {...news} />
            ))}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="activities-section">
        <div className="container">
          <div className="section-header-center">
            <p className="eyebrow">What We Do</p>
            <h2 className="section-title">Our Activities</h2>
            <p className="section-description">
              As per our constitution, we organize diverse activities throughout the year
            </p>
          </div>
          <div className="activities-grid">
            <div className="activity-card">
              <div className="activity-card__icon">🎓</div>
              <h3>Technical Workshops</h3>
              <p>Hands-on training sessions on latest technologies, programming languages, and industry tools</p>
            </div>
            <div className="activity-card">
              <div className="activity-card__icon">🎨</div>
              <h3>Cultural Programs</h3>
              <p>Pohela Boishakh celebrations, cultural festivals, and artistic events throughout the year</p>
            </div>
            <div className="activity-card">
              <div className="activity-card__icon">💼</div>
              <h3>Career Counseling</h3>
              <p>Higher study seminars, career guidance sessions, and industry interaction programs</p>
            </div>
            <div className="activity-card">
              <div className="activity-card__icon">🏆</div>
              <h3>Competitions</h3>
              <p>Programming contests, hackathons, and inter-department competitive events</p>
            </div>
            <div className="activity-card">
              <div className="activity-card__icon">⚽</div>
              <h3>Sports & Games</h3>
              <p>Indoor games tournaments, football, cricket, basketball, and recreational activities</p>
            </div>
            <div className="activity-card">
              <div className="activity-card__icon">❤️</div>
              <h3>Philanthropic Work</h3>
              <p>Community service initiatives and social welfare programs for the greater good</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Join Our Community?</h2>
            <p className="cta-description">
              Become a part of CSEDU Students' Club and unlock opportunities for growth, 
              learning, and making a difference. Whether you're interested in technology, 
              culture, sports, or community service, there's a place for you here.
            </p>
            <div className="button-row" style={{ justifyContent: "center" }}>
              {user ? (
                <>
                  <Link className="primary-button" to="/dashboard/home">
                    Go to Dashboard
                  </Link>
                  <Link className="secondary-button" to="/dashboard/profile">
                    View Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link className="primary-button" to="/auth/register">
                    Register Now
                  </Link>
                  <Link className="secondary-button" to="/about">
                    Learn More
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer Info Section */}
      <section className="footer-info-section">
        <div className="container">
          <div className="footer-info-grid">
            <div className="footer-info-item">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/constitution">Constitution</Link></li>
                <li><Link to="/events">Events</Link></li>
                <li><Link to="/notices">Notices</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div className="footer-info-item">
              <h4>For Members</h4>
              <ul>
                <li><Link to="/auth/login">Member Login</Link></li>
                <li><Link to="/auth/register">Registration</Link></li>
                <li><Link to="/dashboard/certificates">Certificates</Link></li>
                <li><Link to="/dashboard/profile">My Profile</Link></li>
              </ul>
            </div>
            <div className="footer-info-item">
              <h4>Contact Information</h4>
              <p>Department of Computer Science and Engineering</p>
              <p>University of Dhaka</p>
              <p>Dhaka-1000, Bangladesh</p>
              <p>Email: csedusc@du.ac.bd</p>
            </div>
            <div className="footer-info-item">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a href="https://facebook.com/csedusc" target="_blank" rel="noopener noreferrer" className="social-link">
                  Facebook
                </a>
                <a href="https://twitter.com/csedusc" target="_blank" rel="noopener noreferrer" className="social-link">
                  Twitter
                </a>
                <a href="https://linkedin.com/company/csedusc" target="_blank" rel="noopener noreferrer" className="social-link">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
