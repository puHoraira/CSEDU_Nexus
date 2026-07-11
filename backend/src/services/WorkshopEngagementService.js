const { Workshop } = require("../models/Workshop");
const { WorkshopRegistration } = require("../models/WorkshopRegistration");
const { WorkshopSubmission } = require("../models/WorkshopSubmission");
const { WorkshopFeedback } = require("../models/WorkshopFeedback");
const { WorkshopService } = require("./WorkshopService");
const { WorkshopSessionService } = require("./WorkshopSessionService");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

class WorkshopEngagementService {
  static async assertManager(workshopId, userId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    const { userRoles } = await WorkshopService.resolveRequester(userId);
    if (!WorkshopService.isManager(workshop, userId, userRoles)) {
      throw new ApiError(403, "Only organizers can manage this.");
    }
    return workshop;
  }

  static async getMyRegistration(workshopId, userId) {
    return WorkshopRegistration.findOne({ workshopId, userId });
  }

  static async assertRegistered(workshopId, userId) {
    const reg = await this.getMyRegistration(workshopId, userId);
    if (!reg || !["Approved", "Attended"].includes(reg.status)) {
      throw new ApiError(403, "You must be an approved participant.");
    }
    return reg;
  }

  // ── Prework checklist ──────────────────────────────────────────────────────
  static async addPrework(workshopId, payload, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    workshop.prework.push({
      title: payload.title,
      description: payload.description || "",
      url: payload.url || "",
      required: payload.required !== false,
      order: payload.order ?? workshop.prework.length,
    });
    await workshop.save();
    return workshop.prework;
  }

  static async removePrework(workshopId, preworkId, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const item = workshop.prework.id(preworkId);
    if (!item) throw new ApiError(404, "Pre-work item not found");
    item.deleteOne();
    await workshop.save();
    return workshop.prework;
  }

  /**
   * Participant toggles a pre-work item done/undone.
   */
  static async togglePrework(workshopId, preworkId, done, userId) {
    const workshop = await Workshop.findById(workshopId).select("prework");
    if (!workshop) throw new ApiError(404, "Workshop not found");
    if (!workshop.prework.id(preworkId)) throw new ApiError(404, "Pre-work item not found");

    const reg = await this.assertRegistered(workshopId, userId);
    const has = reg.preworkCompleted.some((id) => id.toString() === preworkId.toString());
    if (done && !has) reg.preworkCompleted.push(preworkId);
    if (!done && has) reg.preworkCompleted = reg.preworkCompleted.filter((id) => id.toString() !== preworkId.toString());
    await reg.save();
    return { preworkCompleted: reg.preworkCompleted };
  }

  // ── Assignments ────────────────────────────────────────────────────────────
  static async addAssignment(workshopId, payload, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    workshop.assignments.push({
      title: payload.title,
      description: payload.description || "",
      dueDate: payload.dueDate || null,
      maxPoints: payload.maxPoints ?? 100,
      allowFile: payload.allowFile !== false,
      allowLink: payload.allowLink !== false,
      order: payload.order ?? workshop.assignments.length,
    });
    await workshop.save();
    return workshop.assignments;
  }

  static async removeAssignment(workshopId, assignmentId, userId) {
    const workshop = await this.assertManager(workshopId, userId);
    const item = workshop.assignments.id(assignmentId);
    if (!item) throw new ApiError(404, "Assignment not found");
    item.deleteOne();
    await workshop.save();
    await WorkshopSubmission.deleteMany({ workshopId, assignmentId });
    return workshop.assignments;
  }

