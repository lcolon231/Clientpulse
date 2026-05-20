import { redirect } from "next/navigation";

// The root path has no content of its own. Authenticated users land on
// /dashboard; unauthenticated users are caught by middleware and sent to
// /login?next=/dashboard before they ever reach the dashboard page.
export default function RootPage() {
  redirect("/dashboard");
}
