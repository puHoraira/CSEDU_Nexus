import { useState, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Event = {
  _id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  coverImage?: string;
  registrationSettings: {
    registrationFee: number;
    maxParticipants: number;
    requiresApproval: boolean;
  };
  stats: {
    totalRegistrations: number;
  };
};

type PaymentMethod = "Free" | "Cash" | "bKash" | "Nagad" | "Rocket" | "SSLCommerz" | "Stripe";

export function EventRegistrationPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email || "",
    phone: user?.phone || "",
    organization: "",
    designation: "",
    specialRequirements: "",
    paymentMethod: "Free" as PaymentMethod,
  });

  // Fetch event details
  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => apiRequest<Event>(`/events/${eventId}`, { token }),
    enabled: Boolean(token && eventId),
  });

  const registrationFee = eventQuery.data?.registrationSettings?.registrationFee || 0;
  const requiresPayment = registrationFee > 0;

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/events/${eventId}/register`, {
        method: "POST",
        token,
        body: JSON.stringify({
          attendeeInfo: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            organization: form.organization,
            designation: form.designation,
            specialRequirements: form.specialRequirements,
          },
          paymentMethod: requiresPayment ? form.paymentMethod : "Free",
        }),
      });
    },
    onSuccess: (data) => {
      // Show success message with seat assignment if available
      let successMsg = "Registration successful!";
      if (data?.seatAssignment?.roomId) {
        const roomInfo = data.seatAssignment;
        successMsg += ` You have been assigned to ${roomInfo.roomId.roomName} (Room ${roomInfo.roomId.roomNumber})`;
        if (roomInfo.seatNumber) {
          successMsg += `, Seat ${roomInfo.seatNumber}`;
        }
        successMsg += ".";
      }
      
      setMessage({ type: "success", text: successMsg });
      
      // If payment required, redirect to payment page
      if (requiresPayment && form.paymentMethod !== "Cash") {
        setTimeout(() => {
          navigate(`/dashboard/events/${eventId}/registration/${data._id}/payment`);
        }, 2500);
      } else {
        setTimeout(() => {
          navigate(`/dashboard/events/${eventId}`);
        }, 3000);
      }
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    // Validation
    if (!form.name || !form.email || !form.phone) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    if (requiresPayment && !form.paymentMethod) {
      setMessage({ type: "error", text: "Please select a payment method" });
      return;
    }

    registerMutation.mutate();
  }

  if (eventQuery.isLoading) {
    return <PageScreen title="Event Registration"><div className="notice">Loading event details...</div></PageScreen>;
  }

  if (!eventQuery.data) {
    return <PageScreen title="Event Registration"><div className="alert">Event not found</div></PageScreen>;
  }

  const event = eventQuery.data;
  const spotsLeft = event.registrationSettings.maxParticipants > 0
    ? event.registrationSettings.maxParticipants - event.stats.totalRegistrations
    : null;

  return (
    <PageScreen
      title={`Register for ${event.title}`}
      subtitle="Complete the form below to register for this event"
    >
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      <div className="event-registration-layout">
        {/* Event Summary Card */}
        <aside className="event-registration-sidebar">
          <div className="event-summary-card">
            {event.coverImage && (
              <img src={event.coverImage} alt={event.title} className="event-summary-card__image" />
            )}
            <div className="event-summary-card__content">
              <h3>{event.title}</h3>
              <div className="event-summary-card__details">
                <div className="detail-item">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Venue:</span>
                  <span className="detail-value">{event.venue}</span>
                </div>
                {registrationFee > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Fee:</span>
                    <span className="detail-value fee-amount">৳{registrationFee}</span>
                  </div>
                )}
                {spotsLeft !== null && (
                  <div className="detail-item">
                    <span className="detail-label">Spots Left:</span>
                    <span className={`detail-value ${spotsLeft < 10 ? "text-warning" : ""}`}>
                      {spotsLeft} / {event.registrationSettings.maxParticipants}
                    </span>
                  </div>
                )}
              </div>
              
              {event.registrationSettings.requiresApproval && (
                <div className="info" style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                  <strong>Note:</strong> Your registration will be reviewed by organizers before confirmation.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Registration Form */}
        <main className="event-registration-main">
          <form onSubmit={handleSubmit} className="event-registration-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Full Name *</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </label>
                <label className="field">
                  <span>Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                    required
                  />
                </label>
                <label className="field">
                  <span>Phone *</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+8801XXXXXXXXX"
                    required
                  />
                </label>
                <label className="field">
                  <span>Organization</span>
                  <input
                    value={form.organization}
                    onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
                    placeholder="Your organization (optional)"
                  />
                </label>
                <label className="field">
                  <span>Designation</span>
                  <input
                    value={form.designation}
                    onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
                    placeholder="Your designation (optional)"
                  />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Special Requirements</span>
                  <textarea
                    value={form.specialRequirements}
                    onChange={(e) => setForm((prev) => ({ ...prev, specialRequirements: e.target.value }))}
                    placeholder="Any dietary restrictions, accessibility needs, etc. (optional)"
                    rows={3}
                  />
                </label>
              </div>
            </div>

            {requiresPayment && (
              <div className="form-section">
                <h3>Payment Method</h3>
                <div className="payment-methods">
                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bKash"
                      checked={form.paymentMethod === "bKash"}
                      onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                    />
                    <div className="payment-method-content">
                      <div className="payment-method-icon">💳</div>
                      <div className="payment-method-info">
                        <strong>bKash</strong>
                        <small>Mobile payment</small>
                      </div>
                    </div>
                  </label>

                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="SSLCommerz"
                      checked={form.paymentMethod === "SSLCommerz"}
                      onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                    />
                    <div className="payment-method-content">
                      <div className="payment-method-icon">💳</div>
                      <div className="payment-method-info">
                        <strong>SSLCommerz</strong>
                        <small>Card/Mobile Banking</small>
                      </div>
                    </div>
                  </label>

                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash"
                      checked={form.paymentMethod === "Cash"}
                      onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                    />
                    <div className="payment-method-content">
                      <div className="payment-method-icon">💵</div>
                      <div className="payment-method-info">
                        <strong>Cash</strong>
                        <small>Pay at venue</small>
                      </div>
                    </div>
                  </label>
                </div>

                {form.paymentMethod === "Cash" && (
                  <div className="info" style={{ marginTop: "1rem" }}>
                    You will need to pay ৳{registrationFee} in cash at the event venue.
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate(`/dashboard/events/${eventId}`)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : requiresPayment && form.paymentMethod !== "Cash" ? "Continue to Payment" : "Complete Registration"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </PageScreen>
  );
}
