const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

class YearPromotionService {
  /**
   * Get promotion preview - shows who will be promoted and who will be retained
   */
  static async getPromotionPreview(fromYearLevel) {
    const validYearLevels = ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters"];
    
    if (!validYearLevels.includes(fromYearLevel)) {
      throw new ApiError(400, `Invalid year level: ${fromYearLevel}`);
    }

    // Get all active members in the specified year
    const members = await Member.find({
      academicYearLevel: fromYearLevel,
      'membershipStatus.status': { $in: ['Active', 'Inactive'] }
    })
      .populate('userId', 'fullName email')
      .select('studentId userId academicYearLevel currentYear batch academicRecord.currentCgpa retentionStatus')
      .lean();

    const nextYearLevel = Member.getNextYearLevel(fromYearLevel);

    return {
      fromYearLevel,
      toYearLevel: nextYearLevel,
      totalStudents: members.length,
      eligibleForPromotion: members.filter(m => !m.retentionStatus?.isRetained).length,
      retainedStudents: members.filter(m => m.retentionStatus?.isRetained).length,
      students: members.map(m => ({
        memberId: m._id,
        studentId: m.studentId,
        userId: m.userId?._id,
        fullName: m.userId?.fullName,
        email: m.userId?.email,
        currentYearLevel: m.academicYearLevel,
        batch: m.batch,
        cgpa: m.academicRecord?.currentCgpa,
        isRetained: m.retentionStatus?.isRetained || false,
        retentionReason: m.retentionStatus?.retentionReason,
        willBePromoted: !m.retentionStatus?.isRetained
      })),
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    };
  }

  /**
   * Bulk promote all students in a year level
   */
  static async bulkPromoteYear(fromYearLevel, promotedBy, excludeRetained = true, notes = '') {
    const validYearLevels = ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters"];
    
    if (!validYearLevels.includes(fromYearLevel)) {
      throw new ApiError(400, `Invalid year level: ${fromYearLevel}`);
    }

    // Build query
    const query = {
      academicYearLevel: fromYearLevel,
      'membershipStatus.status': { $in: ['Active', 'Inactive'] }
    };

    // Exclude retained students if specified
    if (excludeRetained) {
      query['retentionStatus.isRetained'] = { $ne: true };
    }

    // Get members to promote
    const membersToPromote = await Member.find(query)
      .populate('userId', 'fullName email');

    if (membersToPromote.length === 0) {
      throw new ApiError(404, `No students found in ${fromYearLevel} to promote`);
    }

    const results = {
      success: [],
      failed: [],
      totalProcessed: membersToPromote.length
    };

    // Promote each member
    for (const member of membersToPromote) {
      try {
        member.promoteToNextYear(promotedBy, notes, 'Bulk_Promotion');
        await member.save();

        results.success.push({
          memberId: member._id,
          studentId: member.studentId,
          fullName: member.userId?.fullName,
          fromYear: fromYearLevel,
          toYear: member.academicYearLevel
        });

        // Audit log
        await AuditService.log({
          userId: promotedBy,
          action: 'YEAR_PROMOTION',
          resourceType: 'Member',
          resourceId: member._id,
          changes: {
            from: fromYearLevel,
            to: member.academicYearLevel,
            type: 'Bulk_Promotion'
          },
          ipAddress: null
        });
      } catch (error) {
        results.failed.push({
          memberId: member._id,
          studentId: member.studentId,
          fullName: member.userId?.fullName,
          error: error.message
        });
      }
    }

    return {
      ...results,
      successCount: results.success.length,
      failedCount: results.failed.length,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    };
  }

  /**
   * Promote individual student
   */
  static async promoteIndividualStudent(memberId, promotedBy, notes = '') {
    const member = await Member.findById(memberId).populate('userId', 'fullName email');

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    if (member.membershipStatus.status === 'Graduated') {
      throw new ApiError(400, 'Student has already graduated');
    }

    const fromYear = member.academicYearLevel;
    member.promoteToNextYear(promotedBy, notes, 'Individual_Promotion');
    await member.save();

    // Audit log
    await AuditService.log({
      userId: promotedBy,
      action: 'YEAR_PROMOTION',
      resourceType: 'Member',
      resourceId: member._id,
      changes: {
        from: fromYear,
        to: member.academicYearLevel,
        type: 'Individual_Promotion',
        notes
      },
      ipAddress: null
    });

    return {
      memberId: member._id,
      studentId: member.studentId,
      fullName: member.userId?.fullName,
      fromYear,
      toYear: member.academicYearLevel,
      currentYear: member.currentYear
    };
  }

