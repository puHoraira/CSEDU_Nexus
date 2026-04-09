const { ApiError } = require("../core/ApiError");
const { CertificateRequest } = require("../models/CertificateRequest");
const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { AuditService } = require("./AuditService");

const MODERATOR_ROLE = "Moderator";
const CHAIRMAN_ROLES = ["Chief Patron", "Chairman"];

class CertificateService {
  static isModerator(roles = []) {
    return roles.includes(MODERATOR_ROLE);
  }

  static isChairman(roles = []) {
    return CHAIRMAN_ROLES.some((role) => roles.includes(role));
  }

  static async createRequest(payload, actorId, requestId) {
    const member = await Member.findOne({ userId: actorId });
    if (!member) {
      throw new ApiError(404, "Membership record not found for current user");
    }

    if (member.status !== "Active") {
      throw new ApiError(400, "Only active members can request certificates");
    }

    const request = await CertificateRequest.create({
      requesterUserId: actorId,
      requesterMemberId: member._id,
      certificateType: payload.certificateType,
      purpose: payload.purpose,
      contributionSummary: payload.contributionSummary,
      status: "PendingModerator",
    });

    await AuditService.log({
      actorId,
      action: "CERTIFICATE_REQUEST_CREATED",
      resource: "CertificateRequest",
      resourceId: request._id.toString(),
      requestId,
      metadata: { certificateType: request.certificateType },
    });

    return request;
  }

  static async listMyRequests(actorId) {
    return CertificateRequest.find({ requesterUserId: actorId })
      .sort({ createdAt: -1 })
      .populate("requesterMemberId", "studentId batch currentYear status");
  }

  static async listModeratorInbox() {
    return CertificateRequest.find({ status: "PendingModerator" })
      .sort({ createdAt: 1 })
      .populate("requesterUserId", "firstName lastName email")
      .populate("requesterMemberId", "studentId batch currentYear status");
  }

  static async listChairmanInbox() {
    return CertificateRequest.find({ status: "PendingChairman" })
      .sort({ createdAt: 1 })
      .populate("requesterUserId", "firstName lastName email")
      .populate("requesterMemberId", "studentId batch currentYear status");
  }

  static async reviewByModerator(id, payload, actorId, roles, requestId) {
    if (!this.isModerator(roles)) {
      throw new ApiError(403, "Moderator role required");
    }

    const request = await CertificateRequest.findById(id);
    if (!request) throw new ApiError(404, "Certificate request not found");
    if (request.status !== "PendingModerator") {
      throw new ApiError(409, "This request is not pending moderator review");
    }

    request.moderatorReview.action = payload.action;
    request.moderatorReview.comment = payload.comment || "";
    request.moderatorReview.signatureName = payload.action === "Approved" ? payload.signatureName : "";
    request.moderatorReview.signatureTitle = payload.action === "Approved"
      ? (payload.signatureTitle || "Moderator")
      : "";
    request.moderatorReview.actedBy = actorId;
    request.moderatorReview.actedAt = new Date();

    if (payload.action === "Rejected") {
      request.status = "Rejected";
      request.rejectionReason = payload.comment || "Rejected by moderator";
    } else {
      request.status = "PendingChairman";
      request.rejectionReason = "";
    }

    await request.save();

    await AuditService.log({
      actorId,
      action: "CERTIFICATE_REVIEWED_BY_MODERATOR",
      resource: "CertificateRequest",
      resourceId: request._id.toString(),
      requestId,
      metadata: { action: payload.action },
    });

    return request;
  }

