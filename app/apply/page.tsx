"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WRITTEN_QUESTIONS } from "@/lib/questions";
import { validatePhoto } from "@/lib/validations";
import { submitApplication } from "./actions";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ApplyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Form state ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
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
      fd.set("pronouns", pronouns);
      fd.set("email", email);
      fd.set("phoneNumber", phoneNumber);
      fd.set("major", major);
      fd.set("graduationYear", graduationYear);
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
        router.push("/apply/success");
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
        <a
          href="/"
          className="inline-block text-sm text-blue-600 hover:text-blue-800 font-medium mb-6"
        >
          &larr; Back to Home
        </a>
        <h1 className="text-3xl font-bold text-center mb-2">
          Troy Camp Counselor Application
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
                  placeholder="ie. Troy"
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
                  placeholder="ie. Camp"
                  minLength={2}
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700 mb-1">
                Pronouns
              </label>
              <input
                id="pronouns"
                type="text"
                required
                placeholder="ie. he/him, she/her, they/them"
                maxLength={50}
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ie. troycamp@usc.edu"
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
                  placeholder="ie. 1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
                Headshot Photo (JPG or PNG, max 5MB)
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
                placeholder="Business Administration"
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
                <input
                  id="graduationYear"
                  type="text"
                  required
                  placeholder="ie. Spring 2027"
                  maxLength={20}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
                  Spanish Fluency
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
                  <option value="true">Fluent</option>
                  <option value="false">Conversational</option>
                  <option value="false">Not fluent</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="canAttendCamp" className="block text-sm font-medium text-gray-700 mb-1">
                Can you attend Camp this year? (look at posted date)
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
              The max word count for each response is 250 words. You may not need all 250 though!
            </p>

            {WRITTEN_QUESTIONS.map((q, i) => {
              const words = countWords(writtenResponses[i]);
              const isOver = words > 250;

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
                    value={writtenResponses[i]}
                    onChange={(e) => handleResponseChange(i, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-1 flex justify-end text-xs">
                    <span
                      className={
                        isOver
                          ? "text-red-600"
                          : words >= 200
                            ? "text-amber-600"
                            : "text-gray-400"
                      }
                    >
                      {words}/250 words
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
