import Link from "next/link";

interface SuccessPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ApplySuccessPage({ searchParams }: SuccessPageProps) {
  const { id } = await searchParams;
  const anonymousId = id ?? "Unknown";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Application Submitted!
        </h1>

        <p className="text-gray-600 mb-6">
          Your application has been received successfully.
        </p>

        <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
          <p className="text-sm text-gray-500 mb-1">Your Anonymous ID</p>
          <p className="text-3xl font-bold text-blue-600">{anonymousId}</p>
          <p className="mt-3 text-sm text-gray-500">
            Please save this ID for your records. You may need it to reference
            your application.
          </p>
        </div>

        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Return to home page
        </Link>
      </div>
    </div>
  );
}
