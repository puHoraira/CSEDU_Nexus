const { EventRegistration } = require("../models/EventRegistration");
const { Event } = require("../models/Event");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");
const { PaymentFactory } = require("./payment/PaymentFactory");

class EventRegistrationService {
  /**
   * Register for an event
   */
  static async registerForEvent(eventId, payload, userId, requestId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // Check if registration is required
    if (!event.registrationRequired) {
      throw new ApiError(400, "This event does not require registration");
    }

    // Check event status
    if (["Completed", "Cancelled"].includes(event.status)) {
      throw new ApiError(409, "Registration is closed for this event");
    }

    // Check registration dates
    const now = new Date();
    if (event.registrationSettings.openDate && now < event.registrationSettings.openDate) {
      throw new ApiError(409, "Registration has not opened yet");
    }
    if (event.registrationSettings.closeDate && now > event.registrationSettings.closeDate) {
      throw new ApiError(409, "Registration has closed");
    }

    // Check if already registered
    const existing = await EventRegistration.findOne({ eventId, userId });
    if (existing) {
      throw new ApiError(409, "You are already registered for this event");
    }

    // Check capacity
    const maxParticipants = event.registrationSettings.maxParticipants;
    if (maxParticipants > 0) {
      const currentCount = await EventRegistration.countDocuments({
        eventId,
        status: { $in: ["Confirmed", "Pending"] },
      });

      if (currentCount >= maxParticipants) {
        if (!event.registrationSettings.allowWaitlist) {
          throw new ApiError(409, "Event is full");
        }
        // Will be added to waitlist
      }
    }

    // Get member info if user is a member
    const member = await Member.findOne({ userId });

    // Determine payment requirement
    const registrationFee = event.registrationSettings.registrationFee || 0;
    const paymentRequired = registrationFee > 0;
    const paymentMethod = payload.paymentMethod || (paymentRequired ? "bKash" : "Free");

    // Validate payment method
    if (paymentRequired && !PaymentFactory.isSupported(paymentMethod)) {
      throw new ApiError(400, `Payment method ${paymentMethod} is not supported`);
    }

    // Generate registration number
    const registrationNumber = await EventRegistration.generateRegistrationNumber(eventId);

    // Determine initial status
    let status = "Pending";
    if (!paymentRequired) {
      status = event.registrationSettings.requiresApproval ? "Pending" : "Confirmed";
    }

    // Check if should be waitlisted
    if (maxParticipants > 0) {
      const confirmedCount = await EventRegistration.countDocuments({
        eventId,
        status: "Confirmed",
      });
      if (confirmedCount >= maxParticipants && event.registrationSettings.allowWaitlist) {
        status = "Waitlisted";
      }
    }

    // Create registration
    const registration = await EventRegistration.create({
      eventId,
      userId,
      memberId: member?._id,
      registrationNumber,
      status,
      paymentRequired,
      paymentStatus: paymentRequired ? "Pending" : "Not_Required",
      paymentAmount: registrationFee,
      paymentMethod,
      attendeeInfo: {
        name: payload.attendeeInfo.name,
        email: payload.attendeeInfo.email,
        phone: payload.attendeeInfo.phone,
        organization: payload.attendeeInfo.organization || "",
        designation: payload.attendeeInfo.designation || "",
        specialRequirements: payload.attendeeInfo.specialRequirements || "",
      },
      registeredBy: userId,
    });

    // Update event stats
    await Event.findByIdAndUpdate(eventId, {
      $inc: { "stats.totalRegistrations": 1 },
    });

    // Log audit
    await AuditService.log({
      actorId: userId,
      action: "EVENT_REGISTRATION_CREATED",
      resource: "EventRegistration",
      resourceId: registration._id.toString(),
      requestId,
      metadata: {
        eventId: eventId.toString(),
        registrationNumber,
        paymentRequired,
        status,
      },
    });

    // Send notification
    await NotificationService.createForUser(userId, {
      title: "Event Registration Successful",
      message: `You have registered for ${event.title}. Registration #${registrationNumber}`,
      category: "Event",
      actionUrl: `/dashboard/events/${eventId}/registration/${registration._id}`,
      entityType: "EventRegistration",
      entityId: registration._id.toString(),
      metadata: { eventId: eventId.toString(), registrationNumber },
    });

    return registration;
  }

  /**
   * Initiate payment for registration
   */
  static async initiatePayment(registrationId, userId, requestId) {
    const registration = await EventRegistration.findById(registrationId).populate("eventId", "title");
    if (!registration) {
      throw new ApiError(404, "Registration not found");
    }

    if (registration.userId.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized");
    }

    if (!registration.paymentRequired) {
      throw new ApiError(400, "Payment is not required for this registration");
    }

    if (registration.paymentStatus === "Completed") {
      throw new ApiError(409, "Payment already completed");
    }

    // Get payment processor
    const processor = PaymentFactory.getPaymentProcessor(registration.paymentMethod);
    if (!processor) {
      throw new ApiError(400, `Payment method ${registration.paymentMethod} requires manual processing`);
    }

    // Get user info for payment
    const user = await require("../models/User").User.findById(userId);

    // Initiate payment
    const paymentResult = await processor.initiatePayment({
      transactionId: registration.registrationNumber,
      amount: registration.paymentAmount,
      currency: "BDT",
      customerInfo: {
        name: registration.attendeeInfo.name,
        email: registration.attendeeInfo.email,
        phone: registration.attendeeInfo.phone,
        address: user.address || "N/A",
        city: "Dhaka",
        country: "Bangladesh",
      },
      metadata: {
        eventId: registration.eventId._id.toString(),
        userId: userId.toString(),
        registrationId: registration._id.toString(),
        productName: `Event Registration - ${registration.eventId.title}`,
        category: "Event",
      },
    });

    // Update registration with payment info
    registration.paymentTransactionId = paymentResult.paymentId || paymentResult.sessionKey;
    registration.paymentGatewayResponse = paymentResult.gatewayResponse;
    await registration.save();

    // Log audit
    await AuditService.log({
      actorId: userId,
      action: "EVENT_REGISTRATION_PAYMENT_INITIATED",
      resource: "EventRegistration",
      resourceId: registration._id.toString(),
      requestId,
      metadata: {
        paymentMethod: registration.paymentMethod,
        amount: registration.paymentAmount,
      },
    });

    return {
      registration,
      paymentUrl: paymentResult.bkashURL || paymentResult.gatewayPageURL,
      paymentData: paymentResult,
    };
  }

