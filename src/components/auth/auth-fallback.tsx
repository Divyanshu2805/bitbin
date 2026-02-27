import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shown while an auth form suspends on search params */
export function AuthFallback() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
