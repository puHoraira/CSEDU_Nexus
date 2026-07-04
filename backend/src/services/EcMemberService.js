const { EcAppointment } = require("../models/EcAppointment");
const { EcTerm } = require("../models/EcTerm");
const { EcPost } = require("../models/EcPost");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");

class EcMemberService {
  /**
   * Get current EC members (active term)
   */
  static async getCurrentEcMembers() {
    // Find active term
    const activeTerm = await EcTerm.findOne({ status: "Active" });

    if (!activeTerm) {
      return {
        term: null,
        members: [],
        message: "No active EC term found"
      };
    }

    // Get all appointments for active term
    const appointments = await EcAppointment.find({
      termId: activeTerm._id,
      endsOn: null // Current appointments
    })
      .populate({
        path: 'postId',
        select: 'code title displayOrder'
      })
      .populate({
        path: 'memberId',
        select: 'studentId batch currentYear academicYearLevel',
        populate: {
          path: 'userId',
          select: 'fullName email phone avatarUrl'
        }
      })
      .sort({ 'postId.displayOrder': 1 })
      .lean();

    return {
      term: {
        _id: activeTerm._id,
        name: activeTerm.name,
        startsOn: activeTerm.startsOn,
        endsOn: activeTerm.endsOn,
        status: activeTerm.status
      },
      members: appointments.map(apt => ({
        appointmentId: apt._id,
        post: apt.postId,
        member: {
          memberId: apt.memberId?._id,
          studentId: apt.memberId?.studentId,
          batch: apt.memberId?.batch,
          currentYear: apt.memberId?.currentYear,
          academicYearLevel: apt.memberId?.academicYearLevel,
          fullName: apt.memberId?.userId?.fullName,
          email: apt.memberId?.userId?.email,
          phone: apt.memberId?.userId?.phone,
          avatarUrl: apt.memberId?.userId?.avatarUrl
        },
        startsOn: apt.startsOn,
        source: apt.source
      }))
    };
  }

  /**
   * Get EC members by term
   */
  static async getEcMembersByTerm(termId) {
    const term = await EcTerm.findById(termId);

    if (!term) {
      throw new ApiError(404, "EC term not found");
    }

    const appointments = await EcAppointment.find({ termId })
      .populate({
        path: 'postId',
        select: 'code title displayOrder'
      })
      .populate({
        path: 'memberId',
        select: 'studentId batch currentYear academicYearLevel',
        populate: {
          path: 'userId',
          select: 'fullName email phone avatarUrl'
        }
      })
      .sort({ 'postId.displayOrder': 1 })
      .lean();

    return {
      term: {
        _id: term._id,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        status: term.status
      },
      members: appointments.map(apt => ({
        appointmentId: apt._id,
        post: apt.postId,
        member: {
          memberId: apt.memberId?._id,
          studentId: apt.memberId?.studentId,
          batch: apt.memberId?.batch,
          currentYear: apt.memberId?.currentYear,
          academicYearLevel: apt.memberId?.academicYearLevel,
          fullName: apt.memberId?.userId?.fullName,
          email: apt.memberId?.userId?.email,
          phone: apt.memberId?.userId?.phone,
          avatarUrl: apt.memberId?.userId?.avatarUrl
        },
        startsOn: apt.startsOn,
        endsOn: apt.endsOn,
        source: apt.source,
        isCurrent: !apt.endsOn
      }))
    };
  }

  /**
   * Get all EC terms with member counts
   */
  static async getAllEcTerms() {
    const terms = await EcTerm.find()
      .sort({ startsOn: -1 })
      .lean();

    // Get member counts for each term
    const termsWithCounts = await Promise.all(
      terms.map(async (term) => {
        const memberCount = await EcAppointment.countDocuments({ termId: term._id });
        return {
          ...term,
          memberCount
        };
      })
    );

    return termsWithCounts;
  }

  /**
   * Get EC member history for a specific member
   */
  static async getMemberEcHistory(memberId) {
    const appointments = await EcAppointment.find({ memberId })
      .populate({
        path: 'termId',
        select: 'name startsOn endsOn status'
      })
      .populate({
        path: 'postId',
        select: 'code title'
      })
      .sort({ startsOn: -1 })
      .lean();

    return appointments.map(apt => ({
      appointmentId: apt._id,
      term: apt.termId,
      post: apt.postId,
      startsOn: apt.startsOn,
      endsOn: apt.endsOn,
      source: apt.source,
      isCurrent: !apt.endsOn,
      durationInMonths: apt.endsOn 
        ? Math.round((new Date(apt.endsOn) - new Date(apt.startsOn)) / (1000 * 60 * 60 * 24 * 30))
        : Math.round((new Date() - new Date(apt.startsOn)) / (1000 * 60 * 60 * 24 * 30))
    }));
  }

