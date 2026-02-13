import { z } from "zod";

// Max photo size: 5MB
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

// ============================================
// Application Form Zod Schema
// ============================================

export const applicationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be 50 characters or fewer"),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be 50 characters or fewer"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),

  phoneNumber: z
    .string()
    .trim()
    .min(10, "Please enter a valid phone number")
    .max(20, "Phone number is too long"),

  major: z
    .string()
    .trim()
    .min(2, "Major must be at least 2 characters")
    .max(100, "Major must be 100 characters or fewer"),

  graduationYear: z
    .number()
    .int()
    .min(2025, "Graduation year must be 2025 or later")
    .max(2030, "Graduation year must be 2030 or earlier"),

  gender: z
    .string()
    .min(1, "Please select a gender"),

  spanishFluent: z.boolean(),

  canAttendCamp: z.boolean(),

  writtenResponses: z
    .array(
      z
        .string()
        .trim()
        .min(50, "Response must be at least 50 characters")
        .max(500, "Response must be 500 characters or fewer")
    )
    .length(5, "All 5 written responses are required"),
});

export type ApplicationSchemaType = z.infer<typeof applicationSchema>;

// ============================================
// Photo validation (separate — File can't go through server actions)
// ============================================

export function validatePhoto(file: File | null): string | null {
  if (!file) return "Photo is required";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Photo must be a JPG or PNG";
  if (file.size > MAX_PHOTO_SIZE) return "Photo must be under 5MB";
  return null; // valid
}
