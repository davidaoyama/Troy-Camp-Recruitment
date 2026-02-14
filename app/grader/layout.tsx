import { requireAuth } from "@/lib/auth";
import { GraderSidebar } from "./components/GraderSidebar";

export default async function GraderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GraderSidebar userName={user.tc_name} />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
