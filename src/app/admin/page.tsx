"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { Logo } from "@/components/AdminShell";

const input =
  "w-full border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-ink";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, loading, user } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/admin/dashboard");
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Admin portal
        </p>
        <div>
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Every application, one clear view.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-400">
            Review applications, track funding and keep an eye on volume across
            the day, week, quarter and year.
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} LongLake Loans · Internal use only
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Logo href="/admin" />
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted">
            Use your staff account to continue.
          </p>

          {error && (
            <div className="mt-6 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="you@longlakeloans.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
              {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
