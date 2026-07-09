const crypto = require('crypto');
const QRCode = require('qrcode');
const SSLCommerzPayment = require('sslcommerz-lts');
const { Workshop }             = require('../models/Workshop');
const { WorkshopRegistration } = require('../models/WorkshopRegistration');
const { Member }               = require('../models/Member');
const { ApiError }             = require('../core/ApiError');
const { checkAudienceEligibility, annotateAudienceRelevance } = require('../utils/audienceUtils');

const storeId   = process.env.SSLCOMMERZ_STORE_ID;
const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
const isLive    = process.env.SSLCOMMERZ_MODE === 'live';
const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:5000';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

class WorkshopService {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  static async createWorkshop(data, userId) {
    const workshop = await Workshop.create({ ...data, createdBy: userId });
    
    // Notify users based on target audience (if specified)
    if (workshop.targetAudience) {
      const hasTargeting = 
        (workshop.targetAudience.allowedYears && workshop.targetAudience.allowedYears.length > 0) ||
        (workshop.targetAudience.allowedBatches && workshop.targetAudience.allowedBatches.length > 0) ||
        (workshop.targetAudience.allowedRoles && workshop.targetAudience.allowedRoles.length > 0) ||
        (workshop.targetAudience.invitedUsers && workshop.targetAudience.invitedUsers.length > 0);

      if (hasTargeting) {
        const { NotificationService } = require('./NotificationService');
        await NotificationService.notifyWorkshopFollowers(workshop._id, {
          title: 'New Workshop Available',
          message: `${workshop.title} has been created`,
          category: 'Workshop',
          actionUrl: `/workshops/${workshop._id}`,
          entityType: 'Workshop',
          entityId: workshop._id.toString(),
        }, { 
          excludeUserIds: [userId],
          notifyTargetAudience: true, // Notify users matching target audience
          includeRegistered: false, // Don't include registered (workshop just created)
        });
      }
    }
    
    return workshop;
  }

