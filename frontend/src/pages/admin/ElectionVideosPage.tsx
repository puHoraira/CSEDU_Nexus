import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Video, Download, Eye, Calendar, User, Clock, FileVideo, ArrowLeft, Shield } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type VoteRecording = {
  _id: string;
  voterId: {
    _id: string;
    studentId: string;
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  };
  electionId: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  duration: number;
  fileSizeBytes: number;
  voteId: string | null;
  uploadedAt: string;
  createdAt: string;
};

type Election = {
  _id: string;
  name: string;
  description: string;
  status: string;
};

export function ElectionVideosPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const { token } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<VoteRecording | null>(null);

  const electionQuery = useQuery({
    queryKey: ['election', electionId],
    queryFn: () => apiRequest<Election>(`/enhanced-elections/${electionId}`, { token }),
    enabled: Boolean(token && electionId),
  });

  const videosQuery = useQuery({
    queryKey: ['election-videos', electionId],
    queryFn: () => apiRequest<VoteRecording[]>(`/elections/recordings/${electionId}`, { token }),
    enabled: Boolean(token && electionId),
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (videosQuery.isLoading || electionQuery.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
        <Spinner size="xl" label="Loading voting videos…" />
      </div>
    );
  }

  const election = electionQuery.data;
  const videos = videosQuery.data || [];

  return (
    <div className="ui-page">
      <PageHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/dashboard/elections">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <span>Voting Videos: {election?.name}</span>
          </div>
        }
        description={`View and audit all voter verification videos for this election`}
      />

      <Alert variant="info" style={{ marginBottom: 24 }}>
        <Shield size={16} />
        <strong>Admin Only:</strong> These videos are for election auditing and verification purposes. 
        Handle with confidentiality and in accordance with election regulations.
      </Alert>

      {videos.length === 0 ? (
        <div className="ui-card">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Video size={48} style={{ color: 'var(--muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
              No Voting Videos Yet
            </h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              Voting videos will appear here as voters cast their ballots with video verification.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Summary Card */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">
                <FileVideo size={18} style={{ marginRight: 8 }} />
                Video Summary
              </h3>
            </div>
            <div className="ui-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{videos.length}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Total Recordings</div>
                </div>
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                    {videos.filter(v => v.voteId).length}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Linked to Votes</div>
                </div>
                <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
                    {formatFileSize(videos.reduce((sum, v) => sum + v.fileSizeBytes, 0))}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Total Storage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Video List */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">
                All Voting Videos ({videos.length})
              </h3>
            </div>
            <div className="ui-card__body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Voter</th>
                      <th>Student ID</th>
                      <th>Duration</th>
                      <th>File Size</th>
                      <th>Uploaded At</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video) => (
                      <tr key={video._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <User size={16} style={{ color: 'var(--muted)' }} />
                            <span style={{ fontWeight: 500 }}>
                              {video.voterId.userId.firstName} {video.voterId.userId.lastName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
                            {video.voterId.studentId}
                          </code>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={14} style={{ color: 'var(--muted)' }} />
                            {formatDuration(video.duration)}
                          </div>
                        </td>
                        <td>{formatFileSize(video.fileSizeBytes)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} style={{ color: 'var(--muted)' }} />
                            {formatDate(video.uploadedAt)}
                          </div>
                        </td>
                        <td>
                          {video.voteId ? (
                            <Badge variant="success">Voted</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedVideo(video)}
                            >
                              <Eye size={14} style={{ marginRight: 4 }} />
                              View
                            </Button>
                            <a href={video.secureUrl} download target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Download size={14} />
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{
              background: 'var(--panel-strong)',
              borderRadius: 12,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 600 }}>
                    Voting Video - {selectedVideo.voterId.userId.firstName} {selectedVideo.voterId.userId.lastName}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    <span>Student ID: {selectedVideo.voterId.studentId}</span>
                    <span>•</span>
                    <span>Duration: {formatDuration(selectedVideo.duration)}</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedVideo.fileSizeBytes)}</span>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedVideo(null)}>
                  ✕
                </Button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <video
                controls
                autoPlay
                style={{
                  width: '100%',
                  borderRadius: 8,
                  background: '#000',
                }}
                src={selectedVideo.secureUrl}
              >
                Your browser does not support the video tag.
              </video>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge variant={selectedVideo.voteId ? 'success' : 'warning'}>
                    {selectedVideo.voteId ? 'Vote Recorded' : 'Pending Vote'}
                  </Badge>
                </div>
                <a href={selectedVideo.secureUrl} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download size={16} style={{ marginRight: 6 }} />
                    Download
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
