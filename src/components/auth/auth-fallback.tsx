import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shown while an auth form suspends on search params: the heading, then the fields */
export function AuthFallback() {
  return (
    <div className="w-full space-y-7">
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[50px] w-full rounded-[10px]" />
        <Skeleton className="h-14 w-full rounded-[10px]" />
        <Skeleton className="h-14 w-full rounded-[10px]" />
        <Skeleton className="h-[50px] w-full rounded-[10px]" />
      </div>
    </div>
  );
}
