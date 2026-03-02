import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DriversLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-4 space-y-3">
            <div className="flex gap-6">
              {[80, 100, 70, 50, 80, 50].map((w, i) => (
                <Skeleton key={i} className="h-3" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-6 items-center py-1">
                {[80, 100, 70, 50, 80, 50].map((w, j) => (
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
