const { z } = require("zod");

const createMeetingSchema = z.object({
  title: z.string().min(3),
  agenda: z.string().optional().default(""),
  meetingDate: z.string().datetime({ offset: true }),
  venue: z.string().min(2),
  meetingMode: z.enum(["Online", "Offline"]),
});

const recordAttendanceSchema = z.object({
  meetingId: z.string().min(10),
  entries: z
    .array(
      z.object({
        memberId: z.string().min(10),
        present: z.boolean(),
      })
    )
    .min(1),
});

module.exports = { createMeetingSchema, recordAttendanceSchema };
