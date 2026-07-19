const { Workshop } = require("../models/Workshop");
const { WorkshopRegistration } = require("../models/WorkshopRegistration");
const { WorkshopSubmission } = require("../models/WorkshopSubmission");
const { WorkshopService } = require("./WorkshopService");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

/**
 * Sessions/agenda + per-session attendance + completion computation.
 */
class WorkshopSessionService {
  static async assertManager(workshopId, userId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    const { userRoles } = await WorkshopService.resolveRequester(userId);
    if (!WorkshopService.isManager(workshop, userId, userRoles)) {
      throw new ApiError(403, "Only organizers can manage this workshop.");
    }
    return workshop;
  }

  // ── Sessions CRUD ─────────────────────────────────────────────────────────
  static async listSessions(workshopId) {
    const workshop = await Workshop.findById(workshopId).select("sessions");
    if (!workshop) throw new ApiError(404, "Workshop not found");
    return [...(workshop.sessions || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  static async addSession(workshopId, payload, userId, requestId) {
    const workshop = await this.assertManager(workshopId, userId);
    workshop.sessions.push({
      title: payload.title,
      description: payload.description || "",
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
      location: payload.location || "",
      isOnline: Boolean(payload.isOnline),
      speaker: payload.speaker || "",
      order: payload.order ?? workshop.sessions.length,
    });
    await workshop.save();
    await AuditService.log({ actorId: userId, action: "WORKSHOP_SESSION_ADDED", resource: "Workshop", resourceId: workshopId, requestId }).catch(() => {});
    return workshop.sessions;
  }

  static async updateSession(workshopId, sessionId, payload, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const session = workshop.sessions.id(sessionId);
    if (!session) throw new ApiError(404, "Session not found");
    ["title", "description", "startTime", "endTime", "location", "isOnline", "speaker", "order"].forEach((k) => {
      if (payload[k] !== undefined) session[k] = payload[k];
    });
    await workshop.save();
    return workshop.sessions;
  }

  static async removeSession(workshopId, sessionId, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const session = workshop.sessions.id(sessionId);
    if (!session) throw new ApiError(404, "Session not found");
    session.deleteOne();
    await workshop.save();
    // Clean attendance references for the removed session.
    await WorkshopRegistration.updateMany(
      { workshopId },
      { $pull: { sessionAttendance: { sessionId } } }
    );
    return workshop.sessions;
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  /**
   * Mark attendance for one participant + one session. Recomputes completion.
   */
  static async markAttendance(workshopId, sessionId, targetUserId, attended, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const session = workshop.sessions.id(sessionId);
    if (!session) throw new ApiError(404, "Session not found");

    // Try to find by userId first, if not found, try by registration _id (fallback)
    let reg = await WorkshopRegistration.findOne({ workshopId, userId: targetUserId });
    if (!reg) {
      reg = await WorkshopRegistration.findOne({ workshopId, _id: targetUserId });
    }
    if (!reg) throw new ApiError(404, "Registration not found");

    const existing = reg.sessionAttendance.find((a) => a.sessionId.toString() === sessionId.toString());
    if (existing) {
      existing.attended = attended;
      existing.markedAt = new Date();
      existing.markedBy = userId;
    } else {
      reg.sessionAttendance.push({ sessionId, attended, markedAt: new Date(), markedBy: userId });
    }
    await reg.save();
    await this.recomputeCompletion(workshop, reg);
    return reg;
  }

  /**
   * Bulk-mark a session's attendance from a list of { userId, attended }.
   */
  static async bulkMarkAttendance(workshopId, sessionId, entries, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const session = workshop.sessions.id(sessionId);
    if (!session) throw new ApiError(404, "Session not found");

    let updated = 0;
    for (const entry of entries) {
      const reg = await WorkshopRegistration.findOne({ workshopId, userId: entry.userId });
      if (!reg) continue;
      const existing = reg.sessionAttendance.find((a) => a.sessionId.toString() === sessionId.toString());
      if (existing) {
        existing.attended = entry.attended;
        existing.markedAt = new Date();
        existing.markedBy = userId;
      } else {
        reg.sessionAttendance.push({ sessionId, attended: entry.attended, markedAt: new Date(), markedBy: userId });
      }
      await reg.save();
      await this.recomputeCompletion(workshop, reg);
      updated += 1;
    }
    return { updated };
  }

  /**
   * Compute a registration's completion percentage and flag completion.
   * completion% = attended sessions / total sessions * 100 (falls back to
   * check-in when a workshop has no sessions).
   */
  static async recomputeCompletion(workshop, reg) {
    const totalSessions = (workshop.sessions || []).length;
    let pct = 0;

    if (totalSessions > 0) {
      const attended = reg.sessionAttendance.filter((a) => a.attended).length;
      pct = Math.round((attended / totalSessions) * 100);
    } else {
      pct = reg.checkedIn ? 100 : 0;
    }

    reg.completionPercentage = pct;

    // Assignment gate.
    let assignmentsOk = true;
    if (workshop.completion?.requireAllAssignments && (workshop.assignments || []).length > 0) {
      const submitted = await WorkshopSubmission.countDocuments({ workshopId: workshop._id, userId: reg.userId });
      assignmentsOk = submitted >= workshop.assignments.length;
    }

    const threshold = workshop.completion?.minAttendancePercentage ?? 75;
    const nowComplete = pct >= threshold && assignmentsOk;

    if (nowComplete && !reg.isCompleted) {
      reg.isCompleted = true;
      reg.completedAt = new Date();
    } else if (!nowComplete && reg.isCompleted) {
      reg.isCompleted = false;
      reg.completedAt = null;
    }
    await reg.save();
    return reg;
  }

  /**
   * Manager overview: attendance grid + completion for all registrations.
   */
  static async getAttendanceOverview(workshopId, userId) {
    await this.assertManager(workshopId, userId);
    const workshop = await Workshop.findById(workshopId).select("sessions completion");
    const regs = await WorkshopRegistration.find({
      workshopId,
      status: { $in: ["Approved", "Attended"] },
    }).populate("userId", "firstName lastName email avatarUrl");

    const sessions = [...(workshop.sessions || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const participants = regs.map((reg) => ({
      registrationId: reg._id,
      userId: reg.userId?._id?.toString() || reg._id.toString(), // Fallback to registrationId if userId is null
      name: reg.userId ? `${reg.userId.firstName} ${reg.userId.lastName}` : reg.participantName,
      email: reg.userId?.email || reg.participantEmail,
      avatarUrl: reg.userId?.avatarUrl,
      completionPercentage: reg.completionPercentage,
      isCompleted: reg.isCompleted,
      certificateIssued: reg.certificateIssued,
      attendance: sessions.map((s) => {
        const a = reg.sessionAttendance.find((x) => x.sessionId.toString() === s._id.toString());
        return { sessionId: s._id, attended: Boolean(a?.attended) };
      }),
    }));

    return {
      sessions: sessions.map((s) => ({ _id: s._id, title: s.title, startTime: s.startTime })),
      completionThreshold: workshop.completion?.minAttendancePercentage ?? 75,
      participants,
    };
  }
}

module.exports = { WorkshopSessionService };
