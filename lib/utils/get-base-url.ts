/**
 * Returns the app's base URL without a trailing slash.
 *
 * Browser: window.location.origin (always correct, no env var needed)
 * Server:  NEXT_PUBLIC_SITE_URL, falls back to http://localhost:3000
 *
 * Used wherever we need an absolute URL on the server side, e.g. the
 * Supabase auth redirectTo parameter in password-reset emails.
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
