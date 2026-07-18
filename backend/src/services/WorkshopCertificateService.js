const crypto = require("crypto");
const htmlPdf = require("html-pdf-node");
const { Workshop } = require("../models/Workshop");
const { WorkshopRegistration } = require("../models/WorkshopRegistration");
const { WorkshopCertificate } = require("../models/WorkshopCertificate");
const { User } = require("../models/User");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");
const { WorkshopService } = require("./WorkshopService");

class WorkshopCertificateService {
  static async generateCertificateNo() {
    const year = new Date().getFullYear();
    const prefix = `WS-CERT-${year}-`;
    const latest = await WorkshopCertificate.findOne({ certificateNo: new RegExp(`^${prefix}`) })
      .sort({ certificateNo: -1 })
      .select("certificateNo");
    let serial = 1;
    if (latest?.certificateNo) {
      const n = Number(latest.certificateNo.split("-").pop());
      if (Number.isInteger(n)) serial = n + 1;
    }
    return `${prefix}${String(serial).padStart(4, "0")}`;
  }

  /**
   * Issue a completion certificate to one participant if eligible.
   * Idempotent: returns the existing certificate if already issued.
   */
  static async issueForRegistration(workshop, reg, { force = false } = {}) {
    if (!workshop.completion?.certificateEnabled) return null;
    if (!force && !reg.isCompleted) return null;

    const existing = await WorkshopCertificate.findOne({ workshopId: workshop._id, userId: reg.userId });
    if (existing) {
      if (!reg.certificateIssued) {
        reg.certificateIssued = true;
        reg.certificateId = existing._id;
        await reg.save();
      }
      return existing;
    }

    const user = await User.findById(reg.userId).select("firstName lastName");
    const recipientName = user ? `${user.firstName} ${user.lastName}`.trim() : reg.participantName;
    const certificateNo = await this.generateCertificateNo();
    const verifyCode = crypto.randomBytes(6).toString("hex").toUpperCase();

    const html = this.buildHTML({
      certificateNo,
      recipientName,
      workshopTitle: workshop.title,
      completionPercentage: reg.completionPercentage,
      title: workshop.completion?.certificateTitle || "Certificate of Completion",
      signatoryName: workshop.completion?.signatoryName || "",
      signatoryTitle: workshop.completion?.signatoryTitle || "Workshop Instructor",
      issueDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      verifyCode,
    });

    let pdfData = "";
    try {
      const buffer = await htmlPdf.generatePdf({ content: html }, { format: "A4", landscape: true, printBackground: true });
      pdfData = `data:application/pdf;base64,${buffer.toString("base64")}`;
    } catch (err) {
      console.error("[WorkshopCertificate] PDF render failed:", err.message);
    }

    const cert = await WorkshopCertificate.create({
      workshopId: workshop._id,
      userId: reg.userId,
      registrationId: reg._id,
      certificateNo,
      recipientName,
      workshopTitle: workshop.title,
      completionPercentage: reg.completionPercentage,
      pdfData,
      verifyCode,
    });

    reg.certificateIssued = true;
    reg.certificateId = cert._id;
    await reg.save();

    await Workshop.findByIdAndUpdate(workshop._id, { $inc: { "stats.totalCertificates": 1 } });

    await NotificationService.createForUser(reg.userId, {
      title: `🎓 Certificate ready — ${workshop.title}`,
      message: `Congratulations! Your Certificate of Completion is ready to download.`,
      category: "Workshop",
      actionUrl: `/dashboard/workshops/${workshop._id}`,
      entityType: "WorkshopCertificate",
      entityId: cert._id.toString(),
    }).catch(() => {});

    return cert;
  }

  /**
   * Issue certificates to all completed participants of a workshop.
   */
  static async issueForWorkshop(workshopId, actorId, requestId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");

    if (actorId) {
      const { userRoles } = await WorkshopService.resolveRequester(actorId);
      if (!WorkshopService.isManager(workshop, actorId, userRoles)) {
        throw new ApiError(403, "Only organizers can issue certificates.");
      }
    }

    const regs = await WorkshopRegistration.find({ workshopId, isCompleted: true, certificateIssued: false });
    let issued = 0;
    for (const reg of regs) {
      const cert = await this.issueForRegistration(workshop, reg).catch(() => null);
      if (cert) issued += 1;
    }

    await AuditService.log({
      actorId: actorId || null,
      action: "WORKSHOP_CERTIFICATES_ISSUED",
      resource: "Workshop",
      resourceId: workshopId.toString(),
      requestId,
      metadata: { issued },
    }).catch(() => {});

    return { issued };
  }

  /**
   * Fetch the current user's certificate for a workshop (or by manager).
   */
  static async getMyCertificate(workshopId, userId) {
    return WorkshopCertificate.findOne({ workshopId, userId });
  }

