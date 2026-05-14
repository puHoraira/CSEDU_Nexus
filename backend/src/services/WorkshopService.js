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

    // Annotate with audience relevance if we know the requesting user
    if (requestingUserId) {
      const member = await Member.findOne({ userId: requestingUserId }).select('batch currentYear');
      if (member) {
        return annotateAudienceRelevance(
          workshops.map(w => w.toObject()),
          member
        );
      }
    }
    return workshops;
  }

  static async getWorkshopById(id) {
    const w = await Workshop.findById(id).populate('createdBy', 'firstName lastName avatarUrl');
    if (!w) throw new ApiError(404, 'Workshop not found');
    return w;
  }

  static async updateWorkshop(id, data, userId) {
    const w = await Workshop.findById(id);
    if (!w) throw new ApiError(404, 'Workshop not found');
    Object.assign(w, data);
    await w.save();
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

    if (workshop.registrationDeadline && new Date() > workshop.registrationDeadline) {
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
    }

    // Update stats
    await Workshop.findByIdAndUpdate(workshopId, { $inc: { 'stats.totalRegistrations': 1 } });

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
    const reg = await WorkshopRegistration.findById(registrationId);
    if (!reg) throw new ApiError(404, 'Registration not found');

    // If paid workshop, must be paid first
    if (reg.paymentRequired && reg.paymentStatus !== 'Paid') {
      throw new ApiError(400, 'Payment not completed');
    }

    reg.status = 'Approved';
    await WorkshopService._generateQR(reg);
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

  static async addMaterial(workshopId, material) {
    const w = await Workshop.findById(workshopId);
    if (!w) throw new ApiError(404, 'Workshop not found');
    w.materials.push(material);
    await w.save();
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
    return WorkshopRegistration.findById(id).populate('workshopId').populate('userId', 'firstName lastName email avatarUrl');
  }
}

module.exports = { WorkshopService };
