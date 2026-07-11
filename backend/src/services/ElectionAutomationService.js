const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { Vote } = require("../models/Vote");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

/**
 * ElectionAutomationService
 * -------------------------------------------------------------------------
 * Removes the manual toil of running an election. It:
 *   1. Auto-opens a phase when its voting window starts.
 *   2. Auto-closes a phase when its voting window ends, tallies the results,
 *      stores per-batch (Phase 1) / per-post (Phase 2) winners, and advances
 *      the election to the next stage.
 *   3. Notifies members when a phase opens/closes.
 *
 * It is designed to be **idempotent** and **safe to call repeatedly** — from
 * the hourly SchedulerService, and lazily whenever an election is read (so the
 * UI never shows a stale "Active" election whose window already ended).
 *
 * Phase 1 = batch representatives (top 5 winners per batch).
 * Phase 2 = office bearers (winner per post).
 * -------------------------------------------------------------------------
 */
class ElectionAutomationService {
  static ACTIVE_STATUSES = ["Active", "Phase1_Active", "Phase2_Active"];

  /** Resolve the voting window for the election's current phase. */
  static getPhaseWindow(election) {
    const phase = election.currentPhase || 1;
    const phaseCfg = phase === 1 ? election.phase1 : election.phase2;
    // Prefer per-phase window, fall back to the simple top-level window.
    const start = phaseCfg?.votingStart || election.startsOn || null;
    const end = phaseCfg?.votingEnd || election.endsOn || null;
    return { phase, start, end };
  }

  static isActive(election) {
    return this.ACTIVE_STATUSES.includes(election.status);
  }

