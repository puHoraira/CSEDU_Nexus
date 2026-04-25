import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const all = showHome
    ? [{ label: 'Home', href: '/dashboard/home', icon: Home }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {all.map((item, i) => {
        const isLast = i === all.length - 1;
        const Icon = item.icon;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
              >
                {Icon && <Icon size={13} />}
                {item.label}
              </Link>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: isLast ? 'var(--text)' : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>
                {Icon && <Icon size={13} />}
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