  static async listWorkshops(query = {}, requestingUserId = null) {
    const filter = {};
    if (query.status)   filter.status   = query.status;
    if (query.category) filter.category = query.category;
    if (query.search) {
      filter.$or = [
        { title:       { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }
    const workshops = await Workshop.find(filter)
      .sort({ startDate: 1 })
      .populate('createdBy', 'firstName lastName avatarUrl');

    // Apply audience relevance filtering if we know the requesting user
    if (requestingUserId) {
      const { UserRole } = require('../models/UserRole');
      const { Role } = require('../models/Role');
      
      const [member, userRoleRecords] = await Promise.all([
        Member.findOne({ userId: requestingUserId }).select('batch currentYear'),
        UserRole.find({ userId: requestingUserId }).populate('roleId')
      ]);

      const userRoles = userRoleRecords.map(ur => ur.roleId?.roleName).filter(Boolean);

      if (member || userRoles.length > 0) {
        const { filterByAudience } = require('../utils/audienceUtils');
        return filterByAudience(
          workshops.map(w => w.toObject()),
          member,
          requestingUserId,
          userRoles
        );
      }
    }

    // No user context - only show workshops without targeting
    return workshops.filter(w => {
      const ta = w.targetAudience || {};
      const hasAnyFilter = 
        (Array.isArray(ta.allowedYears) && ta.allowedYears.length > 0) ||
        (Array.isArray(ta.allowedBatches) && ta.allowedBatches.length > 0) ||
        (Array.isArray(ta.allowedRoles) && ta.allowedRoles.length > 0) ||
        (Array.isArray(ta.invitedUsers) && ta.invitedUsers.length > 0);
      
      return !hasAnyFilter; // Show only public/open workshops
    });
  }

  static async getWorkshopById(id) {
    const w = await Workshop.findById(id).populate('createdBy', 'firstName lastName avatarUrl');
    if (!w) throw new ApiError(404, 'Workshop not found');
    return w;
  }

  static async updateWorkshop(id, data, userId) {
    const w = await Workshop.findById(id);
    if (!w) throw new ApiError(404, 'Workshop not found');
    
    const changesRequireNotification = 
      (data.startDate !== undefined && data.startDate !== w.startDate) ||
      (data.venue !== undefined && data.venue !== w.venue) ||
      (data.status !== undefined && data.status !== w.status);
    
    Object.assign(w, data);
    await w.save();
    
    // Notify followers and participants of important changes
    if (changesRequireNotification) {
      const { NotificationService } = require('./NotificationService');
      await NotificationService.notifyWorkshopFollowers(w._id, {
        title: 'Workshop Updated',
        message: `${w.title} has been updated. Please check the details.`,
        category: 'Workshop',
        actionUrl: `/workshops/${w._id}`,
        entityType: 'Workshop',
        entityId: w._id.toString(),
      }, { excludeUserIds: [userId] });
    }
    
    return w;
  }

  static async deleteWorkshop(id) {
    await Workshop.findByIdAndDelete(id);
  }

  // ── REGISTRATION ──────────────────────────────────────────────────────────

  static async registerForWorkshop(workshopId, userId, participantData) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, 'Workshop not found');

    if (['Cancelled', 'Completed', 'Registration_Closed'].includes(workshop.status)) {
      throw new ApiError(400, 'Workshop is not open for registration');
    }

    // Check registration deadline (if set) or fall back to endDate
    const deadline = workshop.registrationDeadline || workshop.endDate;
    if (deadline && new Date() > deadline) {
      throw new ApiError(400, 'Registration deadline has passed');
    }

    // Check capacity
    const count = await WorkshopRegistration.countDocuments({
      workshopId,
      status: { $in: ['Pending', 'Approved', 'Waitlisted'] },
    });

    const existing = await WorkshopRegistration.findOne({ workshopId, userId });
    if (existing) throw new ApiError(409, 'You are already registered for this workshop');

    const status = count >= workshop.capacity ? 'Waitlisted'
      : workshop.requiresApproval ? 'Pending'
      : 'Approved';

    const reg = await WorkshopRegistration.create({
      workshopId,
      userId,
      participantName:  participantData.name,
      participantEmail: participantData.email,
      participantPhone: participantData.phone,
      status,
      paymentRequired: !workshop.isFree,
      paymentStatus:   workshop.isFree ? 'Not_Required' : 'Pending',
      paymentAmount:   workshop.fee,
    });

    // If free and auto-approved, generate QR immediately
    if (status === 'Approved' && workshop.isFree) {
      await WorkshopService._generateQR(reg);
      
      // Auto-assign seat if room assignment is enabled
      if (workshop.roomAssignment?.enabled && workshop.roomAssignment?.autoAssignSeats) {
        try {
          const seatAssignment = await WorkshopService.assignSeatToRegistration(reg._id, workshop);
          reg.seatAssignment = seatAssignment;
          await reg.save();
        } catch (error) {
          console.error('Failed to auto-assign seat:', error);
        }
      }
    }

    // Update stats
    await Workshop.findByIdAndUpdate(workshopId, { $inc: { 'stats.totalRegistrations': 1 } });

    // Send confirmation notification
    const { NotificationService } = require('./NotificationService');
    await NotificationService.createForUser(userId, {
      title: 'Workshop Registration Confirmed',
      message: `You have successfully registered for ${workshop.title}`,
      category: 'Workshop',
      actionUrl: `/workshops/${workshopId}`,
      entityType: 'WorkshopRegistration',
      entityId: reg._id.toString(),
    });

    return reg;
  }

  // ── PAYMENT ───────────────────────────────────────────────────────────────

  static async initPayment(registrationId, userId) {
    const reg = await WorkshopRegistration.findById(registrationId).populate('workshopId');
    if (!reg) throw new ApiError(404, 'Registration not found');
    if (reg.userId.toString() !== userId) throw new ApiError(403, 'Forbidden');
    if (reg.paymentStatus === 'Paid') throw new ApiError(400, 'Already paid');
    if (!reg.paymentRequired) throw new ApiError(400, 'This workshop is free');

    if (!storeId || !storePass || storeId === 'your_store_id') {
      throw new ApiError(400, 'Payment gateway not configured. Please add SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD to .env');
    }

    const workshop = reg.workshopId;
    const tranId   = `WS-${reg._id}-${crypto.randomBytes(4).toString('hex')}`;

    reg.transactionId  = tranId;
    reg.paymentGateway = 'SSLCommerz';
    await reg.save();

    const payload = {
      total_amount: reg.paymentAmount,
      currency:     'BDT',
      tran_id:      tranId,
      success_url:  `${backendUrl}/api/v1/workshops/payment/success`,
      fail_url:     `${backendUrl}/api/v1/workshops/payment/fail`,
      cancel_url:   `${backendUrl}/api/v1/workshops/payment/cancel`,
      ipn_url:      `${backendUrl}/api/v1/workshops/payment/ipn`,
      cus_name:     reg.participantName,
      cus_email:    reg.participantEmail,
      cus_add1:     'N/A',
      cus_phone:    reg.participantPhone || 'N/A',
      shipping_method: 'NO',
      product_name:    `Workshop: ${workshop.title}`,
      product_category: 'Workshop',
      product_profile:  'non-physical-goods',
      value_a: registrationId,
      value_b: userId,
    };

    try {
      const sslcz = new SSLCommerzPayment(storeId, storePass, isLive);
      const apiResponse = await sslcz.init(payload);

      if (!apiResponse?.GatewayPageURL) {
        throw new ApiError(400, `Payment gateway error: ${apiResponse?.failedreason || 'Unable to create payment session'}`);
      }

      return { paymentUrl: apiResponse.GatewayPageURL, tranId };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, `Payment init failed: ${err.message}`);
    }
  }

