import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Mail,
  MapPin,
  Briefcase,
  Users,
  ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import "./ProfileHoverCard.css";

interface ProfileHoverCardProps {
  userId: string;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function ProfileHoverCard({
  userId,
  children,
  placement = "top",
  delay = 500,
}: ProfileHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Fetch user profile on hover
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsOpen(true);
    }, delay);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Delay closing to allow mouse to move to card
    setTimeout(() => setIsOpen(false), 300);
  };

  const handleCardMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsOpen(true);
  };

  const handleCardMouseLeave = () => {
    setIsOpen(false);
  };

  const handleViewProfile = () => {
    // Navigate to full profile modal or page
    navigate(`/dashboard/user/${userId}`);
  };

  const handleStartChat = () => {
    navigate(`/dashboard/chat/${userId}`);
    setIsOpen(false);
  };

  return (
    <div
      className="profile-hover-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`profile-hover-card placement-${placement}`}
            initial={{ opacity: 0, scale: 0.95, y: placement === "top" ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: placement === "top" ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          >
            {isLoading ? (
              <div className="hover-card-loading">
                <div className="spinner-small"></div>
              </div>
            ) : profile ? (
              <>
                {/* Profile Header */}
                <div className="hover-card-header">
                  <div className="hover-card-avatar">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.firstName} />
                    ) : (
                      <span>
                        {profile.firstName[0]}
                        {profile.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="hover-card-info">
                    <h4 className="hover-card-name">
                      {profile.firstName} {profile.lastName}
                    </h4>
                    {profile.designation && (
                      <p className="hover-card-designation">
                        <Briefcase size={12} />
                        {profile.designation}
                      </p>
                    )}
                    {profile.member && (
                      <p className="hover-card-student-info">
                        <Users size={12} />
                        {profile.member.studentId} • Batch {profile.member.batch}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="hover-card-bio">{profile.bio}</p>
                )}

                {/* Quick Info */}
                <div className="hover-card-quick-info">
                  {profile.email && (
                    <div className="quick-info-item">
                      <Mail size={14} />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile.member?.academicYearLevel && (
                    <div className="quick-info-item">
                      <MapPin size={14} />
                      <span>{profile.member.academicYearLevel.replace("_", " ")}</span>
                    </div>
                  )}
                </div>

                {/* Roles */}
                {profile.roles && profile.roles.length > 0 && (
                  <div className="hover-card-roles">
                    {profile.roles.slice(0, 3).map((role, index) => (
                      <span key={index} className="role-tag-small">
                        {role}
                      </span>
                    ))}
                    {profile.roles.length > 3 && (
                      <span className="role-tag-small">+{profile.roles.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="hover-card-actions">
                  {profile.privacySettings.allowDirectMessages && (
                    <button
                      className="hover-card-btn btn-primary"
                      onClick={handleStartChat}
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                  )}
                  <button
                    className="hover-card-btn btn-secondary"
                    onClick={handleViewProfile}
                  >
                    <ExternalLink size={16} />
                    View Profile
                  </button>
                </div>
              </>
            ) : (
              <div className="hover-card-error">
                <p>Unable to load profile</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
