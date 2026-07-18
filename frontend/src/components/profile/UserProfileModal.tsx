import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Award, 
  Calendar,
  Github,
  Linkedin,
  Twitter,
  Globe,
  Star,
  Shield,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserPosts, type ApiUser } from "../../lib/api";
import "./UserProfileModal.css";

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
}

// Extend ApiUser with Member info
interface ExtendedUser extends ApiUser {
  phone?: string;
  bio?: string;
  experience?: string;
  designation?: string;
  socialMedia?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  technicalSkills?: string[];
  member?: {
    studentId?: string;
    batch?: number;
    currentYear?: number;
    academicYearLevel?: string;
    ecExperience?: Array<{
      postName: string;
      startDate: string;
      endDate?: string;
      isCurrent: boolean;
    }>;
  };
}

export function UserProfileModal({ userId, isOpen, onClose, onStartChat }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"about" | "posts" | "activity">("about");

  // Fetch user details (you'll need to create this API endpoint)
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      // For now, mock the user data. You should create a getUserById API endpoint
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json() as Promise<ExtendedUser>;
    },
    enabled: isOpen && !!userId,
  });

  // Fetch user's posts
  const { data: postsData } = useQuery({
    queryKey: ["userPosts", userId],
    queryFn: () => getUserPosts(userId, { limit: 5 }),
    enabled: isOpen && activeTab === "posts",
  });

  const handleStartChat = () => {
    onStartChat(userId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="profile-modal-overlay" onClick={onClose}>
        <motion.div
          className="profile-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close Button */}
          <button className="profile-modal-close" onClick={onClose}>
            <X size={20} />
          </button>

          {userLoading ? (
            <div className="profile-loading">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          ) : user ? (
            <>
              {/* Profile Header */}
              <div className="profile-header">
                <div className="profile-cover"></div>
                <div className="profile-info-wrapper">
                  <div className="profile-avatar-large">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.firstName} />
                    ) : (
                      <span className="avatar-initials">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="profile-main-info">
                    <h2 className="profile-name">
                      {user.firstName} {user.lastName}
                    </h2>
                    {user.designation && (
                      <p className="profile-designation">
                        <Briefcase size={16} />
                        {user.designation}
                      </p>
                    )}
                    {user.member && (
                      <p className="profile-student-info">
                        <Users size={16} />
                        {user.member.studentId} • Batch {user.member.batch} • {user.member.academicYearLevel?.replace("_", " ")}
                      </p>
                    )}
                    <div className="profile-roles">
                      {user.roles.map((role) => (
                        <span key={role} className="role-badge">
                          {role === "System Admin" && <Shield size={12} />}
                          {role === "Moderator" && <Star size={12} />}
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button className="btn btn-primary" onClick={handleStartChat}>
                      <MessageCircle size={18} />
                      Message
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Tabs */}
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === "about" ? "active" : ""}`}
                  onClick={() => setActiveTab("about")}
                >
                  About
                </button>
                <button
                  className={`profile-tab ${activeTab === "posts" ? "active" : ""}`}
                  onClick={() => setActiveTab("posts")}
                >
                  Posts
                </button>
                <button
                  className={`profile-tab ${activeTab === "activity" ? "active" : ""}`}
                  onClick={() => setActiveTab("activity")}
                >
                  Activity
                </button>
              </div>

              {/* Profile Content */}
              <div className="profile-content">
                {activeTab === "about" && (
                  <div className="profile-about">
                    {/* Bio */}
                    {user.bio && (
                      <div className="profile-section">
                        <h3 className="section-title">Bio</h3>
                        <p className="bio-text">{user.bio}</p>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="profile-section">
                      <h3 className="section-title">Contact Information</h3>
                      <div className="info-list">
                        <div className="info-item">
                          <Mail size={18} />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="info-item">
                            <Phone size={18} />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Social Media */}
                    {user.socialMedia && Object.values(user.socialMedia).some(v => v) && (
                      <div className="profile-section">
                        <h3 className="section-title">Social Links</h3>
                        <div className="social-links">
                          {user.socialMedia.github && (
                            <a href={user.socialMedia.github} target="_blank" rel="noopener noreferrer" className="social-link">
                              <Github size={18} />
                              GitHub
                            </a>
                          )}
                          {user.socialMedia.linkedin && (
                            <a href={user.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
                              <Linkedin size={18} />
                              LinkedIn
                            </a>
                          )}
                          {user.socialMedia.twitter && (
                            <a href={user.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="social-link">
                              <Twitter size={18} />
                              Twitter
                            </a>
                          )}
                          {user.socialMedia.website && (
                            <a href={user.socialMedia.website} target="_blank" rel="noopener noreferrer" className="social-link">
                              <Globe size={18} />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {user.technicalSkills && user.technicalSkills.length > 0 && (
                      <div className="profile-section">
                        <h3 className="section-title">Technical Skills</h3>
                        <div className="skills-list">
                          {user.technicalSkills.map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EC Experience */}
                    {user.member?.ecExperience && user.member.ecExperience.length > 0 && (
                      <div className="profile-section">
                        <h3 className="section-title">
                          <Award size={18} />
                          Executive Committee Experience
                        </h3>
                        <div className="ec-experience-list">
                          {user.member.ecExperience.map((exp, index) => (
                            <div key={index} className="ec-experience-item">
                              <div className="ec-post-name">{exp.postName}</div>
                              <div className="ec-duration">
                                <Calendar size={14} />
                                {new Date(exp.startDate).toLocaleDateString()} - {exp.isCurrent ? "Present" : new Date(exp.endDate!).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "posts" && (
                  <div className="profile-posts">
                    {postsData?.posts.length === 0 ? (
                      <div className="empty-state">
                        <p>No posts yet</p>
                      </div>
                    ) : (
                      <div className="posts-preview">
                        {postsData?.posts.map((post) => (
                          <div key={post._id} className="post-preview-item">
                            <p className="post-preview-content">{post.content.substring(0, 150)}{post.content.length > 150 ? "..." : ""}</p>
                            <div className="post-preview-meta">
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{post.stats.totalLikes} likes</span>
                              <span>•</span>
                              <span>{post.stats.totalComments} comments</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="profile-activity">
                    <div className="empty-state">
                      <p>Activity timeline coming soon</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="profile-error">
              <p>Failed to load profile</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
