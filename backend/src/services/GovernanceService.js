const { ApiError } = require("../core/ApiError");
const { EcPost } = require("../models/EcPost");
const { EcTerm } = require("../models/EcTerm");
const { EcAppointment } = require("../models/EcAppointment");
const { Member } = require("../models/Member");
const { GovernanceProposal } = require("../models/GovernanceProposal");
const { ConstitutionDocument } = require("../models/ConstitutionDocument");
const { policyRegistry } = require("../policies");
const { AuditService } = require("./AuditService");

class GovernanceService {
  static assembleConstitutionContent(preamble, articles) {
    const articleText = articles
      .map((item) => {
        const label = item.articleNo ? `${item.articleNo}: ${item.title}` : item.title;
        return `${label}\n${item.content}`;
      })
      .join("\n\n");

    if (!preamble || !preamble.trim()) {
      return articleText;
    }

    return `PREAMBLE\n${preamble.trim()}\n\n${articleText}`;
  }

  static normalizeConstitutionDocument(doc) {
    if (!doc) return null;

    const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
    let articles = Array.isArray(plain.articles)
      ? plain.articles
          .map((item, index) => ({
            articleNo: item?.articleNo || "",
            title: item?.title || `Article ${index + 1}`,
            content: item?.content || "",
            imageUrl: item?.imageUrl || "",
            order: item?.order || index + 1,
          }))
          .filter((item) => item.title.trim() && item.content.trim())
      : [];

    if (articles.length === 0 && plain.content && plain.content.trim()) {
      articles = [
        {
          articleNo: "",
          title: plain.title || "Constitution",
          content: plain.content,
          imageUrl: "",
          order: 1,
        },
      ];
    }

    articles.sort((a, b) => a.order - b.order);

    return {
      ...plain,
      logoImageUrl: plain.logoImageUrl || "",
      preamble: plain.preamble || "",
      articles,
    };
  }

  static async getCurrentConstitution() {
    const item = await ConstitutionDocument.findOne({ status: "Active" })
      .sort({ version: -1, createdAt: -1 })
      .populate("updatedBy", "firstName lastName email");

    return this.normalizeConstitutionDocument(item);
  }

  static async listConstitutionVersions() {
    return ConstitutionDocument.find({})
      .sort({ version: -1, createdAt: -1 })
      .select("title version status changeNote createdAt updatedAt updatedBy")
      .populate("updatedBy", "firstName lastName email");
  }

