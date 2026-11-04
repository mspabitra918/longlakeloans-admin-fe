"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAuth, useAdminApi } from "@/lib/admin-auth";
import { LuRefreshCcw } from "react-icons/lu";
import { FaArrowDownLong } from "react-icons/fa6";
import toast from "react-hot-toast";
import { formatDateTime, todayStr } from "@/lib/datetime";

interface Application {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  bank_name: string;
  country: string;
  loan_amount: number;
  loan_purpose: string;
  loan_term: number;
  monthly_income: number;
  employment_status: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  bank_verification_pending: "bg-yellow-100 text-yellow-800",
  // reviewing: "bg-blue-100 text-blue-800",
  bank_verification_completed: "bg-green-100 text-green-800",
  // declined: "bg-red-100 text-red-800",
  declined_pb: "bg-red-100 text-red-800",
  declined_hd: "bg-red-100 text-red-800",
  funded: "bg-purple-100 text-purple-800",
  // bank_verification_failed: "bg-red-100 text-red-800",
  // bank_verification_in_progress: "bg-indigo-100 text-indigo-800",
  // deposit_in_progress: "bg-yellow-100 text-yellow-800",
  bank_reverification: "bg-amber-100 text-amber-800",
  request_a_call: "bg-indigo-100 text-indigo-800",
};

const STATUSES = [
  "all",
  // "bank_verification_pending",
  // "reviewing",
  // "bank_verification_completed",
  // "declined",
  "declined_pb",
  "declined_hd",
  "funded",
  // "bank_verification_failed",
  // "bank_verification_in_progress",
  // "deposit_in_progress",
  "bank_reverification",
  "request_a_call",
];
const COUNTRIES = ["all", "US"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// function formatDate(date: string | null) {
//   if (!date) return "N/A";
//   return new Date(date).toLocaleString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//     hour: "numeric",
//     minute: "2-digit",
//   });
// }

export default function ApplicationsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ApplicationsListContent />
    </Suspense>
  );
}

function ApplicationsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, loading, logout } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [country, setCountry] = useState(searchParams.get("country") || "all");
  const [search, setSearch] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search")?.trim() || "",
  );
  const [filterDate, setFilterDate] = useState(
    searchParams.get("date") || todayStr(),
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "created_at",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
  );
  const [dataLoading, setDataLoading] = useState(true);

  const [isResetting, setIsResetting] = useState(false);

  const [openExportModule, setOpenExportModule] = useState(false);
  const [isExport, setIsExport] = useState(false);

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (status !== "all") params.set("status", status);
    if (country !== "all") params.set("country", country);
    if (search) params.set("search", search);
    if (filterDate) {
      params.set("date", filterDate);
    }
    if (sortBy !== "created_at") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [
    page,
    status,
    country,
    search,
    filterDate,
    sortBy,
    sortOrder,
    pathname,
    router,
  ]);

  const handleReset = () => {
    setIsResetting(true);
    setPage(1);
    setStatus("all");
    setCountry("all");
    setSearch("");
    setSearchInput("");
    setFilterDate(todayStr());
    setSortBy("created_at");
    setSortOrder("desc");

    // Clear rotation after a delay
    setTimeout(() => {
      setIsResetting(false);
    }, 1000);
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      sortBy,
      sortOrder,
    });
    if (status !== "all") params.set("status", status);
    if (country !== "all") params.set("country", country);
    if (search) params.set("search", search);
    if (!searchInput) {
      if (filterDate) params.set("date", filterDate);
    }

    try {
      const res = await adminFetch(`/api/admin/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setDataLoading(false);
    }
  }, [
    user,
    page,
    status,
    country,
    search,
    filterDate,
    sortBy,
    sortOrder,
    adminFetch,
  ]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handelExportLeadsData = async () => {
    setIsExport(true);
    try {
      const response = await adminFetch(`/api/admin/export-applications`);

      const data = await response.text(); // ✅ extract text first

      const blob = new Blob([data], { type: "text/csv" });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "leads-applications.csv";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      setIsExport(false);
      toast.error("Export failed");
    } finally {
      setIsExport(false);
      setOpenExportModule(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field)
      return <span className="text-gray-300 ml-1">&#8597;</span>;
    return (
      <span className="text-primary ml-1">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
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
              className="text-primary font-medium"
            >
              Applications
            </Link>
            <Link
              href="/admin/message"
              className="text-gray-600 hover:text-primary transition"
            >
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
            Applications{" "}
            <span className="text-gray-400 text-lg font-normal">({total})</span>
          </h1>

          {/* Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, email, or ID"
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
            <div>
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
            {/* <button
              onClick={() => setOpenExportModule(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-400 rounded-lg text-sm text-gray-600 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-gray-600"
              >
                <path d="M12 15V3" />
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m7 10 5 5 5-5" />
              </svg>
              Export
            </button> */}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden md:block">
              Status:
            </span>
            <div className="flex gap-1 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    status === s
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Date:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            {filterDate !== todayStr() && (
              <button
                onClick={() => {
                  setFilterDate(todayStr());
                  setPage(1);
                }}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Country:</span>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Countries" : c}
                </option>
              ))}
            </select>
          </div> */}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {dataLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No applications found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-6 py-3">Applicant ID</th>
                    <th
                      className="px-6 py-3 cursor-pointer select-none"
                      onClick={() => toggleSort("last_name")}
                    >
                      Applicant <SortIcon field="last_name" />
                    </th>
                    <th className="px-6 py-3">Bank Name</th>
                    <th
                      className="px-6 py-3 cursor-pointer select-none"
                      onClick={() => toggleSort("loan_amount")}
                    >
                      Amount <SortIcon field="loan_amount" />
                    </th>
                    {/* <th className="px-6 py-3">Purpose</th> */}
                    <th
                      className="px-6 py-3 cursor-pointer select-none"
                      onClick={() => toggleSort("monthly_income")}
                    >
                      Income <SortIcon field="monthly_income" />
                    </th>
                    <th className="px-6 py-3">Status</th>
                    <th
                      className="px-6 py-3 cursor-pointer select-none  flex items-center gap-2"
                      onClick={() => toggleSort("created_at")}
                    >
                      Date <SortIcon field="created_at" />
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr
                      key={app.application_id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 font-medium">
                        {app?.application_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {app.first_name} {app.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{app.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {app.bank_name}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(app.loan_amount)}
                      </td>
                      {/* <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {app.loan_purpose?.replace(/-/g, " ")}
                      </td> */}
                      <td className="px-6 py-4 text-sm">
                        {formatCurrency(app.monthly_income)}/mo
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || ""}`}
                        >
                          {app?.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(app.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/applications/${app.application_id}`}
                          className="text-primary text-sm hover:underline"
                        >
                          View
                        </Link>
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
        {openExportModule && (
          <div
            className={`fixed inset-0 flex items-center justify-center bg-black/40 z-50 transition-opacity duration-200 ${
              openExportModule ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className={`bg-white p-6 rounded-lg shadow-lg transition-all duration-200 w-full max-w-lg ${
                openExportModule
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }`}
            >
              <h3 className="text-lg font-semibold text-maintext">
                Export All Leads Applications
              </h3>

              <p className="mt-2 leading-6 text-lightgrey">
                Export the complete list of lead applications to a CSV file for
                download and analysis.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setOpenExportModule(false)}
                  className="px-3 py-1.5 bg-white text-maintext border border-bordergrey text-sm rounded-md hover:border-gray-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handelExportLeadsData}
                  className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  {isExport ? (
                    <span className="flex items-center gap-2">
                      Exporting...
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    </span>
                  ) : (
                    "Export"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
