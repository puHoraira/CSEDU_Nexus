import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import toast from 'react-hot-toast';

export const EmailVerificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isSending, setIsSending] = useState(false);

  if (!user || user.emailVerified || !isVisible) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsSending(true);
    try {
      const response = await apiRequest('/auth/send-verification', {
        method: 'POST',
      });

      if (response.success) {
        toast.success('Verification email sent! Check your inbox.');
        // Show preview URL in development
        if (response.data.previewUrl && process.env.NODE_ENV === 'development') {
          console.log('Email preview:', response.data.previewUrl);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage to remember user's choice
    localStorage.setItem('email-verification-dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-200 rounded-full" />
          <div className="absolute top-8 -left-8 w-16 h-16 bg-orange-200 rounded-full" />
        </div>

        <div className="relative px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-sm font-medium text-amber-800">
                    Email Verification Required
                  </h3>
                  <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 rounded-full">
                    <Mail className="w-3 h-3 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">
                      Unverified
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-amber-700">
                  Please verify your email address <strong>{user.email}</strong> to access all features and receive important notifications.
                </p>
                
                <div className="mt-3 flex items-center space-x-4">
                  <button
                    onClick={handleSendVerification}
                    disabled={isSending}
                    className="inline-flex items-center space-x-2 text-sm font-medium text-amber-800 hover:text-amber-900 transition-colors disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Verification Email</span>
                      </>
                    )}
                  </button>
                  
                  <span className="text-amber-600">•</span>
                  
                  <p className="text-xs text-amber-600">
                    Check your spam folder if you don't see it
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-200">
          <motion.div
            className="h-full bg-amber-400"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Alternative compact version for use in headers/navbars
export const CompactEmailVerificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  if (!user || user.emailVerified) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsSending(true);
    try {
      await apiRequest('/auth/send-verification', { method: 'POST' });
      toast.success('Verification email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-100 border-b border-amber-200 px-4 py-2"
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-amber-800">
            Please verify your email to access all features
          </span>
        </div>
        
        <button
          onClick={handleSendVerification}
          disabled={isSending}
          className="inline-flex items-center space-x-1 text-amber-700 hover:text-amber-900 font-medium transition-colors disabled:opacity-50"
        >
          {isSending ? (
            <>
              <div className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Mail className="w-3 h-3" />
              <span>Send Email</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};