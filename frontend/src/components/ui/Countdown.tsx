import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
  targetDate: string;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    isPast:  false,
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 64 }}>
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          fontSize: '2rem', fontWeight: 800, color: 'var(--text)',
          background: 'var(--surface)', borderRadius: 14,
          padding: '10px 14px', marginBottom: 6,
          border: '1px solid var(--border)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  );
}

export function Countdown({ targetDate, label = 'Event starts in' }: CountdownProps) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (time.isPast) return null;

  return (
    <div style={{
      padding: '18px 22px', borderRadius: 18,
      background: 'linear-gradient(135deg, rgba(107,163,255,0.1), rgba(107,163,255,0.05))',
      border: '1px solid rgba(107,163,255,0.25)',
    }}>
      <p style={{ margin: '0 0 14px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {time.days > 0 && <Digit value={time.days} label="Days" />}
        {(time.days > 0 || time.hours > 0) && (
          <>
            {time.days > 0 && <span style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: 20 }}>:</span>}
            <Digit value={time.hours} label="Hours" />
          </>
        )}
        <span style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: 20 }}>:</span>
        <Digit value={time.minutes} label="Minutes" />
        <span style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: 20 }}>:</span>
        <Digit value={time.seconds} label="Seconds" />
      </div>
    </div>
  );
}
