const { z } = require("zod");

const manualBookingSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().default(""),
  startTime: z.string().datetime({ offset: false }),
  endTime: z.string().datetime({ offset: false }),
  attendees: z.number().int().min(0).optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});

module.exports = { manualBookingSchema };
