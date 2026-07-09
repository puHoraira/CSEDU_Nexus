import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, MapPin, Users, DollarSign, Clock,
  CheckCircle, XCircle, Download, QrCode, Video,
  User2, Tag, Target, List, CreditCard, Bell, Image, Edit2
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { queryKeys, invalidateQueries } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Countdown } from '../../components/ui/Countdown';
import { formatDate, formatDateTime } from '../../lib/utils';
import { usePosterGenerator } from '../../hooks/usePosterGenerator';
import toast from 'react-hot-toast';

type Workshop = {
  _id: string; title: string; description: string; shortDescription?: string;
  startDate: string; endDate: string; venue: string; isOnline: boolean; onlineLink?: string;
  category: string; level: string; tags: string[];
  capacity: number; isFree: boolean; fee: number; coverImage?: string;
  status: string; requiresApproval: boolean; registrationDeadline?: string;
  speakers: Array<{ name: string; designation?: string; organization?: string; bio?: string; avatarUrl?: string }>;
  materials: Array<{ title: string; url: string; type: string }>;
  prerequisites: string[]; learningOutcomes: string[];
  stats: { totalRegistrations: number; totalApproved: number; totalAttendees: number };
  createdBy: { _id: string; firstName: string; lastName: string; avatarUrl?: string };
};

type Registration = {
  _id: string; status: string; paymentStatus: string; paymentRequired: boolean;
  paymentAmount: number; qrCodeData?: string; checkedIn: boolean; checkedInAt?: string;
  rejectionReason?: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral' | 'primary'> = {
  Pending:   'warning', Approved: 'success', Rejected: 'error',
  Waitlisted: 'neutral', Attended: 'success', Cancelled: 'error',
};

