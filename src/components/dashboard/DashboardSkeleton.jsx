import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl border border-white/10 bg-slate-800/55 ${className}`} />
);

export default function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8" aria-hidden="true">
      <SkeletonBlock className="col-span-12 h-64 md:h-72" />
      <SkeletonBlock className="col-span-12 md:col-span-8 h-80" />
      <SkeletonBlock className="col-span-12 md:col-span-4 h-80" />
      <SkeletonBlock className="col-span-12 md:col-span-3 h-96" />
      <SkeletonBlock className="col-span-12 md:col-span-9 h-[32rem]" />
    </div>
  );
}
