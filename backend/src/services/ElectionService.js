const { ApiError } = require("../core/ApiError");
const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { EcPost } = require("../models/EcPost");
const { policyRegistry } = require("../policies");
const { AuditService } = require("./AuditService");

class ElectionService {
  static async createElection(payload, actorId, requestId) {
    const item = await Election.create(payload);
    await AuditService.log({
      actorId,
      action: "ELECTION_CREATED",
      resource: "Election",
      resourceId: item._id.toString(),
      requestId,
    });
    return item;
  }

  static async listElections() {
    return Election.find({}).sort({ createdAt: -1 });
  }

  static async addCandidate(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    const member = await Member.findById(payload.memberId);
    if (!election || !member) throw new ApiError(404, "Election or member not found");
    if (member.status !== "Active") throw new ApiError(400, "Only active members can be candidates");

    if (election.phase === 1 && payload.postId) {
      throw new ApiError(400, "Phase 1 (batch representative) candidates must not include postId");
    }

    if (election.phase === 2 && !payload.postId) {
      throw new ApiError(400, "Phase 2 (office-bearer) candidates must include postId");
    }

    let post = null;
    if (payload.postId) {
      post = await EcPost.findById(payload.postId);
      if (!post) throw new ApiError(404, "EC post not found");
      const check = await policyRegistry.evaluate("ec.holdPost", {
        memberYear: member.currentYear,
        memberEcYears: payload.memberEcYears || 0,
        post,
      });
      if (!check.allowed) throw new ApiError(400, check.reason || "Candidate ineligible");
    }

    const candidate = await ElectionCandidate.create({
      electionId: payload.electionId,
      memberId: payload.memberId,
      postId: payload.postId || null,
      status: "Pending",
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_ADDED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { electionId: payload.electionId, postId: payload.postId || null },
    });

    return candidate;
  }

  static async listCandidates(electionId) {
    const election = await Election.findById(electionId).select("_id phase");
    if (!election) throw new ApiError(404, "Election not found");

    return ElectionCandidate.find({ electionId })
      .populate({ path: "memberId", select: "studentId batch currentYear status userId", populate: { path: "userId", select: "firstName lastName email" } })
      .populate("postId", "title code displayOrder")
      .sort({ createdAt: 1 });
  }

  static async castVote(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    if (!election) throw new ApiError(404, "Election not found");
    if (election.status !== "Active") throw new ApiError(400, "Election is not active");

    const now = new Date();
    if (now < election.startsOn || now > election.endsOn) {
      throw new ApiError(400, "Election is outside the active voting time window");
    }

    const voter = payload.voterMemberId
      ? await Member.findById(payload.voterMemberId)
      : await Member.findOne({ userId: actorId });
    if (!voter) throw new ApiError(404, "Voter member not found");
    if (voter.status !== "Active") throw new ApiError(400, "Only active members can vote");
    if (voter.userId.toString() !== actorId) {
      throw new ApiError(403, "You can only cast vote for your own member account");
    }

    const candidate = await ElectionCandidate.findById(payload.candidateId);
    if (!candidate || candidate.electionId.toString() !== payload.electionId) {
      throw new ApiError(400, "Candidate does not belong to the election");
    }
    if (candidate.status !== "Approved") {
      throw new ApiError(400, "Only approved candidates can receive votes");
    }

    const candidateMember = await Member.findById(candidate.memberId).select("batch");
    if (!candidateMember) throw new ApiError(404, "Candidate member record not found");

    if (election.phase === 1) {
      if (candidate.postId) {
        throw new ApiError(400, "Phase 1 vote can only target representative candidates");
      }

      if (candidateMember.batch !== voter.batch) {
        throw new ApiError(400, "Phase 1 vote is restricted to candidates from your own batch");
      }

      const votesCast = await Vote.countDocuments({ electionId: payload.electionId, voterMemberId: voter._id });
      if (votesCast >= 5) {
        throw new ApiError(400, "Phase 1 allows a maximum of 5 votes per voter");
      }
    }

    if (election.phase === 2) {
      if (!candidate.postId) {
        throw new ApiError(400, "Phase 2 vote requires office-bearing candidates");
      }

      const existingVotes = await Vote.find({ electionId: payload.electionId, voterMemberId: voter._id }).populate("candidateId", "postId");
      const alreadyVotedForPost = existingVotes.some(
        (vote) => vote.candidateId && vote.candidateId.postId && vote.candidateId.postId.toString() === candidate.postId.toString()
      );
      if (alreadyVotedForPost) {
        throw new ApiError(400, "You have already voted for this post in Phase 2");
      }
    }

    const vote = await Vote.create({
      electionId: payload.electionId,
      voterMemberId: voter._id,
      candidateId: payload.candidateId,
    });
    await AuditService.log({
      actorId,
      action: "ELECTION_VOTE_CAST",
      resource: "Vote",
      resourceId: vote._id.toString(),
      requestId,
      metadata: { electionId: payload.electionId },
    });
    return vote;
  }

  static async getResults(electionId) {
    const election = await Election.findById(electionId).select("_id phase");
    if (!election) throw new ApiError(404, "Election not found");

    const rows = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      { $group: { _id: "$candidateId", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const candidateIds = rows.map((row) => row._id);
    const candidates = await ElectionCandidate.find({ _id: { $in: candidateIds } })
      .populate({ path: "memberId", select: "studentId batch currentYear userId", populate: { path: "userId", select: "firstName lastName email" } })
      .populate("postId", "title code displayOrder");

    const candidateMap = new Map(candidates.map((candidate) => [candidate._id.toString(), candidate]));

    return rows.map((row) => {
      const candidate = candidateMap.get(row._id.toString());
      const user = candidate?.memberId?.userId;
      return {
        candidateId: row._id,
        total: row.total,
        candidateStatus: candidate?.status || "Unknown",
        memberId: candidate?.memberId?._id || null,
        candidateName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown",
        studentId: candidate?.memberId?.studentId || null,
        batch: candidate?.memberId?.batch || null,
        post: candidate?.postId ? { _id: candidate.postId._id, title: candidate.postId.title, code: candidate.postId.code } : null,
      };
    });
  }

  static async updatePhase(electionId, payload, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    if (typeof payload.phase === "number") election.phase = payload.phase;
    if (payload.status) election.status = payload.status;
    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_PHASE_UPDATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { phase: election.phase, status: election.status },
    });

    return election;
  }

  static async validateCandidate(candidateId, action, reason, actorId, requestId) {
    const candidate = await ElectionCandidate.findById(candidateId);
    if (!candidate) throw new ApiError(404, "Candidate not found");

    candidate.status = action;
    candidate.rejectionReason = action === "Rejected" ? reason || "Rejected by commission" : "";
    await candidate.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_VALIDATED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { action },
    });

    return candidate;
  }

  static async cancelCandidate(candidateId, reason, actorId, requestId) {
    return this.validateCandidate(candidateId, "Rejected", reason, actorId, requestId);
  }

  static async publishResults(electionId, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    const results = await this.getResults(electionId);
    election.status = "Closed";
    election.resultsPublishedAt = new Date();
    election.resultsPublishedBy = actorId;
    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_RESULTS_PUBLISHED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
    });

    return { election, results };
  }
}

module.exports = { ElectionService };