export function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const qc = useQueryClient();
  const { openPosterGenerator, PosterModal } = usePosterGenerator();
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });

  const { data: workshop, isLoading, refetch } = useQuery({
    queryKey: queryKeys.workshops.detail(id!, token ?? ''),
    queryFn: () => apiRequest<Workshop>(`/workshops/${id}`, { token }),
    enabled: Boolean(id),
    staleTime: 0, // Always refetch to avoid stale data
  });

  const { data: myReg, isLoading: regLoading } = useQuery({
    queryKey: queryKeys.workshops.myRegistration(id!, token ?? ''),
    queryFn: () => apiRequest<Registration | null>(`/workshops/${id}/my-registration`, { token }),
    enabled: Boolean(id && token),
  });

  const registerMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${id}/register`, { method: 'POST', token, body: JSON.stringify(regForm) }),
    onSuccess: (data) => {
      Promise.all(invalidateQueries.workshops.detail(qc, id!, token));
      setShowRegForm(false);
      
      // Show success message with seat assignment if available
      let successMsg = 'Registered successfully!';
      if (data?.seatAssignment?.roomId) {
        const roomInfo = data.seatAssignment;
        successMsg += ` Seat assigned: ${roomInfo.roomId.roomName} (Room ${roomInfo.roomId.roomNumber})`;
        if (roomInfo.seatNumber) {
          successMsg += `, Seat ${roomInfo.seatNumber}`;
        }
      }
      toast.success(successMsg, { duration: 5000 });
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const payMut = useMutation({
    mutationFn: () => apiRequest<{ paymentUrl: string }>(`/workshops/registrations/${myReg?._id}/pay`, { method: 'POST', token }),
    onSuccess: (data) => {
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.error('No payment URL received');
      }
    },
    onError: e => {
      const msg = normalizeApiError(e);
      // If gateway not configured, show helpful message
      if (msg.includes('not configured')) {
        toast.error('Payment gateway not configured. Add SSLCommerz credentials to backend .env');
      } else {
        toast.error(msg);
      }
    },
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}><Spinner size="xl" label="Loading workshop…" /></div>;
  if (!workshop) return <EmptyState icon={BookOpen} title="Workshop not found" action={<Button href="/dashboard/workshops">Back to Workshops</Button>} />;

  const spotsLeft = workshop.capacity - workshop.stats.totalRegistrations;
  const isFull    = spotsLeft <= 0;
  const isUpcoming = new Date(workshop.startDate) > new Date();
  
  // Check if registration deadline has passed
  // Use registrationDeadline if set, otherwise use endDate
  const deadline = workshop.registrationDeadline || workshop.endDate;
  const registrationDeadlinePassed = deadline 
    ? new Date() > new Date(deadline)
    : false;
  
  // Allow registration for Published, Registration_Open, and also Draft (for testing/preview)
  const canRegister = !['Cancelled', 'Completed', 'Registration_Closed'].includes(workshop.status) 
    && !isFull 
    && !registrationDeadlinePassed;
  const isManager = user?.roles.some(r => ['President', 'Vice President', 'General Secretary', 'AGS (Organization)', 'Moderator'].includes(r));
  const canEdit = isManager || workshop.createdBy._id === user?.id;

  // Pre-fill form with user data
  const handleOpenRegForm = () => {
    setRegForm({
      name:  user ? `${user.firstName} ${user.lastName}` : '',
      email: user?.email || '',
      phone: '',
    });
    setShowRegForm(true);
  };

  return (
    <div className="ui-page">
      <PageHeader
        title={workshop.title}
        description={workshop.shortDescription}
        backButton
        breadcrumbs={[{ label: 'Workshops', href: '/dashboard/workshops' }, { label: workshop.title }]}
        actions={canEdit && (
          <Button variant="outline" leftIcon={Edit2} href={`/dashboard/workshops/${id}/edit`}>
            Edit Workshop
          </Button>
        )}
      />

      {/* Hero */}
      {workshop.coverImage && (
        <div style={{ position: 'relative', height: 280, borderRadius: 20, overflow: 'hidden' }}>
          <img src={workshop.coverImage} alt={workshop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }} />
          <div style={{ position: 'absolute', bottom: 18, left: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="primary">{workshop.category}</Badge>
            <Badge variant="neutral">{workshop.level}</Badge>
            {workshop.isOnline && <Badge variant="primary" icon={Video}>Online</Badge>}
            {workshop.isFree ? <Badge variant="success">Free</Badge> : <Badge variant="warning">৳{workshop.fee}</Badge>}
          </div>
        </div>
      )}

      {/* Countdown */}
      {isUpcoming && <Countdown targetDate={workshop.startDate} label="Workshop starts in" />}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 20, alignItems: 'start' }}>
        {/* ── Main ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* About */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">About This Workshop</h3></div>
            <div className="ui-card__body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{workshop.description}</p>
            </div>
          </div>

          {/* Learning Outcomes */}
          {workshop.learningOutcomes.length > 0 && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={17} style={{ color: 'var(--accent)' }} /> What You'll Learn
                </h3>
              </div>
              <div className="ui-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {workshop.learningOutcomes.map((o, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {workshop.prerequisites.length > 0 && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <List size={17} style={{ color: 'var(--accent)' }} /> Prerequisites
                </h3>
              </div>
              <div className="ui-card__body">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {workshop.prerequisites.map((p, i) => (
                    <li key={i} style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: 6 }}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Speakers */}
          {workshop.speakers.length > 0 && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User2 size={17} style={{ color: 'var(--accent)' }} /> Speakers & Instructors
                </h3>
              </div>
              <div className="ui-card__body">
                <div className="ui-grid-2">
                  {workshop.speakers.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                        background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                      }}>
                        {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{s.name}</p>
                        {s.designation && <p className="ui-text-xs ui-text-muted">{s.designation}</p>}
                        {s.organization && <p className="ui-text-xs ui-text-muted">{s.organization}</p>}
                        {s.bio && <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{s.bio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Materials (only for approved/attended) */}
          {workshop.materials.length > 0 && myReg && ['Approved', 'Attended'].includes(myReg.status) && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={17} style={{ color: 'var(--accent)' }} /> Workshop Materials
                </h3>
              </div>
              <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {workshop.materials.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      // Handle base64 data URLs differently
                      if (m.url.startsWith('data:')) {
                        // Download the file
                        const link = document.createElement('a');
                        link.href = m.url;
                        link.download = m.title || 'download';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        // Open regular URL in new tab
                        window.open(m.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', 
                      borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', 
                      cursor: 'pointer', transition: 'background 0.18s' 
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                  >
                    <Download size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{m.title}</p>
                      <p className="ui-text-xs ui-text-muted">{m.type.toUpperCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Workshop Details */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Workshop Details</h3></div>
            <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Calendar, label: 'Start Date',  value: formatDateTime(workshop.startDate) },
                { icon: Clock,    label: 'End Date',    value: formatDateTime(workshop.endDate) },
                { icon: MapPin,   label: 'Venue',       value: workshop.isOnline ? 'Online' : workshop.venue },
                { icon: Users,    label: 'Capacity',    value: `${workshop.stats.totalRegistrations}/${workshop.capacity} registered` },
                { icon: DollarSign, label: 'Fee',       value: workshop.isFree ? 'Free' : `৳${workshop.fee}` },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 10, background: 'var(--surface)', color: 'var(--accent)', flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ margin: '0 0 2px' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{item.value}</p>
                    </div>
                  </div>
                );
              })}

              {/* Capacity bar */}
              <div>
                <div className="ui-flex ui-flex-between ui-text-xs ui-text-muted" style={{ marginBottom: 5 }}>
                  <span>{workshop.stats.totalRegistrations} registered</span>
                  <span style={{ color: isFull ? '#ef4444' : 'inherit' }}>{isFull ? 'Full' : `${spotsLeft} spots left`}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: isFull ? '#ef4444' : 'var(--gradient-primary)', borderRadius: 999 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (workshop.stats.totalRegistrations / workshop.capacity) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              {/* Tags */}
              {workshop.tags.length > 0 && (
                <div className="ui-flex ui-flex-wrap ui-flex-gap-2">
                  {workshop.tags.map(t => <Badge key={t} variant="neutral" icon={Tag}>{t}</Badge>)}
                </div>
              )}
            </div>
          </div>

          {/* My Registration Status */}
          {regLoading && (
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">My Registration</h3></div>
              <div className="ui-card__body" style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <Spinner size="sm" label="Checking registration…" />
              </div>
            </div>
          )}

          {!regLoading && myReg && (
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">My Registration</h3></div>
              <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ui-flex ui-flex-between">
                  <span className="ui-text-sm ui-text-muted">Status</span>
                  <Badge variant={STATUS_VARIANT[myReg.status] ?? 'neutral'}>{myReg.status}</Badge>
                </div>
                {myReg.paymentRequired && (
                  <div className="ui-flex ui-flex-between">
                    <span className="ui-text-sm ui-text-muted">Payment</span>
                    <Badge variant={myReg.paymentStatus === 'Paid' ? 'success' : 'warning'}>
                      {myReg.paymentStatus}
                    </Badge>
                  </div>
                )}

                {/* Seat Assignment Display */}
                {(myReg as any).seatAssignment?.roomId && (
                  <div style={{ padding: '12px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
                      🪑 Your Seat Assignment
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="ui-flex ui-flex-between">
                        <span className="ui-text-xs ui-text-muted">Room:</span>
                        <span className="ui-text-sm" style={{ fontWeight: 600 }}>
                          {(myReg as any).seatAssignment.roomId.roomNumber} - {(myReg as any).seatAssignment.roomId.roomName}
                        </span>
                      </div>
                      {(myReg as any).seatAssignment.seatNumber && (
                        <div className="ui-flex ui-flex-between">
                          <span className="ui-text-xs ui-text-muted">Seat:</span>
                          <span className="ui-text-sm" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                            {(myReg as any).seatAssignment.seatNumber}
                          </span>
                        </div>
                      )}
                      <p className="ui-text-xs ui-text-muted" style={{ marginTop: 6, fontStyle: 'italic' }}>
                        Please remember your seat location for the workshop day.
                      </p>
                    </div>
                  </div>
                )}

                {myReg.rejectionReason && (
                  <Alert variant="error">{myReg.rejectionReason}</Alert>
                )}

                {/* Pay button */}
                {myReg.paymentRequired && myReg.paymentStatus === 'Pending' && (
                  <Button variant="primary" fullWidth leftIcon={CreditCard} isLoading={payMut.isPending}
                    onClick={() => payMut.mutate()}>
                    Pay ৳{myReg.paymentAmount}
                  </Button>
                )}

                {/* QR Code */}
                {myReg.status === 'Approved' && myReg.qrCodeData && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                      Your Entry QR Code
                    </p>
                    <div style={{ display: 'inline-block', padding: 12, borderRadius: 14, border: '2px solid var(--accent)', background: '#fff' }}>
                      <img src={myReg.qrCodeData} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
                    </div>
                    <p className="ui-text-xs ui-text-muted" style={{ marginTop: 8 }}>
                      Show this QR at the entrance for check-in
                    </p>
                    <Button variant="outline" size="sm" leftIcon={Download}
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = myReg.qrCodeData!;
                        a.download = `workshop-qr-${id}.png`;
                        a.click();
                      }}
                      style={{ marginTop: 8 }}>
                      Download QR
                    </Button>
                  </div>
                )}

                {myReg.checkedIn && (
                  <Alert variant="success">
                    ✓ Checked in at {myReg.checkedInAt ? formatDateTime(myReg.checkedInAt) : ''}
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Register / Action */}
          {!regLoading && !myReg && (
            <div className="ui-card">
              <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Show current status */}
                <div className="ui-flex ui-flex-between">
                  <span className="ui-text-sm ui-text-muted">Status</span>
                  <Badge variant={workshop.status === 'Registration_Open' || workshop.status === 'Published' ? 'success' : 'warning'}>
                    {workshop.status.replace('_', ' ')}
                  </Badge>
                </div>

                {canRegister ? (
                  <>
                    {workshop.requiresApproval && (
                      <Alert variant="info">Registration requires approval by organizers.</Alert>
                    )}
                    {!workshop.isFree && (
                      <Alert variant="warning">Payment of ৳{workshop.fee} required after registration.</Alert>
                    )}
                    <Button fullWidth leftIcon={CheckCircle} onClick={handleOpenRegForm}>
                      Register Now
                    </Button>
                    <Button variant="ghost" size="sm" fullWidth onClick={() => refetch()} style={{ marginTop: 8, fontSize: '0.8rem' }}>
                      🔄 Refresh Info
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert variant="warning">
                      {isFull 
                        ? 'Workshop is full' 
                        : registrationDeadlinePassed 
                        ? `Registration deadline passed (${deadline ? formatDateTime(deadline) : ''})`
                        : `Registration is ${workshop.status.replace('_', ' ')}`
                      }
                    </Alert>
                    <Button variant="ghost" size="sm" fullWidth onClick={() => refetch()} style={{ marginTop: 8, fontSize: '0.8rem' }}>
                      🔄 Refresh Info
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Manager: QR Scanner link */}
          {isManager && (
            <>
              <Button variant="primary" fullWidth href={`/dashboard/workshops/${id}/manage`}>
                👥 Manage Registrations
              </Button>
              <Button variant="outline" fullWidth leftIcon={QrCode} href={`/dashboard/workshops/${id}/checkin`}>
                Open QR Check-in Scanner
              </Button>
            </>
          )}

          {/* Generate Poster */}
          {isManager && (
            <Button variant="outline" fullWidth leftIcon={Image}
              onClick={() => openPosterGenerator({
                type: 'workshop',
                title: workshop.title,
                subtitle: workshop.shortDescription,
                date: `${formatDate(workshop.startDate)} - ${formatDate(workshop.endDate)}`,
                location: workshop.isOnline ? 'Online' : workshop.venue,
                description: workshop.description.substring(0, 120),
                additionalInfo: [
                  workshop.isFree ? 'Free' : `৳${workshop.fee}`,
                  workshop.level,
                  `${spotsLeft} spots left`,
                ],
                theme: 'green',
              })}>
              Generate Poster
            </Button>
          )}
        </div>
      </div>

      {/* Registration Form Modal */}
      <AnimatePresence>
        {showRegForm && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(0,0,0,0.7)', 
                backdropFilter: 'blur(8px)', 
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflowY: 'auto',
              }}
              onClick={() => setShowRegForm(false)} 
            >
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  background: 'var(--panel-strong)',
                  borderRadius: '24px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  overflow: 'hidden',
                  margin: 'auto',
                }}
              >
                {/* Modal Header */}
                <div style={{ 
                  padding: '24px', 
                  borderBottom: '1px solid var(--border)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'var(--surface)',
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontWeight: 700, 
                    fontSize: '1.25rem',
                    color: 'var(--text)' 
                  }}>
                    Register for Workshop
                  </h3>
                  <button 
                    onClick={() => setShowRegForm(false)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: 'var(--muted)', 
                      fontSize: '1.5rem',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px' }}>
                  {/* Registration deadline warning */}
                  {registrationDeadlinePassed && (
                    <Alert variant="error" style={{ marginBottom: '16px' }}>
                      Registration deadline has passed ({workshop.registrationDeadline ? formatDateTime(workshop.registrationDeadline) : ''})
                    </Alert>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontWeight: 600 }}>Full Name *</label>
                      <input 
                        className="ui-input" 
                        value={regForm.name} 
                        onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} 
                        placeholder="Enter your full name"
                        required 
                        style={{ fontSize: '0.95rem' }}
                      />
                    </div>
                    
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontWeight: 600 }}>Email *</label>
                      <input 
                        type="email" 
                        className="ui-input" 
                        value={regForm.email} 
                        onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} 
                        placeholder="your.email@example.com"
                        required 
                        style={{ fontSize: '0.95rem' }}
                      />
                    </div>
                    
                    <div className="ui-input-wrap">
                      <label className="ui-input-label" style={{ fontWeight: 600 }}>Phone</label>
                      <input 
                        className="ui-input" 
                        value={regForm.phone} 
                        onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} 
                        placeholder="+8801XXXXXXXXX" 
                        style={{ fontSize: '0.95rem' }}
                      />
                    </div>
                    
                    {!workshop.isFree && (
                      <Alert variant="warning">
                        After registration, you'll need to pay ৳{workshop.fee} to confirm your spot.
                      </Alert>
                    )}
                    
                    {workshop.requiresApproval && (
                      <Alert variant="info">
                        Your registration will be reviewed by organizers.
                      </Alert>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    marginTop: '24px', 
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  }}>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRegForm(false)}
                      style={{ minWidth: '100px' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      isLoading={registerMut.isPending}
                      disabled={registrationDeadlinePassed}
                      onClick={() => { 
                        if (regForm.name && regForm.email) {
                          registerMut.mutate(); 
                        } else {
                          toast.error('Name and email are required'); 
                        }
                      }}
                      style={{ minWidth: '150px' }}
                    >
                      {registerMut.isPending ? 'Registering...' : 'Confirm Registration'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Poster Generator Modal */}
      {PosterModal}
    </div>
  );
}
