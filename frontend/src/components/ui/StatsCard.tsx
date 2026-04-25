import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { renderIconProp } from '../../lib/iconUtils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: unknown;
  trend?: { value: number; label: string };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export function StatsCard({ title, value, icon, trend, color = 'primary' }: StatsCardProps) {
  const isUp = trend && trend.value > 0;
  const isDown = trend && trend.value < 0;

  return (
    <motion.div
      className={`ui-stat-card ui-color-${color}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ui-stat-card__glow" />
      <div className="ui-stat-card__icon">
        {renderIconProp(icon, 22)}
      </div>
      <div className="ui-stat-card__label">{title}</div>
      <div className="ui-flex ui-flex-between" style={{ alignItems: 'flex-end' }}>
        <div className="ui-stat-card__value">{value}</div>
        {trend && (
          <div className={`ui-stat-card__trend ${isUp ? 'ui-stat-card__trend--up' : isDown ? 'ui-stat-card__trend--down' : ''}`}>
            {isUp && <TrendingUp size={13} />}
            {isDown && <TrendingDown size={13} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      {trend && <div className="ui-text-xs ui-text-muted ui-mt-2">{trend.label}</div>}
    </motion.div>
  );
}
