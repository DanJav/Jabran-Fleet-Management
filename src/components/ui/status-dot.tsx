import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/utils";

const statusColors: Record<ServiceStatus, string> = {
  upcoming: "bg-emerald-500",
  due_soon: "bg-amber-500",
  overdue: "bg-red-500",
};

const statusLabels: Record<ServiceStatus, string> = {
  upcoming: "OK",
  due_soon: "Snart",
  overdue: "Försenad",
};

export function StatusDot({
  status,
  showLabel = true,
  className,
}: {
  status: ServiceStatus;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", statusColors[status])} />
      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium",
            status === "upcoming" && "text-emerald-700",
            status === "due_soon" && "text-amber-700",
            status === "overdue" && "text-red-700"
          )}
        >
          {statusLabels[status]}
        </span>
      )}
    </span>
  );
}
