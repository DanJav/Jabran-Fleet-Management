import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* Stat bar */}
      <div className="flex divide-x divide-border border border-border rounded-lg overflow-hidden bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 px-5 py-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="px-4 pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-4 space-y-3">
            {/* Column headers */}
            <div className="flex gap-4 pt-1">
              {[60, 80, 50, 60, 70, 70, 70, 70].map((w, i) => (
                <Skeleton key={i} className="h-3" style={{ width: w }} />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-1">
                {[60, 80, 50, 60, 70, 70, 70, 70].map((w, j) => (
                  <Skeleton key={j} className="h-4" style={{ width: w }} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
