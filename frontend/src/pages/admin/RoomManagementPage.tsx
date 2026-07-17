import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PageScreen } from '../../components/ui/PageScreen';
import { Clock, Calendar } from 'lucide-react';

interface Room {
  _id: string;
  roomNumber: string;
  roomName: string;
  building: string;
  floor: number;
  roomType: 'Lab' | 'Classroom' | 'Auditorium' | 'Seminar_Hall' | 'Other';
  totalCapacity: number;
  seatManagementMode: 'Individual' | 'Capacity_Only';
  seatsPerRow?: number;
  totalRows?: number;
  features: {
    hasProjector: boolean;
    hasWhiteboard: boolean;
    hasAC: boolean;
    hasWifi: boolean;
    hasDesktops: boolean;
    hasSoundSystem: boolean;
    isAccessible: boolean;
  };
  availableCapacity: number;
  isActive: boolean;
  currentUsage: {
    isOccupied: boolean;
    occupiedBy?: string;
    occupiedSeats: number;
    registeredCount: number;
  };
}

interface Booking {
  _id: string;
  roomId: string;
  startTime: string;
  endTime: string;
  bookedForType: 'Event' | 'Workshop' | 'Manual';
  eventId?: { title: string };
  workshopId?: { title: string };
  title: string;
  status: 'Active' | 'Cancelled';
}

interface RoomWithStatus extends Room {
  bookingStatus: 'Available' | 'Occupied' | 'Upcoming';
  nextBooking?: Booking;
  currentBooking?: Booking;
}

interface RoomFormData {
  roomNumber: string;
  roomName: string;
  building: string;
  floor: number;
  roomType: 'Lab' | 'Classroom' | 'Auditorium' | 'Seminar_Hall' | 'Other';
  totalCapacity: number;
  seatManagementMode: 'Individual' | 'Capacity_Only';
  seatsPerRow?: number;
  totalRows?: number;
  features: {
    hasProjector: boolean;
    hasWhiteboard: boolean;
    hasAC: boolean;
    hasWifi: boolean;
    hasDesktops: boolean;
    hasSoundSystem: boolean;
    isAccessible: boolean;
  };
  description: string;
  imageUrl: string;
}

