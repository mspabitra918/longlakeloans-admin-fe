"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useAdminApi, useAdminAuth } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/datetime";
import {
  DATE_PRESETS,
  formatDay,
  presetRange,
  type DatePresetKey,
} from "@/lib/dateRange";
import {
  APPLICATION_STATUSES,
  formatCurrency,
  formatNumber,
  statusLabel,
} from "@/lib/status";
import { PageHeader } from "@/components/AdminShell";
import StatusBadge from "@/components/StatusBadge";

interface Application {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state: string;
  bank_name: string;
  loan_amount: number;
  monthly_income: number;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 20;
const DEFAULT_PRESET: DatePresetKey = "today";
const PRESET_KEYS = [...DATE_PRESETS.map((p) => p.key), "custom"] as string[];

export default function ApplicationsListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
      }
    >
      <ApplicationsList />
    </Suspense>
  );
}

function ApplicationsList() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { user } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  // ---- filter state (initialised from the URL) ----
  const initialPreset = (
    PRESET_KEYS.includes(sp.get("range") ?? "")
      ? sp.get("range")
      : sp.get("from") || sp.get("to")
        ? "custom"
        : DEFAULT_PRESET
  ) as DatePresetKey;
  const initialRange =
    initialPreset === "custom" || sp.get("from")
      ? { from: sp.get("from") ?? "", to: sp.get("to") ?? "" }
      : presetRange(initialPreset);

  const [preset, setPreset] = useState<DatePresetKey>(initialPreset);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [search, setSearch] = useState(sp.get("search")?.trim() ?? "");
  const [searchInput, setSearchInput] = useState(search);
  const [page, setPage] = useState(Number(sp.get("page")) || 1);
  const [sortBy, setSortBy] = useState(sp.get("sortBy") ?? "created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    sp.get("sortOrder") === "asc" ? "asc" : "desc",
  );

  // ---- data ----
  const [rows, setRows] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");

  // Debounced live search (Enter applies immediately)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const v = searchInput.trim();
      if (v !== search) {
        setSearch(v);
        setPage(1);
      }
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [searchInput, search]);

  // Keep the URL in sync so filtered views are shareable/bookmarkable
  useEffect(() => {
    const q = new URLSearchParams();
    if (preset !== DEFAULT_PRESET) q.set("range", preset);
    if (
      preset === "custom" ||
      (preset !== "all" && from !== presetRange(preset).from)
    ) {
      if (from) q.set("from", from);
      if (to) q.set("to", to);
    }
    if (status) q.set("status", status);
    if (search) q.set("search", search);
    if (page > 1) q.set("page", String(page));
    if (sortBy !== "created_at") q.set("sortBy", sortBy);
    if (sortOrder !== "desc") q.set("sortOrder", sortOrder);
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    preset,
    from,
    to,
    status,
    search,
    page,
    sortBy,
    sortOrder,
    pathname,
    router,
  ]);

  const query = (() => {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    });
    if (from) q.set("dateFrom", from);
    if (to) q.set("dateTo", to);
    if (!from && !to) q.set("all", "1");
    if (status) q.set("status", status);
    if (search) q.set("search", search);
    return q.toString();
  })();
  const [refresh, setRefresh] = useState(0);
  const key = `${query}#${refresh}`;
  const loading = loadedKey !== key;
  const fetchRows = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    adminFetch(`/api/admin/applications?${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.applications || []);
        setTotal(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Failed to load applications",
        );
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [user, adminFetch, query, key]);

  // ---- handlers ----
  const choosePreset = (key: DatePresetKey) => {
    const r = presetRange(key);
    setPreset(key);
    setFrom(r.from);
    setTo(r.to);
    setPage(1);
  };

  const setCustom = (nextFrom: string, nextTo: string) => {
    // Keep from <= to
    if (nextFrom && nextTo && nextFrom > nextTo)
      [nextFrom, nextTo] = [nextTo, nextFrom];
    setPreset("custom");
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const reset = () => {
    choosePreset(DEFAULT_PRESET);
    setStatus("");
    setSearch("");
    setSearchInput("");
    setSortBy("created_at");
    setSortOrder("desc");
  };

  const hasFilters =
    preset !== DEFAULT_PRESET ||
    !!status ||
    !!search ||
    sortBy !== "created_at";

  const rangeText =
    !from && !to
      ? "All time"
      : from === to
        ? formatDay(from)
        : `${from ? formatDay(from) : "Start"} – ${to ? formatDay(to) : "Today"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Pipeline"
        title={
          <>
            Applications{" "}
            <span className="text-lg font-normal text-muted tabular-nums">
              {loading ? "" : formatNumber(total)}
            </span>
          </>
        }
      >
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Calendar className="h-4 w-4" strokeWidth={1.5} />
          {rangeText}
        </p>
      </PageHeader>

      {/* Filters */}
      <div className="border border-line bg-paper">
        {/* Row 1: search + date */}
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="relative w-full xl:max-w-md"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, phone, email or application ID"
              aria-label="Search applications"
              className="w-full border border-line bg-paper py-2 pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Date range"
              className="inline-flex flex-wrap rounded-lg border border-line p-0.5"
            >
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  role="tab"
                  aria-selected={preset === p.key}
                  onClick={() => choosePreset(p.key)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    preset === p.key
                      ? "bg-brand text-paper"
                      : "text-muted hover:text-brand"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div
              className={`flex items-center border p-0.5 text-xs ${
                preset === "custom" ? "border-brand" : "border-line"
              }`}
            >
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setCustom(e.target.value, to)}
                aria-label="From date"
                className="cursor-pointer bg-transparent px-2 py-1 text-ink outline-none"
              />
              <span className="text-muted">→</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setCustom(from, e.target.value)}
                aria-label="To date"
                className="cursor-pointer bg-transparent px-2 py-1 text-ink outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 2: status */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-muted sm:block">
            Status
          </span>
          <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5">
            {["", ...APPLICATION_STATUSES].map((s) => (
              <button
                key={s || "all"}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`shrink-0 cursor-pointer border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  status === s
                    ? "border-brand bg-brand text-paper"
                    : "border-line text-body hover:border-brand hover:text-brand"
                }`}
              >
                {s ? statusLabel(s) : "All statuses"}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              onClick={reset}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={fetchRows}
            className="cursor-pointer font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <SortTh
                  field="last_name"
                  sortBy={sortBy}
                  order={sortOrder}
                  onSort={toggleSort}
                >
                  Applicant
                </SortTh>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Application ID</th>
                <SortTh
                  field="loan_amount"
                  sortBy={sortBy}
                  order={sortOrder}
                  onSort={toggleSort}
                  right
                >
                  Amount
                </SortTh>
                <th className="px-5 py-3 text-right font-medium">Income</th>
                <th className="px-5 py-3 font-medium">Bank</th>
                <SortTh
                  field="status"
                  sortBy={sortBy}
                  order={sortOrder}
                  onSort={toggleSort}
                >
                  Status
                </SortTh>
                <SortTh
                  field="created_at"
                  sortBy={sortBy}
                  order={sortOrder}
                  onSort={toggleSort}
                >
                  Submitted
                </SortTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && rows.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-3">
                      <div className="h-9 animate-pulse bg-wash" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-sm font-medium text-ink">
                      No applications found
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Nothing matches these filters for{" "}
                      {rangeText.toLowerCase()}.
                    </p>
                    {(from || to) && (
                      <button
                        onClick={() => choosePreset("all")}
                        className="mt-4 cursor-pointer border border-brand px-4 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-paper"
                      >
                        Search all time
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((app) => (
                  <tr
                    key={app.application_id}
                    onClick={() =>
                      router.push(`/admin/applications/${app.application_id}`)
                    }
                    className={`cursor-pointer transition-colors hover:bg-wash ${loading ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium whitespace-nowrap text-ink">
                        {app.first_name} {app.last_name}
                      </p>
                      <p className="text-xs text-muted">{app.email}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-body tabular-nums">
                      {app.phone
                        ? app.phone
                            .replace(/\D/g, "")
                            .replace(/^1?(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-body">
                      {app.application_id}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(app.loan_amount)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-body tabular-nums">
                      {app.monthly_income
                        ? `${formatCurrency(app.monthly_income)}/mo`
                        : "—"}
                    </td>
                    <td className="max-w-40 truncate px-5 py-3 text-body">
                      {app.bank_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-muted">
                      {formatDateTime(app.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  );
}

function SortTh({
  field,
  sortBy,
  order,
  onSort,
  right,
  children,
}: {
  field: string;
  sortBy: string;
  order: "asc" | "desc";
  onSort: (f: string) => void;
  right?: boolean;
  children: React.ReactNode;
}) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`px-5 py-3 font-medium ${right ? "text-right" : ""}`}
      aria-sort={
        active ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        onClick={() => onSort(field)}
        className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors hover:text-ink ${
          active ? "text-ink" : ""
        }`}
      >
        {children}
        <Icon
          className={`h-3 w-3 ${active ? "" : "opacity-40"}`}
          strokeWidth={2}
        />
      </button>
    </th>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  // 1 … 4 5 [6] 7 8 … 20
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages.at(-1) !== "…") pages.push("…");
  }

  const btn =
    "flex h-8 min-w-8 cursor-pointer items-center justify-center border px-2 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-40";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3 sm:flex-row">
      <p className="text-xs text-muted tabular-nums">
        Showing {formatNumber(start)}–{formatNumber(end)} of{" "}
        {formatNumber(total)}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            className={`${btn} border-line text-body hover:border-brand`}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-xs text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${btn} ${
                  p === page
                    ? "border-brand bg-brand text-paper"
                    : "border-line text-body hover:border-brand"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
            className={`${btn} border-line text-body hover:border-brand`}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
