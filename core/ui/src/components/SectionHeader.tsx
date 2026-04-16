type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional accent color hex — e.g. the module color. Defaults to slate. */
  accentColor?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  accentColor = "#64748B",
}: SectionHeaderProps) {
  return (
    <div className="max-w-4xl">
      {/* Eyebrow with optional left accent bar */}
      <div className="flex items-center gap-2.5">
        <div
          className="h-3.5 w-[3px] rounded-full opacity-80"
          style={{ backgroundColor: accentColor }}
        />
        <p
          className="text-[11px] font-bold uppercase tracking-[0.32em]"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </p>
      </div>

      <h3 className="mt-2.5 font-display text-2xl font-semibold leading-snug text-slate-900 md:text-3xl">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 md:text-[15px]">
          {description}
        </p>
      )}
    </div>
  );
}