  static async handlePaymentSuccess(body) {
    const registrationId = body.value_a;
    const reg = await WorkshopRegistration.findById(registrationId);
    if (!reg || reg.paymentStatus === 'Paid') return;

    reg.paymentStatus  = 'Paid';
    reg.paidAt         = new Date();
    reg.gatewayPayload = body;

    // Auto-approve on payment if not requiring manual approval
    const workshop = await Workshop.findById(reg.workshopId);
    if (workshop && !workshop.requiresApproval) {
      reg.status = 'Approved';
      await WorkshopService._generateQR(reg);
      await Workshop.findByIdAndUpdate(reg.workshopId, { $inc: { 'stats.totalApproved': 1 } });
      
      // Auto-assign seat if room assignment is enabled
      if (workshop.roomAssignment?.enabled && workshop.roomAssignment?.autoAssignSeats) {
        try {
          const seatAssignment = await WorkshopService.assignSeatToRegistration(reg._id, workshop);
          reg.seatAssignment = seatAssignment;
        } catch (error) {
          console.error('Failed to auto-assign seat:', error);
        }
      }
    }

    await reg.save();
  }

  static async handlePaymentFail(body) {
    const reg = await WorkshopRegistration.findById(body.value_a);
    if (reg) { reg.paymentStatus = 'Failed'; reg.gatewayPayload = body; await reg.save(); }
  }

  static async handlePaymentCancel(body) {
    const reg = await WorkshopRegistration.findById(body.value_a);
    if (reg) { reg.paymentStatus = 'Cancelled'; reg.gatewayPayload = body; await reg.save(); }
  }

  // ── APPROVAL ──────────────────────────────────────────────────────────────

