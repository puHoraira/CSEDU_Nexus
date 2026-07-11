const { Workshop } = require("../models/Workshop");
const { WorkshopRegistration } = require("../models/WorkshopRegistration");
const { WorkshopService } = require("./WorkshopService");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

class WorkshopAdminService {
  static async assertManager(workshopId, userId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    const { userRoles } = await WorkshopService.resolveRequester(userId);
    if (!WorkshopService.isManager(workshop, userId, userRoles)) {
      throw new ApiError(403, "Only organizers can manage registrations.");
    }
    return workshop;
  }

  /**
   * Promote the next N waitlisted registrations (oldest first) to Approved
   * whenever seats free up. Returns how many were promoted.
   */
  static async promoteWaitlist(workshopId, actorId = null, requestId = null) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");

    const approvedCount = await WorkshopRegistration.countDocuments({
      workshopId,
      status: { $in: ["Approved", "Attended"] },
    });
    let openSeats = workshop.capacity - approvedCount;
    if (openSeats <= 0) return { promoted: 0 };

    const waitlisted = await WorkshopRegistration.find({ workshopId, status: "Waitlisted" })
      .sort({ createdAt: 1 })
      .limit(openSeats);

    let promoted = 0;
    for (const reg of waitlisted) {
      // Skip paid-but-unpaid registrations (they must pay first).
      if (reg.paymentRequired && reg.paymentStatus !== "Paid") continue;
      await WorkshopService.approveRegistration(reg._id);
      promoted += 1;
      await NotificationService.createForUser(reg.userId, {
        title: `✅ You're in — ${workshop.title}`,
        message: "A seat opened up and you've been promoted from the waitlist. See you there!",
        category: "Workshop",
        actionUrl: `/dashboard/workshops/${workshopId}`,
        entityType: "Workshop",
        entityId: workshopId.toString(),
      }).catch(() => {});
    }

    if (promoted > 0) {
      await AuditService.log({
        actorId, action: "WORKSHOP_WAITLIST_PROMOTED", resource: "Workshop",
        resourceId: workshopId.toString(), requestId, metadata: { promoted },
      }).catch(() => {});
    }
    return { promoted };
  }

  /**
   * Bulk approve/reject/waitlist a set of registration ids.
   */
  static async bulkAction(workshopId, { action, registrationIds, reason }, userId, requestId) {
    await this.assertManager(workshopId, userId);
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      throw new ApiError(400, "No registrations selected");
    }

    const results = { success: 0, failed: 0, errors: [] };
    for (const regId of registrationIds) {
      try {
        if (action === "approve") {
          await WorkshopService.approveRegistration(regId);
        } else if (action === "reject") {
          await WorkshopService.rejectRegistration(regId, reason || "Rejected by organizer");
        } else if (action === "waitlist") {
          await WorkshopRegistration.findOneAndUpdate({ _id: regId, workshopId }, { status: "Waitlisted" });
        } else {
          throw new Error(`Unknown action: ${action}`);
        }
        results.success += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push({ regId, error: err.message });
      }
    }

    await AuditService.log({
      actorId: userId, action: "WORKSHOP_BULK_REGISTRATION_ACTION", resource: "Workshop",
      resourceId: workshopId.toString(), requestId, metadata: { action, ...results },
    }).catch(() => {});

    // Approving may free logic; promote waitlist after rejections.
    if (action === "reject") await this.promoteWaitlist(workshopId, userId, requestId).catch(() => {});

    return results;
  }

  /**
   * Export registrations as CSV text.
   */
  static async exportCsv(workshopId, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const regs = await WorkshopRegistration.find({ workshopId })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: 1 });

    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = [
      "Name", "Email", "Phone", "Status", "Payment Status", "Completion %",
      "Completed", "Certificate", "Checked In", "Registered At",
    ];
    const rows = regs.map((r) => [
      r.participantName,
      r.userId?.email || r.participantEmail,
      r.participantPhone || "",
      r.status,
      r.paymentStatus,
      r.completionPercentage ?? 0,
      r.isCompleted ? "Yes" : "No",
      r.certificateIssued ? "Yes" : "No",
      r.checkedIn ? "Yes" : "No",
      new Date(r.createdAt).toISOString(),
    ]);

    const csv = [header, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    return { csv, filename: `${workshop.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-registrations.csv`, count: regs.length };
  }
}

module.exports = { WorkshopAdminService };
