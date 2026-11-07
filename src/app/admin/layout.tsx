import { Suspense } from "react";
import { AdminAuthProvider } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";

// AdminShell reads usePathname(), and pages below read useParams() /
// useSearchParams(). Under cacheComponents those suspend on routes whose params
// aren't known at build time (e.g. /admin/applications/[id]), so the shell
// needs a Suspense boundary or prerendering fails.
function ShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<ShellFallback />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </AdminAuthProvider>
  );
}
