import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder podczas ładowania danych profilu
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="text-center space-y-2">
        <Skeleton className="h-9 w-64 mx-auto" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-6 rounded-2xl shadow-xl border border-green-100 bg-white p-8">
        {/* Language selector skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Theme selector skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Theme preview skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Summary skeleton */}
      <div className="space-y-3 rounded-2xl shadow-lg border border-green-100 bg-white p-6">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
