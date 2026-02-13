import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "./components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar userName={user.tc_name} />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
