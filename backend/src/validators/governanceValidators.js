const { z } = require("zod");

const createEcPostSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(2),
  minYear: z.number().int().min(1).max(5).default(1),
  minEcYears: z.number().int().min(0).default(0),
  displayOrder: z.number().int().default(999),
  isActive: z.boolean().default(true),
});

const createEcTermSchema = z.object({
  name: z.string().min(3),
  startsOn: z.string().datetime(),
  endsOn: z.string().datetime(),
  status: z.enum(["Draft", "Active", "Closed"]).default("Draft"),
});

const appointEcMemberSchema = z.object({
  termId: z.string().min(10),
  postId: z.string().min(10),
  memberId: z.string().min(10),
  startsOn: z.string().datetime(),
  source: z.enum(["Election", "VacancyFill", "Nomination"]).default("Election"),
  memberEcYears: z.number().int().min(0).default(0),
});

const createProposalSchema = z.object({
  type: z.enum(["General", "ConstitutionChange"]).default("General"),
  title: z.string().min(3),
  description: z.string().min(10),
});

const reviewProposalSchema = z.object({
  action: z.enum(["Approved", "Rejected"]),
  comment: z.string().optional().default(""),
});

const constitutionArticleSchema = z.object({
  articleNo: z.string().max(50).optional().default(""),
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  imageUrl: z.string().url().optional().or(z.literal("")),
  order: z.number().int().min(1).optional(),
});

const saveConstitutionSchema = z.object({
  title: z.string().min(3).max(200),
  logoImageUrl: z.string().url().optional().or(z.literal("")),
  preamble: z.string().max(10000).optional().default(""),
  content: z.string().min(10).optional(),
  articles: z.array(constitutionArticleSchema).min(1).optional(),
  changeNote: z.string().max(500).optional().default(""),
}).refine((value) => Boolean((value.articles && value.articles.length > 0) || value.content), {
  message: "Either articles or content is required",
});

const updateConstitutionArticleSchema = z
  .object({
    articleNo: z.string().max(50).optional(),
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(10).optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    changeNote: z.string().max(500).optional().default(""),
  })
  .refine((value) => Boolean(value.articleNo || value.title || value.content || value.imageUrl !== undefined), {
    message: "At least one article field is required",
  });

module.exports = {
  createEcPostSchema,
  createEcTermSchema,
  appointEcMemberSchema,
  createProposalSchema,
  reviewProposalSchema,
  saveConstitutionSchema,
  updateConstitutionArticleSchema,
};
