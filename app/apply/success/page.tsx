import Link from "next/link";

export default function ApplySuccessPage() {
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

        <p className="text-gray-600 mb-2">
          Thank you for applying to be a Transfer Counselor.
        </p>

        <p className="text-gray-500 text-sm mb-8">
          Please watch your email for next steps regarding the interview
          process. If you have any questions, reach out to the Troy Camp team.
        </p>

        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          &larr; Return to home page
        </Link>
      </div>
    </div>
  );
}