  /**
   * Verify payment completion
   */
  static async verifyPayment(registrationId, gatewayResponse, requestId) {
    const registration = await EventRegistration.findById(registrationId).populate("eventId", "title");
    if (!registration) {
      throw new ApiError(404, "Registration not found");
    }

    if (registration.paymentStatus === "Completed") {
      return { success: true, message: "Payment already verified", registration };
    }

    // Get payment processor
    const processor = PaymentFactory.getPaymentProcessor(registration.paymentMethod);
    if (!processor) {
      throw new ApiError(400, "Cannot verify payment for this method");
    }

    // Verify payment
    const verificationResult = await processor.verifyPayment(
      registration.registrationNumber,
      gatewayResponse
    );

    if (verificationResult.success) {
      // Update registration
      registration.paymentStatus = "Completed";
      registration.paymentTransactionId = verificationResult.transactionId;
      registration.paymentDate = new Date();
      registration.paymentGatewayResponse = verificationResult.gatewayResponse;
      registration.status = "Confirmed";
      await registration.save();

      // Log audit
      await AuditService.log({
        actorId: registration.userId,
        action: "EVENT_REGISTRATION_PAYMENT_COMPLETED",
        resource: "EventRegistration",
        resourceId: registration._id.toString(),
        requestId,
        metadata: {
          transactionId: verificationResult.transactionId,
          amount: verificationResult.amount,
        },
      });

      // Send notification
      await NotificationService.createForUser(registration.userId, {
        title: "Payment Successful",
        message: `Your payment for ${registration.eventId.title} has been confirmed`,
        category: "Event",
        actionUrl: `/dashboard/events/${registration.eventId._id}/registration/${registration._id}`,
        entityType: "EventRegistration",
        entityId: registration._id.toString(),
      });

      return { success: true, message: "Payment verified successfully", registration };
    } else {
      // Payment failed
      registration.paymentStatus = "Failed";
      registration.paymentGatewayResponse = verificationResult.gatewayResponse;
      await registration.save();

      throw new ApiError(400, verificationResult.error || "Payment verification failed");
    }
  }

  /**
   * Cancel registration
   */
  static async cancelRegistration(registrationId, userId, reason, requestId) {
    const registration = await EventRegistration.findById(registrationId).populate("eventId", "title eventDate");
    if (!registration) {
      throw new ApiError(404, "Registration not found");
    }

    if (registration.userId.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized");
    }

    if (registration.status === "Cancelled") {
      throw new ApiError(409, "Registration already cancelled");
    }

    if (registration.status === "Attended") {
      throw new ApiError(409, "Cannot cancel after attending event");
    }

    // Process refund if payment was completed
    if (registration.paymentStatus === "Completed" && registration.paymentAmount > 0) {
      const processor = PaymentFactory.getPaymentProcessor(registration.paymentMethod);
      if (processor) {
        try {
          await processor.processRefund(
            registration.paymentTransactionId,
            registration.paymentAmount,
            reason || "Registration cancelled by user"
          );
          registration.paymentStatus = "Refunded";
        } catch (error) {
          console.error("Refund failed:", error);
          // Continue with cancellation even if refund fails
        }
      }
    }

    // Update registration
    registration.status = "Cancelled";
    registration.cancelledAt = new Date();
    registration.cancellationReason = reason || "";
    await registration.save();

    // Update event stats
    await Event.findByIdAndUpdate(registration.eventId._id, {
      $inc: { "stats.totalRegistrations": -1 },
    });

    // Log audit
    await AuditService.log({
      actorId: userId,
      action: "EVENT_REGISTRATION_CANCELLED",
      resource: "EventRegistration",
      resourceId: registration._id.toString(),
      requestId,
      metadata: { reason },
    });

    return registration;
  }

  /**
   * Get registration details
   */
  static async getRegistration(registrationId, userId) {
    const registration = await EventRegistration.findById(registrationId)
      .populate("eventId")
      .populate("userId", "firstName lastName email avatarUrl")
      .populate("memberId", "studentId batch currentYear");

    if (!registration) {
      throw new ApiError(404, "Registration not found");
    }

    if (registration.userId._id.toString() !== userId.toString()) {
      throw new ApiError(403, "Unauthorized");
    }

    return registration;
  }

  /**
   * Get user's registrations
   */
  static async getUserRegistrations(userId) {
    return EventRegistration.find({ userId })
      .populate("eventId")
      .sort({ createdAt: -1 });
  }

  /**
   * Get event registrations (for organizers)
   */
  static async getEventRegistrations(eventId) {
    return EventRegistration.find({ eventId })
      .populate("userId", "firstName lastName email avatarUrl phone")
      .populate("memberId", "studentId batch currentYear")
      .sort({ createdAt: -1 });
  }
}

module.exports = { EventRegistrationService };
