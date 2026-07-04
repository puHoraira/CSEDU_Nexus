import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import toast from 'react-hot-toast';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setVerificationStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail();
  }, [token, email]);

  const verifyEmail = async () => {
    try {
      const response: any = await apiRequest('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      });

      if (response.success) {
        setVerificationStatus('success');
        setMessage('Your email has been verified successfully! You can now log in to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth/login', { state: { emailVerified: true } });
        }, 3000);
      }
    } catch (error: any) {
      setVerificationStatus('error');
      setMessage(error.message || 'Email verification failed. The link may have expired.');
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      await apiRequest('/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  const getIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto" />;
      default:
        return (
          <div className="w-16 h-16 mx-auto">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Mail className="w-16 h-16 text-blue-500" />
            </motion.div>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Email Verified! 🎉';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Verifying Your Email...';
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            {getIcon()}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-2xl font-bold mt-6 ${getStatusColor()}`}
          >
            {getTitle()}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mt-4 leading-relaxed"
          >
            {message}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 space-y-4"
          >
            {verificationStatus === 'success' && (
              <div className="space-y-3">
                <Link
                  to="/auth/login"
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Login
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
                
                <Link
                  to="/"
                  className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Link>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="space-y-3">
                <button
                  onClick={resendVerificationEmail}
                  disabled={isResending || !email}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Resend Verification Email
                    </>
                  )}
                </button>

                <div className="flex gap-3">
                  <Link
                    to="/auth/login"
                    className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                  >
                    Try Login
                  </Link>
                  
                  <Link
                    to="/"
                    className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                  >
                    Home
                  </Link>
                </div>
              </div>
            )}

            {verificationStatus === 'verifying' && (
              <div className="flex justify-center">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-sm text-gray-500"
                >
                  Please wait while we verify your email...
                </motion.div>
              </div>
            )}
          </motion.div>

          {email && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 p-4 bg-gray-50 rounded-lg"
            >
              <p className="text-xs text-gray-500">
                Verifying: <span className="font-medium text-gray-700">{email}</span>
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};