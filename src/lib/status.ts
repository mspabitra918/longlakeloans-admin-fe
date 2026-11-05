// Application statuses — must match APPLICATION_STATUSES in the backend
// (longlakeloans-backend/src/services/applicationService.ts).
export const APPLICATION_STATUSES = [
  "bank_verification_pending",
  "bank_verification_completed",
  "bank_reverification",
  "request_a_call",
  "funded",
  "declined_pb",
  "declined_hd",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  bank_verification_pending: "Verification pending",
  bank_verification_completed: "Bank verified",
  bank_reverification: "Re-verification",
  request_a_call: "Requested a call",
  funded: "Funded",
  declined_pb: "Declined (PB)",
  declined_hd: "Declined (HD)",
};

/** Badge styles: a dot + label, so status is never colour-alone. */
export const STATUS_BADGE: Record<string, { dot: string; badge: string }> = {
  bank_verification_pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  bank_verification_completed: {
    dot: "bg-blue-600",
    badge: "bg-blue-50 text-blue-800 ring-blue-200",
  },
  bank_reverification: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-800 ring-orange-200",
  },
  request_a_call: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  },
  funded: {
    dot: "bg-green-700",
    badge: "bg-green-50 text-green-800 ring-green-200",
  },
  declined_pb: {
    dot: "bg-red-600",
    badge: "bg-red-50 text-red-800 ring-red-200",
  },
  declined_hd: {
    dot: "bg-red-600",
    badge: "bg-red-50 text-red-800 ring-red-200",
  },
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatCurrency(amount: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: compact ? 1 : 0,
  }).format(Number(amount) || 0);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Number(n) || 0);
}
