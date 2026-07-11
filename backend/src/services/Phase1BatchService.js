const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { EcPost } = require("../models/EcPost");
const { EcTerm } = require("../models/EcTerm");
const { EcAppointment } = require("../models/EcAppointment");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

/**
 * Phase1BatchService
 * -------------------------------------------------------------------------
 * Runs Phase 1 as independent per-batch sub-elections (Constitution ARTICLE
 * XIV: each batch elects its own representatives). Commissioners activate /
 * pause / edit each batch sub-election; automation tallies + closes each on
 * its own deadline. When ALL batches complete, the parent election advances
 * to Phase1_Completed so Phase 2 can begin.
 *
 * On batch close, winners are auto-appointed as Batch Representatives +
 * Executive Members (with manual override available separately).
 * -------------------------------------------------------------------------
 */
class Phase1BatchService {
  /**
   * Create/refresh the per-batch sub-elections from the approved Phase-1
   * candidates. Batches with candidates get a sub-election entry. Existing
   * entries keep their status/windows; new batches are appended.
   */
  static async initBatches(electionId, options = {}, actorId = null, requestId = null) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // Distinct batches among Phase-1 candidates (approved by default).
    const statusFilter = options.includeAllStatuses ? {} : { status: "Approved" };
    const candidates = await ElectionCandidate.find({ electionId, phase: 1, ...statusFilter }).select("batch memberId");
    const batches = [...new Set(candidates.map((c) => c.batch).filter(Boolean).map(String))].sort();

    const existing = new Map((election.phase1Batches || []).map((b) => [b.batch, b]));
    for (const batch of batches) {
      if (!existing.has(batch)) {
        election.phase1Batches.push({
          batch,
          label: `Batch ${batch}`,
          repSeats: options.repSeats || 5,
          maxVotesPerVoter: options.maxVotesPerVoter || 5,
          votingStart: options.votingStart || null,
          votingEnd: options.votingEnd || null,
          status: "Not_Started",
        });
      }
    }
    election.usePerBatchPhase1 = true;
    if (election.currentPhase === 0) election.currentPhase = 1;
    await election.save();

    await AuditService.log({
      actorId, action: "ELECTION_PHASE1_BATCHES_INIT", resource: "Election",
      resourceId: electionId.toString(), requestId, metadata: { batches },
    }).catch(() => {});

