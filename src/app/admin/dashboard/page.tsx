"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
} from "lucide-react";
import { useAdminApi, useAdminAuth } from "@/lib/admin-auth";
import { formatDateTime, todayStr } from "@/lib/datetime";
import { bucketDate } from "@/lib/dateRange";
import { LOAN_PURPOSES, US_STATES, optionLabel } from "@/lib/constants";
import {
  APPLICATION_STATUSES,
  STATUS_BADGE,
  formatCurrency,
  formatNumber,
  statusLabel,
} from "@/lib/status";
import { PageHeader } from "@/components/AdminShell";
import StatusBadge from "@/components/StatusBadge";

// ---------------------------------------------------------------- types ----

type Range = "1d" | "7d" | "30d" | "90d" | "1y";

interface Point {
  bucket: string;
  total: number;
  funded: number;
  declined: number;
  verified: number;
  in_progress: number;
  amount: number;
  funded_amount: number;
}

interface Summary {
  total: number;
  amount: number;
  avg_amount: number;
  funded: number;
  funded_amount: number;
  declined: number;
  verified: number;
}

interface Analytics {
  range: Range;
  unit: "hour" | "day" | "month";
  periodStart: string;
  generatedAt: string;
  current: Summary;
  previous: Summary;
  series: Point[];
  statusBreakdown: { status: string; count: number; amount: number }[];
  topStates: { state: string; count: number; amount: number }[];
  purposes: { purpose: string; count: number; amount: number }[];
  allTimeTotal: number;
}

interface RecentApp {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  loan_amount: number;
  status: string;
  created_at: string;
}

// --------------------------------------------------------------- config ----

const RANGES: { key: Range; label: string; long: string; prev: string }[] = [
  { key: "1d", label: "Today", long: "Today", prev: "yesterday" },
  { key: "7d", label: "7D", long: "Last 7 days", prev: "prior 7 days" },
  { key: "30d", label: "30D", long: "Last 30 days", prev: "prior 30 days" },
  { key: "90d", label: "90D", long: "Last 90 days", prev: "prior 90 days" },
  { key: "1y", label: "1Y", long: "Last 12 months", prev: "prior 12 months" },
];

// Fixed categorical order (reference palette slots 1-4). Stack draws
// bottom → top in this order; colour follows the series, never its rank.
const SERIES = [
  { key: "verified", label: "Bank verified", color: "var(--color-series-1)" },
  { key: "declined", label: "Declined", color: "var(--color-series-2)" },
  { key: "funded", label: "Funded", color: "var(--color-series-3)" },
  { key: "in_progress", label: "In progress", color: "var(--color-series-4)" },
] as const;

const AXIS = { fontSize: 11, fill: "#737373" };
const GRID = "#ececec";

// ------------------------------------------------------------- helpers ----

function bucketLabel(bucket: string, unit: Analytics["unit"], long = false) {
  const d = bucketDate(bucket);
  if (unit === "hour") {
    const t = d.toLocaleTimeString("en-US", {
      timeZone: "UTC",
      hour: "numeric",
    });
    return long ? `${t} PT` : t;
  }
  if (unit === "month") {
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: long ? "long" : "short",
      ...(long ? { year: "numeric" } : {}),
    });
  }
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(long ? { weekday: "short", year: "numeric" } : {}),
  });
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

// ---------------------------------------------------------- components ----

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-paper ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Delta({
  cur,
  prev,
  prevLabel,
  invert = false,
}: {
  cur: number;
  prev: number;
  prevLabel: string;
  invert?: boolean;
}) {
  const pct = pctChange(cur, prev);
  const up = pct !== null && pct > 0;
  const flat = pct === 0;
  const good = invert ? !up : up;
  const Icon = flat ? Minus : up || pct === null ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? "text-muted"
    : good
      ? "text-green-700"
      : "text-red-600";
  return (
    <p className="mt-2 flex items-center gap-1 text-xs text-muted">
      <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {pct === null ? "New" : `${Math.abs(pct).toFixed(pct >= 100 ? 0 : 1)}%`}
      </span>
      vs {prevLabel}
    </p>
  );
}

function Kpi({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="bg-paper p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted tabular-nums">{sub}</p>}
      {delta}
    </div>
  );
}

