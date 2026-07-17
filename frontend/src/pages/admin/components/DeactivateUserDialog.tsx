import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
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
  onSuccess?: () => void;
}

export function DeactivateUserDialog({ isOpen, onClose, userId, userName, onSuccess }: Props) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/users/${userId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      toast.success(`${userName} has been deactivated`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => setError(normalizeApiError(err)),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate User"
      size="sm"
      footer={
        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button variant="danger" leftIcon={AlertTriangle} onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Deactivate
          </Button>
        </div>
      }
    >
      {error && <Alert variant="error" title={error} style={{ marginBottom: 16 }} />}

      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--error-50, rgba(239,68,68,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <AlertTriangle size={28} style={{ color: 'var(--error-500, #ef4444)' }} />
        </div>
        <p style={{ color: 'var(--text)', fontSize: '1rem', margin: '0 0 8px', fontWeight: 600 }}>
          Are you sure you want to deactivate <strong>{userName}</strong>?
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
          This will disable their login access and mark their account as inactive.
          This action can be reversed by reactivating the account later.
        </p>
      </div>
    </Modal>
  );
}
