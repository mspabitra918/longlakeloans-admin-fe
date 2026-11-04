import type { Metadata } from "next";
import { AdminAuthProvider } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Portal | Oakhill Loans",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </AdminAuthProvider>
  );
}
