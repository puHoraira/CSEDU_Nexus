import {
  Bell, Calendar, Users, Award, Landmark, FileCheck, Vote, Megaphone,
  Settings, GraduationCap, type LucideIcon,
} from 'lucide-react';

export type NotificationCategory =
  | 'System' | 'Meeting' | 'Membership' | 'Governance' | 'Certificate'
  | 'Event' | 'Workshop' | 'General' | 'Announcement' | 'Election';

export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  category: NotificationCategory | string;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
};

type CategoryMeta = {
  icon: LucideIcon;
  /** CSS color for the icon + accent */
  color: string;
  label: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  System:      { icon: Settings,      color: '#64748b', label: 'System' },
  Meeting:     { icon: Users,         color: '#6ba3ff', label: 'Meeting' },
  Membership:  { icon: GraduationCap, color: '#10b981', label: 'Membership' },
  Governance:  { icon: Landmark,      color: '#f59e0b', label: 'Governance' },
  Certificate: { icon: FileCheck,     color: '#8b5cf6', label: 'Certificate' },
  Event:       { icon: Calendar,      color: '#ec4899', label: 'Event' },
  Workshop:    { icon: Award,         color: '#14b8a6', label: 'Workshop' },
  Election:    { icon: Vote,          color: '#f43f5e', label: 'Election' },
  Announcement:{ icon: Megaphone,     color: '#0ea5e9', label: 'Announcement' },
  General:     { icon: Bell,          color: '#6366f1', label: 'General' },
};

const FALLBACK: CategoryMeta = { icon: Bell, color: '#6366f1', label: 'Notification' };

export function categoryMeta(category?: string): CategoryMeta {
  if (!category) return FALLBACK;
  return CATEGORY_META[category] ?? FALLBACK;
}

type PriorityMeta = {
  label: string;
  color: string;
  /** Badge variant name used by the Badge component */
  variant: 'neutral' | 'primary' | 'warning' | 'error';
  /** Whether to visually emphasize (border/dot) in lists */
  emphasize: boolean;
};

const PRIORITY_META: Record<NotificationPriority, PriorityMeta> = {
  Low:    { label: 'Low',    color: '#94a3b8', variant: 'neutral', emphasize: false },
  Normal: { label: 'Normal', color: '#6ba3ff', variant: 'primary', emphasize: false },
  High:   { label: 'High',   color: '#f59e0b', variant: 'warning', emphasize: true },
  Urgent: { label: 'Urgent', color: '#ef4444', variant: 'error',   emphasize: true },
};

export function priorityMeta(priority?: NotificationPriority): PriorityMeta {
  return PRIORITY_META[priority ?? 'Normal'] ?? PRIORITY_META.Normal;
}

/** Convert a hex color to an rgba() background tint. */
export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
