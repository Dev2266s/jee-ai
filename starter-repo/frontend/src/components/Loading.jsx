export default function Loading({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status" aria-live="polite">
      <div
        className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse-soft bg-slate-200 rounded ${className}`} aria-hidden="true" />
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse-soft">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}