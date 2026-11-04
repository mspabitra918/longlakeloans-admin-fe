"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAuth, useAdminApi } from "@/lib/admin-auth";
import { LuRefreshCcw } from "react-icons/lu";
import { formatDateTime } from "@/lib/datetime";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status: "unread" | "read" | "replied";
}

const STATUS_COLORS: Record<string, string> = {
  unread: "bg-red-100 text-red-800",
  read: "bg-blue-100 text-blue-800",
  replied: "bg-green-100 text-green-800",
};

// const SUBJECTS = ["all", "general", "application", "payments", "account", "complaint", "other"];

function formatDate(date: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <MessagesListContent />
    </Suspense>
  );
}

function MessagesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, loading, logout } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [subject, setSubject] = useState(searchParams.get("subject") || "all");
  const [search, setSearch] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (subject !== "all") params.set("subject", subject);
    if (search) params.set("search", search);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [page, subject, search, pathname, router]);

  const handleReset = () => {
    setIsResetting(true);
    setPage(1);
    setSubject("all");
    setSearch("");
    setSearchInput("");

    setTimeout(() => {
      setIsResetting(false);
    }, 1000);
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (subject !== "all") params.set("subject", subject);
    if (search) params.set("search", search);

    try {
      const res = await adminFetch(`/api/admin/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user, page, subject, search, adminFetch]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/dashboard"
            className="text-xl font-bold text-primary"
          >
            Oakhill Loans
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/admin/dashboard"
              className="text-gray-600 hover:text-primary transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/applications"
              className="text-gray-600 hover:text-primary transition"
            >
              Applications
            </Link>
            <Link href="/admin/message" className="text-primary font-medium">
              Message
            </Link>
            <Link
              href="/admin/user"
              className="text-gray-600 hover:text-primary transition"
            >
              User
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">
            {user.name} ({user.role})
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Messages{" "}
            <span className="text-gray-400 text-lg font-normal">({total})</span>
          </h1>

          {/* Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, email or message"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition cursor-pointer"
              >
                Search
              </button>
            </form>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-primary border border-primary rounded-lg text-sm transition hover:bg-primary/5 cursor-pointer flex items-center justify-center"
            >
              <LuRefreshCcw
                size={20}
                className={`${isResetting ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Filters */}
        {/* <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden md:block">Subject:</span>
            <div className="flex gap-1 flex-wrap">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSubject(s);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    subject === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div> */}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {dataLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-6 py-3">Sender</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Message Preview</th>
                    {/* <th className="px-6 py-3">Status</th> */}
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {m.name}
                        </div>
                        <div className="text-sm text-gray-500">{m.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium capitalize">
                          {m.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs word-break break-words word-wrap">
                        {m.message}
                      </td>
                      {/* <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {m.status || "unread"}
                        </span>
                      </td> */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
