import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-[13px] text-amber-950">
      <span className="font-medium">Demo mode</span> — read-only portfolio preview with
      synthetic data.{" "}
      <Link href="/signup" className="underline hover:text-amber-900">
        Sign up
      </Link>{" "}
      for a full account.
    </div>
  );
}
