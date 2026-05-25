import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-base font-medium text-[var(--foreground)]"
        >
          Customer health intelligence
        </Link>
        <h1 className="mb-6">Sign in</h1>
        <AuthForm mode="login" />
        <p className="mt-6 text-base text-[var(--muted)]">
          No account?{" "}
          <Link href="/signup" className="text-[var(--primary)] hover:underline">
            Start free trial
          </Link>
        </p>
        <p className="mt-3 text-base text-[var(--muted)]">
          <Link href="/demo/dashboard" className="text-[var(--primary)] hover:underline">
            View demo without signing in
          </Link>
        </p>
      </div>
    </div>
  );
}