  static async approveRegistration(registrationId) {
    const reg = await WorkshopRegistration.findById(registrationId).populate('workshopId');
    if (!reg) throw new ApiError(404, 'Registration not found');

    // If paid workshop, must be paid first
    if (reg.paymentRequired && reg.paymentStatus !== 'Paid') {
      throw new ApiError(400, 'Payment not completed');
    }

    reg.status = 'Approved';
    await WorkshopService._generateQR(reg);
    
    // Auto-assign seat if room assignment is enabled
    const workshop = reg.workshopId;
    if (workshop.roomAssignment?.enabled && workshop.roomAssignment?.autoAssignSeats) {
      try {
        const seatAssignment = await WorkshopService.assignSeatToRegistration(reg._id, workshop);
        reg.seatAssignment = seatAssignment;
      } catch (error) {
        console.error('Failed to auto-assign seat:', error);
      }
    }
    
    await reg.save();
    await Workshop.findByIdAndUpdate(reg.workshopId, { $inc: { 'stats.totalApproved': 1 } });
    return reg;
  }

  static async rejectRegistration(registrationId, reason) {
    const reg = await WorkshopRegistration.findById(registrationId);
    if (!reg) throw new ApiError(404, 'Registration not found');
    reg.status = 'Rejected';
    reg.rejectionReason = reason;
    await reg.save();
    return reg;
  }

  // ── QR CHECK-IN ───────────────────────────────────────────────────────────