  static async saveConstitution(payload, actorId, requestId) {
    const latest = await ConstitutionDocument.findOne({}).sort({ version: -1, createdAt: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    const normalizedArticles = (payload.articles || [])
      .map((item, index) => ({
        articleNo: item.articleNo || "",
        title: item.title.trim(),
        content: item.content.trim(),
        imageUrl: (item.imageUrl || "").trim(),
        order: item.order || index + 1,
      }))
      .filter((item) => item.title && item.content)
      .sort((a, b) => a.order - b.order);

    if (normalizedArticles.length === 0 && payload.content && payload.content.trim()) {
      normalizedArticles.push({
        articleNo: "",
        title: payload.title,
        content: payload.content.trim(),
        imageUrl: "",
        order: 1,
      });
    }

    if (normalizedArticles.length === 0) {
      throw new ApiError(400, "At least one constitution article is required");
    }

    const normalizedPreamble = (payload.preamble || "").trim();
    const normalizedLogoImageUrl = (payload.logoImageUrl || "").trim();
    const assembledContent = this.assembleConstitutionContent(normalizedPreamble, normalizedArticles);

    await ConstitutionDocument.updateMany({ status: "Active" }, { status: "Archived" });

    const doc = await ConstitutionDocument.create({
      title: payload.title,
      logoImageUrl: normalizedLogoImageUrl,
      preamble: normalizedPreamble,
      content: assembledContent,
      articles: normalizedArticles,
      version: nextVersion,
      status: "Active",
      changeNote: payload.changeNote || "",
      updatedBy: actorId,
    });

    await AuditService.log({
      actorId,
      action: "CONSTITUTION_UPDATED",
      resource: "ConstitutionDocument",
      resourceId: doc._id.toString(),
      requestId,
      metadata: { version: doc.version, changeNote: doc.changeNote || "" },
    });

    return doc;
  }

  static async updateActiveConstitutionArticle(order, payload, actorId, requestId) {
    const numericOrder = Number(order);
    if (!Number.isInteger(numericOrder) || numericOrder < 1) {
      throw new ApiError(400, "Invalid article order");
    }

    const activeDoc = await ConstitutionDocument.findOne({ status: "Active" }).sort({ version: -1, createdAt: -1 });
    if (!activeDoc) {
      throw new ApiError(404, "Active constitution not found");
    }

    let articles = Array.isArray(activeDoc.articles)
      ? [...activeDoc.articles]
      : [];

    if (articles.length === 0 && activeDoc.content && activeDoc.content.trim()) {
      articles = [
        {
          articleNo: "",
          title: activeDoc.title || "Constitution",
          content: activeDoc.content,
          imageUrl: "",
          order: 1,
        },
      ];
    }

    articles = articles
      .map((item, index) => ({
        articleNo: item.articleNo || "",
        title: item.title,
        content: item.content,
        imageUrl: item.imageUrl || "",
        order: item.order || index + 1,
      }))
      .sort((a, b) => a.order - b.order);

    const articleIndex = articles.findIndex((item) => item.order === numericOrder);
    if (articleIndex === -1) {
      throw new ApiError(404, `Article with order ${numericOrder} not found`);
    }

    const current = articles[articleIndex];
    articles[articleIndex] = {
      ...current,
      articleNo: payload.articleNo !== undefined ? payload.articleNo : current.articleNo,
      title: payload.title !== undefined ? payload.title.trim() : current.title,
      content: payload.content !== undefined ? payload.content.trim() : current.content,
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl.trim() : current.imageUrl,
    };

    if (!articles[articleIndex].title || !articles[articleIndex].content) {
      throw new ApiError(400, "Article title and content cannot be empty");
    }

    activeDoc.articles = articles;
    activeDoc.content = this.assembleConstitutionContent(activeDoc.preamble || "", articles);
    activeDoc.updatedBy = actorId;
    if (payload.changeNote) {
      activeDoc.changeNote = payload.changeNote;
    }
    await activeDoc.save();

    await AuditService.log({
      actorId,
      action: "CONSTITUTION_ARTICLE_UPDATED",
      resource: "ConstitutionDocument",
      resourceId: activeDoc._id.toString(),
      requestId,
      metadata: {
        version: activeDoc.version,
        order: numericOrder,
        title: articles[articleIndex].title,
        changeNote: payload.changeNote || "",
      },
    });

    await activeDoc.populate("updatedBy", "firstName lastName email");
    return this.normalizeConstitutionDocument(activeDoc);
  }

  static buildApprovalsByType(type) {
    if (type === "ConstitutionChange") {
      return [
        { role: "Moderator", action: "Pending" },
        { role: "Chief Patron", action: "Pending" },
      ];
    }
    return [{ role: "Moderator", action: "Pending" }];
  }

  static async createProposal(payload, actorId, requestId) {
    const approvals = this.buildApprovalsByType(payload.type);
    const proposal = await GovernanceProposal.create({
      ...payload,
      proposedBy: actorId,
      approvals,
      status: "PendingModerator",
    });

    await AuditService.log({
      actorId,
      action: "GOVERNANCE_PROPOSAL_CREATED",
      resource: "GovernanceProposal",
      resourceId: proposal._id.toString(),
      requestId,
      metadata: { type: proposal.type },
    });

    return proposal;
  }

  static async listProposals() {
    return GovernanceProposal.find({})
      .populate("proposedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  static async reviewProposal(id, roleName, action, comment, actorId, requestId) {
    const proposal = await GovernanceProposal.findById(id);
    if (!proposal) throw new ApiError(404, "Proposal not found");

    const step = proposal.approvals.find((item) => item.role === roleName);
    if (!step) throw new ApiError(403, `No approval step assigned for role: ${roleName}`);
    if (step.action !== "Pending") throw new ApiError(409, "This role has already reviewed the proposal");

    step.action = action;
    step.comment = comment || "";
    step.actorId = actorId;
    step.actedAt = new Date();

    if (action === "Rejected") {
      proposal.status = "Rejected";
    } else if (proposal.type === "ConstitutionChange" && roleName === "Moderator") {
      proposal.status = "PendingChiefPatron";
    } else {
      const allApproved = proposal.approvals.every((item) => item.action === "Approved");
      proposal.status = allApproved ? "Approved" : proposal.status;
    }

    await proposal.save();

    await AuditService.log({
      actorId,
      action: "GOVERNANCE_PROPOSAL_REVIEWED",
      resource: "GovernanceProposal",
      resourceId: proposal._id.toString(),
      requestId,
      metadata: { roleName, action, type: proposal.type },
    });

    return proposal;
  }

  static async listTerms() {
    return EcTerm.find({}).sort({ startsOn: -1 });
  }

  static async listAppointments() {
    return EcAppointment.find({})
      .populate("termId")
      .populate("postId")
      .populate("memberId", "studentId batch status")
      .sort({ createdAt: -1 });
  }

  static async createPost(payload, actorId, requestId) {
    const post = await EcPost.create(payload);
    await AuditService.log({
      actorId,
      action: "EC_POST_CREATED",
      resource: "EcPost",
      resourceId: post._id.toString(),
      requestId,
      metadata: { code: post.code, title: post.title },
    });
    return post;
  }

  static async listPosts() {
    return EcPost.find({}).sort({ displayOrder: 1, title: 1 });
  }

  static async createTerm(payload, actorId, requestId) {
    const overlapping = await EcTerm.findOne({
      startsOn: { $lte: payload.endsOn },
      endsOn: { $gte: payload.startsOn },
    });
    if (overlapping) {
      throw new ApiError(409, "EC term overlaps an existing term");
    }

    const term = await EcTerm.create(payload);
    await AuditService.log({
      actorId,
      action: "EC_TERM_CREATED",
      resource: "EcTerm",
      resourceId: term._id.toString(),
      requestId,
    });
    return term;
  }

  static async appointMember(payload, actorId, requestId) {
    const [term, post, member] = await Promise.all([
      EcTerm.findById(payload.termId),
      EcPost.findById(payload.postId),
      Member.findById(payload.memberId),
    ]);

    if (!term || !post || !member) {
      throw new ApiError(404, "Term, post, or member not found");
    }

    const policyResult = await policyRegistry.evaluate("ec.holdPost", {
      memberYear: member.currentYear,
      memberEcYears: payload.memberEcYears || 0,
      post,
    });
    if (!policyResult.allowed) {
      throw new ApiError(400, policyResult.reason || "Appointment blocked");
    }

    const activeHolder = await EcAppointment.findOne({
      termId: payload.termId,
      postId: payload.postId,
      endsOn: null,
    });
    if (activeHolder) {
      throw new ApiError(409, "Post already has an active appointment in this term");
    }

    const appointment = await EcAppointment.create({
      termId: payload.termId,
      postId: payload.postId,
      memberId: payload.memberId,
      startsOn: payload.startsOn,
      source: payload.source,
    });

    await AuditService.log({
      actorId,
      action: "EC_MEMBER_APPOINTED",
      resource: "EcAppointment",
      resourceId: appointment._id.toString(),
      requestId,
      metadata: {
        termId: payload.termId,
        postId: payload.postId,
        memberId: payload.memberId,
      },
    });

    return appointment;
  }
}

module.exports = { GovernanceService };