  /**
   * Tally votes for a phase and return normalized rows sorted desc by votes.
   * Only counts votes for currently-Approved candidates.
   */
  static async tallyPhase(electionId, phase) {
    const rows = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(String(electionId)), phase } },
      { $group: { _id: "$candidateId", votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
    ]);

    const candidateIds = rows.map((r) => r._id);
    const candidates = await ElectionCandidate.find({ _id: { $in: candidateIds }, status: "Approved" })
      .populate({ path: "memberId", select: "studentId batch currentYear userId" })
      .populate("postId", "title code displayOrder");
    const byId = new Map(candidates.map((c) => [c._id.toString(), c]));

    return rows
      .filter((r) => byId.has(r._id.toString()))
      .map((r) => {
        const c = byId.get(r._id.toString());
        return {
          candidateId: c._id,
          votes: r.votes,
          batch: c.batch || c.memberId?.batch?.toString() || null,
          postId: c.postId?._id || null,
          postTitle: c.postId?.title || null,
        };
      });
  }

  /** Build Phase 1 results: top-5 winners grouped by batch. */
  static buildPhase1Results(tallied) {
    const byBatch = new Map();
    for (const row of tallied) {
      const key = row.batch || "Unknown";
      if (!byBatch.has(key)) byBatch.set(key, []);
      byBatch.get(key).push(row);
    }

    const results = [];
    for (const [batch, rows] of byBatch.entries()) {
      const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
      const ranked = [...rows].sort((a, b) => b.votes - a.votes);
      const winners = ranked.slice(0, 5).map((r, idx) => ({
        candidateId: r.candidateId,
        votes: r.votes,
        percentage: totalVotes ? Math.round((r.votes / totalVotes) * 10000) / 100 : 0,
        rank: idx + 1,
      }));
      results.push({ batch, totalVotes, totalVoters: 0, winners });
    }
    return results;
  }

  /** Build Phase 2 results: winner + runner-up per post. */
  static buildPhase2Results(tallied) {
    const byPost = new Map();
    for (const row of tallied) {
      if (!row.postId) continue;
      const key = row.postId.toString();
      if (!byPost.has(key)) byPost.set(key, []);
      byPost.get(key).push(row);
    }

    const results = [];
    for (const [postId, rows] of byPost.entries()) {
      const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
      const ranked = [...rows].sort((a, b) => b.votes - a.votes);
      const pct = (v) => (totalVotes ? Math.round((v / totalVotes) * 10000) / 100 : 0);
      results.push({
        postId: new mongoose.Types.ObjectId(postId),
        totalVotes,
        totalVoters: 0,
        winner: ranked[0]
          ? { candidateId: ranked[0].candidateId, votes: ranked[0].votes, percentage: pct(ranked[0].votes) }
          : undefined,
        runnerUp: ranked[1]
          ? { candidateId: ranked[1].candidateId, votes: ranked[1].votes, percentage: pct(ranked[1].votes) }
          : undefined,
      });
    }
    return results;
  }

  /** Persist candidate votingResults + isWinner flags for a tallied phase. */
  static async stampCandidateResults(phase, phaseResults) {
    if (phase === 1) {
      for (const batchResult of phaseResults) {
        for (const w of batchResult.winners) {
          await ElectionCandidate.findByIdAndUpdate(w.candidateId, {
            "votingResults.totalVotes": w.votes,
            "votingResults.votePercentage": w.percentage,
            "votingResults.rank": w.rank,
            "votingResults.isWinner": true,
          });
        }
      }
    } else {
      for (const postResult of phaseResults) {
        if (postResult.winner) {
          await ElectionCandidate.findByIdAndUpdate(postResult.winner.candidateId, {
            "votingResults.totalVotes": postResult.winner.votes,
            "votingResults.votePercentage": postResult.winner.percentage,
            "votingResults.rank": 1,
            "votingResults.isWinner": true,
          });
        }
        if (postResult.runnerUp) {
          await ElectionCandidate.findByIdAndUpdate(postResult.runnerUp.candidateId, {
            "votingResults.totalVotes": postResult.runnerUp.votes,
            "votingResults.votePercentage": postResult.runnerUp.percentage,
            "votingResults.rank": 2,
            "votingResults.isRunnerUp": true,
          });
        }
      }
    }
  }

  /**
   * Close the active phase: tally, store results, advance status.
   * Phase 1 Active  -> Phase1_Completed (ready for Phase 2)
   * Phase 2 Active  -> Completed
   * Returns true if the election document was changed.
   */
  static async closePhase(election, actorId = null) {
    const phase = election.currentPhase || 1;
    const tallied = await this.tallyPhase(election._id, phase);

    if (!election.results) election.results = {};

    if (phase === 1) {
      const phase1Results = this.buildPhase1Results(tallied);
      election.results.phase1Results = phase1Results;
      await this.stampCandidateResults(1, phase1Results);
      election.status = "Phase1_Completed";
      if (election.phase1) {
        election.phase1.status = "Completed";
        election.phase1.resultsPublishedAt = new Date();
      }
    } else {
      const phase2Results = this.buildPhase2Results(tallied);
      election.results.phase2Results = phase2Results;
      await this.stampCandidateResults(2, phase2Results);
      election.status = "Completed";
      election.finalResultsPublishedAt = new Date();
      if (election.phase2) {
        election.phase2.status = "Completed";
        election.phase2.resultsPublishedAt = new Date();
      }
    }

    election.auditLog = election.auditLog || [];
    if (actorId) {
      election.auditLog.push({ action: `AUTO_CLOSE_PHASE_${phase}`, performedBy: actorId, timestamp: new Date() });
    }

    await election.save();

    await AuditService.log({
      actorId: actorId || null,
      action: "ELECTION_PHASE_AUTO_CLOSED",
      resource: "Election",
      resourceId: election._id.toString(),
      metadata: { phase, status: election.status, auto: true },
    }).catch(() => {});

    await this.notifyPhaseClosed(election, phase).catch(() => {});
    return true;
  }

  /**
   * Evaluate a single election and apply any due automatic transition.
   * Returns { changed, action } describing what happened.
   */
  static async processElection(election) {
    if (!election || election.isArchived) return { changed: false };

    // Per-batch Phase 1: auto-close any batch sub-elections whose window ended.
    if (election.usePerBatchPhase1 && Array.isArray(election.phase1Batches) && election.phase1Batches.length > 0
        && ["Phase1_Active", "Setup", "Draft"].includes(election.status)) {
      try {
        const { Phase1BatchService } = require("./Phase1BatchService");
        const closed = await Phase1BatchService.processElectionBatches(election);
        if (closed > 0) return { changed: true, action: "batch_closed", closed };
      } catch (err) {
        console.error("[ElectionAutomation] batch processing error:", err.message);
      }
      // If Phase 1 is per-batch, the shared-window logic below doesn't apply.
      if (election.status === "Phase1_Active") return { changed: false };
    }

    if (!this.isActive(election)) return { changed: false };

    const { end } = this.getPhaseWindow(election);
    if (!end) return { changed: false }; // no window configured — nothing to automate
    if (new Date() < new Date(end)) return { changed: false }; // window still open

    await this.closePhase(election);
    return { changed: true, action: "closed", status: election.status };
  }

  /**
   * Lazy finalize used on read paths. Accepts an election id or document,
   * returns the (possibly updated) election document.
   */
  static async ensureFinalized(electionOrId) {
    const election =
      typeof electionOrId === "string" || electionOrId instanceof mongoose.Types.ObjectId
        ? await Election.findById(electionOrId)
        : electionOrId;
    if (!election) return null;
    await this.processElection(election).catch((err) => {
      console.error("[ElectionAutomation] ensureFinalized error:", err.message);
    });
    return election;
  }

  /**
   * Batch job entry point — scans all active elections and applies transitions.
   * Called by SchedulerService. Never throws.
   */
  static async runAutomationCheck() {
    try {
      const active = await Election.find({ status: { $in: this.ACTIVE_STATUSES }, isArchived: { $ne: true } });
      let transitioned = 0;
      for (const election of active) {
        const res = await this.processElection(election).catch((err) => {
          console.error(`[ElectionAutomation] election ${election._id} error:`, err.message);
          return { changed: false };
        });
        if (res.changed) transitioned += 1;
      }
      if (transitioned > 0) {
        console.log(`✓ Election automation advanced ${transitioned} election phase(s)`);
      }
      return transitioned;
    } catch (err) {
      console.error("[ElectionAutomation] runAutomationCheck failed:", err.message);
      return 0;
    }
  }

  static async notifyPhaseClosed(election, phase) {
    const nextHint =
      phase === 1
        ? "Phase 1 (batch representatives) results are in. Phase 2 for office bearers will follow."
        : "Final results are being published.";
    await NotificationService.createForRoleNames(["General Member", "Alumni"], {
      title: `Voting closed — ${election.name}`,
      message: `Phase ${phase} voting has ended. ${nextHint}`,
      category: "Election",
      actionUrl: `/dashboard/elections/${election._id}/results`,
      entityType: "Election",
      entityId: election._id.toString(),
    });
  }
}

module.exports = { ElectionAutomationService };
