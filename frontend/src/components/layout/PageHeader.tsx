import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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
              style={{
                width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 6, transition: 'all 0.18s',
              }}
            >
              <ArrowLeft size={15} />
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
