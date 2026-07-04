const { ApiError } = require("../core/ApiError");
const { CertificateRequest } = require("../models/CertificateRequest");
const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

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

    // Check membershipStatus.status instead of member.status
    if (member.membershipStatus?.status !== "Active") {
      throw new ApiError(400, "Only active members can request certificates");
    }

    const request = await CertificateRequest.create({
      requesterUserId: actorId,
      requesterMemberId: member._id,
      certificateType: payload.certificateType,
      purpose: payload.purpose,
      contributionSummary: payload.contributionSummary,
      ecPostHistory: payload.ecPostHistory || [],
      volunteerContributions: payload.volunteerContributions || [],
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

    await NotificationService.createForRoleNames(["Moderator"], {
      title: "New certificate request",
      message: `A ${request.certificateType} certificate request is awaiting moderator review.`,
      category: "Certificate",
      actionUrl: "/dashboard/certificates",
      entityType: "CertificateRequest",
      entityId: request._id.toString(),
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

    await NotificationService.createForUser(request.requesterUserId, {
      title: "Certificate request updated",
      message:
        payload.action === "Approved"
          ? "Your certificate request passed moderator review and is pending chairman approval."
          : "Your certificate request was rejected by moderator review.",
      category: "Certificate",
      actionUrl: "/dashboard/certificates",
      entityType: "CertificateRequest",
      entityId: request._id.toString(),
    });

    if (payload.action === "Approved") {
      await NotificationService.createForRoleNames(["Chief Patron"], {
        title: "Certificate request pending chairman review",
        message: "A certificate request is ready for final chairman review.",
        category: "Certificate",
        actionUrl: "/dashboard/chief-patron",
        entityType: "CertificateRequest",
        entityId: request._id.toString(),
      });
    }

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

    await NotificationService.createForUser(request.requesterUserId, {
      title: "Certificate request final decision",
      message:
        payload.action === "Approved"
          ? "Your certificate request has been approved and is ready to download."
          : "Your certificate request was rejected by chairman review.",
      category: "Certificate",
      actionUrl: "/dashboard/certificates",
      entityType: "CertificateRequest",
      entityId: request._id.toString(),
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
    const studentId = request.requesterMemberId?.studentId || "N/A";
    const batch = request.requesterMemberId?.batch || "N/A";
    const currentYear = request.requesterMemberId?.currentYear || "N/A";
    const issueDate = new Date(request.approvedAt || request.updatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const lines = [
      "═══════════════════════════════════════════════════════════════════════════════",
      "",
      "                        UNIVERSITY OF DHAKA",
      "              DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING",
      "                        CSEDU STUDENTS' CLUB",
      "",
      "═══════════════════════════════════════════════════════════════════════════════",
      "",
      "                   CERTIFICATE OF MEMBERSHIP CONTRIBUTION",
      "",
      "═══════════════════════════════════════════════════════════════════════════════",
      "",
      `Certificate No: ${request.certificateNo}`,
      `Issue Date: ${issueDate}`,
      "",
      "───────────────────────────────────────────────────────────────────────────────",
      "",
      "This is to certify that",
      "",
      `                          ${requesterName.toUpperCase()}`,
      `                     Student ID: ${studentId}`,
      `                     Batch: ${batch} | Year: ${currentYear}`,
      "",
      "has been an active member of the CSEDU Students' Club and has made significant",
      "contributions to the club's activities and events.",
      "",
      "───────────────────────────────────────────────────────────────────────────────",
      "",
      "PURPOSE OF CERTIFICATE:",
      `${request.purpose}`,
      "",
    ];

    // Add EC Post History if available
    if (request.ecPostHistory && request.ecPostHistory.length > 0) {
      lines.push("───────────────────────────────────────────────────────────────────────────────");
      lines.push("");
      lines.push("EXECUTIVE COMMITTEE POSITIONS HELD:");
      lines.push("");
      request.ecPostHistory.forEach((post, index) => {
        const startDate = new Date(post.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short" });
        const endDate = post.endDate
          ? new Date(post.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })
          : "Present";
        lines.push(`${index + 1}. ${post.postTitle} (${post.year})`);
        lines.push(`   Duration: ${startDate} - ${endDate}`);
        lines.push("");
      });
    }

    // Add Volunteer Contributions if available
    if (request.volunteerContributions && request.volunteerContributions.length > 0) {
      lines.push("───────────────────────────────────────────────────────────────────────────────");
      lines.push("");
      lines.push("VOLUNTEER CONTRIBUTIONS:");
      lines.push("");
      request.volunteerContributions.forEach((contrib, index) => {
        const contribDate = new Date(contrib.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        lines.push(`${index + 1}. ${contrib.eventTitle}`);
        lines.push(`   Role: ${contrib.role}`);
        lines.push(`   Date: ${contribDate}`);
        if (contrib.description) {
          lines.push(`   Details: ${contrib.description}`);
        }
        lines.push("");
      });
    }

    lines.push("───────────────────────────────────────────────────────────────────────────────");
    lines.push("");
    lines.push("CONTRIBUTION SUMMARY:");
    lines.push("");
    lines.push(request.contributionSummary);
    lines.push("");
    lines.push("───────────────────────────────────────────────────────────────────────────────");
    lines.push("");
    lines.push("APPROVALS & SIGNATURES:");
    lines.push("");
    lines.push(`Moderator: ${request.moderatorReview.signatureName}`);
    lines.push(`Title: ${request.moderatorReview.signatureTitle || "Moderator"}`);
    lines.push(`Date: ${request.moderatorReview.actedAt ? new Date(request.moderatorReview.actedAt).toLocaleDateString() : "N/A"}`);
    lines.push("");
    lines.push(`Chairman: ${request.chairmanReview.signatureName}`);
    lines.push(`Title: ${request.chairmanReview.signatureTitle || "Chairman"}`);
    lines.push(`Date: ${request.chairmanReview.actedAt ? new Date(request.chairmanReview.actedAt).toLocaleDateString() : "N/A"}`);
    lines.push("");
    lines.push("═══════════════════════════════════════════════════════════════════════════════");
    lines.push("");
    lines.push("This certificate is issued in accordance with Article XIX of the CSEDU Students'");
    lines.push("Club Constitution and certifies the voluntary contributions made by the member.");
    lines.push("");
    lines.push("                    CSEDU Students' Club");
    lines.push("         Department of Computer Science and Engineering");
    lines.push("                    University of Dhaka");
    lines.push("");
    lines.push("═══════════════════════════════════════════════════════════════════════════════");

    return {
      text: lines.join("\n"),
      filename: `${request.certificateNo || "certificate"}.txt`,
    };
  }
}

module.exports = { CertificateService };
