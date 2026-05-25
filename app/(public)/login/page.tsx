import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          Customer health
        </Link>
        <h1 className="mb-1">Sign in</h1>
        <p className="mb-6 text-caption">Access your customer health workspace.</p>
        <Card>
          <CardContent>
            <AuthForm mode="login" />
          </CardContent>
        </Card>
        <p className="mt-6 text-caption">
          No account?{" "}
          <Link href="/signup" className="font-medium text-[var(--accent)] hover:underline">
            Start free trial
          </Link>
        </p>
        <p className="mt-3 text-caption">
          <Link href="/demo/dashboard" className="font-medium text-[var(--accent)] hover:underline">
            View demo without signing in
          </Link>
        </p>
      </div>
    </div>
  );
}
