import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Registration = {
  _id: string;
  registrationNumber: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentTransactionId?: string;
  eventId: {
    _id: string;
    title: string;
  };
};

export function EventPaymentPage() {
  const { eventId, registrationId } = useParams<{ eventId: string; registrationId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if coming from payment gateway callback
  const paymentID = searchParams.get("paymentID");
  const val_id = searchParams.get("val_id");
  const gateway = searchParams.get("gateway");

  // Fetch registration details
  const registrationQuery = useQuery({
    queryKey: ["registration", registrationId],
    queryFn: () => apiRequest<Registration>(`/registrations/${registrationId}`, { token }),
    enabled: Boolean(token && registrationId),
  });

  // Initiate payment mutation
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ paymentUrl: string; paymentData: any }>(
        `/registrations/${registrationId}/payment/initiate`,
        {
          method: "POST",
          token,
          body: JSON.stringify({}),
        }
      );
    },
    onSuccess: (data) => {
      // Redirect to payment gateway
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setIsProcessing(false);
    },
  });

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (gatewayResponse: any) => {
      return apiRequest(`/registrations/${registrationId}/payment/verify`, {
        method: "POST",
        token,
        body: JSON.stringify(gatewayResponse),
      });
    },
    onSuccess: () => {
      setMessage({ type: "success", text: "Payment verified successfully!" });
      setTimeout(() => {
        navigate(`/dashboard/events/${eventId}`);
      }, 2000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setIsProcessing(false);
    },
  });

  // Auto-verify payment if coming from gateway callback
  useEffect(() => {
    if (paymentID && gateway === "bkash" && !isProcessing) {
      setIsProcessing(true);
      verifyPaymentMutation.mutate({ paymentID });
    } else if (val_id && gateway === "sslcommerz" && !isProcessing) {
      setIsProcessing(true);
      verifyPaymentMutation.mutate({ val_id });
    }
  }, [paymentID, val_id, gateway]);

  function handleInitiatePayment() {
    setMessage(null);
    setIsProcessing(true);
    initiatePaymentMutation.mutate();
  }

  if (registrationQuery.isLoading) {
    return (
      <PageScreen title="Payment">
        <div className="notice">Loading payment details...</div>
      </PageScreen>
    );
  }

  if (!registrationQuery.data) {
    return (
      <PageScreen title="Payment">
        <div className="alert">Registration not found</div>
      </PageScreen>
    );
  }

  const registration = registrationQuery.data;

  // If payment already completed
  if (registration.paymentStatus === "Completed") {
    return (
      <PageScreen title="Payment Completed">
        <div className="payment-status-card success">
          <div className="payment-status-icon">✓</div>
          <h2>Payment Successful!</h2>
          <p>Your payment has been confirmed.</p>
          <div className="payment-details">
            <div className="detail-row">
              <span>Registration Number:</span>
              <strong>{registration.registrationNumber}</strong>
            </div>
            <div className="detail-row">
              <span>Amount Paid:</span>
              <strong>৳{registration.paymentAmount}</strong>
            </div>
            {registration.paymentTransactionId && (
              <div className="detail-row">
                <span>Transaction ID:</span>
                <strong>{registration.paymentTransactionId}</strong>
              </div>
            )}
          </div>
          <button className="primary-button" onClick={() => navigate(`/dashboard/events/${eventId}`)}>
            Back to Event
          </button>
        </div>
      </PageScreen>
    );
  }

  // If verifying payment
  if (isProcessing) {
    return (
      <PageScreen title="Processing Payment">
        <div className="payment-status-card processing">
          <div className="spinner"></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your payment.</p>
        </div>
      </PageScreen>
    );
  }

  return (
    <PageScreen title="Complete Payment" subtitle={`Registration #${registration.registrationNumber}`}>
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      <div className="payment-page-layout">
        <div className="payment-card">
          <div className="payment-card__header">
            <h3>{registration.eventId.title}</h3>
            <p className="text-muted">Complete your payment to confirm registration</p>
          </div>

          <div className="payment-card__details">
            <div className="detail-row">
              <span>Registration Number:</span>
              <strong>{registration.registrationNumber}</strong>
            </div>
            <div className="detail-row">
              <span>Payment Method:</span>
              <strong>{registration.paymentMethod}</strong>
            </div>
            <div className="detail-row">
              <span>Amount:</span>
              <strong className="amount">৳{registration.paymentAmount}</strong>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <span className={`status-badge ${registration.paymentStatus.toLowerCase()}`}>
                {registration.paymentStatus}
              </span>
            </div>
          </div>

          <div className="payment-card__actions">
            <button
              className="primary-button"
              onClick={handleInitiatePayment}
              disabled={initiatePaymentMutation.isPending}
            >
              {initiatePaymentMutation.isPending ? "Processing..." : `Pay ৳${registration.paymentAmount}`}
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate(`/dashboard/events/${eventId}`)}
            >
              Cancel
            </button>
          </div>

          <div className="payment-card__info">
            <p className="text-muted">
              You will be redirected to {registration.paymentMethod} payment gateway to complete the transaction.
            </p>
          </div>
        </div>
      </div>
    </PageScreen>
  );
}