function RangeTabs({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex rounded-lg border border-line bg-paper p-0.5"
    >
      {RANGES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={value === r.key}
          onClick={() => onChange(r.key)}
          className={`cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === r.key
              ? "bg-brand text-paper"
              : "text-muted hover:text-brand"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  unit,
  mode,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  unit: Analytics["unit"];
  mode: "count" | "volume";
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="min-w-48 border border-line bg-paper px-3.5 py-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-ink">{bucketLabel(p.bucket, unit, true)}</p>
      {mode === "count" ? (
        <>
          {[...SERIES].reverse().map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-6 py-0.5">
              <span className="flex items-center gap-2 text-body">
                <span className="h-2.5 w-2.5" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-medium text-ink tabular-nums">
                {formatNumber(p[s.key])}
              </span>
            </div>
          ))}
          <div className="mt-1.5 flex justify-between border-t border-line pt-1.5">
            <span className="text-muted">Total</span>
            <span className="font-semibold text-ink tabular-nums">
              {formatNumber(p.total)}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-6 py-0.5">
            <span className="flex items-center gap-2 text-body">
              <span className="h-2.5 w-2.5" style={{ background: "var(--color-series-1)" }} />
              Requested
            </span>
            <span className="font-medium text-ink tabular-nums">
              {formatCurrency(p.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 py-0.5">
            <span className="flex items-center gap-2 text-body">
              <span className="h-0.5 w-2.5" style={{ background: "var(--color-series-3)" }} />
              Funded
            </span>
            <span className="font-medium text-ink tabular-nums">
              {formatCurrency(p.funded_amount)}
            </span>
          </div>
          <p className="mt-1.5 border-t border-line pt-1.5 text-muted">
            {formatNumber(p.total)} application{p.total === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-body">
          <span
            className={i.line ? "h-0.5 w-3" : "h-2.5 w-2.5"}
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Ranked list with thin single-hue bars — counts in text tokens. */
function BarList({
  rows,
  empty,
}: {
  rows: { key: string; label: React.ReactNode; count: number; amount: number; dot?: string }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (rows.length === 0 || total === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-3.5 px-5 py-4">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate text-body">
              {r.dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />}
              {r.label}
            </span>
            <span className="shrink-0 text-ink tabular-nums">
              <span className="font-medium">{formatNumber(r.count)}</span>
              <span className="ml-2 text-xs text-muted">
                {((r.count / total) * 100).toFixed(0)}%
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-mint">
            <div
              className="h-full bg-brand transition-[width] duration-500"
              style={{ width: `${(r.count / max) * 100}%` }}
              title={formatCurrency(r.amount)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-wash ${className}`} />;
}

// ---------------------------------------------------------------- page ----

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAdminAuth();
  const { adminFetch } = useAdminApi();

  const [range, setRange] = useState<Range>(() => {
    // Remember the last chosen range for this browser
    try {
      const saved = localStorage.getItem("dashboard_range") as Range | null;
      if (saved && RANGES.some((r) => r.key === saved)) return saved;
    } catch {}
    return "30d";
  });
  const [mode, setMode] = useState<"count" | "volume">("count");
  const [data, setData] = useState<Analytics | null>(null);
  const [recent, setRecent] = useState<RecentApp[]>([]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");

  const changeRange = (r: Range) => {
    setRange(r);
    try {
      localStorage.setItem("dashboard_range", r);
    } catch {}
  };

  // Loading is derived: the request for `key` hasn't landed yet.
  const key = `${range}:${refresh}`;
  const loading = loadedKey !== key;
  const load = () => setRefresh((n) => n + 1);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      adminFetch(`/api/admin/analytics?range=${range}`),
      adminFetch(
        "/api/admin/applications?limit=6&all=1&sortBy=created_at&sortOrder=desc",
      ),
    ])
      .then(async ([aRes, rRes]) => {
        if (!aRes.ok) throw new Error(`Analytics failed (${aRes.status})`);
        const a = await aRes.json();
        const r = rRes.ok ? await rRes.json() : { applications: [] };
        if (cancelled) return;
        setData(a.analytics);
        setRecent(r.applications || []);
        setError("");
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [user, adminFetch, range, key]);

  const meta = RANGES.find((r) => r.key === range)!;
  const cur = data?.current;
  const prev = data?.previous;

  // Applications-list link that matches the dashboard window
  const listHref = useMemo(() => {
    const today = todayStr();
    const from = data?.periodStart?.slice(0, 10) || today;
    const preset = range === "1d" ? "today" : range;
    return `/admin/applications?range=${preset}&from=${from}&to=${today}`;
  }, [data, range]);

  const fundedRate = cur && cur.total > 0 ? (cur.funded / cur.total) * 100 : 0;
  const prevFundedRate =
    prev && prev.total > 0 ? (prev.funded / prev.total) * 100 : 0;

  const statusRows = useMemo(() => {
    const counts = new Map(data?.statusBreakdown.map((s) => [s.status, s]));
    return APPLICATION_STATUSES.map((s) => ({
      key: s,
      label: statusLabel(s),
      dot: STATUS_BADGE[s]?.dot,
      count: counts.get(s)?.count ?? 0,
      amount: counts.get(s)?.amount ?? 0,
    }));
  }, [data]);

  const peak = useMemo(() => {
    if (!data?.series.length) return null;
    return data.series.reduce((m, p) => (p.total > m.total ? p : m));
  }, [data]);

  const onBucketClick = (p?: Point) => {
    if (!p || !data || data.unit === "month") return;
    const day = p.bucket.slice(0, 10);
    router.push(`/admin/applications?range=custom&from=${day}&to=${day}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Overview" title="Dashboard">
        <div className="flex items-center gap-2">
          <RangeTabs value={range} onChange={changeRange} />
          <button
            onClick={load}
            aria-label="Refresh"
            title="Refresh"
            className="cursor-pointer border border-line bg-paper p-2 text-muted transition-colors hover:text-ink"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={load} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {!data || !cur || !prev ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-paper p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-24" />
              <Skeleton className="mt-3 h-3 w-28" />
            </div>
          ))
        ) : (
          <>
            <Kpi
              label="Applications"
              value={formatNumber(cur.total)}
              sub={`${formatNumber(data.allTimeTotal)} all time`}
              delta={<Delta cur={cur.total} prev={prev.total} prevLabel={meta.prev} />}
            />
            <Kpi
              label="Requested"
              value={formatCurrency(cur.amount, cur.amount >= 100000)}
              sub="Total loan amount"
              delta={<Delta cur={cur.amount} prev={prev.amount} prevLabel={meta.prev} />}
            />
            <Kpi
              label="Avg. loan"
              value={formatCurrency(cur.avg_amount)}
              sub="Per application"
              delta={<Delta cur={cur.avg_amount} prev={prev.avg_amount} prevLabel={meta.prev} />}
            />
            <Kpi
              label="Funded"
              value={formatNumber(cur.funded)}
              sub={formatCurrency(cur.funded_amount)}
              delta={<Delta cur={cur.funded} prev={prev.funded} prevLabel={meta.prev} />}
            />
            <Kpi
              label="Funded rate"
              value={`${fundedRate.toFixed(1)}%`}
              sub={`${formatNumber(cur.verified)} bank verified`}
              delta={<Delta cur={fundedRate} prev={prevFundedRate} prevLabel={meta.prev} />}
            />
            <Kpi
              label="Declined"
              value={formatNumber(cur.declined)}
              sub={
                cur.total > 0
                  ? `${((cur.declined / cur.total) * 100).toFixed(1)}% of applications`
                  : "—"
              }
              delta={
                <Delta cur={cur.declined} prev={prev.declined} prevLabel={meta.prev} invert />
              }
            />
          </>
        )}
      </div>

      {/* Main chart */}
      <Card className="mt-6">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              {mode === "count" ? "Applications" : "Loan volume"} ·{" "}
              <span className="font-normal text-muted">{meta.long}</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {data?.unit === "hour"
                ? "Hourly, Pacific time"
                : data?.unit === "month"
                  ? "Monthly, Pacific time"
                  : "Daily, Pacific time"}
              {peak && peak.total > 0 && (
                <>
                  {" "}· Peak {formatNumber(peak.total)} on{" "}
                  {bucketLabel(peak.bucket, data!.unit, true)}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Legend
              items={
                mode === "count"
                  ? SERIES.map((s) => ({ label: s.label, color: s.color }))
                  : [
                      { label: "Requested", color: "var(--color-series-1)" },
                      { label: "Funded", color: "var(--color-series-3)", line: true },
                    ]
              }
            />
            <div className="inline-flex border border-line p-0.5">
              {(["count", "volume"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`cursor-pointer px-2.5 py-1 text-xs font-medium transition-colors ${
                    mode === m ? "bg-brand text-paper" : "text-muted hover:text-brand"
                  }`}
                >
                  {m === "count" ? "Count" : "Amount"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-80 px-2 pt-5 pb-2 sm:px-4">
          {!data ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <>
              {cur?.total === 0 && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <p className="border border-line bg-paper px-4 py-2 text-sm text-muted">
                    No applications in this period
                  </p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                {mode === "count" ? (
                  <BarChart
                    data={data.series}
                    margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                    barCategoryGap={data.series.length > 40 ? 1 : "22%"}
                  >
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={(b) => bucketLabel(b, data.unit)}
                      tick={AXIS}
                      tickLine={false}
                      axisLine={{ stroke: "#d4d4d4" }}
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={AXIS}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(10,10,10,0.04)" }}
                      content={<ChartTooltip unit={data.unit} mode="count" />}
                    />
                    {SERIES.map((s) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="status"
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth={data.series.length > 40 ? 0 : 1}
                        isAnimationActive={false}
                        className={data.unit !== "month" ? "cursor-pointer" : ""}
                        onClick={(entry) =>
                          onBucketClick((entry as { payload?: Point }).payload)
                        }
                      />
                    ))}
                  </BarChart>
                ) : (
                  <ComposedChart
                    data={data.series}
                    margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={(b) => bucketLabel(b, data.unit)}
                      tick={AXIS}
                      tickLine={false}
                      axisLine={{ stroke: "#d4d4d4" }}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v, true)}
                      tick={AXIS}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ stroke: "#a3a3a3", strokeDasharray: "3 3" }}
                      content={<ChartTooltip unit={data.unit} mode="volume" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--color-series-1)"
                      strokeWidth={2}
                      fill="url(#volFill)"
                      isAnimationActive={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="funded_amount"
                      stroke="var(--color-series-3)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </>
          )}
        </div>
        {data && data.unit !== "month" && mode === "count" && (
          <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
            Click a bar to open that day&apos;s applications.
          </p>
        )}
      </Card>

      {/* Breakdowns */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="By status"
          action={
            <Link href={listHref} className="text-xs text-muted hover:text-ink">
              View list
            </Link>
          }
        >
          {data ? (
            <BarList rows={statusRows} empty="No applications in this period" />
          ) : (
            <div className="space-y-4 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          )}
        </Card>
        <Card title="Top states">
          {data ? (
            <BarList
              rows={data.topStates.map((s) => ({
                key: s.state,
                label: (
                  <>
                    <span className="w-7 font-mono text-xs text-muted">{s.state}</span>
                    {optionLabel(US_STATES, s.state)}
                  </>
                ),
                count: s.count,
                amount: s.amount,
              }))}
              empty="No applications in this period"
            />
          ) : (
            <div className="space-y-4 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          )}
        </Card>
        <Card title="Loan purpose">
          {data ? (
            <BarList
              rows={data.purposes.map((p) => ({
                key: p.purpose,
                label: optionLabel(LOAN_PURPOSES, p.purpose),
                count: p.count,
                amount: p.amount,
              }))}
              empty="No applications in this period"
            />
          ) : (
            <div className="space-y-4 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent */}
      <Card
        className="mt-6"
        title="Recent applications"
        action={
          <Link
            href="/admin/applications?range=all"
            className="group inline-flex items-center gap-1 text-xs font-medium text-ink hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        }
      >
        {loading && recent.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No applications yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Applicant</th>
                  <th className="px-5 py-3 font-medium">Application ID</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((app) => (
                  <tr
                    key={app.application_id}
                    onClick={() => router.push(`/admin/applications/${app.application_id}`)}
                    className="cursor-pointer transition-colors hover:bg-wash"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">
                        {app.first_name} {app.last_name}
                      </p>
                      <p className="text-xs text-muted">{app.email}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-body">
                      {app.application_id}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(app.loan_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted">
                      {formatDateTime(app.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && (
        <p className="mt-4 text-right text-xs text-muted">
          Updated {formatDateTime(data.generatedAt)}
        </p>
      )}
    </div>
  );
}
