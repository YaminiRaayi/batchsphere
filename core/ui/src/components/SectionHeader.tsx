type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-steel">{eyebrow}</p>
      <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
        {title}
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate md:text-[15px]">{description}</p>
    </div>
  );
}