  /**
   * Get past EC members (all previous terms)
   */
  static async getPastEcMembers(options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'endsOn',
      sortOrder = 'desc'
    } = options;

    // Find closed terms
    const closedTerms = await EcTerm.find({ status: "Closed" })
      .sort({ endsOn: -1 })
      .lean();

    if (closedTerms.length === 0) {
      return {
        terms: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0
        }
      };
    }

    const termIds = closedTerms.map(t => t._id);

    // Get appointments for closed terms
    const skip = (page - 1) * limit;
    
    const [appointments, totalCount] = await Promise.all([
      EcAppointment.find({ termId: { $in: termIds } })
        .populate({
          path: 'termId',
          select: 'name startsOn endsOn'
        })
        .populate({
          path: 'postId',
          select: 'code title displayOrder'
        })
        .populate({
          path: 'memberId',
          select: 'studentId batch',
          populate: {
            path: 'userId',
            select: 'fullName email avatarUrl'
          }
        })
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      EcAppointment.countDocuments({ termId: { $in: termIds } })
    ]);

    return {
      members: appointments.map(apt => ({
        appointmentId: apt._id,
        term: apt.termId,
        post: apt.postId,
        member: {
          memberId: apt.memberId?._id,
          studentId: apt.memberId?.studentId,
          batch: apt.memberId?.batch,
          fullName: apt.memberId?.userId?.fullName,
          email: apt.memberId?.userId?.email,
          avatarUrl: apt.memberId?.userId?.avatarUrl
        },
        startsOn: apt.startsOn,
        endsOn: apt.endsOn,
        source: apt.source,
        durationInMonths: Math.round(
          (new Date(apt.endsOn) - new Date(apt.startsOn)) / (1000 * 60 * 60 * 24 * 30)
        )
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get EC statistics
   */
  static async getEcStatistics() {
    const [
      totalTerms,
      activeTermCount,
      currentEcMemberCount,
      totalHistoricalAppointments,
      postWiseDistribution,
      uniqueEcMembers
    ] = await Promise.all([
      EcTerm.countDocuments(),
      EcTerm.countDocuments({ status: "Active" }),
      EcAppointment.countDocuments({ endsOn: null }),
      EcAppointment.countDocuments(),
      
      // Get distribution by post
      EcAppointment.aggregate([
        { $match: { endsOn: null } },
        {
          $lookup: {
            from: 'ecposts',
            localField: 'postId',
            foreignField: '_id',
            as: 'post'
          }
        },
        { $unwind: '$post' },
        {
          $group: {
            _id: '$post.title',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Get unique members who ever served
      EcAppointment.distinct('memberId')
    ]);

    return {
      overview: {
        totalTerms,
        activeTermCount,
        currentEcMemberCount,
        totalHistoricalAppointments,
        uniqueEcMembersAllTime: uniqueEcMembers.length
      },
      postWiseDistribution: postWiseDistribution.map(p => ({
        postTitle: p._id,
        count: p.count
      }))
    };
  }

  /**
   * Search EC members (current and past)
   */
  static async searchEcMembers(searchTerm) {
    // Search by member name or student ID
    const members = await Member.find({
      $or: [
        { studentId: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .populate('userId', 'fullName email')
      .select('_id studentId userId')
      .limit(20)
      .lean();

    const memberIds = members.map(m => m._id);

    // Find EC appointments for these members
    const appointments = await EcAppointment.find({
      memberId: { $in: memberIds }
    })
      .populate('termId', 'name startsOn endsOn status')
      .populate('postId', 'title')
      .sort({ startsOn: -1 })
      .lean();

    // Group by member
    const results = members.map(member => {
      const memberAppointments = appointments.filter(
        apt => apt.memberId.toString() === member._id.toString()
      );

      return {
        memberId: member._id,
        studentId: member.studentId,
        fullName: member.userId?.fullName,
        email: member.userId?.email,
        ecHistory: memberAppointments.map(apt => ({
          term: apt.termId?.name,
          post: apt.postId?.title,
          startsOn: apt.startsOn,
          endsOn: apt.endsOn,
          isCurrent: !apt.endsOn
        })),
        totalAppointments: memberAppointments.length,
        hasCurrentAppointment: memberAppointments.some(apt => !apt.endsOn)
      };
    });

    return results.filter(r => r.totalAppointments > 0);
  }
}

module.exports = { EcMemberService };
