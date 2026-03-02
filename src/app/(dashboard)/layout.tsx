import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NoAccountPage } from "@/components/layout/no-account-page";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Supabase session is valid but no drivers record exists for this user.
    // Redirecting to /login would loop (middleware sends authenticated users
    // back to /dashboard), so render an error page instead.
    return <NoAccountPage />;
  }

  return (
    <DashboardShell userRole={user.role} userName={user.name}>
      {children}
    </DashboardShell>
  );
}
