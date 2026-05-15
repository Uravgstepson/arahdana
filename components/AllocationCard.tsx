export function AllocationCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-stone-600">{label}</p>
        <p className="text-sm font-semibold text-stone-950">{value}</p>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-white/70 ring-1 ring-white/60">
        <div className="h-2.5 rounded-full bg-emerald-600 shadow-sm" style={{ width: value }} />
      </div>
      <p className="mt-3 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
