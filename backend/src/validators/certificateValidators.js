const { z } = require("zod");

const createCertificateRequestSchema = z.object({
  certificateType: z.enum(["MembershipContribution"]).default("MembershipContribution"),
  purpose: z.string().trim().min(5).max(500),
  contributionSummary: z.string().trim().min(20).max(3000),
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
