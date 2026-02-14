import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <main className="text-center px-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Troy Camp
        </h1>
        <p className="mt-2 text-xl text-gray-600">
          Transfer Counselor Applications
        </p>
        <p className="mt-4 text-gray-500 max-w-md mx-auto">
          Spring 2026 recruitment is now open. Submit your application below.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/apply"
            className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Apply Now
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Staff Login
          </Link>
        </div>
      </main>
    </div>
  );
}
