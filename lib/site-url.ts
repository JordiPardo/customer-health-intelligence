/**
 * Canonical site URL for auth redirects (local + Vercel production).
 */
export function getSiteUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.VERCEL_URL && !forwardedHost) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}
