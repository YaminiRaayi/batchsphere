import { Link, useMatches } from "react-router-dom";

type BreadcrumbHandle = {
  breadcrumb?: string;
};

export function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches.flatMap((match) => {
    const handle = match.handle as BreadcrumbHandle | undefined;
    if (!handle?.breadcrumb) {
      return [];
    }

    return [
      {
        id: match.id,
        label: handle.breadcrumb,
        pathname: match.pathname
      }
    ];
  });

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <div key={crumb.id} className="flex items-center gap-2">
            {index > 0 ? <span className="text-slate-300">/</span> : null}
            {isLast ? (
              <span className="font-medium text-slate-700">{crumb.label}</span>
            ) : (
              <Link to={crumb.pathname} className="transition hover:text-slate-700">
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
