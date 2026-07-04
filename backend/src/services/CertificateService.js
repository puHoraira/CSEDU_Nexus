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

    // Generate HTML certificate
    const html = this.generateCertificateHTML({
      certificateNo: request.certificateNo,
      requesterName,
      studentId,
      batch,
      currentYear,
      issueDate,
      purpose: request.purpose,
      contributionSummary: request.contributionSummary,
      ecPostHistory: request.ecPostHistory || [],
      volunteerContributions: request.volunteerContributions || [],
      moderatorReview: request.moderatorReview,
      chairmanReview: request.chairmanReview,
    });

    return {
      text: html,
      filename: `${request.certificateNo || "certificate"}.html`,
    };
  }

  static generateCertificateHTML(data) {
    const ecPostsHTML = data.ecPostHistory.length > 0 ? `
      <div class="section">
        <h3 class="section-title">Executive Committee Positions Held</h3>
        <div class="ec-posts">
          ${data.ecPostHistory.map((post, index) => {
            const startDate = new Date(post.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short" });
            const endDate = post.endDate
              ? new Date(post.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })
              : "Present";
            return `
              <div class="ec-post-item">
                <div class="post-title">${index + 1}. ${post.postTitle} (${post.year})</div>
                <div class="post-duration">Duration: ${startDate} - ${endDate}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const volunteerHTML = data.volunteerContributions.length > 0 ? `
      <div class="section">
        <h3 class="section-title">Volunteer Contributions</h3>
        <div class="volunteer-contributions">
          ${data.volunteerContributions.map((contrib, index) => {
            const contribDate = new Date(contrib.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return `
              <div class="volunteer-item">
                <div class="contrib-title">${index + 1}. ${contrib.eventTitle}</div>
                <div class="contrib-role">Role: ${contrib.role}</div>
                <div class="contrib-date">Date: ${contribDate}</div>
                ${contrib.description ? `<div class="contrib-desc">Details: ${contrib.description}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Membership - ${data.certificateNo}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;600&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Lora', Georgia, serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 40px 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .certificate-container {
            max-width: 1000px;
            background: white;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 15px solid;
            border-image: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%) 1;
            position: relative;
        }
        
        .decorative-corner {
            position: absolute;
            width: 100px;
            height: 100px;
            border: 3px solid #c9a961;
        }
        
        .corner-tl {
            top: 30px;
            left: 30px;
            border-right: none;
            border-bottom: none;
        }
        
        .corner-tr {
            top: 30px;
            right: 30px;
            border-left: none;
            border-bottom: none;
        }
        
        .corner-bl {
            bottom: 30px;
            left: 30px;
            border-right: none;
            border-top: none;
        }
        
        .corner-br {
            bottom: 30px;
            right: 30px;
            border-left: none;
            border-top: none;
        }
        
        .ornamental-line {
            text-align: center;
            margin: 20px 0;
            color: #c9a961;
            font-size: 24px;
            letter-spacing: 10px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .university-name {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            letter-spacing: 2px;
            margin-bottom: 5px;
        }
        
        .department-name {
            font-size: 16px;
            color: #555;
            letter-spacing: 1px;
            margin-bottom: 3px;
        }
        
        .club-name {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            letter-spacing: 1.5px;
        }
        
        .certificate-title {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            font-weight: 700;
            color: #c9a961;
            text-align: center;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        
        .certificate-meta {
            text-align: center;
            margin-bottom: 30px;
            font-size: 14px;
            color: #666;
        }
        
        .certificate-meta div {
            margin: 5px 0;
        }
        
        .certifies-text {
            text-align: center;
            font-size: 18px;
            color: #444;
            margin-bottom: 20px;
            font-style: italic;
        }
        
        .recipient-name {
            font-family: 'Playfair Display', serif;
            font-size: 42px;
            font-weight: 700;
            color: #2c3e50;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-decoration: underline;
            text-decoration-color: #c9a961;
            text-decoration-thickness: 3px;
            text-underline-offset: 8px;
        }
        
        .recipient-details {
            text-align: center;
            margin-bottom: 30px;
            color: #555;
            line-height: 1.8;
        }
        
        .recipient-details div {
            font-size: 16px;
        }
        
        .main-text {
            text-align: center;
            font-size: 16px;
            color: #444;
            line-height: 1.8;
            margin: 30px 0;
            padding: 0 40px;
        }
        
        .section {
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .section-title {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .purpose-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            margin: 20px 0;
        }
        
        .purpose-label {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 16px;
            text-transform: uppercase;
        }
        
        .purpose-text {
            color: #444;
            font-size: 15px;
            line-height: 1.6;
        }
        
        .ec-post-item, .volunteer-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 3px solid #c9a961;
        }
        
        .post-title, .contrib-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .post-duration, .contrib-role, .contrib-date, .contrib-desc {
            color: #666;
            font-size: 14px;
            margin: 3px 0;
        }
        
        .contribution-summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            margin: 20px 0;
            line-height: 1.6;
            color: #444;
        }
        
        .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
        }
        
        .signature-block {
            text-align: center;
            flex: 1;
            padding: 0 20px;
        }
        
        .signature-line {
            border-top: 2px solid #2c3e50;
            width: 200px;
            margin: 40px auto 10px;
        }
        
        .signature-name {
            font-weight: 600;
            color: #2c3e50;
            font-size: 16px;
            margin: 5px 0;
        }
        
        .signature-title {
            color: #667eea;
            font-size: 14px;
            font-weight: 600;
            margin: 3px 0;
        }
        
        .signature-date {
            color: #888;
            font-size: 12px;
            margin-top: 5px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            line-height: 1.6;
        }
        
        .footer-note {
            font-style: italic;
            margin-top: 10px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .certificate-container {
                box-shadow: none;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="decorative-corner corner-tl"></div>
        <div class="decorative-corner corner-tr"></div>
        <div class="decorative-corner corner-bl"></div>
        <div class="decorative-corner corner-br"></div>
        
        <div class="header">
            <div class="university-name">UNIVERSITY OF DHAKA</div>
            <div class="department-name">DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING</div>
            <div class="club-name">CSEDU STUDENTS' CLUB</div>
        </div>
        
        <div class="ornamental-line">❖ ❖ ❖</div>
        
        <div class="certificate-title">Certificate of Membership</div>
        
        <div class="certificate-meta">
            <div><strong>Certificate No:</strong> ${data.certificateNo}</div>
            <div><strong>Issue Date:</strong> ${data.issueDate}</div>
        </div>
        
        <div class="ornamental-line">❖ ❖ ❖</div>
        
        <div class="certifies-text">This is to certify that</div>
        
        <div class="recipient-name">${data.requesterName}</div>
        
        <div class="recipient-details">
            <div><strong>Student ID:</strong> ${data.studentId}</div>
            <div><strong>Batch:</strong> ${data.batch} | <strong>Year:</strong> ${data.currentYear}</div>
        </div>
        
        <div class="main-text">
            has been an active and valuable member of the CSEDU Students' Club and has made
            significant contributions to the club's activities, events, and overall mission.
        </div>
        
        <div class="purpose-box">
            <div class="purpose-label">Purpose of Certificate</div>
            <div class="purpose-text">${data.purpose}</div>
        </div>
        
        ${ecPostsHTML}
        
        ${volunteerHTML}
        
        <div class="section">
            <h3 class="section-title">Contribution Summary</h3>
            <div class="contribution-summary">${data.contributionSummary}</div>
        </div>
        
        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">${data.moderatorReview.signatureName}</div>
                <div class="signature-title">${data.moderatorReview.signatureTitle || 'Moderator'}</div>
                <div class="signature-date">${data.moderatorReview.actedAt ? new Date(data.moderatorReview.actedAt).toLocaleDateString() : ''}</div>
            </div>
            
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">${data.chairmanReview.signatureName}</div>
                <div class="signature-title">${data.chairmanReview.signatureTitle || 'Chairman'}</div>
                <div class="signature-date">${data.chairmanReview.actedAt ? new Date(data.chairmanReview.actedAt).toLocaleDateString() : ''}</div>
            </div>
        </div>
        
        <div class="footer">
            <div>This certificate is issued in accordance with <strong>Article XIX</strong> of the CSEDU Students' Club Constitution</div>
            <div>and certifies the voluntary contributions made by the member.</div>
            <div class="footer-note">
                CSEDU Students' Club | Department of Computer Science and Engineering<br>
                University of Dhaka, Dhaka-1000, Bangladesh
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }
}

module.exports = { CertificateService };
