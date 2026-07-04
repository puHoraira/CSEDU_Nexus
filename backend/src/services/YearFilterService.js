const { Member } = require("../models/Member");

class YearFilterService {
  /**
   * Check if a user can access content based on their academic year
   */
  static async canAccessContent(userId, targetYears) {
    // If targetYears includes "All_Years", everyone can access
    if (!targetYears || targetYears.length === 0 || targetYears.includes("All_Years")) {
      return { canAccess: true, reason: "Content available to all years" };
    }

    // Get user's member profile
    const member = await Member.findOne({ userId })
      .select('academicYearLevel currentYear membershipStatus');

    if (!member) {
      return { canAccess: false, reason: "Member profile not found" };
    }

    // Check if user's year level is in target years
    const canAccess = targetYears.includes(member.academicYearLevel);

    return {
      canAccess,
      reason: canAccess 
        ? `Content available for ${member.academicYearLevel}` 
        : `Content only available for: ${targetYears.join(', ')}`,
      userYearLevel: member.academicYearLevel
    };
  }

  /**
   * Build query filter for year-based content
   */
  static buildYearFilter(userYearLevel) {
    if (!userYearLevel) {
      // If no year level, only show "All_Years" content
      return { targetYears: { $in: ["All_Years"] } };
    }

    // Show content for user's specific year OR "All_Years"
    return {
      $or: [
        { targetYears: { $in: [userYearLevel] } },
        { targetYears: { $in: ["All_Years"] } },
        { targetYears: { $exists: false } }, // Legacy content without targetYears
        { targetYears: { $size: 0 } } // Empty array means all years
      ]
    };
  }

  /**
   * Get user's academic year level
   */
  static async getUserYearLevel(userId) {
    const member = await Member.findOne({ userId })
      .select('academicYearLevel');

    return member?.academicYearLevel || null;
  }

  /**
   * Filter array of items by user's year level
   */
  static async filterContentByYear(userId, items, getTargetYears) {
    const member = await Member.findOne({ userId })
      .select('academicYearLevel');

    if (!member) {
      // If no member profile, only show "All_Years" content
      return items.filter(item => {
        const targetYears = getTargetYears(item);
        return !targetYears || targetYears.length === 0 || targetYears.includes("All_Years");
      });
    }

    const userYearLevel = member.academicYearLevel;

    return items.filter(item => {
      const targetYears = getTargetYears(item);
      
      // No target years or includes All_Years - show to everyone
      if (!targetYears || targetYears.length === 0 || targetYears.includes("All_Years")) {
        return true;
      }

      // Check if user's year is in target years
      return targetYears.includes(userYearLevel);
    });
  }

  /**
   * Get statistics by year level
   */
  static async getYearLevelDistribution() {
    const distribution = await Member.aggregate([
      {
        $match: {
          'membershipStatus.status': { $in: ['Active', 'Inactive'] }
        }
      },
      {
        $group: {
          _id: '$academicYearLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return distribution.map(d => ({
      yearLevel: d._id,
      studentCount: d.count
    }));
  }
}

module.exports = { YearFilterService };
