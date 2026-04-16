export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-10 max-w-2xl rounded-2xl bg-slate-200" />
        <div className="h-4 max-w-3xl rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel space-y-4 px-6 py-6">
          <div className="h-5 w-48 rounded-full bg-slate-200" />
          <div className="h-24 rounded-3xl bg-slate-100" />
          <div className="h-24 rounded-3xl bg-slate-100" />
        </div>
        <div className="panel space-y-4 px-6 py-6">
          <div className="h-5 w-40 rounded-full bg-slate-200" />
          <div className="h-40 rounded-3xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
