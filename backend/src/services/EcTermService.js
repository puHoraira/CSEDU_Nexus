const { EcTerm } = require("../models/EcTerm");
const { Election } = require("../models/Election");
const { EcAppointment } = require("../models/EcAppointment");
const { ApiError } = require("../core/ApiError");

class EcTermService {
  /**
   * Create a new EC Term
   * @param {Object} payload - Term data
   * @param {string} actorId - User ID creating the term
   * @returns {Promise<Object>} Created term
   */
  static async createTerm(payload, actorId) {
    const { name, startsOn, endsOn, status } = payload;

    // Validate dates
    if (new Date(startsOn) >= new Date(endsOn)) {
      throw new ApiError(400, "Term end date must be after start date");
    }

    // Check for overlapping terms
    const overlappingTerm = await EcTerm.findOne({
      $or: [
        { startsOn: { $lte: endsOn }, endsOn: { $gte: startsOn } }
      ],
      status: { $in: ["Active", "Draft"] }
    });

    if (overlappingTerm) {
      throw new ApiError(
        400,
        `Term dates overlap with existing term: ${overlappingTerm.name}`
      );
    }

    const term = await EcTerm.create({
      name,
      startsOn,
      endsOn,
      status: status || "Draft"
    });

    console.log(`EC Term ${term._id} created by user ${actorId}`);

    return term;
  }

  /**
   * Update an EC Term
   * @param {string} termId - Term ID to update
   * @param {Object} payload - Updated term data
   * @param {string} actorId - User ID updating the term
   * @returns {Promise<Object>} Updated term
   */
  static async updateTerm(termId, payload, actorId) {
    const term = await EcTerm.findById(termId);
    if (!term) {
      throw new ApiError(404, "EC Term not found");
    }

    // Prevent modification of closed terms
    if (term.status === "Closed") {
      throw new ApiError(400, "Cannot modify a closed term");
    }

    const { name, startsOn, endsOn, status } = payload;

    // Validate dates if provided
    const newStartsOn = startsOn ? new Date(startsOn) : term.startsOn;
    const newEndsOn = endsOn ? new Date(endsOn) : term.endsOn;

    if (newStartsOn >= newEndsOn) {
      throw new ApiError(400, "Term end date must be after start date");
    }

    // Check for overlapping terms (excluding current term)
    if (startsOn || endsOn) {
      const overlappingTerm = await EcTerm.findOne({
        _id: { $ne: termId },
        $or: [
          { startsOn: { $lte: newEndsOn }, endsOn: { $gte: newStartsOn } }
        ],
        status: { $in: ["Active", "Draft"] }
      });

      if (overlappingTerm) {
        throw new ApiError(
          400,
          `Term dates overlap with existing term: ${overlappingTerm.name}`
        );
      }
    }

    // Update fields
    if (name) term.name = name;
    if (startsOn) term.startsOn = startsOn;
    if (endsOn) term.endsOn = endsOn;
    if (status) term.status = status;

    await term.save();

    console.log(`EC Term ${termId} updated by user ${actorId}`);

    return term;
  }

  /**
   * Get all EC Terms
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of terms
   */
  static async getAllTerms(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    const terms = await EcTerm.find(query).sort({ startsOn: -1 });
    return terms;
  }

  /**
   * Get a single EC Term by ID
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Term data
   */
  static async getTermById(termId) {
    const term = await EcTerm.findById(termId);
    if (!term) {
      throw new ApiError(404, "EC Term not found");
    }
    return term;
  }

  /**
   * Delete an EC Term
   * Only allowed if no elections exist for this term
   * @param {string} termId - Term ID to delete
   * @param {string} actorId - User ID performing the deletion
   * @returns {Promise<Object>} Deletion summary
   */
  static async deleteTerm(termId, actorId) {
    const term = await EcTerm.findById(termId);
    if (!term) {
      throw new ApiError(404, "EC Term not found");
    }

    // Check if any elections exist for this term
    const electionsCount = await Election.countDocuments({ termId });
    if (electionsCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete term. ${electionsCount} election(s) exist for this term. Please delete all elections first.`
      );
    }

    // Check if any appointments exist for this term
    const appointmentsCount = await EcAppointment.countDocuments({ termId });
    if (appointmentsCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete term. ${appointmentsCount} EC appointment(s) exist for this term. These are historical records that must be preserved.`
      );
    }

    // Prevent deletion of active terms
    if (term.status === "Active") {
      throw new ApiError(
        400,
        "Cannot delete an active term. Please close it first."
      );
    }

    const deletionStats = {
      termId,
      termName: term.name,
      deletedAt: new Date(),
      deletedBy: actorId
    };

    await EcTerm.findByIdAndDelete(termId);

    console.log(
      `EC Term ${termId} deleted by user ${actorId}`,
      JSON.stringify(deletionStats)
    );

    return {
      success: true,
      message: "EC Term deleted successfully",
      stats: deletionStats
    };
  }

  /**
   * Get term statistics (elections, appointments, etc.)
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Term statistics
   */
  static async getTermStatistics(termId) {
    const term = await EcTerm.findById(termId);
    if (!term) {
      throw new ApiError(404, "EC Term not found");
    }

    const [electionsCount, appointmentsCount, activeAppointmentsCount] = await Promise.all([
      Election.countDocuments({ termId }),
      EcAppointment.countDocuments({ termId }),
      EcAppointment.countDocuments({ termId, endsOn: null })
    ]);

    return {
      term,
      statistics: {
        totalElections: electionsCount,
        totalAppointments: appointmentsCount,
        activeAppointments: activeAppointmentsCount,
        isActive: term.status === "Active",
        isDeletable: electionsCount === 0 && appointmentsCount === 0 && term.status !== "Active"
      }
    };
  }
}

module.exports = { EcTermService };
