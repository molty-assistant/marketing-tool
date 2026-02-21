'use client';

/** Base shimmer block */
function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted ${className}`}
    />
  );
}

/** Skeleton for the dashboard plan cards grid */
export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Bone className="h-8 w-48 mb-2" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <Bone className="flex-1 h-10 rounded-xl" />
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-start gap-4 mb-4">
              <Bone className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Bone className="h-5 w-3/4 mb-2" />
                <Bone className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <Bone className="h-5 w-20 rounded-full" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <Bone className="h-3 w-28 mb-4" />
            <Bone className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for plan detail page */
export function PlanDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Nav */}
      <Bone className="h-10 w-full rounded-xl mb-6" />
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Bone className="w-14 h-14 rounded-xl" />
        <div className="flex-1">
          <Bone className="h-7 w-64 mb-2" />
          <Bone className="h-4 w-96" />
        </div>
      </div>
      {/* Config summary */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Stage sections */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card/50 border border-border/50 rounded-2xl p-5 mb-4">
          <Bone className="h-6 w-64" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for draft / translate pages */
export function DraftSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <Bone className="h-10 w-full rounded-xl mb-6" />
      <div className="mb-8">
        <Bone className="h-8 w-72 mb-2" />
        <Bone className="h-4 w-96" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 mb-4 p-4">
          <Bone className="h-5 w-48 mb-4" />
          <Bone className="h-32 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for SERP preview page */
export function SerpSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <Bone className="h-10 w-full rounded-xl mb-6" />
      <div className="flex items-center gap-4 mb-8">
        <Bone className="w-14 h-14 rounded-xl" />
        <div className="flex-1">
          <Bone className="h-7 w-72 mb-2" />
          <Bone className="h-4 w-80" />
        </div>
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-8">
        <Bone className="h-20 w-full" />
      </div>
      {/* SERP preview card */}
      <div className="bg-card rounded-xl p-6">
        <Bone className="h-4 w-64 mb-2" />
        <Bone className="h-6 w-96 mb-2" />
        <Bone className="h-12 w-full" />
      </div>
    </div>
  );
}

/** Generic page skeleton */
export function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <Bone className="h-8 w-48 mb-2" />
      <Bone className="h-4 w-72 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5">
            <Bone className="h-5 w-64 mb-3" />
            <Bone className="h-4 w-full mb-2" />
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
