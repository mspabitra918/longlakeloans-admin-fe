import { STATUS_BADGE, statusLabel } from "@/lib/status";

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? {
    dot: "bg-neutral-400",
    badge: "bg-neutral-50 text-neutral-700 ring-neutral-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {statusLabel(status)}
    </span>
  );
}
