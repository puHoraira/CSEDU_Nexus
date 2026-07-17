import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  userEmail: string;
  onSuccess?: () => void;
}

export function DeleteUserDialog({ isOpen, onClose, userId, userName, userEmail, onSuccess }: Props) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/users/${userId}/permanent`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      toast.success(`${userName} has been permanently deleted`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      onSuccess?.();
      onClose();
      resetForm();
    },
    onError: (err: any) => setError(normalizeApiError(err)),
  });

  const resetForm = () => {
    setConfirmText('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isConfirmed = confirmText === 'DELETE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Permanently Delete User"
      description="This action cannot be undone and will remove all user data."
      size="md"
      footer={
        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            leftIcon={Trash2}
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!isConfirmed}
          >
            Permanently Delete
          </Button>
        </div>
      }
    >
      {error && <Alert variant="error" title={error} style={{ marginBottom: 16 }} />}

      <Alert
        variant="error"
        title="Warning: This is permanent!"
        style={{ marginBottom: 20 }}
        icon={AlertTriangle}
      >
        <div style={{ marginTop: 8, fontSize: '0.88rem', lineHeight: 1.6 }}>
          This will <strong>permanently delete</strong>:
          <ul style={{ marginTop: 8, marginLeft: 20, marginBottom: 0 }}>
            <li>User account and authentication data</li>
            <li>Student/Teacher/Alumni records</li>
            <li>All assigned roles and permissions</li>
            <li>Related memberships and records</li>
          </ul>
        </div>
      </Alert>

      <div
        style={{
          padding: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 8 }}>
          User to be deleted:
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>
          {userName}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{userEmail}</div>
      </div>

      <label className="ui-input-wrap">
        <span className="ui-input-label">
          Type <code style={{ padding: '2px 6px', background: 'var(--surface)', borderRadius: 4, fontWeight: 700 }}>DELETE</code> to confirm
        </span>
        <input
          className="ui-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE to confirm"
          autoComplete="off"
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        />
      </label>

      {!isConfirmed && confirmText.length > 0 && (
        <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#ef4444' }}>
          Please type "DELETE" exactly to confirm
        </div>
      )}
    </Modal>
  );
}