export function RoomManagementPage() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<RoomWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>({
    roomNumber: '',
    roomName: '',
    building: 'CSEDU Building',
    floor: 3,
    roomType: 'Classroom',
    totalCapacity: 40,
    seatManagementMode: 'Individual',
    seatsPerRow: 8,
    totalRows: 5,
    features: {
      hasProjector: false,
      hasWhiteboard: true,
      hasAC: false,
      hasWifi: true,
      hasDesktops: false,
      hasSoundSystem: false,
      isAccessible: false
    },
    description: '',
    imageUrl: ''
  });
  const [filter, setFilter] = useState({
    roomType: '',
    building: '',
    floor: '',
    seatManagementMode: ''
  });

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const fetchedRooms: Room[] = await apiRequest('/rooms', {
        method: 'GET',
        token
      });
      
      // Fetch schedule for each room to determine status
      const roomsWithStatus = await Promise.all(
        (fetchedRooms || []).map(async (room) => {
          try {
            const schedule: Booking[] = await apiRequest(`/rooms/${room._id}/schedule`, { token });
            const now = new Date();
            
            // Find current booking (happening now)
            const currentBooking = schedule.find(b => {
              const start = new Date(b.startTime);
              const end = new Date(b.endTime);
              return start <= now && end > now;
            });
            
            // Find next upcoming booking
            const futureBookings = schedule.filter(b => new Date(b.startTime) > now);
            const nextBooking = futureBookings.length > 0 ? futureBookings[0] : undefined;
            
            let bookingStatus: 'Available' | 'Occupied' | 'Upcoming' = 'Available';
            if (currentBooking) {
              bookingStatus = 'Occupied';
            } else if (nextBooking) {
              bookingStatus = 'Upcoming';
            }
            
            return {
              ...room,
              bookingStatus,
              currentBooking,
              nextBooking
            } as RoomWithStatus;
          } catch (error) {
            console.error(`Error fetching schedule for room ${room._id}:`, error);
            return {
              ...room,
              bookingStatus: 'Available' as const
            } as RoomWithStatus;
          }
        })
      );
      
      setRooms(roomsWithStatus);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoom) {
        // Update existing room
        await apiRequest(`/rooms/${editingRoom._id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(formData)
        });
        alert('Room updated successfully!');
      } else {
        // Create new room
        await apiRequest('/rooms', {
          method: 'POST',
          token,
          body: JSON.stringify(formData)
        });
        alert('Room created successfully!');
      }
      
      setShowForm(false);
      setEditingRoom(null);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      alert(error.message || 'Failed to save room');
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      building: room.building,
      floor: room.floor,
      roomType: room.roomType,
      totalCapacity: room.totalCapacity,
      seatManagementMode: room.seatManagementMode,
      seatsPerRow: room.seatsPerRow,
      totalRows: room.totalRows,
      features: room.features,
      description: '',
      imageUrl: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await apiRequest(`/rooms/${roomId}`, {
        method: 'DELETE',
        token
      });
      alert('Room deleted successfully!');
      fetchRooms();
    } catch (error: any) {
      alert(error.message || 'Failed to delete room');
    }
  };

  const resetForm = () => {
    setFormData({
      roomNumber: '',
      roomName: '',
      building: 'CSEDU Building',
      floor: 3,
      roomType: 'Classroom',
      totalCapacity: 40,
      seatManagementMode: 'Individual',
      seatsPerRow: 8,
      totalRows: 5,
      features: {
        hasProjector: false,
        hasWhiteboard: true,
        hasAC: false,
        hasWifi: true,
        hasDesktops: false,
        hasSoundSystem: false,
        isAccessible: false
      },
      description: '',
      imageUrl: ''
    });
  };

  const getRoomTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Lab: '#3b82f6',
      Classroom: '#10b981',
      Auditorium: '#8b5cf6',
      Seminar_Hall: '#f59e0b',
      Other: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <PageScreen title="Room Management">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoadingSpinner size="lg" />
          <p>Loading rooms...</p>
        </div>
      </PageScreen>
    );
  }

  return (
    <PageScreen title="Room Management" subtitle="Manage rooms, seats, and capacity for events and workshops">
      {/* Statistics Overview */}
      <div className="grid-2" style={{ marginBottom: 24, gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Total Rooms</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{rooms.length}</p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Total Capacity</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            {rooms.reduce((sum, room) => sum + room.totalCapacity, 0)}
          </p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Currently Occupied</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#ef4444' }}>
            {rooms.filter(r => r.bookingStatus === 'Occupied').length}
          </p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>Available Now</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#10b981' }}>
            {rooms.filter(r => r.bookingStatus === 'Available' && r.isActive).length}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            value={filter.roomType}
            onChange={(e) => setFilter({...filter, roomType: e.target.value})}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">All Types</option>
            <option value="Lab">Lab</option>
            <option value="Classroom">Classroom</option>
            <option value="Auditorium">Auditorium</option>
            <option value="Seminar_Hall">Seminar Hall</option>
            <option value="Other">Other</option>
          </select>
          
          <select 
            value={filter.seatManagementMode}
            onChange={(e) => setFilter({...filter, seatManagementMode: e.target.value})}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">All Modes</option>
            <option value="Individual">Individual Seats</option>
            <option value="Capacity_Only">Capacity Only</option>
          </select>
        </div>
        
        <button 
          className="primary-button" 
          onClick={() => { resetForm(); setEditingRoom(null); setShowForm(true); }}
        >
          + Add New Room
        </button>
      </div>

      {/* Room Form Modal */}
      {showForm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{ 
            maxWidth: 800, 
            width: '100%', 
            maxHeight: '90vh', 
            overflow: 'auto',
            padding: 30
          }}>
            <h2 style={{ marginTop: 0 }}>{editingRoom ? 'Edit Room' : 'Create New Room'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="stack" style={{ gap: 16 }}>
                {/* Basic Info */}
                <div className="grid-2" style={{ gap: 16 }}>
                  <label className="field">
                    <span>Room Number *</span>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                      placeholder="e.g., 301, Lab-2, AUD-1"
                      required
                    />
                  </label>
                  
                  <label className="field">
                    <span>Room Name *</span>
                    <input
                      type="text"
                      value={formData.roomName}
                      onChange={(e) => setFormData({...formData, roomName: e.target.value})}
                      placeholder="e.g., Computer Lab 1"
                      required
                    />
                  </label>
                </div>

                <div className="grid-2" style={{ gap: 16 }}>
                  <label className="field">
                    <span>Building *</span>
                    <input
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({...formData, building: e.target.value})}
                      required
                    />
                  </label>
                  
                  <label className="field">
                    <span>Floor *</span>
                    <input
                      type="number"
                      value={formData.floor}
                      onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                      min="0"
                      required
                    />
                  </label>
                </div>

                <div className="grid-2" style={{ gap: 16 }}>
                  <label className="field">
                    <span>Room Type *</span>
                    <select
                      value={formData.roomType}
                      onChange={(e) => setFormData({...formData, roomType: e.target.value as any})}
                      required
                    >
                      <option value="Lab">Lab</option>
                      <option value="Classroom">Classroom</option>
                      <option value="Auditorium">Auditorium</option>
                      <option value="Seminar_Hall">Seminar Hall</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  
                  <label className="field">
                    <span>Total Capacity *</span>
                    <input
                      type="number"
                      value={formData.totalCapacity}
                      onChange={(e) => setFormData({...formData, totalCapacity: parseInt(e.target.value)})}
                      min="1"
                      required
                    />
                  </label>
                </div>

                {/* Seat Management Mode */}
                <label className="field">
                  <span>Seat Management Mode *</span>
                  <select
                    value={formData.seatManagementMode}
                    onChange={(e) => setFormData({...formData, seatManagementMode: e.target.value as any})}
                    required
                  >
                    <option value="Individual">Individual (Assign specific seats like A1, B2)</option>
                    <option value="Capacity_Only">Capacity Only (Just track total count)</option>
                  </select>
                  <small style={{ color: 'var(--muted)', marginTop: 4 }}>
                    Individual: For labs/classrooms with specific seat assignments. Capacity Only: For auditoriums.
                  </small>
                </label>

                {/* Conditional fields for Individual mode */}
                {formData.seatManagementMode === 'Individual' && (
                  <div className="grid-2" style={{ gap: 16 }}>
                    <label className="field">
                      <span>Seats Per Row *</span>
                      <input
                        type="number"
                        value={formData.seatsPerRow || ''}
                        onChange={(e) => setFormData({...formData, seatsPerRow: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </label>
                    
                    <label className="field">
                      <span>Total Rows *</span>
                      <input
                        type="number"
                        value={formData.totalRows || ''}
                        onChange={(e) => setFormData({...formData, totalRows: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </label>
                  </div>
                )}

                {/* Features */}
                <div>
                  <h3 style={{ marginBottom: 12 }}>Room Features</h3>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasProjector}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasProjector: e.target.checked}})}
                      />
                      <span>Projector</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasWhiteboard}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasWhiteboard: e.target.checked}})}
                      />
                      <span>Whiteboard</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasAC}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasAC: e.target.checked}})}
                      />
                      <span>Air Conditioning</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasWifi}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasWifi: e.target.checked}})}
                      />
                      <span>WiFi</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasDesktops}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasDesktops: e.target.checked}})}
                      />
                      <span>Desktops</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.hasSoundSystem}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, hasSoundSystem: e.target.checked}})}
                      />
                      <span>Sound System</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={formData.features.isAccessible}
                        onChange={(e) => setFormData({...formData, features: {...formData.features, isAccessible: e.target.checked}})}
                      />
                      <span>Wheelchair Accessible</span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="submit" className="primary-button">
                    {editingRoom ? 'Update Room' : 'Create Room'}
                  </button>
                  <button 
                    type="button" 
                    className="secondary-button"
                    onClick={() => { setShowForm(false); setEditingRoom(null); resetForm(); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="stack" style={{ gap: 16 }}>
        {rooms.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)' }}>No rooms found. Create your first room to get started.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room._id} 
              className="card" 
              style={{ 
                padding: 20,
                borderLeft: `4px solid ${getRoomTypeColor(room.roomType)}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{room.roomName}</h3>
                    <span 
                      className="chip"
                      style={{ 
                        background: getRoomTypeColor(room.roomType),
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                    >
                      {room.roomType}
                    </span>
                    {/* Booking Status Badge */}
                    {room.bookingStatus === 'Occupied' && (
                      <span className="chip" style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem' }}>
                        🔴 Occupied
                      </span>
                    )}
                    {room.bookingStatus === 'Upcoming' && (
                      <span className="chip" style={{ background: '#f59e0b', color: 'white', fontSize: '0.75rem' }}>
                        🟡 Upcoming
                      </span>
                    )}
                    {room.bookingStatus === 'Available' && room.isActive && (
                      <span className="chip" style={{ background: '#10b981', color: 'white', fontSize: '0.75rem' }}>
                        🟢 Available
                      </span>
                    )}
                  </div>
                  
                  <p style={{ margin: '4px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    {room.building} • Floor {room.floor} • Room {room.roomNumber}
                  </p>
                  
                  <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    <div>
                      <strong>Capacity:</strong> {room.totalCapacity}
                    </div>
                    <div>
                      <strong>Available:</strong> 
                      <span style={{ color: room.availableCapacity > 0 ? '#10b981' : '#ef4444', marginLeft: 4 }}>
                        {room.availableCapacity}
                      </span>
                    </div>
                    <div>
                      <strong>Mode:</strong> {room.seatManagementMode === 'Individual' ? 'Individual Seats' : 'Capacity Only'}
                    </div>
                    {room.seatManagementMode === 'Individual' && (
                      <div>
                        <strong>Layout:</strong> {room.totalRows} rows × {room.seatsPerRow} seats
                      </div>
                    )}
                  </div>
                  
                  {/* Features */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {room.features.hasProjector && <span className="chip">Projector</span>}
                    {room.features.hasWhiteboard && <span className="chip">Whiteboard</span>}
                    {room.features.hasAC && <span className="chip">AC</span>}
                    {room.features.hasWifi && <span className="chip">WiFi</span>}
                    {room.features.hasDesktops && <span className="chip">Desktops</span>}
                    {room.features.hasSoundSystem && <span className="chip">Sound System</span>}
                    {room.features.isAccessible && <span className="chip">Accessible</span>}
                  </div>
                  
                  {room.currentUsage.isOccupied && room.currentUsage.occupiedBy && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 8, 
                      background: 'var(--secondary)', 
                      borderRadius: 6,
                      fontSize: '0.85rem'
                    }}>
                      <strong>Currently occupied by:</strong> {room.currentUsage.occupiedBy}
                      {room.seatManagementMode === 'Individual' 
                        ? ` (${room.currentUsage.occupiedSeats} seats occupied)`
                        : ` (${room.currentUsage.registeredCount} registered)`
                      }
                    </div>
                  )}
                  
                  {/* Current Booking Info */}
                  {room.currentBooking && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12,
                      background: 'rgba(239, 68, 68, 0.1)', 
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Clock size={14} style={{ color: '#ef4444' }} />
                        <strong style={{ color: '#ef4444' }}>Currently Booked</strong>
                      </div>
                      <div style={{ marginLeft: 20 }}>
                        <div><strong>{room.currentBooking.title}</strong></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
                          Until {new Date(room.currentBooking.endTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Next Booking Info */}
                  {room.nextBooking && !room.currentBooking && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12,
                      background: 'rgba(245, 158, 11, 0.1)', 
                      borderRadius: 8,
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Calendar size={14} style={{ color: '#f59e0b' }} />
                        <strong style={{ color: '#f59e0b' }}>Next Booking</strong>
                      </div>
                      <div style={{ marginLeft: 20 }}>
                        <div><strong>{room.nextBooking.title}</strong></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(room.nextBooking.startTime).toLocaleString()} - {new Date(room.nextBooking.endTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="secondary-button"
                    onClick={() => window.location.href = `/dashboard/admin/rooms/${room._id}`}
                  >
                    View Details
                  </button>
                  <button 
                    className="secondary-button"
                    onClick={() => handleEdit(room)}
                  >
                    Edit
                  </button>
                  <button 
                    className="secondary-button"
                    onClick={() => handleDelete(room._id)}
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PageScreen>
  );
}
