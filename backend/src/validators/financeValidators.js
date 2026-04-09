const { z } = require("zod");

const addTransactionSchema = z.object({
  type: z.enum(["Income", "Expenditure"]),
  amount: z.number().positive(),
  category: z.string().min(2),
  reference: z.string().min(2),
  occurredOn: z.string().datetime().optional(),
  requiresCheque: z.boolean().optional().default(false),
});

const signChequeSchema = z.object({
  note: z.string().optional().default(""),
});

module.exports = { addTransactionSchema, signChequeSchema };
