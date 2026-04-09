const { ApiError } = require("../core/ApiError");
const { Member } = require("../models/Member");
const { MembershipCancellation } = require("../models/MembershipCancellation");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { AuditService } = require("./AuditService");

class MembershipService {
  static async listMembers() {
    return Member.find({}).sort({ batch: -1, studentId: 1 });
  }

  static async listCancellationRequests() {
    return MembershipCancellation.find({})
      .populate("memberId", "studentId batch status")
      .sort({ createdAt: -1 });
  }

  static async createCancellationRequest(payload, actorId, requestId) {
    const member = await Member.findById(payload.memberId);
    if (!member) throw new ApiError(404, "Member not found");
    if (member.status !== "Active") throw new ApiError(400, "Only active members can be cancelled");

    const request = await MembershipCancellation.create({
      memberId: payload.memberId,
      reason: payload.reason,
      requestedBy: actorId,
      status: "InReview",
    });

    await AuditService.log({
      actorId,
      action: "MEMBERSHIP_CANCELLATION_REQUESTED",
      resource: "MembershipCancellation",
      resourceId: request._id.toString(),
      requestId,
    });

    return request;
  }

  static async reviewCancellationRequest(id, roleName, actorId, action, comment, requestId) {
    const request = await MembershipCancellation.findById(id);
    if (!request) throw new ApiError(404, "Cancellation request not found");
    if (!["InReview", "Approved"].includes(request.status)) {
      throw new ApiError(400, "Cancellation request cannot be reviewed in current state");
    }

    const step = request.approvals.find((item) => item.role === roleName);
    if (!step) throw new ApiError(400, `No approval step assigned for role: ${roleName}`);
    if (step.action !== "Pending") throw new ApiError(409, "This role has already reviewed the request");

    step.action = action;
    step.actorId = actorId;
    step.actedAt = new Date();
    step.comment = comment || "";

    if (action === "Rejected") {
      request.status = "Rejected";
    } else {
      const allApproved = request.approvals.every((item) => item.action === "Approved");
      request.status = allApproved ? "Approved" : "InReview";
    }

    await request.save();

    await AuditService.log({
      actorId,
      action: "MEMBERSHIP_CANCELLATION_REVIEWED",
      resource: "MembershipCancellation",
      resourceId: request._id.toString(),
      requestId,
      metadata: { roleName, action },
    });

    return request;
  }

  static async executeApprovedCancellation(id, actorId, requestId) {
    const request = await MembershipCancellation.findById(id);
    if (!request) throw new ApiError(404, "Cancellation request not found");
    if (request.status !== "Approved") throw new ApiError(400, "Request must be fully approved before execution");

    await Member.findByIdAndUpdate(request.memberId, { status: "Cancelled" });
    request.status = "Executed";
    request.executedAt = new Date();
    await request.save();

    await AuditService.log({
      actorId,
      action: "MEMBERSHIP_CANCELLED",
      resource: "Member",
      resourceId: request.memberId.toString(),
      requestId,
      metadata: { requestId: request._id.toString() },
    });

    return request;
  }

  static async issueMembership(memberId, actorId, requestId) {
    const member = await Member.findById(memberId);
    if (!member) throw new ApiError(404, "Member not found");

    member.status = "Active";
    await member.save();

    await AuditService.log({
      actorId,
      action: "MEMBERSHIP_ISSUED",
      resource: "Member",
      resourceId: member._id.toString(),
      requestId,
    });

    return member;
  }

  static async cancelMembershipDirect(memberId, actorId, reason, requestId) {
    const member = await Member.findById(memberId);
    if (!member) throw new ApiError(404, "Member not found");

    member.status = "Cancelled";
    await member.save();

    await AuditService.log({
      actorId,
      action: "MEMBERSHIP_CANCELLED_DIRECT",
      resource: "Member",
      resourceId: member._id.toString(),
      requestId,
      metadata: { reason },
    });

    return member;
  }

  static async grantAlumniRole(memberId, actorId, requestId) {
    const member = await Member.findById(memberId);
    if (!member) throw new ApiError(404, "Member not found");

    const role = await Role.findOne({ name: "Alumni" });
    if (!role) throw new ApiError(500, "Alumni role is missing");

    const existing = await UserRole.findOne({
      userId: member.userId,
      roleId: role._id,
      $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
    });
    if (!existing) {
      await UserRole.create({ userId: member.userId, roleId: role._id });
    }

    await AuditService.log({
      actorId,
      action: "ALUMNI_ROLE_GRANTED",
      resource: "UserRole",
      resourceId: member.userId.toString(),
      requestId,
      metadata: { memberId: member._id.toString() },
    });

    return { memberId: member._id.toString(), userId: member.userId.toString(), role: "Alumni" };
  }
}

module.exports = { MembershipService };
