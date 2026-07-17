import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, Clock, Users, MapPin, CheckCircle, XCircle, 
  Plus, History, Activity, Info, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { SeatMapVisualization } from '../../components/rooms/SeatMapVisualization';
import toast from 'react-hot-toast';

interface Room {
  _id: string;
  roomNumber: string;
  roomName: string;
  building: string;
  floor: number;
  roomType: string;
  totalCapacity: number;
  seatManagementMode: 'Individual' | 'Capacity_Only';
  seatsPerRow?: number;
  totalRows?: number;
  features: Record<string, boolean>;
  availableCapacity: number;
  isActive: boolean;
  description?: string;
  createdBy: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

interface Booking {
  _id: string;
  roomId: string;
  startTime: string;
  endTime: string;
  bookedForType: 'Event' | 'Workshop' | 'Manual';
  eventId?: { _id: string; title: string };
  workshopId?: { _id: string; title: string };
  title: string;
  description?: string;
  attendees?: number;
  bookedBy?: { firstName: string; lastName: string; email: string };
  status: 'Active' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

interface RoomLog {
  _id: string;
  roomId: string;
  bookingId?: string;
  entityType: 'Event' | 'Workshop' | 'Manual';
  entityId?: string;
  action: 'BOOKED' | 'CANCELLED' | 'EXTENDED' | 'MODIFIED';
  performedBy?: { firstName: string; lastName: string; email: string };
  metadata: Record<string, any>;
  createdAt: string;
}

export function RoomDetailsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendees: 0,
    notes: '',
  });
  const [bookingError, setBookingError] = useState('');
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([]);

  const canManage = Boolean(user?.roles.some((r) => ['System Admin', 'Moderator', 'Chief Patron'].includes(r)));

  // Fetch room details
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', roomId, token],
    queryFn: () => apiRequest<Room>(`/rooms/${roomId}`, { token }),
    enabled: Boolean(roomId && token),
  });

  // Fetch seat map
  const { data: seatMap } = useQuery({
    queryKey: ['room-seat-map', roomId, token],
    queryFn: () => apiRequest(`/rooms/${roomId}/seat-map`, { token }),
    enabled: Boolean(roomId && token),
  });

  // Fetch schedule (upcoming bookings)
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['room-schedule', roomId, token],
    queryFn: () => apiRequest<Booking[]>(`/rooms/${roomId}/schedule`, { token }),
    enabled: Boolean(roomId && token),
  });

  // Fetch history (all bookings)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['room-history', roomId, token],
    queryFn: () => apiRequest<{ bookings: Booking[]; total: number }>(`/rooms/${roomId}/history`, { token }),
    enabled: Boolean(roomId && token),
  });

  // Fetch activity logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['room-logs', roomId, token],
    queryFn: () => apiRequest<{ logs: RoomLog[]; total: number }>(`/rooms/${roomId}/logs`, { token }),
    enabled: Boolean(roomId && token && canManage),
  });

  // Manual booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data: typeof bookingForm) =>
      apiRequest(`/rooms/${roomId}/book`, {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Room booked successfully');
      queryClient.invalidateQueries({ queryKey: ['room-schedule', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-history', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-logs', roomId] });
      setShowBookingModal(false);
      resetBookingForm();
    },
    onError: (err) => {
      const msg = normalizeApiError(err);
      setBookingError(msg);
      toast.error(msg);
    },
  });

  // Edit booking mutation
  const editMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string; data: Partial<typeof bookingForm> }) =>
      apiRequest(`/rooms/bookings/${bookingId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Booking updated successfully');
      queryClient.invalidateQueries({ queryKey: ['room-schedule', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-history', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-logs', roomId] });
      setShowBookingModal(false);
      setEditingBooking(null);
      resetBookingForm();
    },
    onError: (err) => {
      const msg = normalizeApiError(err);
      setBookingError(msg);
      toast.error(msg);
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiRequest(`/rooms/bookings/${bookingId}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['room-schedule', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-history', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-logs', roomId] });
    },
    onError: (err) => toast.error(normalizeApiError(err)),
  });

  const resetBookingForm = () => {
    setBookingForm({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      attendees: 0,
      notes: '',
    });
    setBookingError('');
    setEditingBooking(null);
    setConflictingBookings([]);
  };

  // Check for conflicts in real-time when time changes
  const checkTimeConflicts = async (startTime: string, endTime: string) => {
    if (!startTime || !endTime || !schedule) return;

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      if (end <= start) return;

      // Find overlapping bookings in the schedule
      const conflicts = schedule.filter((booking) => {
        // Skip the booking being edited
        if (editingBooking && booking._id === editingBooking._id) return false;
        
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);

        // Check for overlap: start < booking.end AND end > booking.start
        return start < bookingEnd && end > bookingStart;
      });

      setConflictingBookings(conflicts);

      if (conflicts.length > 0) {
        const conflictList = conflicts
          .map((c) => `"${c.title}" (${new Date(c.startTime).toLocaleString()} - ${new Date(c.endTime).toLocaleString()})`)
          .join(', ');
        setBookingError(`Room is already booked: ${conflictList}`);
      } else {
        setBookingError('');
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    // Convert ISO dates to datetime-local format
    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setBookingForm({
      title: booking.title || '',
      description: booking.description || '',
      startTime: formatDateTime(booking.startTime),
      endTime: formatDateTime(booking.endTime),
      attendees: booking.attendees || 0,
      notes: booking.notes || '',
    });
    setShowBookingModal(true);
  };

  const handleBookRoom = () => {
    if (!bookingForm.title.trim() || !bookingForm.startTime || !bookingForm.endTime) {
      setBookingError('Title, start time, and end time are required');
      return;
    }
    
    // Convert datetime-local format to ISO 8601
    const start = new Date(bookingForm.startTime);
    const end = new Date(bookingForm.endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setBookingError('Invalid date/time format');
      return;
    }
    
    if (end <= start) {
      setBookingError('End time must be after start time');
      return;
    }
    
    setBookingError('');
    
    const payload = {
      ...bookingForm,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    if (editingBooking) {
      // Edit existing booking
      editMutation.mutate({ bookingId: editingBooking._id, data: payload });
    } else {
      // Create new booking
      bookingMutation.mutate(payload);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      cancelMutation.mutate(bookingId);
    }
  };

  if (roomLoading || !room) {
    return (
      <div className="ui-page">
        <div className="ui-flex-center" style={{ padding: 80 }}>
          <Spinner size="lg" label="Loading room details…" />
        </div>
      </div>
    );
  }

  const fullRoomName = `${room.roomName} (${room.building} - Floor ${room.floor})`;

  return (
    <div className="ui-page">
      <PageHeader
        title={room.roomName}
        description={`${room.building} • Floor ${room.floor} • Room ${room.roomNumber}`}
        backButton
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Rooms', href: '/dashboard/admin/rooms' },
          { label: room.roomName },
        ]}
        actions={
          canManage ? (
            <Button variant="primary" leftIcon={Plus} onClick={() => setShowBookingModal(true)}>
              Book Room
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="overview">
            <Info size={14} style={{ marginRight: 6 }} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar size={14} style={{ marginRight: 6 }} />
            Schedule
          </TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger value="logs">
                <Activity size={14} style={{ marginRight: 6 }} />
                Activity Log
              </TabsTrigger>
              <TabsTrigger value="history">
                <History size={14} style={{ marginRight: 6 }} />
                History
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="ui-grid-2" style={{ gap: 16 }}>
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title">Room Information</h3>
              </div>
              <div className="ui-card__body">
                <div className="ui-flex-col" style={{ gap: 12 }}>
                  <InfoRow label="Type" value={room.roomType || 'Unknown'} />
                  <InfoRow label="Total Capacity" value={room.totalCapacity} />
                  <InfoRow
                    label="Available Capacity"
                    value={
                      <span style={{ color: room.availableCapacity > 0 ? '#10b981' : '#ef4444' }}>
                        {room.availableCapacity}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Seat Management"
                    value={room.seatManagementMode === 'Individual' ? 'Individual Seats' : 'Capacity Only'}
                  />
                  {room.seatManagementMode === 'Individual' && room.totalRows && room.seatsPerRow && (
                    <InfoRow label="Layout" value={`${room.totalRows} rows × ${room.seatsPerRow} seats per row`} />
                  )}
                  <InfoRow
                    label="Status"
                    value={<Badge variant={room.isActive ? 'success' : 'error'}>{room.isActive ? 'Active' : 'Inactive'}</Badge>}
                  />
                </div>
              </div>
            </div>

            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title">Features</h3>
              </div>
              <div className="ui-card__body">
                <div className="ui-flex ui-flex-wrap ui-flex-gap-2">
                  {room.features?.hasProjector && <Badge variant="neutral">📽️ Projector</Badge>}
                  {room.features?.hasWhiteboard && <Badge variant="neutral">🖊️ Whiteboard</Badge>}
                  {room.features?.hasAC && <Badge variant="neutral">❄️ AC</Badge>}
                  {room.features?.hasWifi && <Badge variant="neutral">📡 WiFi</Badge>}
                  {room.features?.hasDesktops && <Badge variant="neutral">💻 Desktops</Badge>}
                  {room.features?.hasSoundSystem && <Badge variant="neutral">🔊 Sound System</Badge>}
                  {room.features?.isAccessible && <Badge variant="neutral">♿ Accessible</Badge>}
                  {(!room.features || Object.values(room.features).every((v) => !v)) && (
                    <span className="ui-text-muted">No special features</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seat Map */}
          <div className="ui-card ui-mt-4">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Seat Map</h3>
            </div>
            <div className="ui-card__body">
              {seatMap ? (
                <SeatMapVisualization room={{ ...room, ...seatMap }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spinner size="md" />
                  <p className="ui-text-muted">Loading seat map...</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="ui-card ui-mt-4">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Metadata</h3>
            </div>
            <div className="ui-card__body">
              <div className="ui-flex-col" style={{ gap: 8, fontSize: '0.9rem' }}>
                {room.createdBy && (
                  <InfoRow
                    label="Created By"
                    value={`${room.createdBy.firstName} ${room.createdBy.lastName} (${room.createdBy.email})`}
                  />
                )}
                <InfoRow label="Created At" value={new Date(room.createdAt).toLocaleString()} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule">
          {scheduleLoading ? (
            <div className="ui-flex-center" style={{ padding: 60 }}>
              <Spinner size="md" label="Loading schedule…" />
            </div>
          ) : !schedule || schedule.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming bookings"
              description="This room is currently free. Book it now!"
            />
          ) : (
            <div className="ui-flex-col" style={{ gap: 16 }}>
              {schedule.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  canEdit={canManage && booking.status === 'Active'}
                  canCancel={canManage && booking.status === 'Active'}
                  onEdit={() => handleEditBooking(booking)}
                  onCancel={() => handleCancelBooking(booking._id)}
                  isLoading={cancelMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACTIVITY LOG TAB */}
        {canManage && (
          <TabsContent value="logs">
            {logsLoading ? (
              <div className="ui-flex-center" style={{ padding: 60 }}>
                <Spinner size="md" label="Loading activity log…" />
              </div>
            ) : !logsData || logsData.logs.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" description="Room activity will appear here." />
            ) : (
              <div className="ui-flex-col" style={{ gap: 12 }}>
                {logsData.logs.map((log) => (
                  <LogCard key={log._id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* HISTORY TAB */}
        {canManage && (
          <TabsContent value="history">
            {historyLoading ? (
              <div className="ui-flex-center" style={{ padding: 60 }}>
                <Spinner size="md" label="Loading history…" />
              </div>
            ) : !historyData || historyData.bookings.length === 0 ? (
              <EmptyState icon={History} title="No booking history" description="Past bookings will appear here." />
            ) : (
              <div className="ui-flex-col" style={{ gap: 16 }}>
                {historyData.bookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    canEdit={canManage && booking.status === 'Active'}
                    canCancel={canManage && booking.status === 'Active'}
                    onEdit={() => handleEditBooking(booking)}
                    onCancel={() => handleCancelBooking(booking._id)}
                    isLoading={cancelMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Manual Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          resetBookingForm();
        }}
        title={editingBooking ? "Edit Booking" : "Book Room"}
        description={editingBooking ? `Update booking details for ${fullRoomName}` : `Create a manual booking for ${fullRoomName}`}
        size="md"
        footer={
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBookingModal(false);
                resetBookingForm();
              }}
              disabled={bookingMutation.isPending || editMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBookRoom}
              isLoading={bookingMutation.isPending || editMutation.isPending}
              disabled={conflictingBookings.length > 0}
            >
              {editingBooking ? 'Update Booking' : 'Book Room'}
            </Button>
          </div>
        }
      >
        {bookingError && (
          <Alert variant="error" onClose={() => setBookingError('')} style={{ marginBottom: 16 }}>
            {bookingError}
          </Alert>
        )}

        {conflictingBookings.length > 0 && (
          <div
            style={{
              padding: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 8, fontSize: '0.9rem' }}>
              ⚠️ Conflicting Bookings:
            </div>
            {conflictingBookings.map((conflict) => (
              <div
                key={conflict._id}
                style={{
                  padding: 8,
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 6,
                  marginBottom: 6,
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontWeight: 600 }}>{conflict.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ui-flex-col" style={{ gap: 16 }}>
          <label className="ui-input-wrap">
            <span className="ui-input-label">Title *</span>
            <input
              className="ui-input"
              value={bookingForm.title}
              onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
              placeholder="e.g., Team Meeting"
            />
          </label>

          <div className="ui-grid-2" style={{ gap: 16 }}>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Start Time *</span>
              <input
                type="datetime-local"
                className="ui-input"
                value={bookingForm.startTime}
                onChange={(e) => {
                  setBookingForm({ ...bookingForm, startTime: e.target.value });
                  checkTimeConflicts(e.target.value, bookingForm.endTime);
                }}
              />
            </label>

            <label className="ui-input-wrap">
              <span className="ui-input-label">End Time *</span>
              <input
                type="datetime-local"
                className="ui-input"
                value={bookingForm.endTime}
                onChange={(e) => {
                  setBookingForm({ ...bookingForm, endTime: e.target.value });
                  checkTimeConflicts(bookingForm.startTime, e.target.value);
                }}
              />
            </label>
          </div>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Expected Attendees</span>
            <input
              type="number"
              className="ui-input"
              value={bookingForm.attendees}
              onChange={(e) => setBookingForm({ ...bookingForm, attendees: Number(e.target.value) })}
              placeholder="0"
              min="0"
            />
          </label>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Description</span>
            <textarea
              className="ui-textarea"
              value={bookingForm.description}
              onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
              placeholder="Brief description of the booking"
              rows={3}
            />
          </label>

          <label className="ui-input-wrap">
            <span className="ui-input-label">Notes</span>
            <textarea
              className="ui-textarea"
              value={bookingForm.notes}
              onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ui-flex ui-flex-between" style={{ alignItems: 'start' }}>
      <span className="ui-text-muted" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
        {label}:
      </span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function BookingCard({
  booking,
  canEdit,
  canCancel,
  onEdit,
  onCancel,
  isLoading,
}: {
  booking: Booking;
  canEdit: boolean;
  canCancel: boolean;
  onEdit: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const isPast = new Date(booking.endTime) < new Date();
  const isActive = booking.status === 'Active';

  return (
    <div
      className="ui-card"
      style={{
        opacity: booking.status === 'Cancelled' ? 0.6 : 1,
      }}
    >
      <div className="ui-card__body">
        <div className="ui-flex ui-flex-between ui-flex-gap-3" style={{ alignItems: 'start' }}>
          <div className="ui-flex-col" style={{ gap: 8, flex: 1 }}>
            <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{booking.title || 'Untitled Booking'}</h4>
              <Badge variant={booking.bookedForType === 'Manual' ? 'neutral' : 'primary'}>{booking.bookedForType}</Badge>
              <Badge variant={booking.status === 'Active' ? 'success' : 'error'}>{booking.status}</Badge>
              {isPast && isActive && <Badge variant="neutral">Completed</Badge>}
            </div>

            {booking.description && <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>{booking.description}</p>}

            <div className="ui-flex ui-flex-wrap ui-flex-gap-3 ui-text-sm ui-text-muted">
              <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>
                <Clock size={14} /> {new Date(booking.startTime).toLocaleString()}
              </span>
              <span>→</span>
              <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>
                <Clock size={14} /> {new Date(booking.endTime).toLocaleString()}
              </span>
              {booking.attendees !== undefined && booking.attendees > 0 && (
                <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>
                  <Users size={14} /> {booking.attendees} attendees
                </span>
              )}
            </div>

            {booking.eventId && (
              <div className="ui-text-sm">
                <strong>Event:</strong> {booking.eventId.title}
              </div>
            )}
            {booking.workshopId && (
              <div className="ui-text-sm">
                <strong>Workshop:</strong> {booking.workshopId.title}
              </div>
            )}

            {booking.bookedBy && (
              <div className="ui-text-xs ui-text-muted">
                Booked by {booking.bookedBy.firstName} {booking.bookedBy.lastName}
              </div>
            )}
          </div>

          <div className="ui-flex ui-flex-gap-2">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit} disabled={isLoading}>
                Edit
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={onCancel} isLoading={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogCard({ log }: { log: RoomLog }) {
  const actionColor = {
    BOOKED: '#10b981',
    CANCELLED: '#ef4444',
    EXTENDED: '#f59e0b',
    MODIFIED: '#3b82f6',
  };

  return (
    <div className="ui-card">
      <div className="ui-card__body">
        <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'start' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${actionColor[log.action]}15`,
              color: actionColor[log.action],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {log.action === 'BOOKED' && <CheckCircle size={18} />}
            {log.action === 'CANCELLED' && <XCircle size={18} />}
            {log.action === 'EXTENDED' && <Clock size={18} />}
            {log.action === 'MODIFIED' && <AlertCircle size={18} />}
          </div>

          <div className="ui-flex-col" style={{ gap: 6, flex: 1 }}>
            <div className="ui-flex ui-flex-between ui-flex-gap-2 ui-flex-wrap">
              <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: actionColor[log.action] }}>{log.action}</span>
                {log.entityType && <Badge variant="neutral">{log.entityType}</Badge>}
              </div>
              <span className="ui-text-xs ui-text-muted">{new Date(log.createdAt).toLocaleString()}</span>
            </div>

            {log.metadata?.title && (
              <div className="ui-font-medium" style={{ fontSize: '0.95rem' }}>
                {log.metadata.title}
              </div>
            )}

            {log.metadata?.startTime && log.metadata?.endTime && (
              <div className="ui-text-sm ui-text-muted">
                {new Date(log.metadata.startTime).toLocaleString()} → {new Date(log.metadata.endTime).toLocaleString()}
              </div>
            )}

            {log.performedBy && (
              <div className="ui-text-xs ui-text-muted">
                by {log.performedBy.firstName} {log.performedBy.lastName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
