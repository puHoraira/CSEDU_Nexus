import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Award, Calendar, CheckCircle, Clock, TrendingUp, Users, Briefcase, Star } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { StatsCard } from '../../components/ui/StatsCard';
import { formatDate } from '../../lib/utils';

type EcExperience = {
  termId?: { _id: string; name: string; startsOn: string; endsOn: string };
  postId?: { _id: string; title: string; code: string };
  postName: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  performanceRating: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs_Improvement' | 'Not_Rated';
  achievements: string[];
  responsibilities: string[];
  eventsOrganized: number;
  meetingsAttended: number;
  totalMeetings: number;
};

type MemberProfile = {
  _id: string;
  studentId: string;
  currentYear: number;
  ecExperience: EcExperience[];
  clubParticipation?: {
    eventsParticipated: number;
    eventsOrganized: number;
    volunteerHours: number;
  };
};

const RATING_CFG: Record<string, { color: string; label: string; variant: 'success' | 'info' | 'warning' | 'error' | 'neutral' }> = {
  Excellent: { color: '#10b981', label: 'Excellent', variant: 'success' },
  Good: { color: '#3b82f6', label: 'Good', variant: 'info' },
  Satisfactory: { color: '#f59e0b', label: 'Satisfactory', variant: 'warning' },
  Needs_Improvement: { color: '#ef4444', label: 'Needs Improvement', variant: 'error' },
  Not_Rated: { color: '#6b7280', label: 'Not Rated', variant: 'neutral' },
};

export function MyEcExperiencePage() {
  const { token } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-ec-profile', token],
    queryFn: () => apiRequest<{ membership: MemberProfile }>('/auth/me', { token }),
    enabled: Boolean(token),
  });

  if (isLoading) {
    return (
      <div className="ui-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  const member = profile?.membership;
  if (!member) {
    return (
      <div className="ui-page">
        <EmptyState icon={Users} title="Member profile not found" description="Unable to load your EC experience data" />
      </div>
    );
  }

  const ecExperience = member.ecExperience || [];
  const currentRoles = ecExperience.filter(exp => exp.isCurrent);
  const pastRoles = ecExperience.filter(exp => !exp.isCurrent);
  
  // Calculate unique terms served
  const uniqueTerms = new Set(ecExperience.map(exp => exp.termId?._id).filter(Boolean));
  const yearsServed = uniqueTerms.size;

  // Calculate total events organized
  const totalEventsOrganized = ecExperience.reduce((sum, exp) => sum + (exp.eventsOrganized || 0), 0);

  // Calculate total meetings
  const totalMeetingsAttended = ecExperience.reduce((sum, exp) => sum + (exp.meetingsAttended || 0), 0);
  const totalMeetings = ecExperience.reduce((sum, exp) => sum + (exp.totalMeetings || 0), 0);
  const attendanceRate = totalMeetings > 0 ? Math.round((totalMeetingsAttended / totalMeetings) * 100) : 0;

  return (
    <div className="ui-page">
      <PageHeader
        title="My EC Experience"
        description="Your leadership journey and contributions to the club"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/home' },
          { label: 'My EC Experience' },
        ]}
      />

      {/* Stats Overview */}
      <div className="ui-grid-4">
        <StatsCard 
          title="Years Served" 
          value={yearsServed} 
          icon={Calendar} 
          color="primary"
          subtitle={`${ecExperience.length} ${ecExperience.length === 1 ? 'position' : 'positions'}`}
        />
        <StatsCard 
          title="Events Organized" 
          value={totalEventsOrganized} 
          icon={Award} 
          color="success"
        />
        <StatsCard 
          title="Meeting Attendance" 
          value={`${attendanceRate}%`} 
          icon={CheckCircle} 
          color="info"
          subtitle={`${totalMeetingsAttended}/${totalMeetings} meetings`}
        />
        <StatsCard 
          title="Current Roles" 
          value={currentRoles.length} 
          icon={Briefcase} 
          color="warning"
        />
      </div>

      {/* Current Roles */}
      {currentRoles.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Star size={20} style={{ color: '#f59e0b' }} /> Current Positions
            </h3>
            <Badge variant="success">{currentRoles.length} active</Badge>
          </div>
          <div className="ui-card__body">
            <div style={{ display: 'grid', gap: 16 }}>
              {currentRoles.map((exp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative circles */}
                  <div style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    filter: 'blur(20px)',
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{exp.postName}</h4>
                        {exp.termId && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                            {exp.termId.name}
                          </p>
                        )}
                      </div>
                      <Badge style={{ background: '#10b981', color: '#fff', fontWeight: 600 }}>
                        Active
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.85rem', marginTop: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} /> Started {formatDate(exp.startDate)}
                      </span>
                      {exp.eventsOrganized > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Award size={14} /> {exp.eventsOrganized} events
                        </span>
                      )}
                      {exp.totalMeetings > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} /> {exp.meetingsAttended}/{exp.totalMeetings} meetings
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Roles */}
      {pastRoles.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Clock size={20} /> Past Positions
            </h3>
            <Badge variant="neutral">{pastRoles.length} completed</Badge>
          </div>
          <div className="ui-card__body">
            <div style={{ display: 'grid', gap: 16 }}>
              {pastRoles.map((exp, index) => {
                const ratingCfg = RATING_CFG[exp.performanceRating] || RATING_CFG.Not_Rated;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      padding: 20,
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                          {exp.postName}
                        </h4>
                        {exp.termId && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                            {exp.termId.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={ratingCfg.variant}>{ratingCfg.label}</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Duration
                        </p>
                        <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                          {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : 'Present'}
                        </p>
                      </div>

                      {exp.eventsOrganized > 0 && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Events
                          </p>
                          <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                            {exp.eventsOrganized} organized
                          </p>
                        </div>
                      )}

                      {exp.totalMeetings > 0 && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border)' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Meetings
                          </p>
                          <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                            {exp.meetingsAttended}/{exp.totalMeetings}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Achievements */}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                          Achievements
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.82rem', color: 'var(--muted)' }}>
                          {exp.achievements.map((achievement, i) => (
                            <li key={i}>{achievement}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Responsibilities */}
                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                          Responsibilities
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {exp.responsibilities.map((resp, i) => (
                            <Badge key={i} variant="neutral" style={{ fontSize: '0.75rem' }}>
                              {resp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {ecExperience.length === 0 && (
        <div className="ui-card">
          <EmptyState
            icon={Briefcase}
            title="No EC Experience Yet"
            description="You haven't served in any EC positions yet. Participate in elections to join the Executive Committee and gain leadership experience!"
          />
        </div>
      )}

      {/* Club Participation */}
      {member.clubParticipation && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <TrendingUp size={20} /> Overall Club Participation
            </h3>
          </div>
          <div className="ui-card__body">
            <div className="ui-grid-3">
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>
                  {member.clubParticipation.eventsParticipated || 0}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Events Participated
                </p>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
                  {member.clubParticipation.eventsOrganized || 0}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Events Organized
                </p>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                  {member.clubParticipation.volunteerHours || 0}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Volunteer Hours
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