  /**
   * Participant submits (or updates) an assignment.
   */
  static async submitAssignment(workshopId, assignmentId, payload, userId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    const assignment = workshop.assignments.id(assignmentId);
    if (!assignment) throw new ApiError(404, "Assignment not found");

    const reg = await this.assertRegistered(workshopId, userId);

    const submission = await WorkshopSubmission.findOneAndUpdate(
      { workshopId, assignmentId, userId },
      {
        $set: {
          content: payload.content || "",
          fileUrl: payload.fileUrl || "",
          fileName: payload.fileName || "",
          linkUrl: payload.linkUrl || "",
          status: "Submitted",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Re-evaluate completion (assignments may gate it).
    await WorkshopSessionService.recomputeCompletion(workshop, reg);

    return submission;
  }

  static async listMySubmissions(workshopId, userId) {
    return WorkshopSubmission.find({ workshopId, userId });
  }

  static async listSubmissions(workshopId, assignmentId, userId) {
    await this.assertManager(workshopId, userId);
    const filter = { workshopId };
    if (assignmentId) filter.assignmentId = assignmentId;
    return WorkshopSubmission.find(filter).populate("userId", "firstName lastName email avatarUrl").sort({ createdAt: -1 });
  }

  static async gradeSubmission(submissionId, payload, userId) {
    const submission = await WorkshopSubmission.findById(submissionId);
    if (!submission) throw new ApiError(404, "Submission not found");
    await this.assertManager(submission.workshopId, userId);
    submission.grade = payload.grade;
    submission.feedback = payload.feedback || "";
    submission.status = "Reviewed";
    submission.reviewedBy = userId;
    submission.reviewedAt = new Date();
    await submission.save();
    return submission;
  }

  // ── Feedback & rating ───────────────────────────────────────────────────────
  static async submitFeedback(workshopId, payload, userId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    if (!workshop.feedbackEnabled) throw new ApiError(400, "Feedback is not enabled for this workshop.");

    const reg = await this.getMyRegistration(workshopId, userId);
    if (!reg || !["Approved", "Attended"].includes(reg.status)) {
      throw new ApiError(403, "Only participants can leave feedback.");
    }

    const prior = await WorkshopFeedback.findOne({ workshopId, userId });

    const doc = await WorkshopFeedback.findOneAndUpdate(
      { workshopId, userId },
      {
        $set: {
          rating: payload.rating,
          comment: payload.comment || "",
          contentRating: payload.contentRating,
          instructorRating: payload.instructorRating,
          organizationRating: payload.organizationRating,
          wouldRecommend: payload.wouldRecommend,
          isAnonymous: Boolean(payload.isAnonymous),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Recompute aggregate rating from scratch (accurate, handles edits).
    const agg = await WorkshopFeedback.aggregate([
      { $match: { workshopId: workshop._id } },
      { $group: { _id: null, sum: { $sum: "$rating" }, count: { $sum: 1 } } },
    ]);
    const sum = agg[0]?.sum || 0;
    const count = agg[0]?.count || 0;
    workshop.ratingStats = {
      sumRatings: sum,
      totalRatings: count,
      averageRating: count ? Math.round((sum / count) * 10) / 10 : 0,
    };
    await workshop.save();

    await AuditService.log({
      actorId: userId,
      action: prior ? "WORKSHOP_FEEDBACK_UPDATED" : "WORKSHOP_FEEDBACK_CREATED",
      resource: "WorkshopFeedback",
      resourceId: doc._id.toString(),
      metadata: { workshopId, rating: payload.rating },
    }).catch(() => {});

    return doc;
  }

  static async getFeedbackSummary(workshopId, userId) {
    const workshop = await Workshop.findById(workshopId).select("ratingStats feedbackEnabled createdBy");
    if (!workshop) throw new ApiError(404, "Workshop not found");

    const myFeedback = userId ? await WorkshopFeedback.findOne({ workshopId, userId }) : null;

    // Managers see full list; others see anonymized comments only.
    let isManager = false;
    if (userId) {
      const { userRoles } = await WorkshopService.resolveRequester(userId);
      isManager = WorkshopService.isManager(workshop, userId, userRoles);
    }

    const feedbackDocs = await WorkshopFeedback.find({ workshopId })
      .populate("userId", "firstName lastName avatarUrl")
      .sort({ createdAt: -1 })
      .limit(isManager ? 200 : 20);

    const list = feedbackDocs.map((f) => ({
      _id: f._id,
      rating: f.rating,
      comment: f.comment,
      wouldRecommend: f.wouldRecommend,
      createdAt: f.createdAt,
      author: f.isAnonymous && !isManager
        ? { name: "Anonymous" }
        : { name: f.userId ? `${f.userId.firstName} ${f.userId.lastName}` : "Participant", avatarUrl: f.userId?.avatarUrl },
    }));

    return {
      stats: workshop.ratingStats,
      feedbackEnabled: workshop.feedbackEnabled,
      myFeedback,
      feedback: list,
    };
  }
}

module.exports = { WorkshopEngagementService };
