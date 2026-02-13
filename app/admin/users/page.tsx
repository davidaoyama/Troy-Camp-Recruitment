"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserRow, CreateUserInput } from "@/lib/types";
import { getUsers, createUser, deleteUser } from "./actions";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;

    const result = await deleteUser(userId);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Create User
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateForm && (
        <CreateUserModal
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadUsers();
          }}
        />
      )}

      {/* Users Table */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Username
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Full Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                TC Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Role
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No users yet. Create one to get started.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-gray-900">{user.username}</td>
                  <td className="px-4 py-3 text-gray-700">{user.full_name}</td>
                  <td className="px-4 py-3 text-gray-700">{user.tc_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CreateUserModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState<CreateUserInput>({
    username: "",
    password: "",
    fullName: "",
    tcName: "",
    role: "grader",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createUser(form);

    if (result.success) {
      onCreated();
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof CreateUserInput>(
    key: K,
    value: CreateUserInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900">Create New User</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="create-username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="create-username"
              type="text"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="create-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="create-password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="create-fullname"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="create-fullname"
              type="text"
              required
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. David Oyama"
            />
          </div>

          <div>
            <label
              htmlFor="create-tcname"
              className="block text-sm font-medium text-gray-700"
            >
              TC Name
            </label>
            <input
              id="create-tcname"
              type="text"
              required
              value={form.tcName}
              onChange={(e) => updateField("tcName", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. TC David"
            />
          </div>

          <div>
            <label
              htmlFor="create-role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="create-role"
              value={form.role}
              onChange={(e) =>
                updateField("role", e.target.value as "admin" | "grader")
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="grader">Grader</option>
              <option value="admin">Admin</option>
            </select>
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
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