  static async reviewByChairman(id, payload, actorId, roles, requestId) {
    if (!this.isChairman(roles)) {
      throw new ApiError(403, "Chairman role required");
    }

    const request = await CertificateRequest.findById(id);
    if (!request) throw new ApiError(404, "Certificate request not found");
    if (request.status !== "PendingChairman") {
      throw new ApiError(409, "This request is not pending chairman review");
    }

    request.chairmanReview.action = payload.action;
    request.chairmanReview.comment = payload.comment || "";
    request.chairmanReview.signatureName = payload.action === "Approved" ? payload.signatureName : "";
    request.chairmanReview.signatureTitle = payload.action === "Approved"
      ? (payload.signatureTitle || "Chairman")
      : "";
    request.chairmanReview.actedBy = actorId;
    request.chairmanReview.actedAt = new Date();

    if (payload.action === "Rejected") {
      request.status = "Rejected";
      request.rejectionReason = payload.comment || "Rejected by chairman";
    } else {
      request.status = "Approved";
      request.rejectionReason = "";
      request.approvedAt = new Date();
      if (!request.certificateNo) {
        request.certificateNo = await this.generateCertificateNo();
      }
    }

    await request.save();

    await AuditService.log({
      actorId,
      action: "CERTIFICATE_REVIEWED_BY_CHAIRMAN",
      resource: "CertificateRequest",
      resourceId: request._id.toString(),
      requestId,
      metadata: { action: payload.action },
    });

    return request;
  }

  static async generateCertificateNo() {
    const year = new Date().getFullYear();
    const prefix = `CSEDUSC-${year}-`;

    const latest = await CertificateRequest.findOne({ certificateNo: new RegExp(`^${prefix}`) })
      .sort({ certificateNo: -1 })
      .select("certificateNo");

    let serial = 1;
    if (latest?.certificateNo) {
      const parts = latest.certificateNo.split("-");
      const maybeSerial = Number(parts[parts.length - 1]);
      if (Number.isInteger(maybeSerial)) serial = maybeSerial + 1;
    }

    return `${prefix}${String(serial).padStart(4, "0")}`;
  }

  static async buildDownloadText(id, actorId, roles, requestId) {
    const request = await CertificateRequest.findById(id)
      .populate("requesterUserId", "firstName lastName email")
      .populate("requesterMemberId", "studentId batch currentYear status");

    if (!request) throw new ApiError(404, "Certificate request not found");
    if (request.status !== "Approved") throw new ApiError(409, "Certificate is not approved yet");

    const isOwner = request.requesterUserId?._id?.toString() === actorId.toString();
    const privileged = this.isModerator(roles) || this.isChairman(roles);
    if (!isOwner && !privileged) {
      throw new ApiError(403, "You are not allowed to download this certificate");
    }

    request.downloadedCount = (request.downloadedCount || 0) + 1;
    request.lastDownloadedAt = new Date();
    await request.save();

    await AuditService.log({
      actorId,
      action: "CERTIFICATE_DOWNLOADED",
      resource: "CertificateRequest",
      resourceId: request._id.toString(),
      requestId,
      metadata: { certificateNo: request.certificateNo || "" },
    });

    const requesterName = `${request.requesterUserId?.firstName || ""} ${request.requesterUserId?.lastName || ""}`.trim();

    const lines = [
      "University of Dhaka",
      "Department of Computer Science and Engineering",
      "CSEDU Students' Club",
      "",
      "Certificate of Membership Contribution",
      `Certificate No: ${request.certificateNo}`,
      `Issued On: ${new Date(request.approvedAt || request.updatedAt).toLocaleDateString()}`,
      "",
      `This is to certify that ${requesterName} (${request.requesterMemberId?.studentId || "N/A"})`,
      `Batch: ${request.requesterMemberId?.batch || "N/A"}, Year: ${request.requesterMemberId?.currentYear || "N/A"}`,
      "has contributed to the CSEDU Students' Club activities.",
      "",
      `Purpose: ${request.purpose}`,
      "",
      "Contribution Summary:",
      request.contributionSummary,
      "",
      "Approvals:",
      `Moderator: ${request.moderatorReview.signatureName} (${request.moderatorReview.signatureTitle || "Moderator"})`,
      `Chairman: ${request.chairmanReview.signatureName} (${request.chairmanReview.signatureTitle || "Chairman"})`,
    ];

    return {
      text: lines.join("\n"),
      filename: `${request.certificateNo || "certificate"}.txt`,
    };
  }
}

module.exports = { CertificateService };