    return election.phase1Batches;
  }

  static getBatch(election, batchKey) {
    const sub = (election.phase1Batches || []).find((b) => b.batch === String(batchKey) || b._id.toString() === String(batchKey));
    if (!sub) throw new ApiError(404, "Batch sub-election not found");
    return sub;
  }

  /** Activate a batch sub-election (opens voting). */
  static async setBatchStatus(electionId, batchKey, status, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");
    const sub = this.getBatch(election, batchKey);

    const valid = ["Not_Started", "Active", "Paused", "Completed", "Cancelled"];
    if (!valid.includes(status)) throw new ApiError(400, `Invalid status: ${status}`);

    // Guard transitions.
    if (status === "Active") {
      if (sub.status === "Completed") throw new ApiError(400, "This batch already completed");
      // Parent must be in a Phase-1 state.
      if (!["Setup", "Draft", "Phase1_Active"].includes(election.status)) {
        // allow re-activation while Phase1_Active
        if (election.status !== "Phase1_Active") {
          election.status = "Phase1_Active";
        }
      }
      if (election.status !== "Phase1_Active") election.status = "Phase1_Active";
      if (election.currentPhase !== 1) election.currentPhase = 1;
      if (election.phase1) election.phase1.status = "Voting_Active";
    }

    sub.status = status;
    if (status === "Completed" && !sub.resultsPublishedAt) {
      // Closing manually → tally now.
      await this._tallyAndStamp(election, sub);
    }
    await election.save();

    await AuditService.log({
      actorId, action: `ELECTION_BATCH_${status.toUpperCase()}`, resource: "Election",
      resourceId: electionId.toString(), requestId, metadata: { batch: sub.batch, status },
    }).catch(() => {});

    // Closing may complete the whole phase + trigger appointments.
    if (status === "Completed") {
      await this._afterBatchClose(election, sub, actorId, requestId);
    }

    return election.phase1Batches;
  }

  /** Edit a batch sub-election's window / seats. */
  static async updateBatch(electionId, batchKey, payload, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");
    const sub = this.getBatch(election, batchKey);

    ["label", "repSeats", "maxVotesPerVoter"].forEach((k) => {
      if (payload[k] !== undefined) sub[k] = payload[k];
    });
    if (payload.votingStart !== undefined) sub.votingStart = payload.votingStart ? new Date(payload.votingStart) : null;
    if (payload.votingEnd !== undefined) sub.votingEnd = payload.votingEnd ? new Date(payload.votingEnd) : null;
    await election.save();

    await AuditService.log({
      actorId, action: "ELECTION_BATCH_UPDATED", resource: "Election",
      resourceId: electionId.toString(), requestId, metadata: { batch: sub.batch },
    }).catch(() => {});
    return election.phase1Batches;
  }

  /**
   * Tally votes for one batch, store winners (top repSeats), stamp candidates.
   */
  static async _tallyAndStamp(election, sub) {
    const rows = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(String(election._id)), phase: 1, batch: sub.batch } },
      { $group: { _id: "$candidateId", votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
    ]);

    const candidateIds = rows.map((r) => r._id);
    const candidates = await ElectionCandidate.find({ _id: { $in: candidateIds }, status: "Approved" }).select("_id memberId batch");
    const byId = new Map(candidates.map((c) => [c._id.toString(), c]));

    const valid = rows.filter((r) => byId.has(r._id.toString()));
    const totalVotes = valid.reduce((sum, r) => sum + r.votes, 0);
    const seats = sub.repSeats || 5;

    const winners = valid.slice(0, seats).map((r, idx) => {
      const c = byId.get(r._id.toString());
      return {
        candidateId: c._id,
        memberId: c.memberId,
        votes: r.votes,
        percentage: totalVotes ? Math.round((r.votes / totalVotes) * 10000) / 100 : 0,
        rank: idx + 1,
        appointed: false,
      };
    });

    sub.winners = winners;
    sub.totalVotes = totalVotes;
    const voterCount = await Vote.distinct("voterMemberId", { electionId: election._id, phase: 1, batch: sub.batch });
    sub.totalVoters = voterCount.length;
    sub.resultsPublishedAt = new Date();
    sub.status = "Completed";

    // Stamp candidate winner flags.
    for (const w of winners) {
      await ElectionCandidate.findByIdAndUpdate(w.candidateId, {
        "votingResults.totalVotes": w.votes,
        "votingResults.votePercentage": w.percentage,
        "votingResults.rank": w.rank,
        "votingResults.isWinner": true,
      });
    }

    // Mirror into the election-level phase1Results for backward compatibility.
    election.results = election.results || {};
    const p1 = (election.results.phase1Results || []).filter((r) => r.batch !== sub.batch);
    p1.push({
      batch: sub.batch,
      totalVotes,
      totalVoters: sub.totalVoters,
      winners: winners.map((w) => ({ candidateId: w.candidateId, votes: w.votes, percentage: w.percentage })),
    });
    election.results.phase1Results = p1;
  }

  /**
   * After a batch closes: auto-appoint its reps, notify, and if all batches
   * are done, advance the parent election to Phase1_Completed.
   */
  static async _afterBatchClose(election, sub, actorId, requestId) {
    // Auto-appoint this batch's winners (batch reps + executive members).
    await this.appointBatchWinners(election, sub, actorId, requestId).catch((err) => {
      console.error(`[Phase1Batch] appoint error for batch ${sub.batch}:`, err.message);
    });

    await NotificationService.createForRoleNames(["General Member"], {
      title: `Batch ${sub.batch} results published`,
      message: `Representative results for Batch ${sub.batch} are now available.`,
      category: "Election",
      actionUrl: `/dashboard/elections/${election._id}/results`,
      entityType: "Election",
      entityId: election._id.toString(),
    }).catch(() => {});

    // If every batch sub-election is Completed/Cancelled, advance the phase.
    const allDone = (election.phase1Batches || []).every((b) => ["Completed", "Cancelled"].includes(b.status));
    if (allDone && election.phase1Batches.length > 0) {
      election.status = "Phase1_Completed";
      if (election.phase1) {
        election.phase1.status = "Completed";
        election.phase1.resultsPublishedAt = new Date();
      }
      await election.save();
      await AuditService.log({
        actorId: actorId || null, action: "ELECTION_PHASE1_COMPLETED_AUTO", resource: "Election",
        resourceId: election._id.toString(), requestId, metadata: { batches: election.phase1Batches.length },
      }).catch(() => {});
      await NotificationService.createForRoleNames(["Moderator", "System Admin"], {
        title: `Phase 1 complete — ${election.name}`,
        message: `All batch representative elections have concluded. You can now start Phase 2 (office bearers).`,
        category: "Election",
        actionUrl: `/dashboard/election-commission`,
        entityType: "Election",
        entityId: election._id.toString(),
      }).catch(() => {});
    } else {
      await election.save();
    }
  }

  /**
   * Appoint a batch's winners as Batch Representatives + Executive Members.
   * Idempotent — skips winners already appointed. Uses EXECUTIVE_MEMBER posts.
   */
  static async appointBatchWinners(election, sub, actorId, requestId) {
    if (!election.termId) return { appointed: 0, errors: ["No term"] };
    const term = await EcTerm.findById(election.termId);
    const startsOn = term?.startsOn || new Date();

    const execPosts = await EcPost.find({ code: /EXECUTIVE_MEMBER|BATCH_REP|REPRESENTATIVE/i, isActive: true }).sort({ displayOrder: 1 });

    let appointed = 0;
    const errors = [];
    for (const w of sub.winners) {
      if (w.appointed) continue;
      try {
        // Find a free exec/rep post in this term.
        let assigned = null;
        for (const p of execPosts) {
          const held = await EcAppointment.findOne({ termId: election.termId, postId: p._id, endsOn: null });
          if (!held) { assigned = p; break; }
        }
        if (!assigned) { errors.push({ batch: sub.batch, memberId: w.memberId, reason: "No free executive/rep post" }); continue; }

        const existing = await EcAppointment.findOne({ termId: election.termId, memberId: w.memberId, endsOn: null });
        if (existing) { w.appointed = true; continue; }

        await EcAppointment.create({
          termId: election.termId,
          postId: assigned._id,
          memberId: w.memberId,
          startsOn,
          source: "Election",
        });
        w.appointed = true;
        appointed += 1;

        await AuditService.log({
          actorId: actorId || null, action: "EC_BATCH_REP_APPOINTED", resource: "EcAppointment",
          resourceId: w.memberId?.toString(), requestId, metadata: { batch: sub.batch, postId: assigned._id.toString() },
        }).catch(() => {});
      } catch (err) {
        errors.push({ batch: sub.batch, memberId: w.memberId, reason: err.message });
      }
    }
    return { appointed, errors };
  }

  /** Manually (re)appoint all winners for a batch — commissioner override. */
  static async manualAppointBatch(electionId, batchKey, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");
    const sub = this.getBatch(election, batchKey);
    if (sub.status !== "Completed") throw new ApiError(400, "Batch is not completed yet");
    const result = await this.appointBatchWinners(election, sub, actorId, requestId);
    await election.save();
    return result;
  }

  /** Get all batch sub-elections with candidate counts + winner names. */
  static async listBatches(electionId) {
    const election = await Election.findById(electionId).select("phase1Batches");
    if (!election) throw new ApiError(404, "Election not found");

    const out = [];
    for (const sub of election.phase1Batches || []) {
      const candidateCount = await ElectionCandidate.countDocuments({ electionId, phase: 1, batch: sub.batch, status: "Approved" });
      const winnerIds = sub.winners.map((w) => w.candidateId);
      const winnerCandidates = await ElectionCandidate.find({ _id: { $in: winnerIds } })
        .populate({ path: "memberId", select: "studentId userId", populate: { path: "userId", select: "firstName lastName" } });
      const nameById = new Map(winnerCandidates.map((c) => [c._id.toString(), c]));

      out.push({
        _id: sub._id,
        batch: sub.batch,
        label: sub.label,
        status: sub.status,
        votingStart: sub.votingStart,
        votingEnd: sub.votingEnd,
        repSeats: sub.repSeats,
        maxVotesPerVoter: sub.maxVotesPerVoter,
        candidateCount,
        totalVotes: sub.totalVotes,
        totalVoters: sub.totalVoters,
        resultsPublishedAt: sub.resultsPublishedAt,
        winners: sub.winners.map((w) => {
          const c = nameById.get(w.candidateId?.toString());
          const u = c?.memberId?.userId;
          return {
            candidateId: w.candidateId,
            memberId: w.memberId,
            name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown",
            studentId: c?.memberId?.studentId,
            votes: w.votes,
            percentage: w.percentage,
            rank: w.rank,
            appointed: w.appointed,
          };
        }),
      });
    }
    return out;
  }

  /**
   * Automation entry: auto-close batches whose voting window has ended.
   * Returns number of batches closed.
   */
  static async processElectionBatches(election, actorId = null) {
    if (!election || election.isArchived) return 0;
    if (!election.usePerBatchPhase1) return 0;
    if (!["Phase1_Active", "Setup", "Draft"].includes(election.status)) return 0;

    const now = new Date();
    let closed = 0;
    for (const sub of election.phase1Batches || []) {
      if (sub.status === "Active" && sub.votingEnd && new Date(sub.votingEnd) <= now) {
        await this._tallyAndStamp(election, sub);
        await this._afterBatchClose(election, sub, actorId, null);
        closed += 1;
      }
    }
    return closed;
  }
}

module.exports = { Phase1BatchService };