  /**
   * Retain student in current year (mark as failed)
   */
  static async retainStudent(memberId, retainedBy, reason = '') {
    const member = await Member.findById(memberId).populate('userId', 'fullName email');

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    if (member.membershipStatus.status === 'Graduated') {
      throw new ApiError(400, 'Cannot retain a graduated student');
    }

    member.retainInCurrentYear(retainedBy, reason);
    await member.save();

    // Audit log
    await AuditService.log({
      userId: retainedBy,
      action: 'YEAR_RETENTION',
      resourceType: 'Member',
      resourceId: member._id,
      changes: {
        yearLevel: member.academicYearLevel,
        reason,
        isRetained: true
      },
      ipAddress: null
    });

    return {
      memberId: member._id,
      studentId: member.studentId,
      fullName: member.userId?.fullName,
      yearLevel: member.academicYearLevel,
      isRetained: true,
      reason
    };
  }

  /**
   * Remove retention status (clear failed status)
   */
  static async clearRetentionStatus(memberId, clearedBy, reason = '') {
    const member = await Member.findById(memberId).populate('userId', 'fullName email');

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    if (!member.retentionStatus?.isRetained) {
      throw new ApiError(400, 'Student is not currently retained');
    }

    member.retentionStatus = {
      isRetained: false,
      retentionReason: null,
      retainedAt: null,
      retainedBy: null,
      originalPromotionYear: null
    };

    await member.save();

    // Audit log
    await AuditService.log({
      userId: clearedBy,
      action: 'YEAR_RETENTION_CLEARED',
      resourceType: 'Member',
      resourceId: member._id,
      changes: {
        yearLevel: member.academicYearLevel,
        reason,
        isRetained: false
      },
      ipAddress: null
    });

    return {
      memberId: member._id,
      studentId: member.studentId,
      fullName: member.userId?.fullName,
      yearLevel: member.academicYearLevel,
      isRetained: false
    };
  }

  /**
   * Get year-wise student statistics
   */
  static async getYearWiseStats() {
    const stats = await Member.aggregate([
      {
        $match: {
          'membershipStatus.status': { $in: ['Active', 'Inactive'] }
        }
      },
      {
        $group: {
          _id: '$academicYearLevel',
          total: { $sum: 1 },
          retained: {
            $sum: { $cond: ['$retentionStatus.isRetained', 1, 0] }
          },
          avgCgpa: { $avg: '$academicRecord.currentCgpa' },
          avgAttendance: { $avg: '$attendanceRecord.overallAttendancePercentage' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return stats.map(stat => ({
      yearLevel: stat._id,
      totalStudents: stat.total,
      retainedStudents: stat.retained,
      eligibleForPromotion: stat.total - stat.retained,
      averageCgpa: stat.avgCgpa ? stat.avgCgpa.toFixed(2) : 'N/A',
      averageAttendance: stat.avgAttendance ? stat.avgAttendance.toFixed(1) : 'N/A'
    }));
  }

  /**
   * Rollback last promotion for a student
   */
  static async rollbackPromotion(memberId, rolledBackBy, reason = '') {
    const member = await Member.findById(memberId).populate('userId', 'fullName email');

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    if (member.promotionHistory.length === 0) {
      throw new ApiError(400, 'No promotion history found for this student');
    }

    // Get last promotion
    const lastPromotion = member.promotionHistory[member.promotionHistory.length - 1];

    // Revert to previous year
    member.academicYearLevel = lastPromotion.fromYear;
    
    // Update currentYear numeric field
    const yearLevelToNumber = {
      'First_Year': 1,
      'Second_Year': 2,
      'Third_Year': 3,
      'Fourth_Year': 4,
      'Masters': 5,
      'Graduated': 5
    };
    member.currentYear = yearLevelToNumber[lastPromotion.fromYear];

    // Remove last promotion from history
    member.promotionHistory.pop();

    // Revert graduated status if necessary
    if (lastPromotion.toYear === 'Graduated') {
      member.membershipStatus.status = 'Active';
      member.membershipStatus.statusReason = 'Promotion rollback';
      member.membershipStatus.statusChangeDate = new Date();
      member.academicRecord.isGraduating = false;
      member.academicRecord.graduationDate = null;
    }

    await member.save();

    // Audit log
    await AuditService.log({
      userId: rolledBackBy,
      action: 'YEAR_PROMOTION_ROLLBACK',
      resourceType: 'Member',
      resourceId: member._id,
      changes: {
        from: lastPromotion.toYear,
        to: lastPromotion.fromYear,
        reason
      },
      ipAddress: null
    });

    return {
      memberId: member._id,
      studentId: member.studentId,
      fullName: member.userId?.fullName,
      revertedFrom: lastPromotion.toYear,
      revertedTo: lastPromotion.fromYear,
      currentYear: member.currentYear
    };
  }
}

module.exports = { YearPromotionService };
