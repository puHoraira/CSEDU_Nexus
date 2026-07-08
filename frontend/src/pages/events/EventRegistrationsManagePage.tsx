import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Search, Download, Calendar, Mail, Phone, DollarSign, MapPin } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/utils';

type EventRegistration = {
  _id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentAmount: number;
  attendeeInfo: {
    name: string;
    email: string;
    phone: string;
    organization?: string;
    designation?: string;
    specialRequirements?: string;
  };
  seatAssignment?: {
    roomId: {
      _id: string;
      roomNumber: string;
      roomName: string;
    };
    seatNumber?: string;
    row?: number;
    position?: number;
  };
  checkInTime?: string;
  registeredAt: string;
};

type Event = {
  _id: string;
  title: string;
  eventDate: string;
  venue: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  Pending: 'warning',
  Confirmed: 'success',
  Cancelled: 'error',
  Attended: 'success',
};

const PAYMENT_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  Paid: 'success',
  Pending: 'warning',
  Failed: 'error',
  Refunded: 'neutral' as any,
};

export function EventRegistrationsManagePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => apiRequest<Event>(`/events/${eventId}`, { token }),
    enabled: Boolean(eventId && token),
  });

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: () => apiRequest<EventRegistration[]>(`/events/${eventId}/registrations`, { token }),
    enabled: Boolean(eventId && token),
  });

  const filtered = registrations.filter((r) => {
    const matchSearch =
      !search ||
      r.attendeeInfo.name.toLowerCase().includes(search.toLowerCase()) ||
      r.attendeeInfo.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || r.paymentStatus === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const counts = {
    total: registrations.length,
    confirmed: registrations.filter((r) => r.status === 'Confirmed').length,
    pending: registrations.filter((r) => r.status === 'Pending').length,
    attended: registrations.filter((r) => r.status === 'Attended').length,
    paid: registrations.filter((r) => r.paymentStatus === 'Paid').length,
  };

  const downloadCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Organization',
      'Designation',
      'Status',
      'Payment Status',
      'Payment Method',
      'Amount',
      'Room',
      'Seat',
      'Check-in Time',
      'Registered At',
    ];

    const rows = filtered.map((r) => [
      r.attendeeInfo.name,
      r.attendeeInfo.email,
      r.attendeeInfo.phone || '',
      r.attendeeInfo.organization || '',
      r.attendeeInfo.designation || '',
      r.status,
      r.paymentStatus,
      r.paymentMethod,
      r.paymentAmount || 0,
      r.seatAssignment?.roomId?.roomName || '',
      r.seatAssignment?.seatNumber || '',
      r.checkInTime ? formatDateTime(r.checkInTime) : '',
      formatDateTime(r.registeredAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `event-${eventId}-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadJSON = () => {
    const data = filtered.map((r) => ({
      name: r.attendeeInfo.name,
      email: r.attendeeInfo.email,
      phone: r.attendeeInfo.phone,
      organization: r.attendeeInfo.organization,
      designation: r.attendeeInfo.designation,
      specialRequirements: r.attendeeInfo.specialRequirements,
      status: r.status,
      paymentStatus: r.paymentStatus,
      paymentMethod: r.paymentMethod,
      paymentAmount: r.paymentAmount,
      room: r.seatAssignment?.roomId?.roomName,
      roomNumber: r.seatAssignment?.roomId?.roomNumber,
      seat: r.seatAssignment?.seatNumber,
      checkInTime: r.checkInTime,
      registeredAt: r.registeredAt,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-${eventId}-registrations-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (eventLoading || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
        <Spinner size="xl" label="Loading registrations..." />
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title="Event Registrations"
        description={event?.title || 'Manage event registrations'}
        backButton
        breadcrumbs={[
          { label: 'Events', href: '/dashboard/events' },
          { label: event?.title || 'Event', href: `/dashboard/events/${eventId}` },
          { label: 'Registrations' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" leftIcon={Download} onClick={downloadCSV}>
              CSV
            </Button>
            <Button variant="outline" leftIcon={Download} onClick={downloadJSON}>
              JSON
            </Button>
          </div>
        }
      />

      {/* Event Info */}
      {event && (
        <div className="ui-card" style={{ marginBottom: '20px' }}>
          <div className="ui-card__body">
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--accent)' }} />
                <span className="ui-text-sm">{formatDateTime(event.eventDate)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} style={{ color: 'var(--accent)' }} />
                <span className="ui-text-sm">{event.venue}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="ui-grid-4">
        {[
          { label: 'Total', value: counts.total, color: '#6ba3ff', icon: Users },
          { label: 'Confirmed', value: counts.confirmed, color: '#10b981', icon: Users },
          { label: 'Pending', value: counts.pending, color: '#f59e0b', icon: Users },
          { label: 'Paid', value: counts.paid, color: '#8b5cf6', icon: DollarSign },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${s.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={22} style={{ color: s.color }} />
              </div>
              <div>
                <div
                  className="ui-text-xs ui-text-muted"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3" style={{ flexWrap: 'wrap' }}>
            <div className="ui-input-row" style={{ flex: 2, minWidth: 200 }}>
              <span className="ui-input-icon">
                <Search size={15} />
              </span>
              <input
                className="ui-input ui-input--icon"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="ui-select"
              style={{ flex: 1, minWidth: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Attended">Attended</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              className="ui-select"
              style={{ flex: 1, minWidth: 140 }}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Payment</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="ui-card">
          <EmptyState icon={Users} title="No registrations found" size="sm" />
        </div>
      )}

      {/* Registrations List */}
      {filtered.length > 0 && (
        <div className="ui-card" style={{ padding: 0 }}>
          {filtered.map((reg, i) => (
            <motion.div
              key={reg._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px 22px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                flexWrap: 'wrap',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {reg.attendeeInfo.name.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name and Badges */}
                <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                    {reg.attendeeInfo.name}
                  </span>
                  <Badge variant={STATUS_VARIANT[reg.status] ?? 'neutral'}>{reg.status}</Badge>
                  {reg.paymentAmount > 0 && (
                    <Badge variant={PAYMENT_VARIANT[reg.paymentStatus] ?? 'warning'}>
                      {reg.paymentStatus} · ৳{reg.paymentAmount}
                    </Badge>
                  )}
                </div>

                {/* Contact Info */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} style={{ color: 'var(--muted)' }} />
                    <span className="ui-text-xs ui-text-muted">{reg.attendeeInfo.email}</span>
                  </div>
                  {reg.attendeeInfo.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} style={{ color: 'var(--muted)' }} />
                      <span className="ui-text-xs ui-text-muted">{reg.attendeeInfo.phone}</span>
                    </div>
                  )}
                </div>

                {/* Organization/Designation */}
                {(reg.attendeeInfo.organization || reg.attendeeInfo.designation) && (
                  <p className="ui-text-xs ui-text-muted">
                    {reg.attendeeInfo.designation}
                    {reg.attendeeInfo.organization && reg.attendeeInfo.designation && ' · '}
                    {reg.attendeeInfo.organization}
                  </p>
                )}

                {/* Seat Assignment */}
                {reg.seatAssignment?.roomId && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      display: 'inline-block',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                      🪑 Room {reg.seatAssignment.roomId.roomNumber} - {reg.seatAssignment.roomId.roomName}
                      {reg.seatAssignment.seatNumber && ` · Seat ${reg.seatAssignment.seatNumber}`}
                    </span>
                  </div>
                )}

                {/* Special Requirements */}
                {reg.attendeeInfo.specialRequirements && (
                  <p className="ui-text-xs ui-text-muted" style={{ marginTop: '6px', fontStyle: 'italic' }}>
                    Note: {reg.attendeeInfo.specialRequirements}
                  </p>
                )}

                {/* Timestamps */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span className="ui-text-xs ui-text-muted">Registered: {formatDateTime(reg.registeredAt)}</span>
                  {reg.checkInTime && (
                    <span className="ui-text-xs" style={{ color: '#10b981', fontWeight: 600 }}>
                      ✓ Checked in: {formatDateTime(reg.checkInTime)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
