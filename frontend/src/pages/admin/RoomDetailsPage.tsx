import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PageScreen } from '../../components/ui/PageScreen';
import { SeatMapVisualization } from '../../components/rooms/SeatMapVisualization';

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
  features: any;
  availableCapacity: number;
  isActive: boolean;
  currentUsage: {
    isOccupied: boolean;
    occupiedBy?: string;
    eventId?: any;
    workshopId?: any;
    occupiedSeats: number;
    registeredCount: number;
    startTime?: string;
    endTime?: string;
  };
  description?: string;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export function RoomDetailsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [seatMap, setSeatMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchRoomDetails();
    fetchSeatMap();
  }, [roomId]);

  const fetchRoomDetails = async () => {
    try {
      setLoading(true);
      const response: any = await apiRequest(`/rooms/${roomId}`, { token });
      setRoom(response);
    } catch (error) {
      console.error('Error fetching room:', error);
      alert('Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeatMap = async () => {
    try {
      const response: any = await apiRequest(`/rooms/${roomId}/seat-map`, { token });
      setSeatMap(response);
    } catch (error) {
      console.error('Error fetching seat map:', error);
    }
  };

  const handleDownloadAssignments = async (format: 'json' | 'csv') => {
    if (!room?.currentUsage?.eventId && !room?.currentUsage?.workshopId) {
      alert('No active event/workshop to export');
      return;
    }

    try {
      setDownloading(true);
      const type = room.currentUsage.eventId ? 'event' : 'workshop';
      const id = room.currentUsage.eventId?._id || room.currentUsage.workshopId?._id;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/rooms/export/${type}/${id}?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${id}-room-assignments.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${id}-room-assignments.json`;
        a.click();
      }
    } catch (error) {
      console.error('Error downloading assignments:', error);
      alert('Failed to download assignments');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !room) {
    return (
      <PageScreen title="Room Details">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoadingSpinner size="lg" />
          <p>Loading room details...</p>
        </div>
      </PageScreen>
    );
  }

  return (
    <PageScreen 
      title={room.roomName}
      subtitle={`${room.building} • Floor ${room.floor} • Room ${room.roomNumber}`}
    >
      <div style={{ marginBottom: 16 }}>
        <button 
          className="secondary-button"
          onClick={() => navigate('/dashboard/rooms')}
        >
          ← Back to Rooms
        </button>
      </div>

      {/* Room Overview */}
      <div className="grid-2" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Room Information</h3>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <strong>Type:</strong> {room.roomType}
            </div>
            <div>
              <strong>Total Capacity:</strong> {room.totalCapacity}
            </div>
            <div>
              <strong>Available Capacity:</strong>{' '}
              <span style={{ color: room.availableCapacity > 0 ? '#10b981' : '#ef4444' }}>
                {room.availableCapacity}
              </span>
            </div>
            <div>
              <strong>Seat Management:</strong> {room.seatManagementMode === 'Individual' ? 'Individual Seats' : 'Capacity Only'}
            </div>
            {room.seatManagementMode === 'Individual' && (
              <div>
                <strong>Layout:</strong> {room.totalRows} rows × {room.seatsPerRow} seats per row
              </div>
            )}
            <div>
              <strong>Status:</strong>{' '}
              <span style={{ color: room.currentUsage.isOccupied ? '#ef4444' : '#10b981' }}>
                {room.currentUsage.isOccupied ? 'Occupied' : 'Available'}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Features</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {room.features.hasProjector && <span className="chip">📽️ Projector</span>}
            {room.features.hasWhiteboard && <span className="chip">🖊️ Whiteboard</span>}
            {room.features.hasAC && <span className="chip">❄️ AC</span>}
            {room.features.hasWifi && <span className="chip">📡 WiFi</span>}
            {room.features.hasDesktops && <span className="chip">💻 Desktops</span>}
            {room.features.hasSoundSystem && <span className="chip">🔊 Sound System</span>}
            {room.features.isAccessible && <span className="chip">♿ Accessible</span>}
          </div>
        </div>
      </div>

      {/* Current Usage */}
      {room.currentUsage.isOccupied && (
        <div className="card" style={{ padding: 20, marginBottom: 24, background: '#fef3c7' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔴</span> Currently Occupied
          </h3>
          <div className="stack" style={{ gap: 8 }}>
            <div>
              <strong>Event/Workshop:</strong> {room.currentUsage.occupiedBy}
            </div>
            {room.seatManagementMode === 'Individual' ? (
              <div>
                <strong>Seats Occupied:</strong> {room.currentUsage.occupiedSeats} / {room.totalCapacity}
              </div>
            ) : (
              <div>
                <strong>Registered:</strong> {room.currentUsage.registeredCount} / {room.totalCapacity}
              </div>
            )}
            {room.currentUsage.startTime && (
              <div>
                <strong>Period:</strong> {new Date(room.currentUsage.startTime).toLocaleString()} - {room.currentUsage.endTime ? new Date(room.currentUsage.endTime).toLocaleString() : 'TBD'}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button 
              className="primary-button"
              onClick={() => handleDownloadAssignments('csv')}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
            <button 
              className="secondary-button"
              onClick={() => handleDownloadAssignments('json')}
              disabled={downloading}
            >
              Download JSON
            </button>
          </div>
        </div>
      )}

      {/* Seat Map Visualization */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Seat Map</h3>
        {seatMap ? (
          <SeatMapVisualization seatMap={seatMap} roomName={room.roomName} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <LoadingSpinner />
            <p>Loading seat map...</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="card" style={{ padding: 20, marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Metadata</h3>
        <div className="stack" style={{ gap: 8, fontSize: '0.9rem' }}>
          <div>
            <strong>Created By:</strong> {room.createdBy.firstName} {room.createdBy.lastName} ({room.createdBy.email})
          </div>
          <div>
            <strong>Created At:</strong> {new Date(room.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </PageScreen>
  );
}
