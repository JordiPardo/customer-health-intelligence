import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-base font-medium text-[var(--foreground)]"
        >
          Customer health intelligence
        </Link>
        <h1 className="mb-2">Start free trial</h1>
        <p className="mb-6 text-base text-[var(--muted)]">
          Demo includes 500 synthetic customers with survival predictions.
        </p>
        <AuthForm mode="signup" />
        <p className="mt-6 text-base text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
