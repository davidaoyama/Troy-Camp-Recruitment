import Link from "next/link";
import { getApplicantDetail } from "@/app/admin/deliberations/actions";
import { ApplicantProfile } from "./ApplicantProfile";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicantDetail(id);

  if (!result.success) {
    return (
      <div>
        <Link
          href="/admin/applicants"
          className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          &larr; Back to Applicants
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">Applicant not found</p>
          <p className="text-red-500 text-sm mt-1">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/applicants"
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to Applicants
      </Link>
      <ApplicantProfile detail={result.detail} />
    </div>
  );
}
