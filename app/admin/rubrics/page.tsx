"use client";

import { useState, useEffect, useCallback } from "react";
import type { RubricRow } from "@/lib/types";
import { getRubrics, saveRubric, deleteRubric } from "./actions";

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<RubricRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRubric, setEditingRubric] = useState<RubricRow | null>(null);

  const loadRubrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRubrics();
      setRubrics(data);
    } catch {
      setError("Failed to load rubrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRubrics();
  }, [loadRubrics]);

  const handleEdit = (rubric: RubricRow) => {
    setEditingRubric(rubric);
    setShowForm(true);
  };

  const handleDelete = async (id: string, questionText: string) => {
    const preview = questionText.length > 40 ? questionText.slice(0, 40) + "..." : questionText;
    if (!confirm(`Delete rubric "${preview}"? This cannot be undone.`)) return;

    const result = await deleteRubric(id);
    if (result.success) {
      setRubrics((prev) => prev.filter((r) => r.id !== id));
    } else {
      setError(result.error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRubric(null);
  };

  const handleSaved = () => {
    handleFormClose();
    loadRubrics();
  };

  // Group rubrics by category
  const writtenRubrics = rubrics.filter((r) => r.question_type === "written");
  const interviewS1 = rubrics.filter((r) => r.question_type === "interview" && r.section === 1);
  const interviewS2 = rubrics.filter((r) => r.question_type === "interview" && r.section === 2);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Rubrics</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Add Rubric
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <RubricFormModal
          rubric={editingRubric}
          onClose={handleFormClose}
          onSaved={handleSaved}
        />
      )}

      {isLoading ? (
        <p className="mt-8 text-center text-gray-500">Loading rubrics...</p>
      ) : rubrics.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">
          <p>No rubrics yet. Add your first rubric to get started.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <RubricGroup
            title="Written Response Rubrics"
            rubrics={writtenRubrics}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <RubricGroup
            title="Interview Rubrics — Section 1"
            rubrics={interviewS1}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <RubricGroup
            title="Interview Rubrics — Section 2"
            rubrics={interviewS2}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}

// ─── Dumb Component: Grouped Table ───────────────────────────

const RubricGroup = ({
  title,
  rubrics,
  onEdit,
  onDelete,
}: {
  title: string;
  rubrics: RubricRow[];
  onEdit: (r: RubricRow) => void;
  onDelete: (id: string, text: string) => void;
}) => {
  if (rubrics.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">Q#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Question Text</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rubric Content</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rubrics.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-gray-900 font-medium">{r.question_number}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs">
                  <p className="line-clamp-2">{r.question_text}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  <p className="line-clamp-2">{r.rubric_content || "—"}</p>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => onEdit(r)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(r.id, r.question_text)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Dumb Component: Create/Edit Modal ───────────────────────

interface RubricFormData {
  questionNumber: number;
  questionType: "written" | "interview";
  questionText: string;
  rubricContent: string;
  section: number | null;
}

const RubricFormModal = ({
  rubric,
  onClose,
  onSaved,
}: {
  rubric: RubricRow | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEditing = rubric !== null;

  const [form, setForm] = useState<RubricFormData>(() => {
    if (rubric) {
      return {
        questionNumber: rubric.question_number,
        questionType: rubric.question_type as "written" | "interview",
        questionText: rubric.question_text,
        rubricContent: rubric.rubric_content ?? "",
        section: rubric.section,
      };
    }
    return {
      questionNumber: 1,
      questionType: "written",
      questionText: "",
      rubricContent: "",
      section: null,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof RubricFormData>(key: K, value: RubricFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: "written" | "interview") => {
    setForm((prev) => ({
      ...prev,
      questionType: type,
      section: type === "written" ? null : prev.section ?? 1,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await saveRubric({
      id: rubric?.id,
      questionNumber: form.questionNumber,
      questionType: form.questionType,
      questionText: form.questionText,
      rubricContent: form.rubricContent,
      section: form.section,
    });

    if (result.success) {
      onSaved();
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-900">
          {isEditing ? "Edit Rubric" : "Add Rubric"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              {error}
            </div>
          )}

          {/* Question Type */}
          <div>
            <label htmlFor="rubric-type" className="block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <select
              id="rubric-type"
              value={form.questionType}
              onChange={(e) => handleTypeChange(e.target.value as "written" | "interview")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="written">Written</option>
              <option value="interview">Interview</option>
            </select>
          </div>

          {/* Section (interview only) */}
          {form.questionType === "interview" && (
            <div>
              <label htmlFor="rubric-section" className="block text-sm font-medium text-gray-700">
                Section
              </label>
              <select
                id="rubric-section"
                value={form.section ?? 1}
                onChange={(e) => updateField("section", Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={1}>Section 1</option>
                <option value={2}>Section 2</option>
              </select>
            </div>
          )}

          {/* Question Number */}
          <div>
            <label htmlFor="rubric-qnum" className="block text-sm font-medium text-gray-700">
              Question Number
            </label>
            <input
              id="rubric-qnum"
              type="number"
              required
              min={1}
              max={20}
              value={form.questionNumber}
              onChange={(e) => updateField("questionNumber", Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Question Text */}
          <div>
            <label htmlFor="rubric-qtext" className="block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <textarea
              id="rubric-qtext"
              required
              rows={2}
              value={form.questionText}
              onChange={(e) => updateField("questionText", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              placeholder="e.g. Why do you want to be a transfer counselor?"
            />
          </div>

          {/* Rubric Content */}
          <div>
            <label htmlFor="rubric-content" className="block text-sm font-medium text-gray-700">
              Rubric / Scoring Guide
            </label>
            <textarea
              id="rubric-content"
              rows={5}
              value={form.rubricContent}
              onChange={(e) => updateField("rubricContent", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              placeholder={"5 - Exceptional: ...\n4 - Strong: ...\n3 - Adequate: ...\n2 - Weak: ...\n1 - Poor: ..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Rubric"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
