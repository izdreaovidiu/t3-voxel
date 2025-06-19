import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">T3 + Clerk</h1>
            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="text-gray-600 transition-colors hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Welcome to your T3 App
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl text-gray-600">
            Built with Next.js, tRPC, Tailwind CSS, and now powered by Clerk
            authentication.
          </p>

          <div className="mt-10">
            <SignedOut>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Get started by signing in or creating an account
                </p>
                <div className="flex justify-center space-x-4">
                  <Link
                    href="/sign-in"
                    className="rounded-md bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-md bg-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-700"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="space-y-4">
                <p className="text-gray-600">
                  You&apos;re signed in! Check out your dashboard.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block rounded-md bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            </SignedIn>
          </div>
        </div>
      </main>
    </div>
  );
}
