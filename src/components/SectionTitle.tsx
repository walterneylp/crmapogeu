export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm opacity-75">{subtitle}</p> : null}
    </div>
  );
}
