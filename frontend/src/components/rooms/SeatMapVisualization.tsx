import React from 'react';
import { Armchair, X, Check, Clock } from 'lucide-react';

interface Seat {
  seatNumber: string;
  row: number;
  position: number;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Blocked';
  assignedTo?: {
    userId: string;
    userName: string;
    assignedAt: string;
  };
}

interface Room {
  _id: string;
  roomNumber: string;
  roomName: string;
  roomType: string;
  seatManagementMode: 'Individual' | 'Capacity_Only';
  capacity: number;
  seats?: Seat[];
  features?: {
    projector?: boolean;
    whiteboard?: boolean;
    AC?: boolean;
    WiFi?: boolean;
    desktops?: boolean;
    soundSystem?: boolean;
    accessibility?: boolean;
  };
}

interface SeatMapVisualizationProps {
  room: Room;
  onSeatClick?: (seat: Seat) => void;
  highlightSeats?: string[]; // Array of seatNumbers to highlight
}

const SeatMapVisualization: React.FC<SeatMapVisualizationProps> = ({
  room,
  onSeatClick,
  highlightSeats = [],
}) => {
  // For Capacity_Only mode, show progress bar
  if (room.seatManagementMode === 'Capacity_Only') {
    const occupiedCount = room.seats?.filter(s => s.status === 'Occupied').length || 0;
    const reservedCount = room.seats?.filter(s => s.status === 'Reserved').length || 0;
    const blockedCount = room.seats?.filter(s => s.status === 'Blocked').length || 0;
    const availableCount = room.capacity - occupiedCount - reservedCount - blockedCount;
    const usedPercentage = ((occupiedCount + reservedCount) / room.capacity) * 100;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Capacity Overview</h3>
        
        <div className="mb-6">
          <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(occupiedCount / room.capacity) * 100}%` }}
            >
              {occupiedCount > 0 && 'Occupied'}
            </div>
            <div 
              className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(reservedCount / room.capacity) * 100}%` }}
            >
              {reservedCount > 0 && 'Reserved'}
            </div>
            <div 
              className="bg-gray-500 h-full flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(blockedCount / room.capacity) * 100}%` }}
            >
              {blockedCount > 0 && 'Blocked'}
            </div>
            <div 
              className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(availableCount / room.capacity) * 100}%` }}
            >
              {availableCount > 0 && 'Available'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold text-sm">Available</p>
            <p className="text-2xl font-bold text-green-900">{availableCount}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-semibold text-sm">Occupied</p>
            <p className="text-2xl font-bold text-red-900">{occupiedCount}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-orange-700 font-semibold text-sm">Reserved</p>
            <p className="text-2xl font-bold text-orange-900">{reservedCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 font-semibold text-sm">Blocked</p>
            <p className="text-2xl font-bold text-gray-900">{blockedCount}</p>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
          <Armchair className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-900">Total Capacity: {room.capacity} seats</span>
        </div>
      </div>
    );
  }

  // For Individual mode, show seat grid
  if (!room.seats || room.seats.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        No seats configured for this room.
      </div>
    );
  }

  // Group seats by row
  const seatsByRow = room.seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  // Sort rows and seats within rows
  const sortedRows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  sortedRows.forEach(row => {
    seatsByRow[row].sort((a, b) => a.position - b.position);
  });

  const getSeatColor = (seat: Seat) => {
    if (highlightSeats.includes(seat.seatNumber)) {
      return 'bg-blue-600 text-white border-blue-700';
    }
    switch (seat.status) {
      case 'Available':
        return 'bg-green-500 text-white border-green-600';
      case 'Occupied':
        return 'bg-red-600 text-white border-red-700';
      case 'Reserved':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'Blocked':
        return 'bg-gray-500 text-white border-gray-600';
      default:
        return 'bg-gray-300 text-gray-700 border-gray-400';
    }
  };

  const getSeatIcon = (seat: Seat) => {
    switch (seat.status) {
      case 'Available':
        return <Check className="w-4 h-4" />;
      case 'Occupied':
        return <X className="w-4 h-4" />;
      case 'Reserved':
        return <Clock className="w-4 h-4" />;
      case 'Blocked':
        return <X className="w-4 h-4" />;
      default:
        return <Armchair className="w-4 h-4" />;
    }
  };

  const getSeatTooltip = (seat: Seat) => {
    let tooltip = `Seat: ${seat.seatNumber}\nStatus: ${seat.status}`;
    if (seat.assignedTo) {
      tooltip += `\nAssigned to: ${seat.assignedTo.userName}\nAssigned at: ${new Date(seat.assignedTo.assignedAt).toLocaleString()}`;
    }
    return tooltip;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Seat Map - {room.roomName}</h3>

      {/* Front of room indicator */}
      <div className="mb-6">
        <div className="bg-gray-100 border border-gray-200 rounded p-2 text-center">
          <p className="text-sm text-gray-600 font-semibold">
            ↑ FRONT / STAGE / BOARD ↑
          </p>
        </div>
      </div>

      {/* Seat grid */}
      <div>
        {sortedRows.map(rowNumber => (
          <div key={rowNumber} className="mb-3">
            <p className="text-xs text-gray-500 mb-1">
              Row {String.fromCharCode(64 + rowNumber)}
            </p>
            <div className="flex gap-2 flex-wrap">
              {seatsByRow[rowNumber].map(seat => (
                <div
                  key={seat.seatNumber}
                  className={`${getSeatColor(seat)} border-2 rounded p-2 min-w-[60px] text-center transition-all cursor-pointer hover:scale-105 hover:shadow-lg`}
                  onClick={() => onSeatClick && onSeatClick(seat)}
                  title={getSeatTooltip(seat)}
                >
                  <div className="flex items-center justify-center gap-1">
                    {getSeatIcon(seat)}
                    <span className="text-sm font-semibold">{seat.seatNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold mb-3">Legend:</p>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-500 rounded" />
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-600 rounded" />
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-500 rounded" />
            <span className="text-sm">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-500 rounded" />
            <span className="text-sm">Blocked</span>
          </div>
          {highlightSeats.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded" />
              <span className="text-sm">Your Seat</span>
            </div>
          )}
        </div>
      </div>

      {/* Room features */}
      {room.features && Object.keys(room.features).length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">Room Features:</p>
          <div className="flex gap-2 flex-wrap">
            {room.features.projector && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                🎥 Projector
              </span>
            )}
            {room.features.whiteboard && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                📝 Whiteboard
              </span>
            )}
            {room.features.AC && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                ❄️ AC
              </span>
            )}
            {room.features.WiFi && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                📶 WiFi
              </span>
            )}
            {room.features.desktops && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                💻 Desktops
              </span>
            )}
            {room.features.soundSystem && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                🔊 Sound System
              </span>
            )}
            {room.features.accessibility && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                ♿ Accessible
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMapVisualization;
