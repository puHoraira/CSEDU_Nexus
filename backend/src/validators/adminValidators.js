const { z } = require("zod");

const assignRoleSchema = z.object({
  userId: z.string().min(10),
  roleName: z.string().min(2),
});

const revokeRoleSchema = z.object({
  userId: z.string().min(10),
  roleName: z.string().min(2),
});

module.exports = { assignRoleSchema, revokeRoleSchema };
