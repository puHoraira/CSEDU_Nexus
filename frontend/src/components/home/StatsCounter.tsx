import { useEffect, useState } from "react";

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
}

interface StatsCounterProps {
  stats: StatItem[];
}

export function StatsCounter({ stats }: StatsCounterProps) {
  return (
    <div className="stats-counter">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} delay={index * 100} />
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix = "", icon, delay }: StatItem & { delay: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div className="stat-counter-card">
      {icon && <div className="stat-counter-card__icon">{icon}</div>}
      <div className="stat-counter-card__value">
        {count}
        {suffix}
      </div>
      <div className="stat-counter-card__label">{label}</div>
    </div>
  );
}
