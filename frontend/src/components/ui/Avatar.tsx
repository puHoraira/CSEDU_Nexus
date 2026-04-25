import { HTMLAttributes, forwardRef } from 'react';
import { User } from 'lucide-react';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  shape?: 'circle' | 'square';
}

const sizes: Record<string, { px: number; font: string }> = {
  xs:  { px: 24,  font: '0.65rem' },
  sm:  { px: 32,  font: '0.78rem' },
  md:  { px: 40,  font: '0.9rem'  },
  lg:  { px: 48,  font: '1.1rem'  },
  xl:  { px: 64,  font: '1.4rem'  },
  '2xl': { px: 96, font: '2rem'   },
};

const statusColors: Record<string, string> = {
  online:  '#10b981',
  offline: '#94a3b8',
  away:    '#f59e0b',
  busy:    '#ef4444',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, shape = 'circle', style, ...props }, ref) => {
    const { px, font } = sizes[size] ?? sizes.md;
    const initials = name ? getInitials(name) : null;

    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: px,
          height: px,
          borderRadius: shape === 'circle' ? '50%' : 10,
          background: 'var(--gradient-primary)',
          color: '#fff',
          fontWeight: 700,
          fontSize: font,
          overflow: 'hidden',
          ...style,
        }}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User size={px * 0.45} />
        )}

        {status && (
          <span style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: px <= 32 ? 8 : 11,
            height: px <= 32 ? 8 : 11,
            borderRadius: '50%',
            background: statusColors[status],
            border: '2px solid var(--bg)',
          }} />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

// Avatar Group
export interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string; alt?: string }>;
  max?: number;
  size?: AvatarProps['size'];
}

export function AvatarGroup({ avatars, max = 3, size = 'md' }: AvatarGroupProps) {
  const shown = avatars.slice(0, max);
  const remaining = avatars.length - max;
  const { px, font } = sizes[size] ?? sizes.md;

  return (
    <div style={{ display: 'flex' }}>
      {shown.map((a, i) => (
        <Avatar
          key={i}
          src={a.src}
          name={a.name}
          alt={a.alt}
          size={size}
          style={{ marginLeft: i > 0 ? -px * 0.3 : 0, border: '2px solid var(--bg)' }}
        />
      ))}
      {remaining > 0 && (
        <div style={{
          width: px, height: px, borderRadius: '50%',
          background: 'var(--surface)', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: font, fontWeight: 700,
          marginLeft: -px * 0.3,
          border: '2px solid var(--bg)',
        }}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
