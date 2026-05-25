import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          Customer health
        </Link>
        <h1 className="mb-1">Start free trial</h1>
        <p className="mb-6 text-caption">
          Demo includes 500 synthetic customers with survival predictions.
        </p>
        <Card>
          <CardContent>
            <AuthForm mode="signup" />
          </CardContent>
        </Card>
        <p className="mt-6 text-caption">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
