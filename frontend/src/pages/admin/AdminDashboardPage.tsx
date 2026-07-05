import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { 
  Users, TrendingUp, Award, Calendar, 
  Activity, UserCheck, FileText, Shield,
  BarChart3, PieChart, Clock, AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newUsersThisMonth: number;
    ecMembersCount: number;
  };
  memberDistribution: {
    byAcademicYear: Array<{ year: string; count: number }>;
    byBatch: Array<{ batch: number; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  roles: {
    totalRoles: number;
    activeAssignments: number;
  };
  upcoming: {
    elections: number;
    events: number;
    workshops: number;
  };
  pending: {
    certificates: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    timestamp: string;
    actor: { name: string; email: string } | null;
  }>;
}

interface QuickStats {
  activeMembers: number;
  activeUsers: number;
  activeElections: number;
  pendingCertificates: number;
}

export function AdminDashboardPage() {
  const { token } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-dashboard-stats', token],
    queryFn: () => apiRequest<DashboardStats>('/admin/dashboard/stats', { token }),
    enabled: Boolean(token),
  });

  const { data: quickStats } = useQuery({
    queryKey: ['admin-quick-stats', token],
    queryFn: () => apiRequest<QuickStats>('/admin/dashboard/quick-stats', { token }),
    enabled: Boolean(token),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const overview = stats?.overview;
  const distribution = stats?.memberDistribution;
  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Admin Dashboard"
        description="System overview, statistics, and quick actions"
      />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <QuickStatCard
          icon={UserCheck}
          title="Active Members"
          value={quickStats?.activeMembers || overview?.activeMembers || 0}
          color="blue"
          href="/dashboard/admin/members"
        />
        <QuickStatCard
          icon={Users}
          title="Active Users"
          value={quickStats?.activeUsers || overview?.totalUsers || 0}
          color="green"
          href="/dashboard/admin/users"
        />
        <QuickStatCard
          icon={Award}
          title="Active Elections"
          value={quickStats?.activeElections || stats?.upcoming.elections || 0}
          color="purple"
          href="/dashboard/elections"
        />
        <QuickStatCard
          icon={FileText}
          title="Pending Certificates"
          value={quickStats?.pendingCertificates || stats?.pending.certificates || 0}
          color="orange"
          href="/dashboard/certificates"
        />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Member Overview */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Member Overview</h3>
              <p className="text-sm text-gray-500">Total membership stats</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <StatRow label="Total Members" value={overview?.totalMembers || 0} />
            <StatRow 
              label="Active Members" 
              value={overview?.activeMembers || 0}
              badge="success"
            />
            <StatRow 
              label="Inactive Members" 
              value={overview?.inactiveMembers || 0}
              badge="warning"
            />
            <StatRow 
              label="EC Members" 
              value={overview?.ecMembersCount || 0}
              badge="purple"
            />
            <StatRow 
              label="New This Month" 
              value={overview?.newUsersThisMonth || 0}
              badge="info"
            />
          </div>
        </Card>

        {/* Role Distribution */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Role Management</h3>
              <p className="text-sm text-gray-500">System roles overview</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <StatRow label="Total Roles" value={stats?.roles.totalRoles || 0} />
            <StatRow 
              label="Active Assignments" 
              value={stats?.roles.activeAssignments || 0}
              badge="success"
            />
            
            <div className="pt-4 border-t">
              <a 
                href="/dashboard/admin/roles"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                Manage Roles →
              </a>
            </div>
          </div>
        </Card>

        {/* Upcoming Activities */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Upcoming</h3>
              <p className="text-sm text-gray-500">Scheduled activities</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <StatRow 
              label="Elections" 
              value={stats?.upcoming.elections || 0}
              icon={Award}
            />
            <StatRow 
              label="Events" 
              value={stats?.upcoming.events || 0}
              icon={Calendar}
            />
            <StatRow 
              label="Workshops" 
              value={stats?.upcoming.workshops || 0}
              icon={Activity}
            />
            <StatRow 
              label="Pending Certificates" 
              value={stats?.pending.certificates || 0}
              icon={FileText}
              badge={stats?.pending.certificates ? 'warning' : undefined}
            />
          </div>
        </Card>
      </div>

      {/* Academic Year Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Academic Year Distribution</h3>
                <p className="text-sm text-gray-500">Members by year level</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {distribution?.byAcademicYear.map((item) => (
              <div key={item.year} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      {item.year?.replace('_', ' ') || 'Unknown'}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.count / (overview?.totalMembers || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <PieChart className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Recent Batches</h3>
                <p className="text-sm text-gray-500">Latest batch distribution</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {distribution?.byBatch.slice(0, 8).map((item) => (
              <div key={item.batch} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    {item.batch}
                  </div>
                  <span className="text-sm font-medium">Batch {item.batch}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{item.count} members</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gray-100 rounded-xl">
            <Clock className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest system actions</p>
          </div>
          <a 
            href="/dashboard/admin/audit-logs"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </a>
        </div>

        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{activity.actor?.name || 'System'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{activity.action}</span>
                    {activity.resource && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{activity.resource}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeTime(new Date(activity.timestamp))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// Helper Components
function QuickStatCard({ 
  icon: Icon, 
  title, 
  value, 
  color, 
  href 
}: { 
  icon: any; 
  title: string; 
  value: number; 
  color: string;
  href?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  const card = (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        </div>
        <div className={`p-4 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </Card>
  );

  return href ? <a href={href}>{card}</a> : card;
}

function StatRow({ 
  label, 
  value, 
  badge,
  icon: Icon
}: { 
  label: string; 
  value: number | string;
  badge?: 'success' | 'warning' | 'info' | 'purple';
  icon?: any;
}) {
  const badgeClasses = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      {badge ? (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClasses[badge]}`}>
          {value}
        </span>
      ) : (
        <span className="font-semibold">{value}</span>
      )}
    </div>
  );
}
