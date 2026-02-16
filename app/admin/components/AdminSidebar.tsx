"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/applicants", label: "Applicants" },
  { href: "/admin/assignments/written", label: "Written Assignments" },
  { href: "/admin/assignments/interview", label: "Interview Assignments" },
  { href: "/admin/rubrics", label: "Rubrics" },
  { href: "/admin/deliberations", label: "Deliberations" },
  { href: "/admin/export", label: "Export Data" },
  { href: "/admin/users", label: "Manage Users" },
];

export const AdminSidebar = ({ userName }: { userName: string }) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Troy Camp</h2>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-2">{userName}</p>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};
