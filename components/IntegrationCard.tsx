export function IntegrationCard({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.8rem] border border-white/60 bg-white/72 p-5 shadow-sm backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-white/70">
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </article>
  );
}
