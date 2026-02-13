"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WRITTEN_QUESTIONS } from "@/lib/questions";
import { validatePhoto } from "@/lib/validations";
import { submitApplication } from "./actions";

const GRADUATION_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function ApplyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Form state ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState<number>(0);
  const [gender, setGender] = useState("");
  const [spanishFluent, setSpanishFluent] = useState<boolean | null>(null);
  const [canAttendCamp, setCanAttendCamp] = useState<boolean | null>(null);
  const [writtenResponses, setWrittenResponses] = useState<string[]>(
    WRITTEN_QUESTIONS.map(() => "")
  );

  // ---- UI state ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Handlers ----

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const photoError = validatePhoto(file);
    if (photoError) {
      setError(photoError);
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    setError(null);
    setPhoto(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  }

  function handleResponseChange(index: number, value: string) {
    setWrittenResponses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Build FormData to send to server action
      const fd = new FormData();
      fd.set("firstName", firstName);
      fd.set("lastName", lastName);
      fd.set("email", email);
      fd.set("phoneNumber", phoneNumber);
      fd.set("major", major);
      fd.set("graduationYear", String(graduationYear));
      fd.set("gender", gender);
      fd.set("spanishFluent", String(spanishFluent ?? false));
      fd.set("canAttendCamp", String(canAttendCamp ?? false));

      writtenResponses.forEach((resp, i) => {
        fd.set(`writtenResponse${i + 1}`, resp);
      });

      if (photo) {
        fd.set("photo", photo);
      }

      const result = await submitApplication(fd);

      if (result.success) {
        router.push(`/apply/success?id=${encodeURIComponent(result.anonymousId)}`);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-2">
          Transfer Counselor Application
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Please fill out all fields below. All information is required.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ======== Personal Information ======== */}
          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold mb-2">
              Personal Information
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
                Photo (JPG or PNG, max 5MB)
              </label>
              <input
                ref={fileInputRef}
                id="photo"
                type="file"
                accept="image/jpeg,image/png"
                required
                onChange={handlePhotoChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Photo preview"
                  className="mt-3 h-32 w-32 rounded-lg object-cover border border-gray-200"
                />
              )}
            </div>
          </fieldset>

          {/* ======== Demographics ======== */}
          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold mb-2">Demographics</legend>

            <div>
              <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-1">
                Major
              </label>
              <input
                id="major"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Graduation Year
                </label>
                <select
                  id="graduationYear"
                  required
                  value={graduationYear || ""}
                  onChange={(e) => setGraduationYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select year
                  </option>
                  {GRADUATION_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="spanishFluent" className="block text-sm font-medium text-gray-700 mb-1">
                  Spanish Fluent?
                </label>
                <select
                  id="spanishFluent"
                  required
                  value={spanishFluent === null ? "" : String(spanishFluent)}
                  onChange={(e) => setSpanishFluent(e.target.value === "true")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="canAttendCamp" className="block text-sm font-medium text-gray-700 mb-1">
                Can you attend Camp Troy Camp?
              </label>
              <select
                id="canAttendCamp"
                required
                value={canAttendCamp === null ? "" : String(canAttendCamp)}
                onChange={(e) => setCanAttendCamp(e.target.value === "true")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </fieldset>

          {/* ======== Written Responses ======== */}
          <fieldset className="space-y-6">
            <legend className="text-xl font-semibold mb-2">
              Written Responses
            </legend>
            <p className="text-sm text-gray-500">
              Each response must be between 50 and 500 characters.
            </p>

            {WRITTEN_QUESTIONS.map((q, i) => {
              const charCount = writtenResponses[i].length;
              const isUnder = charCount > 0 && charCount < 50;
              const isOver = charCount > 500;

              return (
                <div key={q.number}>
                  <label
                    htmlFor={`q${q.number}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {q.number}. {q.text}
                  </label>
                  <textarea
                    id={`q${q.number}`}
                    required
                    rows={5}
                    maxLength={500}
                    value={writtenResponses[i]}
                    onChange={(e) => handleResponseChange(i, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    {isUnder && (
                      <span className="text-amber-600">
                        Minimum 50 characters required
                      </span>
                    )}
                    {isOver && (
                      <span className="text-red-600">Over 500 character limit</span>
                    )}
                    {!isUnder && !isOver && <span />}
                    <span
                      className={
                        charCount > 500
                          ? "text-red-600"
                          : charCount >= 400
                            ? "text-amber-600"
                            : "text-gray-400"
                      }
                    >
                      {charCount}/500
                    </span>
                  </div>
                </div>
              );
            })}
          </fieldset>

          {/* ======== Submit ======== */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
