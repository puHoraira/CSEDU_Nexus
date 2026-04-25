import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

type ResultType = 'success' | 'fail' | 'cancel';

export function WorkshopPaymentResultPage({ type }: { type: ResultType }) {
  const [params] = useSearchParams();

  const config = {
    success: {
      icon: CheckCircle,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.3)',
      title: 'Payment Successful!',
      message: 'Your workshop registration is confirmed. Check your email for details and your QR code.',
    },
    fail: {
      icon: XCircle,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.3)',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again or contact support.',
    },
    cancel: {
      icon: AlertCircle,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.3)',
      title: 'Payment Cancelled',
      message: 'You cancelled the payment. Your registration is still pending payment.',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          padding: '48px 32px', borderRadius: 24,
          background: config.bg, border: `1px solid ${config.border}`,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          style={{ display: 'inline-flex', marginBottom: 24 }}
        >
          <Icon size={72} style={{ color: config.color }} />
        </motion.div>

        <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          {config.title}
        </h2>
        <p style={{ margin: '0 0 32px', color: 'var(--muted)', lineHeight: 1.6 }}>
          {config.message}
        </p>

        <div className="ui-flex ui-flex-gap-3" style={{ justifyContent: 'center' }}>
          <Button href="/dashboard/workshops">Back to Workshops</Button>
          {type !== 'success' && (
            <Button variant="outline" href="/dashboard/workshops">Try Again</Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
