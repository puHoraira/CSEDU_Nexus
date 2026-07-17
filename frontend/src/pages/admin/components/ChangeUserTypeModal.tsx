import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import toast from 'react-hot-toast';

type UserType = 'Student' | 'Teacher' | 'Alumni';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  currentType: UserType;
  onSuccess?: () => void;
}

export function ChangeUserTypeModal({ isOpen, onClose, userId, userName, currentType, onSuccess }: Props) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [targetType, setTargetType] = useState<string>('');
  const [typeData, setTypeData] = useState<Record<string, string>>({});

  const availableTypes = (['Student', 'Teacher', 'Alumni'] as const).filter(t => t !== currentType);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/users/${userId}/change-type`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ targetType: targetType.toLowerCase(), typeData }),
      }),
    onSuccess: () => {
      toast.success(`${userName} converted to ${targetType}. They will need to log in again.`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      onSuccess?.();
      onClose();
      resetForm();
    },
    onError: (err: any) => setError(normalizeApiError(err)),
  });

  const resetForm = () => {
    setTargetType('');
    setTypeData({});
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const setField = (key: string, value: string) =>
    setTypeData(prev => ({ ...prev, [key]: value }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change User Type"
      description={`Convert ${userName} from ${currentType} to a different type.`}
      size="md"
      footer={
        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>Cancel</Button>
          <Button
            variant="primary"
            leftIcon={CheckCircle2}
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!targetType}
          >
            Convert
          </Button>
        </div>
      }
    >
      {error && <Alert variant="error" title={error} style={{ marginBottom: 16 }} />}

      <Alert variant="warning" title="This is a significant action" style={{ marginBottom: 16 }}>
        Changing a user's type will modify their records and access permissions.
        Make sure this is intentional.
      </Alert>

      <div className="ui-flex-col" style={{ gap: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <RefreshCw size={18} style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Current type:</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{currentType}</span>
        </div>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Convert to</span>
          <select
            className="ui-input"
            value={targetType}
            onChange={e => { setTargetType(e.target.value); setTypeData({}); }}
          >
            <option value="">Select target type...</option>
            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        {targetType === 'Teacher' && (
          <div className="ui-grid-2">
            <label className="ui-input-wrap">
              <span className="ui-input-label">Employee ID *</span>
              <input className="ui-input" value={typeData.employeeId || ''} onChange={e => setField('employeeId', e.target.value)} placeholder="e.g. DU-CSE-001" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Designation *</span>
              <select className="ui-input" value={typeData.designation || ''} onChange={e => setField('designation', e.target.value)}>
                <option value="">Select...</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Professor">Professor</option>
              </select>
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Joining Date</span>
              <input className="ui-input" type="date" value={typeData.joiningDate || ''} onChange={e => setField('joiningDate', e.target.value)} />
            </label>
          </div>
        )}

        {targetType === 'Student' && (
          <div className="ui-grid-2">
            <label className="ui-input-wrap">
              <span className="ui-input-label">Student ID *</span>
              <input className="ui-input" value={typeData.studentId || ''} onChange={e => setField('studentId', e.target.value)} placeholder="e.g. BM-032" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Batch *</span>
              <input className="ui-input" type="number" value={typeData.batch || ''} onChange={e => setField('batch', e.target.value)} placeholder="e.g. 28" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Current Year</span>
              <select className="ui-input" value={typeData.currentYear || ''} onChange={e => setField('currentYear', e.target.value)}>
                <option value="">Select...</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Academic Year Level</span>
              <select className="ui-input" value={typeData.academicYearLevel || ''} onChange={e => setField('academicYearLevel', e.target.value)}>
                <option value="">Select...</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="MS">MS</option>
              </select>
            </label>
          </div>
        )}

        {targetType === 'Alumni' && (
          <div className="ui-grid-2">
            <label className="ui-input-wrap">
              <span className="ui-input-label">Graduation Year *</span>
              <input className="ui-input" type="number" value={typeData.graduatedYear || ''} onChange={e => setField('graduatedYear', e.target.value)} placeholder="e.g. 2024" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Final CGPA</span>
              <input className="ui-input" type="number" step="0.01" value={typeData.finalCgpa || ''} onChange={e => setField('finalCgpa', e.target.value)} placeholder="e.g. 3.75" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Current Employer</span>
              <input className="ui-input" value={typeData.currentEmployer || ''} onChange={e => setField('currentEmployer', e.target.value)} placeholder="Company name" />
            </label>
            <label className="ui-input-wrap">
              <span className="ui-input-label">Position</span>
              <input className="ui-input" value={typeData.currentPosition || ''} onChange={e => setField('currentPosition', e.target.value)} placeholder="Job title" />
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
