const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Event } = require("../models/Event");
const { Workshop } = require("../models/Workshop");
const { Meeting } = require("../models/Meeting");
const { Election } = require("../models/Election");
const { AccessService } = require("./AccessService");

class SearchService {
  /**
   * Global search across users, events, workshops, meetings, and elections
   */
  static async globalSearch(query, userId, options = {}) {
    const { limit = 20, categories = ["users", "events", "workshops", "meetings", "elections"] } = options;

    const results = {
      users: [],
      events: [],
      workshops: [],
      meetings: [],
      elections: [],
      total: 0,
    };

    if (!query || query.trim().length < 2) {
      return results;
    }

    const searchRegex = new RegExp(query, "i");

    // Search Users (by name or email)
    if (categories.includes("users")) {
      const users = await User.find({
        isActive: true,
        "privacySettings.showInDirectory": { $ne: false },
        _id: { $ne: userId }, // Exclude self
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ],
      })
        .select("firstName lastName email avatarUrl bio designation")
        .limit(limit)
        .lean();

      // Enrich with roles
      for (const user of users) {
        const roleNames = await AccessService.getUserRoleNames(user._id);
        const postNames = await AccessService.getEcPostNames(user._id);
        const userRoles = [...new Set([...roleNames, ...postNames])];

        // Get member info if exists
        const member = await Member.findOne({ userId: user._id })
          .select("studentId batch currentYear academicYearLevel")
          .lean();

        results.users.push({
          id: user._id,
          type: "user",
          title: `${user.firstName} ${user.lastName}`,
          subtitle: user.email,
          description: user.bio || user.designation || "",
          avatarUrl: user.avatarUrl,
          roles: userRoles,
          member: member ? {
            studentId: member.studentId,
            batch: member.batch,
            currentYear: member.currentYear,
            academicYearLevel: member.academicYearLevel,
          } : null,
        });
      }
    }

    // Search Events
    if (categories.includes("events")) {
      const events = await Event.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
        ],
      })
        .select("title description location eventDate eventTime bannerUrl eventType status")
        .sort({ eventDate: -1 })
        .limit(limit)
        .lean();

      results.events = events.map(event => ({
        id: event._id,
        type: "event",
        title: event.title,
        subtitle: `${new Date(event.eventDate).toLocaleDateString()} at ${event.location || "TBA"}`,
        description: event.description || "",
        imageUrl: event.bannerUrl,
        status: event.status,
        eventType: event.eventType,
      }));
    }

    // Search Workshops
    if (categories.includes("workshops")) {
      const workshops = await Workshop.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { instructor: searchRegex },
          { location: searchRegex },
        ],
      })
        .select("title description instructor location workshopDate workshopTime bannerUrl status")
        .sort({ workshopDate: -1 })
        .limit(limit)
        .lean();

      results.workshops = workshops.map(workshop => ({
        id: workshop._id,
        type: "workshop",
        title: workshop.title,
        subtitle: `By ${workshop.instructor} • ${new Date(workshop.workshopDate).toLocaleDateString()}`,
        description: workshop.description || "",
        imageUrl: workshop.bannerUrl,
        status: workshop.status,
        location: workshop.location,
      }));
    }

    // Search Meetings
    if (categories.includes("meetings")) {
      const meetings = await Meeting.find({
        $or: [
          { title: searchRegex },
          { agenda: searchRegex },
          { description: searchRegex },
        ],
      })
        .select("title agenda description meetingDate meetingTime location status")
        .sort({ meetingDate: -1 })
        .limit(limit)
        .lean();

      results.meetings = meetings.map(meeting => ({
        id: meeting._id,
        type: "meeting",
        title: meeting.title,
        subtitle: `${new Date(meeting.meetingDate).toLocaleDateString()} at ${meeting.location || "TBA"}`,
        description: meeting.agenda || meeting.description || "",
        status: meeting.status,
        location: meeting.location,
      }));
    }

    // Search Elections
    if (categories.includes("elections")) {
      const elections = await Election.find({
        $or: [
          { electionName: searchRegex },
          { description: searchRegex },
        ],
      })
        .select("electionName description electionType status startDate endDate")
        .sort({ startDate: -1 })
        .limit(limit)
        .lean();

      results.elections = elections.map(election => ({
        id: election._id,
        type: "election",
        title: election.electionName,
        subtitle: `${election.electionType} • ${election.status}`,
        description: election.description || "",
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
      }));
    }

    // Calculate total results
    results.total = 
      results.users.length +
      results.events.length +
      results.workshops.length +
      results.meetings.length +
      results.elections.length;

    return results;
  }

  /**
   * Quick search for autocomplete (users only)
   */
  static async quickSearchUsers(query, userId, limit = 10) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchRegex = new RegExp(query, "i");

    const users = await User.find({
      isActive: true,
      "privacySettings.showInDirectory": { $ne: false },
      _id: { $ne: userId },
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ],
    })
      .select("firstName lastName email avatarUrl")
      .limit(limit)
      .lean();

    return users.map(user => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }));
  }
}

module.exports = { SearchService };