  static async downloadCertificate(certificateId, userId, roles = []) {
    const cert = await WorkshopCertificate.findById(certificateId);
    if (!cert) throw new ApiError(404, "Certificate not found");
    const isOwner = cert.userId.toString() === userId.toString();
    const MANAGER_ROLES = ["System Admin", "Moderator", "Chief Patron", "President", "General Secretary"];
    const privileged = (roles || []).some((r) => MANAGER_ROLES.includes(r));
    if (!isOwner && !privileged) throw new ApiError(403, "Not allowed to download this certificate");

    if (!cert.pdfData) {
      // Re-render on demand if the cached PDF is missing.
      const workshop = await Workshop.findById(cert.workshopId);
      const html = this.buildHTML({
        certificateNo: cert.certificateNo,
        recipientName: cert.recipientName,
        workshopTitle: cert.workshopTitle,
        completionPercentage: cert.completionPercentage,
        title: workshop?.completion?.certificateTitle || "Certificate of Completion",
        signatoryName: workshop?.completion?.signatoryName || "",
        signatoryTitle: workshop?.completion?.signatoryTitle || "Workshop Instructor",
        issueDate: new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        verifyCode: cert.verifyCode,
      });
      
      try {
        // Timeout protection: if PDF generation takes > 30 seconds, fail gracefully
        const pdfPromise = htmlPdf.generatePdf({ content: html }, { format: "A4", landscape: true, printBackground: true });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout')), 30000)
        );
        
        const buffer = await Promise.race([pdfPromise, timeoutPromise]);
        cert.pdfData = `data:application/pdf;base64,${buffer.toString("base64")}`;
        await cert.save();
      } catch (error) {
        console.error('[WorkshopCertificate] PDF generation failed:', error.message);
        throw new ApiError(500, "Certificate PDF generation failed. Please contact support.");
      }
    }
    return cert;
  }

  static buildHTML(d) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;800&family=Inter:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',sans-serif;background:#fff;}
.cert{width:1100px;height:770px;margin:0 auto;position:relative;padding:60px;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);border:16px solid #14b8a6;}
.inner{border:2px solid #0d9488;height:100%;padding:40px 50px;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;}
.corner{position:absolute;width:60px;height:60px;border:3px solid #d97706;}
.tl{top:12px;left:12px;border-right:none;border-bottom:none;}.tr{top:12px;right:12px;border-left:none;border-bottom:none;}
.bl{bottom:12px;left:12px;border-right:none;border-top:none;}.br{bottom:12px;right:12px;border-left:none;border-top:none;}
.uni{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:1px;margin-top:8px;}
.dept{font-size:14px;color:#475569;letter-spacing:1px;margin-bottom:2px;}
.club{font-size:15px;font-weight:600;color:#0d9488;letter-spacing:1px;}
.title{font-family:'Playfair Display',serif;font-size:44px;font-weight:800;color:#0d9488;text-transform:uppercase;letter-spacing:3px;margin:26px 0 6px;}
.rule{width:120px;height:3px;background:#d97706;margin:0 auto 22px;}
.sub{font-size:16px;color:#64748b;font-style:italic;margin-bottom:8px;}
.name{font-family:'Playfair Display',serif;font-size:40px;font-weight:800;color:#0f172a;margin:6px 0;border-bottom:3px solid #d97706;display:inline-block;padding:0 24px 6px;}
.body{font-size:16px;color:#334155;line-height:1.7;max-width:760px;margin:16px auto 0;}
.ws{font-weight:700;color:#0d9488;}
.pct{display:inline-block;margin-top:14px;background:#0d9488;color:#fff;font-weight:700;font-size:14px;padding:6px 18px;border-radius:999px;}
.foot{display:flex;justify-content:space-between;width:100%;margin-top:auto;padding-top:20px;align-items:flex-end;}
.sig{text-align:center;}.sigline{width:200px;border-top:2px solid #0f172a;margin-bottom:6px;}
.signame{font-weight:700;color:#0f172a;font-size:15px;}.sigtitle{color:#0d9488;font-size:13px;font-weight:600;}
.meta{text-align:left;font-size:11px;color:#64748b;line-height:1.6;}
</style></head><body>
<div class="cert"><div class="inner">
<div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
<div class="uni">UNIVERSITY OF DHAKA</div>
<div class="dept">DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING</div>
<div class="club">CSEDU STUDENTS' CLUB</div>
<div class="title">${d.title}</div>
<div class="rule"></div>
<div class="sub">This is proudly presented to</div>
<div class="name">${d.recipientName}</div>
<div class="body">for successfully completing the workshop <span class="ws">"${d.workshopTitle}"</span>, demonstrating dedication and hands-on skill development throughout the program.</div>
<div class="pct">${d.completionPercentage}% Completion</div>
<div class="foot">
  <div class="meta">Certificate No: <strong>${d.certificateNo}</strong><br>Issued: ${d.issueDate}<br>Verify Code: <strong>${d.verifyCode}</strong></div>
  <div class="sig"><div class="sigline"></div><div class="signame">${d.signatoryName || "CSEDU Students' Club"}</div><div class="sigtitle">${d.signatoryTitle}</div></div>
</div>
</div></div></body></html>`;
  }
}

module.exports = { WorkshopCertificateService };
