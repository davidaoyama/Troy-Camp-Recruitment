"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { applicationSchema } from "@/lib/validations";
import { generateAnonymousId } from "@/lib/generate-anonymous-id";
import { WRITTEN_QUESTIONS } from "@/lib/questions";
import type { SubmitApplicationResult } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

export async function submitApplication(
  formData: FormData
): Promise<SubmitApplicationResult> {
  try {
    // ---- 1. Extract fields from FormData ----
    const photo = formData.get("photo") as File | null;
    const rawFields = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      pronouns: formData.get("pronouns") as string,
      email: formData.get("email") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      major: formData.get("major") as string,
      graduationYear: formData.get("graduationYear") as string,
      gender: formData.get("gender") as string,
      spanishFluent: formData.get("spanishFluent") === "true",
      canAttendCamp: formData.get("canAttendCamp") === "true",
      writtenResponses: [
        formData.get("writtenResponse1") as string,
        formData.get("writtenResponse2") as string,
        formData.get("writtenResponse3") as string,
        formData.get("writtenResponse4") as string,
        formData.get("writtenResponse5") as string,
      ],
    };

    // ---- 2. Validate with Zod ----
    const parsed = applicationSchema.safeParse(rawFields);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError.message };
    }

    // ---- 3. Validate photo server-side ----
    if (!photo || photo.size === 0) {
      return { success: false, error: "Photo is required" };
    }
    if (!["image/jpeg", "image/png"].includes(photo.type)) {
      return { success: false, error: "Photo must be a JPG or PNG" };
    }
    if (photo.size > 5 * 1024 * 1024) {
      return { success: false, error: "Photo must be under 5MB" };
    }

    const data = parsed.data;

    // ---- 4. Generate anonymous ID ----
    const anonymousId = await generateAnonymousId(SEMESTER);

    // ---- 5. Upload photo to Supabase Storage ----
    const fileExt = photo.type === "image/png" ? "png" : "jpg";
    const storagePath = `${SEMESTER}/${anonymousId}.${fileExt}`;

    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("applicant-photos")
      .upload(storagePath, photoBuffer, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Photo upload failed: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("applicant-photos")
      .getPublicUrl(storagePath);

    const photoUrl = publicUrlData.publicUrl;

    // ---- 6. Insert into applications table ----
    const { data: appRow, error: appError } = await supabaseAdmin
      .from("applications")
      .insert({
        anonymous_id: anonymousId,
        first_name: data.firstName,
        last_name: data.lastName,
        pronouns: data.pronouns,
        email: data.email,
        phone_number: data.phoneNumber,
        photo_url: photoUrl,
        major: data.major,
        graduation_year: data.graduationYear,
        gender: data.gender,
        spanish_fluent: data.spanishFluent,
        can_attend_camp: data.canAttendCamp,
        status: "pending",
        semester: SEMESTER,
      })
      .select("id")
      .single();

    if (appError) {
      return { success: false, error: `Failed to save application: ${appError.message}` };
    }

    // ---- 7. Insert 5 written responses ----
    const writtenRows = WRITTEN_QUESTIONS.map((q, i) => ({
      application_id: appRow.id,
      question_number: q.number,
      question_text: q.text,
      response_text: data.writtenResponses[i],
    }));

    const { error: writtenError } = await supabaseAdmin
      .from("written_responses")
      .insert(writtenRows);

    if (writtenError) {
      return { success: false, error: `Failed to save written responses: ${writtenError.message}` };
    }

    // ---- 8. Success ----
    return { success: true, anonymousId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
