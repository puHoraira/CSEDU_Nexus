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

const ledgerQuerySchema = z.object({
  type: z.enum(["Income", "Expenditure"]).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

const summaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

module.exports = { addTransactionSchema, signChequeSchema, ledgerQuerySchema, summaryQuerySchema };
