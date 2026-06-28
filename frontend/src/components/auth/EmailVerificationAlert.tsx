import React, { useState } from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import toast from 'react-hot-toast';

interface EmailVerificationAlertProps {
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
}

export const EmailVerificationAlert: React.FC<EmailVerificationAlertProps> = ({ 
  className = '', 
  variant = 'banner' 
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isSending, setIsSending] = useState(false);

  if (!user || user.emailVerified || !isVisible) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsSending(true);
    try {
      await apiRequest('/auth/send-verification', { method: 'POST' });
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`email-verification-dismissed-${user.id}`, Date.now().toString());
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">Email verification required</p>
          </div>
          <button
            onClick={handleSendVerification}
            disabled={isSending}
            className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
          >
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white border border-yellow-200 rounded-lg shadow-sm p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Verify your email address
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Please verify <span className="font-medium">{user.email}</span> to access all features.
            </p>
            <div className="mt-3 space-x-2">
              <button
                onClick={handleSendVerification}
                disabled={isSending}
                className="inline-flex items-center space-x-1 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-medium hover:bg-yellow-200 transition-colors disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                <span>{isSending ? 'Sending...' : 'Send Verification'}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className={`bg-yellow-50 border-b border-yellow-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Email verification required
              </p>
              <p className="text-xs text-yellow-700">
                Verify {user.email} to access all features
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSendVerification}
              disabled={isSending}
              className="inline-flex items-center space-x-1 text-sm bg-yellow-200 text-yellow-800 px-3 py-1 rounded font-medium hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              <Mail className="w-3 h-3" />
              <span>{isSending ? 'Sending...' : 'Send Email'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};