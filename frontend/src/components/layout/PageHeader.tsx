import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';

export interface BreadcrumbItem { label: string; href?: string; }

interface Props {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  backButton?: boolean;
}

export function PageHeader({ title, description, breadcrumbs, actions, backButton }: Props) {
  const navigate = useNavigate();
  return (
    <motion.div
      className="ui-page-header"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              {i > 0 && <span className="ui-text-muted ui-text-xs">/</span>}
              {b.href && i < breadcrumbs.length - 1
                ? <Link to={b.href} className="ui-link">{b.label}</Link>
                : <span className="ui-text-xs ui-text-muted">{b.label}</span>
              }
            </span>
          ))}
        </div>
      )}

      <div className="ui-flex ui-flex-between" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="ui-flex ui-flex-gap-3" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          {backButton && (
            <button
              onClick={() => navigate(-1)}
              className="back-button"
              style={{
                width: 38, 
                height: 38, 
                borderRadius: 12, 
                border: '2px solid var(--border)',
                background: 'var(--surface)', 
                color: 'var(--text)', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0, 
                marginTop: 4, 
                transition: 'all 0.2s ease',
                fontWeight: 700,
                fontSize: '22px',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              title="Go back"
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="ui-page-title">{title}</h1>
            {description && <p className="ui-page-desc">{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="ui-flex ui-flex-gap-2" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
