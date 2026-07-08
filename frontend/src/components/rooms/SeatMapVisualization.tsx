import React from 'react';
import { Box, Paper, Typography, Grid, Tooltip, Alert, Progress } from '@mantine/core';
import { IconArmchair, IconX, IconCheck, IconClock } from '@tabler/icons-react';

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
      <Paper p="lg" withBorder>
        <Typography size="lg" weight={600} mb="md">
          Capacity Overview
        </Typography>
        
        <Box mb="xl">
          <Progress
            size="xl"
            sections={[
              { value: (occupiedCount / room.capacity) * 100, color: 'red', label: 'Occupied' },
              { value: (reservedCount / room.capacity) * 100, color: 'yellow', label: 'Reserved' },
              { value: (blockedCount / room.capacity) * 100, color: 'gray', label: 'Blocked' },
              { value: (availableCount / room.capacity) * 100, color: 'green', label: 'Available' },
            ]}
          />
        </Box>

        <Grid>
          <Grid.Col span={6}>
            <Paper p="md" withBorder bg="green.0">
              <Typography color="green" weight={600}>Available</Typography>
              <Typography size="xl" weight={700}>{availableCount}</Typography>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" withBorder bg="red.0">
              <Typography color="red" weight={600}>Occupied</Typography>
              <Typography size="xl" weight={700}>{occupiedCount}</Typography>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" withBorder bg="yellow.0">
              <Typography color="orange" weight={600}>Reserved</Typography>
              <Typography size="xl" weight={700}>{reservedCount}</Typography>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" withBorder bg="gray.0">
              <Typography color="gray" weight={600}>Blocked</Typography>
              <Typography size="xl" weight={700}>{blockedCount}</Typography>
            </Paper>
          </Grid.Col>
        </Grid>

        <Alert mt="lg" icon={<IconArmchair size={16} />}>
          Total Capacity: {room.capacity} seats
        </Alert>
      </Paper>
    );
  }

  // For Individual mode, show seat grid
  if (!room.seats || room.seats.length === 0) {
    return (
      <Alert color="yellow">
        No seats configured for this room.
      </Alert>
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
      return 'blue.6';
    }
    switch (seat.status) {
      case 'Available':
        return 'green.5';
      case 'Occupied':
        return 'red.6';
      case 'Reserved':
        return 'yellow.5';
      case 'Blocked':
        return 'gray.5';
      default:
        return 'gray.3';
    }
  };

  const getSeatIcon = (seat: Seat) => {
    switch (seat.status) {
      case 'Available':
        return <IconCheck size={16} />;
      case 'Occupied':
        return <IconX size={16} />;
      case 'Reserved':
        return <IconClock size={16} />;
      case 'Blocked':
        return <IconX size={16} />;
      default:
        return <IconArmchair size={16} />;
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
    <Paper p="lg" withBorder>
      <Typography size="lg" weight={600} mb="md">
        Seat Map - {room.roomName}
      </Typography>

      {/* Front of room indicator */}
      <Box mb="xl">
        <Paper p="xs" bg="gray.1" style={{ textAlign: 'center' }}>
          <Typography size="sm" color="dimmed" weight={600}>
            ↑ FRONT / STAGE / BOARD ↑
          </Typography>
        </Paper>
      </Box>

      {/* Seat grid */}
      <Box>
        {sortedRows.map(rowNumber => (
          <Box key={rowNumber} mb="sm">
            <Typography size="xs" color="dimmed" mb={4}>
              Row {String.fromCharCode(64 + rowNumber)}
            </Typography>
            <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {seatsByRow[rowNumber].map(seat => (
                <Tooltip
                  key={seat.seatNumber}
                  label={getSeatTooltip(seat)}
                  withArrow
                  multiline
                  w={200}
                >
                  <Paper
                    p="xs"
                    withBorder
                    bg={getSeatColor(seat)}
                    style={{
                      cursor: onSeatClick ? 'pointer' : 'default',
                      minWidth: '60px',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': onSeatClick ? {
                        transform: 'scale(1.05)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      } : {},
                    }}
                    onClick={() => onSeatClick && onSeatClick(seat)}
                  >
                    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      {getSeatIcon(seat)}
                      <Typography size="sm" weight={600} color="white">
                        {seat.seatNumber}
                      </Typography>
                    </Box>
                  </Paper>
                </Tooltip>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box mt="xl" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
        <Typography size="sm" weight={600} mb="sm">
          Legend:
        </Typography>
        <Box style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box w={20} h={20} bg="green.5" style={{ borderRadius: '4px' }} />
            <Typography size="sm">Available</Typography>
          </Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box w={20} h={20} bg="red.6" style={{ borderRadius: '4px' }} />
            <Typography size="sm">Occupied</Typography>
          </Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box w={20} h={20} bg="yellow.5" style={{ borderRadius: '4px' }} />
            <Typography size="sm">Reserved</Typography>
          </Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box w={20} h={20} bg="gray.5" style={{ borderRadius: '4px' }} />
            <Typography size="sm">Blocked</Typography>
          </Box>
          {highlightSeats.length > 0 && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box w={20} h={20} bg="blue.6" style={{ borderRadius: '4px' }} />
              <Typography size="sm">Your Seat</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Room features */}
      {room.features && Object.keys(room.features).length > 0 && (
        <Box mt="md">
          <Typography size="sm" weight={600} mb="xs">
            Room Features:
          </Typography>
          <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {room.features.projector && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">🎥 Projector</Typography>
              </Paper>
            )}
            {room.features.whiteboard && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">📝 Whiteboard</Typography>
              </Paper>
            )}
            {room.features.AC && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">❄️ AC</Typography>
              </Paper>
            )}
            {room.features.WiFi && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">📶 WiFi</Typography>
              </Paper>
            )}
            {room.features.desktops && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">💻 Desktops</Typography>
              </Paper>
            )}
            {room.features.soundSystem && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">🔊 Sound System</Typography>
              </Paper>
            )}
            {room.features.accessibility && (
              <Paper px="sm" py={4} bg="blue.0" style={{ borderRadius: '16px' }}>
                <Typography size="xs">♿ Accessible</Typography>
              </Paper>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default SeatMapVisualization;
