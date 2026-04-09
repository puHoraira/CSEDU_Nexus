const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  studentId: z.string().min(3),
  batch: z.number().int().min(2000).max(2100),
  currentYear: z.number().int().min(1).max(5),
  experience: z.string().max(300).optional().default(""),
});

const registerTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  designation: z.string().min(2).max(120),
  phone: z.string().max(30).optional().default(""),
  experience: z.string().max(300).optional().default(""),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().max(30).optional().default(""),
  avatarUrl: z.string().url().or(z.literal("")).optional().default(""),
  bio: z.string().max(500).optional().default(""),
  designation: z.string().max(120).optional().default(""),
  experience: z.string().max(300).optional().default(""),
});

module.exports = { registerSchema, registerTeacherSchema, loginSchema, updateProfileSchema };
