"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  // { href: "/admin/message", label: "Messages", icon: Mail },
  { href: "/admin/user", label: "Users", icon: Users, adminOnly: true },
];

export function Logo({ href = "/admin/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center bg-ink text-xs font-bold text-paper">
        L
      </span>
      <span className="text-base font-semibold tracking-tight text-ink">
        LongLake Loans
      </span>
    </Link>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

/**
 * Sidebar + top bar for every signed-in admin page. The login page (/admin)
 * renders bare. Also owns the "not signed in → back to login" redirect so
 * individual pages don't have to.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isAdmin } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const isLogin = pathname === "/admin";

  useEffect(() => {
    if (!isLogin && !loading && !user) router.replace("/admin");
  }, [isLogin, loading, user, router]);

  if (isLogin) return <>{children}</>;
  if (loading || !user) return <Spinner />;

  const links = NAV.filter((n) => !n.adminOnly || isAdmin);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        Menu
      </p>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-ink font-medium text-paper"
                : "text-body hover:bg-wash hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-wash text-xs font-semibold uppercase text-ink ring-1 ring-line">
          {user.name?.slice(0, 2) || "AD"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs capitalize text-muted">{user.role}</p>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="cursor-pointer p-1.5 text-muted transition-colors hover:text-red-600"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-wash">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex h-16 items-center border-b border-line px-6">
          <Logo />
        </div>
        {nav}
        {account}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:hidden">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-mr-2 p-2 text-ink"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-paper">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2 text-ink"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      )}

      <main className="lg:pl-60">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
