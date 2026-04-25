const { z } = require("zod");

const homepageMessageValidators = {
  createMessage: z.object({
    authorName: z.string().trim().min(2).max(120),
    authorTitle: z.string().trim().min(2).max(120),
    authorDesignation: z.string().trim().max(200).optional().default(""),
    authorImageUrl: z.string().url().optional().default(""),
    message: z.string().trim().min(10).max(2000),
    displayOrder: z.number().int().min(0).optional().default(0),
    messageType: z.enum(["Leadership", "Welcome", "Announcement", "Achievement", "General"]).optional().default("General"),
    backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default("#ffffff"),
    textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().default("#000000"),
    expiresAt: z.string().datetime().optional(),
    showOnHomepage: z.boolean().optional().default(true),
    showOnDashboard: z.boolean().optional().default(true),
    allowComments: z.boolean().optional().default(false),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium")
  }),

  updateMessage: z.object({
    authorName: z.string().trim().min(2).max(120).optional(),
    authorTitle: z.string().trim().min(2).max(120).optional(),
    authorDesignation: z.string().trim().max(200).optional(),
    authorImageUrl: z.string().url().optional(),
    message: z.string().trim().min(10).max(2000).optional(),
    displayOrder: z.number().int().min(0).optional(),
    messageType: z.enum(["Leadership", "Welcome", "Announcement", "Achievement", "General"]).optional(),
    backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    expiresAt: z.string().datetime().optional(),
    showOnHomepage: z.boolean().optional(),
    showOnDashboard: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional()
  }),

  messageId: z.object({
    messageId: z.string().regex(/^[0-9a-fA-F]{24}$/)
  }),

  rejectMessage: z.object({
    rejectionReason: z.string().trim().min(5).max(500)
  }),

  reorderMessages: z.object({
    messageIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1)
  }),

  getPublishedMessages: z.object({
    messageType: z.enum(["Leadership", "Welcome", "Announcement", "Achievement", "General"]).optional()
  }),

  getAllMessages: z.object({
    status: z.enum(["Draft", "PendingApproval", "Approved", "Rejected", "Expired"]).optional(),
    messageType: z.enum(["Leadership", "Welcome", "Announcement", "Achievement", "General"]).optional(),
    authorId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    sortBy: z.enum(["createdAt", "updatedAt", "displayOrder", "authorName", "messageType", "status"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc")
  })
};

module.exports = { homepageMessageValidators };