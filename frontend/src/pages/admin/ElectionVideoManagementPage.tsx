import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Video, Eye, Calendar, Users, FileVideo } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

type Election = {
  _id: string;
  name: string;
  description: string;
  status: string;
  electionType: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export function ElectionVideoManagementPage() {
  const { token } = useAuth();

  const electionsQuery = useQuery({
    queryKey: ['all-elections'],
    queryFn: () => apiRequest<Election[]>('/enhanced-elections', { token }),
    enabled: Boolean(token),
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'info';
      case 'InProgress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  if (electionsQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
        <Spinner size="xl" label="Loading elections…" />
      </div>
    );
  }

  const elections = electionsQuery.data || [];

  return (
    <div className="ui-page">
      <PageHeader
        title="Election Video Management"
        description="View and audit voting verification videos for all elections"
      />

      {elections.length === 0 ? (
        <div className="ui-card">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileVideo size={48} style={{ color: 'var(--muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
              No Elections Found
            </h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Elections will appear here once they are created.
            </p>
          </div>
        </div>
      ) : (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">
              <Video size={18} style={{ marginRight: 8 }} />
              All Elections ({elections.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Select an election to view its voting verification videos
            </p>
          </div>
          <div className="ui-card__body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gap: 0 }}>
              {elections.map((election) => (
                <Link
                  key={election._id}
                  to={`/dashboard/admin/election-videos/${election._id}`}
                  style={{
                    display: 'block',
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                  className="hover-bg"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                          {election.name}
                        </h4>
                        <Badge variant={getStatusColor(election.status) as any}>
                          {election.status.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </div>
                      
                      {election.description && (
                        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                          {election.description.length > 150
                            ? `${election.description.slice(0, 150)}...`
                            : election.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          <span>
                            {formatDate(election.startDate)} - {formatDate(election.endDate)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} />
                          <span>{election.electionType.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm">
                      <Eye size={14} style={{ marginRight: 6 }} />
                      View Videos
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg:hover {
          background: var(--surface);
        }
      `}</style>
    </div>
  );
}