  static async checkInByQR(qrToken, checkedInBy) {
    const reg = await WorkshopRegistration.findOne({ qrToken }).populate('workshopId').populate('userId', 'firstName lastName email');
    if (!reg) throw new ApiError(404, 'Invalid QR code');
    if (reg.status !== 'Approved') throw new ApiError(400, `Registration status is ${reg.status}`);
    if (reg.checkedIn) throw new ApiError(409, 'Already checked in');

    reg.checkedIn   = true;
    reg.checkedInAt = new Date();
    reg.checkedInBy = checkedInBy;
    reg.status      = 'Attended';
    await reg.save();
    await Workshop.findByIdAndUpdate(reg.workshopId._id, { $inc: { 'stats.totalAttendees': 1 } });

    return {
      success: true,
      participant: {
        name:      reg.participantName,
        email:     reg.participantEmail,
        workshop:  reg.workshopId.title,
        checkedIn: reg.checkedInAt,
      },
    };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  static async _generateQR(reg) {
    reg.generateQRToken();
    const qrData = JSON.stringify({ token: reg.qrToken, regId: reg._id });
    reg.qrCodeData = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
  }

  static async addMaterial(workshopId, material, actorId) {
    const w = await Workshop.findById(workshopId).select('_id title followers materials');
    if (!w) throw new ApiError(404, 'Workshop not found');
    
    w.materials.push(material);
    await w.save();
    
    // Notify workshop followers (excluding the person who uploaded)
    if (w.followers && w.followers.length > 0) {
      await NotificationService.notifyWorkshopFollowers(
        workshopId,
        {
          title: `📎 New material added to ${w.title}`,
          message: `New ${material.type || 'learning material'}: ${material.title}`,
          category: "Workshop",
          actionUrl: `/dashboard/workshops/${workshopId}`,
          entityType: "Workshop",
          entityId: workshopId.toString(),
          metadata: { materialTitle: material.title, materialType: material.type },
        },
        {
          excludeUserIds: actorId ? [actorId] : [],
          includeRegistered: true, // Notify registered participants too
        }
      );
    }
    
    return w;
  }

  static async editMaterial(workshopId, index, material) {
    const w = await Workshop.findById(workshopId);
    if (!w) throw new ApiError(404, 'Workshop not found');
    if (index < 0 || index >= w.materials.length) {
      throw new ApiError(400, 'Invalid material index');
    }
    w.materials[index] = material;
    await w.save();
    return w;
  }

  static async removeMaterial(workshopId, index) {
    const w = await Workshop.findById(workshopId);
    if (!w) throw new ApiError(404, 'Workshop not found');
    w.materials.splice(index, 1);
    await w.save();
    return w;
  }

  static async getMyRegistration(workshopId, userId) {
    return WorkshopRegistration.findOne({ workshopId, userId });
  }

  static async listRegistrations(workshopId) {
    return WorkshopRegistration.find({ workshopId })
      .populate('userId', 'firstName lastName email avatarUrl')
      .sort({ createdAt: -1 });
  }

  static async getRegistrationById(id) {
    return WorkshopRegistration.findById(id)
      .populate('workshopId')
      .populate('userId', 'firstName lastName email avatarUrl')
      .populate('seatAssignment.roomId', 'roomNumber roomName building floor');
  }

  /**
   * Assign seat to workshop registration
   * @private
   */
  static async assignSeatToRegistration(registrationId, workshop) {
    const { Room } = require('../models/Room');
    
    if (!workshop.roomAssignment?.rooms || workshop.roomAssignment.rooms.length === 0) {
      throw new Error('No rooms assigned to this workshop');
    }

    // Sort rooms by priority
    const sortedRooms = workshop.roomAssignment.rooms.sort((a, b) => a.priority - b.priority);

    // Try to assign seat in each room (by priority)
    for (const roomAssignment of sortedRooms) {
      try {
        const room = await Room.findById(roomAssignment.roomId);
        
        if (!room || !room.isActive) continue;

        // Check if room has available capacity
        const availableCapacity = room.getAvailableCapacity();
        if (availableCapacity <= 0) continue;

        // Assign seat/capacity
        const seatResult = await room.assignSeat(
          null, // userId
          registrationId,
          null, // eventId
          workshop._id
        );

        // Update workshop room assignment stats
        await Workshop.findByIdAndUpdate(workshop._id, {
          $inc: { 
            'roomAssignment.totalSeatsOccupied': 1 
          }
        });

        // Return seat assignment info
        if (room.seatManagementMode === 'Individual') {
          return {
            roomId: room._id,
            seatNumber: seatResult.seatNumber,
            row: seatResult.row,
            position: seatResult.position,
            assignedAt: new Date(),
            autoAssigned: true
          };
        } else {
          // Capacity_Only mode
          return {
            roomId: room._id,
            seatNumber: `General-${seatResult.registeredCount}`,
            assignedAt: new Date(),
            autoAssigned: true
          };
        }
      } catch (error) {
        console.error(`Failed to assign seat in room ${roomAssignment.roomId}:`, error.message);
        continue; // Try next room
      }
    }

    throw new Error('No available seats in any assigned room');
  }

  static async followWorkshop(workshopId, userId, requestId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      throw new ApiError(404, "Workshop not found");
    }

    // Check if already following
    if (workshop.followers && workshop.followers.includes(userId)) {
      throw new ApiError(409, "You are already following this workshop");
    }

    workshop.followers = workshop.followers || [];
    workshop.followers.push(userId);
    await workshop.save();

    const { AuditService } = require('./AuditService');
    await AuditService.log({
      actorId: userId,
      action: "WORKSHOP_FOLLOWED",
      resource: "Workshop",
      resourceId: workshop._id.toString(),
      requestId,
      metadata: { workshopId: workshop._id.toString() },
    });

    return { message: "Workshop followed successfully", totalFollowers: workshop.followers.length };
  }

  static async unfollowWorkshop(workshopId, userId, requestId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      throw new ApiError(404, "Workshop not found");
    }

    // Check if following
    if (!workshop.followers) {
      workshop.followers = [];
    }
    
    const index = workshop.followers.indexOf(userId);
    if (index === -1) {
      throw new ApiError(409, "You are not following this workshop");
    }

    workshop.followers.splice(index, 1);
    await workshop.save();

    const { AuditService } = require('./AuditService');
    await AuditService.log({
      actorId: userId,
      action: "WORKSHOP_UNFOLLOWED",
      resource: "Workshop",
      resourceId: workshop._id.toString(),
      requestId,
      metadata: { workshopId: workshop._id.toString() },
    });

    return { message: "Workshop unfollowed successfully", totalFollowers: workshop.followers.length };
  }
}

module.exports = { WorkshopService };
