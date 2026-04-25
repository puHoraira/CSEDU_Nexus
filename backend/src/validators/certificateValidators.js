const { z } = require("zod");

const ecPostHistoryItemSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  ecTermId: z.string().optional(),
  postTitle: z.string().trim().min(2).max(120),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional(),
});

const volunteerContributionItemSchema = z.object({
  eventId: z.string().optional(),
  eventTitle: z.string().trim().min(3).max(200),
  role: z.string().trim().min(2).max(100),
  date: z.string().datetime().or(z.date()),
  description: z.string().trim().max(500).optional().default(""),
});

const createCertificateRequestSchema = z.object({
  certificateType: z.enum(["MembershipContribution"]).default("MembershipContribution"),
  purpose: z.string().trim().min(5).max(500),
  contributionSummary: z.string().trim().min(20).max(3000),
  ecPostHistory: z.array(ecPostHistoryItemSchema).optional().default([]),
  volunteerContributions: z.array(volunteerContributionItemSchema).optional().default([]),
});

const reviewCertificateSchema = z
  .object({
    action: z.enum(["Approved", "Rejected"]),
    comment: z.string().trim().max(800).optional().default(""),
    signatureName: z.string().trim().max(120).optional().default(""),
    signatureTitle: z.string().trim().max(120).optional().default(""),
  })
  .refine((value) => {
    if (value.action === "Approved") {
      return Boolean(value.signatureName && value.signatureName.trim());
    }
    return true;
  }, {
    message: "signatureName is required for approval",
    path: ["signatureName"],
  })
  .refine((value) => {
    if (value.action === "Rejected") {
      return Boolean(value.comment && value.comment.trim().length >= 3);
    }
    return true;
  }, {
    message: "comment is required for rejection",
    path: ["comment"],
  });

module.exports = {
  createCertificateRequestSchema,
  reviewCertificateSchema,
};
