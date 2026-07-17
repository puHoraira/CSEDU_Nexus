import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import toast from 'react-hot-toast';

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  bio?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  onSuccess?: () => void;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function EditUserModal({ isOpen, onClose, user, onSuccess }: Props) {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    bio: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        bio: user.bio || '',
      });
      setError('');
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest(`/admin/users/${user?._id}`, { 
        method: 'PUT', 
        token, 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => {
      toast.success('User info updated');
      qc.invalidateQueries({ queryKey: ['admin'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => setError(normalizeApiError(err)),
  });

  const handleSubmit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    setError('');
    mutation.mutate(form);
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Personal Info"
      description={`Update profile details for ${user.firstName} ${user.lastName}`}
      size="lg"
      footer={
        <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button variant="primary" leftIcon={CheckCircle2} onClick={handleSubmit} isLoading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      }
    >
      {error && <Alert variant="error" title={error} style={{ marginBottom: 16 }} />}

      <div className="ui-grid-2" style={{ gap: 16 }}>
        <label className="ui-input-wrap">
          <span className="ui-input-label">First Name *</span>
          <input
            className="ui-input"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Last Name *</span>
          <input
            className="ui-input"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Email (read-only)</span>
          <input className="ui-input" value={user.email} disabled style={{ opacity: 0.6 }} />
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Phone</span>
          <input
            className="ui-input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+880..."
          />
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Date of Birth</span>
          <input
            className="ui-input"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          />
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Gender</span>
          <select
            className="ui-select"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="">Select...</option>
            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <label className="ui-input-wrap">
          <span className="ui-input-label">Blood Group</span>
          <select
            className="ui-select"
            value={form.bloodGroup}
            onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
          >
            <option value="">Select...</option>
            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </label>
      </div>

      <label className="ui-input-wrap" style={{ marginTop: 16 }}>
        <span className="ui-input-label">Bio</span>
        <textarea
          className="ui-textarea"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          placeholder="Short bio..."
        />
      </label>
    </Modal>
  );
}
