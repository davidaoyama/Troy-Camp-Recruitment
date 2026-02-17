import Link from "next/link";
import { getUserDetail } from "@/app/admin/users/actions";
import { UserProfile } from "./UserProfile";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserDetail(id);

  if (!result.success) {
    return (
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          &larr; Back to Users
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">User not found</p>
          <p className="text-red-500 text-sm mt-1">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to Users
      </Link>
      <UserProfile detail={result.detail} />
    </div>
  );
}
